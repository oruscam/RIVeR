import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Phase 6a's row primitive. Unlike .chip (a single-action button), a .list-row
 * is a plain container that hosts its own focusable children — the mask,
 * region and cross-section lists 6c converts all carry per-row icon buttons,
 * and one carries a rename input, none of which may nest inside a button.
 */
const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ruleBody = (selector: string): string => {
  const match = css.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : '';
};

/** The LIST ROW region's CSS only, sliced past its own header comment and
 *  stopping before the next one, so no comment prose can reach an assertion.
 *  (The chip/seg test's equivalent helper is hardened the same way in Task 3;
 *  slicing from the header text itself starts mid-comment and ends on an
 *  unmatched opener, which the strip below cannot clean.) */
const region = (): string => {
  const header = css.indexOf('   LIST ROW (.list-row family)');
  expect(header).toBeGreaterThan(-1);
  const start = css.indexOf('*/', header) + 2;
  const nextHeader = css.indexOf('   FORM INPUTS', start);
  expect(nextHeader).toBeGreaterThan(start);
  const end = css.lastIndexOf('/*', nextHeader);
  // Fully-paired inline comments inside the region are still stripped, so their
  // prose can neither satisfy nor trip a colour assertion.
  return css.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '');
};

describe('.list-row primitive', () => {
  it('is a flex row tall enough to hold a 24px action button', () => {
    const body = ruleBody('.list-row');
    expect(body).toMatch(/display:\s*flex/);
    expect(body).toMatch(/min-height:\s*32px/);
    expect(body).toMatch(/gap:\s*var\(--space-2\)/);
  });

  it('rests on no background of its own, so an unselected list reads as a list', () => {
    expect(ruleBody('.list-row')).toMatch(/background-color:\s*transparent/);
  });

  it('tints its surface with a faint accent wash and rings it with the accent colour when selected', () => {
    const text = region();
    expect(text).toContain('.list-row[aria-selected="true"],');
    expect(text).toMatch(
      /\.list-row\[aria-selected="true"\],\s*\.list-row\[aria-pressed="true"\]\s*\{[^}]*background-color:\s*color-mix\(in srgb, var\(--accent-color\) 14%, transparent\)/
    );
    // The ring carries the real contrast — the tint alone is too faint to be
    // reliably visible across all three themes.
    expect(text).toMatch(
      /\.list-row\[aria-selected="true"\],\s*\.list-row\[aria-pressed="true"\]\s*\{[^}]*box-shadow:\s*inset 0 0 0 1px var\(--accent-color\)/
    );
  });

  it('gives the badge the accent colour when the row is selected', () => {
    // [^{}]* rather than [\s\S]{0,120}? — the latter can match a `}`, so it
    // could be satisfied by an unrelated neighbouring rule.
    expect(region()).toMatch(
      /\.list-row\[aria-selected="true"\] \.list-row-badge[^{}]*\{[^}]*background-color:\s*var\(--accent-color\)/
    );
  });

  it('truncates a long label rather than pushing the actions out of the panel', () => {
    const body = ruleBody('.list-row-label');
    expect(body).toMatch(/text-overflow:\s*ellipsis/);
    expect(body).toMatch(/overflow:\s*hidden/);
    expect(body).toMatch(/min-width:\s*0/);
  });

  it('keeps the actions slot from shrinking', () => {
    expect(ruleBody('.list-row-actions')).toMatch(/flex:\s*none/);
  });

  it('carries hover, focus and disabled affordances that work on a non-button host', () => {
    const text = region();
    // Hover must not fight the disabled, pressed or selected state, the same
    // guards .chip and .seg carry. All three are asserted explicitly — a
    // mutation check confirmed dropping :not([aria-pressed="true"]) alone
    // left this suite green when it was folded into a loose [^{]* gap.
    expect(text).toMatch(
      /\.list-row:hover:not\(\[aria-disabled="true"\]\)[^{]*:not\(\[aria-pressed="true"\]\)[^{]*:not\(\[aria-selected="true"\]\)/
    );
    expect(ruleBody('.list-row:focus-visible')).toMatch(/outline:\s*2px solid var\(--accent-color\)/);
    expect(ruleBody('.list-row[aria-disabled="true"]')).toMatch(/opacity:\s*0\.38/);
  });
});

describe('.ibtn-sm modifier', () => {
  it('is a 24px size modifier and nothing else', () => {
    const body = ruleBody('.ibtn-sm');
    expect(body).toMatch(/width:\s*24px/);
    expect(body).toMatch(/height:\s*24px/);
    // Colour and interaction stay with .ibtn, which it is applied alongside.
    expect(body).not.toMatch(/color:|background-color:|transition:/);
  });
});

describe('the row region is token-driven', () => {
  it('uses no literal colour values, including in rules added later', () => {
    expect(region().match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)).toBeNull();
  });
});
