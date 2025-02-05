import { dialog, ipcMain } from "electron"
import * as fs from 'fs'
import { extname, join } from 'path'
import { ProjectConfig } from "./ipcMainHandlers/interfaces"

function getIpcamImages(PROJECT_CONFIG: ProjectConfig){
    const options: Electron.OpenDialogOptions = {
        properties: ['openDirectory'],
    }

    ipcMain.handle('ipcam-images', async (_event, args) => {
        const { path } = args
        const { settingsPath } = PROJECT_CONFIG

        const json = await fs.promises.readFile(settingsPath, 'utf-8')
        const jsonParsed = JSON.parse(json)

        const filePrefix = import.meta.env.VITE_FILE_PREFIX
        const validImageExtensions = ['.jpg', '.jpeg', '.png'];

        try {
            let imagesPath: string = path;

            if ( imagesPath === undefined ) {
                const result = await dialog.showOpenDialog(options);
                imagesPath = result.filePaths[0];
            }

            let images = await fs.promises.readdir(imagesPath);


            if ( images.length === 0 ) {
                throw new Error('imagesFolderEmpty')
            }

            images = images.map((file) => {
                if ( validImageExtensions.includes(extname(file)) === false ) {
                    throw new Error('invalidImageExtension')
                };
                return join(filePrefix, imagesPath, file)
            })

            jsonParsed.rectification_3d_images = imagesPath
            const updatedContent = JSON.stringify(jsonParsed, null, 2)
            await fs.promises.writeFile(settingsPath, updatedContent, 'utf-8')

            return {
                images: images,
                path: imagesPath
            }
        } catch (error) {
            return { error } 
        }    
        
    })
}

export { getIpcamImages }