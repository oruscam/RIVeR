import { readFileSync } from 'fs';
import { join } from 'path';
import {
  contrastRatio,
  mixOverBackdrop,
  parseThemeTokens,
  resolveRgb,
  resolveToken,
  type ThemeName,
  type ThemeTokens,
} from './themeTokens';

const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');
const themes = parseThemeTokens(css);
const NAMES: ThemeName[] = ['dark', 'light', 'dracula'];

/**
 * Every pair below is an interaction state this phase shipped, or a resting
 * pair a state is measured against. `floor` sits just under the value the
 * controller measured in the worst of the three themes, recorded in the
 * amendment table of this task's plan.
 *
 * If one of these fails, the CSS regressed or the palette moved. Report it.
 * Do not lower the floor.
 */
interface StatePair {
  readonly label: string;
  readonly floor: number;
  readonly ratio: (t: ThemeTokens) => number;
}

const panel = (t: ThemeTokens) => resolveRgb(t, '--surface-panel');
const field = (t: ThemeTokens) => resolveRgb(t, '--surface-field');
const accent = (t: ThemeTokens) => resolveRgb(t, '--accent-color');

const STATE_PAIRS: StatePair[] = [
  {
    label: 'accent fill vs field fill (.chip/.seg pressed, .list-row-badge selected)',
    floor: 2.5,
    ratio: (t) => contrastRatio(accent(t), field(t)),
  },
  {
    label: '--on-accent label on --accent-color',
    floor: 4.5,
    ratio: (t) => contrastRatio(resolveRgb(t, '--on-accent'), accent(t)),
  },
  {
    label: '.list-row selected ring (accent) vs panel',
    floor: 3.0,
    ratio: (t) => contrastRatio(accent(t), panel(t)),
  },
  {
    label: '.list-row hover ring (--primary-text-color) vs panel',
    floor: 3.0,
    ratio: (t) => contrastRatio(resolveRgb(t, '--primary-text-color'), panel(t)),
  },
  {
    label: '.chip hover ring (--primary-text-color) vs chip resting fill',
    floor: 3.0,
    ratio: (t) => contrastRatio(resolveRgb(t, '--primary-text-color'), field(t)),
  },
  {
    label: '.ibtn hover wash (--primary-text-color at 10%) vs panel',
    floor: 1.12,
    ratio: (t) => contrastRatio(mixOverBackdrop(resolveRgb(t, '--primary-text-color'), 0.1, panel(t)), panel(t)),
  },
  {
    label: '.list-row selected tint (accent at 14%) vs panel',
    floor: 1.1,
    ratio: (t) => contrastRatio(mixOverBackdrop(accent(t), 0.14, panel(t)), panel(t)),
  },
  {
    label: '.seg resting label (--text-subdued) vs seg track',
    floor: 4.5,
    ratio: (t) => contrastRatio(resolveRgb(t, '--text-subdued'), field(t)),
  },
  {
    label: 'disabled .seg label (--text-subdued at 0.7 opacity) vs seg track',
    floor: 2.5,
    ratio: (t) => contrastRatio(mixOverBackdrop(resolveRgb(t, '--text-subdued'), 0.7, field(t)), field(t)),
  },
  {
    label: '--text-primary vs panel',
    floor: 4.5,
    ratio: (t) => contrastRatio(resolveRgb(t, '--text-primary'), panel(t)),
  },
  {
    label: '--wash-2 vs panel (decorative bloom, deliberately faint)',
    floor: 1.1,
    ratio: (t) => contrastRatio(resolveRgb(t, '--wash-2'), panel(t)),
  },
  {
    label: '.ibtn[data-state="success"] icon (--status-good) vs panel',
    floor: 3.0,
    ratio: (t) => contrastRatio(resolveRgb(t, '--status-good'), panel(t)),
  },
  {
    label: '.ibtn-danger fill (--status-bad) vs panel',
    floor: 3.0,
    ratio: (t) => contrastRatio(resolveRgb(t, '--status-bad'), panel(t)),
  },
  {
    label: '.badge-fair dot (--status-fair) vs panel',
    floor: 3.0,
    ratio: (t) => contrastRatio(resolveRgb(t, '--status-fair'), panel(t)),
  },
  {
    label: '.badge word (--primary-text-color) on its good tint (--status-good at 15%)',
    floor: 7.5,
    ratio: (t) =>
      contrastRatio(
        resolveRgb(t, '--primary-text-color'),
        mixOverBackdrop(resolveRgb(t, '--status-good'), 0.15, panel(t))
      ),
  },
  {
    label: '.badge word (--primary-text-color) on its fair tint (--status-fair at 15%)',
    floor: 7.5,
    ratio: (t) =>
      contrastRatio(
        resolveRgb(t, '--primary-text-color'),
        mixOverBackdrop(resolveRgb(t, '--status-fair'), 0.15, panel(t))
      ),
  },
  {
    label: '.badge word (--primary-text-color) on its bad tint (--status-bad at 15%)',
    floor: 7.5,
    ratio: (t) =>
      contrastRatio(
        resolveRgb(t, '--primary-text-color'),
        mixOverBackdrop(resolveRgb(t, '--status-bad'), 0.15, panel(t))
      ),
  },
];

