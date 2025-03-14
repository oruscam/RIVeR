import { ipcMain } from "electron";
import { createFolderStructure } from "./createFolderStructure";
import { join } from 'path'
import { getVideoMetadata } from "./utils/getVideoMetadata";
import { ProjectConfig } from "./interfaces";

function initProject(userDir: string, PROJECT_CONFIG: ProjectConfig) {
    ipcMain.handle('init-project', async( _event, args: { path: string, name: string, type: string, language: string }) => {
        const { name, path, type, language } = args

        const [ videoName ] = name.split('.');
        const newDirectory = join(userDir, 'River', videoName);

        try {
            const result = await getVideoMetadata(path)
            const directory = await createFolderStructure(newDirectory, type, language, result.path, name, result)

            PROJECT_CONFIG.directory = directory
            PROJECT_CONFIG.type = type
            PROJECT_CONFIG.videoPath = path
            PROJECT_CONFIG.settingsPath = join(directory, 'settings.json')
            PROJECT_CONFIG.logsPath = join(directory, 'river.log')
            
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