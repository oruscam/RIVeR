import { dialog, ipcMain, shell } from 'electron';
import { join } from 'path';
import { writeFileSync } from 'fs';
import { PROJECT_CONFIG } from '../main';

/**
 * Resolves to the path that was written, or `filePath: null` when nothing was:
 * the user cancelled the Save dialog, or the write failed. The renderer only
 * reports "Report saved" when it gets a path back.
 */
function saveReportHtml() {
  ipcMain.handle('save-report-html', async (_event, args?): Promise<{ filePath: string | null }> => {
    try {
      const { projectDirectory } = PROJECT_CONFIG;
      const defaultPath = join(projectDirectory, 'report.html');

      const { arrayBuffer } = args;

      const { filePath, canceled } = await dialog.showSaveDialog({
        title: 'Save Report',
        defaultPath: defaultPath,
        filters: [{ name: 'HTML Files', extensions: ['html'] }],
      });

      if (canceled || !filePath) return { filePath: null };

      writeFileSync(filePath, Buffer.from(arrayBuffer));
      return { filePath };
    } catch (error) {
      console.error('Failed to save report:', error);
      return { filePath: null };
    }
  });

  ipcMain.handle('show-item-in-folder', (_event, args?: { filePath?: string }) => {
    if (args?.filePath) shell.showItemInFolder(args.filePath);
  });
}

export { saveReportHtml };
