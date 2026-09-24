# UI Design Refresh — Phase 6a (Primitives & tokens) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the four things the audit's layouts need and this codebase has never had — a type scale, the theme wash colour, the `.chip` selectable pill, and the `.seg` segmented control — so that Phase 6's later sub-plans have primitives to adopt instead of inventing their own.

**Architecture:** Two tasks, split by kind. Task 1 is token-only work in `src/index.css`: six `--text-*` size tokens in the existing bare `:root` scale block (theme-invariant, alongside Phase 2's `--radius-*`/`--space-*`/`--motion-*`), and one new `--wash-2` colour in each of the three `[data-theme]` blocks (theme-specific, so it cannot live in the bare `:root`). Task 2 adds two component families to `src/index.css`'s component region, immediately after the `.ibtn` rules Phase 3a put there: `.chip`/`.chip-sm` and `.seg`. Both tasks ship with source-text tests and **no consumers** — consumers arrive in 6b-6g, which is the whole point of the phase's governing rule. This is the same shape Phase 2 and Phase 3a used ("declared and tested, with no consumer yet"), with the difference that Phase 6 commits to doing the adoption rather than deferring it indefinitely.

**Tech Stack:** Plain CSS with `[data-theme]` custom properties; Jest 29 with ts-jest (`testEnvironment: "node"`, no DOM — source-text assertions under `src/helpers/`, matching `src/helpers/techniqueRowCss.test.ts`). No new dependencies, no JSX, no i18n.

**Spec:** `gui/docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md` (§4, sub-plan 6a). The audit's own values are quoted in that spec's §4; the token-name mapping from the audit's names to this codebase's is in the same section.

## Global Constraints

- Base branch for this plan is `ui/design-refresh` itself, at the Phase 6 spec commit (`0220b1d`). Never commit to `river-labs`/`main`.
- Commits: short imperative message, ending with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Author email must be `antoine.patalano@gmail.com`.
- Baseline on this plan's base commit (`0220b1d`): 57 suites / 524 tests passing; 64 pre-existing `tsc` errors; 20 pre-existing lint problems (17 errors, 3 warnings). None of these three may get worse. **Run project-wide `npm run lint` (not just the files a task touches) after every task.**
- **No consumers in this plan.** Neither task may add a `className="chip"`, `className="seg"`, `var(--text-*)` or `var(--wash-2)` reference in any `.tsx` file or in any other CSS rule. A task that finds itself wanting one has drifted out of scope and should stop and report.
- **Every colour in a new rule goes through a `var()`.** No hex, `rgb()` or named colour may appear in the `.chip` or `.seg` rule bodies; the only new literal colour values in this plan are the three `--wash-2` declarations themselves.
- All paths below are relative to `gui/` unless prefixed with `/`.

---

## File map

| File | Responsibility in this phase |
|---|---|
| `src/index.css` | Task 1: six `--text-*` tokens in the bare `:root`; `--wash-2` in each of the three `[data-theme]` blocks. Task 2: `.chip`/`.chip-sm` and `.seg` component rules after the existing `.ibtn` block |
| `src/helpers/typeScaleAndWashTokens.test.ts` (create) | Source-text assertions for Task 1 |
| `src/helpers/chipSegPrimitives.test.ts` (create) | Source-text assertions for Task 2 |

---

## Task 1: Type-scale and theme-wash tokens

**Files:**
- Modify: `src/index.css`
- Test: `src/helpers/typeScaleAndWashTokens.test.ts` (create)

**Interfaces:**
- Produces: `--text-display` `40px`, `--text-title` `24px`, `--text-section` `16px`, `--text-body` `14px`, `--text-meta` `13px`, `--text-caption` `12px` — theme-invariant, declared once on the bare `:root`. Consumed by Task 2 and by sub-plans 6b-6g.
- Produces: `--wash-2` — declared per theme (dark `#0B2D52`, light `#DDEBF7`, dracula `#33294F`). Consumed by 6f only.

- [ ] **Step 1: Write the failing test**

Create `src/helpers/typeScaleAndWashTokens.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Phase 6a's tokens. The six --text-* sizes are theme-invariant and live in the
 * bare :root scale block next to --radius-*/--space-*/--motion-*; --wash-2 is a
 * colour, so it is declared once per [data-theme] block instead.
 */
const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');

/** The body of a top-level block, e.g. ':root' or '[data-theme="dark"]'. */
const blockBody = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return '';
  const end = css.indexOf('\n}', start);
  return end === -1 ? '' : css.slice(start, end);
};

const TYPE_SCALE: [string, string][] = [
  ['--text-display', '40px'],
  ['--text-title', '24px'],
  ['--text-section', '16px'],
  ['--text-body', '14px'],
  ['--text-meta', '13px'],
  ['--text-caption', '12px'],
];

const WASH: [string, string][] = [
  ['[data-theme="dark"]', '#0B2D52'],
  ['[data-theme="light"]', '#DDEBF7'],
  ['[data-theme="dracula"]', '#33294F'],
];

describe('Phase 6a type scale', () => {
  it.each(TYPE_SCALE)('declares %s as %s in the bare :root block', (token, value) => {
    expect(blockBody(':root')).toMatch(new RegExp(`${token}:\\s*${value};`));
  });

  it('does not redeclare any type-scale token per theme — sizes are theme-invariant', () => {
    const offenders = WASH.flatMap(([selector]) =>
      TYPE_SCALE.filter(([token]) => blockBody(selector).includes(`${token}:`)).map(
        ([token]) => `${selector} redeclares ${token}`
      )
    );
    expect(offenders).toEqual([]);
  });
});

describe('Phase 6a theme wash', () => {
  it.each(WASH)('declares --wash-2 in %s as %s', (selector, value) => {
    expect(blockBody(selector)).toMatch(new RegExp(`--wash-2:\\s*${value};`));
  });

  it('does not declare --wash-2 in the bare :root block — it is theme-specific', () => {
    expect(blockBody(':root')).not.toMatch(/--wash-2:/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/typeScaleAndWashTokens.test.ts`
Expected: FAIL — none of these tokens exist yet.

- [ ] **Step 3: Add the type-scale tokens**

In `src/index.css`, find this line (it is the last declaration of the bare `:root` block's Type section, added by Phase 5d):

```css
  --font-display: 'Outfit', 'Avenir Next', system-ui, sans-serif;
```

and insert immediately after it:

```css

  /* Type scale — the design audit's six steps. Sizes only: weight and colour
     stay with the consuming rule, because the same size appears at different
     weights (14px Inter 400 body text vs. a 14px 600 value readout). Adopted
     across the codebase in Phase 6g; declared here first so 6b-6f can use them
     as they go. */
  --text-display: 40px;
  --text-title:   24px;
  --text-section: 16px;
  --text-body:    14px;
  --text-meta:    13px;
  --text-caption: 12px;
```

- [ ] **Step 4: Add `--wash-2` to the dark theme**

Still in `src/index.css`, find (this is the end of the `[data-theme="dark"]` block — the following comment header is what makes this occurrence unique, since the light theme ends with the identical two declarations):

```css
  --pin-muted: #808080;
}

/* --------------------------------------------------------------------------
   LIGHT THEME (cool blue-grey)
```

and replace it with:

```css
  --pin-muted: #808080;

  /* Theme wash — the soft coloured bloom behind the Home screen's logo and at
     the top of the Results panel. Theme-specific, so unlike the type scale it
     cannot live in the bare :root block. Consumed in Phase 6f. */
  --wash-2: #0B2D52;
}

/* --------------------------------------------------------------------------
   LIGHT THEME (cool blue-grey)
```

- [ ] **Step 5: Add `--wash-2` to the light theme**

Find (the DRACULA header is what disambiguates this from the dark block edited in Step 4):

```css
  --pin-muted: #808080;
}

/* --------------------------------------------------------------------------
   DRACULA THEME (inspired by VS Code Dracula)
```

and replace it with:

```css
  --pin-muted: #808080;

  /* Theme wash — see the dark theme's note. */
  --wash-2: #DDEBF7;
}

/* --------------------------------------------------------------------------
   DRACULA THEME (inspired by VS Code Dracula)
```

- [ ] **Step 6: Add `--wash-2` to the dracula theme**

Find (this value is unique to the dracula block, so no further context is needed):

```css
  --pin-muted: #6272a4;
}
```

and replace it with:

```css
  --pin-muted: #6272a4;

  /* Theme wash — see the dark theme's note. */
  --wash-2: #33294F;
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx jest src/helpers/typeScaleAndWashTokens.test.ts`
Expected: PASS

- [ ] **Step 8: Run the full suite, typecheck and lint**

Run: `npx jest`, `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`, `npm run lint`
Expected: all tests pass; `tsc` error count and lint problem count match (or improve on) the baseline in Global Constraints.

- [ ] **Step 9: Commit**

```bash
git add src/index.css src/helpers/typeScaleAndWashTokens.test.ts
git commit -m "$(cat <<'EOF'
Add the audit's type scale and theme wash tokens

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `.chip` and `.seg` component primitives

**Files:**
- Modify: `src/index.css`
- Test: `src/helpers/chipSegPrimitives.test.ts` (create)

**Interfaces:**
- Consumes: Task 1's `--text-meta`; Phase 2's `--radius-full`, `--space-2`, `--space-3`, `--motion-fast`, `--motion-ease`; Phase 3a's `--surface-field`, `--text-primary`, `--text-subdued`; existing `--accent-color`, `--on-accent`, `--border-color`.
- Produces: `.chip` (+ `.chip-sm` size modifier, `[aria-pressed="true"]` selected state) and `.seg` (a track containing `<button>` children, each with its own `[aria-pressed="true"]` state). Consumed in 6c (chips for section/mask lists), 6d (`.seg` for Frames/Space-time/Spectrum) and 6e (`.seg` for Corrected/Heatmap).

**Two deliberate deviations from the audit's literal CSS**, both to keep the new rules on this codebase's existing scales rather than importing off-scale values that Phase 6g would then have to explain:

| Audit | This plan | Why |
|---|---|---|
| `gap: 6px` | `var(--space-2)` (8px) | 6px is not on the 4/8/12/16 spacing scale |
| `padding: 0 14px` | `0 var(--space-3)` (12px) | 14px is not on the scale; 2px narrower is imperceptible on a pill |
| `.chip.sm` `font-size: 12.5px` | `var(--text-caption)` (12px) | 12.5px is an arbitrary half-pixel; the scale already has a 12px step |
| `.chip.sm` naming | `.chip-sm` | Matches this codebase's own `.btn-sm`/`.btn-lg` convention from Phase 3a |

`.seg`'s `padding: 3px` is kept literal: it is the track inset that centres a 28px button in a 34px track, not a spacing-scale value. It carries a comment saying so, which is the documented-exception form Phase 6g's "no unexplained values" rule expects.

- [ ] **Step 1: Write the failing test**

Create `src/helpers/chipSegPrimitives.test.ts`:

```ts
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
    const offenders = SELECTORS.filter((selector) =>
      /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(ruleBody(selector))
    );
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/chipSegPrimitives.test.ts`
Expected: FAIL — neither `.chip` nor `.seg` exists in the codebase.

- [ ] **Step 3: Add both component families**

In `src/index.css`, find the end of the `.ibtn` block and the section header that follows it:

```css
.ibtn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

/* =============================================================================
   FORM INPUTS
   ============================================================================= */
```

and replace it with:

```css
.ibtn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

/* =============================================================================
   CHIP (.chip family)
   Small selectable pill from the design audit, for lists the user picks from —
   cross sections, masks — where a row of options with an "Add" at the end reads
   better than the browser-style tabs those lists use today. Consumers arrive in
   Phase 6c.
   ============================================================================= */

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: 32px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  border: 0;
  background-color: var(--surface-field);
  color: var(--text-primary);
  font-family: inherit;
  font-size: var(--text-meta);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--motion-ease);
}

