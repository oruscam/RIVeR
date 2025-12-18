import { ipcMain } from 'electron';
import * as path from 'node:path';
import * as fs from 'fs';
import { PROJECT_CONFIG } from '../main';

interface setSectionsHandleArgs {
  data: any;
}
// 🚧 setSections -> solo setea el setting.json con la nueva direccion a xsettings -> archivo de secciones.
export function setSections() {
  ipcMain.handle('set-sections', async (_event, args: setSectionsHandleArgs) => {
    const { projectDirectory, settingsPath } = PROJECT_CONFIG;
    const xsectionsPath = path.join(projectDirectory, 'xsections.json');
    PROJECT_CONFIG.xsectionsPath = xsectionsPath;
    const xsectionsJson = JSON.stringify(args.data, null, 4);

    const settingsJson = await fs.promises.readFile(settingsPath, 'utf-8');
    const settingsJsonParsed = JSON.parse(settingsJson);

    settingsJsonParsed.xsections = xsectionsPath;
    const updatedSettings = JSON.stringify(settingsJsonParsed, null, 4);

    try {
      await Promise.all([
        fs.promises.writeFile(settingsPath, updatedSettings, 'utf-8'),
        fs.promises.writeFile(xsectionsPath, xsectionsJson, 'utf-8'),
      ]);

      return 'Sections saved';
    } catch (error) {
      console.log(error);
      return 'Error saving sections';
    }
  });
}
