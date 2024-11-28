import { ipcMain } from "electron";
import * as fs from 'fs/promises'
import * as path from 'path'
import { ProjectConfig } from "./interfaces";


function getImages(PROJECT_CONFIG: ProjectConfig) {
    const filePrefix = import.meta.env.VITE_FILE_PREFIX

    ipcMain.handle('get-images', async (_event, _args) => {
        const { thumbsPath } = PROJECT_CONFIG
        try {
            const files = await fs.readdir(thumbsPath);
            const images = files.map((file) => {
                return path.join(filePrefix, thumbsPath, file)
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