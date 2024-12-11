import { app, BrowserWindow, ipcMain, net, protocol, screen } from 'electron'
import { fileURLToPath } from 'node:url'
import * as path from 'node:path'
import * as os from 'os'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const userDir = os.homedir();

import { ProjectConfig } from './ipcMainHandlers/interfaces.js'
import { initProject, firstFrame, pixelSize, getImages, setSections, loadProject, pixelToRealWorld, realWorldToPixel, getQuiver, getVideo, getBathimetry } from './ipcMainHandlers/index.js'
import { recommendRoiHeight } from './ipcMainHandlers/recommendRoiHeight.js'
import { createMaskAndBbox } from './ipcMainHandlers/createMaskAndBbox.js'
import { getResultData } from './ipcMainHandlers/getResultData.js'
import { setProjectDetails } from './ipcMainHandlers/setProjectDetails.js'
import { executePythonShell } from './ipcMainHandlers/utils/executePythonShell.js'
import { executeRiverCli } from './ipcMainHandlers/utils/executeRiverCli.js'

process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

let riverCli: Function

// protocol.registerSchemesAsPrivileged([
//   {
//     scheme: 'resources',
//     privileges: {
//       bypassCSP: true,
//       stream: true,
//       standard: true,
//     }
//   }
// ])

async function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y } = primaryDisplay.workArea;

  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    minWidth: 1150,
    minHeight: 800,
    x: x,
    y: y,
    width: 1200,
    height: 850,
    maxHeight: 1400,
    maxWidth: 2300,
    resizable: true,
    focusable: true,
    fullscreenable: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    frame: true,
    title: 'River',

    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: true,
      contextIsolation: true,
      webSecurity: VITE_DEV_SERVER_URL ? false : true,
    },
  })


  // // Elimina la barra de menú
  // win.setMenu(null);

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    riverCli = executePythonShell
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
    
    riverCli = executeRiverCli
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
}

  // // Print PROJECT_CONFIG every 10 seconds
  // setInterval(() => {
  //   console.log(PROJECT_CONFIG);
  // }, 10000);

app.whenReady().then(() => {
  // ! DONT WORK. En develop usamos /@fs, en produccion usamos file://
  // protocol.handle('resources', function (request) {
  //   const filePath = request.url.slice('resources://'.length);
  //   const fileUrl = new URL(`file://${filePath}`).toString();
  //   return net.fetch(fileUrl)
  // })

  console.log('river-cli', riverCli)

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
  
  // ** They are not used at the moment
  // pixelToRealWorld(PROJECT_CONFIG, riverCli);
  // realWorldToPixel(PROJECT_CONFIG, riverCli);

  ipcMain.handle('app-directory', (event, args) => {
    return path.join(app.getAppPath())
  })

})

