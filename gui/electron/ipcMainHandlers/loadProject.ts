import * as path from "path";
import * as fs from "fs";
import { dialog, ipcMain } from "electron";
import { getVideoMetadata } from "./utils/getVideoMetadata";
import { ProjectConfig } from "./interfaces";
import { readResultsPiv } from "./utils/readResultsPiv";
import { transformData } from "./utils/transformCrossSectionsData";
import { parseGrp3dPoints } from "./utils/parseGrp3dPoints";
import { parsedCameraSolution } from "./utils/parsedCameraSolution";

// Function to load and parse the settings.json file
async function loadSettings(settingsPath: string) {
  const data = await fs.promises.readFile(settingsPath, "utf-8");
  return JSON.parse(data);
}

// Function to load an optional file, with an option to parse it as JSON
async function loadOptionalFile(filePath: string, parseJson = false) {
  if (fs.existsSync(filePath)) {
    const data = await fs.promises.readFile(filePath, "utf-8");
    return parseJson ? JSON.parse(data) : data;
  }
  console.warn(`Warning: ${filePath} does not exist.`);
  return undefined;
}

// Function to load all frames from a directory and return their paths
async function loadFrames(framesPath: string, filePrefix: string) {
  const images = await fs.promises.readdir(framesPath);
  if (images.length > 0) {
    const firstFrame = path.join(framesPath, images[0]);
    const paths = images.map((image) =>
      path.join(filePrefix, framesPath, image),
    );
    return { firstFrame, paths };
  }
  return { firstFrame: "", paths: [] };
}

// Function to load rectification 3D images if the path exists in the settings
async function loadRectification3D(settingsParsed: any, filePrefix: string) {
  const rectificationPath = settingsParsed.rectification_3d_images;
  if (rectificationPath) {
    const images = await fs.promises.readdir(rectificationPath);
    return images.map((image: string) =>
      path.join(filePrefix, rectificationPath, image),
    );
  }
  return undefined;
}

// Function to populate the PROJECT_CONFIG object with relevant paths and settings
function populateProjectConfig(
  PROJECT_CONFIG: ProjectConfig,
  folderPath: string,
  settingsPath: string,
  settingsParsed: any,
) {
  PROJECT_CONFIG.directory = folderPath;
  PROJECT_CONFIG.settingsPath = settingsPath;
  PROJECT_CONFIG.framesPath = path.join(folderPath, "frames");
  PROJECT_CONFIG.videoPath = settingsParsed.video.filepath;
  PROJECT_CONFIG.logsPath = path.join(folderPath, "river.log");
  PROJECT_CONFIG.maskPath = fs.existsSync(path.join(folderPath, "mask.json"))
    ? path.join(folderPath, "mask.json")
    : undefined;
  PROJECT_CONFIG.bboxPath = fs.existsSync(path.join(folderPath, "bbox.json"))
    ? path.join(folderPath, "bbox.json")
    : undefined;
  PROJECT_CONFIG.resultsPath = fs.existsSync(
    path.join(folderPath, "piv_results.json"),
  )
    ? path.join(folderPath, "piv_results.json")
    : undefined;
  PROJECT_CONFIG.type = settingsParsed.footage;
  if (settingsParsed.transformation?.matrix) {
    PROJECT_CONFIG.matrixPath = path.join(
      folderPath,
      "transformation_matrix.json",
    );
  }
  if (settingsParsed.xsections) {
    PROJECT_CONFIG.xsectionsPath = settingsParsed.xsections;
  }
}

// Main function to handle the loading of a project
async function handleLoadProject(
  PROJECT_CONFIG: ProjectConfig,
  options: Electron.OpenDialogOptions,
) {
  // Open a dialog to select a directory
  const result = await dialog.showOpenDialog(options);
  if (result.canceled || result.filePaths.length === 0)
    return { success: false, message: "No directory selected" };

  const folderPath = result.filePaths[0];
  const settingsPath = path.join(folderPath, "settings.json");
  if (!fs.existsSync(settingsPath)) throw new Error("noSettingsFile");

  // Load and parse the settings.json file
  const settingsParsed = await loadSettings(settingsPath);
  populateProjectConfig(
    PROJECT_CONFIG,
    folderPath,
    settingsPath,
    settingsParsed,
  );

  const filePrefix = import.meta.env.VITE_FILE_PREFIX || "";
  const { firstFrame, paths } = await loadFrames(
    PROJECT_CONFIG.framesPath,
    filePrefix,
  );

  // Populate the PROJECT_CONFIG object with the first frame and frame paths
  PROJECT_CONFIG.firstFrame = firstFrame;

  // Load optional files and other project data
  const matrix = await loadOptionalFile(PROJECT_CONFIG.matrixPath, true);
  const xSections = settingsParsed.xsections
    ? transformData(
        await loadOptionalFile(settingsParsed.xsections, true),
        false,
      )
    : undefined;
  const piv_results = settingsParsed.piv_results
    ? await readResultsPiv(settingsParsed.piv_results).catch(() => undefined)
    : undefined;
  const bbox = await loadOptionalFile(PROJECT_CONFIG.bboxPath, true);
  const grp3dData = settingsParsed.grp_3d
    ? parseGrp3dPoints(await loadOptionalFile(settingsParsed.grp_3d))
    : { points: undefined, mode: undefined };
  const cameraSolution = settingsParsed.camera_solution_3d
    ? parsedCameraSolution(
        await loadOptionalFile(settingsParsed.camera_solution_3d),
      )
    : undefined;
  const rectification3DImages = await loadRectification3D(
    settingsParsed,
    filePrefix,
  );

  // Extract metadata from the video file
  const videoMetadata = await getVideoMetadata(settingsParsed.video.filepath);

  // Return the loaded project data
  return {
    success: true,
    message: {
      xsections: xSections,
      settings: settingsParsed,
      projectDirectory: folderPath,
      videoMetadata,
      firstFrame,
      mask: path.join(folderPath, "mask.png"),
      bbox,
      piv_results,
      paths,
      matrix,
      orthoImage: matrix
        ? path.join(filePrefix, folderPath, "transformed_image.png")
        : undefined,
      rectification3D: {
        points: grp3dData.points,
        mode: grp3dData.mode,
        cameraSolution,
        images: rectification3DImages,
        imagesPath: settingsParsed.rectification_3d_images,
      },
    },
  };
}

/**
 * Handles loading a project by selecting a directory and reading the necessary configuration files.
 * @param {ProjectConfig} PROJECT_CONFIG - The project configuration object to be populated.
 */
function loadProject(PROJECT_CONFIG: ProjectConfig) {
  const options: Electron.OpenDialogOptions = { properties: ["openDirectory"] };

  ipcMain.handle("load-project", async () => {
    try {
      return await handleLoadProject(PROJECT_CONFIG, options);
    } catch (error: unknown) {
      console.error(error);
      return { success: false, message: (error as Error).message };
    }
  });
}

export { loadProject };
