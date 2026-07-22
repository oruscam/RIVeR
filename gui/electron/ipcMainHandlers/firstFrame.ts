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
    const { start_frame, end_frame, step, factor, lensCorrection } = args;

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

    const json = await fs.promises.readFile(PROJECT_CONFIG.settingsPath, 'utf-8');
    const jsonParsed = JSON.parse(json);

    jsonParsed.video_range = {
      start: start_frame,
      end: end_frame,
      step: step,
      factor: factor,
    };

    jsonParsed.lens_correction = lensCorrection || null;

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
      const cliResult = await riverCli(options, 'json', false, logsPath);

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
}

export { firstFrame };
