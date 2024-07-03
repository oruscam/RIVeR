import { ipcMain } from "electron";
import { PythonShell } from "python-shell";
import * as fs from 'fs'
import * as path from 'path'


interface pixelSizeHandleArgs {
    pixelPoints: number[];
    rwPoints: number[];
    pixelSize: number;
    rw_length: number;
    directory: string;
}

export function pixelSizeHandler() {
    ipcMain.handle('pixel-size', async (_event, args: pixelSizeHandleArgs) => {
        console.log('En pixel-size event', args);
        const options = {
            pythonPath: '/home/tomy_ste/Desktop/RIVeR/RIVeR/venv/bin/python3',
            scriptPath: '/home/tomy_ste/Desktop/RIVeR/RIVeR/river/cli/',
            args: [
                'get-uav-transformation-matrix',
                '--pixel-size',
                args.pixelSize,
                args.pixelPoints[0],
                args.pixelPoints[1],
                args.pixelPoints[2],
                args.pixelPoints[3],
                args.rwPoints[0],
                args.rwPoints[1],
                args.rwPoints[2],
                args.rwPoints[3],
            ]
        }
        
        const json = await fs.promises.readFile(args.directory + '/config.json', 'utf-8');
        const jsonParsed = JSON.parse(json);
        
        jsonParsed.pixel_size = {
            size: args.pixelSize,
            rw_length: args.rw_length,
            x1: args.pixelPoints[0],
            y1: args.pixelPoints[1],
            x2: args.pixelPoints[2],
            y2: args.pixelPoints[3],
            east1: args.rwPoints[0],
            north1: args.rwPoints[1],
            east2: args.rwPoints[2],
            north2: args.rwPoints[3]
        }

        return new Promise((resolve, reject) => {
            const pyshell = new PythonShell('__main__.py', options);
            pyshell.on('message', async(message: string) => {
                
                await createUavMatrix(message, args.directory).then((matrixPath) => {
                    jsonParsed.pixel_size.uav_transformation_matrix = matrixPath;

                }).catch((err) => { console.log(err)});
                
                const updatedContent = JSON.stringify(jsonParsed, null, 4);
                await fs.promises.writeFile(args.directory + '/config.json', updatedContent , 'utf-8');
                resolve("La matriz ha sido creada con su respectivo JSON"); // Resuelve la promesa con el mensaje recib
            });

            pyshell.end((err: Error) => {
                if (err) {
                    console.log("Error al crear la matriz de transformación, en pyshell");
                    console.log(err);
                    reject(err); // Rechaza la promesa si hay un error
                }
            })
        })
    })
}

function createUavMatrix(message: string, directory: string): Promise<string>{
    return new Promise((resolve, reject) => {
        const matrixPath = path.join(directory, 'uav_transformation_matrix.json')
        const matrix = JSON.parse(message);

        fs.promises.writeFile(matrixPath, JSON.stringify(matrix.data.uav_matrix), 'utf-8').then(() => {
            resolve(matrixPath)
        }).catch((err) => {
            console.log(err)
            reject("Error al crear uav_transformation_matrix.json")
        });
    })
}