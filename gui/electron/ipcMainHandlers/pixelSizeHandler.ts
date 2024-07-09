import { ipcMain } from "electron";
import { PythonShell } from "python-shell";
import * as fs from 'fs'
import * as path from 'path'
import { ProjectConfig, pixelSizeHandleArgs } from "./interfaces";




export function pixelSizeHandler( PROJECT_CONFIG: ProjectConfig ) {
    ipcMain.handle('pixel-size', async (_event, args: pixelSizeHandleArgs) => {
        console.log('En pixel-size event', args);
        const { directory, jsonPath } = PROJECT_CONFIG;
        
        const { pixelPoints, rwPoints, pixelSize, rw_length } = args 

        const json = await fs.promises.readFile(jsonPath, 'utf-8');
        const jsonParsed = JSON.parse(json);
        
        jsonParsed.pixel_size = {
            size: pixelSize,
            rw_length: rw_length,
            x1: pixelPoints[0].x,
            y1: pixelPoints[0].y,
            x2: pixelPoints[1].x,
            y2: pixelPoints[1].y,
            east1: rwPoints[0].x,
            north1: rwPoints[0].y,
            east2: rwPoints[1].x,
            north2: rwPoints[1].y
        }

        const options = {
            pythonPath: '/home/tomy_ste/Desktop/RIVeR/RIVeR/venv/bin/python3',
            scriptPath: '/home/tomy_ste/Desktop/RIVeR/RIVeR/river/cli/',
            args: [
                'get-uav-transformation-matrix',
                '--pixel-size',
                pixelSize,
                pixelPoints[0].x,
                pixelPoints[0].y,
                pixelPoints[1].x,
                pixelPoints[1].y,
                rwPoints[0].x,
                rwPoints[0].y,
                rwPoints[1].x,
                rwPoints[1].y,
            ]
        }

        return new Promise((resolve, reject) => {
            const pyshell = new PythonShell('__main__.py', options);
            pyshell.on('message', async(message: string) => {
                
                await createUavMatrix(message, directory).then((matrixPath) => {
                    jsonParsed.pixel_size.uav_transformation_matrix = matrixPath;
                    PROJECT_CONFIG.matrixPath = matrixPath;

                }).catch((err) => { console.log(err)});
                
                const updatedContent = JSON.stringify(jsonParsed, null, 4);
                await fs.promises.writeFile(jsonPath, updatedContent , 'utf-8');
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