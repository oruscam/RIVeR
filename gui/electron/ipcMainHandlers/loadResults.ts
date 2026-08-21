import { ipcMain } from 'electron';
import * as fs from 'fs';
import { platform } from 'os';
import { transformData } from './utils/transformCrossSectionsData';
import { PROJECT_CONFIG } from '../main';

let encoding: BufferEncoding = 'utf-8';

if (platform() === 'win32') {
  encoding = 'latin1';
}

/**
 * Reads the already-computed xsections.json (populated by analyze-all during
 * Processing) and returns it in the same shape as get-results-all — no CLI spawn.
 */
function loadResults() {
  ipcMain.handle('get-results-load', async () => {
    const xSectionsFile = await fs.promises.readFile(PROJECT_CONFIG.xsectionsPath, { encoding: encoding });
    // xsections.json can contain literal NaN tokens (Python's json.dumps allows them
    // by default; JSON.parse does not) — sanitize the same way executeRiverCli.ts
    // does for CLI stdout, since this is the first place that reads the file directly.
    const parsed = JSON.parse(xSectionsFile.replace(/\bNaN\b/g, 'null'));
    return { data: transformData(parsed, true) };
  });
}

export { loadResults };
