import { readFileSync } from 'fs';
import { join } from 'path';
import { contrastRatio, parseThemeTokens } from './themeContrast';

/**
 * Text must stay readable (WCAG AA, 4.5:1) in every theme. Each pair is
 * [text token, background token] as used together somewhere in the app.
 */
const themes = parseThemeTokens(readFileSync(join(__dirname, '..', 'index.css'), 'utf8'));

const PAIRS: [string, string][] = [
  ['--primary-text-color', '--background-color'],
  ['--primary-text-color', '--secondary-background-color'],
  ['--secondary-text-color', '--background-color'],
  ['--secondary-text-color', '--secondary-background-color'],
  ['--grid-header-color', '--grid-header-bg'],
  ['--on-accent', '--accent-color'],
  ['--on-warning', '--d14'],
  ['--on-error', '--background-error'],
  ['--on-success', '--success-color'],
];

describe('contrastRatio', () => {
  it('gives the WCAG reference value for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });
});

describe('theme contrast (WCAG AA 4.5:1)', () => {
  it('finds the three themes in index.css', () => {
    expect(Object.keys(themes).sort()).toEqual(['dark', 'dracula', 'light']);
  });

  describe.each(['dark', 'light', 'dracula'])('%s theme', (theme) => {
    it.each(PAIRS)('%s on %s', (text, background) => {
      const tokens = themes[theme];
      expect(tokens[text]).toBeDefined();
      expect(tokens[background]).toBeDefined();
      expect(contrastRatio(tokens[text], tokens[background])).toBeGreaterThanOrEqual(4.5);
    });
  });
});
