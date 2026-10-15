import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { scanCss } from './cssScanner';

/**
 * A `.btn` gets its height, padding, radius, size and fill from the .btn family
 * in index.css. A legacy rule keyed on the element's own id or extra class beats
 * `.btn-lg` by specificity and silently shrinks it: `#draw-coordinates { height:
 * auto; padding: 5px 0 }` made Control Points' buttons 24px tall beside Cross
 * Section's 48px ones. This guard fails when any such rule exists.
 *
 * Width and margins are not checked: a fixed width (.solver-button) is legitimate.
 */
const SRC = join(__dirname, '..');
const walk = (dir: string, ext: RegExp): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full, ext);
    return ext.test(name) && !name.includes('.test.') ? [full] : [];
  });

const SHARED = new Set([
  'btn',
  'btn-lg',
  'btn-sm',
  'btn-primary',
  'btn-secondary',
  'btn-danger',
  'btn-tertiary',
  'btn-block',
]);
const SPACING = /^(m[tbxysel]?-\d|ms-|me-|mt-|mb-)/;
const GOVERNED = /^(height|min-height|max-height|padding(-[a-z]+)?|border-radius|font-size|background(-color)?)$/;

interface BtnElement {
  file: string;
  tokens: string[];
}

const btnElements = (source: string, file: string): BtnElement[] =>
  [...source.matchAll(/<(button|a|label)\b[^>]*?>/gs)].flatMap((m) => {
    const cn = m[0].match(/className=(?:"([^"]*)"|\{`([^`]*)`\})/);
    if (!cn) return [];
    const classes = (cn[1] ?? cn[2])
      .replace(/\$\{[^}]*\}/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    if (!classes.includes('btn')) return [];
    const id = m[0].match(/\bid="([^"]+)"/)?.[1];
    const own = classes.filter((c) => !SHARED.has(c) && !SPACING.test(c)).map((c) => `.${c}`);
    return [{ file, tokens: [...(id ? [`#${id}`] : []), ...own] }];
  });

const elements = walk(SRC, /\.tsx$/).flatMap((f) => btnElements(readFileSync(f, 'utf8'), relative(SRC, f)));

const overrides = (css: string): string[] =>
  scanCss(css).declarations.flatMap((d) => {
    if (!GOVERNED.test(d.property)) return [];
    return d.selector.split(',').flatMap((part) => {
      const last = part.trim().split(/\s+/).pop() ?? '';
      return elements
        .filter((e) => e.tokens.some((t) => last === t || last.startsWith(`${t}:`) || last.startsWith(`${t}.`)))
        .map((e) => `${e.file}: ${part.trim()} { ${d.property} }`);
    });
  });

const cssFiles = walk(SRC, /\.css$/).filter((f) => !f.endsWith('report.css'));

describe('.btn elements are not resized or restyled by their own id or class', () => {
  it('sees the .btn elements and the stylesheets (canary)', () => {
    expect(elements.length).toBeGreaterThan(20);
    expect(elements.some((e) => e.tokens.includes('#draw-coordinates'))).toBe(true);
    expect(cssFiles.length).toBeGreaterThanOrEqual(8);
  });

  it('has no rule that overrides a .btn element’s size, padding, radius or fill', () => {
    const found = [...new Set(cssFiles.flatMap((f) => overrides(readFileSync(f, 'utf8'))))];
    expect(found).toEqual([]);
  });

  it('would catch the Control Points bug if it came back (mutation)', () => {
    expect(overrides('#draw-coordinates { height: auto; }').length).toBeGreaterThan(0);
    expect(overrides('.solver-button { width: 210px; }')).toEqual([]);
  });
});
