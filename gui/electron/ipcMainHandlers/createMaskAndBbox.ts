import { ipcMain } from 'electron';
import { clearCrossSections } from './utils/clearCrossSections';
import { clearResultsPiv } from './utils/clearResultsPiv';
import { PROJECT_CONFIG } from '../main';
import path from 'path';

async function createMaskAndBbox(riverCli: Function) {
  ipcMain.handle('create-mask-and-bbox', async (_event, args) => {
    const { projectDirectory, xsectionsPath, matrixPath, resultsPath, settingsPath, logsPath, firstFrame } =
      PROJECT_CONFIG;
    const { height_roi, data, user_masks, is_roi_calulation } = args;

    if (data) {
      await clearCrossSections(xsectionsPath);
    }

    if (resultsPath !== undefined || resultsPath !== '') {
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
        data: { bbox: number[], bbox_path: string; mask_npy_path: string; mask_png_path: string };
        error: { message: string };
      };

      if (error.message) {
        return {
          error,
        };
      }

      PROJECT_CONFIG.bboxPath = data.bbox_path;
      PROJECT_CONFIG.maskPath = data.mask_npy_path;
      let user_masks_paths: string[] = []
      outPngMask = data.mask_png_path;

      // Create user masks if exists and if is not only roi calculation
      if ( user_masks.length > 0 && is_roi_calulation === false){
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
        user_masks_paths = userData.user_masks_paths;
      }

      if (is_roi_calulation === true || user_masks_paths.length > 0 ){
          // We need to create the same directionary structure as in create-user-mask
          if ( user_masks_paths.length === 0 ){
            user_masks.forEach( (_mask: any, index: number) => {
              user_masks_paths.push( path.join( projectDirectory, `usr_mask_${index}.npy`))
            });
          }

          const compileMasksArgs = [
            'compile-masks',
            '--save-png-mask',
            '-w',
            projectDirectory,
            '--roi',
            data.mask_npy_path,
          ]
  
          user_masks_paths.forEach((path: string) => {
            compileMasksArgs.push('--usr', path)
          })
  
          const { data: compileData, error: compileError } = await riverCli(compileMasksArgs, 'json', false, logsPath);
  
          PROJECT_CONFIG.maskPath = compileData.final_mask_npy;
          outPngMask = compileData.final_mask_png;
      }

      return { maskPath: outPngMask, bbox: data.bbox };
    } catch (error) {
      throw error;
    }
  });
}

export { createMaskAndBbox };