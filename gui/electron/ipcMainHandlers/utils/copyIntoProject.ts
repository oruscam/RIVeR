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

  const ext = path.extname(source);
  const stem = path.basename(source, ext);
  const content = await fs.promises.readFile(source);

  for (let n = 1; ; n++) {
    const target = path.join(projectFolder, n === 1 ? `${stem}${ext}` : `${stem}_${n}${ext}`);
    if (!fs.existsSync(target)) {
      await fs.promises.copyFile(source, target);
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
  const candidate = path.join(projectFolder, path.basename(stored));
  if (fs.existsSync(candidate)) return { status: 'inProject', path: candidate };
  return { status: 'missing' };
}