.chip:hover:not(:disabled) {
  background-color: var(--border-color);
}

.chip:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

.chip[aria-pressed="true"] {
  background-color: var(--accent-color);
  color: var(--on-accent);
}

.chip-sm {
  height: 28px;
  font-size: var(--text-caption);
}

.chip:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

/* =============================================================================
   SEGMENTED CONTROL (.seg)
   Mutually exclusive view switch from the design audit, for places where one
   canvas can show several things (Processing's Frames / Space-time / Spectrum,
   calibration's Corrected / Heatmap). Deliberately distinct from .chip: a
   segment is a view the canvas adopts, a chip is an object the user selects.
   Consumers arrive in Phase 6d and 6e.
   ============================================================================= */

.seg {
  display: inline-flex;
  /* 3px is the track inset that centres a 28px segment in a 34px track, not a
     spacing-scale value — hence the literal. */
  padding: 3px;
  border-radius: var(--radius-full);
  background-color: var(--surface-field);
}

.seg button {
  height: 28px;
  padding: 0 var(--space-3);
  border: 0;
  border-radius: var(--radius-full);
  background-color: transparent;
  color: var(--text-subdued);
  font-family: inherit;
  font-size: var(--text-meta);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--motion-ease),
    color var(--motion-fast) var(--motion-ease);
}

