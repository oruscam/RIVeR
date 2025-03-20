import { dialog, ipcMain } from "electron";
import { readFile, utils, set_fs, writeFile } from "xlsx";
import * as fs from "fs";

set_fs(fs);

async function getPoints() {
  const options: Electron.OpenDialogOptions = {
    properties: ["openFile"],
    filters: [
      {
        name: "Documents",
        extensions: [
          "csv",
          "tsv",
          "xlsx",
          "xls",
          "xlsm",
          "ods",
          "fods",
          "prn",
          "dif",
          "sylk",
        ],
      },
    ],
  };

  ipcMain.handle("import-points", async (_event, args) => {
    const { path } = args;

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
      const { points, zMax, zMin } = transformPoints(values as [[]]);

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
      if (error.message === "invalidPointsFileFormat") {
        return { error };
      }
    }
  });
}

function transformPoints(points: [[]]) {
  if (points[0].length < 4) {
    throw new Error("invalidPointsFileFormat");
  }

  let zMax = -Infinity;
  let zMin = Infinity;

  const newPoints = points
    .map((point: string[], index) => {
      const key = index;
      const label = point[0];

      if (
        typeof label === "string" &&
        label.toUpperCase() === "LABEL" &&
        typeof point[1] === "string" &&
        typeof point[2] === "string" &&
        typeof point[3] === "string"
      ) {
        return undefined;
      }

      const X = parseFloat(Number(point[1]).toFixed(2));
      const Y = parseFloat(Number(point[2]).toFixed(2));
      const Z = parseFloat(Number(point[3]).toFixed(2));
      let x = 0;
      let y = 0;
      let wasEstablished = false;

      if (isNaN(X) || isNaN(Y) || isNaN(Z)) {
        throw new Error("invalidPointsFileFormat");
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
