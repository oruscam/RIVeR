import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { PythonShell } from 'python-shell'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ffmpeg = require('fluent-ffmpeg');
import { Metadata, FFProbeData } from './interfaces'
import { rejects } from 'node:assert'

process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

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

app.whenReady().then(() => {
  createWindow();

})

ipcMain.handle('video-metadata', async( _event, arg: string) => {
  console.log("Event video-metadata en main" , arg)

  try {
    const metadata: Metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(arg, (err: Error | null, data: FFProbeData): void => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    const { width, height, r_frame_rate, duration } = metadata.streams[0];
   
    return {
      width: width,
      height: height,
      fps: parseInt(r_frame_rate),
      duration: duration
    };
  } catch (error) {
    console.log(error)
    throw new Error('Error en la obtención de metadatos del video:');
  }
})


ipcMain.handle('first-frame', async( event, args: any) => {
  console.log("EN FIRST FRAME")
  console.log(args)
  const folder = '/home/tomy_ste/Desktop/RIVeR/example'
  const options = {
    pythonPath: '/home/tomy_ste/Desktop/RIVeR/RIVeR/venv/bin/python3',
    scriptPath: '/home/tomy_ste/Desktop/RIVeR/RIVeR/river/cli/',
    args: [
      'video-to-frames',
      args.video_path,
      folder,
      '--start-frame', args.start_frame,
      '--end-frame', args.end_frame,
      '--every', args.step,
      '--overwrite'
    ],
  }

  const pyshell = new PythonShell('__main__.py', options)

  pyshell.on('message', (message) => {
      console.log(message);
      event.sender.send('first-frame-output', message)
    });

   pyshell.end((err) => {
    console.log("pyshell error")
    console.log(err)
  }
   )

})

