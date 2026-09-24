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
    // The rule now has two selectors: aria-pressed and aria-selected
    const regionText = css.slice(css.indexOf('   CHIP (.chip family)'), css.indexOf('   FORM INPUTS'));
    expect(regionText).toContain('.chip[aria-pressed="true"],');
    expect(regionText).toContain('.chip[aria-selected="true"] {');
    // Verify the rule body has both accent tokens
    const selectorPattern =
      /\.chip\[aria-pressed="true"\],[\s\n]*\.chip\[aria-selected="true"\]\s*\{[^}]*background-color:\s*var\(--accent-color\)/;
    expect(regionText).toMatch(selectorPattern);
    const colorPattern =
      /\.chip\[aria-pressed="true"\],[\s\n]*\.chip\[aria-selected="true"\]\s*\{[^}]*color:\s*var\(--on-accent\)/;
    expect(regionText).toMatch(colorPattern);
  });

  it('has a focus ring and a hover state', () => {
    expect(ruleBody('.chip:focus-visible')).toMatch(/outline:\s*2px solid var\(--accent-color\)/);
    // The hover selector is now long and includes aria-disabled and aria-pressed/selected guards
    const regionText = css.slice(css.indexOf('   CHIP (.chip family)'), css.indexOf('   FORM INPUTS'));
    const hoverSelector =
      '.chip:hover:not(:disabled):not([aria-disabled="true"]):not([aria-pressed="true"]):not([aria-selected="true"]) {';
    expect(regionText).toContain(hoverSelector);
    const hoverPattern =
      /\.chip:hover[^}]*\{[^}]*box-shadow:\s*inset\s+0\s+0\s+0\s+1px\s+var\(--primary-text-color\)/;
    expect(regionText).toMatch(hoverPattern);
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
    // The selected rule now has two selectors: aria-pressed and aria-selected
    const regionText = css.slice(css.indexOf('   CHIP (.chip family)'), css.indexOf('   FORM INPUTS'));
    expect(regionText).toContain('.seg button[aria-pressed="true"],');
    expect(regionText).toContain('.seg button[aria-selected="true"] {');
    const bgPattern =
      /\.seg button\[aria-pressed="true"\],[\s\n]*\.seg button\[aria-selected="true"\]\s*\{[^}]*background-color:\s*var\(--accent-color\)/;
    expect(regionText).toMatch(bgPattern);
    const colorPattern =
      /\.seg button\[aria-pressed="true"\],[\s\n]*\.seg button\[aria-selected="true"\]\s*\{[^}]*color:\s*var\(--on-accent\)/;
    expect(regionText).toMatch(colorPattern);
  });

  it('dims disabled segments rather than hiding them', () => {
    // The disabled rule now has two selectors: :disabled and [aria-disabled="true"]
    const regionText = css.slice(css.indexOf('   CHIP (.chip family)'), css.indexOf('   FORM INPUTS'));
    expect(regionText).toContain('.seg button:disabled,');
    expect(regionText).toContain('.seg button[aria-disabled="true"] {');
    const opacityPattern =
      /\.seg button:disabled,[\s\n]*\.seg button\[aria-disabled="true"\]\s*\{[^}]*opacity:\s*0\.38/;
    expect(regionText).toMatch(opacityPattern);
    const cursorPattern =
      /\.seg button:disabled,[\s\n]*\.seg button\[aria-disabled="true"\]\s*\{[^}]*cursor:\s*not-allowed/;
    expect(regionText).toMatch(cursorPattern);
  });
});

describe('both primitives are token-driven', () => {
  /** The whole CHIP + SEG region, comments stripped so prose can't false-positive. */
  const region = (): string => {
    const start = css.indexOf('   CHIP (.chip family)');
    const end = css.indexOf('   FORM INPUTS');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return css.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '');
  };

  it('uses no literal colour values anywhere in the region, including rules added later', () => {
    expect(region().match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)).toBeNull();
  });

  it('drives every colour through a custom property', () => {
    expect((region().match(/var\(--[a-z0-9-]+\)/g) ?? []).length).toBeGreaterThan(20);
  });

  it('.chip selected state uses accent background and on-accent colour', () => {
    const regionText = region();
    expect(regionText).toContain('.chip[aria-pressed="true"],');
    expect(regionText).toContain('.chip[aria-selected="true"] {');
    const bgPattern =
      /\.chip\[aria-(?:pressed|selected)="true"\][^}]*\{[^}]*background-color:\s*var\(--accent-color\)[^}]*\}/;
    expect(regionText).toMatch(bgPattern);
    const colorPattern =
      /\.chip\[aria-(?:pressed|selected)="true"\][^}]*\{[^}]*color:\s*var\(--on-accent\)[^}]*\}/;
    expect(regionText).toMatch(colorPattern);
  });

  it('.chip disabled state matches both :disabled and [aria-disabled="true"]', () => {
    const regionText = region();
    expect(regionText).toContain('.chip:disabled,');
    expect(regionText).toContain('.chip[aria-disabled="true"] {');
    const opacityPattern = /\.chip:disabled,[^}]*\.chip\[aria-disabled="true"\]\s*\{[^}]*opacity:\s*0\.38[^}]*\}/;
    expect(regionText).toMatch(opacityPattern);
  });

  it('.chip hover state uses inset ring on primary text color', () => {
    const regionText = region();
    const hoverSelector =
      '.chip:hover:not(:disabled):not([aria-disabled="true"]):not([aria-pressed="true"]):not([aria-selected="true"]) {';
    expect(regionText).toContain(hoverSelector);
    const boxShadowPattern =
      /\.chip:hover[^}]*\{[^}]*box-shadow:\s*inset\s+0\s+0\s+0\s+1px\s+var\(--primary-text-color\)[^}]*\}/;
    expect(regionText).toMatch(boxShadowPattern);
  });

  it('.seg button selected state uses accent background and on-accent colour', () => {
    const regionText = region();
    expect(regionText).toContain('.seg button[aria-pressed="true"],');
    expect(regionText).toContain('.seg button[aria-selected="true"] {');
    const bgPattern =
      /\.seg button\[aria-(?:pressed|selected)="true"\][^}]*\{[^}]*background-color:\s*var\(--accent-color\)[^}]*\}/;
    expect(regionText).toMatch(bgPattern);
    const colorPattern =
      /\.seg button\[aria-(?:pressed|selected)="true"\][^}]*\{[^}]*color:\s*var\(--on-accent\)[^}]*\}/;
    expect(regionText).toMatch(colorPattern);
  });

  it('.seg button disabled state matches both :disabled and [aria-disabled="true"]', () => {
    const regionText = region();
    expect(regionText).toContain('.seg button:disabled,');
    expect(regionText).toContain('.seg button[aria-disabled="true"] {');
    const opacityPattern =
      /\.seg button:disabled,[^}]*\.seg button\[aria-disabled="true"\]\s*\{[^}]*opacity:\s*0\.38[^}]*\}/;
    expect(regionText).toMatch(opacityPattern);
  });

  it('.seg button hover state is suppressed when selected or disabled', () => {
    const regionText = region();
    const hoverSelector =
      '.seg button:hover:not(:disabled):not([aria-disabled="true"]):not([aria-pressed="true"]):not([aria-selected="true"]) {';
    expect(regionText).toContain(hoverSelector);
    const colorPattern = /\.seg button:hover[^}]*\{[^}]*color:\s*var\(--text-primary\)[^}]*\}/;
    expect(regionText).toMatch(colorPattern);
  });
});
