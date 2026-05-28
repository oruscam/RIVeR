import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
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
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fff;display:flex;align-items:center;justify-content:center;width:100vw;height:100vh;overflow:hidden}img{max-width:100%;max-height:100%;object-fit:contain}</style></head>
<body><img src="data:image/png;base64,${imgBase64}"></body></html>`;

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
        profilePath: string;
        reportDir: string;
        undistortedDir: string;
        board?: string;
      }
    ) => {
      const { dir, profilePath, reportDir, undistortedDir, board = '20x15' } = args;

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
        return result;
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

    return { summary, csvRows, heatmapBase64, overlayPaths };
  });

  // Scan a directory for image files (jpg, jpeg, png).
  ipcMain.handle('calibration-scan-images', async (_event, args: { dir: string }) => {
    const { dir } = args;
    try {
      const exts = new Set(['.jpg', '.jpeg', '.png']);
      const files = fs
        .readdirSync(dir)
        .filter((f) => exts.has(path.extname(f).toLowerCase()))
        .sort()
        .map((f) => path.join(dir, f));
      return files;
    } catch {
      return [];
    }
  });

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

  // Open a path in the system file manager.
  ipcMain.handle('calibration-reveal-path', async (_event, args: { targetPath: string }) => {
    shell.showItemInFolder(args.targetPath);
  });
}

export { cameraCalibration };
