import { dialog, ipcMain } from "electron"
import { basename } from 'path'
import { readFile, utils, set_fs, writeFile } from 'xlsx'
import * as fs from 'fs'

// Set the file system for xlsx library
set_fs(fs)

async function getBathimetry() {
    // Define options for the file dialog
    const options: Electron.OpenDialogOptions = {
        properties: ['openFile'],
        filters: [
            { name: 'Documents', extensions: ['csv', 'tsv', 'xlsx', 'xls', 'xlsm', 'ods', 'fods', 'prn', 'dif', 'sylk'] }
        ]
    }

    // Handle the 'get-bathimetry' IPC event
    ipcMain.handle('get-bathimetry', async (_event, args) => {
        const { path } = args;

        try {
            let bathPath: string = path;

            // If no path is provided, show the open file dialog
            if (bathPath === undefined) {
                const result = await dialog.showOpenDialog(options);
                bathPath = result.filePaths[0];
            }

            // Get the name of the bathymetry file
            const bathimetryName = basename(bathPath);

            // Read the workbook from the file
            const workbook = readFile(bathPath);
            const sheetName = workbook.SheetNames[0];

            // Get the first sheet from the workbook
            const sheet = workbook.Sheets[sheetName];

            // Convert the sheet to JSON format
            const data = utils.sheet_to_json(sheet, { header: 1 });

            let maxY = -Infinity;
            let maxYIndex = -1;

            // Map the data to an array of objects with x and y properties
            let line = data.map((row: any, index: number) => {
                const keys = Object.keys(row);
                const x = parseFloat(row[keys[0]]);
                const y = parseFloat(row[keys[1]]);

                if ( (isNaN(x) || isNaN(y)) && index !== 0 ) {
                    console.log('invalidBathimetryFileFormat')
                    console.log('x', x, 'y', y)
                    console.log('index', index)
                    throw new Error('invalidBathimetryFileFormat');
                }

                // Find the maximum y value and its index
                if (!isNaN(y) && y > maxY) {
                    maxY = y;
                    maxYIndex = index;
                }

                return { x, y };
            }).filter((row: any) => !isNaN(row.x) && !isNaN(row.y));

            // Analyze the line to determine if it is decreced and if it represents depth
            const { isDecreced, isDepth } = analyzeLine(line, maxYIndex);

            // Transform the line if necessary
            const { newLine, changed } = transformLine(line, isDecreced, isDepth, maxY);

            line = newLine

            // If the line was changed, write the new data back to the file
            if (changed) {
                // Convert the JSON back to a sheet
                const newSheet = utils.json_to_sheet(newLine);

                // Replace the original sheet with the new one
                workbook.Sheets[sheetName] = newSheet;

                // Write the workbook back to the file system
                await writeFile(workbook, bathPath);
            }

            // Return the path, name, line data, and whether it was changed
            return { path: bathPath, name: bathimetryName, line: line, changed: changed };
        } catch (error) {
            if ( error.message === 'invalidBathimetryFileFormat' ){
                return { error }
            }
            console.log(error)
        }
    })
}

// Analyze the line to determine if it is decreced and if it represents depth
const analyzeLine = (line: { x: number, y: number }[], maxYIndex: number) => {
    const isDecreced = line[0].x > line[line.length - 1].x;
    const isDepth = !(maxYIndex === 0 || maxYIndex === line.length - 1 || maxYIndex === 1 || maxYIndex === line.length);
    return { isDecreced, isDepth };
};

// Transform the line to be in the correct order and convert depth bathymetry to level bathymetry if needed
const transformLine = (line, isDecreced, isDepth, maxY) => {
    let newLine = [];

    // First transform the line as before
    if (isDecreced && isDepth) {
        for (let i = line.length - 1; i >= 0; i--) {
            newLine.push({ x: line[i].x, y: maxY - line[i].y });
        }
    } else if (isDecreced) {
        for (let i = line.length - 1; i >= 0; i--) {
            newLine.push(line[i]);
        }
    } else if (isDepth) {
        for (let i = 0; i < line.length; i++) {
            newLine.push({ x: line[i].x, y: maxY - line[i].y });
        }
    } else {
        return { newLine: line, changed: false };
    }

    // Now check the extremities and add an extra point if needed
    const firstPoint = newLine[0];
    const lastPoint = newLine[newLine.length - 1];

    if (firstPoint.y !== lastPoint.y) {
        // Determine which end is lower
        if (firstPoint.y < lastPoint.y) {
            // First point is lower, add a point at x=firstPoint.x with y=lastPoint.y
            newLine.push({ x: firstPoint.x, y: lastPoint.y });
        } else {
            // Last point is lower, add a point at x=lastPoint.x with y=firstPoint.y
            newLine.push({ x: lastPoint.x, y: firstPoint.y });
        }
    }

    return { newLine, changed: true };
}

export { getBathimetry }