import type { MissingInput, ProjectIssues } from '../../commons/projectIssues';
import type { Bathimetry } from '../store/section/types';
import type { Point } from '../types';
import { getBathimetryValues } from './getBathimetryValues';

const fileName = (filePath: string) => filePath.split(/[\\/]/).pop() ?? filePath;

/**
 * What onLoadCrossSections draws for a section. A missing file used to throw and drop
 * the whole section; now the section loads with an empty profile (spec §4).
 */
export function loadedBathymetry(response: unknown, bath: string): { line: Point[]; name: string } {
  const result = response as { line?: Point[]; name?: string } | undefined;
  return {
    line: Array.isArray(result?.line) ? result.line : [],
    name: result?.name ?? fileName(bath),
  };
}

/** True when the section has a drawable profile; a missing file leaves `line` empty. */
export function hasBathymetryProfile(bathimetry: Pick<Bathimetry, 'line'> | undefined): boolean {
  return (bathimetry?.line?.length ?? 0) >= 2;
}

/** A located bathymetry replaces the profile but keeps the section's water level and left bank. */
export function applyLocatedBathymetry(
  previous: Bathimetry,
  located: { path: string; name: string; line: Point[] }
): { bathimetry: Bathimetry } | { error: { message: string; value?: number } } {
  const { data, error } = getBathimetryValues(located.line, previous.level);
  if (error || !data) return { error: error ?? { message: 'bathimetryNotValid', value: previous.level } };
  return {
    bathimetry: {
      ...previous,
      ...data,
      leftBank: previous.leftBank ?? data.leftBank,
      path: located.path,
      name: located.name,
      line: located.line,
    },
  };
}

/**
 * What a successful locate-bathymetry does to the store. Disk already points every
 * section that used the missing file at the located one, so the store must too, even
 * for a section whose saved level does not cross the new profile: that section keeps
 * its level and left bank, takes the new path, name and line, and the first such
 * level error is returned for an error card.
 */
export function locatedBathymetryUpdates(
  sections: { name: string; bathimetry: Bathimetry }[],
  missingInputs: MissingInput[],
  located: { path: string; name: string; line: Point[]; replaced: string }
): { updates: { index: number; bathimetry: Bathimetry }[]; error?: { message: string; value?: number } } {
  const updates: { index: number; bathimetry: Bathimetry }[] = [];
  let error: { message: string; value?: number } | undefined;

  for (const input of missingInputs) {
    if (input.kind !== 'bathymetry' || input.path !== located.replaced) continue;
    const index = sections.findIndex((section) => section.name === input.section);
    if (index === -1) continue;
    const previous = sections[index].bathimetry;
    const applied = applyLocatedBathymetry(previous, located);
    if ('error' in applied) {
      error ??= applied.error;
      updates.push({
        index,
        bathimetry: { ...previous, path: located.path, name: located.name, line: located.line },
      });
    } else {
      updates.push({ index, bathimetry: applied.bathimetry });
    }
  }

  return { updates, error };
}

export const hasMissingBathymetry = (issues: ProjectIssues) =>
  issues.missingInputs.some((input) => input.kind === 'bathymetry');
