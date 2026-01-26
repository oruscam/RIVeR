import { ipcMain } from 'electron';
import { clearCrossSections } from './utils/clearCrossSections';
import { clearResultsPiv } from './utils/clearResultsPiv';
import { PROJECT_CONFIG } from '../main';

async function createMaskAndBbox(riverCli: Function) {
  ipcMain.handle('create-mask-and-bbox', async (_event, args) => {
    const { projectDirectory, xsectionsPath, matrixPath, resultsPath, settingsPath, logsPath, firstFrame } =
      PROJECT_CONFIG;
    const { height_roi, data, user_masks } = args;

    if (data) {
      await clearCrossSections(xsectionsPath);
    }

    if (resultsPath !== '') {
      clearResultsPiv(resultsPath, settingsPath);
    }

    const maskAndBboxArgs = [
      'create-mask-and-bbox',
      '--save-png-mask',
      '-w',
      projectDirectory,
      height_roi,
      firstFrame,
      xsectionsPath,
      matrixPath,
    ];

    let outPngMask = ''

    try {
      const { data, error } = (await riverCli(maskAndBboxArgs, 'json', false, logsPath)) as {
        data: { bbox: number[], bbox_path: string; mask_json_path: string; mask_png_path: string };
        error: { message: string };
      };

      if (error.message) {
        return {
          error,
        };
      }

      PROJECT_CONFIG.bboxPath = data.bbox_path;
      PROJECT_CONFIG.maskPath = data.mask_json_path;

      outPngMask = data.mask_png_path;

      // Create user masks if exists
      if ( user_masks.length > 0 ){
        const userMaskArgs = [
          'create-user-mask',
          '-w',
          projectDirectory,
          '--settings-file',
          settingsPath,
          firstFrame,
        ]
        
        const { data: userData, error: userError } = await riverCli(userMaskArgs, 'text', false, logsPath);
        if ( userError && userError.message ){
          return { error: userError };
        }

        const { user_masks_paths } = userData

        const compileMasksArgs = [
          'compile-masks',
          '--save-png-mask',
          '-w',
          projectDirectory,
          '--roi',
          data.mask_json_path,
        ]

        user_masks_paths.forEach((path: string) => {
          compileMasksArgs.push('--usr', path)
        })

        const { data: compileData, error: compileError } = await riverCli(compileMasksArgs, 'json', false, logsPath);

        PROJECT_CONFIG.maskPath = compileData.final_mask_json;
        outPngMask = compileData.final_mask_png;
      }

      return { maskPath: outPngMask, bbox: data.bbox };
    } catch (error) {
      throw error;
    }
  });
}

export { createMaskAndBbox };
