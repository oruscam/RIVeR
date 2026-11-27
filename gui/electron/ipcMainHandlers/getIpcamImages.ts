import { dialog, ipcMain } from 'electron';
import * as fs from 'fs';
import { extname, join } from 'path';
import { PROJECT_CONFIG } from '../main';
import { RiverCli } from './interfaces';
import { processGrpImages } from './utils/processGrpImages';

function getIpcamImages(riverCli: RiverCli) {
  const options: Electron.OpenDialogOptions = {
    properties: ['openDirectory'],
  };

  ipcMain.handle('ipcam-images', async (_event, args) => {
    const { folderPath } = args;

    options.defaultPath = PROJECT_CONFIG.defaultFilesPath;

    const { settingsPath, projectDirectory, logsPath } = PROJECT_CONFIG;

    const json = await fs.promises.readFile(settingsPath, 'utf-8');
    const jsonParsed = JSON.parse(json);

    let filePrefix = import.meta.env.VITE_FILE_PREFIX;
    filePrefix = filePrefix === undefined ? '' : filePrefix;

    const validImageExtensions = ['.jpg', '.jpeg', '.png'];

    try {
      let imagesPath: string = folderPath;

      if (imagesPath === undefined) {
        const result = await dialog.showOpenDialog(options);
        if (result.canceled || result.filePaths[0] === undefined) return { canceled: true };
        imagesPath = result.filePaths[0];
      }

      const images = await fs.promises.readdir(imagesPath);

      if (images.length === 0) {
        throw new Error('imagesFolderEmpty');
      }

      images.forEach((file) => {
        if (validImageExtensions.includes(extname(file)) === false) {
          throw new Error('invalidImageExtension');
        }
      });

      // Lens correction and resize, like the frames.
      const processed = await processGrpImages(imagesPath, projectDirectory, jsonParsed, riverCli, logsPath);
      if (processed.error) return { error: { message: processed.error, backend: true } };

      const updatedContent = JSON.stringify(jsonParsed, null, 2);
      await fs.promises.writeFile(settingsPath, updatedContent, 'utf-8');

      return {
        images: processed.files.map((file) => join(filePrefix, file)),
        path: imagesPath,
      };
    } catch (error) {
      if (error.message === 'imagesFolderEmpty' || error.message === 'invalidImageExtension') {
        return { error };
      }
    }
  });
}

export { getIpcamImages };
