import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { brokenPreludes, scanCss } from './cssScanner';

/**
 * No rule in any stylesheet may have comment text spilled into its selector.
 * Found in Phase 6g's planning: a `*\/` inside a comment's prose closed it
 * early at components.css:1235, and the browser dropped `.technique-row` for
 * two weeks while techniqueRowCss.test.ts, which regex-matched the raw text,
 * stayed green.
 */
const SRC = join(__dirname, '..');
const cssFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return cssFiles(full);
    return name.endsWith('.css') ? [full] : [];
  });
const files = cssFiles(SRC);

describe('CSS rule preludes', () => {
  it('sees every stylesheet and its rules (canary)', () => {
    expect(files.length).toBeGreaterThanOrEqual(9);
    const total = files.reduce((sum, file) => sum + scanCss(readFileSync(file, 'utf8')).rules.length, 0);
    expect(total).toBeGreaterThan(600);
  });

  it('has no rule whose selector swallowed comment text', () => {
    const broken = files.flatMap((file) =>
      brokenPreludes(scanCss(readFileSync(file, 'utf8')).rules).map(
        (rule) => `${relative(SRC, file)}:${rule.line}`
      )
    );
    expect(broken).toEqual([]);
  });

  it('would catch the components.css bug if it came back (mutation)', () => {
    const real = readFileSync(join(SRC, 'components', 'components.css'), 'utf8');
    const mutant = real.replace('.media-container {', '/* a/.b*/.c in d.css; e */\n.media-container {');
    expect(mutant).not.toBe(real);
    // Relative to the real file, so this holds both before and after the fix below.
    expect(brokenPreludes(scanCss(mutant).rules).length).toBe(brokenPreludes(scanCss(real).rules).length + 1);
  });
});
