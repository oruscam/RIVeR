import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import watermark from '../../commons/logo.png'
import { drawQuiver, drawSection, drawWatermark, getGifDimensions, loadSectionValues } from "./utils/gif";

/**
 * IPC handler to generate a GIF from frames and quiver data.
 * @param PROJECT_CONFIG 
 */
async function getGif(PROJECT_CONFIG: ProjectConfig) {
  ipcMain.handle("get-gif", async (_event, args) => {
    const { framesPath, projectDirectory } = PROJECT_CONFIG;

    // Tiempo de inicio para medir la duración total de la operación
    const startTime = Date.now();

    // Leer y filtrar archivos de imagen (extensiones comunes)
    const files = await fs.promises.readdir(framesPath);

    const algorithm = args.algorithm || "neuquant";
    const dstPath = path.join(projectDirectory, `${algorithm}.output.gif`);
    const { image, quiver, factor, sections } = args;

    // Require GIFEncoder and Canvas here to avoid issues in Electron main process with ES modules
    const GIFEncoder = require("gif-encoder-2");
    const { createCanvas, loadImage } = require("canvas");

    // El handler ahora resuelve con un objeto que incluye la ruta de salida y la duración en ms
    return new Promise<{ path: string; time: string }>((resolve, reject) => {
      const writeStream = fs.createWriteStream(dstPath);
      writeStream.on("error", (err) => {
        reject(err);
      });

      writeStream.on("finish", () => {
        // Calcular tiempo transcurrido justo cuando la escritura termina
        const durationMs = ((Date.now() - startTime )/ 1000).toFixed(2);
        resolve({ path: dstPath, time: durationMs });
      });

      // Calculate GIF dimensions
      const { outWidth, outHeight, dw, dh, dx, dy } = getGifDimensions(image.width, image.height, factor);

      const encoder = new GIFEncoder(outWidth, outHeight, algorithm, true);

      // Pipe of the encoder's read stream to the write stream
      encoder.createReadStream().pipe(writeStream);

      // Configuration of the encoder
      encoder.start();
      encoder.setRepeat(0); // infinite loop
      encoder.setDelay(typeof args.delay === "number" ? args.delay : 200); // ms per frame
      encoder.setQuality(args.quality); // 1=best quality
      encoder.setThreshold(95);

      const canvas = createCanvas(outWidth, outHeight);
      const ctx = canvas.getContext("2d");

      (async () => {
        try {
          // Load watermark image and mask image
          const watermarkImage = await loadImage(watermark);
          const maskImage = await loadImage(path.join(projectDirectory, "mask.png"));

          // Section values are the same for each frame, so we load them once.
          const sectionValues = loadSectionValues(sections, image.width, image.height, factor);

          // Iterate over each frame file, except the last one because it is not pair with other frame, the cycle start again.
          for (let index = 0; index < files.length - 1; index++) {
            const file = files[index];
            const filePath = path.join(framesPath, file);

            // Load the image for the current frame
            const img = await loadImage(filePath);

            // Clear and draw the base image scaled to the output size
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw the image scaled to fit the output dimensions while maintaining aspect ratio
            ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);

            // Draw the mask
            ctx.drawImage(maskImage, 0, 0, img.width, img.height, dx, dy, dw, dh);

            // Draw the watermark
            drawWatermark(ctx, watermarkImage, outWidth, outHeight);

            // Draw Section items ( lines and texts )
            drawSection(ctx, sectionValues, factor);

            // Draw the quiver for the current frame
            drawQuiver(ctx, quiver, index, args.transformationMatrix, factor);

            // Add the frame to the GIF
            encoder.addFrame(ctx);
          }
        } catch (err) {
          // In case of error during generation, ensure to finish and clean up streams
          try {
            encoder.finish();
          } catch (_) {}
          writeStream.destroy(err as Error);
          reject(err);
          return;
        }

        // Finish the encoder so its stream closes and triggers 'finish' on writeStream
        try {
          encoder.finish();
        } catch (err) {
          writeStream.destroy(err as Error);
          reject(err);
        }
      })();
    });
  });
}

export { getGif };