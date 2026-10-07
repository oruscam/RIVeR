import * as fs from 'fs';
import * as path from 'path';

/**
 * Copies `source` into `projectFolder` and returns the copy's path. A file already in
 * the project is returned as is; an identical file with the same name is reused; a
 * different file with the same name is never overwritten, the copy gets `_2`, `_3`, …
 */
export async function copyIntoProject(source: string, projectFolder: string): Promise<string> {
  if (path.resolve(path.dirname(source)) === path.resolve(projectFolder)) return source;

  const ext = path.extname(source);
  const stem = path.basename(source, ext);
  const content = await fs.promises.readFile(source);

  for (let n = 1; ; n++) {
    const target = path.join(projectFolder, n === 1 ? `${stem}${ext}` : `${stem}_${n}${ext}`);
    if (!fs.existsSync(target)) {
      await fs.promises.copyFile(source, target);
      return target;
    }
    if ((await fs.promises.readFile(target)).equals(content)) return target;
  }
}

/** Spec §2 resolution order: same name in the project, else copy the stored file, else missing. */
export async function resolveExternalFile(
  stored: string,
  projectFolder: string
): Promise<{ status: 'inProject' | 'copied'; path: string } | { status: 'missing' }> {
  const candidate = path.join(projectFolder, path.basename(stored));
  if (fs.existsSync(candidate)) return { status: 'inProject', path: candidate };
  if (fs.existsSync(stored)) return { status: 'copied', path: await copyIntoProject(stored, projectFolder) };
  return { status: 'missing' };
}
