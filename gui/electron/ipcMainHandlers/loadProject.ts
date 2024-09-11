import { dialog, ipcMain } from "electron";
import * as fs from 'fs'
import * as path from 'path'
import { getVideoMetadata } from "./utils/getVideoMetadata";
import { ProjectConfig } from "./interfaces";


export function loadProject(PROJECT_CONFIG: ProjectConfig){
    const options: Electron.OpenDialogOptions = {
        properties: ['openDirectory'],
    }

    ipcMain.handle('load-project', async (_event, _args) => {
        try {
            const result = await dialog.showOpenDialog(options);
            if (!result.canceled && result.filePaths.length > 0) {

                // Direction to the folder where settings.json and the project data is located
                const folderPath = result.filePaths[0];

                // settings.json, only the name of the file
                const fileName = 'settings.json'

                // Direction to settings.json
                const filePath = path.join(folderPath, fileName);

                if (fs.existsSync(filePath)) {
                    // Direction to the frames folder
                    const framesPath = path.join(folderPath, 'frames')

                    let firstFrame = ""
                    let xsectionsParsed = undefined
                
                    const data = await fs.promises.readFile(filePath, 'utf-8');
                    const dataParsed = JSON.parse(data);


                    // * assign the project configuration
                    PROJECT_CONFIG.directory = folderPath;
                    PROJECT_CONFIG.settingsPath = filePath;
                    PROJECT_CONFIG.framesPath = framesPath;
                    PROJECT_CONFIG.videoPath = dataParsed.filepath;

                    if( dataParsed.footage === 'uav'){
                        PROJECT_CONFIG.type = 'uav';
                        if( dataParsed.pixel_size?.uav_transformation_matrix ){
                            PROJECT_CONFIG.matrixPath = path.join(folderPath, 'uav_transformation_matrix.json');
                        }   

                        if( dataParsed.xsections ){
                            PROJECT_CONFIG.xsectionsPath = path.join(folderPath, 'xsections.json');
                            const xsections = await fs.promises.readFile(PROJECT_CONFIG.xsectionsPath, 'utf-8');
                            xsectionsParsed = JSON.parse(xsections);
                            console.log(xsectionsParsed)
                        }

                        const images = await fs.promises.readdir(framesPath);
                        
                        if( images.length > 0){
                            firstFrame = path.join(framesPath, images[0])
                        }
                        console.log('antes del try')
                        try {
                            const videoMetadata = await getVideoMetadata(dataParsed.filepath);
                            return {
                                success: true,
                                message: {
                                    xsections: xsectionsParsed,
                                    data: dataParsed,
                                    projectDirectory: folderPath,
                                    videoMetadata: videoMetadata,
                                    firstFrame: firstFrame
                                },
                            };
                        } catch (error) {
                            console.log(error)
                            throw error;
                        }
                    }
                } else {
                    throw new Error("El directorio seleccionado no contiene un archivo settings.json");
                }
            }
        } catch (error: unknown) {
            console.log(error);
            return { success: false, message: (error as Error).message };
        }
    });
}