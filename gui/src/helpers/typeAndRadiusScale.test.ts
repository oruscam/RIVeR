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

/** `file|selector|property: value` for every documented exception. */
const EXCEPTIONS: string[] = [
  'index.css|html|font-size: 16px',
  'index.css|.info-icon|font-size: 30px',
  'components/components.css|.colorbar-marker span|font-size: 10.5px',
  'components/components.css|.colorbar-manual-badge|font-size: 10.5px',
  'components/components.css|.iwave-axis|font-size: 11px',
  'components/components.css|.iwave-legend|font-size: 11px',
  'components/components.css|.technique-swatch.technique-swatch-stiv|border-radius: 2px',
  'components/Graphs/graphs.css|.station-tag-row span|font-size: 11px',
  'components/Graphs/graphs.css|.station-tag-hint|font-size: 10.5px',
];

const key = (file: string, d: CssDeclaration): string => `${file}|${d.selector}|${d.property}: ${d.value}`;

const scanned = cssFiles(SRC)
  .map((file) => ({ file: rel(file), source: readFileSync(file, 'utf8') }))
  .filter(({ file }) => !EXEMPT_FILES.includes(file))
  .map(({ file, source }) => ({ file, ...scanCss(source) }));

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

  it.each(scanned.map((s) => [s.file, s] as const))(
    '%s has no off-scale value without a documented exception',
    (_file, s) => {
      expect(
        scaleOffenders(s.declarations).map((d) => `${d.line} ${d.selector} ${d.property}: ${d.value}`)
      ).toEqual([]);
    }
  );

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

  it.each(EXEMPT_FILES)('%s opens with a scale-exempt-file comment giving a reason', (file) => {
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

describe("the report's own components are insulated from the sweep (G2)", () => {
  // Report.tsx inlines every stylesheet into report.html. report.css is exempt,
  // but if a Report/*.tsx component used a swept app class, the export would
  // change anyway. The three shared widgets the report embeds (SuccessBanner,
  // ImageResults, AllInOne) follow the app on purpose (G2) and live outside
  // this directory, so they are not checked here.
  const reportDir = join(SRC, 'components', 'Report');
  const reportSources = readdirSync(reportDir)
    .filter((name) => name.endsWith('.tsx'))
    .map((name) => readFileSync(join(reportDir, name), 'utf8'))
    .join('\n');
  const sweptClasses = scanned
    .flatMap((s) =>
      // `inherit` carries no size or radius of its own (.success-banner-link's `font: inherit`), so it cannot change an export.
      s.declarations.filter((d) => isScaleProperty(d.property) && d.value !== 'inherit').map((d) => d.selector)
    )
    .flatMap((selector) => [...selector.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));

  it('reads the report components (canary)', () => {
    expect(reportSources).toMatch(/className=/);
    expect(sweptClasses).toContain('btn');
  });

  it('uses no class whose size or radius this phase swept', () => {
    const used = new Set(
      [...reportSources.matchAll(/className=["{`']([^"}`']+)/g)].flatMap((m) => m[1].split(/\s+/))
    );
    expect([...new Set(sweptClasses)].filter((cls) => used.has(cls)).sort()).toEqual([]);
  });
});

describe('title and display sizes use Outfit 700 (D3)', () => {
  const LARGE = /var\(--text-(title|display)\)/;
  const largeSizes = (declarations: CssDeclaration[]) =>
    declarations.filter((d) => d.property === 'font-size' && LARGE.test(d.value));
  /** Title/display-sized rules missing the display font or weight 700, as `file|selector`. */
  const titleOffenders = (file: string, declarations: CssDeclaration[]): string[] =>
    largeSizes(declarations)
      .filter((size) => {
        const body = declarations.filter((d) => d.rule === size.rule);
        const hasFont = body.some((d) => d.property === 'font-family' && d.value === 'var(--font-display)');
        const hasWeight = body.some((d) => d.property === 'font-weight' && d.value === '700');
        return !hasFont || !hasWeight;
      })
      .map((d) => `${file}|${d.selector}`);

  it('finds the title-sized rules (canary)', () => {
    const selectors = scanned.flatMap((s) => largeSizes(s.declarations).map((d) => d.selector));
    expect(selectors).toEqual(expect.arrayContaining(['.form-title', '#result-info #result-number']));
  });

  it('every one declares the display font at weight 700', () => {
    expect(scanned.flatMap((s) => titleOffenders(s.file, s.declarations))).toEqual([]);
  });

  it.each([
    ['left on Inter', '.mutant-6g { font-size: var(--text-title); font-weight: 700; }'],
    [
      'in Outfit at a weight that is not bundled',
      '.mutant-6g { font-size: var(--text-display); font-family: var(--font-display); font-weight: 600; }',
    ],
  ])('would catch a title-sized rule %s (mutation)', (_label, rule) => {
    const real = readFileSync(join(SRC, 'index.css'), 'utf8');
    expect(titleOffenders('index.css', scanCss(`${real}\n${rule}\n`).declarations)).toContain(
      'index.css|.mutant-6g'
    );
  });
});
