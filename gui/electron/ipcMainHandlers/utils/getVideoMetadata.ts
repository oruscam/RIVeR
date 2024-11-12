import { createRequire } from "module";
const require = createRequire(import.meta.url);
const ffmpeg = require('fluent-ffmpeg');
import { FFProbeData, Metadata } from "../interfaces";
import path from 'path'

const supportedFormat = 'MP4'

async function getVideoMetadata( videoPath: string): Promise<{ width: number; height: number; fps: number; duration: string, creation: string, name: string, path: string }> {
    const extension = path.extname(videoPath).slice(1);

    if ( extension.toUpperCase() !== supportedFormat) {
        videoPath = await convertToMp4(videoPath);
    }

    try {
        const metadata: Metadata = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err: Error, data: FFProbeData): void => {
                if (err) reject(err);
                else resolve(data);
            });
        });

        const { width, height, r_frame_rate, duration } = metadata.streams[0];
        const { tags } = metadata.format;
        
        // Convert FPS from a string like "30/1" to a number
        const [numerator, denominator] = r_frame_rate.split('/').map(Number);
        const fps = Math.round(numerator / denominator);

        const videoName = path.basename(videoPath)

        return {
            width: width,
            height: height,
            fps: fps,
            duration: duration,
            creation: tags?.creation_time,
            name: videoName,
            path: videoPath
        };

    } catch (error) {
        console.log(error)
        throw new Error('Error en la obtención de metadatos del video:' + error);
    }
}


async function convertToMp4(videoPath: string): Promise<string> {
    const outputFilePath = videoPath.replace(path.extname(videoPath), '.mp4');
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .output(outputFilePath)
            .on('end', () => resolve(outputFilePath))
            .on('error', (err: Error) => reject('No se pudo convertir el video a mp4'))
            .run();
    });
}
export { getVideoMetadata }