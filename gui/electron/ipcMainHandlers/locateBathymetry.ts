import { dialog, ipcMain } from 'electron';
import * as fs from 'fs';
import { PROJECT_CONFIG } from '../main';
import { importBathymetry } from './getBathimetry';
import { EXTENSIONS } from './utils/validateFile';
import { replaceBathPath, sectionBath } from './utils/resolveBathymetry';

interface LocateBathymetryArgs {
  section: string;
  zLimits?: { min: number; max: number };
  unitSistem?: string;
}

/**
 * Locate… on a missing-bathymetry card (spec §4): pick a file, import it like
 * get-bathimetry (normalized, copied into the project), and point every section that
 * used the missing file at the new one in xsections.json.
 */
function locateBathymetry() {
  ipcMain.handle('locate-bathymetry', async (_event, args: LocateBathymetryArgs) => {
    const { section, zLimits, unitSistem } = args;
    const picked = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Documents', extensions: EXTENSIONS }],
      defaultPath: PROJECT_CONFIG.projectDirectory,
    });
    const filePath = picked.filePaths[0];
    if (picked.canceled || filePath === undefined) return { status: 'canceled' };

    try {
      const raw = await fs.promises.readFile(PROJECT_CONFIG.xsectionsPath, 'utf-8');
      const replaced = sectionBath(raw, section);
      if (replaced === undefined) throw new Error('sectionNotFound');

      const imported = await importBathymetry(filePath, { zLimits, unitSistem });
      await fs.promises.writeFile(
        PROJECT_CONFIG.xsectionsPath,
        replaceBathPath(raw, replaced, imported.path),
        'utf-8'
      );
      return { status: 'ok', path: imported.path, name: imported.name, line: imported.line, replaced };
    } catch (error) {
      return { status: 'error', message: (error as Error).message };
    }
  });
}

export { locateBathymetry };
