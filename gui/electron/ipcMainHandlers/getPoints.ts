import { dialog, ipcMain } from 'electron';
import { readFile, utils, set_fs, writeFile } from 'xlsx';
import * as fs from 'fs';
import { EXTENSIONS } from './utils/validateFile';
import { PROJECT_CONFIG } from '../main';

set_fs(fs);

async function getPoints() {
  const options: Electron.OpenDialogOptions = {
    properties: ['openFile'],
    filters: [
      {
        name: 'Documents',
        extensions: EXTENSIONS,
      },
    ],
  };

  ipcMain.handle('import-points', async (_event, args) => {
    const { path, unitSistem } = args;
    const isImperial = unitSistem === 'imperial';
    const FT_TO_M = 0.3048;

    options.defaultPath = PROJECT_CONFIG.defaultFilesPath;

    try {
      let pointsPath: string = path;

      if (pointsPath === undefined) {
        const result = await dialog.showOpenDialog(options);
        pointsPath = result.filePaths[0];
      }

      const workbook = readFile(pointsPath);
      const sheetName = workbook.SheetNames[0];

      const sheet = workbook.Sheets[sheetName];

      let values = utils.sheet_to_json(sheet, { header: 1 });
      const { points, zMax, zMin } = transformPoints(values as [[]], isImperial, FT_TO_M);

      return {
        data: {
          points: points,
          zLimits: {
            min: zMin,
            max: zMax,
          },
          path: pointsPath,
        },
      };
    } catch (error) {
      if (error.message === 'invalidPointsFileFormat') {
        return { error };
      }
    }
  });
}

function transformPoints(points: [[]], isImperial: boolean, FT_TO_M: number) {
  if (points[0].length < 4) {
    throw new Error('invalidPointsFileFormat');
  }

  let zMax = -Infinity;
  let zMin = Infinity;

  const newPoints = points
    .map((point: string[], index) => {
      const key = index;
      const label = point[0];

      if (
        typeof label === 'string' &&
        label.toUpperCase() === 'LABEL' &&
        typeof point[1] === 'string' &&
        typeof point[2] === 'string' &&
        typeof point[3] === 'string'
      ) {
        return undefined;
      }

      const rawX = parseFloat(Number(point[1]).toFixed(2));
      const rawY = parseFloat(Number(point[2]).toFixed(2));
      const rawZ = parseFloat(Number(point[3]).toFixed(2));

      const X = isImperial ? parseFloat((rawX * FT_TO_M).toFixed(4)) : rawX;
      const Y = isImperial ? parseFloat((rawY * FT_TO_M).toFixed(4)) : rawY;
      const Z = isImperial ? parseFloat((rawZ * FT_TO_M).toFixed(4)) : rawZ;
      let x = 0;
      let y = 0;
      let wasEstablished = false;

      if (isNaN(X) || isNaN(Y) || isNaN(Z)) {
        throw new Error('invalidPointsFileFormat');
      }

      if (point.length > 4) {
        x = parseFloat(Number(point[4]).toFixed(1));
        y = parseFloat(Number(point[5]).toFixed(1));
        wasEstablished = true;
      }

      if (Z > zMax) zMax = Z;
      if (Z < zMin) zMin = Z;

      return {
        key,
        index,
        label,
        X,
        Y,
        Z,
        x,
        y,
        selected: true,
        wasEstablished,
      };
    })
    .filter((point) => point !== undefined);

  return { points: newPoints, zMax, zMin };
}

export { getPoints };
