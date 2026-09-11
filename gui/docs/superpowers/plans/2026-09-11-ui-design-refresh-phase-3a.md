# UI Design Refresh — Phase 3a (buttons, field rows, technique colour fix + markers) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the new `.btn`/`.ibtn`/`.field-row` component classes from the design audit, migrate the wizard's Next/Back buttons to them, fix the "active technique turns white" bug in three places, and give each technique's chart markers and legend swatches their own shape (LSPIV circle, STIV square, iWave triangle) — without building the full shared `TechniqueRow` component or the `Pin` component, which are separate sub-phases (3b, 3c).

**Architecture:** New, additive CSS in `src/index.css` (`.btn` family) consumed by exactly one component (`WizzardButtons.tsx`, the only migration this sub-phase does — every other `.button-1`/`.wizard-button`/`.danger-button` call site is untouched until Phase 5). `.field-row`/`.field` are added the same way Phase 2 added its alias tokens: declared and tested, with no consumer yet. The technique-colour bug fix touches four small, independent call sites (`TechniqueLegend.tsx`, `graphs.css`, `form.css`, `velocitySvg.ts`, `AllInOne.tsx`) that all share the same `isActive ? 'var(--primary-text-color)' : <technique colour>` pattern; each is replaced with "always the technique's own colour, plus a background/weight cue for active," now that Phase 2's `--surface-raised` alias token exists to draw from. Marker shapes are driven by one new pure constant (`TECHNIQUE_MARKER_SHAPE`) consumed by a CSS class per shape (legend/processing swatches) and by branching SVG element type in the D3 chart (`velocitySvg.ts`).

**Tech Stack:** Same as Phases 1-2 — React 18 + TypeScript, plain CSS with `[data-theme]` custom properties plus the theme-invariant scale tokens Phase 2 added, D3 7 for the Results charts (no chart library), Jest 29 (`testEnvironment: "node"`, no DOM — every test in this codebase parses source/CSS text or calls pure functions, never renders a component).

**Spec:** RIVeR Design Audit artifact — https://claude.ai/code/artifact/02bcbe1c-e016-4d2e-9b66-d1bc80f31dcb (sections *Components* → "Buttons" and "Field rows", *Direction* → "Techniques are shown by colour and shape", and *Rollout* → "3 · Buttons, fields, techniques": *"Add `.btn-primary/secondary/tertiary`, `.ibtn` and `.field-row`. Make Next primary in `WizzardButtons.tsx`. […] Switch charts to the chosen technique palette and markers, and stop the active technique turning white."*). Scope decisions made with the product owner on 2026-09-11: button migration is `WizzardButtons.tsx` only this sub-phase (every other call site moves screen-by-screen in Phase 5); the shared `TechniqueRow` component and the `Pin` component are separate sub-phases (3b, 3c), not built here.

## Global Constraints

