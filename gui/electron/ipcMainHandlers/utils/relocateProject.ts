import * as path from 'path';

/** settings.json keys whose file always lives in the project folder (spec §1). Order
 *  matters: the first changed key names the folder the project was moved from. */
const OWNED_KEYS: string[][] = [
  ['xsections'],
  ['piv_results'],
  ['transformation', 'matrix'],
  ['stabilization_regions_path'],
  ['camera_solution_3d'],
  ['grp_3d'],
];

/** Older versions saved `<project>/C:\...` after a failed load; returns the Windows path. */
function unmangle(stored: string): string {
  return stored.match(/^\/.*?\/([A-Za-z]:\\.*)$/)?.[1] ?? stored;
}

/**
 * Points every project-owned path in settings.json into `projectFolder`, whatever
 * folder it was saved from. Never falls back to the stored path, so a project copied
 * elsewhere edits its own files, not the original's. Pure: returns a new object.
 * `samePath(stored, resolved)` says when a stored path already is the opened file under
 * another spelling (prepareProject passes a disk-aware check); such a path is kept.
 */
export function relocateOwnedPaths(
  projectFolder: string,
  settings: Record<string, any>,
  samePath: (stored: string, resolved: string) => boolean = (a, b) => a === b
): { settings: Record<string, any>; changed: boolean; movedFrom?: string } {
  const next = structuredClone(settings);
  let changed = false;
  let movedFrom: string | undefined;

  for (const keyPath of OWNED_KEYS) {
    const parent = keyPath.slice(0, -1).reduce<any>((obj, key) => obj?.[key], next);
    const key = keyPath[keyPath.length - 1];
    if (typeof parent?.[key] !== 'string' || parent[key] === '') continue;
    const stored = unmangle(parent[key]);

    // win32 splits on both / and \, so paths saved on Windows work on macOS/Linux.
    const resolved = path.join(projectFolder, path.win32.basename(stored));
    if (!samePath(stored, resolved)) {
      parent[key] = resolved;
      changed = true;
      movedFrom ??= path.win32.dirname(stored);
    }
  }

  return { settings: next, changed, movedFrom };
}
