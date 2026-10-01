import { ipcMain } from 'electron';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Read-only check behind Home's recent projects (Phase 6f, amendment A14): of
 * the directories the renderer remembers, which still hold a settings.json.
 * The renderer runs with contextIsolation and cannot touch the filesystem.
 */
export function existingProjectDirectories(dirs: unknown, exists: (p: string) => boolean = existsSync): string[] {
  if (!Array.isArray(dirs)) return [];
  return dirs.filter((d): d is string => {
    if (typeof d !== 'string' || d === '') return false;
    try {
      return exists(join(d, 'settings.json'));
    } catch {
      return false;
    }
  });
}

function projectsExist() {
  ipcMain.handle('projects-exist', async (_event, dirs: unknown) => existingProjectDirectories(dirs));
}

export { projectsExist };
