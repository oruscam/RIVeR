import { ipcMain } from "electron";
import * as fs from "fs";
import { ProjectConfig, pixelSizeHandleArgs } from "./interfaces";
import { createMatrix } from "./utils/createMatrix";

function setPixelSize(PROJECT_CONFIG: ProjectConfig, riverCli: Function) {
  ipcMain.handle(
    "set-pixel-size",
    async (_event, args: pixelSizeHandleArgs) => {
      const { directory, settingsPath, logsPath, firstFrame } = PROJECT_CONFIG;
      const { dirPoints, rwPoints, pixelSize, rwLength } = args;

      const settings = await fs.promises.readFile(settingsPath, "utf-8");
      const settingsParsed = JSON.parse(settings);
      settingsParsed.transformation = {};

      settingsParsed.pixel_size = {
        size: pixelSize,
        rw_length: rwLength,
        x1: dirPoints[0].x,
        y1: dirPoints[0].y,
        x2: dirPoints[1].x,
        y2: dirPoints[1].y,
        east1: rwPoints[0].x,
        north1: rwPoints[0].y,
        east2: rwPoints[1].x,
        north2: rwPoints[1].y,
      };

      const options = [
        "get-uav-transformation-matrix",
        "--pixel-size",
        pixelSize,
        "--image-path",
        firstFrame,
        "-w",
        directory,
        dirPoints[0].x,
        dirPoints[0].y,
        dirPoints[1].x,
        dirPoints[1].y,
        rwPoints[0].x,
        rwPoints[0].y,
        rwPoints[1].x,
        rwPoints[1].y,
      ];

      try {
        const { data } = await riverCli(options, "text", "false", logsPath);

        await createMatrix(
          data.transformation_matrix,
          PROJECT_CONFIG,
          settingsParsed,
        )
          .then((matrixPath) => {
            settingsParsed.transformation.matrix = matrixPath;
            settingsParsed.transformation.resolution = data.output_resolution;
            settingsParsed.transformation.extent = data.extent;
            PROJECT_CONFIG.matrixPath = matrixPath;
          })
          .catch((err) => {
            console.log(err);
          });

        const updatedContent = JSON.stringify(settingsParsed, null, 4);
        await fs.promises.writeFile(settingsPath, updatedContent, "utf-8");

        return {
          uavMatrix: data.transformation_matrix,
          extent: data.extent,
          resolution: data.output_resolution,
          transformed_image_path: data.transformed_image_path,
        };
      } catch (error) {
        console.log("Error en pixel-size");
        console.log(error);
      }
    },
  );
}

export { setPixelSize };
