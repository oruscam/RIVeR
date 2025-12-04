import { parentPort, workerData } from "node:worker_threads";
import * as fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const watermark = path.join(__dirname, '../../../commons/logo.png');
import { drawQuiver, drawSection, drawWatermark, getGifDimensions, loadSectionValues } from "../utils/gif.js";

(async () => {
  const { PROJECT_CONFIG, args } = workerData;

  const { framesPath, projectDirectory } = PROJECT_CONFIG;
  const startTime = Date.now();

  try {
    console.time('Gif init')
    const files = await fs.promises.readdir(framesPath);

    const algorithm = args.algorithm || "neuquant";
    const dstPath = path.join(projectDirectory, `${algorithm}.output.gif`);
    const { image, quiver, factor, sections } = args;

    const GIFEncoder = require("gif-encoder-2");
    const { createCanvas, loadImage } = require("canvas");

    const writeStream = fs.createWriteStream(dstPath);

    const { outWidth, outHeight, dw, dh, dx, dy } = getGifDimensions(image.width, image.height, factor);
    const encoder = new GIFEncoder(outWidth, outHeight, algorithm, true);

    // conectar encoder al stream
    encoder.createReadStream().pipe(writeStream);

    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(typeof args.delay === "number" ? args.delay : 200);
    encoder.setQuality(args.quality);
    encoder.setThreshold(95);

    const canvas = createCanvas(outWidth, outHeight);
    const ctx = canvas.getContext("2d");

    // const watermarkImage = await loadImage(watermark);
    const maskImage = await loadImage(path.join(projectDirectory, "mask.png"));
    const sectionValues = loadSectionValues(sections, image.width, image.height, factor);

    console.timeEnd('Gif init')

    const arrayBuffer = []

    for (let index = 0; index < files.length - 1; index++) {
      console.time('Frame time')
      const filePath = path.join(framesPath, files[index]);
      const img = await loadImage(filePath);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
      ctx.drawImage(maskImage, 0, 0, img.width, img.height, dx, dy, dw, dh);

      // drawWatermark(ctx, watermarkImage, outWidth, outHeight);
      drawSection(ctx, sectionValues, factor);
      drawQuiver(ctx, quiver, index, args.transformationMatrix, factor);

      console.timeEnd('Frame time')
      console.time('Add frames to buffer')
      arrayBuffer.push(Buffer.from(ctx.getImageData(0, 0, outWidth, outHeight).data));
      // encoder.addFrame(ctx);
      console.timeEnd('Add frames to buffer')
    }

    console.log('array Buffer', arrayBuffer);

    // Agregar todos los frames al encoder
    console.time('Total Encoder Time');
    for (const ctx of arrayBuffer) {
      console.time('Encoding Time');
      encoder.addFrame(ctx);
      console.timeEnd('Encoding Time');
    }
    console.timeEnd('Total Encoder Time');

    // esperar a que termine la escritura
    console.time('Finalizing GIF');
    await new Promise((resolve, reject) => {
      writeStream.once("finish", () => resolve());
      writeStream.once("error", reject);
      try {
        encoder.finish();
        console.timeEnd('Finalizing GIF');
      } catch (e) {
        reject(e);
      }
    });

    const durationMs = ((Date.now() - startTime) / 1000).toFixed(2);
    parentPort?.postMessage({ path: dstPath, time: durationMs });
  } catch (err) {
    // en caso de error, reportar al main
    if (err instanceof Error) {
      throw err;
    } else {
      throw new Error(String(err));
    }
  }
})();