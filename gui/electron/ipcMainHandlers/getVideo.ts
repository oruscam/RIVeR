import { dialog, ipcMain } from 'electron';
import * as path from 'path';
import { PROJECT_CONFIG } from '../main';

async function getVideo() {
  const options: Electron.OpenDialogOptions = {
    properties: ['openFile'],
    filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv'] }],
  };

  ipcMain.handle('get-video', async () => {
    try {
      const result = await dialog.showOpenDialog(options);
      const videoPath = result.filePaths[0];
      const videoName = path.basename(videoPath);

      PROJECT_CONFIG.videoPath = videoPath;

      return { result: { path: videoPath, name: videoName } };
    } catch {
      return {
        error: {
          type: 'user-selection-error',
          message: 'pleaseSelectVideo',
        },
      };
    }
  });
}

export { getVideo };
