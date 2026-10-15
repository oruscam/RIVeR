import { readFileSync } from 'fs';
import { join } from 'path';
import { contrastRatio, parseThemeTokens, resolveRgb, type ThemeName } from './themeTokens';

/**
 * Text must stay readable (WCAG AA, 4.5:1) in every theme. Each pair is
 * [text token, background token] as used together somewhere in the app.
 *
 * Companion to themeStateContrast.test.ts: that file gates the *interaction
 * states* Phase 6 introduced, this one gates plain text legibility. Both read
 * the same resolver, so a token that becomes an alias stays measurable here —
 * the parser this file used before Phase 6a saw only literal-hex declarations
 * and would have silently dropped any pair that was aliased.
 */
const themes = parseThemeTokens(readFileSync(join(__dirname, '..', 'index.css'), 'utf8'));
const NAMES: ThemeName[] = ['dark', 'light', 'dracula'];

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

describe('theme contrast (WCAG AA 4.5:1)', () => {
  describe.each(NAMES)('%s theme', (theme) => {
    it.each(PAIRS)('%s on %s', (text, background) => {
      const tokens = themes[theme];
      expect(contrastRatio(resolveRgb(tokens, text), resolveRgb(tokens, background))).toBeGreaterThanOrEqual(4.5);
    });
  });
});
