import { IpcMain, ipcMain } from "electron";
import * as fs from 'fs/promises'


export function getImages(){
    ipcMain.handle('get-images', async (event, args) => {
        console.log("ESTAMOS EN get-images")
        
        try {
            const files = await fs.readdir(args.folder);
            return files
        } catch (error) {
            console.log("Error de get images")
            console.log(error)
        }
    }
    )
}   