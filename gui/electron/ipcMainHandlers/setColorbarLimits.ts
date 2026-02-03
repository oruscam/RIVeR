import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as fs from "fs";

function setColorbarLimits(PROJECT_CONFIG: ProjectConfig){
    ipcMain.handle('set-colorbar-limits', async (_event, args) => {
        const { settingsPath } = PROJECT_CONFIG;
        const { min, max } = args;

        const settings = await fs.promises.readFile(settingsPath, 'utf-8');
        const settingsParsed = JSON.parse(settings);

        settingsParsed.colorbar_limits = {
            min: min,
            max: max
        };

        await fs.promises.writeFile(settingsPath, JSON.stringify(settingsParsed, null, 2), 'utf-8');

        return
    })
}

export { setColorbarLimits };