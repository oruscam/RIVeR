import * as fs from 'node:fs';
import * as path from 'node:path';
import { app } from 'electron';

interface RiverConfig {
  riverPath: string;
}

const getConfigPath = () => path.join(app.getPath('userData'), 'river-config.json');

export function readRiverConfig(): RiverConfig | null {
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf-8');
    const parsed = JSON.parse(raw) as RiverConfig;
    if (!parsed.riverPath || !path.isAbsolute(parsed.riverPath)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveRiverConfig(config: RiverConfig): void {
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('[river] Failed to save config:', err);
  }
}

export const WORKSPACE_NAME = 'RIVeR';

/**
 * The workspace for a picked folder: a RIVeR folder inside it, so cases never land loose
 * among the user's other files. A folder already called RIVeR (any case) is the workspace itself.
 */
export function workspaceFor(picked: string): string {
  const isWorkspace = path.basename(picked).toLowerCase() === WORKSPACE_NAME.toLowerCase();
  return isWorkspace ? picked : path.join(picked, WORKSPACE_NAME);
}
