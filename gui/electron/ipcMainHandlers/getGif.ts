import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as fs from "fs"
import WorkerPool  from "./workers/WorkerPool.js";
import * as path from "path";
import { createGif } from "./utils/createGif";

/**
 * IPC handler to generate a GIF in a worker thread.
 * @param PROJECT_CONFIG 
 */
async function getGif(PROJECT_CONFIG: ProjectConfig) {
  ipcMain.handle("get-gif", async (_event, args) => {
    const { framesPath, projectDirectory } = PROJECT_CONFIG;
    const time = Date.now();

    const maskPath = path.join(projectDirectory, "mask.png");
    const watermarkPath = './commons/logo.png'; 
    
    const dstPath = path.join(projectDirectory, "gif-frames");

    if (fs.existsSync(dstPath)){
      fs.rmdirSync(dstPath, { recursive: true});
    }
    fs.mkdirSync(dstPath);

    args.watermarkPath = watermarkPath;
    args.maskPath = maskPath;
    args.dstPath = dstPath;

    const files = await fs.promises.readdir(framesPath);

    const pool = new WorkerPool(args);

    await Promise.all(files.map((file, index) => {
      if (index === files.length - 1){
        return pool.runTask({index, pass: true, file: file})
      }
        return pool.runTask({ index, file: path.join(framesPath, file), pass: false});
    }));

    pool.destroy();

    const gifPath = path.join(projectDirectory, "output.gif");

    await createGif(dstPath, gifPath, args.fps)

    // fs.rmdirSync(dstPath, { recursive: true})
    
    return ({ path: dstPath, time: `${(Date.now() - time) / 1000}s` });
  });
}


export { getGif };