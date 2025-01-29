import { dialog, ipcMain } from "electron"
import {readFile, utils, set_fs, writeFile} from 'xlsx'
import * as fs from 'fs'

set_fs(fs)

async function getDistances(){
    const options: Electron.OpenDialogOptions = {
        properties: ['openFile'],
        filters: [
            { name: 'Documents', extensions: ['csv', 'tsv', 'xlsx', 'xls', 'xlsm', 'ods', 'fods', 'prn', 'dif', 'sylk'] }
        ]
    }

    ipcMain.handle('import-distances', async (_event, _args) => {

        try {

            const result = await dialog.showOpenDialog(options);
            const distancesPath = result.filePaths[0];
            
            const workbook = readFile(distancesPath);
            const sheetName = workbook.SheetNames[0];

            const sheet = workbook.Sheets[sheetName];

            let data = utils.sheet_to_json(sheet, { header: 1 });
            const distances = transformDistances(data as [string, number][])
            console.log(distances)

            return {
                distances
            };

        } catch (error) {
            return { error }
        }
    })
}

const transformDistances = (distances: any[]) => {
    const distancesObject: { [key: string]: number } = {};

    if (Array.isArray(distances[0]) && typeof distances[0][0] === 'string' && distances.length === 6) {
        // Caso en que distances es un array de tuplas [string, number]
        (distances as [string, number][]).forEach(([key, value]) => {
            distancesObject[key] = value;
        });
    } else if (Array.isArray(distances[0]) && typeof distances[0][0] === 'number' && distances.length === 6) {
        // Caso en que distances es un array de arrays de números
        const keys = ['d12', 'd23', 'd34', 'd41', 'd13', 'd24'];
        (distances as number[][]).forEach((valueArray, index) => {
            distancesObject[keys[index]] = valueArray[0];
        });
    } else {
        throw new Error('invalidDistancesFormat');
    }

    return distancesObject;
}

export { getDistances }