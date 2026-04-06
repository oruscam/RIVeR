import { app, ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as fs from "fs";
import * as path from "path";
import { createVideoFromFrames } from "./utils/createVideoFromFrames";

import { Canvas, loadImage } from "skia-canvas";

import {
  drawColorBar,
  drawQuiver,
  drawSection,
  drawWatermark,
  getGifDimensions,
  loadSectionValues
} from "./utils/gifFunctions";
import { getQuiverValues } from "../../commons/vectors";
import { PROJECT_CONFIG } from "../main";

const DEV_SERVER = process.env.VITE_DEV_SERVER_URL;

let watermarkPath = "";
if (DEV_SERVER) {
  watermarkPath = path.join(app.getAppPath(), "commons", "logo.png");
} else {
  watermarkPath = path.join(app.getAppPath(), "..", "logo.png");
}

async function getGif() {
  ipcMain.handle("get-gif", async (_event, args) => {
    const { framesPath, projectDirectory } = PROJECT_CONFIG;

    const {
      image,
      factor,
      sections,
      quiver,
      transformationMatrix,
      fps,
      step,
      colorbarLimits
    } = args;

    const maskPath = path.join(projectDirectory, "mask.png");

    const mask = await loadImage(maskPath);
    const watermark = await loadImage(watermarkPath);

    const dimensions = getGifDimensions(
      image.width,
      image.height,
      factor
    );

    const sectionValues = loadSectionValues(
      sections,
      image.width,
      image.height,
      factor
    );

    const dstPath = path.join(projectDirectory, "gif-frames");

    if (fs.existsSync(dstPath)) {
      fs.rmSync(dstPath, { recursive: true, force: true });
    }
    fs.mkdirSync(dstPath);

    args.watermarkPath = watermarkPath;
    args.maskPath = maskPath;
    args.dstPath = dstPath;

    const files = await fs.promises.readdir(framesPath);

    for (let index = 0; index < files.length - 1; index++) {
      const canvas = new Canvas(
        dimensions.outWidth,
        dimensions.outHeight
      );
      const ctx = canvas.getContext("2d");

      const file = files[index];
      const framePath = path.join(framesPath, file);
      const frameImage = await loadImage(framePath);

      // Frame
      ctx.drawImage(
        frameImage,
        0,
        0,
        frameImage.width,
        frameImage.height,
        dimensions.dx,
        dimensions.dy,
        dimensions.dw,
        dimensions.dh
      );

      // Mask
      ctx.drawImage(
        mask,
        0,
        0,
        frameImage.width,
        frameImage.height,
        dimensions.dx,
        dimensions.dy,
        dimensions.dw,
        dimensions.dh
      );

      // Sections
      drawSection(ctx, sectionValues, factor, dimensions.outHeight);

      // Quiver
      drawQuiver(
        ctx,
        quiver,
        index,
        transformationMatrix,
        factor,
        fps,
        step,
        dimensions.outWidth,
        colorbarLimits
      );

      // Colorbar
      drawColorBar(
        ctx,
        colorbarLimits.min,
        colorbarLimits.max,
        dimensions.outWidth,
        dimensions.outHeight
      );

      // Watermark — drawn last so it always appears on top of arrows and colorbar
      drawWatermark(
        ctx,
        watermark,
        dimensions.outWidth,
        dimensions.outHeight
      );

      const base = path.parse(file).name;
      const outPath = path.join(dstPath, `${base}.jpg`);

      const jpgBuffer = await canvas.toBuffer("jpeg", {
        quality: 1
      });

      await fs.promises.writeFile(outPath, jpgBuffer);
    }

    const gifPath = path.join(projectDirectory, "output.mp4");
    await createVideoFromFrames(dstPath, gifPath, fps, 'mp4');

    fs.rmSync(dstPath, { recursive: true, force: true });

    return { path: gifPath };
  });
}

export { getGif };
