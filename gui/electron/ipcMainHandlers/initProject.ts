import { ipcMain } from 'electron';
import { createFolderStructure } from './createFolderStructure';
import { join, dirname } from 'path';
import { getVideoMetadata } from './utils/getVideoMetadata';
import { PROJECT_CONFIG } from '../main';
import { withInterval } from '../../commons/framesSource';

/** A frames folder described in the shape getVideoMetadata returns for a video. */
function framesMetadata(
  folder: string,
  name: string,
  frames: { count: number; width: number; height: number; intervalMs: number }
) {
  const timing = withInterval({ frame_count: frames.count }, frames.intervalMs);
  return {
    width: frames.width,
    height: frames.height,
    fps: timing.fps,
    duration: timing.total_length,
    creation: '',
    name,
    path: folder,
    source: 'frames' as const,
    frameCount: frames.count,
    intervalMs: frames.intervalMs,
  };
}

function initProject() {
  ipcMain.handle(
    'init-project',
    async (
      _event,
      args: {
        path: string;
        name: string;
        type: string;
        language: string;
        unitSistem: string;
        frames?: { count: number; width: number; height: number; intervalMs: number };
      }
    ) => {
      const { name, path, type, language, unitSistem, frames } = args;

      // A video's project is named after the file without its extension; a folder name is kept whole.
      const projectName = frames ? name : name.split('.')[0];
      const newDirectory = join(PROJECT_CONFIG.mainDirectory, projectName);

      try {
        const result = frames ? framesMetadata(path, name, frames) : await getVideoMetadata(path);
        const directory = await createFolderStructure(
          newDirectory,
          type,
          language,
          result.path,
          name,
          { width: result.width, height: result.height, fps: result.fps, duration: result.duration },
          unitSistem,
          frames ? { count: frames.count, intervalMs: frames.intervalMs } : undefined
        );

        PROJECT_CONFIG.projectDirectory = directory;
        PROJECT_CONFIG.type = type;
        PROJECT_CONFIG.videoPath = path;
        PROJECT_CONFIG.settingsPath = join(directory, 'settings.json');
        PROJECT_CONFIG.logsPath = join(directory, 'river.log');
        PROJECT_CONFIG.defaultFilesPath = directory;
        PROJECT_CONFIG.defaultFilesPath = dirname(result.path);

        return {
          result: {
            ...result,
            directory: directory,
          },
        };
      } catch (error) {
        if (error.message === 'user-cancel-operation') {
          return {
            error: {
              message: error.message,
              type: 'user-cancel-operation',
            },
          };
        }
        if (error.code === 'EBUSY') {
          return {
            error: {
              message: error.message,
              type: 'resource-busy',
            },
          };
        }

        throw error;
      }
    }
  );
}

export { initProject };
