import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";

async function pixelToRealWorld(
  PROJECT_CONFIG: ProjectConfig,
  riverCli: Function,
) {
  ipcMain.handle("pixel-to-real-world", async (_event, args) => {
    const options = [
      "transform-pixel-to-real-world",
      "--",
      args.points.x,
      args.points.y,
      PROJECT_CONFIG.matrixPath,
    ];

    try {
      const { data } = (await riverCli(options)) as any;
      return data;
    } catch (error) {
      console.log("Error en pixel-to-real-world");
      console.log(error);
    }
  });
}

export { pixelToRealWorld };
