import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import { createMatrix } from "./utils/createMatrix";
import * as fs from 'fs'

// This function is only used in ipcam mode, because is the only mode that transformation matrix is created in front
// and not in the backend. This is because the transformation matrix change if the level of bathimetry change.
// In terms of velocity, is the best option, because we can change the transformation matrix in the front and see the results.

function saveTransformationMatrix (PROJECT_CONFIG: ProjectConfig) {
    ipcMain.handle('save-transformation-matrix', async (_event, args?) => {
        const { settingsPath,  directory } = PROJECT_CONFIG;
        const { transformationMatrix } = args;

        if ( transformationMatrix ){
            const settingsJson = await fs.promises.readFile(settingsPath, 'utf-8');
            const settingsJsonParsed = JSON.parse(settingsJson);
            settingsJsonParsed.transformation = {};
            
            await createMatrix(transformationMatrix, directory).then((matrixPath) => {
                PROJECT_CONFIG.matrixPath = matrixPath
                settingsJsonParsed.transformation.matrix = matrixPath
                
                fs.promises.writeFile(settingsPath, JSON.stringify(settingsJsonParsed, null, 4), 'utf-8')
            }).catch((err) => { console.log(err)})
        }
    });
}

export { saveTransformationMatrix }