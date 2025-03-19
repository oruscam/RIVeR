import { dialog, ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as path from "path";

async function getVideo(PROJECT_CONFIG: ProjectConfig) {
  const options: Electron.OpenDialogOptions = {
    properties: ["openFile"],
    filters: [{ name: "Videos", extensions: ["mp4", "mov", "avi"] }],
  };

  ipcMain.handle("get-video", async () => {
    try {
      const result = await dialog.showOpenDialog(options);
      const videoPath = result.filePaths[0];
      const videoName = path.basename(videoPath);

      PROJECT_CONFIG.videoPath = videoPath;

      return { result: { path: videoPath, name: videoName } };
    } catch (error) {
      return {
        error: {
          type: "user-selection-error",
          message: "pleaseSelectVideo",
        },
      };
    }
  });
}

export { getVideo };
