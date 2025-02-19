import { app, BrowserWindow, dialog, ipcMain, ipcRenderer, net, protocol, screen } from 'electron'
import { fileURLToPath } from 'node:url'
import * as path from 'node:path'
import * as os from 'os'
import * as fs from 'fs'
import { Buffer } from 'buffer'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const userDir = os.homedir();

import { ProjectConfig } from './ipcMainHandlers/interfaces.js'
import { initProject, firstFrame, pixelSize, getImages, setSections, loadProject, pixelToRealWorld, realWorldToPixel, getQuiver, getVideo, getBathimetry, calculate3dRectification } from './ipcMainHandlers/index.js'
import { recommendRoiHeight } from './ipcMainHandlers/recommendRoiHeight.js'
import { createMaskAndBbox } from './ipcMainHandlers/createMaskAndBbox.js'
import { getResultData } from './ipcMainHandlers/getResultData.js'
import { setProjectDetails } from './ipcMainHandlers/setProjectDetails.js'
import { executePythonShell } from './ipcMainHandlers/utils/executePythonShell.js'
import { executeRiverCli } from './ipcMainHandlers/utils/executeRiverCli.js'
import { setControlPoints } from './ipcMainHandlers/setControlPoints.js'
import { getPoints } from './ipcMainHandlers/getPoints.js'
import { getIpcamImages } from './getIpcamImages.js'
import { getDistances } from './getDistances.js'
import { saveTransformationMatrix } from './ipcMainHandlers/saveTransformationMatrix.js'
import { saveReportHtml } from './ipcMainHandlers/saveReportHtml.js'

process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

let riverCli: Function

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
    title: 'RIVeR 3.0.0',

    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: true,
      contextIsolation: true,
      webSecurity: VITE_DEV_SERVER_URL ? false : true,
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)

    // If you want to test river-cli on develop, change executePythonShell for executeRiverCli
    riverCli = executePythonShell

  } else {

    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
    
    riverCli = executeRiverCli

    // Remove menu bar
    win.setMenu(null);
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

const PROJECT_CONFIG: ProjectConfig = {
  directory: "",
  type: "",
  videoPath: "",
  settingsPath: "",
  framesPath: "",
  matrixPath: "",
  xsectionsPath: "",
  bboxPath: "",
  maskPath: "",
  resultsPath: "",
  thumbsPath: "",
  logsPath: "",
}
// Move to ipcMainHandlers
ipcMain.handle('save-dialog', async (event, defaultPath) => {
  const result = await dialog.showSaveDialog({
    title: 'Save Report',
    defaultPath: defaultPath,
    filters: [
      { name: 'HTML Files', extensions: ['html'] }
    ]
  });
  return result.filePath;
});

ipcMain.handle('save-file', async (event, args) => {
  const { path, arrayBuffer } = args

  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(path, buffer);
});

app.whenReady().then(() => {
  createWindow();
  getVideo(PROJECT_CONFIG);
  initProject(userDir, PROJECT_CONFIG);
  loadProject(PROJECT_CONFIG)
  firstFrame(PROJECT_CONFIG, riverCli);
  pixelSize(PROJECT_CONFIG, riverCli);
  setSections(PROJECT_CONFIG);
  recommendRoiHeight(PROJECT_CONFIG, riverCli);
  createMaskAndBbox(PROJECT_CONFIG, riverCli);
  getQuiver(PROJECT_CONFIG, riverCli);
  getResultData(PROJECT_CONFIG, riverCli);
  getImages(PROJECT_CONFIG);
  getBathimetry();
  setProjectDetails(PROJECT_CONFIG);
  setControlPoints(PROJECT_CONFIG, riverCli);
  calculate3dRectification(PROJECT_CONFIG, riverCli);

  getPoints();
  getIpcamImages(PROJECT_CONFIG);
  getDistances();
  saveTransformationMatrix(PROJECT_CONFIG);  
  saveReportHtml(PROJECT_CONFIG);
})

