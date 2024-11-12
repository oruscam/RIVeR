import { ipcMain } from "electron";
import { createFolderStructure } from "./createFolderStructure";
import * as path from 'path'
import { getVideoMetadata } from "./utils/getVideoMetadata";
import { ProjectConfig } from "./interfaces";


function initProject(userDir: string, PROJECT_CONFIG: ProjectConfig) {
    ipcMain.handle('init-project', async( _event, arg: {path: string, name: string, type: string}) => {
        console.log("Init Project" , arg)

        const [ videoName ] = arg.name.split('.');
        const newDirectory = path.join(userDir, 'River', videoName);

        try {
            const result = await getVideoMetadata(arg.path)
            await createFolderStructure(newDirectory, arg.type, result.path, arg.name, result)

            PROJECT_CONFIG.directory = newDirectory
            PROJECT_CONFIG.type = arg.type
            PROJECT_CONFIG.videoPath = arg.path
            PROJECT_CONFIG.settingsPath = path.join(newDirectory, 'settings.json')
            
            return {
                result: {
                    ...result,
                    directory: newDirectory
                }
            }
        } catch (error) {
            if ( error.message === 'user-cancel-operation') {
                return {
                    error: {
                        message: error.message,
                        type: 'user-cancel-operation'
                    }
                }
            }
            throw error;
        }
    }
    )
}

export { initProject }