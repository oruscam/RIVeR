import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Stylesheet rules that keep the app usable across themes and input methods.
 * Scans every .css file under src/.
 */
const SRC = join(__dirname, '..');

const cssFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return cssFiles(full);
    return name.endsWith('.css') ? [full] : [];
  });

const read = (file: string): string => readFileSync(file, 'utf8');
const files = cssFiles(SRC);

describe('CSS rules', () => {
  it('finds the stylesheets', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it('uses no sub-pixel border widths', () => {
    const offenders = files.filter((file) => /border(-width)?\s*:[^;]*\b0\.\d+px/.test(read(file)));
    expect(offenders.map((file) => file.replace(SRC, 'src'))).toEqual([]);
  });

  it('gives every input class that removes its focus outline a :focus-visible ring', () => {
    const index = read(join(SRC, 'index.css'));
    const suppressed = [...index.matchAll(/\.([a-z0-9-]+):focus\s*\{\s*outline:\s*none;/g)].map((m) => m[1]);
    expect(suppressed.length).toBeGreaterThan(0);
    const missing = suppressed.filter(
      (cls) => !new RegExp(`\\.${cls}:focus-visible[^{]*\\{[^}]*outline:\\s*2px`).test(index)
    );
    expect(missing).toEqual([]);
  });

  it('has no hard-coded red or yellow row highlights', () => {
    expect(read(join(SRC, 'components', 'components.css'))).not.toMatch(/background-color:\s*(red|yellow)\s*;/);
  });
});
