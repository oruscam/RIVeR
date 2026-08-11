import { ipcMain, BrowserWindow } from 'electron';
import { FirstFrameArgs, RiverCli } from './interfaces';
import * as fs from 'fs';
import path from 'path';
import { PROJECT_CONFIG } from '../main';

function firstFrame(riverCli: RiverCli) {
  const mainWindow = BrowserWindow.getAllWindows()[0];

  ipcMain.handle('first-frame', async (_event, args: FirstFrameArgs) => {
    PROJECT_CONFIG.framesPath = PROJECT_CONFIG.projectDirectory + '/frames';
    if (fs.existsSync(PROJECT_CONFIG.framesPath)) {
      await fs.promises.rm(PROJECT_CONFIG.framesPath, {
        recursive: true,
        force: true,
      });
    }

    const { videoPath, framesPath, logsPath } = PROJECT_CONFIG;
    const { start_frame, end_frame, step, factor, lensCorrection, stabilization, stabilizationRegions } = args;

    let filePrefix = import.meta.env.VITE_FILE_PREFIX;
    filePrefix = filePrefix === undefined ? '' : filePrefix;

    const options: (string | number)[] = [
      'video-to-frames',
      videoPath,
      framesPath,
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

    const stabilizationRegionsPath = path.join(PROJECT_CONFIG.projectDirectory, 'stabilization_regions.json');

    if (stabilization && stabilizationRegions.length >= 2) {
      const backendRegions = stabilizationRegions.map((r) => ({
        center: [r.x + r.width / 2, r.y + r.height / 2],
        win_size: [r.width, r.height],
      }));
      await fs.promises.writeFile(
        stabilizationRegionsPath,
        JSON.stringify({ regions: backendRegions }, null, 2),
        'utf-8'
      );
      options.push('--stabilize', '--stabilization-regions', stabilizationRegionsPath, '--replace');
    }

    const json = await fs.promises.readFile(PROJECT_CONFIG.settingsPath, 'utf-8');
    const jsonParsed = JSON.parse(json);

    jsonParsed.video_range = {
      start: start_frame,
      end: end_frame,
      step: step,
      factor: factor,
    };

    jsonParsed.lens_correction = lensCorrection || null;

    if (stabilization && stabilizationRegions.length >= 2) {
      jsonParsed.stabilization = true;
      jsonParsed.stabilization_regions_path = stabilizationRegionsPath;
    } else {
      jsonParsed.stabilization = null;
      jsonParsed.stabilization_regions_path = null;
    }

    const updatedContent = JSON.stringify(jsonParsed, null, 4);
    await fs.promises.writeFile(PROJECT_CONFIG.settingsPath, updatedContent, 'utf-8');

    try {
      console.time('Extracting frames');

      // Await the full extraction before returning.
      // Previously riverCli() was fire-and-forget (.then()), so the handler
      // returned after ~1 s (first frame found via polling), flipping
      // isBackendWorking back to false on the frontend while images.paths
      // was still empty — letting the user reach CrossSections's "Next" guard
      // too early and triggering the "waiting for frames" error.
      // Awaiting here keeps isBackendWorking=true until every frame is on disk.
      const cliResult = await riverCli(options, 'json', true, logsPath);

      console.timeEnd('Extracting frames');

      if ((cliResult as any)?.error?.message) {
        return { error: (cliResult as any).error.message, initial_frame: '' };
      }

      // Read all extracted frames (sorted for cross-platform consistency).
      const fileNames = fs.readdirSync(framesPath).sort();
      const files = fileNames.map((file) => path.join(filePrefix, framesPath, file));

      // Send all-frames BEFORE returning so that images.paths is populated
      // in the renderer before isBackendWorking flips back to false.
      mainWindow.webContents.send('all-frames', files);

      const firstFrame = fileNames.length > 0 ? path.join(framesPath, fileNames[0]) : '';
      PROJECT_CONFIG.firstFrame = firstFrame;

      return {
        initial_frame: firstFrame,
      };
    } catch (error) {
      console.log(error);
      return { error: error instanceof Error ? error.message : String(error), initial_frame: '' };
    }
  });

  ipcMain.handle('read-stabilization-regions', async (_event, { regionsPath }: { regionsPath: string }) => {
    try {
      const json = await fs.promises.readFile(regionsPath, 'utf-8');
      const parsed: { regions: Array<{ center: number[]; win_size: number[] }> } = JSON.parse(json);
      const backendRegions = parsed.regions;
      const regions = backendRegions.map((r) => ({
        x: r.center[0] - r.win_size[0] / 2,
        y: r.center[1] - r.win_size[1] / 2,
        width: r.win_size[0],
        height: r.win_size[1],
      }));
      return { regions };
    } catch (error) {
      console.log(error);
      return { regions: [] };
    }
  });
}

export { firstFrame };
