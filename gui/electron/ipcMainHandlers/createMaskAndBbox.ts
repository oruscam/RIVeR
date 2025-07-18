import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as fs from "fs";
import * as path from "node:path";
import { clearCrossSections } from "./utils/clearCrossSections";
import { clearResultsPiv } from "./utils/clearResultsPiv";

async function createMaskAndBbox(
  PROJECT_CONFIG: ProjectConfig,
  riverCli: Function,
) {
  ipcMain.handle("create-mask-and-bbox", async (_event, args) => {
    console.log("create-mask-and-bbox");
    const {
      projectDirectory,
      xsectionsPath,
      matrixPath,
      resultsPath,
      settingsPath,
      logsPath,
      firstFrame,
    } = PROJECT_CONFIG;
    const { height_roi, data } = args;

    if (data) {
      await clearCrossSections(xsectionsPath);
    }

    if (resultsPath !== "") {
      clearResultsPiv(resultsPath, settingsPath);
    }
    console.log("matrix path", matrixPath);
    const options = [
      "create-mask-and-bbox",
      "--save-png-mask",
      "-w",
      projectDirectory,
      height_roi,
      firstFrame,
      xsectionsPath,
      matrixPath,
    ];

    try {
      const { data, error } = (await riverCli(
        options,
        "json",
        false,
        logsPath,
      )) as { data: { mask: [[]]; bbox: [] }; error: { message: string } };

      if (error.message) {
        return {
          error,
        };
      }

      const maskArrayPath = path.join(projectDirectory, "mask.json");
      const bboxArrayPath = path.join(projectDirectory, "bbox.json");

      const maskJson = JSON.stringify(data.mask, null, 0);
      const bboxJson = JSON.stringify(data.bbox, null, 0);

      await Promise.all([
        fs.promises.writeFile(maskArrayPath, maskJson),
        fs.promises.writeFile(bboxArrayPath, bboxJson),
      ]);

      PROJECT_CONFIG.bboxPath = bboxArrayPath;
      PROJECT_CONFIG.maskPath = maskArrayPath;

      const maskPngPath = path.join(projectDirectory, "mask.png");
      return { maskPath: maskPngPath, bbox: data.bbox };
    } catch (error) {
      console.log("ERROR EN CREATE MASK AND BBOX");
      throw error;
    }
  });
}

export { createMaskAndBbox };
