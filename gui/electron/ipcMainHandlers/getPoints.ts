import { dialog, ipcMain } from "electron"
import {readFile, utils, set_fs, writeFile} from 'xlsx'
import * as fs from 'fs'

set_fs(fs)

async function getPoints(){
    const options: Electron.OpenDialogOptions = {
        properties: ['openFile'],
        filters: [
            { name: 'Documents', extensions: ['csv', 'tsv', 'xlsx', 'xls', 'xlsm', 'ods', 'fods', 'prn', 'dif', 'sylk'] }
        ]
    }

    ipcMain.handle('import-points', async (_event, args) => {
        const { path } = args

        try {
            let pointsPath: string = path;

            if ( pointsPath === undefined ) {
                const result = await dialog.showOpenDialog(options);
                pointsPath = result.filePaths[0];
            }
            
            const workbook = readFile(pointsPath);
            const sheetName = workbook.SheetNames[0];

            const sheet = workbook.Sheets[sheetName];

            let data = utils.sheet_to_json(sheet, { header: 1 });
            data = transformPoints(data as [[]])

            console.log('transform data', data)
            
            return {
                points: data,
                path: pointsPath
            };
        } catch (error) {
            console.log( error )
        }
    })
}

function transformPoints(points: [[]]){
    const newPoints = points.map((point: string[], index) => {
        const key = index
        const label = point[0];
        const X = parseFloat(point[1]);
        const Y = parseFloat(point[2]);
        const Z = parseFloat(point[3]);
        let x = 0;
        let y = 0;
        let wasEstablished = false
        
        // const id = index
        
        if ( point.length > 4){ 
            x = parseFloat(point[4]);
            y = parseFloat(point[5]);
            wasEstablished = true
        }

        return { key, index, label, X, Y, Z, x, y, selected: true, wasEstablished }
    })

    return newPoints;
}

export { getPoints }