import os from 'os';
import * as path from 'path';
import { app } from 'electron';

// Function to get the path to FFMPEG executable
function getFFMPEG() {
  let ffmpegPath = '';
  let ffprobePath = '';

  const plataform = os.platform();

  if (import.meta.env.VITE_DEV_SERVER_URL) {
    ffmpegPath = import.meta.env.VITE_FFMPEG_PATH;
    ffprobePath = import.meta.env.VITE_FFPROBE_PATH;

    return { ffmpegPath, ffprobePath };
  } else {
    /**
     * Constructs the path to the `ffprobe.exe` executable.
     *
     * @constant {string} ffprobePath - The path to the `ffprobe.exe` executable,
     * located in the `ffmpeg/bin` directory relative to the application's root path.
     */

    if (plataform === 'win32') {
      ffmpegPath = path.join(app.getAppPath(), '..', 'ffmpeg', 'bin', 'ffmpeg.exe');
      ffprobePath = path.join(app.getAppPath(), '..', 'ffmpeg', 'bin', 'ffprobe.exe');
    } else if (plataform === 'linux' || plataform === 'darwin') {
      ffmpegPath = path.join(app.getAppPath(), '..', 'ffmpeg', 'bin', 'ffmpeg');
      ffprobePath = path.join(app.getAppPath(), '..', 'ffmpeg', 'bin', 'ffprobe');
    }

    return { ffmpegPath, ffprobePath };
  }
}

export { getFFMPEG };
