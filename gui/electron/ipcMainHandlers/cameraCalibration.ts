import { ipcMain, dialog, BrowserWindow, shell, nativeImage } from 'electron';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PROJECT_CONFIG } from '../main';

type RiverCli = (
  options: (string | number)[],
  mode: 'json' | 'text',
  output: boolean,
  logFile: string
) => Promise<{ data: unknown; error: unknown }>;

function sanitizeDirName(name: string): string {
  return name.trim().replace(/[/\\:*?"<>|]/g, '_');
}

function cameraCalibration(riverCli: RiverCli) {
  // Open a folder picker and return the selected path.
  ipcMain.handle('calibration-open-folder', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select folder of calibration images',
      properties: ['openDirectory'],
      buttonLabel: 'Select Folder',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // Generate the ChArUco board PNG and open it full-screen in a new window.
  ipcMain.handle('calibration-write-board', async (_event, args: { board?: string }) => {
    const board = args?.board ?? '20x15';
    const boardPath = path.join(os.tmpdir(), `charuco_board_${board.replace('x', '_')}.png`);

    const options = ['write-charuco-board', '--output', boardPath, '--board', board];

    try {
      await riverCli(options, 'json', false, PROJECT_CONFIG.logsPath || path.join(os.tmpdir(), 'river_cal.log'));
    } catch {
      return { error: 'Failed to generate ChArUco board.' };
    }

    if (!fs.existsSync(boardPath)) {
      return { error: 'Board PNG was not created.' };
    }

    // Embed PNG as a data-URI so the window can load it without cross-origin issues.
    const imgBase64 = fs.readFileSync(boardPath).toString('base64');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>ChArUco Board</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#fff;display:flex;align-items:center;justify-content:center;width:100vw;height:100vh;overflow:hidden}
img{max-width:100%;max-height:100%;object-fit:contain}
#save-btn{position:fixed;bottom:24px;right:24px;background:#111;color:#fff;border:none;border-radius:10px;padding:10px 22px;font-size:15px;font-family:system-ui,sans-serif;cursor:pointer;opacity:0.85;transition:opacity 0.15s}
#save-btn:hover{opacity:1}
#hint{position:fixed;top:16px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.55);color:#fff;font-family:system-ui,sans-serif;font-size:13px;padding:6px 16px;border-radius:20px}
</style></head>
<body>
<img src="data:image/png;base64,${imgBase64}">
<div id="hint">ESC para cerrar</div>
<a id="save-btn" href="data:image/png;base64,${imgBase64}" download="charuco_board.png">⬇ Guardar PNG</a>
</body></html>`;

    const tmpHtml = path.join(os.tmpdir(), 'charuco_board_viewer.html');
    fs.writeFileSync(tmpHtml, html, 'utf-8');

    const boardWin = new BrowserWindow({
      fullscreen: true,
      frame: false,
      alwaysOnTop: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    boardWin.loadFile(tmpHtml);

    // Close on Escape.
    boardWin.webContents.on('before-input-event', (_e, input) => {
      if (input.key === 'Escape') boardWin.close();
    });

    return { path: boardPath };
  });

  // Run the calibration solver; streams progress via 'river-cli-message'.
  ipcMain.handle(
    'calibration-solve',
    async (
      _event,
      args: {
        dir: string;
        reportDir: string;
        undistortedDir: string;
        board?: string;
      }
    ) => {
      const { dir, reportDir, undistortedDir, board = '20x15' } = args;
      // Save to tmpdir so no file lands in the user's image folder before they choose to save.
      const profilePath = path.join(os.tmpdir(), 'river_cal_profile.json');

      const options = [
        'camera-calibration',
        '--dir',
        dir,
        '--board',
        board,
        '--save',
        profilePath,
        '--report',
        reportDir,
        '--save-undistorted',
        undistortedDir,
      ];

      try {
        const result = await riverCli(
          options,
          'json',
          true,
          PROJECT_CONFIG.logsPath || path.join(os.tmpdir(), 'river_cal.log')
        );
        return { ...result, tempProfilePath: profilePath };
      } catch (err) {
        return { error: { message: String(err) } };
      }
    }
  );

  // Read report files (summary.json + per_view_rms.csv) after a solve.
  ipcMain.handle('calibration-read-results', async (_event, args: { reportDir: string }) => {
    const { reportDir } = args;

    const summaryPath = path.join(reportDir, 'summary.json');
    const csvPath = path.join(reportDir, 'per_view_rms.csv');
    const heatmapPath = path.join(reportDir, 'coverage_heatmap.png');

    let summary: Record<string, unknown> | null = null;
    let csvRows: { bin_center_px: number; count: number }[] = [];
    let heatmapBase64: string | null = null;

    if (fs.existsSync(summaryPath)) {
      summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
    }

    if (fs.existsSync(csvPath)) {
      const lines = fs.readFileSync(csvPath, 'utf-8').split('\n').filter(Boolean);
      for (const line of lines.slice(1)) {
        const [bin, count] = line.split(',');
        if (bin && count) {
          csvRows.push({ bin_center_px: parseFloat(bin), count: parseInt(count, 10) });
        }
      }
    }

    if (fs.existsSync(heatmapPath)) {
      heatmapBase64 = fs.readFileSync(heatmapPath).toString('base64');
    }

    // Collect overlay image paths.
    const overlaysDir = path.join(reportDir, 'overlays');
    let overlayPaths: string[] = [];
    if (fs.existsSync(overlaysDir)) {
      overlayPaths = fs
        .readdirSync(overlaysDir)
        .filter((f) => f.endsWith('.png'))
        .sort()
        .map((f) => path.join(overlaysDir, f));
    }

    // Collect undistorted image paths from summary.undistorted_dir.
    let undistortedPaths: string[] = [];
    const undistortedDir = (summary as Record<string, unknown>)?.undistorted_dir as string | undefined;
    if (undistortedDir && fs.existsSync(undistortedDir)) {
      undistortedPaths = fs
        .readdirSync(undistortedDir)
        .filter((f) => /\.(png|jpe?g)$/i.test(f))
        .sort()
        .map((f) => path.join(undistortedDir, f));
    }

    return { summary, csvRows, heatmapBase64, overlayPaths, undistortedPaths };
  });

  // Scan a directory for image files (jpg, jpeg, png) and generate small thumbnails.
  ipcMain.handle('calibration-scan-images', async (_event, args: { dir: string }) => {
    const { dir } = args;
    try {
      const exts = new Set(['.jpg', '.jpeg', '.png']);
      const files = fs
        .readdirSync(dir)
        .filter((f) => exts.has(path.extname(f).toLowerCase()))
        .sort()
        .map((f) => path.join(dir, f));

      // Each source dir gets its own thumb folder under tmpdir so there are no
      // filename collisions when the user loads different folders.
      const dirHash = crypto.createHash('md5').update(dir).digest('hex').slice(0, 12);
      const thumbDir = path.join(os.tmpdir(), `river-cal-thumbs-${dirHash}`);
      fs.mkdirSync(thumbDir, { recursive: true });

      const thumbs: string[] = [];
      for (const f of files) {
        const fileHash = crypto.createHash('md5').update(f).digest('hex').slice(0, 8);
        const thumbPath = path.join(thumbDir, `${fileHash}.jpg`);

        if (!fs.existsSync(thumbPath)) {
          try {
            const img = nativeImage.createFromPath(f);
            if (!img.isEmpty()) {
              const resized = img.resize({ width: 200, quality: 'good' });
              fs.writeFileSync(thumbPath, resized.toJPEG(80));
            } else {
              thumbs.push(f);
              await new Promise<void>((resolve) => setImmediate(resolve));
              continue;
            }
          } catch {
            thumbs.push(f);
            await new Promise<void>((resolve) => setImmediate(resolve));
            continue;
          }
        }
        thumbs.push(thumbPath);
        // Yield between images so the main process stays responsive.
        await new Promise<void>((resolve) => setImmediate(resolve));
      }

      let imageSize: { width: number; height: number } | null = null;
      if (files.length > 0) {
        try {
          const firstImg = nativeImage.createFromPath(files[0]);
          if (!firstImg.isEmpty()) imageSize = firstImg.getSize();
        } catch {}
      }

      return { images: files, thumbs, imageSize };
    } catch {
      return { images: [], thumbs: [], imageSize: null };
    }
  });

  // Save a solved calibration profile to ~/River/calibration_profiles/<camera>/<lens>/.
  ipcMain.handle(
    'calibration-save-profile',
    async (
      _event,
      args: { cameraName: string; lensName: string; profileSrc: string; reportSrc: string; undistortedSrc: string }
    ) => {
      const { cameraName, lensName, profileSrc, reportSrc, undistortedSrc } = args;
      const profilesBaseDir = path.join(PROJECT_CONFIG.mainDirectory, 'calibration_profiles');
      const profileDir = path.join(profilesBaseDir, sanitizeDirName(cameraName), sanitizeDirName(lensName));

      try {
        fs.mkdirSync(profileDir, { recursive: true });

        fs.copyFileSync(profileSrc, path.join(profileDir, 'profile.json'));

        if (fs.existsSync(reportSrc)) {
          fs.cpSync(reportSrc, path.join(profileDir, 'report'), { recursive: true });
        }

        if (fs.existsSync(undistortedSrc)) {
          fs.cpSync(undistortedSrc, path.join(profileDir, 'undistorted_samples'), { recursive: true });
        }

        return { success: true, savedProfilePath: path.join(profileDir, 'profile.json') };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    }
  );

  // Copy a file from src to dest.
  ipcMain.handle('calibration-copy-file', async (_event, args: { src: string; dest: string }) => {
    const { src, dest } = args;
    try {
      fs.copyFileSync(src, dest);
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // List saved calibration profiles from ~/River/calibration_profiles/.
  // Returns grouped structure: legacy (flat) profiles are shown as-is;
  // new-format profiles are grouped by camera with a lenses array.
  ipcMain.handle('calibration-list-profiles', async () => {
    const profilesBaseDir = path.join(PROJECT_CONFIG.mainDirectory, 'calibration_profiles');
    if (!fs.existsSync(profilesBaseDir)) return [];

    type ProfileGroup = {
      camera: string;
      isLegacy: boolean;
      path?: string;
      lenses?: { name: string; path: string }[];
    };

    const result: ProfileGroup[] = [];

    try {
      const topEntries = fs.readdirSync(profilesBaseDir, { withFileTypes: true }).filter((e) => e.isDirectory());

      for (const entry of topEntries) {
        const entryPath = path.join(profilesBaseDir, entry.name);
        const directProfilePath = path.join(entryPath, 'profile.json');

        if (fs.existsSync(directProfilePath)) {
          // Legacy flat structure: calibration_profiles/<name>/profile.json
          result.push({ camera: entry.name, isLegacy: true, path: directProfilePath });
        } else {
          // New structure: calibration_profiles/<camera>/<lens>/profile.json
          const lenses: { name: string; path: string }[] = [];
          try {
            const subEntries = fs.readdirSync(entryPath, { withFileTypes: true }).filter((e) => e.isDirectory());
            for (const sub of subEntries) {
              const lensProfilePath = path.join(entryPath, sub.name, 'profile.json');
              if (fs.existsSync(lensProfilePath)) {
                lenses.push({ name: sub.name, path: lensProfilePath });
              }
            }
          } catch {}
          if (lenses.length > 0) {
            result.push({ camera: entry.name, isLegacy: false, lenses });
          }
        }
      }

      return result;
    } catch {
      return [];
    }
  });

  // Open a path in the system file manager.
  ipcMain.handle('calibration-reveal-path', async (_event, args: { targetPath: string }) => {
    shell.showItemInFolder(args.targetPath);
  });
}

export { cameraCalibration };
