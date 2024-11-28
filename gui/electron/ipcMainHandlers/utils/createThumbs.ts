import { createRequire } from "module";
const require = createRequire(import.meta.url);
const ffmpeg = require('fluent-ffmpeg');
import * as fs from 'fs'
import * as path from 'path'
import { ProjectConfig } from "../interfaces";

async function createThumbs (PROJECT_CONFIG: ProjectConfig) {
    const { framesPath, directory } = PROJECT_CONFIG

    const thumbsPath = path.join(directory, 'thumbs');
    if (!fs.existsSync(thumbsPath)) {
        fs.mkdirSync(thumbsPath);
    } else {
        fs.rmdirSync(thumbsPath, { recursive: true });
        fs.mkdirSync(thumbsPath);
    }

    PROJECT_CONFIG.thumbsPath = thumbsPath
    
    try {
        const inputPattern = path.join(framesPath, '%*.jpg');
        const outputPattern = path.join(thumbsPath, '%010d.jpg');


        await new Promise<void>((resolve, reject) => {
            ffmpeg(inputPattern)
                .outputOptions([
                    '-vf', 'scale=300:-1',
                    '-q:v', '2' // Set the quality of the output images (lower is better)
                ])
                .on('end', () => {
                    resolve();
                })
                .on('error', (err: Error) => {
                    console.log(`Error creating thumbnails for frames in ${framesPath}`, err);
                    reject(err);
                })
                .save(outputPattern);
        });

    } catch (error) {
        console.log(error);
        throw error;
    }

}

export { createThumbs  }