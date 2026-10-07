import * as fs from 'fs';
import * as path from 'path';

/**
 * Whether two folder paths name the same folder on disk: equal once resolved, or both
 * existing with the same device and inode. The second case covers a case-only
 * difference on a case-insensitive disk (/Users/a/River vs /Users/a/river) and a
 * folder reached through a symlink.
 */
export function isSameFolder(a: string, b: string): boolean {
  if (path.resolve(a) === path.resolve(b)) return true;
  try {
    const statA = fs.statSync(a, { bigint: true });
    const statB = fs.statSync(b, { bigint: true });
    return statA.dev === statB.dev && statA.ino === statB.ino;
  } catch {
    return false;
  }
}

/** Whether two file paths name the same file: same name, in the same folder. The
 *  file itself need not exist yet (piv_results.json before the first run). */
export function isSameFile(a: string, b: string): boolean {
  return path.basename(a) === path.basename(b) && isSameFolder(path.dirname(a), path.dirname(b));
}
