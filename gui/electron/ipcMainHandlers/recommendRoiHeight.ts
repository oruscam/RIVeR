import { ipcMain } from 'electron';
import { PROJECT_CONFIG } from '../main';
import { RiverCli } from './interfaces';

async function recommendRoiHeight(riverCli: RiverCli) {
  ipcMain.handle('recommend-roi-height', async () => {
    const { xsectionsPath, logsPath, matrixPath } = PROJECT_CONFIG;

    const options = ['recommend-height-roi', 128, xsectionsPath, matrixPath];

    try {
      const { data } = await riverCli(options, 'json', false, logsPath);
      return { height_roi: (data as any).height_roi };
    } catch (error) {
      console.log(error);
    }
  });
}

export { recommendRoiHeight };
