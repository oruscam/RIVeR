import { ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PROJECT_CONFIG } from '../main';

const STI_FILENAME = /^sti_(\d+)\.png$/;

/**
 * Lists the space-time images STIV wrote for one cross-section.
 *
 * STIV writes <project>/stis/<section>/sti_<station_id>.png on every STIV-enabled
 * run. Returns an empty result (not an error) when the folder is absent — that is
 * the normal state before STIV has ever run for this section.
 */
function getStis() {
  ipcMain.handle('get-stis', async (_event, args) => {
    const { sectionName } = args;
    if (!sectionName) {
      return { stations: [], paths: [] };
    }
    const { projectDirectory, filePrefix } = PROJECT_CONFIG;
    const stisDir = path.join(projectDirectory, 'stis', sectionName);
    const prefix = filePrefix === undefined ? '' : filePrefix;

    try {
      const files = await fs.readdir(stisDir);

      const entries = files
        .map((file) => {
          const match = STI_FILENAME.exec(file);
          return match ? { station: parseInt(match[1], 10), file } : null;
        })
        .filter((entry): entry is { station: number; file: string } => entry !== null)
        // Numeric sort: a lexicographic sort would order sti_10 before sti_2.
        .sort((a, b) => a.station - b.station);

      return {
        stations: entries.map((entry) => entry.station),
        paths: entries.map((entry) => path.join(prefix, stisDir, entry.file)),
      };
    } catch {
      return { stations: [], paths: [] };
    }
  });
}

export { getStis };
