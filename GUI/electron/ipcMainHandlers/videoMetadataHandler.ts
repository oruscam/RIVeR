import { ipcMain } from "electron";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const ffmpeg = require('fluent-ffmpeg');
import { FFProbeData, Metadata } from "./interfaces";
import { createFolderStructure } from "./createFolderStructure";
import * as path from 'path'


export function videoMetadataHandler(userDir: string) {
    ipcMain.handle('video-metadata', async( _event, arg: {path: string, name: string, type: string}) => {
        console.log("Event video-metadata en main" , arg)
        const [ videoName ] = arg.name.split('.');
        const newPath = path.join(userDir, 'River', videoName);

        createFolderStructure(newPath, arg.type, arg.path)

        try {
            const metadata: Metadata = await new Promise((resolve, reject) => {
                ffmpeg.ffprobe(arg.path, (err: Error, data: FFProbeData): void => {
                    if (err) reject(err);
                    else resolve(data);
                })
            })

            const { width, height, r_frame_rate, duration } = metadata.streams[0];
            // CONVIERTO FPS EN UN NUMBER, PORQUE VIENE COMO UN STRING 30/1
            const [numerator, denominator] = r_frame_rate.split('/').map(Number);
            const fps = Math.round(numerator / denominator);
            return {
                width: width,
                height: height,
                fps: fps,
                duration: duration,
                directory: newPath
            };

        } catch (error) {
            console.log(error)
            throw new Error('Error en la obtención de metadatos del video:');
        }
    }
    )
}


