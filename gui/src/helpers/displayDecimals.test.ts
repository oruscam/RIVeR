import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [p] : [];
  });

/**
 * RIVeR shows at most 2 decimals anywhere a value is displayed. The one declared exception is
 * the pixel size (metres per pixel is ~0.01, so it needs significant digits, not decimals).
 */
const ALLOWED = new Set(['helpers/adapterNumbers.ts']);

describe('display decimals', () => {
  test('no toFixed above 2 digits in displayed values', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const rel = file.slice(SRC.length + 1);
      if (ALLOWED.has(rel)) continue;
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/toFixed\(\s*([3-9]|[1-9]\d)\s*\)/.test(line)) offenders.push(`${rel}:${i + 1}`);
        });
    }
    expect(offenders).toEqual([]);
  });

  test('no d3.format above 2 digits', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const rel = file.slice(SRC.length + 1);
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/d3\.format\(\s*['"]\.([3-9]|\d\d)f?['"]/.test(line)) offenders.push(`${rel}:${i + 1}`);
        });
    }
    expect(offenders).toEqual([]);
  });
});
