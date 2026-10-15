import * as fs from 'fs';
import * as path from 'path';
import { MissingInput, ProjectIssues } from '../../../commons/projectIssues';
import { relocateOwnedPaths } from './relocateProject';
import { resolveBathymetryPaths } from './resolveBathymetry';
import { isSameFile } from './samePath';

/**
 * Runs first on load-project (spec §1–§3): points project-owned paths at the opened
 * folder, brings bathymetry CSVs into it, and reports what is still missing. Writes
 * settings.json / xsections.json only when something changed, and logs it once in
 * river.log, in the same JSON-block shape executeRiverCli appends.
 */
export async function prepareProject(
  projectFolder: string
): Promise<{ settings: Record<string, any> } & ProjectIssues> {
  const settingsPath = path.join(projectFolder, 'settings.json');
  const stored = JSON.parse(await fs.promises.readFile(settingsPath, 'utf-8'));
  const { settings, changed, movedFrom } = relocateOwnedPaths(projectFolder, stored, isSameFile);

  const missingInputs: MissingInput[] = [];
  let copied: string[] = [];

  if (typeof settings.xsections === 'string' && fs.existsSync(settings.xsections)) {
    const raw = await fs.promises.readFile(settings.xsections, 'utf-8');
    const resolved = await resolveBathymetryPaths(projectFolder, raw, movedFrom);
    missingInputs.push(...resolved.missing);
    copied = resolved.copied;
    if (resolved.raw !== raw) await fs.promises.writeFile(settings.xsections, resolved.raw, 'utf-8');
  }

  const images = settings.rectification_3d_images;
  if (typeof images === 'string' && images !== '' && !fs.existsSync(images)) {
    missingInputs.push({ kind: 'ipcamImages', path: images });
  }

  if (changed) await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 4), 'utf-8');

  if (changed || copied.length > 0) {
    const notes = [
      changed ? `project moved from ${movedFrom} to ${projectFolder}` : undefined,
      copied.length > 0 ? `copied into the project: ${copied.join(', ')}` : undefined,
    ].filter(Boolean);
    const entry = { options: ['relocate-project'], output: notes.join('; '), error: '' };
    await fs.promises.appendFile(
      path.join(projectFolder, 'river.log'),
      JSON.stringify(entry, null, 4) + '\n',
      'utf-8'
    );
  }

  const videoPath = settings.video?.filepath;
  const videoMissing = typeof videoPath !== 'string' || videoPath === '' || !fs.existsSync(videoPath);

  return { settings, videoMissing, missingInputs };
}
