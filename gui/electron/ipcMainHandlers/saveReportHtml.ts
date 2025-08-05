import { dialog, ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import { join } from "path";
import { writeFileSync } from "fs";

function saveReportHtml(PROJECT_CONFIG: ProjectConfig) {
  ipcMain.handle("save-report-html", async (_event, args?) => {
    try {
      const { projectDirectory } = PROJECT_CONFIG;
      const defaultPath = join(projectDirectory, "report.html");

      const { arrayBuffer } = args;

      const { filePath } = await dialog.showSaveDialog({
        title: "Save Report",
        defaultPath: defaultPath,
        filters: [{ name: "HTML Files", extensions: ["html"] }],
      });

      if (filePath) {
        const buffer = Buffer.from(arrayBuffer);
        writeFileSync(filePath, buffer);
      }

    } catch (error) {
      console.error("Failed to save report:", error);
    }
  });
}

export { saveReportHtml };