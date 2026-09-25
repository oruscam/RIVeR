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

/**
 * Splits a selector list on its top-level commas only, so a comma inside
 * `:not(a, b)` or `:is(a, b)` does not split the selector it belongs to.
 */
const splitSelectorList = (list: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const character of list) {
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (character === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  parts.push(current);
  return parts.map((part) => part.replace(/\s+/g, ' ').trim()).filter(Boolean);
};

/**
 * Every rule in the stylesheet as {selectors, body}, one selectors entry per
 * top-level comma. Deliberately NOT line-based: the family sweep below used to
 * match whole physical lines, and silently stopped covering
 * `.ibtn-danger:hover` the moment that rule's selector list was wrapped onto
 * two lines — a guard that quietly narrows is worse than no guard. Comments are
 * stripped so prose cannot be read as a selector, and at-rule preludes are
 * skipped while the rules nested inside them still parse.
 */
interface CssRule {
  readonly selectors: string[];
  readonly body: string;
}

const rules = (): CssRule[] =>
  // No leading delimiter in the pattern: a rule's closing brace would be
  // consumed as the next rule's delimiter, and matchAll cannot overlap, so
  // every second rule would be skipped. `[^{}@;]+?` already cannot cross a
  // brace, so the selector list naturally starts after the previous rule.
  [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}@;]+?)\s*\{([^{}]*)\}/g)].map((match) => ({
    selectors: splitSelectorList(match[1]),
    body: match[2],
  }));

/** Selectors in the .btn/.ibtn family that fire on hover or active. */
const familyHoverSelectors = (): CssRule[] =>
  rules().filter((rule) =>
    rule.selectors.some((selector) => /^\.(?:btn|ibtn)\b/.test(selector) && /:(?:hover|active)\b/.test(selector))
  );

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
    const family = familyHoverSelectors().flatMap((rule) =>
      rule.selectors.filter(
        (selector) => /^\.(?:btn|ibtn)\b/.test(selector) && /:(?:hover|active)\b/.test(selector)
      )
    );
    // If this drops the sweep has stopped sweeping. Six such selectors exist as
    // of Phase 6b: .btn:hover, .btn:active, .btn-secondary:hover,
    // .btn-tertiary:hover, .ibtn:hover, .ibtn-danger:hover.
    expect(family.length).toBeGreaterThanOrEqual(6);
    expect(family.filter((selector) => !selector.includes(':not([aria-disabled="true"])'))).toEqual([]);
  });

  /**
   * The cascade counterpart of the test above, and the reason Phase 6b's states
   * needed a second pass. A hover selector in this family carries four or more
   * compound units, so it out-specifies the two- and three-unit state rules and
   * repaints them away while the pointer rests on the control — which is
   * precisely when a click-triggered state fires. ExportBtn's success flash
   * lasts 2.5s and begins on the user's own click, so it would never be seen.
   *
   * Only rules that actually paint colour matter: `.btn:hover` sets nothing but
   * `transform`, and a scale on a pressed button is correct.
   */
  it('a colour-painting hover rule in the family never repaints a state it out-specifies', () => {
    // EVERY state the family paints must be excluded, not merely one of them.
    // The first version of this asked `.some(...)`, which a guard narrowed to a
    // single attribute would satisfy: narrowing `.btn-tertiary:hover` to
    // `:not([aria-pressed="true"])` passed while a hovered data-complete tertiary
    // button still took the 2.12:1 (light) label-on-fill that ruling R7 removed.
    // A sweep that accepts one of five checks almost nothing.
    const required = (selector: string): string[] =>
      selector.startsWith('.ibtn')
        ? ['aria-pressed="true"', 'aria-busy="true"', 'data-state="success"']
        : ['aria-pressed="true"', 'aria-selected="true"', 'data-complete="true"', 'aria-busy="true"'];

    const offenders = familyHoverSelectors()
      .filter((rule) => /(^|[\s;])(background-)?color\s*:/.test(rule.body))
      .flatMap((rule) =>
        rule.selectors
          .filter((selector) => /^\.(?:btn|ibtn)\b/.test(selector) && /:(?:hover|active)\b/.test(selector))
          .flatMap((selector) => {
            const missing = required(selector).filter((attribute) => !selector.includes(attribute));
            return missing.length > 0 ? [`${selector} (unguarded: ${missing.join(', ')})`] : [];
          })
      );
    expect(offenders).toEqual([]);
  });

  it('gives .btn a pressed/selected state carrying all four meanings on one accent fill', () => {
    // Four attributes, one visual: aria-pressed (toggle), aria-selected
    // (tablist), data-complete (step finished), aria-busy (running). 6b records
    // the meaning in the DOM so a later sub-plan can differentiate the visuals
    // without re-reading 18 call sites. See plan ruling R2.
    const fill = rules().find((rule) =>
      rule.selectors.some((selector) => selector.startsWith('.btn:is(') && selector.includes(':not('))
    );
    expect(fill).toBeDefined();
    const selector = fill!.selectors[0];
    for (const attribute of [
      'aria-pressed="true"',
      'aria-selected="true"',
      'data-complete="true"',
      'aria-busy="true"',
    ]) {
      expect(selector).toContain(attribute);
    }
    expect(fill!.body).toContain('background-color: var(--accent-color)');
    expect(fill!.body).toContain('color: var(--on-accent)');
    // Excludes the variants that are already filled: on .btn-primary this rule
    // would be a byte-identical no-op, and on .btn-danger it would repaint a
    // destructive button accent blue.
    expect(selector).toContain('.btn-primary');
    expect(selector).toContain('.btn-danger');
  });

  it('an already-filled variant shows the state as an inset ring in its own on-colour', () => {
    // .btn-primary's fill IS the accent colour, so a fill-based pressed state is
    // invisible there; .btn-danger's fill carries meaning a repaint would erase.
    // Both ring pairs are already gated (on-accent/accent, on-error/status-bad).
    const ring = (variant: string): CssRule | undefined =>
      rules().find((rule) => rule.selectors.some((selector) => selector.startsWith(`${variant}:is(`)));
    for (const [variant, token] of [
      ['.btn-primary', '--on-accent'],
      ['.btn-danger', '--on-error'],
    ]) {
      const rule = ring(variant);
      expect(rule).toBeDefined();
      expect(rule!.body).toContain(`box-shadow: inset 0 0 0 2px var(${token})`);
      for (const attribute of ['aria-pressed="true"', 'aria-busy="true"']) {
        expect(rule!.selectors[0]).toContain(attribute);
      }
    }
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
    // splitSelectorList, not String.split(','), because the guards are written
    // as `:not(a, b)` and a naive split would tear them apart mid-selector.
    const selectors = splitSelectorList(rule![0].slice(0, -1));
    const fill = selectors.find((selector) => selector.includes(':hover'));
    expect(fill).toBeDefined();
    expect(fill).toContain(':not([aria-disabled="true"])');
    expect(selectors.some((selector) => selector.startsWith('.ibtn-danger[data-armed="true"]'))).toBe(true);
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
