import { readFileSync } from 'fs';
import { join } from 'path';
import { contrastRatio, parseThemeTokens, resolveRgb, type ThemeName } from './themeTokens';

/**
 * The three technique-identity colours (LSPIV/STIV/iWave), one theme-tuned
 * set per theme: cyan / gold / magenta from RIVeR's own distance palette
 * (user's choice, 2026-10-03, replacing Okabe–Ito). STIV may share the
 * "fair" gold; it must never be the error colour, and iWave never success.
 */
const themes = parseThemeTokens(readFileSync(join(__dirname, '..', 'index.css'), 'utf8'));
const NAMES: ThemeName[] = ['dark', 'light', 'dracula'];

const PALETTE: Record<string, { lspiv: string; stiv: string; iwave: string }> = {
  dark: { lspiv: '#6CD4FF', stiv: '#F5BF61', iwave: '#E07BD6' },
  light: { lspiv: '#1F78B4', stiv: '#9A6A0C', iwave: '#A23C99' },
  dracula: { lspiv: '#8BE9FD', stiv: '#F1FA8C', iwave: '#FF79C6' },
};

describe('technique colour tokens', () => {
  describe.each(NAMES)('%s theme', (theme) => {
    it.each(['lspiv', 'stiv', 'iwave'] as const)('--tech-%s matches the chosen palette', (key) => {
      expect(themes[theme][`--tech-${key}`]).toBe(PALETTE[theme][key]);
    });
  });
});

describe('technique colours vs status colours', () => {
  it.each(NAMES)('%s: STIV is not the error colour and iWave is not the success colour', (theme) => {
    expect(themes[theme]['--tech-stiv']).toBeDefined();
    expect(themes[theme]['--tech-stiv']).not.toBe(themes[theme]['--background-error']);
    expect(themes[theme]['--tech-iwave']).toBeDefined();
    expect(themes[theme]['--tech-iwave']).not.toBe(themes[theme]['--success-color']);
  });

  it.each(NAMES)('%s: no technique is the accent colour', (theme) => {
    for (const key of ['lspiv', 'stiv', 'iwave']) {
      expect(themes[theme][`--tech-${key}`]).not.toBe(themes[theme]['--accent-color']);
    }
  });
});

describe('technique colours: non-text contrast (WCAG 1.4.11, >=3:1 against the panel)', () => {
  describe.each(NAMES)('%s theme', (theme) => {
    it.each(['lspiv', 'stiv', 'iwave'] as const)('--tech-%s reads against --secondary-background-color', (key) => {
      const tokens = themes[theme];
      expect(
        contrastRatio(resolveRgb(tokens, `--tech-${key}`), resolveRgb(tokens, '--secondary-background-color'))
      ).toBeGreaterThanOrEqual(3);
    });
  });
});

describe('surface/text/status alias tokens (pure aliases — no new colour values)', () => {
  const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');
  const themeBlock = (theme: string): string => {
    const match = css.match(new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`));
    if (!match) throw new Error(`No [data-theme="${theme}"] block found`);
    return match[1];
  };

  const ALIASES: [string, string][] = [
    ['--surface-frame', '--background-color'],
    ['--surface-panel', '--secondary-background-color'],
    ['--surface-raised', '--card-surface'],
    ['--surface-field', '--input-background'],
    ['--text-primary', '--primary-text-color'],
    ['--text-subdued', '--secondary-text-color'],
    ['--status-good', '--success-color'],
    ['--status-fair', '--warning-color'],
    ['--status-bad', '--background-error'],
  ];

  describe.each(NAMES)('%s theme', (theme) => {
    it.each(ALIASES)('%s aliases var(%s)', (alias, target) => {
      const block = themeBlock(theme);
      const pattern = new RegExp(`${alias}\\s*:\\s*var\\(\\s*${target}\\s*\\)\\s*;`);
      expect(block).toMatch(pattern);
    });
  });
});
