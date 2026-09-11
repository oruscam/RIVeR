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

describe('piv-icons palette removal', () => {
  const piv = read(join(SRC, 'components', 'CustomIcons', 'piv-icons.css'));
  const ORPHANS = [
    'bg',
    'surf',
    'border',
    'text',
    'muted',
    'accent',
    'violet',
    'green',
    'red',
    'amber',
    'mono',
    'sans',
    'hi',
  ];

  const sourceFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return sourceFiles(full);
      return /\.(ts|tsx|css)$/.test(name) && !name.endsWith('.test.ts') ? [full] : [];
    });

  it('does not download fonts at runtime', () => {
    expect(piv).not.toMatch(/@import\s+url\(\s*['"]?https?:/);
  });

  it('does not define its own :root palette or restyle body', () => {
    expect(piv).not.toMatch(/:root\s*\{/);
    expect(piv).not.toMatch(/(^|\n)\s*body\s*\{/);
  });

  it('leaves no source file using the orphaned variables', () => {
    const offenders = sourceFiles(SRC).flatMap((file) => {
      const text = read(file);
      return ORPHANS.filter((name) => new RegExp(`var\\(--${name}\\)|['"]--${name}['"]\\s*:`).test(text)).map(
        (name) => `${file.replace(SRC, 'src')} uses --${name}`
      );
    });
    expect(offenders).toEqual([]);
  });
});
