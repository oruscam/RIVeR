import { ipcMain } from 'electron';
import { PROJECT_CONFIG } from '../main';
import { RiverCli } from './interfaces';

/**
 * Reports whether the STIV model weight files are present on disk, so the
 * GUI can grey out the STIV option instead of letting the user enable a
 * technique that will silently fail during analysis (see
 * river.core.stiv_pipeline.stiv_weights_available — a cheap existence check,
 * no torch import).
 */
function checkStivWeights(riverCli: RiverCli) {
  ipcMain.handle('check-stiv-weights', async () => {
    const { logsPath } = PROJECT_CONFIG;

    try {
      const { data, error } = await riverCli(['stiv-status'], 'json', false, logsPath);
      if (error?.message) {
        console.log(error.message);
        return { available: false, missing: [] };
      }
      return { available: !!data.available, missing: data.missing ?? [] };
    } catch (error) {
      console.log(error);
      return { available: false, missing: [] };
    }
  });
}

export { checkStivWeights };
