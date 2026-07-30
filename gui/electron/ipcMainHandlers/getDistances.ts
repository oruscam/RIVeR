import { dialog, ipcMain } from 'electron';
import { readFile, utils, set_fs } from 'xlsx';
import * as fs from 'fs';
import { EXTENSIONS, validateFile } from './utils/validateFile';
import { PROJECT_CONFIG } from '../main';
import { parseDistancesData } from './utils/parseDistancesData';

set_fs(fs);

async function getDistances() {
  const options: Electron.OpenDialogOptions = {
    properties: ['openFile'],
    filters: [
      {
        name: 'Documents',
        extensions: EXTENSIONS,
      },
    ],
  };

  ipcMain.handle('import-distances', async (_event, args) => {
    const { path, unitSistem } = args;
    const FT_TO_M = 0.3048;
    const isImperial = unitSistem === 'imperial';

    options.defaultPath = PROJECT_CONFIG.defaultFilesPath;

    const isValidPath = validateFile(path);
    if (isValidPath === false && path !== undefined) {
      return { error: new Error('invalidDistancesFileFormat') };
    }

    try {
      let distancesPath: string;
      if (isValidPath) {
        distancesPath = path as string;
      } else {
        const result = await dialog.showOpenDialog(options);
        distancesPath = result.filePaths[0];
      }

      // raw: true returns numeric date serials instead of formatted date strings
      // for cells Excel auto-converted from labels like "1-2". parseDistancesData
      // handles the serial → label reconstruction.
      const workbook = readFile(distancesPath, { raw: true });
      const sheetName = workbook.SheetNames[0];

      const sheet = workbook.Sheets[sheetName];

      const data = utils.sheet_to_json(sheet, { header: 1 });

      const distances = parseDistancesData(data as unknown[][]);

      if (isImperial) {
        for (const key of Object.keys(distances)) {
          distances[key] = distances[key] * FT_TO_M;
        }
      }

      return {
        distances,
      };
    } catch (error) {
      return { error };
    }
  });
}

export { getDistances };