.seg button:hover:not(:disabled):not([aria-pressed="true"]) {
  color: var(--text-primary);
}

.seg button:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

.seg button[aria-pressed="true"] {
  background-color: var(--accent-color);
  color: var(--on-accent);
}

.seg button:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

/* =============================================================================
   FORM INPUTS
   ============================================================================= */
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/helpers/chipSegPrimitives.test.ts`
Expected: PASS

- [ ] **Step 5: Run the full suite, typecheck and lint**

Run: `npx jest`, `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`, `npm run lint`
Expected: all tests pass; `tsc` error count and lint problem count match (or improve on) Task 1's counts.

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/helpers/chipSegPrimitives.test.ts
git commit -m "$(cat <<'EOF'
Add the chip and segmented-control primitives

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Deferred (not in this plan)

- **`--wash-1` is deliberately not declared**, although the spec's §4 lists it alongside `--wash-2`. Checking the audit's own source: `--wash-1` appears only in the audit *document's* `.hero` rule (its own page header), never in any RIVeR screen mockup. Both of the audit's RIVeR gradients — Home's radial bloom and the Results panel's linear wash — ramp from `--wash-2` to `--panel`. Declaring a token with no consumer is exactly the mistake Phase 6 exists to stop repeating, so only `--wash-2` ships. If 6f finds it needs a second stop, it adds `--wash-1` there with a real consumer in the same commit.
- **No consumers of any kind**, per the plan's Global Constraints. `.chip`, `.seg`, `--text-*` and `--wash-2` are unreferenced when this plan ends; 6b-6g adopt them. A reviewer should read that as intended, not as an incomplete migration.
- **The `.chip` vs `.seg` distinction is a design decision worth preserving**: a chip is an object the user selects (which mask? which cross section?), a segment is a view the canvas adopts (show me frames / space-time / spectra). They look similar and are deliberately separate components; 6c-6e should not substitute one for the other.
- The three-theme Electron walkthrough is **not** owed for this plan specifically, because nothing it adds renders anywhere yet. It is owed for 6c-6g, and the sub-plan that first consumes `--wash-2` (6f) should check the bloom in all three themes, since that is a new colour value rather than an alias.
