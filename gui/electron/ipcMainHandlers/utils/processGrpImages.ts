import * as fs from 'fs';
import path from 'path';
import { RiverCli } from '../interfaces';

export const GRP_IMAGES_FOLDER = 'grp_images';

export interface ProcessGrpImagesResult {
  /** Folder the GRP images are shown from: the processed copy, or the source when nothing applies. */
  imagesPath: string;
  /** Absolute file paths inside imagesPath, sorted. */
  files: string[];
  error?: string;
}

/**
 * Brings the GRP images to the frames' geometry: same lens profile and resize factor
 * (read from settings). The source folder is never modified; the copy goes to
 * <project>/grp_images. Writes settings.rectification_3d_images_processed.
 */
export async function processGrpImages(
  sourcePath: string,
  projectDirectory: string,
  settings: Record<string, any>,
  riverCli: RiverCli,
  logsPath?: string
): Promise<ProcessGrpImagesResult> {
  const lens: string | null = settings.lens_correction || null;
  const factor = Number(settings.video_range?.factor ?? 1);
  const outputPath = path.join(projectDirectory, GRP_IMAGES_FOLDER);

  await fs.promises.rm(outputPath, { recursive: true, force: true });

  let imagesPath = sourcePath;
  if (lens || factor < 1) {
    const options: (string | number)[] = ['process-images', sourcePath, outputPath, '--resize-factor', factor];
    if (lens) options.push('--profile-path', lens);

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
