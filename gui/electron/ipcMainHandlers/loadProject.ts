import { dialog, ipcMain } from "electron";
import * as fs from 'fs'
import * as path from 'path'
import { getVideoMetadata } from "./utils/getVideoMetadata";
import { ProjectConfig } from "./interfaces";
import { readResultsPiv } from "./utils/readResultsPiv";
import { transformData } from "./utils/transformCrossSectionsData";
import { parseGrp3dPoints } from "./utils/parseGrp3dPoints";
import { parsedCameraSolution } from "./utils/parsedCameraSolution";


function loadProject(PROJECT_CONFIG: ProjectConfig){
    const options: Electron.OpenDialogOptions = {
        properties: ['openDirectory'],
    }

    ipcMain.handle('load-project', async (_event, _args) => {
        try {
            const result = await dialog.showOpenDialog(options);
            if (!result.canceled && result.filePaths.length > 0) {

                const filePrefix = import.meta.env.VITE_FILE_PREFIX

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
                    let xSections = undefined
                    let piv_results = undefined
                    let matrix = undefined
                    let grp_3d_points = undefined
                    let grp_3d_mode = undefined
                    let camera_solution_3d = undefined                    
                    let rectification_3d_images = undefined
                    let bbox = undefined

                    const data = await fs.promises.readFile(settingsPath, 'utf-8');
                    const settingsParsed = JSON.parse(data);

                    // * Assign the project configuration
                    PROJECT_CONFIG.directory = folderPath;
                    PROJECT_CONFIG.settingsPath = settingsPath;
                    PROJECT_CONFIG.framesPath = framesPath;
                    PROJECT_CONFIG.videoPath = settingsParsed.video.filepath;
                    PROJECT_CONFIG.logsPath = path.join(folderPath, 'river.log');

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
                        bbox = await fs.promises.readFile(bboxPath, 'utf-8');
                        bbox = JSON.parse(bbox);
                        console.log('bbox', bbox)
                    } else {
                        console.warn(`Warning: ${bboxPath} does not exist.`);
                    }

                    if (fs.existsSync(resultsPath)) {
                        PROJECT_CONFIG.resultsPath = resultsPath;

                    } else {
                        console.warn(`Warning: ${resultsPath} does not exist.`);
                    }

                    if( settingsParsed.footage ){
                        PROJECT_CONFIG.type = settingsParsed.footage;
                        if( settingsParsed.transformation_matrix !== undefined ){
                            PROJECT_CONFIG.matrixPath = path.join(folderPath, 'transformation_matrix.json');
                            matrix = await fs.promises.readFile(PROJECT_CONFIG.matrixPath, 'utf-8');
                            matrix = JSON.parse(matrix);
                        }   

                        if( settingsParsed.xsections ){
                            PROJECT_CONFIG.xsectionsPath = settingsParsed.xsections;
                            xSections = await fs.promises.readFile(PROJECT_CONFIG.xsectionsPath, 'utf-8');
                            xSections = transformData(JSON.parse(xSections));
                        }

                        const images = await fs.promises.readdir(framesPath);
                        let paths: string[];

                        if( images.length > 0){
                            firstFrame = path.join(framesPath, images[0])
                            paths = images.map((image) => path.join(filePrefix,framesPath, image))    
                        }

                        if ( settingsParsed.piv_results ){
                            PROJECT_CONFIG.resultsPath = settingsParsed.piv_results;
                            piv_results = await readResultsPiv(settingsParsed.piv_results);
                        }

                        if ( settingsParsed.grp_3d ){
                            const jsonContent = await fs.promises.readFile(settingsParsed.grp_3d, 'utf-8');
                            const { points, mode } = parseGrp3dPoints(jsonContent)
                            grp_3d_points = points;
                            grp_3d_mode = mode;
                        }

                        if ( settingsParsed.camera_solution_3d ){
                            camera_solution_3d = await fs.promises.readFile(settingsParsed.camera_solution_3d, 'utf-8');
                            camera_solution_3d = parsedCameraSolution(camera_solution_3d);
                        }

                        if ( settingsParsed.rectification_3d_images ){
                            const images = await fs.promises.readdir(settingsParsed.rectification_3d_images);
                            rectification_3d_images = images.map((image: string) => path.join(filePrefix, settingsParsed.rectification_3d_images, image));
                        }
                        
                        try {
                            const videoMetadata = await getVideoMetadata(settingsParsed.video.filepath);
                            
                            return {
                                success: true,
                                message: {
                                    xsections: xSections,
                                    settings: settingsParsed,
                                    projectDirectory: folderPath,
                                    videoMetadata: videoMetadata,
                                    firstFrame: firstFrame,
                                    mask: maskPng,
                                    bbox: bbox,
                                    piv_results: piv_results,
                                    paths: paths,
                                    matrix: matrix,
                                    rectification3D: {
                                        points: grp_3d_points,
                                        mode: grp_3d_mode,
                                        cameraSolution: camera_solution_3d,
                                        hemisphere: settingsParsed.hemisphere,
                                        images: rectification_3d_images,
                                        imagesPath: settingsParsed.rectification_3d_images
                                    }
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