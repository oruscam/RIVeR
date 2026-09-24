import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Phase 6a's two component primitives. .chip is an object the user selects
 * (a cross section, a mask); .seg is a view the canvas adopts (Frames /
 * Space-time / Spectrum). Both ship with no consumers — 6c-6e adopt them.
 */
const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ruleBody = (selector: string): string => {
  const match = css.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : '';
};

describe('.chip primitive', () => {
  it('is a pill on the field surface, sized from the type scale', () => {
    const body = ruleBody('.chip');
    expect(body).toMatch(/border-radius:\s*var\(--radius-full\)/);
    expect(body).toMatch(/background-color:\s*var\(--surface-field\)/);
    expect(body).toMatch(/font-size:\s*var\(--text-meta\)/);
    expect(body).toMatch(/height:\s*32px/);
  });

  it('shows its selected state through aria-pressed, not a separate class', () => {
    const body = ruleBody('.chip[aria-pressed="true"]');
    expect(body).toMatch(/background-color:\s*var\(--accent-color\)/);
    expect(body).toMatch(/color:\s*var\(--on-accent\)/);
  });

  it('has a focus ring and a hover state', () => {
    expect(ruleBody('.chip:focus-visible')).toMatch(/outline:\s*2px solid var\(--accent-color\)/);
    expect(ruleBody('.chip:hover:not(:disabled)')).toMatch(/background-color:\s*var\(/);
  });

  it('.chip-sm changes only size, following the .btn-sm naming convention', () => {
    const body = ruleBody('.chip-sm');
    expect(body).toMatch(/height:\s*28px/);
    expect(body).toMatch(/font-size:\s*var\(--text-caption\)/);
    expect(body).not.toMatch(/background-color|color:/);
  });
});

describe('.seg primitive', () => {
  it('is a pill track holding the segment buttons', () => {
    const body = ruleBody('.seg');
    expect(body).toMatch(/display:\s*inline-flex/);
    expect(body).toMatch(/border-radius:\s*var\(--radius-full\)/);
    expect(body).toMatch(/background-color:\s*var\(--surface-field\)/);
  });

  it('draws unselected segments subdued and the selected one on accent', () => {
    expect(ruleBody('.seg button')).toMatch(/color:\s*var\(--text-subdued\)/);
    const selected = ruleBody('.seg button[aria-pressed="true"]');
    expect(selected).toMatch(/background-color:\s*var\(--accent-color\)/);
    expect(selected).toMatch(/color:\s*var\(--on-accent\)/);
  });

  it('dims disabled segments rather than hiding them', () => {
    const body = ruleBody('.seg button:disabled');
    expect(body).toMatch(/opacity:\s*0\.38/);
    expect(body).toMatch(/cursor:\s*not-allowed/);
  });
});

describe('both primitives are token-driven', () => {
  const SELECTORS = [
    '.chip',
    '.chip:hover:not(:disabled)',
    '.chip:focus-visible',
    '.chip[aria-pressed="true"]',
    '.chip-sm',
    '.chip:disabled',
    '.seg',
    '.seg button',
    '.seg button[aria-pressed="true"]',
    '.seg button:disabled',
  ];

  it('uses no literal colour values anywhere in the new rules', () => {
    const colorRegex = /#[0-9a-fA-F]{3,8}\b|rgba?\(/;
    const offenders = SELECTORS.filter((sel) => colorRegex.test(ruleBody(sel)));
    expect(offenders).toEqual([]);
  });
});
