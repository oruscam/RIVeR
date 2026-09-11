import { readFileSync } from 'fs';
import { join } from 'path';
import { contrastRatio, parseThemeTokens } from './themeContrast';

/**
 * The three technique-identity colours (LSPIV/STIV/iWave), one theme-tuned
 * set per theme, chosen to be distinguishable for common colour-vision
 * deficiencies (Okabe–Ito palette) and kept separate from the status
 * (good/fair/bad) and accent colours everywhere else in the app.
 */
const themes = parseThemeTokens(readFileSync(join(__dirname, '..', 'index.css'), 'utf8'));

const PALETTE: Record<string, { lspiv: string; stiv: string; iwave: string }> = {
  dark:    { lspiv: '#56B4E9', stiv: '#E69F00', iwave: '#009E73' },
  light:   { lspiv: '#0072B2', stiv: '#B86E00', iwave: '#00795A' },
  dracula: { lspiv: '#8BE9FD', stiv: '#E0954D', iwave: '#4DD9B0' },
};

describe('technique colour tokens', () => {
  describe.each(['dark', 'light', 'dracula'])('%s theme', (theme) => {
    it.each(['lspiv', 'stiv', 'iwave'] as const)('--tech-%s matches the chosen palette', (key) => {
      expect(themes[theme][`--tech-${key}`]).toBe(PALETTE[theme][key]);
    });
  });
});

describe('technique colours vs status colours (must stay separate — Critical audit finding)', () => {
  it.each(['dark', 'light', 'dracula'])('%s: STIV is not the error colour and iWave is not the success colour', (theme) => {
    expect(themes[theme]['--tech-stiv']).not.toBe(themes[theme]['--background-error']);
    expect(themes[theme]['--tech-iwave']).not.toBe(themes[theme]['--success-color']);
  });
});

describe('technique colours: non-text contrast (WCAG 1.4.11, >=3:1 against the panel)', () => {
  describe.each(['dark', 'light', 'dracula'])('%s theme', (theme) => {
    it.each(['lspiv', 'stiv', 'iwave'] as const)('--tech-%s reads against --secondary-background-color', (key) => {
      const tokens = themes[theme];
      expect(contrastRatio(tokens[`--tech-${key}`], tokens['--secondary-background-color'])).toBeGreaterThanOrEqual(3);
    });
  });
});