- Base branch for this plan is `ui/design-refresh` itself (Phase 2's tip `795c117`). Never commit to `river-labs`/`main`.
- **No new component files, no JSX restructuring beyond inline `style`/`className` tweaks named in this plan.** Do not touch `.button-1`/`.wizard-button`/`.danger-button` anywhere except `WizzardButtons.tsx`. Do not build `TechniqueRow` or `Pin` — those are Phases 3b/3c.
- Every new CSS custom property (none in this plan — it only adds classes) would need all three `[data-theme]` blocks; since this plan adds classes, not tokens, it only needs to consume tokens that already exist from Phases 1-2 (`--accent-color`, `--on-accent`, `--primary-text-color`, `--secondary-text-color`, `--input-background`, `--surface-raised`, `--radius-*`, `--space-*`, `--motion-*`).
- New button/field classes must use `var(--radius-full)` / `var(--radius-md)`, `var(--space-*)` and `var(--motion-*)` from Phase 2's scale-token block — no new hard-coded pixel values for radius, gap or transition duration where a scale token already covers it.
- The technique-colour bug fix must not change *which* colour identifies a technique (still `--tech-lspiv/stiv/iwave`) — only remove the branch that swaps it for `--primary-text-color` when active. Active state must still be visually distinguishable, via row background (`--surface-raised`) and bold text/thicker stroke — never by recolouring.
- Marker shapes are fixed: LSPIV = circle, STIV = square, iWave = triangle (apex up), matching the design audit's `.mk` classes and RIVeR's Results table markers. Do not change technique→colour mapping.
- Commits: short imperative message. No `Co-Authored-By` line, no trailers or signatures of any kind. Author email must be `antoine.patalano@gmail.com`.
- Baseline on this plan's base commit (`795c117`, tip of Phase 2 on `ui/design-refresh`): `npx jest` → 27 suites, 357 tests, all passing; `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"` → 64 (pre-existing, unrelated to this work); `npm run lint` → 25 problems (22 errors, 3 warnings). None of these may get worse. **Run project-wide `npm run lint` (not just the files a task touches) after every task.**
- All paths below are relative to `gui/` unless prefixed with `/`.

---

## File map

| File | Responsibility in this phase |
|---|---|
| `src/index.css` | New `.btn`/`.btn-primary/secondary/tertiary`/`.btn-sm/lg/block`/`.ibtn` block (end of the existing BUTTONS section); new `.field-row`/`.field` block (end of the existing FORM INPUTS section) |
| `src/helpers/buttonAndFieldTokens.test.ts` (create) | Parses `index.css` text for the new button/field classes and their token usage |
| `src/components/WizzardButtons.tsx` | Next → `btn btn-primary`, Back → `btn btn-tertiary` |
| `src/components/Graphs/TechniqueLegend.tsx` | Drop the `isActive` colour branch on the swatch; add `technique-row-active`/`technique-swatch-<key>` classes; move the active name's colour to an inline style |
| `src/components/Graphs/graphs.css` | `.technique-name-active` stops setting `color`; new `.technique-row-active` background rule; new `.technique-swatch-lspiv/stiv/iwave` shape rules |
| `src/components/Forms/FormProcessing.tsx` | Add `technique-swatch-<key>` classes to the three preview-mode swatches; move each active row's `field-title` colour to an inline style |
| `src/components/Forms/form.css` | `.technique-row-processing-active .field-title` stops setting `color`, gains `font-weight`; new `.technique-row-processing-active` background rule |
| `src/helpers/techniqueMarkers.ts` (create) | `TECHNIQUE_MARKER_SHAPE: Record<Technique, 'circle' \| 'square' \| 'triangle'>` |
| `src/helpers/techniqueMarkers.test.ts` (create) | Tests the constant and (via source-text scan) that `velocitySvg.ts` branches on it |
| `src/components/Graphs/velocitySvg.ts` | Fix the active-colour bug; branch marker rendering on `TECHNIQUE_MARKER_SHAPE` (circle/rect/polygon) |
| `src/components/Graphs/AllInOne.tsx` | Fix the tooltip dot's active-colour bug |
| `src/helpers/techniqueActiveColor.test.ts` (create) | Regression test: none of the five files above ever recolours the active technique to `--primary-text-color` |

---

### Task 1: `.btn` button component classes

**Files:**
- Create: `src/helpers/buttonAndFieldTokens.test.ts`
- Modify: `src/index.css` (insert immediately before the `FORM INPUTS` section header, i.e. right after the `.button-with-loader:disabled` rule)

**Interfaces:**
- Produces: CSS classes `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-tertiary`, `.btn-sm`, `.btn-lg`, `.btn-block`, `.ibtn`. Consumed by Task 2 (`WizzardButtons.tsx`) and, in later phases, other screens.
- Consumes: `--accent-color`, `--on-accent`, `--primary-text-color`, `--secondary-text-color`, `--input-background` (existing tokens); `--radius-full`, `--space-2/3/4/5/6`, `--motion-fast` (Phase 2 scale tokens, unconsumed until now).

- [ ] **Step 0: Confirm the baseline and commit this plan document**

```bash
cd /Users/antoine/river_compil/.worktrees/ui-design-refresh
git status                                                        # clean, on ui/design-refresh
cd gui
npx jest 2>&1 | tail -5                                          # 27 suites, 357 tests passed
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"      # 64
npm run lint 2>&1 | tail -3                                      # 25 problems (22 errors, 3 warnings)
git add docs/superpowers/plans/2026-09-11-ui-design-refresh-phase-3a.md
git commit -m "Add Phase 3a plan doc (buttons, field rows, technique colour fix + markers)"
```

If any baseline number differs, re-run all three after investigating why, and use the new numbers as this plan's baseline.

- [ ] **Step 1: Write the failing test**

Create `src/helpers/buttonAndFieldTokens.test.ts`:

```ts
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

  it('disabled buttons dim instead of changing shape', () => {
    expect(ruleBody('.btn:disabled')).toMatch(/opacity:\s*0\.38/);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest src/helpers/buttonAndFieldTokens.test.ts`
Expected: FAIL — none of these classes exist yet in `index.css`.

- [ ] **Step 3: Add the CSS**

In `src/index.css`, immediately before the `FORM INPUTS` section comment (i.e. right after `.button-with-loader:disabled { ... }`'s closing brace), insert:

```css
/* =============================================================================
   BUTTON COMPONENT (.btn family)
   New pill-shaped buttons from the design audit. Coexists with
   .button-1/.wizard-button/.danger-button — those keep working and are
   migrated screen by screen starting with WizzardButtons.tsx (Task 2); the
   rest move in Phase 5.
   ============================================================================= */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 40px;
  padding: 0 var(--space-5);
  border-radius: var(--radius-full);
  border: 0;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
  cursor: pointer;
  transition:
    transform var(--motion-fast) var(--motion-ease),
    background-color var(--motion-fast) var(--motion-ease),
    box-shadow var(--motion-fast) var(--motion-ease),
    color var(--motion-fast) var(--motion-ease);
}

.btn:hover:not(:disabled) {
  transform: scale(1.04);
}

.btn:active:not(:disabled) {
  transform: scale(0.98);
}

.btn:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

.btn-primary {
  background-color: var(--accent-color);
  color: var(--on-accent);
}

.btn-secondary {
  background-color: transparent;
  color: var(--primary-text-color);
  box-shadow: inset 0 0 0 1px var(--secondary-text-color);
}

.btn-secondary:hover:not(:disabled) {
  box-shadow: inset 0 0 0 1px var(--primary-text-color);
}

.btn-tertiary {
  background-color: transparent;
  color: var(--secondary-text-color);
  padding: 0 var(--space-3);
}

.btn-tertiary:hover:not(:disabled) {
  color: var(--primary-text-color);
}

.btn-lg {
  height: 48px;
  padding: 0 var(--space-6);
  font-size: 16px;
}

.btn-sm {
  height: 32px;
  padding: 0 var(--space-4);
  font-size: 13px;
}

.btn-block {
  width: 100%;
}

.btn:disabled {
  opacity: 0.38;
  transform: none;
  cursor: not-allowed;
}

.ibtn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 0;
  background: transparent;
  color: var(--secondary-text-color);
  display: inline-grid;
  place-items: center;
  flex: none;
  cursor: pointer;
  transition:
    color var(--motion-fast) var(--motion-ease),
    background-color var(--motion-fast) var(--motion-ease);
}

.ibtn:hover:not(:disabled) {
  color: var(--primary-text-color);
  background-color: var(--input-background);
}

.ibtn:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

.ibtn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx jest src/helpers/buttonAndFieldTokens.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Type check, lint, full suite**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64
npm run lint 2>&1 | tail -3                                    # still 25 problems
npx jest 2>&1 | tail -4                                        # 28 suites passed
```

- [ ] **Step 6: Commit**

```bash
git add src/helpers/buttonAndFieldTokens.test.ts src/index.css
git commit -m "Add .btn/.ibtn button component classes"
```

---

### Task 2: Migrate WizzardButtons.tsx to `.btn`

**Files:**
- Modify: `src/components/WizzardButtons.tsx:49-70`

**Interfaces:**
- Consumes: `.btn`, `.btn-primary`, `.btn-tertiary` from Task 1.
- Produces: nothing new. `id="wizard-next"` is unchanged — `FormCrossSections.tsx:123` calls `document.getElementById('wizard-next')?.focus()`, which works on any element regardless of class.

Background: this is the phase's only button migration (per the audit's *Buttons* component sheet: `<button class="btn btn-primary">Next</button> … <button class="btn btn-tertiary">Back</button>`). `.wizard-container` already lays the two buttons out with `justify-content: space-between` and no fixed-width assumption, so swapping `.wizard-button.button-1` (a fixed 232×50px bordered rectangle) for the new pill classes needs no layout change.

- [ ] **Step 1: Update the two buttons**

In `src/components/WizzardButtons.tsx`, replace

```tsx
      <button
        className="wizard-button button-1"
        onClick={handlePreviuos}
        disabled={isFirstStep || isBackendWorking}
      >
        {t('Wizard.back')}
      </button>

      <button
        className="wizard-button button-1"
        disabled={!canFollow || isBackendWorking}
        form={formId}
        onClick={onClickNext}
        type={button ? 'button' : 'submit'}
        id="wizard-next"
      >
        {isLastStep ? t('Wizard.save') : t('Wizard.next')}
      </button>
```

with

```tsx
      <button className="btn btn-tertiary" onClick={handlePreviuos} disabled={isFirstStep || isBackendWorking}>
        {t('Wizard.back')}
      </button>

      <button
        className="btn btn-primary"
        disabled={!canFollow || isBackendWorking}
        form={formId}
        onClick={onClickNext}
        type={button ? 'button' : 'submit'}
        id="wizard-next"
      >
        {isLastStep ? t('Wizard.save') : t('Wizard.next')}
      </button>
```

- [ ] **Step 2: Type check, lint, full suite**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64
npx eslint src/components/WizzardButtons.tsx                  # no output
npx jest 2>&1 | tail -4                                        # 28 suites passed
```

- [ ] **Step 3: Check in the app (all three themes)**

Run `npm run dev`, open any project, step through the wizard (Home → Calibration → …):
1. **Back** shows as plain text with no border, aligned left; **Next**/**Save** shows as a filled pill on the right, matching the accent colour.
2. On the first step, Back is disabled (dimmed to ~38% opacity, not clickable). On the last step, the button reads "Save".
3. Pressing Tab reaches both buttons with a visible accent focus ring.
4. Repeat in Light and Dracula from the Home screen theme menu — Next's text stays readable against the accent fill in all three (this is `--on-accent` from Phase 1, already contrast-checked).
5. In `FormCrossSections`, whatever action calls `document.getElementById('wizard-next')?.focus()` still moves focus to Next (its focus ring appears).

- [ ] **Step 4: Commit**

```bash
git add src/components/WizzardButtons.tsx
git commit -m "Make wizard Next/Back use the new .btn classes"
```

---

### Task 3: `.field-row` / `.field` component classes

**Files:**
- Modify: `src/helpers/buttonAndFieldTokens.test.ts` (add a `describe` block)
- Modify: `src/index.css` (insert immediately before the `TOGGLE SWITCH` section header, i.e. right after the keyboard-focus-visible rule for the input classes)

**Interfaces:**
- Produces: CSS classes `.field-row`, `.field`, `.field.focus` / `.field:focus-within`. Not consumed by any component in this sub-phase — added the same way Phase 2 added alias tokens ahead of their first consumer, per the audit's *Field rows* component sheet. A later phase migrates `.read-only` label pills and the α/stations pattern onto it.

- [ ] **Step 1: Write the failing test**

Append to `src/helpers/buttonAndFieldTokens.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest src/helpers/buttonAndFieldTokens.test.ts`
Expected: FAIL — the three new tests fail (`ruleBody` returns `''`), the six from Task 1 still pass.

- [ ] **Step 3: Add the CSS**

In `src/index.css`, immediately before the `TOGGLE SWITCH` section comment (i.e. right after the `.input-field-little-read-only:focus-visible` keyboard-focus rule's closing brace), insert:

```css
/* =============================================================================
   FIELD ROW (.field-row / .field)
   Label + value + optional trailing icon button, from the design audit's
   Field rows component sheet. Not consumed yet — existing .read-only label
   pills and .input-field-* inputs keep their current classes until a later
   phase migrates each screen onto this.
   ============================================================================= */

.field-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 128px 32px;
  gap: var(--space-2);
  align-items: center;
  min-height: 40px;
}

