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
const transformLine = (line: { x: number, y: number }[], isDecreced: boolean, isDepth: boolean, maxY: number) => {
    const newLine: { x: number, y: number }[] = [];

    // If the line is decreced and represents depth, reverse the line and adjust y values
    if (isDecreced && isDepth) {
        for (let i = line.length - 1; i >= 0; i--) {
            newLine.push({ x: line[i].x, y: maxY - line[i].y });
        }
    } else if (isDecreced) {
        // If the line is decreced but does not represent depth, just reverse the line
        for (let i = line.length - 1; i >= 0; i--) {
            newLine.push(line[i]);
        }
    } else if (isDepth) {
        // If the line is not decreced but represents depth, adjust y values
        for (let i = 0; i < line.length; i++) {
            newLine.push({ x: line[i].x, y: maxY - line[i].y });
        }
    } else {
        // If no transformation is needed, return the original line
        return { newLine: line, changed: false }
    }

    return { newLine: newLine, changed: true }
}

export { getBathimetry }