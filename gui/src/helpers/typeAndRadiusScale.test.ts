import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import {
  CssDeclaration,
  hasValidException,
  isOnScale,
  isScaleProperty,
  scaleOffenders,
  scanCss,
} from './cssScanner';

/**
 * Phase 6g (spec §4/6g, A15): every font-size, font shorthand and border
 * radius in src/**\/*.css is a scale token or a documented exception.
 *
 * PENDING is the ratchet. It holds the exact offender count each file still
 * owes. Each sweep task deletes its files' entries, and the last one deletes
 * the object. Counts are exact, not maximums, so a stale entry fails as loudly
 * as a new offender.
 *
 * EXCEPTIONS is the registry. A value that stays off-scale carries an inline
 * `/* scale-exception: <why, 3+ words> *\/` comment on its line *and* an entry
 * here, so every exception shows up in review as a diff to this file.
 */
const SRC = join(__dirname, '..');
const cssFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return cssFiles(full);
    return name.endsWith('.css') ? [full] : [];
  });
const rel = (file: string): string => relative(SRC, file).split('\\').join('/');

/** Whole files outside the sweep. Each must open with a `scale-exempt-file:` comment saying why. */
const EXEMPT_FILES = ['components/Report/report.css'];

const PENDING: Record<string, { font: number; radius: number }> = {
  'components/CustomIcons/piv-icons.css': { font: 2, radius: 4 },
  'components/Forms/form.css': { font: 15, radius: 5 },
  'components/Graphs/graphs.css': { font: 7, radius: 5 },
  'components/Messages/messages.css': { font: 6, radius: 0 },
  'components/components.css': { font: 22, radius: 21 },
  'index.css': { font: 16, radius: 8 },
  'pages/pages.css': { font: 13, radius: 5 },
};

/** `file|selector|property: value` for every documented exception. */
const EXCEPTIONS: string[] = [];

const key = (file: string, d: CssDeclaration): string => `${file}|${d.selector}|${d.property}: ${d.value}`;

const scanned = cssFiles(SRC)
  .map((file) => ({ file: rel(file), source: readFileSync(file, 'utf8') }))
  .filter(({ file }) => !EXEMPT_FILES.includes(file))
  .map(({ file, source }) => ({ file, ...scanCss(source) }));

const tally = (offenders: CssDeclaration[]) => ({
  font: offenders.filter((d) => d.property.startsWith('font')).length,
  radius: offenders.filter((d) => !d.property.startsWith('font')).length,
});

describe('type and radius scale (Phase 6g)', () => {
  it('sees the stylesheets and the declarations it governs (canary)', () => {
    expect(scanned.length).toBeGreaterThanOrEqual(8);
    const governed = scanned.flatMap((s) => s.declarations.filter((d) => isScaleProperty(d.property)));
    expect(governed.length).toBeGreaterThan(150);
    const index = scanned.find((s) => s.file === 'index.css');
    expect(index?.declarations.some((d) => d.selector === '.btn' && d.property === 'font-size')).toBe(true);
    expect(
      index?.declarations.some(
        (d) => d.selector === '.ibtn' && d.property === 'border-radius' && d.value === '50%'
      )
    ).toBe(true);
  });

  it.each(scanned.map((s) => [s.file, s] as const))('%s owes exactly its pending count', (file, s) => {
    const offenders = scaleOffenders(s.declarations);
    if (PENDING[file]) expect(tally(offenders)).toEqual(PENDING[file]);
    else expect(offenders.map((d) => `${d.line} ${d.selector} ${d.property}: ${d.value}`)).toEqual([]);
  });

  it('has no PENDING entry for a file it does not scan', () => {
    const files = scanned.map((s) => s.file);
    expect(Object.keys(PENDING).filter((file) => !files.includes(file))).toEqual([]);
  });

  it('lists every documented exception in EXCEPTIONS, and nothing else', () => {
    const found = scanned.flatMap((s) =>
      s.declarations
        .filter((d) => isScaleProperty(d.property) && !isOnScale(d) && hasValidException(d))
        .map((d) => key(s.file, d))
    );
    expect([...found].sort()).toEqual([...EXCEPTIONS].sort());
  });

  it('has no stale exception comment on an on-scale value', () => {
    const stale = scanned.flatMap((s) =>
      s.declarations
        .filter((d) => d.exception !== null && (!isScaleProperty(d.property) || isOnScale(d)))
        .map((d) => key(s.file, d))
    );
    expect(stale).toEqual([]);
  });

  // Task 7 adds report.css's exemption header; un-skip there.
  it.skip.each(EXEMPT_FILES)('%s opens with a scale-exempt-file comment giving a reason', (file) => {
    const head = readFileSync(join(SRC, file), 'utf8').slice(0, 600);
    expect(head).toMatch(/\/\*[\s\S]*?scale-exempt-file:\s*\S+(\s+\S+){2,}[\s\S]*?\*\//);
  });

  describe('mutation: the sweep notices regressions in a real file', () => {
    const real = readFileSync(join(SRC, 'index.css'), 'utf8');
    const offendersIn = (source: string) => scaleOffenders(scanCss(source).declarations).map((d) => d.selector);

    it('a new raw font-size', () => {
      expect(offendersIn(`${real}\n.mutant-6g { font-size: 15px; }\n`)).toContain('.mutant-6g');
    });

    it('a raw radius on a selector list prettier wrapped', () => {
      expect(offendersIn(`${real}\n.mutant-a,\n.mutant-b {\n  border-radius: 10px;\n}\n`)).toContain(
        '.mutant-a, .mutant-b'
      );
    });

    it('a raw size hidden in a font shorthand', () => {
      expect(offendersIn(`${real}\n.mutant-6g { font: 700 18px/1.2 var(--font-display); }\n`)).toContain(
        '.mutant-6g'
      );
    });

    it('an exception whose reason is too short to explain anything', () => {
      expect(offendersIn(`${real}\n.mutant-6g { font-size: 11px; /* scale-exception: tiny */ }\n`)).toContain(
        '.mutant-6g'
      );
    });

    it('a rule a stray comment closer swallowed is still scanned, not skipped', () => {
      const mutant = `${real}\n/* a*/.b; c */\n.mutant-6g { font-size: 15px; }\n`;
      expect(scaleOffenders(scanCss(mutant).declarations).some((d) => d.selector.includes('.mutant-6g'))).toBe(
        true
      );
    });
  });
});
