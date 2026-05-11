import { app, BrowserWindow, dialog, ipcMain, screen } from 'electron';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import * as os from 'os';
import { readRiverConfig, saveRiverConfig } from './riverConfig.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userDir = os.homedir();

import { ProjectConfig } from './ipcMainHandlers/interfaces.js';
import {
  initProject,
  firstFrame,
  setPixelSize,
  getImages,
  setSections,
  loadProject,
  getQuiver,
  getVideo,
  getBathimetry,
  calculate3dRectification,
  getIpcamImages,
  getPoints,
  getDistances,
  saveTransformationMatrix,
  saveReportHtml,
  setControlPoints,
  setProjectMetadata,
  getResultData,
  createMaskAndBbox,
  recommendRoiHeight,
  getGif,
  setColorbarLimits
} from './ipcMainHandlers/index.js';
import { executeRiverCli } from './ipcMainHandlers/utils/executeRiverCli.js';

process.env.APP_ROOT = path.join(__dirname, '..');

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let win: BrowserWindow | null;

let riverCli: Function = executeRiverCli;

async function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y } = primaryDisplay.workArea;
  const { width, height } = primaryDisplay.workAreaSize;

  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    x: x,
    y: y,
    width: width,
    height: height,
    minWidth: 1150,
    minHeight: 700,
    maxWidth: 2300,
    maxHeight: 1400,
    resizable: true,
    focusable: true,
    fullscreenable: false,
    alwaysOnTop: false,
    skipTaskbar: false,
    frame: true,
    title: 'RIVeR',

    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: true,
      contextIsolation: true,
      webSecurity: VITE_DEV_SERVER_URL ? false : true,
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);

  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));

    // Remove menu bar
    win.setMenu(null);
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

let filePrefix = import.meta.env.VITE_FILE_PREFIX;
if (filePrefix === undefined) {
  filePrefix = '';
}

export const PROJECT_CONFIG: ProjectConfig = {
  mainDirectory: path.join(userDir, 'River'),
  projectDirectory: '',
  type: '',
  videoPath: '',
  settingsPath: '',
  framesPath: '',
  matrixPath: '',
  xsectionsPath: '',
  bboxPath: '',
  maskPath: '',
  resultsPath: '',
  logsPath: '',
  firstFrame: '',
  defaultFilesPath: '',
  filePrefix: filePrefix,
  pythonPath: VITE_DEV_SERVER_URL
    ? path.join(app.getAppPath(), '..', 'venv', ...(process.platform === 'win32' ? ['Scripts', 'python.exe'] : ['bin', 'python']))
    : path.join(app.getAppPath(), '..', 'river-cli', 'python', ...(process.platform === 'win32' ? ['python.exe'] : ['bin', 'python'])),
};


// General window dialog to confirm deletes.
ipcMain.handle('delete-confirmation', async (_event, args) => {
  const { message, title } = args;
  const { response } = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['Yes', 'No'],
    defaultId: 1,
    title: title,
    message: message,
  });

  return response;
});

ipcMain.handle('choose-river-path', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Choose River data folder',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Choose Folder',
  });
  if (result.canceled) return null;
  const newPath = path.join(result.filePaths[0], 'River');
  PROJECT_CONFIG.mainDirectory = newPath;
  saveRiverConfig({ riverPath: newPath });
  return newPath;
});

ipcMain.handle('get-river-path', () => PROJECT_CONFIG.mainDirectory);

app.whenReady().then(async () => {
  const config = readRiverConfig();
  if (config) {
    PROJECT_CONFIG.mainDirectory = config.riverPath;
  } else {
    const result = await dialog.showOpenDialog({
      title: 'Choose where to store River data',
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Choose Folder',
    });
    const chosen = result.canceled
      ? path.join(userDir, 'River')
      : path.join(result.filePaths[0], 'River');
    PROJECT_CONFIG.mainDirectory = chosen;
    saveRiverConfig({ riverPath: chosen });
  }

  calculate3dRectification(riverCli);
  createMaskAndBbox(riverCli);
  createWindow();
  firstFrame(riverCli);
  getBathimetry();
  getDistances();
  getGif();
  getImages();
  getIpcamImages();
  getPoints();
  getQuiver(riverCli);
  getResultData(riverCli);
  getVideo();
  initProject();
  loadProject();
  recommendRoiHeight(riverCli);
  saveReportHtml();
  saveTransformationMatrix();
  setColorbarLimits();
  setControlPoints(riverCli);
  setPixelSize(riverCli);
  setProjectMetadata();
  setSections();
});
