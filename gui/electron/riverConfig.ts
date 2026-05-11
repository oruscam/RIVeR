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
