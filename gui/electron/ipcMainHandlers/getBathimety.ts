import { dialog, ipcMain } from "electron"
import { basename } from 'path'
import {readFile, utils, set_fs} from 'xlsx'
import * as fs from 'fs'

set_fs(fs)

async function getBathimetry() {
    const options: Electron.OpenDialogOptions = {
        properties: ['openFile'],
        filters: [
            { name: 'Documents', extensions: ['csv', 'tsv', 'xlsx', 'xls', 'xlsm', 'ods', 'fods', 'prn', 'dif', 'sylk'] }
        ]
    }
    ipcMain.handle('get-bathimetry', async (_event, args) => {
        console.log('get-bathimetry')   

        const { path } = args;

        try {
            let bathPath: string = path;

            if ( bathPath === undefined) {
                const result = await dialog.showOpenDialog(options);
                bathPath = result.filePaths[0];
            }

            const bathimetryName = basename(bathPath);

            const workbook = readFile(bathPath);
            const sheetName = workbook.SheetNames[0];

            const sheet = workbook.Sheets[sheetName];

            const data = utils.sheet_to_json(sheet, { header: 1 });

            let maxY = -Infinity;
            let maxYIndex = -1;

            const line = data.map((row: any, index: number) => {
                const keys = Object.keys(row);
                const x = parseFloat(row[keys[0]]);
                const y = parseFloat(row[keys[1]]);

                if (!isNaN(y) && y > maxY) {
                    maxY = y;
                    maxYIndex = index;
                }

                return { x, y };
            }).filter((row: any) => !isNaN(row.x) && !isNaN(row.y));

            console.log(`Max value of keys[1]: ${maxY} at position: ${maxYIndex}`);

            return { path: bathPath, name: bathimetryName, line: line }
        } catch (error) {
            console.log(error)
        }
    })
}


export { getBathimetry }    