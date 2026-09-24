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

  /**
   * Chromium suppresses pointer events — and therefore title tooltips — on a
   * natively disabled control, so a button that must explain why it is
   * unavailable carries [aria-disabled="true"] instead of the disabled
   * attribute. Every hover and active rule in the family therefore has to
   * exclude it, or an aria-disabled button still lights up under the cursor.
   *
   * Swept rather than enumerated: 6b adds more .btn variants, and the two
   * rules this test was written for (.btn-secondary, .btn-tertiary) were
   * themselves missed when the contract was first applied to .btn and .ibtn.
   */
  it('no hover or active rule in the .btn/.ibtn family can fire on an [aria-disabled] control', () => {
    const selectors = [...css.matchAll(/^\.(?:btn|ibtn)[^{\n]*:(?:hover|active)[^{\n]*\{/gm)].map(
      (match) => match[0]
    );
    // If this drops to zero the sweep has stopped sweeping — the family is
    // known to have at least the four rules present when this was written.
    expect(selectors.length).toBeGreaterThanOrEqual(4);
    const unguarded = selectors.filter((selector) => !selector.includes(':not([aria-disabled="true"])'));
    expect(unguarded).toEqual([]);
  });

  it('gives .btn a pressed/selected state carrying all four meanings on one accent fill', () => {
    // Four attributes, one visual: aria-pressed (toggle), aria-selected
    // (tablist), data-complete (step finished), aria-busy (running). 6b records
    // the meaning in the DOM so a later sub-plan can differentiate the visuals
    // without re-reading 18 call sites. See plan ruling R2.
    const rule = css.match(/\.btn\[aria-pressed="true"\][^{]*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    const selector = rule![0].slice(0, rule![0].indexOf('{'));
    for (const attr of [
      'aria-pressed="true"',
      'aria-selected="true"',
      'data-complete="true"',
      'aria-busy="true"',
    ]) {
      expect(selector).toContain(`.btn[${attr}]`);
    }
    expect(rule![0]).toContain('background-color: var(--accent-color)');
    expect(rule![0]).toContain('color: var(--on-accent)');
  });

  it('gives .ibtn a pressed state, a danger variant and a success state', () => {
    expect(css).toMatch(/\.ibtn\[aria-pressed="true"\][^{]*\{[^}]*background-color: var\(--accent-color\)/);
    expect(css).toMatch(/\.ibtn-danger[^{]*\{[^}]*background-color: var\(--status-bad\)/);
    expect(css).toMatch(/\.ibtn\[data-state="success"\][^{]*\{[^}]*color: var\(--status-good\)/);
  });

  it('the .ibtn danger fill fires on hover and when armed, but never when aria-disabled', () => {
    // Takes the whole selector list up to its brace, newlines included, then
    // splits on commas, so the assertion holds however the list is wrapped.
    // The first version of this test excluded newlines, which made it pass only
    // while both selectors sat on one physical line — nothing enforces that,
    // and prettier's print width is close enough to move it.
    const rule = css.match(/\.ibtn-danger[^{}]*\{/);
    expect(rule).not.toBeNull();
    const selectors = rule![0]
      .slice(0, -1)
      .split(',')
      .map((selector) => selector.trim());
    const fill = selectors.find((selector) => selector.includes(':hover'));
    expect(fill).toBeDefined();
    expect(fill).toContain(':not([aria-disabled="true"])');
    expect(selectors).toContain('.ibtn-danger[data-armed="true"]');
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
