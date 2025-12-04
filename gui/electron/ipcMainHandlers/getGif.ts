import { ipcMain } from "electron";
import { Worker } from "node:worker_threads";
import { ProjectConfig } from "./interfaces";

/**
 * IPC handler to generate a GIF in a worker thread.
 * @param PROJECT_CONFIG 
 */
async function getGif(PROJECT_CONFIG: ProjectConfig) {
  ipcMain.handle("get-gif", async (_event, args) => {

    console.time("getGifWorker");

    return new Promise<{ path: string; time: string }>((resolve, reject) => {


      // Create a SharedArrayBuffer to hold 5 integers
      const sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 30);
      const sharedArray = new Int32Array(sharedBuffer);

      console.log("sharedArray created");
      console.log("sharedArray byteLength:", sharedArray, 'lenght:', sharedArray.length);

      const workerPath = '/home/tomy_ste/RIVeR/gui/electron/ipcMainHandlers/workers/getGifWorker.js'; // asegúrate de compilar a .js
      const worker = new Worker(workerPath, {
        workerData: {
          PROJECT_CONFIG,
          args,
        },
      });

      worker.once("message", (result) => {
        console.timeEnd("getGifWorker");
        console.log("getGifWorker result:", result);
        resolve(result);
      });

      worker.once("error", (err) => {
        reject(err);
      });

      worker.once("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`getGifWorker exited with code ${code}`));
        }
      });
    });
  });
}

export { getGif };