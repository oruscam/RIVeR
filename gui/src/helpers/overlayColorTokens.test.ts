import { readFileSync } from 'fs';
import { join } from 'path';
import { getOverlayColors } from './getCSSVar';

const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');

describe('overlay colour tokens', () => {
  it('--overlay-line and --overlay-dim are theme-invariant, declared once in the bare :root scale-token block', () => {
    const rootMatch = css.match(/:root\s*\{([\s\S]*?)\n\}/);
    expect(rootMatch?.[1]).toMatch(/--overlay-line:\s*#FFFFFF/);
    expect(rootMatch?.[1]).toMatch(/--overlay-dim:\s*rgba\(0,\s*0,\s*0,\s*0\.4\)/);

    for (const theme of ['dark', 'light', 'dracula'] as const) {
      const match = css.match(new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([\\s\\S]*?)\\n\\}`));
      expect(match?.[1]).not.toMatch(/--overlay-line/);
      expect(match?.[1]).not.toMatch(/--overlay-dim/);
    }
  });

  it('getOverlayColors reads the CSS variables with the bare-root values as fallback', () => {
    // No document/theme element in this jsdom-less test environment, so
    // getCSSVar falls through to each call's fallback.
    expect(getOverlayColors()).toEqual({
      line: '#FFFFFF',
      dim: 'rgba(0, 0, 0, 0.4)',
    });
  });
});
