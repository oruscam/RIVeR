import type { ProjectIssues } from '../../commons/projectIssues';
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

export const hasMissingBathymetry = (issues: ProjectIssues) =>
  issues.missingInputs.some((input) => input.kind === 'bathymetry');
