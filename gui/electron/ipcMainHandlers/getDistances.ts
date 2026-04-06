import { dialog, ipcMain } from 'electron';
import { readFile, utils, set_fs } from 'xlsx';
import * as fs from 'fs';
import { EXTENSIONS, validateFile } from './utils/validateFile';
import { PROJECT_CONFIG } from '../main';

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
    const { path } = args;

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

      // raw: true prevents SheetJS from auto-converting labels like "1-2" into
      // date serial numbers. Values arrive as strings and are parsed later.
      const workbook = readFile(distancesPath, { raw: true });
      const sheetName = workbook.SheetNames[0];

      const sheet = workbook.Sheets[sheetName];

      let data = utils.sheet_to_json(sheet, { header: 1 });

      const distances = transformDistances(data as [string, number][]);

      return {
        distances,
      };
    } catch (error) {
      return { error };
    }
  });
}

// Normalize a label string to a canonical two-digit key like "12", "23", etc.
// Strips the optional "d"/"D" prefix and any separator character ( - _ space , ; )
// then sorts the two digits so that e.g. "2-1" and "1-2" both map to "d12".
// The d41 pair is treated as a special case because 1 < 4 but the canonical
// name is "d41" (not "d14").
const normalizeDistanceKey = (rawKey: string): string => {
  const stripped = rawKey.trim().replace(/[dD\-_\s,;]/g, '');
  if (stripped === '41' || stripped === '14') {
    return 'd41';
  }
  return `d${stripped.split('').sort().join('')}`;
};

const transformDistances = (distances: any[]) => {
  const distancesObject: { [key: string]: number } = {};
  const keys = ['d12', 'd23', 'd34', 'd41', 'd13', 'd24'];

  // We expect either 6 rows (no headers) or 7 rows (with headers)
  if (distances.length > 7) {
    throw new Error('invalidDistancesFileFormat');
  } else {
    // The first row is the headers. We dont need them
    if (distances.length === 7) {
      distances.shift();
    }

    let newDistances: number[] = [];

    // With raw: true, all values arrive as strings.
    // Two-column format: first column is a label, second is a numeric string.
    const hasLabel = distances.length === 6 && distances[0].length >= 2 && !isNaN(Number(distances[0][1]));
    // Check if the first column looks like a pure number (one-column format)
    const firstIsNumeric = !isNaN(Number(distances[0][0]));

    if (hasLabel && !firstIsNumeric) {
      // Two-column format: [label, value] pairs.
      // Labels are order-independent — they are matched by key and then
      // reordered into the canonical sequence (d12 d23 d34 d41 d13 d24).
      // Accepted label formats: "d12" "D12" "12" "1-2" "1_2" "1 2" "1,2" "1;2"
      const distanceMap: { [key: string]: number } = {};
      distances.forEach(([key, value]) => {
        const sortedKey = normalizeDistanceKey(String(key));
        distanceMap[sortedKey] = Number(value);
      });

      newDistances = keys.map((key) => {
        if (!(key in distanceMap)) {
          console.error("FALTA LA CLAVE OBLIGATORIA:", key);
          console.log("Claves encontradas en tu archivo:", Object.keys(distanceMap));
          throw new Error('invalidDistancesFileFormat');
        }
        return distanceMap[key];
      });
    } else if (firstIsNumeric && distances.length === 6) {
      // One-column format: 6 numeric values in the fixed order d12 d23 d34 d41 d13 d24.
      newDistances = distances.map((value) => Number(value[0]));
    } else {
      throw new Error('invalidDistancesFileFormat');
    }

    newDistances.forEach((value, index) => {
      if (isNaN(value)) {
        throw new Error('invalidDistancesNotValidValue');
      }
      if (value < 0) {
        throw new Error('invalidDistancesNegativeValue');
      }

      distancesObject[keys[index]] = value;
    });
  }

  return distancesObject;
};

export { getDistances };
