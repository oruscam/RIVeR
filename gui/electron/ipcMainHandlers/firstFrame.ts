import { ipcMain } from "electron";
import { FirstFrameArgs, ProjectConfig } from "./interfaces";
import { PythonShell } from "python-shell";
import * as fs from 'fs'

export function firstFrame(PROJECT_CONFIG: ProjectConfig){

    ipcMain.handle('first-frame', async( _event, args: FirstFrameArgs) => {
        PROJECT_CONFIG.framesPath = PROJECT_CONFIG.directory + '/frames';
        const {videoPath, framesPath} = PROJECT_CONFIG


        const options = {
            pythonPath: '/home/tomy_ste/Desktop/RIVeR/RIVeR/venv/bin/python3',
            scriptPath: '/home/tomy_ste/Desktop/RIVeR/RIVeR/river/cli/',
            args: [
                'video-to-frames',
                videoPath,
                framesPath,
                '--start-frame', args.start_frame,
                '--end-frame', args.end_frame,
                '--every', args.step,
                '--overwrite'
            ],
        }

        const json = await fs.promises.readFile(PROJECT_CONFIG.settingsPath, 'utf-8');
        const jsonParsed = JSON.parse(json);

        jsonParsed.video_range = {
            start: args.start_frame,
            end: args.end_frame,
            step: args.step
        }
        
        const updatedContent = JSON.stringify(jsonParsed, null, 4);
        await fs.promises.writeFile(PROJECT_CONFIG.settingsPath, updatedContent, 'utf-8');


        return new Promise((resolve, reject) => {
            const pyshell = new PythonShell('__main__.py', options);
            pyshell.on('message', (message: string) => {
                const messageParsed = JSON.parse(message); 
                resolve(messageParsed.data); // Resuelve la promesa con el mensaje recibido
            });

            pyshell.end((err: Error) => {
                if (err) {
                    console.log("pyshell error");
                    console.log(err);
                    reject(err); // Rechaza la promesa si hay un error
                }
            });
        });
    }
)}