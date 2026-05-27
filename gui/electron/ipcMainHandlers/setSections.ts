import { ipcMain } from 'electron';
import * as path from 'node:path';
import * as fs from 'fs';
import { PROJECT_CONFIG } from '../main';
import { saveUserMasks } from './utils/saveUserMasks';

interface setSectionsHandleArgs {
  data: any;
  userMasks?: Array<any>;
}

// Handler to set sections data and update settings accordingly
// Saves sections data to xsections.json and updates settings.json

export function setSections() {
  ipcMain.handle('set-sections', async (_event, args: setSectionsHandleArgs) => {
    const { projectDirectory, settingsPath } = PROJECT_CONFIG;
    const xsectionsPath = path.join(projectDirectory, 'xsections.json');
    PROJECT_CONFIG.xsectionsPath = xsectionsPath;
    const { data, userMasks } = args;
    const xsectionsJson = JSON.stringify(data, null, 4);

    const settingsJson = await fs.promises.readFile(settingsPath, 'utf-8');
    const settingsJsonParsed = JSON.parse(settingsJson);

    settingsJsonParsed.xsections = xsectionsPath;
    const updatedSettings = JSON.stringify(settingsJsonParsed, null, 4);

    try {
      await Promise.all([
        fs.promises.writeFile(settingsPath, updatedSettings, 'utf-8'),
        fs.promises.writeFile(xsectionsPath, xsectionsJson, 'utf-8'),
      ]);

      if (userMasks) {
        console.log('Saving user masks...');
        await saveUserMasks(userMasks);
      }

      return 'Sections saved';
    } catch (error) {
      console.log(error);
      return 'Error saving sections';
    }
  });
}
