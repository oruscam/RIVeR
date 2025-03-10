import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as fs from 'fs'
import * as path from 'path'
import { createMatrix } from "./utils/createMatrix";

function setControlPoints(PROJECT_CONFIG: ProjectConfig, riverCli: Function) {
    ipcMain.handle('set-control-points', async ( _event, args ) => {

        const { settingsPath, directory, logsPath, firstFrame } = PROJECT_CONFIG;
        const { coordinates, distances } = args;
        const json = await fs.promises.readFile(settingsPath, 'utf-8');
        const jsonParsed = JSON.parse(json);

        jsonParsed.control_points = {
            "coordinates": {
                "x1": coordinates[0].x,
                "y1": coordinates[0].y,
                "x2": coordinates[1].x,
                "y2": coordinates[1].y,
                "x3": coordinates[2].x,
                "y3": coordinates[2].y,
                "x4": coordinates[3].x,
                "y4": coordinates[3].y
            },
            "distances": {
                "d12": distances.d12,
                "d23": distances.d23,
                "d34": distances.d34,
                "d41": distances.d41,
                "d13": distances.d13,
                "d24": distances.d24
            }
        }

        const options = [
            'get-oblique-transformation-matrix',
            '--image-path',
            firstFrame,
            '-w',
            directory,
            coordinates[0].x,
            coordinates[0].y,
            coordinates[1].x,
            coordinates[1].y,
            coordinates[2].x,
            coordinates[2].y,
            coordinates[3].x,
            coordinates[3].y,
            distances.d12,
            distances.d23,
            distances.d34,
            distances.d41,
            distances.d13,
            distances.d24   
        ]

        try {
            const { data, error } = await riverCli(options, 'text', 'false', logsPath)

            if ( error.message ){
                return { error }
            }

            await createMatrix(data.oblique_matrix, directory).then((matrixPath) => {
                jsonParsed.transformation_matrix = matrixPath;
                PROJECT_CONFIG.matrixPath = matrixPath;
            }).catch((err) => { console.log(err) });

            const updatedContent = JSON.stringify(jsonParsed, null, 4);
            await fs.promises.writeFile(settingsPath, updatedContent, 'utf-8');

            console.log('transformation matrix', data)
            
            return {
                obliqueMatrix: data.transformation_matrix,
                roi: data.roi,
                extent: data.extent,
                resolution: data.output_resolution,
                transformed_image_path: data.transformed_image_path
            }

        } catch (error) {
            console.log("Error en set-control-points")
            console.log(error)
        }
    })
}

export { setControlPoints } 