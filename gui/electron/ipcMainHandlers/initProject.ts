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
            const directory = await createFolderStructure(newDirectory, arg.type, result.path, arg.name, result)

            PROJECT_CONFIG.directory = directory
            PROJECT_CONFIG.type = arg.type
            PROJECT_CONFIG.videoPath = arg.path
            PROJECT_CONFIG.settingsPath = path.join(directory, 'settings.json')
            PROJECT_CONFIG.logsPath = path.join(directory, 'river.log')
            
            return {
                result: {   
                    ...result,
                    directory: directory
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
            if ( error.code === 'EBUSY' ) {
                return {
                    error: {
                        message: error.message,
                        type: 'resource-busy'
                    }
                }
            }

            throw error;
        }
    }
    )
}

export { initProject }