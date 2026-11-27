import * as fs from 'fs';
import path from 'path';
import { RiverCli } from '../interfaces';

export const GRP_IMAGES_FOLDER = 'grp_images';

export interface ProcessGrpImagesResult {
  /** Folder the GRP images are shown from: the undistorted copy, or the source without lens correction. */
  imagesPath: string;
  /** Absolute file paths inside imagesPath, sorted. */
  files: string[];
  error?: string;
}

/**
 * Brings the GRP images to the frames' geometry: same lens profile (read from settings).
 * The source folder is never modified; the copy goes to <project>/grp_images.
 * Writes settings.rectification_3d_images_processed.
 */
export async function processGrpImages(
  sourcePath: string,
  projectDirectory: string,
  settings: Record<string, any>,
  riverCli: RiverCli,
  logsPath?: string
): Promise<ProcessGrpImagesResult> {
  const lens: string | null = settings.lens_correction || null;
  const outputPath = path.join(projectDirectory, GRP_IMAGES_FOLDER);

  await fs.promises.rm(outputPath, { recursive: true, force: true });

  let imagesPath = sourcePath;
  if (lens) {
    const options = ['undistort-images', sourcePath, outputPath, '--profile-path', lens];
    const result = await riverCli(options, 'json', false, logsPath);
    if (result?.error?.message) {
      await fs.promises.rm(outputPath, { recursive: true, force: true });
      return { imagesPath: sourcePath, files: [], error: result.error.message };
    }
    imagesPath = outputPath;
  }

  settings.rectification_3d_images = sourcePath;
  settings.rectification_3d_images_processed = imagesPath === outputPath ? outputPath : null;

  const files = (await fs.promises.readdir(imagesPath)).sort().map((file) => path.join(imagesPath, file));
  return { imagesPath, files };
}
