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

            const line = data.map((row: any) => {
                const keys = Object.keys(row);

                return {
                    x: parseFloat(row[keys[0]]),
                    y: parseFloat(row[keys[1]])
                }
            }).filter((row: any) => !isNaN(row.x) && !isNaN(row.y));



            return { path: bathPath, name: bathimetryName, line: line }
        } catch (error) {
            console.log(error)
        }
    })
}


export { getBathimetry }    