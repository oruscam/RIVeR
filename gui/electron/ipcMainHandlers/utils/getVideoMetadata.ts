import { createRequire } from "module";
const require = createRequire(import.meta.url);
const ffmpeg = require('fluent-ffmpeg');
import { FFProbeData, Metadata } from "../interfaces";


async function getVideoMetadata(path: string): Promise<{ width: number; height: number; fps: number; duration: string, creation: string }> {
    try {
        const metadata: Metadata = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(path, (err: Error, data: FFProbeData): void => {
                if (err) reject(err);
                else resolve(data);
            });
        });

        console.log(metadata)

        const { width, height, r_frame_rate, duration } = metadata.streams[0];
        const { tags } = metadata.format;
        
        // Convert FPS from a string like "30/1" to a number
        const [numerator, denominator] = r_frame_rate.split('/').map(Number);
        const fps = Math.round(numerator / denominator);
        
        return {
            width: width,
            height: height,
            fps: fps,
            duration: duration,
            creation: tags.creation_time
        };

    } catch (error) {
        console.log(error)
        throw new Error('Error en la obtención de metadatos del video:');
    }
}


export { getVideoMetadata }