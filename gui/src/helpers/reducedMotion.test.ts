import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { scanCss } from './cssScanner';

/**
 * Phase 6g (A8's debt, spec A15): the app honours prefers-reduced-motion.
 * One global block stops transitions and animations; spinners are exempt so
 * a long run never looks frozen; JS smooth scrolls ask scrollBehavior().
 */
const SRC = join(__dirname, '..');
const walk = (dir: string, ext: RegExp): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full, ext);
    return ext.test(name) && !name.includes('.test.') ? [full] : [];
  });

/** Spinners: keep turning under reduced motion. Must match the exemption rule in index.css exactly. */
const SPINNERS = ['.module-loader-sweep', '.btn-progress-sweep::after', '.spin'];
/** Decorative infinite animations that may stop after one cycle. */
const DECORATIVE = ['.pulse'];

const index = readFileSync(join(SRC, 'index.css'), 'utf8');

const infiniteSelectors = (source: string): string[] =>
  scanCss(source)
    .declarations.filter((d) => /^animation(-iteration-count)?$/.test(d.property) && /\binfinite\b/.test(d.value))
    .map((d) => d.selector);

describe('reduced motion: stylesheet', () => {
  const { rules, declarations } = scanCss(index);
  // The global block is appended at the end of index.css, so it is the last
  // reduce-motion @media rule, and the rules it contains come after it.
  const reduceBlock = rules.filter((r) => /^@media\s*\(prefers-reduced-motion:\s*reduce\)$/.test(r.prelude)).pop();
  /** Body of the last rule with this exact prelude, provided it sits after the last reduce block opens. */
  const ruleBody = (prelude: string) => {
    const rule = rules.filter((r) => r.prelude === prelude).pop();
    if (!reduceBlock || !rule || rule.index < reduceBlock.index) return [];
    return declarations.filter((d) => d.rule === rule.index);
  };

  it('stops every transition and animation on every element', () => {
    const body = ruleBody('*, *::before, *::after');
    const value = (p: string) => body.find((d) => d.property === p)?.value;
    expect(value('animation-duration')).toBe('0.01ms !important');
    expect(value('animation-iteration-count')).toBe('1 !important');
    expect(value('transition-duration')).toBe('0.01ms !important');
    expect(value('scroll-behavior')).toBe('auto !important');
  });

  it('lets spinners keep turning, with !important so they beat the * rule', () => {
    const body = ruleBody(SPINNERS.join(', '));
    expect(body.find((d) => d.property === 'animation-iteration-count')?.value).toBe('infinite !important');
    expect(body.find((d) => d.property === 'animation-duration')?.value).toMatch(/!important$/);
  });

  it('classifies every infinite animation in the app as a spinner or decorative', () => {
    const all = walk(SRC, /\.css$/).flatMap((file) =>
      infiniteSelectors(readFileSync(file, 'utf8')).map((selector) => ({ file: relative(SRC, file), selector }))
    );
    expect(all.length).toBeGreaterThanOrEqual(4); // canary: the loaders and .spin/.pulse exist
    const unclassified = all.filter(({ selector }) => {
      if (selector === SPINNERS.join(', ')) return false; // the exemption rule itself
      return !selector.split(/\s*,\s*/).every((s) => SPINNERS.includes(s) || DECORATIVE.includes(s));
    });
    expect(unclassified).toEqual([]);
  });

  it('would catch a new infinite animation nobody classified (mutation)', () => {
    const mutant = `${index}\n.mutant-6g { animation: spin 1s linear infinite; }\n`;
    expect(infiniteSelectors(mutant)).toContain('.mutant-6g');
    expect(SPINNERS.includes('.mutant-6g') || DECORATIVE.includes('.mutant-6g')).toBe(false);
  });
});

describe('reduced motion: JS smooth scrolling', () => {
  const sources = walk(SRC, /\.tsx?$/).map((file) => ({
    file: relative(SRC, file),
    source: readFileSync(file, 'utf8'),
  }));
  const SMOOTH = /behavior:\s*['"]smooth['"]/;

  it('routes every scroll through scrollBehavior() (canary: the calls exist)', () => {
    const calls = sources.reduce(
      (n, { source }) => n + (source.match(/behavior:\s*scrollBehavior\(\)/g) ?? []).length,
      0
    );
    expect(calls).toBeGreaterThanOrEqual(19);
  });

  it("has no hard-coded behavior: 'smooth'", () => {
    expect(sources.filter(({ source }) => SMOOTH.test(source)).map((s) => s.file)).toEqual([]);
  });

  it("would catch a new hard-coded 'smooth' (mutation)", () => {
    expect(SMOOTH.test("el.scrollIntoView({ behavior: 'smooth' })")).toBe(true);
  });
});
