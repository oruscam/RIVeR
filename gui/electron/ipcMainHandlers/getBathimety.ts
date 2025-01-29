import { dialog, ipcMain } from "electron"
import { basename } from 'path'
import {readFile, utils, set_fs, writeFile} from 'xlsx'
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

            let line = data.map((row: any, index: number) => {
                const keys = Object.keys(row);
                const x = parseFloat(row[keys[0]]);
                const y = parseFloat(row[keys[1]]);

                if (!isNaN(y) && y > maxY) {
                    maxY = y;
                    maxYIndex = index;
                }

                return { x, y };
            }).filter((row: any) => !isNaN(row.x) && !isNaN(row.y));

            const { isDecreced, isDepth } = analyzeLine(line, maxYIndex);

            const { newLine, changed } = transformLine(line, isDecreced, isDepth, maxY );

            line = newLine

            if ( changed ) {
                // Convertir el JSON a una hoja de cálculo
                const newSheet = utils.json_to_sheet(newLine);

                // Reemplazar la hoja de cálculo original con la nueva
                workbook.Sheets[sheetName] = newSheet;

                // Escribir el archivo de vuelta al sistema de archivos
                await writeFile(workbook, bathPath);
            }

            return { path: bathPath, name: bathimetryName, line: line, changed: changed };
        } catch (error) {
            console.log(error)
        }
    })
}

const analyzeLine = (line: { x: number, y: number }[], maxYIndex: number) => {
    const isDecreced = line[0].x > line[line.length - 1].x;
    const isDepth = !(maxYIndex === 0 || maxYIndex === line.length - 1 || maxYIndex === 1 || maxYIndex === line.length);
    return { isDecreced, isDepth };
};


// Transform the line to be in the correct order. And convert depth bathimetry to level bathimetry if needed

const transformLine = ( line: { x: number, y: number }[], isDecreced: boolean, isDepth: boolean, maxY: number  ) => {

    const newLine: { x: number, y: number }[] = [];

    if ( isDecreced && isDepth ) {
        for ( let i = line.length - 1; i >= 0; i-- ) {
            newLine.push({ x: line[i].x, y: maxY - line[i].y });
        }
    } else if ( isDecreced ){
        for ( let i = line.length - 1; i >= 0; i-- ) {
            newLine.push(line[i]);
        }
    } else if ( isDepth ){
        for ( let i = 0; i < line.length; i++ ) {
            newLine.push({ x: line[i].x, y: maxY - line[i].y });
        }
    } else { 
        return {newLine: line, changed: false}
    }


    return { newLine: newLine, changed: true}
}

export { getBathimetry }    