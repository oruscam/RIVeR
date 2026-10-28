import * as fs from 'fs';
import * as path from 'path';
import { isSameFolder } from './samePath';

/**
 * Copies `source` into `projectFolder` and returns the copy's path. A file already in
 * the project is returned as is; an identical file with the same name is reused; a
 * different file with the same name is never overwritten, the copy gets `_2`, `_3`, …
 */
export async function copyIntoProject(source: string, projectFolder: string): Promise<string> {
  return (await copyIntoProjectDetailed(source, projectFolder)).path;
}

/** Same as copyIntoProject, also telling whether a new file was written. */
async function copyIntoProjectDetailed(
  source: string,
  projectFolder: string
): Promise<{ path: string; written: boolean }> {
  if (isSameFolder(path.dirname(source), projectFolder)) return { path: source, written: false };

  const content = await fs.promises.readFile(source);
  return place(content, path.basename(source), projectFolder, (target) => fs.promises.copyFile(source, target));
}

/**
 * Writes `content` into `projectFolder` as `fileName` and returns its path, with the
 * same rule as copyIntoProject: an identical file with that name is reused, a different
 * one is never overwritten and the new file gets `_2`, `_3`, …
 */
export async function placeIntoProject(content: string, fileName: string, projectFolder: string): Promise<string> {
  const bytes = Buffer.from(content, 'utf-8');
  return (await place(bytes, fileName, projectFolder, (target) => fs.promises.writeFile(target, bytes))).path;
}

async function place(
  content: Buffer,
  fileName: string,
  projectFolder: string,
  write: (target: string) => Promise<void>
): Promise<{ path: string; written: boolean }> {
  const ext = path.extname(fileName);
  const stem = path.basename(fileName, ext);
  for (let n = 1; ; n++) {
    const target = path.join(projectFolder, n === 1 ? `${stem}${ext}` : `${stem}_${n}${ext}`);
    if (!fs.existsSync(target)) {
      await write(target);
      return { path: target, written: true };
    }
    if ((await fs.promises.readFile(target)).equals(content)) return { path: target, written: false };
  }
}

/**
 * Spec §2 resolution order: the stored file when it still exists (copied in, or reused
 * when an identical copy is already there, never overwriting a different same-named
 * file); else the same-named file already in the project; else missing.
 */
export async function resolveExternalFile(
  stored: string,
  projectFolder: string
): Promise<{ status: 'inProject' | 'copied'; path: string } | { status: 'missing' }> {
  if (fs.existsSync(stored)) {
    const { path: target, written } = await copyIntoProjectDetailed(stored, projectFolder);
    return { status: written ? 'copied' : 'inProject', path: target };
  }
  // win32 splits on both / and \, so a path saved on Windows still finds its file.
  const candidate = path.join(projectFolder, path.win32.basename(stored));
  if (fs.existsSync(candidate)) return { status: 'inProject', path: candidate };
  return { status: 'missing' };
}
