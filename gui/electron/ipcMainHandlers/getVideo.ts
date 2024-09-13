import { dialog, ipcMain } from "electron";
import * as path from 'path'
import { ProjectConfig } from "./interfaces";

async function getVideo(PROJECT_CONFIG: ProjectConfig) {
    const options: Electron.OpenDialogOptions = {
        properties: ['openFile'],
        filters: [
            { name: 'Videos', extensions: ['mp4', 'mov', 'avi']}
        ]
    }

    ipcMain.handle('get-video', async (_event, _args) => {
        try {
            const result = await dialog.showOpenDialog(options);
            const videoPath = result.filePaths[0];
            const videoName = path.basename(videoPath);

            PROJECT_CONFIG.videoPath = videoPath;

            return { path: videoPath, name: videoName };
        } catch (error) {
            console.log('Error in get-video')
            console.log(error)
            throw error
        }
    });

    }




export { getVideo }