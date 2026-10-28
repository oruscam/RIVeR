import * as fs from 'fs';
import * as path from 'path';
import { MissingInput } from '../../../commons/projectIssues';
import { resolveExternalFile } from './copyIntoProject';
import { isSameFolder } from './samePath';
import { sanitizeNonStandardJsonTokens } from './sanitizeJson';

// A "bath" key and its JSON string value. Rewriting only these tokens keeps the rest
// of xsections.json byte-for-byte, including the bare NaN tokens Python writes.
const BATH_TOKEN = /("bath"\s*:\s*)("(?:[^"\\]|\\.)*")/g;

/** Replaces every `bath` value equal to `oldPath` with `newPath`, in place in the raw text. */
export function replaceBathPath(raw: string, oldPath: string, newPath: string): string {
  return raw.replace(BATH_TOKEN, (match, prefix: string, token: string) =>
    JSON.parse(token) === oldPath ? prefix + JSON.stringify(newPath) : match
  );
}

/** The `bath` value of one section, or undefined. */
export function sectionBath(raw: string, section: string): string | undefined {
  const bath = JSON.parse(sanitizeNonStandardJsonTokens(raw))?.[section]?.bath;
  return typeof bath === 'string' ? bath : undefined;
}

/** The project's same-named file for a bath stored in the folder it was moved from. */
function ownFile(bath: string, movedFrom: string, projectFolder: string) {
  // win32 splits on both / and \, so baths saved on Windows work on macOS/Linux.
  if (!isSameFolder(path.win32.dirname(bath), movedFrom)) return undefined;
  const candidate = path.join(projectFolder, path.win32.basename(bath));
  return fs.existsSync(candidate) ? { status: 'inProject' as const, path: candidate } : undefined;
}

/**
 * Spec §2: every section's bathymetry ends up inside the project folder when it can
 * be found (same name in the project, else copied from the stored path). Sections
 * whose file is nowhere are reported and keep their stored path.
 *
 * A bath in `movedFrom`, the folder the project was moved from, is the project's own
 * file: the opened project's same-named copy wins even when the original folder still
 * exists, so a copied project never takes the original's later edits.
 */
export async function resolveBathymetryPaths(
  projectFolder: string,
  raw: string,
  movedFrom?: string
): Promise<{ raw: string; missing: MissingInput[]; copied: string[] }> {
  const parsed = JSON.parse(sanitizeNonStandardJsonTokens(raw)) as Record<string, { bath?: unknown }>;
  const seen = new Map<string, Awaited<ReturnType<typeof resolveExternalFile>>>();
  const missing: MissingInput[] = [];
  const copied: string[] = [];
  let next = raw;

  for (const [section, value] of Object.entries(parsed)) {
    if (section === 'summary') continue;
    const bath = value?.bath;
    if (typeof bath !== 'string' || bath === '') continue;

    let resolved = seen.get(bath);
    if (resolved === undefined) {
      resolved =
        (movedFrom !== undefined && ownFile(bath, movedFrom, projectFolder)) ||
        (await resolveExternalFile(bath, projectFolder));
      seen.set(bath, resolved);
      if (resolved.status === 'copied') copied.push(resolved.path);
      if (resolved.status !== 'missing' && resolved.path !== bath)
        next = replaceBathPath(next, bath, resolved.path);
    }
    if (resolved.status === 'missing') missing.push({ kind: 'bathymetry', section, path: bath });
  }

  return { raw: next, missing, copied };
}
