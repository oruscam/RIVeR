import { ipcMain } from "electron";
import * as fs from 'fs/promises'
import * as path from 'path'
import { ProjectConfig } from "./interfaces";


function getImages(PROJECT_CONFIG: ProjectConfig) {
    ipcMain.handle('get-images', async (_event, _args) => {
        const { framesPath } = PROJECT_CONFIG
        try {
            const files = await fs.readdir(framesPath);
            const images = files.map((file) => {
                return path.join(framesPath, file)
            })
            return images
        } catch (error) {
            console.log("Error de get images")
            console.log(error)
        }
    }
    )
}   


export { getImages }