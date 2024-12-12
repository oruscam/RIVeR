import { ipcMain } from "electron";
import * as fs from 'fs/promises'
import * as path from 'path'
import { ProjectConfig } from "./interfaces";


function getImages(PROJECT_CONFIG: ProjectConfig) {
    const filePrefix = import.meta.env.VITE_FILE_PREFIX

    ipcMain.handle('get-images', async (_event, args) => {
        const { framesPath } = PROJECT_CONFIG
        const { index } = args
        try {
            const files = await fs.readdir(framesPath);
            const image1 = path.join(filePrefix, framesPath, files[index])
            const image2 = path.join(filePrefix, framesPath, files[index + 1])
            return [image1, image2]
        } catch (error) {
            console.log("Error de get images")
            console.log(error)
        }
    }
    )
}   

export { getImages }