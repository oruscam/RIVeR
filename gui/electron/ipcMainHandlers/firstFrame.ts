import { ipcMain } from 'electron';
import { FirstFrameArgs, RiverCli } from './interfaces';
import * as fs from 'fs';
import path from 'path';
import { PROJECT_CONFIG } from '../main';
import { extractFrames } from './utils/extractFrames';
import { clearResultsPiv } from './utils/clearResultsPiv';
import { clearCrossSections } from './utils/clearCrossSections';

function firstFrame(riverCli: RiverCli) {
  ipcMain.handle('first-frame', async (event, args: FirstFrameArgs) => {
    PROJECT_CONFIG.framesPath = PROJECT_CONFIG.projectDirectory + '/frames';
    const { projectDirectory, videoPath, framesPath, settingsPath, logsPath } = PROJECT_CONFIG;

    // Set once in main.ts from VITE_FILE_PREFIX; read here so Jest can load this module.
    const { filePrefix } = PROJECT_CONFIG;

    console.time('Extracting frames');

    // Await the full extraction before returning.
    // Previously riverCli() was fire-and-forget (.then()), so the handler
    // returned after ~1 s (first frame found via polling), flipping
    // isBackendWorking back to false on the frontend while images.paths
    // was still empty — letting the user reach CrossSections's "Next" guard
    // too early and triggering the "waiting for frames" error.
    // Awaiting here keeps isBackendWorking=true until every frame is on disk.
    const { error, fileNames } = await extractFrames(
      { projectDirectory, framesPath, sourcePath: videoPath, settingsPath, logsPath, riverCli },
      args
    );

    console.timeEnd('Extracting frames');

    if (error) {
      console.log(error);
      return { error, initial_frame: '' };
    }

    // New frames: drop every result computed from the old ones.
    const { xsectionsPath } = PROJECT_CONFIG;
    await clearResultsPiv(path.join(projectDirectory, 'piv_results.json'), settingsPath);
    if (xsectionsPath && fs.existsSync(xsectionsPath)) await clearCrossSections(xsectionsPath);
    await fs.promises.rm(path.join(projectDirectory, '_stats_cache.json'), { force: true });

    const files = fileNames.map((file) => path.join(filePrefix, framesPath, file));

    // Send all-frames BEFORE returning so that images.paths is populated
    // in the renderer before isBackendWorking flips back to false.
    // Reply to the window that asked: on macOS a window closed and reopened is a new one.
    event.sender.send('all-frames', files);

    const firstFrame = fileNames.length > 0 ? path.join(framesPath, fileNames[0]) : '';
    PROJECT_CONFIG.firstFrame = firstFrame;

    return {
      initial_frame: firstFrame,
    };
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
