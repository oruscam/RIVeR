// task-worker.js
import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import * as fs from "fs";
import { parentPort } from 'worker_threads';
import { drawQuiver, drawSection, drawWatermark } from '../utils/gif.js';

parentPort.on('message', async (task) => {
    const { id, file, dimensions, sectionValues, args , pass } = task

    if (pass){
        parentPort.postMessage({ id: task.id, result: 'ok' });
        return;
    }

    const { factor, maskPath, watermarkPath, transformationMatrix, dstPath, quiver } = args;

    const watermark = await loadImage(watermarkPath);
    const mask = await loadImage(maskPath);

    const canvas = createCanvas(dimensions.outWidth, dimensions.outHeight);
    const ctx = canvas.getContext("2d");

    const img = await loadImage(file);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, img.width, img.height, dimensions.dx, dimensions.dy, dimensions.dw, dimensions.dh);
    ctx.drawImage(mask, 0, 0, img.width, img.height, dimensions.dx, dimensions.dy, dimensions.dw, dimensions.dh);

    drawWatermark(ctx, watermark, dimensions.outWidth, dimensions.outHeight);
    drawSection(ctx, sectionValues, dimensions.factor);

    drawQuiver(ctx, quiver, id, transformationMatrix, factor);

    let fileWithoutExt = path.basename(file);
    fileWithoutExt = fileWithoutExt.split('.').slice(0, -1).join('.');
    
    const filePath = path.join(dstPath, `${fileWithoutExt}.jpg`);

    const jpgBuffer = canvas.toBuffer('image/jpeg', { quality: 0.7 });
    await fs.promises.writeFile(filePath, jpgBuffer);
    
    const result = { path: filePath };

    parentPort.postMessage({ id: task.id, result: result });
});