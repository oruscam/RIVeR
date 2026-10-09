import { ipcMain, BrowserWindow } from 'electron';
import { FirstFrameArgs, RiverCli } from './interfaces';
import * as fs from 'fs';
import path from 'path';
import { PROJECT_CONFIG } from '../main';
import { extractFrames } from './utils/extractFrames';

function firstFrame(riverCli: RiverCli) {
  const mainWindow = BrowserWindow.getAllWindows()[0];

  ipcMain.handle('first-frame', async (_event, args: FirstFrameArgs) => {
    PROJECT_CONFIG.framesPath = PROJECT_CONFIG.projectDirectory + '/frames';
    const { projectDirectory, videoPath, framesPath, settingsPath, logsPath } = PROJECT_CONFIG;

    let filePrefix = import.meta.env.VITE_FILE_PREFIX;
    filePrefix = filePrefix === undefined ? '' : filePrefix;

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

    const files = fileNames.map((file) => path.join(filePrefix, framesPath, file));

    // Send all-frames BEFORE returning so that images.paths is populated
    // in the renderer before isBackendWorking flips back to false.
    mainWindow.webContents.send('all-frames', files);

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
