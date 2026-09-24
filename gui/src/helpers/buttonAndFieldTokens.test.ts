import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The new .btn/.ibtn/.field-row component classes from the design audit.
 * These are theme-invariant (they read var(--accent-color) etc. rather than
 * declaring colours), so — unlike the [data-theme] token tests — this parses
 * the raw CSS text once, not per theme.
 */
const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');

const ruleBody = (selector: string): string => {
  const pattern = new RegExp(`${selector.replace(/[.:]/g, '\\$&')}\\s*\\{([^}]*)\\}`);
  const match = css.match(pattern);
  return match ? match[1] : '';
};

describe('.btn button component', () => {
  it('declares the base .btn using scale tokens for radius, gap and motion', () => {
    const body = ruleBody('.btn');
    expect(body).toMatch(/border-radius:\s*var\(--radius-full\)/);
    expect(body).toMatch(/gap:\s*var\(--space-2\)/);
    expect(body).toMatch(/transition:[^;]*var\(--motion-fast\)/);
  });

  it('.btn-primary uses the accent colour and its on-accent text colour', () => {
    const body = ruleBody('.btn-primary');
    expect(body).toMatch(/background-color:\s*var\(--accent-color\)/);
    expect(body).toMatch(/color:\s*var\(--on-accent\)/);
  });

  it('.btn-secondary and .btn-tertiary exist and stay outline/text styles', () => {
    expect(ruleBody('.btn-secondary')).toMatch(/background-color:\s*transparent/);
    expect(ruleBody('.btn-tertiary')).toMatch(/background-color:\s*transparent/);
  });

  it('gives .btn and .ibtn a visible keyboard focus ring', () => {
    expect(ruleBody('.btn:focus-visible')).toMatch(/outline:\s*2px solid var\(--accent-color\)/);
    expect(ruleBody('.ibtn:focus-visible')).toMatch(/outline:\s*2px solid var\(--accent-color\)/);
  });

  it('.ibtn is a circular icon button', () => {
    const body = ruleBody('.ibtn');
    expect(body).toMatch(/border-radius:\s*50%/);
    expect(body).toMatch(/width:\s*32px/);
  });

  it('disabled buttons dim instead of changing shape, honouring :disabled or [aria-disabled]', () => {
    const match = css.match(/\.btn:disabled,\s*\.btn\[aria-disabled="true"\]\s*\{([^}]*)\}/);
    expect(match?.[1]).toMatch(/opacity:\s*0\.38/);
  });
});

describe('.field-row component', () => {
  it('lays out label / value / trailing action as a three-column grid', () => {
    const body = ruleBody('.field-row');
    expect(body).toMatch(/display:\s*grid/);
    expect(body).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)\s+128px\s+32px/);
  });

  it('.field is a right-aligned value box using the field surface token', () => {
    const body = ruleBody('.field');
    expect(body).toMatch(/background-color:\s*var\(--input-background\)/);
    expect(body).toMatch(/border-radius:\s*var\(--radius-md\)/);
    expect(body).toMatch(/text-align:\s*right/);
  });

  it('a focused field gets an accent ring, not the browser default', () => {
    const focusWithin = ruleBody('.field:focus-within');
    expect(focusWithin).toMatch(/box-shadow:\s*0 0 0 2px var\(--accent-color\)/);
  });
});
