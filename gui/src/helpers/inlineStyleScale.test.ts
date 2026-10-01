import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

/**
 * Phase 6g: style objects in .tsx use the scale tokens too. Only `fontSize:` /
 * `borderRadius:` object keys are checked. Konva's `fontSize={…}` JSX props
 * size canvas text against image pixels and are out of scope.
 */
const SRC = join(__dirname, '..');
const tsxFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return tsxFiles(full);
    return name.endsWith('.tsx') && !name.includes('.test.') ? [full] : [];
  });

const LITERAL = /\b(fontSize|borderRadius):\s*(['"`]?)(-?\d[\w.%]*)\2/g;
const ALLOWED = new Set(["borderRadius: '50%'"]);

const offendersIn = (source: string): string[] =>
  [...source.matchAll(LITERAL)].map((m) => m[0]).filter((hit) => !ALLOWED.has(hit));

describe('inline style sizes and radii (Phase 6g)', () => {
  const files = tsxFiles(SRC).map((file) => ({ file: relative(SRC, file), source: readFileSync(file, 'utf8') }));

  it('scans the components and sees a known allowed literal (canary)', () => {
    expect(files.length).toBeGreaterThan(100);
    const carousel = files.find((f) => f.file.endsWith('Carousel.tsx'))!;
    expect([...carousel.source.matchAll(LITERAL)].map((m) => m[0])).toContain("borderRadius: '50%'");
  });

  it('has no literal fontSize or borderRadius in a style object', () => {
    expect(files.flatMap(({ file, source }) => offendersIn(source).map((hit) => `${file}: ${hit}`))).toEqual([]);
  });

  it.each([['fontSize: 17'], ["fontSize: '0.85em'"], ["borderRadius: '10px'"], ['fontSize: "14px"']])(
    'would catch %s (mutation)',
    (literal) => {
      expect(offendersIn(`<span style={{ ${literal} }} />`)).toEqual([literal]);
    }
  );
});
