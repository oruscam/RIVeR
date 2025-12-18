import { app, ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as fs from "fs"
import * as path from "path";
import { createGif } from "./utils/createGif";
import { createCanvas, loadImage } from 'canvas';
import { drawColorBar, drawQuiver, drawSection, drawWatermark, getGifDimensions, loadSectionValues } from "./utils/gifFunctions";

/**
 * IPC handler to generate a GIF in a worker thread.
 * @param PROJECT_CONFIG 
 */

const DEV_SERVER = process.env.VITE_DEV_SERVER_URL;
let watermarkPath = ''
if (DEV_SERVER) {
  watermarkPath = path.join(app.getAppPath(), 'commons', 'logo.png');

} else {
  watermarkPath = path.join(app.getAppPath(), '..', 'logo.png');
}

async function getGif(PROJECT_CONFIG: ProjectConfig) {
  ipcMain.handle("get-gif", async (_event, args) => {
    const { framesPath, projectDirectory } = PROJECT_CONFIG;

    const { image, factor, sections, quiver, transformationMatrix, fps, step, colorbarLimits } = args;

    const maskPath = path.join(projectDirectory, "mask.png");

    const mask = await loadImage(maskPath)
    const watermark = await loadImage(watermarkPath)

    const dimensions = getGifDimensions(image.width, image.height, factor);
    const sectionValues = loadSectionValues(sections, image.width, image.height, factor);
    
    const dstPath = path.join(projectDirectory, "gif-frames");

    if (fs.existsSync(dstPath)){
      fs.rmdirSync(dstPath, { recursive: true});
    }
    fs.mkdirSync(dstPath);

    args.watermarkPath = watermarkPath;
    args.maskPath = maskPath;
    args.dstPath = dstPath;

    const files = await fs.promises.readdir(framesPath);

    for (let index = 0; index < files.length - 1; index++) {
      const canvas = createCanvas(dimensions.outWidth, dimensions.outHeight);
      const ctx = canvas.getContext('2d');

      const file = files[index];
      let filePath = path.join(framesPath, file);
      const frameImage =  await loadImage(filePath);

      // Draw the resized frame
      ctx.drawImage(frameImage, 0, 0, frameImage.width, frameImage.height, dimensions.dx, dimensions.dy, dimensions.dw, dimensions.dh);
      // Draw the mask
      ctx.drawImage(mask, 0, 0, frameImage.width, frameImage.height, dimensions.dx, dimensions.dy, dimensions.dw, dimensions.dh);

      // Draw the watermark
      drawWatermark(ctx, watermark, dimensions.outWidth, dimensions.outHeight);

    
      // Draw the sections
      drawSection(ctx, sectionValues, factor, dimensions.outHeight);
      // Draw the quiver
      drawQuiver(ctx, quiver, index, transformationMatrix, factor, fps, step, dimensions.outWidth);

      // Draw the color bar
      drawColorBar(ctx, colorbarLimits.min, colorbarLimits.max, dimensions.outWidth, dimensions.outHeight);

      let fileWithoutExt = path.basename(file);
          fileWithoutExt = fileWithoutExt.split('.').slice(0, -1).join('.');
          
      filePath = path.join(dstPath, `${fileWithoutExt}.jpg`);
      filePath = path.join(dstPath, `${fileWithoutExt}.jpg`);
  
      const jpgBuffer = canvas.toBuffer('image/jpeg', { quality: 0.7 });
      const jpgBytes = new Uint8Array(jpgBuffer.buffer, jpgBuffer.byteOffset, jpgBuffer.byteLength);
      await fs.promises.writeFile(filePath, jpgBytes);

  }

    const gifPath = path.join(projectDirectory, "output.gif");

    await createGif(dstPath, gifPath, args.fps)

    fs.rmdirSync(dstPath, { recursive: true})
    
    return ({ path: dstPath });
  });
}


export { getGif };