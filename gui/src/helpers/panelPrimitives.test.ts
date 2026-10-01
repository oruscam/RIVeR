import { readFileSync } from 'fs';
import { join } from 'path';
import { scanCss } from './cssScanner';
import { contrastRatio, mixOverBackdrop, parseThemeTokens, resolveRgb, ThemeName } from './themeTokens';

/**
 * The panel-row primitives behind the Processing panel redesign's seven rules
 * (preview: docs/superpowers/previews/2026-10-01-processing-panel-advanced.html).
 */
const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');
const { rules, declarations } = scanCss(css);
/** Values of `property` on the last rule whose prelude is exactly `selector`. */
const decl = (selector: string, property: string): string | undefined => {
  const rule = rules.filter((r) => r.prelude === selector).pop();
  if (!rule) return undefined;
  return declarations.filter((d) => d.rule === rule.index && d.property === property).pop()?.value;
};

describe('scanner canary', () => {
  it('still sees a rule known to be present', () => {
    expect(decl('.btn', 'display')).toBeDefined();
  });
});

describe('row grammar (rules 1, 2)', () => {
  it('.field-row is label left, control right, 40px tall, at the 8px row inset', () => {
    expect(decl('.field-row', 'display')).toBe('flex');
    expect(decl('.field-row', 'justify-content')).toBe('space-between');
    expect(decl('.field-row', 'min-height')).toBe('40px');
    expect(decl('.field-row', 'padding')).toBe('0 var(--space-2)');
  });

  it('a row label can shrink instead of pushing its control off the right edge', () => {
    expect(decl('.field-row-label', 'min-width')).toBe('0');
  });

  it('section-level rows (Station number, ROI height) use the 16px label size', () => {
    expect(decl('.field-row-top .field-row-label', 'font-size')).toBe('var(--text-section)');
  });
});

describe('two text levels (rule 3) and dividers (rule 4)', () => {
  it('.panel-group is the quietest text in the block', () => {
    expect(decl('.panel-group', 'font-size')).toBe('var(--text-caption)');
    expect(decl('.panel-group', 'font-weight')).toBe('600');
    expect(decl('.panel-group', 'color')).toBe('var(--text-subdued)');
  });

  it('.panel-rule is a 1px border-colour line', () => {
    expect(decl('.panel-rule', 'height')).toBe('1px');
    expect(decl('.panel-rule', 'background')).toBe('var(--border-color)');
  });
});

describe('dependents and read-only values (rules 6, 7)', () => {
  it('a dependent row sits 16px further in and reads muted', () => {
    expect(decl('.field-row.field-row-child', 'padding-left')).toBe('calc(var(--space-2) + var(--space-4))');
    expect(decl('.field-row-child .field-row-label', 'color')).toBe('var(--text-subdued)');
  });

  it('a read-only value is muted tabular text, not a field', () => {
    expect(decl('.field-readonly', 'color')).toBe('var(--text-subdued)');
    expect(decl('.field-readonly', 'font-variant-numeric')).toBe('tabular-nums');
  });
});

describe('.field: the compact value field', () => {
  it('is 30px tall body text, centred, with a hairline', () => {
    expect(decl('.field', 'height')).toBe('30px');
    expect(decl('.field', 'font-size')).toBe('var(--text-body)');
    expect(decl('.field', 'text-align')).toBe('center');
    expect(decl('.field', 'border')).toBe('1px solid color-mix(in srgb, var(--text-subdued) 22%, transparent)');
  });

  it('shows a keyboard focus ring', () => {
    expect(decl('.field:focus-visible', 'outline')).toBe('2px solid var(--accent-color)');
  });

  // D1. Floors sit just under the values measured on 2026-10-01; if one fails,
  // the palette moved or the rule regressed. Report it; never lower a floor.
  const themes = parseThemeTokens(css);
  const FLOORS: Record<ThemeName, number> = { dark: 2.0, light: 1.4, dracula: 2.5 };
  it.each(Object.keys(FLOORS) as ThemeName[])('%s: the hairline is visible against the panel', (name) => {
    const t = themes[name];
    const hair = mixOverBackdrop(resolveRgb(t, '--text-subdued'), 0.22, resolveRgb(t, '--surface-field'));
    expect(contrastRatio(hair, resolveRgb(t, '--surface-panel'))).toBeGreaterThanOrEqual(FLOORS[name]);
  });
});

describe('.switch-sm: the compact parameter switch (D2)', () => {
  it('is 36x20 and drops the 20px gap the full switch keeps from its label', () => {
    expect(decl('.switch.switch-sm', 'width')).toBe('36px');
    expect(decl('.switch.switch-sm', 'height')).toBe('20px');
    expect(decl('.switch.switch-sm', 'margin-left')).toBe('0');
  });

  it('has a 14px thumb that travels 16px, out-specifying the full switch', () => {
    expect(decl('.switch-sm .slider:before', 'width')).toBe('14px');
    expect(decl('.switch-sm input:checked + .slider:before', 'transform')).toBe(
      'translateY(-50%) translateX(16px)'
    );
  });
});

describe('mutation check', () => {
  it('a stray */ that swallows .field-row is caught, not passed green', () => {
    const mutant = css.replace('.field-row {', '/* broken */ */ .field-row {');
    const scanned = scanCss(mutant);
    const ruleSurvives = scanned.rules.some((r) => r.prelude === '.field-row');
    expect(ruleSurvives).toBe(false);
  });
});