.field-row > span:first-child {
  color: var(--secondary-text-color);
  font-size: 14px;
}

.field {
  height: 36px;
  border-radius: var(--radius-md);
  background-color: var(--input-background);
  border: none;
  color: var(--primary-text-color);
  font-size: 14px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  text-align: right;
  padding: 0 var(--space-3);
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
}

.field em {
  font-style: normal;
  font-weight: 400;
  color: var(--secondary-text-color);
}

.field.focus,
.field:focus-within {
  box-shadow: 0 0 0 2px var(--accent-color);
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx jest src/helpers/buttonAndFieldTokens.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Type check, lint, full suite**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64
npm run lint 2>&1 | tail -3                                    # still 25 problems
npx jest 2>&1 | tail -4                                        # 28 suites passed
```

- [ ] **Step 6: Commit**

```bash
git add src/helpers/buttonAndFieldTokens.test.ts src/index.css
git commit -m "Add .field-row/.field component classes"
```

---

### Task 4: Stop the active technique turning white

**Files:**
- Create: `src/helpers/techniqueActiveColor.test.ts`
- Modify: `src/components/Graphs/TechniqueLegend.tsx:49-58`
- Modify: `src/components/Graphs/graphs.css` (`.technique-row`/`.technique-name-active` rules, ~135-180)
- Modify: `src/components/Forms/FormProcessing.tsx:194-258`
- Modify: `src/components/Forms/form.css` (`.technique-row-processing` rules, ~702-728)
- Modify: `src/components/Graphs/velocitySvg.ts:181`
- Modify: `src/components/Graphs/AllInOne.tsx:241`

**Interfaces:**
- Consumes: `--surface-raised` (Phase 2 alias token, its first consumer).
- Produces: nothing new. Fixes the design audit finding *"Pins are defined twice…"* 's sibling bug (active technique recolours to white/`--primary-text-color` instead of keeping its identity colour) in every place it appears.

Background: five call sites share the same `isActive ? 'var(--primary-text-color)' : <technique colour>` (or CSS-only equivalent) pattern. Per the audit's *Direction* principle *"Techniques are shown by colour and shape … its colour never changes"*, active state must be shown by weight and background instead.

- [ ] **Step 1: Write the failing test**

Create `src/helpers/techniqueActiveColor.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A technique's identity colour (--tech-lspiv/stiv/iwave) must never be
 * swapped for --primary-text-color when that technique is active — that's
 * "the active technique turns white" bug the design audit's Rollout phase 3
 * calls out. Active state is shown by weight/background instead.
 */
const read = (...parts: string[]): string => readFileSync(join(__dirname, '..', ...parts), 'utf8');

describe('active technique keeps its own colour (no white-on-active regression)', () => {
  it('TechniqueLegend.tsx does not swap the swatch colour for --primary-text-color when active', () => {
    const source = read('components', 'Graphs', 'TechniqueLegend.tsx');
    expect(source).not.toMatch(/isActive\s*\?\s*'var\(--primary-text-color\)'/);
  });

  it('velocitySvg.ts does not swap the line/marker colour for --primary-text-color when active', () => {
    const source = read('components', 'Graphs', 'velocitySvg.ts');
    expect(source).not.toMatch(/isActive\s*\?\s*'var\(--primary-text-color\)'/);
  });

  it('AllInOne.tsx does not swap the tooltip dot colour for --primary-text-color when active', () => {
    const source = read('components', 'Graphs', 'AllInOne.tsx');
    expect(source).not.toMatch(/isActive\s*\?\s*'var\(--primary-text-color\)'/);
  });

  it('graphs.css does not recolour the active technique name to --primary-text-color', () => {
    const css = read('components', 'Graphs', 'graphs.css');
    expect(css).not.toMatch(/\.technique-name-active\s*\{[^}]*color:\s*var\(--primary-text-color\)/);
  });

  it('form.css does not recolour the active processing row label to --primary-text-color', () => {
    const css = read('components', 'Forms', 'form.css');
    expect(css).not.toMatch(/\.technique-row-processing-active \.field-title\s*\{[^}]*color:\s*var\(--primary-text-color\)/);
  });

  it('graphs.css and form.css give the active row a background instead', () => {
    expect(read('components', 'Graphs', 'graphs.css')).toMatch(/\.technique-row-active\s*\{[^}]*background-color:\s*var\(--surface-raised\)/);
    expect(read('components', 'Forms', 'form.css')).toMatch(/\.technique-row-processing-active\s*\{[^}]*background-color:\s*var\(--surface-raised\)/);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest src/helpers/techniqueActiveColor.test.ts`
Expected: FAIL in 5 of the 6 tests (all except the source-text ones for `AllInOne.tsx`/`velocitySvg.ts`/`TechniqueLegend.tsx`, which currently do match the buggy pattern and so correctly fail the `not.toMatch`).

- [ ] **Step 3: Fix `TechniqueLegend.tsx`**

Replace

```tsx
        const isActive = key === section.activeTechnique;
        const visible = isVisible(key);
        const color = isActive ? 'var(--primary-text-color)' : `var(--tech-${key})`;

        return (
          <div key={key} className={`technique-row${visible ? '' : ' technique-row-hidden'}`}>
            <span className="technique-swatch" style={{ background: color }} />
            <button
              type="button"
              className={`technique-name${isActive ? ' technique-name-active' : ''}`}
              aria-pressed={isActive}
              onClick={() => handleActivate(key)}
              title={
                isActive ? t('Results.activeTechnique') : t('Results.activateTechnique', { technique: label })
              }
            >
              {label}
            </button>
```

with

```tsx
        const isActive = key === section.activeTechnique;
        const visible = isVisible(key);
        const color = `var(--tech-${key})`;

        return (
          <div
            key={key}
            className={`technique-row${visible ? '' : ' technique-row-hidden'}${isActive ? ' technique-row-active' : ''}`}
          >
            <span className={`technique-swatch technique-swatch-${key}`} style={{ background: color }} />
            <button
              type="button"
              className={`technique-name${isActive ? ' technique-name-active' : ''}`}
              aria-pressed={isActive}
              onClick={() => handleActivate(key)}
              style={isActive ? { color } : undefined}
              title={
                isActive ? t('Results.activeTechnique') : t('Results.activateTechnique', { technique: label })
              }
            >
              {label}
            </button>
```

- [ ] **Step 4: Fix `graphs.css`**

Replace

```css
.technique-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 9px;
    transition: background-color 0.14s ease;
}

.technique-row:hover {
    background-color: var(--on-hover);
}

.technique-row-hidden {
    opacity: 0.4;
}

.technique-swatch {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
}
```

with

```css
.technique-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 9px;
    transition: background-color 0.14s ease;
}

.technique-row:hover {
    background-color: var(--on-hover);
}

/* Active row keeps its own technique colour (set inline in TechniqueLegend.tsx
   via the swatch's and button's style) and gains a background instead of
   recolouring the text to --primary-text-color. */
.technique-row-active {
    background-color: var(--surface-raised);
}

.technique-row-hidden {
    opacity: 0.4;
}

.technique-swatch {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
}

/* Compound with .technique-swatch (not a bare class) so this always wins
   over .technique-swatch's own border-radius:50% regardless of CSS file
   load order — a bare .technique-swatch-stiv would tie in specificity with
   .technique-swatch and could lose the cascade unpredictably. Mirrored in
   Forms/form.css for .technique-swatch-processing. */
.technique-swatch.technique-swatch-lspiv {
    border-radius: 50%;
}

.technique-swatch.technique-swatch-stiv {
    border-radius: 2px;
}

.technique-swatch.technique-swatch-iwave {
    border-radius: 0;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
}
```

Then replace

```css
.technique-name-active {
    color: var(--primary-text-color);
}
```

with

```css
.technique-name-active {
    font-weight: 700;
}
```

- [ ] **Step 5: Fix `FormProcessing.tsx`**

Replace

```tsx
              <span className="technique-swatch-processing" style={{ background: 'var(--tech-lspiv)' }} />
              <h3 className="field-title">LSPIV</h3>
```

with

```tsx
              <span className="technique-swatch-processing technique-swatch-lspiv" style={{ background: 'var(--tech-lspiv)' }} />
              <h3 className="field-title" style={previewMode === 'frames' ? { color: 'var(--tech-lspiv)' } : undefined}>
                LSPIV
              </h3>
```

Replace

```tsx
              <span className="technique-swatch-processing" style={{ background: 'var(--tech-stiv)' }} />
              <h3 className="field-title">STIV</h3>
```

with

```tsx
              <span className="technique-swatch-processing technique-swatch-stiv" style={{ background: 'var(--tech-stiv)' }} />
              <h3 className="field-title" style={previewMode === 'sti' ? { color: 'var(--tech-stiv)' } : undefined}>
                STIV
              </h3>
```

Replace

```tsx
              <span className="technique-swatch-processing" style={{ background: 'var(--tech-iwave)' }} />
              <h3 className="field-title">
                iWave
              </h3>
```

with

```tsx
              <span className="technique-swatch-processing technique-swatch-iwave" style={{ background: 'var(--tech-iwave)' }} />
              <h3 className="field-title" style={previewMode === 'iwave' ? { color: 'var(--tech-iwave)' } : undefined}>
                iWave
              </h3>
```

- [ ] **Step 6: Fix `form.css`**

Replace

```css
.technique-row-processing .field-title {
    flex: 1;
    color: var(--secondary-text-color);
}

.technique-row-processing-active .field-title {
    color: var(--primary-text-color);
}
```

with

```css
.technique-row-processing .field-title {
    flex: 1;
    color: var(--secondary-text-color);
}

/* Active row keeps its own technique colour (set inline in FormProcessing.tsx)
   and gains a background plus bold text instead of recolouring to
   --primary-text-color — matches .technique-row-active in Graphs/graphs.css. */
.technique-row-processing-active {
    background-color: var(--surface-raised);
}

.technique-row-processing-active .field-title {
    font-weight: 700;
}
```

Then replace

```css
.technique-swatch-processing {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
}
```

with

```css
.technique-swatch-processing {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
}

/* Compound with .technique-swatch-processing (not a bare class) so this
   always wins over its own border-radius:50% regardless of CSS file load
   order. Mirrors .technique-swatch.technique-swatch-lspiv/stiv/iwave in
   Graphs/graphs.css — same shapes, same class names, different base class. */
.technique-swatch-processing.technique-swatch-lspiv {
    border-radius: 50%;
}

.technique-swatch-processing.technique-swatch-stiv {
    border-radius: 2px;
}

.technique-swatch-processing.technique-swatch-iwave {
    border-radius: 0;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
}
```

- [ ] **Step 7: Fix `velocitySvg.ts`**

Replace

```ts
    const isActive = s.isActive;
    const strokeColor = isActive ? 'var(--primary-text-color)' : s.color;
    const baseOpacity = isActive ? 1 : 0.55;
```

with

```ts
    const isActive = s.isActive;
    const strokeColor = s.color;
    const baseOpacity = isActive ? 1 : 0.55;
```

- [ ] **Step 8: Fix `AllInOne.tsx`**

Replace

```tsx
              const dotColor = s.isActive ? 'var(--primary-text-color)' : s.color;
```

with

```tsx
              const dotColor = s.color;
```

- [ ] **Step 9: Run the test and confirm it passes**

Run: `npx jest src/helpers/techniqueActiveColor.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 10: Type check, lint, full suite**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64
npx eslint src/components/Graphs/TechniqueLegend.tsx src/components/Graphs/velocitySvg.ts src/components/Graphs/AllInOne.tsx src/components/Forms/FormProcessing.tsx   # no output
npx jest 2>&1 | tail -4                                        # 29 suites passed
```

- [ ] **Step 11: Check in the app (Results and Processing, all three themes)**

1. **Results**, a project with LSPIV + STIV + iWave data: the active technique's name, swatch and chart line/markers keep their own colour (blue/orange/green in dark) at every moment — clicking another technique's name moves the "active" look (background + bold name) without ever showing white/grey text.
2. **Processing**: click each of the three preview-mode rows (LSPIV/STIV/iWave) in turn — the active row's label takes on that row's own technique colour and the row gets a subtle background, instead of turning plain white.
3. Repeat in Light and Dracula — `--surface-raised` gives a visibly different background from the page in all three (it aliases `--card-surface`).

- [ ] **Step 12: Commit**

```bash
git add src/helpers/techniqueActiveColor.test.ts src/components/Graphs/TechniqueLegend.tsx src/components/Graphs/graphs.css src/components/Forms/FormProcessing.tsx src/components/Forms/form.css src/components/Graphs/velocitySvg.ts src/components/Graphs/AllInOne.tsx
git commit -m "Stop the active technique recolouring to white; use a background instead"
```

---

### Task 5: Technique marker shapes (circle / square / triangle)

**Files:**
- Create: `src/helpers/techniqueMarkers.ts`
- Create: `src/helpers/techniqueMarkers.test.ts`
- Modify: `src/components/Graphs/velocitySvg.ts:224-255` (the marker-drawing block, already touched by Task 4's Step 7 one line above it)

**Interfaces:**
- Produces: `TECHNIQUE_MARKER_SHAPE: Record<Technique, 'circle' | 'square' | 'triangle'>`. Consumed by `velocitySvg.ts` in this task; the swatch shape classes it pairs with (`.technique-swatch-lspiv/stiv/iwave`) were already added to `graphs.css`/`form.css` in Task 4, Steps 4-5.
- Consumes: `Technique` from `../store/section/types`.

Background: every technique's chart marker is currently a plain circle, differentiated only by colour. The design audit's *Direction* section requires colour **and** shape (`.mk.lspiv` circle, `.mk.stiv` square, `.mk.iwave` triangle) so the chart reads correctly for colour-blind users. `velocitySvg.ts` already computes per-point radius/fill/stroke/stroke-width (quality shading for iWave, the hollow-ring look for an untuned STIV station) — this task keeps that logic and only changes which SVG element type renders it.

- [ ] **Step 1: Write the failing test**

Create `src/helpers/techniqueMarkers.ts` as an empty-ish stub first is not needed — write the test against the real interface directly:

Create `src/helpers/techniqueMarkers.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { TECHNIQUE_MARKER_SHAPE } from './techniqueMarkers';

describe('technique marker shapes', () => {
  it('assigns one shape per technique, matching the legend/processing swatch classes', () => {
    expect(TECHNIQUE_MARKER_SHAPE).toEqual({
      lspiv: 'circle',
      stiv: 'square',
      iwave: 'triangle',
    });
  });

  it('velocitySvg.ts branches its marker element on TECHNIQUE_MARKER_SHAPE', () => {
    const source = readFileSync(join(__dirname, '..', 'components', 'Graphs', 'velocitySvg.ts'), 'utf8');
    expect(source).toMatch(/TECHNIQUE_MARKER_SHAPE/);
    expect(source).toMatch(/append\('rect'\)/);
    expect(source).toMatch(/append\('polygon'\)/);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest src/helpers/techniqueMarkers.test.ts`
Expected: FAIL — `techniqueMarkers.ts` doesn't exist yet, so this fails with a module-not-found error.

- [ ] **Step 3: Write `techniqueMarkers.ts`**

Create `src/helpers/techniqueMarkers.ts`:

```ts
import { Technique } from '../store/section/types';

/**
 * One marker shape per technique — LSPIV a circle, STIV a square, iWave a
 * triangle — matching the swatch classes in graphs.css/form.css
 * (.technique-swatch-lspiv/stiv/iwave). Colour alone doesn't distinguish
 * techniques for colour-blind users, so every technique also gets its own
 * shape, in the legend, the swatches and the chart markers.
 */
export const TECHNIQUE_MARKER_SHAPE: Record<Technique, 'circle' | 'square' | 'triangle'> = {
  lspiv: 'circle',
  stiv: 'square',
  iwave: 'triangle',
};
```

- [ ] **Step 4: Run the test and confirm the first assertion passes, the second still fails**

Run: `npx jest src/helpers/techniqueMarkers.test.ts`
Expected: first test PASSES, second (`velocitySvg.ts branches …`) still FAILS.

- [ ] **Step 5: Update the marker-drawing block in `velocitySvg.ts`**

Add the import at the top of the file, alongside the existing imports:

```ts
import { TECHNIQUE_MARKER_SHAPE } from '../../helpers/techniqueMarkers';
```

Replace

```ts
    const showQuality = s.key === 'iwave' && s.showQuality && qualityColorScale && qualityRadiusScale;

    // STIV only: an automatic (untuned, non-estimated) station renders as an open
    // ring rather than the solid dot every other point uses, so a hand-tuned
    // station — which keeps the solid fill — reads as visibly different at a
    // glance rather than only on hover.
    const isStivHollow = (d: VelocitySeriesPoint) => s.key === 'stiv' && !d.interp && !d.tuned;

    svg
      .selectAll(`.marker-${s.key}`)
      .data(s.points.filter((p) => p.v !== null))
      .enter()
      .append('circle')
      .attr('class', `marker-${s.key}`)
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale((d.v as number) * velocityFactor))
      .attr('r', (d) => (showQuality && d.quality !== null ? qualityRadiusScale!(d.quality) : isActive ? 3 : 2.2))
      .attr('fill', (d) =>
        d.interp
          ? 'var(--accent-color)'
          : showQuality && d.quality !== null
            ? qualityColorScale!(d.quality)
            : isStivHollow(d)
              ? 'var(--background-color)'
              : strokeColor
      )
      .attr('stroke', (d) =>
        showQuality && d.quality !== null ? 'var(--background-color)' : isStivHollow(d) ? strokeColor : 'none'
      )
      .attr('stroke-width', (d) => (showQuality && d.quality !== null ? 0.75 : isStivHollow(d) ? 1.5 : 0))
      .attr('opacity', baseOpacity);
  });
```

with

```ts
    const showQuality = s.key === 'iwave' && s.showQuality && qualityColorScale && qualityRadiusScale;

    // STIV only: an automatic (untuned, non-estimated) station renders as an open
    // ring rather than the solid dot every other point uses, so a hand-tuned
    // station — which keeps the solid fill — reads as visibly different at a
    // glance rather than only on hover.
    const isStivHollow = (d: VelocitySeriesPoint) => s.key === 'stiv' && !d.interp && !d.tuned;

    const markerRadius = (d: VelocitySeriesPoint): number =>
      showQuality && d.quality !== null ? qualityRadiusScale!(d.quality) : isActive ? 3 : 2.2;
    const markerFill = (d: VelocitySeriesPoint): string =>
      d.interp
        ? 'var(--accent-color)'
        : showQuality && d.quality !== null
          ? qualityColorScale!(d.quality)
          : isStivHollow(d)
            ? 'var(--background-color)'
            : strokeColor;
    const markerStroke = (d: VelocitySeriesPoint): string =>
      showQuality && d.quality !== null ? 'var(--background-color)' : isStivHollow(d) ? strokeColor : 'none';
    const markerStrokeWidth = (d: VelocitySeriesPoint): number =>
      showQuality && d.quality !== null ? 0.75 : isStivHollow(d) ? 1.5 : 0;

    const markerPoints = s.points.filter((p) => p.v !== null);
    const shape = TECHNIQUE_MARKER_SHAPE[s.key];

    // One marker shape per technique (circle/square/triangle), matching the
    // swatch in TechniqueLegend/FormProcessing — colour is never the only signal.
    if (shape === 'square') {
      svg
        .selectAll(`.marker-${s.key}`)
        .data(markerPoints)
        .enter()
        .append('rect')
        .attr('class', `marker-${s.key}`)
        .attr('x', (d) => xScale(d.x) - markerRadius(d))
        .attr('y', (d) => yScale((d.v as number) * velocityFactor) - markerRadius(d))
        .attr('width', (d) => markerRadius(d) * 2)
        .attr('height', (d) => markerRadius(d) * 2)
        .attr('fill', markerFill)
        .attr('stroke', markerStroke)
        .attr('stroke-width', markerStrokeWidth)
        .attr('opacity', baseOpacity);
    } else if (shape === 'triangle') {
      svg
        .selectAll(`.marker-${s.key}`)
        .data(markerPoints)
        .enter()
        .append('polygon')
        .attr('class', `marker-${s.key}`)
        .attr('points', (d) => {
          const cx = xScale(d.x);
          const cy = yScale((d.v as number) * velocityFactor);
          const r = markerRadius(d) * 1.6;
          return `${cx},${cy - r * 0.6} ${cx + r * 0.6},${cy + r * 0.4} ${cx - r * 0.6},${cy + r * 0.4}`;
        })
        .attr('fill', markerFill)
        .attr('stroke', markerStroke)
        .attr('stroke-width', markerStrokeWidth)
        .attr('opacity', baseOpacity);
    } else {
      svg
        .selectAll(`.marker-${s.key}`)
        .data(markerPoints)
        .enter()
        .append('circle')
        .attr('class', `marker-${s.key}`)
        .attr('cx', (d) => xScale(d.x))
        .attr('cy', (d) => yScale((d.v as number) * velocityFactor))
        .attr('r', markerRadius)
        .attr('fill', markerFill)
        .attr('stroke', markerStroke)
        .attr('stroke-width', markerStrokeWidth)
        .attr('opacity', baseOpacity);
    }
  });
```

- [ ] **Step 6: Run the test and confirm it passes**

Run: `npx jest src/helpers/techniqueMarkers.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Type check, lint, full suite**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64
npx eslint src/helpers/techniqueMarkers.ts src/components/Graphs/velocitySvg.ts   # no output
npx jest 2>&1 | tail -4                                        # 30 suites passed
```

- [ ] **Step 8: Check in the app**

**Results**, a project with LSPIV + STIV + iWave data, in each of the three themes:
1. The velocity chart shows LSPIV points as small circles, STIV points as small squares, iWave points as small upward-pointing triangles — same colours as before, new shapes.
2. An untuned STIV station still renders as a hollow (outlined, unfilled) square, and a hand-tuned STIV station as a solid square — the same "hollow vs solid" distinction the circles had, now on squares.
3. Toggling iWave's quality shading on still varies marker size and colour along the quality scale — now on triangles.
4. The legend swatches (Results panel, left of each technique's name) show the same three shapes as their chart markers.
5. On **Processing**, the three technique rows' swatches (left of LSPIV/STIV/iWave) also show circle/square/triangle.

- [ ] **Step 9: Commit**

```bash
git add src/helpers/techniqueMarkers.ts src/helpers/techniqueMarkers.test.ts src/components/Graphs/velocitySvg.ts
git commit -m "Give each technique its own chart marker shape (circle/square/triangle)"
```

---

### Task 6: Final verification

**Files:** none modified.

- [ ] **Step 1: Full automated check**

```bash
npx jest 2>&1 | tail -5                                          # 30 suites, all passing (357 existing + 21 new)
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"      # 64 or fewer
npm run lint 2>&1 | tail -3                                      # 25 problems or fewer
git log --oneline 795c117..HEAD                                  # 6 commits (plan doc + 5 tasks), no Co-Authored-By
git log --format='%ae %B' 795c117..HEAD | grep -ci "co-authored" # 0
```

- [ ] **Step 2: Walk through the app once per theme**

Run `npm run dev`. For **Dark**, then **Light**, then **Dracula** (switch on Home):
1. Wizard: Back/Next look and behave as described in Task 2's manual check.
2. Results (project with LSPIV + STIV + iWave): technique names/swatches/chart lines/markers/tooltip dots all keep their identity colour whichever technique is active; the active row shows a background + bold name instead.
3. Processing: the three technique rows behave the same way for the preview-mode selection.
4. Chart markers read as circle/square/triangle in the Results velocity chart and both legend/processing swatches.

- [ ] **Step 3: Report back**

Summarise for the product owner:
- the 6 commits on `ui/design-refresh`
- test, TypeScript and lint numbers versus the baseline
- anything from the manual walk-through that looked different from the expectations above
- confirmation that `.button-1`/`.wizard-button`/`.danger-button` still work unchanged everywhere except `WizzardButtons.tsx`, and that `.field-row`/`.field` have no consumer yet (expected — a later phase migrates screens onto it)

Do not merge or push. The owner decides when `ui/design-refresh` goes into `river-labs`. Sub-phases 3b (shared `TechniqueRow` component) and 3c (`Pin` + magnifier component) are separate plans, not started here.

---

## Out of scope (later sub-phases/phases, do not start here)

- Migrating `.button-1`/`.wizard-button`/`.danger-button` anywhere outside `WizzardButtons.tsx` → Phase 5 (screen polish), one screen at a time.
- Migrating any `.read-only`/`.input-field-*` pill onto `.field-row`/`.field` → a later phase, once a concrete screen is chosen.
- Building a shared `TechniqueRow` component (visual shell + trailing slot) unifying `TechniqueLegend.tsx` and `FormProcessing.tsx`'s technique rows → Phase 3b.
- Converting the σ/%/Q single-character band-glyph buttons to written-label chips (the audit's *Chips* component sheet) → not named in the Phase 3 rollout text; a later phase.
- The `Pin` component (crosshair, magnifier, drag coordinates) consolidating `pinRed.svg`/`pinGreen.svg`/`pin.svg`/`pinGrey.svg`/`createPinsBase64.ts` → Phase 3c.
- Shaping the `AllInOne.tsx` tooltip's technique dots (currently a plain circle for every technique) — colour-only fix applied in Task 4; shape is a chart-marker concern the rollout text scopes to "charts," which manual check in Task 5 treats as the Results velocity chart, not the tooltip.
- Any change to masks, regions, STIV search lines, the colour bar, or the five message kinds → Phase 4.
