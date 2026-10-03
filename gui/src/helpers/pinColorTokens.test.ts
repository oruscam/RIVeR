import { readFileSync } from 'fs';
import { join } from 'path';
import { getPinColors } from './getCSSVar';

const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');

const themeBlock = (theme: 'dark' | 'light' | 'dracula'): string => {
  const match = css.match(new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!match) throw new Error(`Could not find [data-theme="${theme}"] block in index.css`);
  return match[1];
};

describe('pin colour tokens', () => {
  it('pins are theme-invariant: the historical hex values, declared once in :root', () => {
    const rootMatch = css.match(/:root\s*\{([\s\S]*?)\n\}/);
    expect(rootMatch?.[1]).toMatch(/--pin-left:\s*#ED6B57/);
    expect(rootMatch?.[1]).toMatch(/--pin-right:\s*#62C655/);
    expect(rootMatch?.[1]).toMatch(/--pin-point:\s*#6CD4FF/);
    expect(rootMatch?.[1]).toMatch(/--pin-muted:\s*#808080/);
    for (const theme of ['dark', 'light', 'dracula'] as const) {
      expect(themeBlock(theme)).not.toMatch(/--pin-(left|right|point|muted)\s*:/);
    }
  });

  it('distance colours are theme-invariant, declared once in :root', () => {
    const rootMatch = css.match(/:root\s*\{([\s\S]*?)\n\}/);
    const expected = { d12: '#6CD4FF', d13: '#CC4BC2', d14: '#F5BF61', d23: '#62C655', d24: '#7765E3', d34: '#ED6B57' };
    for (const [name, hex] of Object.entries(expected)) {
      expect(rootMatch?.[1]).toMatch(new RegExp(`--${name}:\\s*${hex}`));
    }
    for (const theme of ['dark', 'light', 'dracula'] as const) {
      expect(themeBlock(theme)).not.toMatch(/--d\d\d\s*:/);
    }
  });

  it('--pin-ink is theme-invariant, declared once in the bare :root scale-token block', () => {
    const rootMatch = css.match(/:root\s*\{([\s\S]*?)\n\}/);
    expect(rootMatch?.[1]).toMatch(/--pin-ink:\s*#0B0D10/);
    // Not redefined per theme.
    expect(themeBlock('dark')).not.toMatch(/--pin-ink/);
    expect(themeBlock('light')).not.toMatch(/--pin-ink/);
    expect(themeBlock('dracula')).not.toMatch(/--pin-ink/);
  });

  it('getPinColors reads the CSS variables with the dark-theme values as fallback', () => {
    // No document/theme element in this jsdom-less test environment, so
    // getCSSVar falls through to each call's fallback — this pins down that
    // every fallback matches the dark theme's literal value.
    expect(getPinColors()).toEqual({
      left: '#ED6B57',
      right: '#62C655',
      point: '#6CD4FF',
      muted: '#808080',
      ink: '#0B0D10',
    });
  });
});
