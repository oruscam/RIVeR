import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as fs from 'fs'

async function setProjectDetails( PROJECT_CONFIG: ProjectConfig){
    ipcMain.handle('set-project-details', async (_event, args) => {
        const { settingsPath } = PROJECT_CONFIG;
        const { riverName, site, unitSistem, meditionDate } = args

        try {
            const settings = await fs.promises.readFile(settingsPath, 'utf8')
            const settingsParsed = JSON.parse(settings)

            settingsParsed.river_name = riverName
            settingsParsed.site = site
            settingsParsed.unit_system = unitSistem
            settingsParsed.medition_date = meditionDate

            await fs.promises.writeFile(settingsPath, JSON.stringify(settingsParsed, null, 4))

        } catch (error){
            throw error
        }
    });
}


export { setProjectDetails }