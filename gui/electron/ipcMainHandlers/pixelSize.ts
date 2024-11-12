import { ipcMain } from "electron";
import * as fs from 'fs'
import * as path from 'path'
import { ProjectConfig, pixelSizeHandleArgs } from "./interfaces";
import { executePythonShell } from "./utils/executePythonShell";

function pixelSize( PROJECT_CONFIG: ProjectConfig ) {
    ipcMain.handle('pixel-size', async (_event, args: pixelSizeHandleArgs) => {
        console.log('En pixel-size event', args);
        const { directory, settingsPath } = PROJECT_CONFIG;
        const { dirPoints, rwPoints, pixelSize, rw_length } = args 

        const json = await fs.promises.readFile(settingsPath, 'utf-8');
        const jsonParsed = JSON.parse(json);
        
        jsonParsed.pixel_size = {
            size: pixelSize,
            rw_length: rw_length,
            x1: dirPoints[0].x,
            y1: dirPoints[0].y,
            x2: dirPoints[1].x,
            y2: dirPoints[1].y,
            east1: rwPoints[0].x,
            north1: rwPoints[0].y,
            east2: rwPoints[1].x,
            north2: rwPoints[1].y
        }

        const options = [
            'get-uav-transformation-matrix',
            '--pixel-size',
            pixelSize,
            dirPoints[0].x,
            dirPoints[0].y,
            dirPoints[1].x,
            dirPoints[1].y,
            rwPoints[0].x,
            rwPoints[0].y,
            rwPoints[1].x,
            rwPoints[1].y,
        ]
            
        try {
            const { data } = await executePythonShell(options) as any
            await createUavMatrix(data.uav_matrix, directory).then((matrixPath) => {
                jsonParsed.pixel_size.transformation_matrix = matrixPath;
                PROJECT_CONFIG.matrixPath = matrixPath;
            }).catch((err) => { console.log(err) });

            const updatedContent = JSON.stringify(jsonParsed, null, 4);
            await fs.promises.writeFile(settingsPath, updatedContent, 'utf-8');
            return { message: "La matriz ha sido creada con su respectivo JSON" }
        
        } catch (error) {
            console.log("Error en pixel-size")
            console.log(error)      
        }
    })
}

function createUavMatrix(message: string, directory: string): Promise<string>{
    return new Promise((resolve, reject) => {
        const matrixPath = path.join(directory, 'transformation_matrix.json')

        fs.promises.writeFile(matrixPath, JSON.stringify(message), 'utf-8').then(() => {
            resolve(matrixPath)
        }).catch((err) => {
            console.log(err)
            reject("Error al crear uav_transformation_matrix.json")
        });
    })
}

export { pixelSize }