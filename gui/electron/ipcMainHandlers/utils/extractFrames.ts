import * as fs from 'fs';
import path from 'path';
import { FirstFrameArgs, RiverCli } from '../interfaces';
import { extractionCommand, withInterval } from '../../../commons/framesSource';

export interface ExtractFramesContext {
  projectDirectory: string;
  /** The project's frames folder, replaced only when the extraction succeeds. */
  framesPath: string;
  /** The video file, or the source folder of a frames project. */
  sourcePath: string;
  settingsPath: string;
  logsPath: string;
  riverCli: RiverCli;
}

export interface ExtractFramesResult {
  /** The frames now in framesPath, sorted; empty when nothing was extracted. */
  fileNames: string[];
  error?: string;
}

const exists = (target: string) => fs.existsSync(target);
const remove = (target: string) => fs.promises.rm(target, { recursive: true, force: true });

/**
 * Extracts (video) or imports (frames folder) into a folder beside `frames`, and only once
 * that worked replaces `frames` and writes the range, interval, lens and stabilization to
 * settings.json. A failed run leaves the previous frames and settings as they were.
 */
export async function extractFrames(
  context: ExtractFramesContext,
  args: FirstFrameArgs
): Promise<ExtractFramesResult> {
  const { projectDirectory, framesPath, sourcePath, settingsPath, logsPath, riverCli } = context;
  const { start_frame, end_frame, step, factor, lensCorrection, stabilization, stabilizationRegions, intervalMs } =
    args;

  const importingPath = framesPath + '_importing';
  // Where the backend puts stabilized frames before moving them back (video_to_frames.py).
  const importingStabilizedPath = importingPath + '_stabilized';
  const replacedPath = framesPath + '_replaced';
  const regionsPath = path.join(projectDirectory, 'stabilization_regions.json');
  const importingRegionsPath = path.join(projectDirectory, 'stabilization_regions_importing.json');

  const discard = async () => {
    await remove(importingPath);
    await remove(importingStabilizedPath);
    await remove(importingRegionsPath);
  };

  try {
    // A run that died between the two renames below left the frames under the other name.
    if (exists(replacedPath)) {
      if (exists(framesPath)) await remove(replacedPath);
      else await fs.promises.rename(replacedPath, framesPath);
    }
    await discard();

    const settings = JSON.parse(await fs.promises.readFile(settingsPath, 'utf-8'));

    // A frames project imports from its source folder; sourcePath holds that folder.
    const isFrames = settings.video?.source === 'frames';
    if (isFrames && intervalMs) {
      settings.video = withInterval(settings.video, intervalMs);
    }

    const options: (string | number)[] = [
      extractionCommand(settings.video?.source),
      sourcePath,
      importingPath,
      '--start-frame',
      start_frame,
      '--end-frame',
      end_frame,
      '--every',
      step,
      '--resize-factor',
      factor,
      '--overwrite',
    ];

    if (lensCorrection) {
      options.push('--undistort', '--profile-path', lensCorrection);
    }

    const stabilizing = stabilization && stabilizationRegions.length >= 2;
    if (stabilizing) {
      const backendRegions = stabilizationRegions.map((r) => ({
        center: [r.x + r.width / 2, r.y + r.height / 2],
        win_size: [r.width, r.height],
      }));
      await fs.promises.writeFile(
        importingRegionsPath,
        JSON.stringify({ regions: backendRegions }, null, 2),
        'utf-8'
      );
      options.push('--stabilize', '--stabilization-regions', importingRegionsPath, '--replace');
    }

    const cliResult = await riverCli(options, 'json', true, logsPath);
    if (cliResult?.error?.message) {
      await discard();
      return { error: cliResult.error.message, fileNames: [] };
    }

    // Sorted for cross-platform consistency.
    const fileNames = exists(importingPath) ? fs.readdirSync(importingPath).sort() : [];
    if (fileNames.length === 0) {
      await discard();
      return { fileNames: [] };
    }

    if (exists(framesPath)) await fs.promises.rename(framesPath, replacedPath);
    try {
      await fs.promises.rename(importingPath, framesPath);
    } catch (error) {
      if (exists(replacedPath)) await fs.promises.rename(replacedPath, framesPath);
      throw error;
    }
    await remove(replacedPath);

    settings.video_range = {
      start: start_frame,
      end: end_frame,
      step: step,
      factor: factor,
    };

    settings.lens_correction = lensCorrection || null;

    if (stabilizing) {
      await fs.promises.rename(importingRegionsPath, regionsPath);
      settings.stabilization = true;
      settings.stabilization_regions_path = regionsPath;
    } else {
      settings.stabilization = null;
      settings.stabilization_regions_path = null;
    }

    await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 4), 'utf-8');

    return { fileNames };
  } catch (error) {
    await discard().catch(() => undefined);
    return { error: error instanceof Error ? error.message : String(error), fileNames: [] };
  }
}
