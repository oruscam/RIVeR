import { ipcMain, BrowserWindow } from "electron";
import { FirstFrameArgs, ProjectConfig } from "./interfaces";
import * as fs from "fs";
import path from "path";

function firstFrame(PROJECT_CONFIG: ProjectConfig, riverCli: Function) {
  const mainWindow = BrowserWindow.getAllWindows()[0];

  ipcMain.handle("first-frame", async (_event, args: FirstFrameArgs) => {
    PROJECT_CONFIG.framesPath = PROJECT_CONFIG.directory + "/frames";
    if (fs.existsSync(PROJECT_CONFIG.framesPath)) {
      await fs.promises.rm(PROJECT_CONFIG.framesPath, {
        recursive: true,
        force: true,
      });
    }

    const { videoPath, framesPath, logsPath } = PROJECT_CONFIG;
    const { start_frame, end_frame, step, factor } = args;

    let filePrefix = import.meta.env.VITE_FILE_PREFIX;
    filePrefix = filePrefix === undefined ? "" : filePrefix;

    const options = [
      "video-to-frames",
      videoPath,
      framesPath,
      "--start-frame",
      start_frame,
      "--end-frame",
      end_frame,
      "--every",
      step,
      "--resize-factor",
      factor,
      "--overwrite",
    ];

    const json = await fs.promises.readFile(
      PROJECT_CONFIG.settingsPath,
      "utf-8",
    );
    const jsonParsed = JSON.parse(json);

    jsonParsed.video_range = {
      start: start_frame,
      end: end_frame,
      step: step,
      factor: factor,
    };

    const updatedContent = JSON.stringify(jsonParsed, null, 4);
    await fs.promises.writeFile(
      PROJECT_CONFIG.settingsPath,
      updatedContent,
      "utf-8",
    );

    try {
      console.time("Extracting frames");
      riverCli(options, "json", false, logsPath).then(() => {
        const files = fs
          .readdirSync(framesPath)
          .map((file) => path.join(filePrefix, framesPath, file));
        mainWindow.webContents.send("all-frames", files);
      });
      console.timeEnd("Extracting frames");

      let flag = false;
      let firstFrame = "";
      let attempts = 0;
      const maxAttempts = 30; // Limit to 30 seconds

      while (!flag && attempts < maxAttempts) {
        if (fs.existsSync(PROJECT_CONFIG.framesPath)) {
          const files = await fs.promises.readdir(PROJECT_CONFIG.framesPath);
          if (files.length > 0) {
            flag = true;
            firstFrame = path.join(framesPath, files[0]);
          }
        }
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
      }

      PROJECT_CONFIG.firstFrame = firstFrame;

      return {
        initial_frame: firstFrame,
      };
    } catch (error) {
      console.log(error);
    }
  });
}

export { firstFrame };