describe('theme token parsing', () => {
  // The parser builds its result from a fixed list of three theme names, so
  // asserting that list back is circular. What is worth asserting is that each
  // block was actually found and read: a selector that does not match yields a
  // throw, and a block that matched but parsed badly yields a thin map.
  it('reads a substantial token map for every theme', () => {
    for (const name of NAMES) {
      expect(Object.keys(themes[name]).length).toBeGreaterThan(60);
      expect(themes[name]['--accent-color']).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('throws, rather than returning an empty map, when a theme block is absent', () => {
    expect(() => parseThemeTokens(':root { --a: 1px; }')).toThrow(/data-theme="dark"/);
  });

  it('throws when a selector appears more than once, since it would silently read only the first', () => {
    const doubled = '[data-theme="dark"] { --a: 1px; }'.repeat(2);
    expect(() => parseThemeTokens(`:root { --b: 2px; }${doubled}`)).toThrow(/more than once/);
  });

  it('merges the bare :root scale tokens into every theme', () => {
    for (const name of NAMES) {
      expect(themes[name]['--text-body']).toBe('14px');
      expect(themes[name]['--space-2']).toBe('8px');
    }
  });

  /**
   * The :root block and the theme blocks happen to share no key today, so
   * nothing in index.css exercises the documented precedence. Asserted against
   * a synthetic stylesheet instead, so that flipping the spread order in
   * parseThemeTokens fails a test rather than waiting for the first token that
   * is declared in both places.
   */
  it('lets a theme declaration win over the shared :root one', () => {
    const synthetic = [
      ':root { --shared: #000000; --only-root: #111111; }',
      '[data-theme="dark"] { --shared: #ffffff; }',
      '[data-theme="light"] { --shared: #ffffff; }',
      '[data-theme="dracula"] { --shared: #ffffff; }',
    ].join('\n');
    const parsed = parseThemeTokens(synthetic);
    expect(parsed.dark['--shared']).toBe('#ffffff');
    expect(parsed.dark['--only-root']).toBe('#111111');
  });

  it('resolves an alias chain to a literal colour', () => {
    expect(resolveToken(themes.dark, '--surface-panel')).toBe('#141414');
    expect(resolveToken(themes.dark, '--surface-raised')).toBe('#141414');
  });

  it('throws on an undeclared token rather than returning undefined', () => {
    expect(() => resolveToken(themes.dark, '--no-such-token')).toThrow(/--no-such-token/);
  });

  it('throws on a circular alias chain', () => {
    const cyclic: ThemeTokens = { '--a': 'var(--b)', '--b': 'var(--a)' };
    expect(() => resolveToken(cyclic, '--a')).toThrow(/circular/i);
  });

  /**
   * A var() with a fallback resolves in the browser but not here. Returning it
   * as a literal is the dangerous outcome: a string comparison against another
   * unresolved value would pass, so a collapse test could report two tokens as
   * equal when they render differently. index.css uses no fallbacks today; this
   * makes the day one appears a loud failure rather than a quiet wrong answer.
   */
  it('throws on a var() form it cannot follow, instead of returning it as a literal', () => {
    const withFallback: ThemeTokens = { '--a': 'var(--b, #ff0000)' };
    expect(() => resolveToken(withFallback, '--a')).toThrow(/does not handle/);
  });

  it('confirms index.css itself contains no unresolvable var() form', () => {
    for (const name of NAMES) {
      for (const token of Object.keys(themes[name])) {
        expect(() => resolveToken(themes[name], token)).not.toThrow();
      }
    }
  });
});

describe('contrast maths', () => {
  it('computes the reference black-on-white ratio', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 1);
  });

  // Checked against externally known values rather than against the
  // implementation's own behaviour: #767676 is the canonical "lightest grey
  // that still passes AA on white" and #949494 the lightest that passes AA
  // Large. A symmetry test would pass by construction, since contrastRatio
  // orders the two luminances itself.
  it('agrees with published reference ratios', () => {
    expect(contrastRatio([0x76, 0x76, 0x76], [255, 255, 255])).toBeCloseTo(4.54, 2);
    expect(contrastRatio([0x94, 0x94, 0x94], [255, 255, 255])).toBeCloseTo(3.03, 2);
  });

  it('gives 1 for a colour against itself', () => {
    expect(contrastRatio([6, 120, 190], [6, 120, 190])).toBeCloseTo(1, 10);
  });

  it('composites a partial-alpha colour over its backdrop', () => {
    expect(mixOverBackdrop([255, 255, 255], 0.5, [0, 0, 0])).toEqual([127.5, 127.5, 127.5]);
    expect(mixOverBackdrop([10, 20, 30], 1, [200, 200, 200])).toEqual([10, 20, 30]);
  });
});

describe('interaction-state contrast floors, per theme', () => {
  for (const pair of STATE_PAIRS) {
    for (const name of NAMES) {
      it(`${name}: ${pair.label} clears ${pair.floor}:1`, () => {
        // toBeGreaterThanOrEqual prints the measured ratio on failure, so the
        // report reads as a measurement rather than as an opaque boolean.
        expect(pair.ratio(themes[name])).toBeGreaterThanOrEqual(pair.floor);
      });
    }
  }
});

/**
 * The documented alias collapse. These are not bugs to fix here — they are
 * facts every later sub-plan has to design around, recorded so that a change
 * to any of them breaks a test instead of silently breaking a state built on
 * top of it. The spec's "Token collapse facts" table is the prose version.
 */
describe('documented alias collapse', () => {
  it.each(NAMES)('%s: --surface-field is exactly --input-background', (name) => {
    expect(resolveToken(themes[name], '--surface-field')).toBe(resolveToken(themes[name], '--input-background'));
  });

  it.each(NAMES)(
    '%s: --surface-raised resolves to exactly --surface-panel, so it cannot carry a raised state',
    (name) => {
      expect(resolveToken(themes[name], '--surface-raised')).toBe(resolveToken(themes[name], '--surface-panel'));
    }
  );

  it('dracula collapses --border-color, --on-hover and --input-background onto one value', () => {
    const t = themes.dracula;
    expect(resolveToken(t, '--border-color')).toBe(resolveToken(t, '--input-background'));
    expect(resolveToken(t, '--on-hover')).toBe(resolveToken(t, '--input-background'));
  });
});

/**
 * Pre-existing field-surface debt, escalated to the product owner and
 * deliberately NOT fixed in Phase 6: in the light theme the field fill sits at
 * 1.05:1 against the panel it is drawn on, and `.input-field` and `.field`
 * carry `border: none`, so the boundary of every text input, value readout,
 * chip and seg track is invisible there.
 *
 * Recorded, not gated. If one of these assertions fails because the palette
 * was corrected, delete that entry and the rules that lean on the collapse can
 * be simplified. If it fails because a NEW pair joined the roster, that pair
 * was introduced by mistake — a state must not be built on a 1.05:1 surface.
 */
describe('known field-surface debt (recorded, awaiting a palette decision)', () => {
  const RECORDED: Record<ThemeName, number> = {
    dark: 1.44,
    light: 1.05,
    dracula: 1.73,
  };

  it.each(NAMES)('%s: field fill against panel is still the recorded ratio', (name) => {
    const measured = contrastRatio(field(themes[name]), panel(themes[name]));
    expect(measured).toBeCloseTo(RECORDED[name], 1);
  });

  // Asserts the measured CSS, not the constant above it — the constant
  // comparing to itself would pass whatever the palette did. This is the
  // tripwire: the day the light field surface is darkened, this fails and says
  // the debt is gone.
  it('light theme is still the one that is actually invisible', () => {
    expect(contrastRatio(field(themes.light), panel(themes.light))).toBeLessThan(1.1);
  });
});
