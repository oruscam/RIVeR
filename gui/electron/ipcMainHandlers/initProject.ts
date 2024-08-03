import { ipcMain } from "electron";
import { createFolderStructure } from "./createFolderStructure";
import * as path from 'path'
import { getVideoMetadata } from "./utils/getVideoMetadata";
import { ProjectConfig } from "./interfaces";


export function initProject(userDir: string, PROJECT_CONFIG: ProjectConfig) {
    ipcMain.handle('init-project', async( _event, arg: {path: string, name: string, type: string}) => {
        console.log("Event video-metadata en main" , arg)
        const [ videoName ] = arg.name.split('.');
        const newPath = path.join(userDir, 'River', videoName);

        createFolderStructure(newPath, arg.type, arg.path)

        PROJECT_CONFIG.directory = newPath
        PROJECT_CONFIG.type = arg.type
        PROJECT_CONFIG.videoPath = arg.path
        PROJECT_CONFIG.settingsPath = path.join(newPath, 'settings.json')

        try {
            const result = await getVideoMetadata(arg.path)
            return {
                ...result,
                directory: newPath
            }
        } catch (error) {
            console.error("Error occurred while getting video metadata:", error);
            throw error;
        }

    }
    )
}


