import { ipcMain, nativeImage } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';

/** Twice the 48px tile slot, so the miniature stays sharp on HiDPI screens. */
const THUMBNAIL_HEIGHT = 96;
const THUMBNAIL_QUALITY = 70;

/**
 * The project's first extracted frame: the lowest-sorted image in frames/,
 * skipping the stabilization background. '' when there is none.
 */
export function pickFirstFrame(fileNames: readonly string[]): string {
  const frames = fileNames.filter((f) => /\.(jpe?g|png)$/i.test(f) && f !== 'background.jpg').sort();
  return frames[0] ?? '';
}

async function thumbnailFor(directory: unknown): Promise<string> {
  if (typeof directory !== 'string' || directory === '') return '';
  try {
    const framesPath = join(directory, 'frames');
    const frame = pickFirstFrame(await fs.readdir(framesPath));
    if (!frame) return '';
    const image = nativeImage.createFromPath(join(framesPath, frame));
    if (image.isEmpty()) return '';
    const jpeg = image.resize({ height: THUMBNAIL_HEIGHT, quality: 'good' }).toJPEG(THUMBNAIL_QUALITY);
    return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
  } catch {
    return '';
  }
}

/**
 * Miniatures for Home's recent-project tiles: one small JPEG data URL per
 * directory, in input order, '' where no frame could be read. Data URLs keep
 * the renderer away from the filesystem and cost a few kB each.
 */
function projectThumbnails() {
  ipcMain.handle('project-thumbnails', async (_event, dirs: unknown) =>
    Array.isArray(dirs) ? Promise.all(dirs.map(thumbnailFor)) : []
  );
}

export { projectThumbnails };
