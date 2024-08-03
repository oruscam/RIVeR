import { ipcMain } from "electron";
import { PythonShell } from "python-shell";
import { ProjectConfig } from "./interfaces";


export async function pixelToRealWorld(PROJECT_CONFIG: ProjectConfig){
    ipcMain.handle('pixel-to-real-world', async (_event, args) => {
        console.log("Pixel to Real World")
        
        const options = {
            pythonPath: '/home/tomy_ste/Desktop/RIVeR/RIVeR/venv/bin/python3',
            scriptPath: '/home/tomy_ste/Desktop/RIVeR/RIVeR/river/cli/',
            args: [
                'transform-pixel-to-real-world',
                '--',
                args.points.x,
                args.points.y,
                PROJECT_CONFIG.matrixPath
            ],
        }

        const pyshell = new PythonShell('__main__.py', options);
        
        return new Promise((resolve, reject) => {
            pyshell.on('message', (message: string) => {
                const messageParsed = JSON.parse(message);
                resolve(messageParsed.data);
            });

            pyshell.end((err: Error) => {
                if (err) {
                    console.log("pyshell error");
                    console.log(err);
                    reject(err);
                }
            });
        
        })

    })
}

