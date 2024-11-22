import { dialog, ipcMain } from "electron";
import * as fs from 'fs'
import * as path from 'path'
import { getVideoMetadata } from "./utils/getVideoMetadata";
import { ProjectConfig } from "./interfaces";
import { readResultsPiv } from "./utils/readResultsPiv";
import { transformData } from "./utils/transformCrossSectionsData";


function loadProject(PROJECT_CONFIG: ProjectConfig){
    const options: Electron.OpenDialogOptions = {
        properties: ['openDirectory'],
    }

    ipcMain.handle('load-project', async (_event, _args) => {
        try {
            const result = await dialog.showOpenDialog(options);
            if (!result.canceled && result.filePaths.length > 0) {

                // Direction to the folder where settings.json and the project data is located
                const folderPath = result.filePaths[0];

                // settings.json, only the name of the settings file
                const fileName = 'settings.json'

                // Direction to settings.json
                const settingsPath = path.join(folderPath, fileName);

                if (fs.existsSync(settingsPath)) {
                    // Direction to the frames folder
                    const framesPath = path.join(folderPath, 'frames')

                    let firstFrame = ""
                    let xsectionsParsed = undefined
                    let piv_results = undefined
                
                    const data = await fs.promises.readFile(settingsPath, 'utf-8');
                    const settingsParsed = JSON.parse(data);


                    // * Assign the project configuration
                    PROJECT_CONFIG.directory = folderPath;
                    PROJECT_CONFIG.settingsPath = settingsPath;
                    PROJECT_CONFIG.framesPath = framesPath;
                    PROJECT_CONFIG.videoPath = settingsParsed.video.filepath;

                    const maskJson = path.join(folderPath, 'mask.json');
                    const maskPng = path.join(folderPath, 'mask.png');
                    const bboxPath = path.join(folderPath, 'bbox.json');
                    const resultsPath = path.join(folderPath, 'piv_results.json');

                    if (fs.existsSync(maskJson)) {
                        PROJECT_CONFIG.maskPath = maskJson;
                    } else {
                        console.warn(`Warning: ${maskJson} does not exist.`);
                    }

                    if (fs.existsSync(bboxPath)) {
                        PROJECT_CONFIG.bboxPath = bboxPath;
                    } else {
                        console.warn(`Warning: ${bboxPath} does not exist.`);
                    }

                    if (fs.existsSync(resultsPath)) {
                        PROJECT_CONFIG.resultsPath = resultsPath;

                    } else {
                        console.warn(`Warning: ${resultsPath} does not exist.`);
                    }

                    if( settingsParsed.footage === 'uav'){
                        PROJECT_CONFIG.type = 'uav';
                        if( settingsParsed.transformation_matrix !== undefined ){
                            PROJECT_CONFIG.matrixPath = path.join(folderPath, 'transformation_matrix.json');
                        }   

                        if( settingsParsed.xsections ){
                            PROJECT_CONFIG.xsectionsPath = settingsParsed.xsections;
                            const xsections = await fs.promises.readFile(PROJECT_CONFIG.xsectionsPath, 'utf-8');
                            xsectionsParsed = JSON.parse(xsections);
                        }

                        const images = await fs.promises.readdir(framesPath);
                        
                        if( images.length > 0){
                            firstFrame = path.join(framesPath, images[0])
                        }

                        if ( settingsParsed.piv_results ){
                            console.log(settingsParsed.piv_results)
                            PROJECT_CONFIG.resultsPath = settingsParsed.piv_results;
                            piv_results = await readResultsPiv(settingsParsed.piv_results);
                        }


                        try {
                            const videoMetadata = await getVideoMetadata(settingsParsed.video.filepath);
                            
                            return {
                                success: true,
                                message: {
                                    xsections: transformData(xsectionsParsed),
                                    settings: settingsParsed,
                                    projectDirectory: folderPath,
                                    videoMetadata: videoMetadata,
                                    firstFrame: firstFrame,
                                    mask: maskPng,
                                    piv_results: piv_results,
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

export { loadProject }