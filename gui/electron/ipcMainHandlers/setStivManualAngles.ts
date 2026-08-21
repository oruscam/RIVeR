import { ipcMain } from 'electron';
import * as fs from 'fs';
import { platform } from 'os';
import { sanitizeNonStandardJsonTokens } from './utils/sanitizeJson';
import { PROJECT_CONFIG } from '../main';

// xsections.json is written with latin1 on Windows elsewhere in this folder
// (see getResultData.ts); match it so a round-trip cannot corrupt section names.
const encoding: BufferEncoding = platform() === 'win32' ? 'latin1' : 'utf-8';

/**
 * Patch one section's manual-angle array, leaving every other key and every
 * other section untouched. Exported separately from the IPC wiring so the
 * merge rule can be tested without Electron.
 *
 * An all-null array means "nothing is tuned", and is stored as an absent key
 * rather than an array of nulls — that keeps xsections.json free of a row of
 * nulls for the overwhelmingly common untouched case.
 */
export function applyManualAngles(
  parsed: Record<string, any>,
  sectionName: string,
  angles: (number | null)[]
): Record<string, any> {
  // hasOwnProperty, not `in`: `in` walks the prototype chain, so '__proto__'
  // would pass the guard and the write below would land on Object.prototype.
  if (sectionName === 'summary' || !Object.prototype.hasOwnProperty.call(parsed, sectionName)) return parsed;

  const section = parsed[sectionName];
  if (angles.some((a) => a !== null && a !== undefined)) {
    section.stiv_angle_manual_profile = angles;
  } else {
    delete section.stiv_angle_manual_profile;
  }
  return parsed;
}

function setStivManualAngles() {
  ipcMain.handle('set-stiv-manual-angles', async (_event, args) => {
    const { sectionName, angles } = args as { sectionName: string; angles: (number | null)[] };
    const xSections = PROJECT_CONFIG.xsectionsPath;

    const raw = await fs.promises.readFile(xSections, { encoding });
    // xsections.json can contain literal NaN/Infinity/-Infinity tokens (see
    // sanitizeNonStandardJsonTokens for why) — sanitize before parsing, same as
    // loadResults.ts and clearCrossSections.ts do for this same file. This call
    // site writes the sanitized result back to disk (unlike loadResults.ts,
    // which only reads), so null-for-NaN/Infinity becomes the persisted
    // representation the first time a section's angle is tuned — the same
    // convention clearCrossSections.ts already establishes for writes to this file.
    const parsed = applyManualAngles(JSON.parse(sanitizeNonStandardJsonTokens(raw)), sectionName, angles);

    await fs.promises.writeFile(xSections, JSON.stringify(parsed, null, 2), { encoding });
    return;
  });
}

export { setStivManualAngles };
