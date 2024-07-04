import { dialog, ipcMain } from "electron";
import * as fs from 'fs'
import * as path from 'path'
import { getVideoMetadata } from "./utils/getVideoMetadata";


export function loadProject(){
    const options: Electron.OpenDialogOptions = {
        properties: ['openFile'],
        filters: [
            { name: 'config', extensions: ['json']}
        ]
    }

    ipcMain.handle('load-project', async (_event, _args) => {
        try {
            const result = await dialog.showOpenDialog(options);
            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                const fileName = filePath.split('/').pop();
                const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
                const framesPath = path.join(folderPath, 'frames')
                let firstFrame = ""
                if (fileName === 'config.json') {
                    const images = await fs.promises.readdir(framesPath);
                    
                    if( images.length > 0){
                        firstFrame = path.join(framesPath, images[0])
                    }

                    const data = await fs.promises.readFile(filePath, 'utf-8');
                    const jsonParsed = JSON.parse(data);

                    try {
                        const videoMetadata = await getVideoMetadata(jsonParsed.filepath);
                        return {
                            success: true,
                            message: {
                                data: jsonParsed,
                                projectDirectory: folderPath,
                                videoMetadata: videoMetadata,
                                firstFrame: firstFrame
                            },
                        };
                    } catch (error) {
                        throw error;
                    }

                } else {
                    throw new Error("El archivo seleccionado debe ser config.json");
                }
            }
        } catch (error: unknown) {
            console.log(error);
            return { success: false, message: (error as Error).message };
        }
    });
}