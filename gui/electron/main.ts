import { app, BrowserWindow, net, protocol } from 'electron'
import { fileURLToPath } from 'node:url'
import * as path from 'node:path'
import * as os from 'os'
import * as fs from 'fs'  

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const userDir = os.homedir();


import { ProjectConfig } from './ipcMainHandlers/interfaces.js'
import { initProject, firstFrame, pixelSizeHandler, getImages, setSections, loadProject, pixelToRealWorld, realWorldToPixel} from './ipcMainHandlers/index.js'


process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'resources',
    privileges: {
      bypassCSP: true,
      stream: true,
      standard: true,
    }
  }
])


function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    width: 1500,
    height: 1000,
    minWidth: 1100,
    minHeight: 850,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: true,
      // contextIsolation: false
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
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
  jsonPath: "",
  framesPath: "",
  matrixPath: "",
}

app.whenReady().then(() => {
  protocol.handle('resources', function(request){
    const filePath = request.url.slice('resources://'.length);
    const fileUrl = new URL(`file://${filePath}`).toString();
    return net.fetch(fileUrl)
  })
  
  

  createWindow();
  initProject(userDir, PROJECT_CONFIG);
  loadProject();
  // HandleMask(userDir);
  firstFrame(PROJECT_CONFIG);
  pixelSizeHandler(PROJECT_CONFIG);
  pixelToRealWorld(PROJECT_CONFIG);
  realWorldToPixel(PROJECT_CONFIG);


  setSections();
  getImages();
})



