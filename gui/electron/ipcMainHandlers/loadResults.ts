import { ipcMain } from 'electron';
import * as fs from 'fs';
import { platform } from 'os';
import { transformData } from './utils/transformCrossSectionsData';
import { sanitizeNonStandardJsonTokens } from './utils/sanitizeJson';
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
    // xsections.json can contain literal NaN/Infinity/-Infinity tokens (see
    // sanitizeNonStandardJsonTokens for why) — sanitize before parsing, same as
    // clearCrossSections.ts and setStivManualAngles.ts do for this same file.
    const parsed = JSON.parse(sanitizeNonStandardJsonTokens(xSectionsFile));
    return { data: transformData(parsed, true) };
  });
}

export { loadResults };
