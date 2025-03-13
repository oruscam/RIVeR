import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import { createMatrix } from "./utils/createMatrix";
import * as fs from 'fs'

// This function is only used in ipcam mode, because is the only mode that transformation matrix is created in front
// and not in the backend. This is because the transformation matrix change if the level of bathimetry change.
// In terms of velocity, is the best option, because we can change the transformation matrix in the front and see the results.

function saveTransformationMatrix (PROJECT_CONFIG: ProjectConfig) {
    ipcMain.handle('save-transformation-matrix', async (_event, args?) => {
        const { settingsPath } = PROJECT_CONFIG;
        const { transformationMatrix } = args;

        if ( transformationMatrix ){
            const settings = await fs.promises.readFile(settingsPath, 'utf-8');
            const settingsParsed = JSON.parse(settings);
            settingsParsed.transformation = {};
            
            await createMatrix(transformationMatrix, PROJECT_CONFIG, settingsParsed).then((matrixPath) => {
                PROJECT_CONFIG.matrixPath = matrixPath
                settingsParsed.transformation.matrix = matrixPath
                fs.promises.writeFile(settingsPath, JSON.stringify(settingsParsed, null, 4), 'utf-8')
            }).catch((err) => { console.log(err)})
        }
    });
}

export { saveTransformationMatrix }