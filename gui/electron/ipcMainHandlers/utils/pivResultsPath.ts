import * as path from 'path';

/**
 * Where a project's PIV results live. settings.json only says whether there
 * are results; the file is always the project's own piv_results.json, never
 * the absolute path stored there, which can name another project's folder.
 */
export function pivResultsPath(projectDirectory: string, settingsParsed: { piv_results?: string }) {
  return settingsParsed.piv_results ? path.join(projectDirectory, 'piv_results.json') : undefined;
}
