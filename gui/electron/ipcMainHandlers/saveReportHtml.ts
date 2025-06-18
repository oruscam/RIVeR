import { dialog, ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import { join } from "path";
import { writeFileSync } from "fs";
import { saveProjectMetadata } from "./utils/saveProjectMetadata";

function saveReportHtml(PROJECT_CONFIG: ProjectConfig) {
  ipcMain.handle("save-report-html", async (_event, args?) => {
    try {
      const { directory } = PROJECT_CONFIG;
      const defaultPath = join(directory, "report.html");

      const { arrayBuffer, projectDetails } = args;

      console.log("Saving report HTML...");
      console.log("Project Details:", projectDetails);


      const { filePath } = await dialog.showSaveDialog({
        title: "Save Report",
        defaultPath: defaultPath,
        filters: [{ name: "HTML Files", extensions: ["html"] }],
      });

      if (filePath) {
        const buffer = Buffer.from(arrayBuffer);
        writeFileSync(filePath, buffer);
      }

      saveProjectMetadata(PROJECT_CONFIG, projectDetails);
    } catch (error) {
      console.error("Failed to save report:", error);
    }
  });
}

export { saveReportHtml };