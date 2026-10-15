import { dialog, ipcMain } from 'electron';
import * as os from 'os';
import * as path from 'path';
import { PROJECT_CONFIG } from '../main';
import { RiverCli } from './interfaces';

export interface FramesFolderInfo {
  path: string;
  name: string;
  count: number;
  width: number;
  height: number;
  /** Absolute paths, in the order the backend imports them. */
  files: string[];
}

export type FramesFolderError = 'noFrames' | 'mixedSizes' | 'unreadableFolder';

const KNOWN_ERRORS: FramesFolderError[] = ['noFrames', 'mixedSizes'];

/**
 * Picking and inspecting a folder of already-extracted frames. The CLI owns the file
 * order (natural filename order), so nothing here or in the renderer ever sorts.
 */
function framesFolder(riverCli: RiverCli) {
  ipcMain.handle('get-frames-folder', async () => {
    const picked = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      defaultPath: PROJECT_CONFIG.defaultFilesPath || undefined,
    });
    const folder = picked.filePaths[0];
    if (picked.canceled || folder === undefined) return null;
    return { path: folder, name: path.basename(folder) };
  });

  ipcMain.handle(
    'inspect-frames-folder',
    async (_event, args?: { path?: string }): Promise<FramesFolderInfo | { error: FramesFolderError }> => {
      const folder = args?.path ?? PROJECT_CONFIG.videoPath;
      // No project exists yet when a folder is first picked, so this call has no project log.
      const logFile = path.join(os.tmpdir(), 'river-frames-info.log');

      try {
        // Untracked: a quick status call must never kill, or be killed with, a running analysis.
        const { data, error } = await riverCli(['frames-info', folder], 'json', false, logFile, false);
        if (error?.message) {
          console.log('frames-info:', error.message);
          const known = KNOWN_ERRORS.find((code) => code === error.message);
          return { error: known ?? 'unreadableFolder' };
        }
        return {
          path: folder,
          name: path.basename(folder),
          count: data.count,
          width: data.width,
          height: data.height,
          files: (data.files as string[]).map((file) => path.join(folder, file)),
        };
      } catch (error) {
        console.log(error);
        return { error: 'unreadableFolder' };
      }
    }
  );
}

export { framesFolder };
