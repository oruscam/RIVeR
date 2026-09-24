import { ipcMain } from 'electron';
import * as fs from 'fs';
import { PROJECT_CONFIG } from '../main';
import { RiverCli } from './interfaces';
import { IwaveDefaults, parseIwaveDefaults } from '../../commons/iwave';

/**
 * Automatic iWave parameters for the Processing advanced group, computed by the CLI without
 * running iWave. Returns null on any failure; the renderer then keeps its static fallbacks.
 * Untracked: this quick call must never kill, or be killed with, a running analysis.
 */
function getIwaveDefaults(riverCli: RiverCli) {
  ipcMain.handle('get-iwave-defaults', async (): Promise<IwaveDefaults | null> => {
    const { framesPath, xsectionsPath, matrixPath, bboxPath, settingsPath, logsPath } = PROJECT_CONFIG;

    try {
      const settings = JSON.parse(await fs.promises.readFile(settingsPath, 'utf-8'));
      const step = settings.video_range?.step ?? 1;
      const fps = settings.video.fps;
      const options = [
        'iwave-defaults',
        '--step',
        step,
        '--fps',
        fps,
        ...(bboxPath && fs.existsSync(bboxPath) ? ['--bbox', bboxPath] : []),
        framesPath,
        xsectionsPath,
        matrixPath,
      ];
      const { data, error } = await riverCli(options, 'json', false, logsPath, false);
      if (error?.message) {
        console.log(error.message);
        return null;
      }
      return parseIwaveDefaults(data);
    } catch (error) {
      console.log(error);
      return null;
    }
  });
}

export { getIwaveDefaults };
