import { dialog, ipcMain } from "electron"
import * as path from 'path'

async function getBathimetry() {
    const options: Electron.OpenDialogOptions = {
        properties: ['openFile'],
        filters: [
            { name: 'Documents', extensions: ['csv', 'tsv']}
        ]
    }
    ipcMain.handle('get-bathimetry', async (_event, _args) => {
        console.log('get-bathimetry')
        try {
            const result = await dialog.showOpenDialog(options);
            const bathimetryPath = result.filePaths[0];
            const bathimetryName = path.basename(bathimetryPath);
            const [ _name, type ] = bathimetryName.split('.')

            return { path: bathimetryPath, name: bathimetryName, type }
        } catch (error) {
            console.log(error)
        }
    })
}


export { getBathimetry }