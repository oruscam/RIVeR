import { dialog, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { PROJECT_CONFIG } from '../main';
import { RiverCli } from './interfaces';
import { getVideoMetadata } from './utils/getVideoMetadata';
import { settingsVideoSpec, videoMetadataFromSettings, videoMismatch } from './utils/videoFallback';

/**
 * Locate… on the missing-video card (spec §3). Only a video with the project's
 * resolution and fps is accepted: frames, matrix and masks all depend on them.
 * A frames project locates its source folder instead, matched on resolution and frame count.
 */
function locateVideo(riverCli: RiverCli) {
  ipcMain.handle('locate-video', async () => {
    const settings = JSON.parse(await fs.promises.readFile(PROJECT_CONFIG.settingsPath, 'utf-8'));
    const expected = settingsVideoSpec(settings.video);

    if (settings.video?.source === 'frames') {
      const picked = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        defaultPath: PROJECT_CONFIG.defaultFilesPath,
      });
      const folder = picked.filePaths[0];
      if (picked.canceled || folder === undefined) return { status: 'canceled' };

      const { data, error } = await riverCli(
        ['frames-info', folder],
        'json',
        false,
        PROJECT_CONFIG.logsPath,
        false
      );
      if (error?.message) return { status: 'error', message: error.message };

      const found = { width: data.width, height: data.height, fps: expected.fps, frameCount: data.count };
      if (videoMismatch(expected, found)) return { status: 'mismatch', expected, found };

      settings.video.filepath = folder;
      await fs.promises.writeFile(PROJECT_CONFIG.settingsPath, JSON.stringify(settings, null, 4), 'utf-8');
      PROJECT_CONFIG.videoPath = folder;
      PROJECT_CONFIG.defaultFilesPath = path.dirname(folder);
      return { status: 'ok', metadata: videoMetadataFromSettings(settings.video) };
    }

    const picked = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv'] }],
      defaultPath: PROJECT_CONFIG.defaultFilesPath,
    });
    const filePath = picked.filePaths[0];
    if (picked.canceled || filePath === undefined) return { status: 'canceled' };

    let metadata;
    try {
      metadata = await getVideoMetadata(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { status: 'error', message };
    }
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
