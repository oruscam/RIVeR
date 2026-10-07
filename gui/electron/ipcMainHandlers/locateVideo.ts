import { dialog, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { PROJECT_CONFIG } from '../main';
import { getVideoMetadata } from './utils/getVideoMetadata';
import { settingsVideoSpec, videoMismatch } from './utils/videoFallback';

/**
 * Locate… on the missing-video card (spec §3). Only a video with the project's
 * resolution and fps is accepted: frames, matrix and masks all depend on them.
 */
function locateVideo() {
  ipcMain.handle('locate-video', async () => {
    const picked = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv'] }],
      defaultPath: PROJECT_CONFIG.defaultFilesPath,
    });
    const filePath = picked.filePaths[0];
    if (picked.canceled || filePath === undefined) return { status: 'canceled' };

    const settings = JSON.parse(await fs.promises.readFile(PROJECT_CONFIG.settingsPath, 'utf-8'));
    const metadata = await getVideoMetadata(filePath);
    const expected = settingsVideoSpec(settings.video);
    const found = { width: metadata.width, height: metadata.height, fps: metadata.fps };
    if (videoMismatch(expected, found)) return { status: 'mismatch', expected, found };

    settings.video.filepath = metadata.path;
    await fs.promises.writeFile(PROJECT_CONFIG.settingsPath, JSON.stringify(settings, null, 4), 'utf-8');
    PROJECT_CONFIG.videoPath = metadata.path;
    PROJECT_CONFIG.defaultFilesPath = path.dirname(metadata.path);
    return { status: 'ok', metadata };
  });
}

export { locateVideo };
