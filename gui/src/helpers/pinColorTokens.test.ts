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
  it('dark and light themes use the historical pin hex values', () => {
    expect(themeBlock('dark')).toMatch(/--pin-left:\s*#ED6B57/);
    expect(themeBlock('dark')).toMatch(/--pin-right:\s*#62C655/);
    expect(themeBlock('dark')).toMatch(/--pin-point:\s*#6CD4FF/);
    expect(themeBlock('dark')).toMatch(/--pin-muted:\s*#808080/);
    expect(themeBlock('light')).toMatch(/--pin-left:\s*#ED6B57/);
    expect(themeBlock('light')).toMatch(/--pin-right:\s*#62C655/);
    expect(themeBlock('light')).toMatch(/--pin-point:\s*#6CD4FF/);
    expect(themeBlock('light')).toMatch(/--pin-muted:\s*#808080/);
  });

  it('dracula uses its own palette instead of the dark/light hex values', () => {
    const dracula = themeBlock('dracula');
    expect(dracula).toMatch(/--pin-left:\s*#ff5555/);
    expect(dracula).toMatch(/--pin-right:\s*#50fa7b/);
    expect(dracula).toMatch(/--pin-point:\s*#8be9fd/);
    expect(dracula).toMatch(/--pin-muted:\s*#6272a4/);
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
