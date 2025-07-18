import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as fs from "fs";
import { saveProjectMetadata } from "./utils/saveProjectMetadata";

async function setProjectMetadata(PROJECT_CONFIG: ProjectConfig) {
  ipcMain.handle("set-project-metadata", async (_event, args) => {
    const { settingsPath } = PROJECT_CONFIG;
    const { riverName, site, unitSistem, meditionDate } = args;

    try {
      const json = await fs.promises.readFile(settingsPath, "utf8");
      const jsonParsed = JSON.parse(json);

      jsonParsed.river_name = riverName;
      jsonParsed.site = site;
      jsonParsed.unit_system = unitSistem;
      jsonParsed.medition_date = meditionDate;
      
      await saveProjectMetadata({
        riverName,
        site
      },
      jsonParsed,
      meditionDate
      )

      await fs.promises.writeFile(
        settingsPath,
        JSON.stringify(jsonParsed, null, 4),
      );
    } catch (error) {
      throw error;
    }
  });
}

export { setProjectMetadata };