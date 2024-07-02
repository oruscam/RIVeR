import { ipcMain } from "electron";
import { FirstFrameArgs } from "./interfaces";
import { PythonShell } from "python-shell";
import * as fs from 'fs'

export function firstFrameHandler(){
    ipcMain.handle('first-frame', async( _event, args: FirstFrameArgs) => {
        const folder = args.directory + '/frames';
        const options = {
            pythonPath: '/home/tomy_ste/Desktop/RIVeR/RIVeR/venv/bin/python3',
            scriptPath: '/home/tomy_ste/Desktop/RIVeR/RIVeR/river/cli/',
            args: [
                'video-to-frames',
                args.video_path,
                folder,
                '--start-frame', args.start_frame,
                '--end-frame', args.end_frame,
                '--every', args.step,
                '--overwrite'
            ],
        }

        const json = await fs.promises.readFile(args.directory + '/config.json', 'utf-8');
        const jsonParsed = JSON.parse(json);

        jsonParsed.video_range = {
            start: args.start_frame,
            end: args.end_frame,
            step: args.step
        }
        
        const updatedContent = JSON.stringify(jsonParsed, null, 4);
        await fs.promises.writeFile(args.directory + '/config.json', updatedContent, 'utf-8');


        return new Promise((resolve, reject) => {
            const pyshell = new PythonShell('__main__.py', options);
            pyshell.on('message', (message: string) => {
                console.log(message);
                resolve(message); // Resuelve la promesa con el mensaje recibido
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