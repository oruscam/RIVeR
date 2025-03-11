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
    const keys = ['d12', 'd23', 'd34', 'd41', 'd13', 'd24'];

    if ( distances.length > 7 ){
        console.log('case-error-1, mas de 7 filas');

        throw new Error('invalidDistancesFileFormat');
    } else {
        // The first row is the headers. We dont need them
        if ( distances.length === 7 ){
            distances.shift();
        }

        let newDistances = [];

        if ( typeof distances[0][0] === 'string' && typeof distances[0][1] === 'number' && distances.length === 6 ){
            console.log('case-1, complete data');
            console.log('distances', distances);
            // In this case, each row is an array [string, number]. We need to analyze the string part
            const distanceMap: { [key: string]: number } = {};
            distances.forEach(([key, value]) => {
                const normalizedKey = key.replace(/[_-dD]/g, '');
                let sortedKey: string = ''
                if ( normalizedKey === '41' || normalizedKey === '14'){
                    sortedKey = 'd41';
                } else {
                    sortedKey = `d${normalizedKey.split('').sort().join('')}`;
                }
                    
                distanceMap[sortedKey] = value;
            });


            newDistances = keys.map(key => {
                console.log(key, distanceMap);
                console.log('key in distanceMap', key in distanceMap);
                if (!(key in distanceMap)) {
                    throw new Error('invalidDistancesFileFormat');
                }
                return distanceMap[key];
            });

        } else if ( typeof distances[0][0] === 'number' && distances.length === 6 ){
            newDistances = distances.map(value => value[0]);
        } else {
            throw new Error('invalidDistancesFileFormat');
        }

        console.log('newDistances', newDistances);

        newDistances.forEach(( value, index ) => {
            if ( typeof value !== 'number' ){
                throw new Error('invalidDistancesNotValidValue')
            }
            if ( value < 0 ){
                throw new Error('invalidDistancesNegativeValue')
            }

            distancesObject[keys[index]] = value;
        })
    }

    return distancesObject;
}

export { getDistances }