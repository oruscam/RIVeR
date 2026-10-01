# Processing Panel: Advanced Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved Processing panel redesign (each technique owns its settings under its own row, one Analyze/Stop button in a fixed run zone, per-row run status), and roll its seven panel rules out to every other wizard panel's Advanced block.

**Architecture:** Part A builds the panel-row primitives once in `index.css` (reworking the unconsumed `.field-row`/`.field` from Phase 6a, plus a `.switch-sm` size modifier), then rebuilds the Processing form on them: `HardModeProcessing` becomes `LspivSettings`, hung under the LSPIV row; ROI height moves to the top; the run zone sits outside the scrolling body; the run-stage state lifts out of `AnalyzingProgress` into a hook, so the rows can show their own status. Part B moves the coordinate blocks (Oblique, UAV, Cross sections) and the Video panel's Advanced blocks onto the same primitives. The shared `LockBtn` becomes `AdvancedToggle` for every panel at once.

**Tech Stack:** React 18 + TypeScript, react-hook-form, Redux slices via `use*Slice` hooks, react-i18next, plain CSS. Jest with `testEnvironment: "node"` (no DOM): tests are pure-function tests, `renderToStaticMarkup` render tests, source-text assertions and `cssScanner`-based stylesheet assertions.

**Spec:** the approved preview `docs/superpowers/previews/2026-10-01-processing-panel-advanced.html` (approved by the product owner on 2026-10-01, "yes it's good"). There is no prose spec. The preview's `NEW, PROPOSED` CSS block, its three rendered states and their notes are the requirements. Open it in a browser next to this plan: it links the real `src/` stylesheets, so it renders in all three themes.

---

## Decisions to confirm before Task 1

The approval covered the preview as a whole. These points were accepted implicitly or are not settled by the preview. Each has a default that the tasks implement. If the product owner picks differently, the named task step changes.

| # | Decision | Default the tasks implement | Changes if declined |
|---|---|---|---|
| D1 | Value fields get a hairline border in every theme (`color-mix(--text-subdued 22%)`). Measured hairline against panel: dark 2.07, **light 1.42**, dracula 2.55. That is better than light's 1.05 today but not 3:1. Scoped to the new `.field` only, so the app-wide light-field decision A6 (`.input-field`, 31 rules) stays open. | 22%, as approved | Task 1 Step 3 (the `color-mix` %), Task 1 test floors. 45% gives light 2.01, dracula 3.75, dark 3.05. |
| D2 | A compact 36×20 switch for parameter lists, built as a `.switch-sm` size modifier on the existing `.switch`/`.slider` (so hover, focus, disabled and checked states are inherited, not re-written). | Yes | Task 1 |
| D3 | In Advanced mode every technique row gains a 6th grid column for the disclosure chevron, so the ✓ column moves 36px left. | Yes | Task 6 CSS |
| D4 | Copy changes. Readout footer: `iWave · station 2 of 15` and `00:12 left` (today `2 / 15` and `Remaining Time: 00:12`). Group labels: `Pre-processing`, `Filtering`, `Interrogation window` (today `Pre-processing filtering`, `Processing settings`, `Windows Sizes`). Rows: `Window size`, `Second pass` (today `Step 1`, `Step 2`). Row status: `Done`, `Running`, `Queued`. New keys go into `en/global.json` only; the other 11 locales fall back to English until the owed translation pass. | Adopt the preview copy | Tasks 3, 5, 6: use the old keys instead |
| D5 | LSPIV's settings are open the first time Advanced turns on, and remember a collapse for as long as the Processing step stays mounted. | Open | Task 6 Step 3 (`useState(true)` → `false`) |
| D6 | The preview sizes the readout figure at 32px. 32px is off the Phase 6g type scale and the ratchet in `typeAndRadiusScale.test.ts` rejects it. | Keep `--text-display` (40px), unchanged | Task 4 CSS, plus a `scale-exception:` comment |
| D7 | Technique rows grow from 34px to 40px tall (rule 2's 40px row; the preview renders them at 40). | 40px | Task 6 CSS |
| D8 | Part B: the coordinate labels (`.read-only` pills coloured red / green / light blue) carry the canvas's point colours (red = left bank, green = right bank). Rule 2 bans pill labels. As text, those colours fail in light: `--d23` 1.77:1, `--d12` 1.38:1 against the panel. | Neutral label text with a 10px dot in the point colour, ringed in `--text-subdued` so the dot is findable in light | Task 9 |
| D9 | iWave gets its chevron when it has settings to show. The preview's "iWave settings go here" block was illustration. | No iWave chevron in this plan | Nothing to change later except adding one row |

**Confirmed 2026-10-01 by the product owner: D1–D9 defaults stand.** Clean baseline: suites 86 / tests 931, tsc 68, lint 23 problems (20 errors, 3 warnings).

## Global Constraints

- The seven panel rules (from the preview, verbatim intent):
  1. One left edge, one right edge. Labels start at the gutter (16px + 8px row inset); every control ends on the same right line.
  2. One row grammar. Label left, control right, 40px tall. No label drawn as a pill, no half-width button + field pairs.
  3. Two text levels inside a panel. Row labels at 14–16px; group labels at 12px semibold, muted. Only the panel title is large.
  4. Dividers between groups only, never around single items, always at the gutter.
  5. One primary button per panel. Analyze turns into Stop while running. Secondary actions (Test PIV) are outlined, next to what they test.
  6. Dependents nest and hide. A value that needs a switch sits 16px under it and only exists while the switch is on.
  7. Advanced reveals in place. No lock, no second form stacked below; settings attach to the thing they configure. Read-only values are text, not fields.
- Every design decision holds in all three themes: dark, light, dracula.
- Red = left, green = right on anything that echoes the canvas.
- LSPIV can never be turned off; its ✓ stays `aria-pressed="true" aria-disabled="true"` with an early-return click guard.
- A control that must explain why it is unavailable uses `aria-disabled="true"` plus an early-return guard, never native `disabled` (Chromium shows no `title` tooltip on a natively disabled control). Native `disabled` is fine on inputs that need no tooltip.
- React renders `aria-x={false}` as `"false"`; write `aria-x={cond || undefined}` when the attribute must be absent.
- No video export for STIV or iWave, ever (D5 of Phase 6). The MP4 control stays LSPIV-only.
- All sizes on the scale: `--text-*` and `--radius-*` tokens. `typeAndRadiusScale.test.ts` enforces it.
- Before writing any hover/selected/disabled colour, resolve the tokens per theme with `src/helpers/themeTokens.ts`. Semantic aliases collapse (`--surface-field` ≡ `--input-background`; in dracula `--border-color` ≡ `--on-hover` ≡ `--input-background`).
- Every CSS guard parses with `src/helpers/cssScanner.ts` (`scanCss`), never a regex over raw text, and carries a canary that asserts it still sees something known to be present.
- Lint command is **`npm run lint`** exactly. Type check: `npx tsc --noEmit 2>&1 | grep -c "error TS"`.
- Commits: `antoine.patalano@gmail.com` identity; follow `.claude/skills/river-git`; **no `Co-Authored-By` line**. Message style matches the branch: `Task N: <imperative sentence>`. Stage explicit paths only, never `git add -A` or `git add .`.
- The worktree is `ui/design-refresh`. It stays unmerged.

## Review Focus

Inputs the preview implies but no state of it shows. Each line's test lives in the named task.

1. **A second Analyze after a Stop.** The readout must start from `–` and LSPIV, not show the stopped run's percentage and stage. Today `resetProgress` is set to `true` once and never back, so it only resets the first time. Owner: Task 3 (`useAnalyzeStage` resets on the run's rising edge; pure test on the reducer plus a source assertion on the reset effect).
2. **Hide a dependent, edit, show it again.** Turn CLAHE off and on: Clip limit must show the value the store holds, not the form's original default. Today the fields override react-hook-form's `onChange`, so the form's copy goes stale; that was harmless while the fields were always mounted and becomes visible once they unmount (rule 6). Owner: Task 5 (every field forwards to the registered `onChange`).
3. **Std filtering's Threshold never reaches the run.** The field has no `onChange` today, so an edited threshold is dropped. Owner: Task 5.
4. **Changing Window size blanks other fields.** `reset({ step_1, step_2 })` replaces the whole form's values. Owner: Task 5 (use `setValue`).
5. **An empty or non-numeric ROI height** calls `onReCalculateMask(NaN)` today. It must restore the stored value and not recalculate. Owner: Task 5 (`RoiHeightRow`).

---

## File Structure

**Create**
- `src/helpers/analyzeRunState.ts`: pure run-stage state: reducer, enabled stages, per-row status, readout footer text.
- `src/hooks/useAnalyzeStage.ts`: subscribes to `river-cli-message`, resets on each run start.
- `src/components/Forms/Components/ProcessingRunZone.tsx`: the one Analyze/Stop button and the readout slot.
- `src/components/Forms/Components/RoiHeightRow.tsx`: ROI height, moved up from the Advanced block.
- `src/components/AdvancedToggle.tsx`: replaces `CustomIcons/LockBtn.tsx` (moved with `git mv`).
- Tests: `src/helpers/panelPrimitives.test.ts`, `src/helpers/advancedToggle.test.ts`, `src/helpers/analyzeRunState.test.ts`, `src/helpers/processingRunZone.test.tsx`, `src/helpers/lspivSettings.test.ts`, `src/helpers/processingPanelLayout.test.ts`, `src/helpers/panelRulesRollout.test.ts`.

**Rename**
- `src/components/Forms/Components/HardModeProcessing.tsx` → `LspivSettings.tsx`.

**Modify**
- `src/index.css`: the FIELD ROW block becomes PANEL ROWS; `.switch-sm`; delete `.analize-stage-breadcrumb*`; `.tech-row` height.
- `src/components/Forms/form.css`: processing body/run zone/technique params/advanced toggle; Part B point labels; dead-rule cleanup.
- `src/components/Forms/FormProcessing.tsx`, `src/components/Forms/Components/AnalyzingProgress.tsx`, `src/components/Forms/Components/index.ts`, `src/pages/Processing.tsx`.
- `src/pages/{VideoRange,Uav,Oblique,CrossSections}.tsx` (toggle import).
- Part B: `RealWorldCoordinates.tsx`, `PixelCoordinates.tsx`, `HardModeOblique.tsx`, `HardModeUav.tsx`, `HardModeCrossSections.tsx`, `FramesResolution.tsx`, `LensCorrection.tsx`, `src/pages/pages.css`.
- `src/translations/en/global.json`.
- Existing tests whose assertions name moved code: `buttonAndFieldTokens.test.ts` (`.field-row` block), `loaderRetirement.test.ts` (Test button path), `previewModeAdoption.test.ts` (unchanged contract; must still pass), `themeStateContrast.test.ts` (debt comment wording only).

---

### Task 0: Clean starting point and baseline

**Files:** none changed.

The worktree currently holds uncommitted edits from other work in files this plan modifies (`index.css`, `form.css`, `components.css`, `Processing.tsx`, among 22). Committing this plan's tasks on top would sweep those hunks into this plan's commits.

- [ ] **Step 1:** Run `git status --short`. If any tracked file is modified or staged, **stop and ask the product owner** to commit or set that work aside. Do not stash it yourself (the stash stack is shared across worktrees and sessions) and do not commit it under this plan's name.
- [ ] **Step 2:** Confirm D1–D9 with the product owner, or record that the defaults stand. Write the answers into this file's decision table (change "Default the tasks implement" where a decision changed).
- [ ] **Step 3:** Record the baseline on the clean tree: `npx jest 2>&1 | tail -4`, `npx tsc --noEmit 2>&1 | grep -c "error TS"`, `npm run lint 2>&1 | grep problems`. At planning time, on the dirty tree, these read **86 suites / 931 tests**, **68**, **23 problems (20 errors, 3 warnings)**. Write the clean numbers here: suites ___ / tests ___, tsc ___, lint ___. Every later task's "expected" counts are this baseline plus the tests it adds. tsc and lint may never rise.

---

## Part A: Processing

### Task 1: Panel-row primitives

**Files:**
- Modify: `src/index.css` (the block headed `FIELD ROW (.field-row / .field)`, currently right after the input focus rules, and the `TOGGLE SWITCH` block after it)
- Modify: `src/helpers/buttonAndFieldTokens.test.ts` (the `describe('.field-row component')` block)
- Modify: `src/helpers/themeStateContrast.test.ts` (debt-roster comment only)
- Create: `src/helpers/panelPrimitives.test.ts`

**Interfaces:**
- Produces (CSS classes every later task uses): `.field-row`, `.field-row-top`, `.field-row-child`, `.field-row-label`, `.panel-group`, `.panel-rule`, `.field`, `.field-wide`, `.field-select`, `.field-readonly`, `.switch-sm` (modifier on `.switch`).

`.field-row` and `.field` were built in Phase 6a and have **zero consumers** (`grep -rn 'field-row\|"field ' src --include='*.tsx'` finds none). Reworking them into the approved row grammar avoids a sixth row class next to `.list-row`, `.technique-row`, `.tech-row`, `.lens-row` and `.switch-container`.

- [ ] **Step 1: Write the failing test.** Create `src/helpers/panelPrimitives.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { scanCss } from './cssScanner';
import { contrastRatio, mixOverBackdrop, parseThemeTokens, resolveRgb, ThemeName } from './themeTokens';

/**
 * The panel-row primitives behind the Processing panel redesign's seven rules
 * (preview: docs/superpowers/previews/2026-10-01-processing-panel-advanced.html).
 */
const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');
const { rules, declarations } = scanCss(css);
/** Values of `property` on the last rule whose prelude is exactly `selector`. */
const decl = (selector: string, property: string): string | undefined => {
  const rule = rules.filter((r) => r.prelude === selector).pop();
  if (!rule) return undefined;
  return declarations.filter((d) => d.rule === rule.index && d.property === property).pop()?.value;
};

describe('scanner canary', () => {
  it('still sees a rule known to be present', () => {
    expect(decl('.btn', 'display')).toBeDefined();
  });
});

describe('row grammar (rules 1, 2)', () => {
  it('.field-row is label left, control right, 40px tall, at the 8px row inset', () => {
    expect(decl('.field-row', 'display')).toBe('flex');
    expect(decl('.field-row', 'justify-content')).toBe('space-between');
    expect(decl('.field-row', 'min-height')).toBe('40px');
    expect(decl('.field-row', 'padding')).toBe('0 var(--space-2)');
  });

  it('a row label can shrink instead of pushing its control off the right edge', () => {
    expect(decl('.field-row-label', 'min-width')).toBe('0');
  });

  it('section-level rows (Station number, ROI height) use the 16px label size', () => {
    expect(decl('.field-row-top .field-row-label', 'font-size')).toBe('var(--text-section)');
  });
});

describe('two text levels (rule 3) and dividers (rule 4)', () => {
  it('.panel-group is the quietest text in the block', () => {
    expect(decl('.panel-group', 'font-size')).toBe('var(--text-caption)');
    expect(decl('.panel-group', 'font-weight')).toBe('600');
    expect(decl('.panel-group', 'color')).toBe('var(--text-subdued)');
  });

  it('.panel-rule is a 1px border-colour line', () => {
    expect(decl('.panel-rule', 'height')).toBe('1px');
    expect(decl('.panel-rule', 'background')).toBe('var(--border-color)');
  });
});

describe('dependents and read-only values (rules 6, 7)', () => {
  it('a dependent row sits 16px further in and reads muted', () => {
    expect(decl('.field-row.field-row-child', 'padding-left')).toBe('calc(var(--space-2) + var(--space-4))');
    expect(decl('.field-row-child .field-row-label', 'color')).toBe('var(--text-subdued)');
  });

  it('a read-only value is muted tabular text, not a field', () => {
    expect(decl('.field-readonly', 'color')).toBe('var(--text-subdued)');
    expect(decl('.field-readonly', 'font-variant-numeric')).toBe('tabular-nums');
  });
});

describe('.field: the compact value field', () => {
  it('is 30px tall body text, centred, with a hairline', () => {
    expect(decl('.field', 'height')).toBe('30px');
    expect(decl('.field', 'font-size')).toBe('var(--text-body)');
    expect(decl('.field', 'text-align')).toBe('center');
    expect(decl('.field', 'border')).toBe('1px solid color-mix(in srgb, var(--text-subdued) 22%, transparent)');
  });

  it('shows a keyboard focus ring', () => {
    expect(decl('.field:focus-visible', 'outline')).toBe('2px solid var(--accent-color)');
  });

  // D1. Floors sit just under the values measured on 2026-10-01; if one fails,
  // the palette moved or the rule regressed. Report it; never lower a floor.
  const themes = parseThemeTokens(css);
  const FLOORS: Record<ThemeName, number> = { dark: 2.0, light: 1.4, dracula: 2.5 };
  it.each(Object.keys(FLOORS) as ThemeName[])('%s: the hairline is visible against the panel', (name) => {
    const t = themes[name];
    const hair = mixOverBackdrop(resolveRgb(t, '--text-subdued'), 0.22, resolveRgb(t, '--surface-field'));
    expect(contrastRatio(hair, resolveRgb(t, '--surface-panel'))).toBeGreaterThanOrEqual(FLOORS[name]);
  });
});

describe('.switch-sm: the compact parameter switch (D2)', () => {
  it('is 36x20 and drops the 20px gap the full switch keeps from its label', () => {
    expect(decl('.switch.switch-sm', 'width')).toBe('36px');
    expect(decl('.switch.switch-sm', 'height')).toBe('20px');
    expect(decl('.switch.switch-sm', 'margin-left')).toBe('0');
  });

  it('has a 14px thumb that travels 16px, out-specifying the full switch', () => {
    expect(decl('.switch-sm .slider:before', 'width')).toBe('14px');
    expect(decl('.switch-sm input:checked + .slider:before', 'transform')).toBe(
      'translateY(-50%) translateX(16px)'
    );
  });
});

describe('mutation check', () => {
  it('a stray */ that swallows .field-row is caught, not passed green', () => {
    const mutant = css.replace('.field-row {', '/* broken */ */ .field-row {');
    const scanned = scanCss(mutant);
    const ruleSurvives = scanned.rules.some((r) => r.prelude === '.field-row');
    expect(ruleSurvives).toBe(false);
  });
});
```

The mutation check feeds the scanner a copy of the real stylesheet with a stray `*/` in front of `.field-row`; the browser would drop that rule, and the scanner must agree (the prelude becomes `*/ .field-row`). Built in memory, nothing written to disk.

- [ ] **Step 2: Run it and watch it fail.** `npx jest src/helpers/panelPrimitives.test.ts`. Expected: FAIL on `.field-row` display (`grid`, not `flex`), the missing classes, and `.switch-sm`. The canary and the mutation check pass.

- [ ] **Step 3: Implement.** In `src/index.css`, replace the whole `FIELD ROW (.field-row / .field)` block (header comment through `.field:focus-within`) with:

```css
/* =============================================================================
   PANEL ROWS (.field-row / .field / .panel-group / .panel-rule)
   The row grammar every wizard panel uses (Processing panel redesign, preview
   2026-10-01). Label left, control right, 40px tall. Labels start at the 8px
   row inset inside the panel's 16px gutter, and every control ends on the
   same right edge (rules 1, 2). Built in 6a with no consumer; reworked here
   rather than adding a sixth row class.
   ============================================================================= */

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 40px;
  padding: 0 var(--space-2);
}

.field-row-label {
  min-width: 0;
  font-size: var(--text-body);
  color: var(--text-primary);
}

/* Section-level rows (Station number, ROI height) sit one step up. */
.field-row-top .field-row-label {
  font-size: var(--text-section);
}

/* Rule 6: a value that needs a switch sits 16px in, under that switch, and is
   only rendered while the switch is on. */
.field-row.field-row-child {
  padding-left: calc(var(--space-2) + var(--space-4));
}

.field-row-child .field-row-label {
  color: var(--text-subdued);
}

/* Rule 3: the group label is the quietest text in the block, not the loudest. */
.panel-group {
  margin: var(--space-3) 0 2px;
  padding: 0 var(--space-2);
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-subdued);
}

.panel-group:first-child {
  margin-top: var(--space-1);
}

/* Rule 4: one divider style, between groups only. */
.panel-rule {
  height: 1px;
  border: 0;
  margin: var(--space-2) 0;
  background: var(--border-color);
}

/* Rule 7: read-only values are text, never a field that looks editable. */
.field-readonly {
  padding-right: var(--space-2);
  font-variant-numeric: tabular-nums;
  color: var(--text-subdued);
}

/* A parameter value is body text, not a headline: 14px in a 30px box, where
   .input-field-little is 20px. The hairline is D1: light's field fill is
   1.05:1 against the panel (debt A6), so without it the box has no edge. */
.field {
  width: 64px;
  height: 30px;
  box-sizing: border-box;
  padding: 0 var(--space-2);
  border: 1px solid color-mix(in srgb, var(--text-subdued) 22%, transparent);
  border-radius: var(--radius-md);
  background-color: var(--surface-field);
  color: var(--text-primary);
  font-family: inherit;
  font-size: var(--text-body);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.field-wide {
  width: 76px;
}

.field-select {
  appearance: none;
  text-align: left;
  padding-left: 10px;
  padding-right: 22px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
}

.field:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 1px;
}

.field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

Then, at the end of the `TOGGLE SWITCH` block (after `input:disabled + .slider:hover`), add:

```css
/* D2: the parameter-list switch. A size modifier only, so every state above
   (hover, focus ring, checked, disabled) still applies. 36x20 against 52x28,
   so the control no longer outweighs its 14px label. Each selector out-specifies
   the base rule it overrides by one class. */
.switch.switch-sm {
  width: 36px;
  height: 20px;
  margin-left: 0;
}

.switch-sm .slider:before {
  width: 14px;
  height: 14px;
  left: 2px;
}

.switch-sm input:checked + .slider:before {
  transform: translateY(-50%) translateX(16px);
}
```

In `src/helpers/buttonAndFieldTokens.test.ts`, replace the `describe('.field-row component', …)` block with:

```ts
describe('.field-row component', () => {
  // Reworked from 6a's three-column grid into the panel row grammar;
  // panelPrimitives.test.ts owns the detail.
  it('is a label-left, control-right flex row', () => {
    const body = ruleBody('.field-row');
    expect(body).toMatch(/display:\s*flex/);
    expect(body).toMatch(/justify-content:\s*space-between/);
  });

  it('.field uses the field surface token and the medium radius', () => {
    const body = ruleBody('.field');
    expect(body).toMatch(/background-color:\s*var\(--surface-field\)/);
    expect(body).toMatch(/border-radius:\s*var\(--radius-md\)/);
  });
});
```

In `src/helpers/themeStateContrast.test.ts`, in the debt-roster comment, change "`.input-field` and `.field` carry `border: none`" to "`.input-field` carries `border: none` (the panel-row `.field` has had a hairline since the Processing panel redesign, D1)". Change nothing else in that file.

- [ ] **Step 4: Run the tests.** `npx jest src/helpers/panelPrimitives.test.ts src/helpers/buttonAndFieldTokens.test.ts src/helpers/themeStateContrast.test.ts src/helpers/typeAndRadiusScale.test.ts` → PASS. Then the full suite: baseline + 1 suite, + the new test count. tsc and lint unchanged.

- [ ] **Step 5: Commit.**

```bash
git add src/index.css src/helpers/panelPrimitives.test.ts src/helpers/buttonAndFieldTokens.test.ts src/helpers/themeStateContrast.test.ts
git commit -m "Task 1: Rework .field-row and .field into the panel row grammar and add .switch-sm"
```

---

### Task 2: AdvancedToggle replaces LockBtn on every panel

**Files:**
- Move: `src/components/CustomIcons/LockBtn.tsx` → `src/components/AdvancedToggle.tsx` (`git mv`)
- Modify: `src/pages/{Processing,VideoRange,Uav,Oblique,CrossSections}.tsx` (import + JSX name)
- Modify: `src/components/Forms/form.css` (`.advanced-mode-toggle`, `.advanced-mode-label`)
- Create: `src/helpers/advancedToggle.test.ts`

**Interfaces:**
- Consumes: `.field-row`, `.field-row-label`, `.switch-sm` (Task 1).
- Produces: `export function AdvancedToggle(props: AdvancedToggleProps)` with the same props as `LockBtn`, except `footerElementID` and `headerElementID` become optional (Processing no longer passes them).

Rule 7: no lock. The toggle is a plain row, `Advanced settings` left, compact switch right. The label is muted while off and primary while on. The scroll-to-footer on Processing goes away: settings now reveal in place under LSPIV, near the top.

- [ ] **Step 1: Write the failing test.** Create `src/helpers/advancedToggle.test.ts`:

```ts
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { scanCss } from './cssScanner';

const SRC = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

describe('AdvancedToggle (rule 7: no lock)', () => {
  const toggle = read('components/AdvancedToggle.tsx');

  it('replaces LockBtn', () => {
    expect(existsSync(join(SRC, 'components', 'CustomIcons', 'LockBtn.tsx'))).toBe(false);
    for (const page of ['Processing', 'VideoRange', 'Uav', 'Oblique', 'CrossSections']) {
      const src = read(`pages/${page}.tsx`);
      expect(src).toMatch(/<AdvancedToggle\b/);
      expect(src).not.toMatch(/LockBtn/);
    }
  });

  it('draws no lock icon', () => {
    expect(toggle).not.toMatch(/Icons\.Lock/);
  });

  it('is a panel row with the compact switch', () => {
    expect(toggle).toMatch(/className="field-row advanced-mode-toggle"/);
    expect(toggle).toMatch(/className="switch switch-sm"/);
  });

  it('labels its checkbox, so the whole label toggles it', () => {
    expect(toggle).toMatch(/htmlFor="advanced-toggle"/);
    expect(toggle).toMatch(/id="advanced-toggle"/);
  });

  it('does not scroll on Processing: settings reveal in place', () => {
    const processingCase = toggle.slice(toggle.indexOf('case MODULE_NUMBER.PROCESSING'));
    const body = processingCase.slice(0, processingCase.indexOf('break;'));
    expect(body).not.toMatch(/scrollIntoView/);
  });
});

describe('AdvancedToggle CSS', () => {
  const { rules, declarations } = scanCss(read('components/Forms/form.css'));
  const decl = (selector: string, property: string) => {
    const rule = rules.filter((r) => r.prelude === selector).pop();
    return rule && declarations.filter((d) => d.rule === rule.index && d.property === property).pop()?.value;
  };

  it('canary: the scanner still sees .form-container', () => {
    expect(decl('.form-container', 'display')).toBe('flex');
  });

  it('spans the footer at the panel gutter', () => {
    expect(decl('.field-row.advanced-mode-toggle', 'align-self')).toBe('stretch');
  });

  it('reads muted while off and primary while on', () => {
    expect(decl('.advanced-mode-label', 'color')).toBe('var(--text-subdued)');
    expect(decl('.advanced-mode-toggle:has(input:checked) .advanced-mode-label', 'color')).toBe('var(--text-primary)');
  });
});
```

- [ ] **Step 2: Run it.** `npx jest src/helpers/advancedToggle.test.ts` → FAIL (file not found).

- [ ] **Step 3: Implement.**

`git mv src/components/CustomIcons/LockBtn.tsx src/components/AdvancedToggle.tsx`. In the moved file:
- Fix the relative imports for the new location: `./CustomIcons/Icons` is no longer needed (delete the `Icons` import), `../hooks`, `../constants/constants`, `../helpers/motion`.
- Rename `LockButtonProps` → `AdvancedToggleProps`, make `footerElementID?: string; headerElementID?: string;`, rename the function to `AdvancedToggle`.
- Replace the `case MODULE_NUMBER.PROCESSING:` body with:

```ts
      case MODULE_NUMBER.PROCESSING:
        // Settings reveal in place under LSPIV, near the top of the panel, so
        // there is nothing to scroll to (rule 7).
        setLocalExtraFields(!localExtraFields);
        break;
```

- Replace the returned JSX with:

```tsx
  return (
    <div className="field-row advanced-mode-toggle">
      <label className="field-row-label advanced-mode-label" htmlFor="advanced-toggle">
        {t('Commons.advancedSettings', { defaultValue: 'Advanced settings' })}
      </label>
      <label className="switch switch-sm">
        <input id="advanced-toggle" type="checkbox" checked={checked} onChange={handleOnChange} disabled={disabled} />
        <span className="slider"></span>
      </label>
    </div>
  );
```

In each of the five pages, change `import { LockBtn } from '../components/CustomIcons/LockBtn';` to `import { AdvancedToggle } from '../components/AdvancedToggle';` and `<LockBtn` to `<AdvancedToggle`. In `Processing.tsx`, also delete the `footerElementID="processing-footer"` and `headerElementID="processing-header"` props. Run `grep -rn "LockBtn" src` → no output.

In `src/components/Forms/form.css`, replace the `.advanced-mode-toggle` and `.advanced-mode-label` rules with:

```css
/* The footer's Advanced row: a plain panel row, no lock (rule 7). The footer
   is a centred column, so the row stretches itself to the gutter. */
.field-row.advanced-mode-toggle {
    align-self: stretch;
    padding: 0 calc(var(--space-4) + var(--space-2));
}

.advanced-mode-label {
    font-size: var(--text-meta);
    color: var(--text-subdued);
    cursor: pointer;
}

.advanced-mode-toggle:has(input:checked) .advanced-mode-label {
    color: var(--text-primary);
}
```

- [ ] **Step 4: Run.** `npx jest src/helpers/advancedToggle.test.ts` → PASS; full suite → baseline + Task 1 + this file. tsc and lint unchanged (a broken import shows here first).

- [ ] **Step 5: Commit.**

```bash
git add src/components/AdvancedToggle.tsx src/components/CustomIcons/LockBtn.tsx src/pages/Processing.tsx src/pages/VideoRange.tsx src/pages/Uav.tsx src/pages/Oblique.tsx src/pages/CrossSections.tsx src/components/Forms/form.css src/helpers/advancedToggle.test.ts
git commit -m "Task 2: Replace the lock button with a plain Advanced settings row on every panel"
```

---

### Task 3: Lift the run-stage state out of the readout

**Files:**
- Create: `src/helpers/analyzeRunState.ts`, `src/helpers/analyzeRunState.test.ts`, `src/hooks/useAnalyzeStage.ts`
- Modify: `src/translations/en/global.json` (`Analizing.stationOf`, `Analizing.timeLeft`, `Processing.statusDone`, `statusRunning`, `statusQueued`)

**Interfaces:**
- Consumes: `parseAnalyzeStage(text: string): AnalyzeStageUpdate` and `type StageKey = 'lspiv' | 'stiv' | 'iwave'` from `src/helpers/parseAnalyzeStage.ts`.
- Produces:

```ts
export interface AnalyzeRunState {
  stage: StageKey;
  percentage: number | null;
  station: [number, number] | null;
  remaining: string | null;
  note: string | null;
}
export const STAGE_LABEL: Record<StageKey, string>;
export const initialAnalyzeRunState: () => AnalyzeRunState;
export const reduceAnalyzeStage: (prev: AnalyzeRunState, update: AnalyzeStageUpdate) => AnalyzeRunState;
export const enabledStages: (stiv: boolean, iwave: boolean) => StageKey[];
export type TechniqueRunStatus = 'done' | 'running' | 'queued';
export const techniqueRunStatus: (technique: StageKey, enabled: StageKey[], current: StageKey) => TechniqueRunStatus | null;
export type Translate = (key: string, options: Record<string, unknown>) => string;
export const readoutFoot: (state: AnalyzeRunState, t: Translate) => { label: string; time: string };
// src/hooks/useAnalyzeStage.ts
export const useAnalyzeStage: (running: boolean) => AnalyzeRunState;
```

The breadcrumb (`LSPIV → STIV → iWave`) goes away: each row says its own status, and the readout's label names the technique (D4).

- [ ] **Step 1: Write the failing test.** Create `src/helpers/analyzeRunState.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  enabledStages,
  initialAnalyzeRunState,
  readoutFoot,
  reduceAnalyzeStage,
  techniqueRunStatus,
  Translate,
} from './analyzeRunState';
import { AnalyzeStageUpdate } from './parseAnalyzeStage';

const update = (partial: Partial<AnalyzeStageUpdate>): AnalyzeStageUpdate => ({
  stage: null,
  percentage: null,
  station: null,
  remaining: null,
  note: null,
  ...partial,
});

/** Stands in for i18next: interpolates the defaultValue the code passes. */
const t: Translate = (key, options) =>
  String(options.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_, name) => String(options[name]));

describe('reduceAnalyzeStage', () => {
  it('ignores lines that name no stage', () => {
    const prev = initialAnalyzeRunState();
    expect(reduceAnalyzeStage(prev, update({}))).toBe(prev);
  });

  it('a new stage starts from that line alone', () => {
    const prev = { ...initialAnalyzeRunState(), percentage: 80, remaining: '00:03' };
    expect(reduceAnalyzeStage(prev, update({ stage: 'iwave', percentage: 5 }))).toEqual({
      stage: 'iwave',
      percentage: 5,
      station: null,
      remaining: null,
      note: null,
    });
  });

  it('the same stage keeps fields the new line did not carry', () => {
    const prev = { ...initialAnalyzeRunState(), percentage: 10, remaining: '00:20' };
    expect(reduceAnalyzeStage(prev, update({ stage: 'lspiv', percentage: 15 }))).toMatchObject({
      percentage: 15,
      remaining: '00:20',
    });
  });
});

describe('enabledStages', () => {
  it('always runs LSPIV, then STIV and iWave when switched on, in that order', () => {
    expect(enabledStages(false, false)).toEqual(['lspiv']);
    expect(enabledStages(true, true)).toEqual(['lspiv', 'stiv', 'iwave']);
    expect(enabledStages(false, true)).toEqual(['lspiv', 'iwave']);
  });
});

describe('techniqueRunStatus', () => {
  const all = enabledStages(true, true);
  it('marks earlier stages done, the current one running, later ones queued', () => {
    expect(techniqueRunStatus('lspiv', all, 'stiv')).toBe('done');
    expect(techniqueRunStatus('stiv', all, 'stiv')).toBe('running');
    expect(techniqueRunStatus('iwave', all, 'stiv')).toBe('queued');
  });

  it('says nothing for a technique that is not part of this run', () => {
    expect(techniqueRunStatus('stiv', ['lspiv', 'iwave'], 'iwave')).toBeNull();
  });
});

describe('readoutFoot (D4 copy)', () => {
  it('names the technique and the station', () => {
    const state = { ...initialAnalyzeRunState(), stage: 'iwave' as const, station: [2, 15] as [number, number] };
    expect(readoutFoot(state, t).label).toBe('iWave · station 2 of 15');
  });

  it('names the technique in front of a backend note', () => {
    const state = { ...initialAnalyzeRunState(), stage: 'stiv' as const, note: 'STIV: loading models' };
    expect(readoutFoot(state, t).label).toBe('STIV · STIV: loading models');
  });

  it('falls back to the stage headline', () => {
    expect(readoutFoot(initialAnalyzeRunState(), t).label).toBe('Computing LSPIV velocity field');
  });

  it('shows time left, or estimating before the first estimate', () => {
    expect(readoutFoot({ ...initialAnalyzeRunState(), remaining: '00:12' }, t).time).toBe('00:12 left');
    expect(readoutFoot(initialAnalyzeRunState(), t).time).toBe('Estimating…');
  });
});

describe('useAnalyzeStage (Review Focus 1: a second run starts clean)', () => {
  const hook = readFileSync(join(__dirname, '..', 'hooks', 'useAnalyzeStage.ts'), 'utf8');
  it('resets whenever a run starts, not once', () => {
    expect(hook).toMatch(/if \(running\) setState\(initialAnalyzeRunState\(\)\);\s*\}, \[running\]\)/);
  });
  it('feeds every backend line through the pure reducer', () => {
    expect(hook).toMatch(/reduceAnalyzeStage\(prev, parseAnalyzeStage\(text\)\)/);
  });
});
```

- [ ] **Step 2: Run it.** `npx jest src/helpers/analyzeRunState.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement.** Create `src/helpers/analyzeRunState.ts`:

```ts
import type { AnalyzeStageUpdate, StageKey } from './parseAnalyzeStage';

/**
 * The run-stage state behind the Processing panel's readout and its per-row
 * status (Done / Running / Queued), lifted out of AnalyzingProgress so the
 * technique rows can read it too. Pure: no React, no IPC.
 */
export interface AnalyzeRunState {
  stage: StageKey;
  percentage: number | null;
  station: [number, number] | null;
  remaining: string | null;
  note: string | null;
}

const STAGE_ORDER: StageKey[] = ['lspiv', 'stiv', 'iwave'];

// Proper nouns, never translated anywhere in this app.
export const STAGE_LABEL: Record<StageKey, string> = { lspiv: 'LSPIV', stiv: 'STIV', iwave: 'iWave' };

export const initialAnalyzeRunState = (): AnalyzeRunState => ({
  stage: 'lspiv',
  percentage: null,
  station: null,
  remaining: null,
  note: null,
});

/** A line naming a new stage starts from that line's fields; the same stage merges onto what it had. */
export const reduceAnalyzeStage = (prev: AnalyzeRunState, update: AnalyzeStageUpdate): AnalyzeRunState => {
  if (update.stage === null) return prev;
  if (update.stage !== prev.stage) {
    return {
      stage: update.stage,
      percentage: update.percentage,
      station: update.station,
      remaining: update.remaining,
      note: update.note,
    };
  }
  return {
    stage: prev.stage,
    percentage: update.percentage ?? prev.percentage,
    station: update.station ?? prev.station,
    remaining: update.remaining ?? prev.remaining,
    note: update.note ?? prev.note,
  };
};

export const enabledStages = (stiv: boolean, iwave: boolean): StageKey[] =>
  STAGE_ORDER.filter((s) => s === 'lspiv' || (s === 'stiv' && stiv) || (s === 'iwave' && iwave));

export type TechniqueRunStatus = 'done' | 'running' | 'queued';

export const techniqueRunStatus = (
  technique: StageKey,
  enabled: StageKey[],
  current: StageKey
): TechniqueRunStatus | null => {
  const at = enabled.indexOf(technique);
  if (at === -1) return null;
  const now = enabled.indexOf(current);
  if (at < now) return 'done';
  return at === now ? 'running' : 'queued';
};

export type Translate = (key: string, options: Record<string, unknown>) => string;

const DEFAULT_HEADLINE: Record<StageKey, string> = {
  lspiv: 'Computing LSPIV velocity field',
  stiv: 'Computing STIV velocities',
  iwave: 'Computing iWave velocities',
};

export const readoutFoot = (state: AnalyzeRunState, t: Translate): { label: string; time: string } => {
  const technique = STAGE_LABEL[state.stage];
  const label = state.station
    ? t('Analizing.stationOf', {
        defaultValue: '{{technique}} · station {{n}} of {{total}}',
        technique,
        n: state.station[0],
        total: state.station[1],
      })
    : state.note
      ? `${technique} · ${state.note}`
      : t(`Analizing.stage.${state.stage}`, { defaultValue: DEFAULT_HEADLINE[state.stage] });
  const time = state.remaining
    ? t('Analizing.timeLeft', { defaultValue: '{{time}} left', time: state.remaining })
    : t('Analizing.estimating', { defaultValue: 'Estimating…' });
  return { label, time };
};
```

Create `src/hooks/useAnalyzeStage.ts`:

```ts
import { useEffect, useState } from 'react';
import { parseAnalyzeStage } from '../helpers/parseAnalyzeStage';
import { AnalyzeRunState, initialAnalyzeRunState, reduceAnalyzeStage } from '../helpers/analyzeRunState';

/**
 * Follows the backend's progress lines for one Analyze run. Resets each time
 * `running` turns true, so a second run never opens on the first run's
 * numbers (the old resetProgress flag was set to true once and never back).
 */
export const useAnalyzeStage = (running: boolean): AnalyzeRunState => {
  const [state, setState] = useState<AnalyzeRunState>(initialAnalyzeRunState);

  useEffect(() => {
    if (running) setState(initialAnalyzeRunState());
  }, [running]);

  useEffect(() => {
    const handle = (_event: unknown, text: string) => {
      setState((prev) => reduceAnalyzeStage(prev, parseAnalyzeStage(text)));
    };
    window.ipcRenderer.on('river-cli-message', handle);
    return () => {
      window.ipcRenderer.removeListener('river-cli-message', handle);
    };
  }, []);

  return state;
};
```

In `src/translations/en/global.json`, add to `"Analizing"`: `"stationOf": "{{technique}} · station {{n}} of {{total}}"`, `"timeLeft": "{{time}} left"`; add to `"Processing"`: `"statusDone": "Done"`, `"statusRunning": "Running"`, `"statusQueued": "Queued"`. Leave `remainingTime` in place (other locales still carry it; removing keys is the translation pass's job).

- [ ] **Step 4: Run.** `npx jest src/helpers/analyzeRunState.test.ts src/helpers/parseAnalyzeStage.test.ts` → PASS. Full suite, tsc, lint as expected.

- [ ] **Step 5: Commit.**

```bash
git add src/helpers/analyzeRunState.ts src/helpers/analyzeRunState.test.ts src/hooks/useAnalyzeStage.ts src/translations/en/global.json
git commit -m "Task 3: Lift the analyze run state into a pure reducer and a hook that resets on every run"
```

---

### Task 4: One Analyze/Stop button in a fixed run zone

**Files:**
- Create: `src/components/Forms/Components/ProcessingRunZone.tsx`, `src/helpers/processingRunZone.test.tsx`
- Modify: `src/components/Forms/Components/AnalyzingProgress.tsx`, `src/components/Forms/Components/index.ts`
- Modify: `src/components/Forms/form.css` (run zone), `src/index.css` (delete `.analize-stage-breadcrumb` and `.analize-stage-breadcrumb-active`)
- Modify: `src/helpers/loaderRetirement.test.ts` only if its `AnalyzingProgress` assertion breaks (it should not: the file still renders `<ProgressReadout`)

**Interfaces:**
- Consumes: `AnalyzeRunState`, `readoutFoot` (Task 3); `ProgressReadout({ percentage, label, time })`.
- Produces:

```ts
export const ProcessingRunZone: (props: {
  running: boolean;   // a full Analyze run is in progress
  testing: boolean;   // a Test PIV run is in progress
  onAnalyze: () => void;
  onStop: () => void;
  children?: ReactNode; // the readout, shown only while running
}) => JSX.Element;
export const AnalyzingProgress: (props: { state: AnalyzeRunState }) => JSX.Element;
```

Rule 5: one primary button. Idle shows Analyze; a run shows Stop in the same place with the readout under it. During Test PIV, Analyze stays but is `aria-disabled` with a tooltip, and there is no Stop (today's Stop is also disabled during a test).

- [ ] **Step 1: Write the failing test.** Create `src/helpers/processingRunZone.test.tsx`:

```tsx
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { scanCss } from './cssScanner';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: { defaultValue?: string }) => o?.defaultValue ?? key }),
}));

// Imported after the mock so the component picks it up.
import { ProcessingRunZone } from '../components/Forms/Components/ProcessingRunZone';

const render = (running: boolean, testing = false) =>
  renderToStaticMarkup(
    createElement(
      ProcessingRunZone,
      { running, testing, onAnalyze: () => {}, onStop: () => {} },
      createElement('div', { className: 'readout-stub' })
    )
  );

describe('ProcessingRunZone (rule 5)', () => {
  it('idle: one primary Analyze button and no readout', () => {
    const html = render(false);
    expect(html).toMatch(/id="analize-button"[^>]*class="btn btn-lg btn-primary"|class="btn btn-lg btn-primary"[^>]*id="analize-button"/);
    expect(html).not.toContain('stop-button');
    expect(html).not.toContain('readout-stub');
    expect(html).not.toContain('aria-disabled');
  });

  it('running: Stop takes the same place and the readout appears under it', () => {
    const html = render(true);
    expect(html).toContain('id="stop-button"');
    expect(html).toContain('btn-danger');
    expect(html).not.toContain('analize-button');
    expect(html.indexOf('stop-button')).toBeLessThan(html.indexOf('readout-stub'));
  });

  it('testing: Analyze explains itself instead of going natively disabled', () => {
    const html = render(false, true);
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toMatch(/\sdisabled=""/);
    expect(html).toContain('title="Wait for Test PIV to finish"');
  });

  it('there is exactly one button in every state', () => {
    for (const html of [render(false), render(true), render(false, true)]) {
      expect(html.match(/<button/g)).toHaveLength(1);
    }
  });
});

describe('ProcessingRunZone source', () => {
  const src = readFileSync(join(__dirname, '..', 'components', 'Forms', 'Components', 'ProcessingRunZone.tsx'), 'utf8');
  it('guards the click while a test runs, since aria-disabled alone leaves the button live', () => {
    expect(src).toMatch(/if \(testing\) return;/);
  });
});

describe('AnalyzingProgress', () => {
  const src = readFileSync(join(__dirname, '..', 'components', 'Forms', 'Components', 'AnalyzingProgress.tsx'), 'utf8');
  it('no longer draws the stage breadcrumb (rows show their own status)', () => {
    expect(src).not.toMatch(/breadcrumb/);
  });
  it('takes its state from the caller instead of listening to IPC itself', () => {
    expect(src).not.toMatch(/ipcRenderer/);
    expect(src).toMatch(/readoutFoot\(state, t\)/);
  });
});

describe('run zone CSS', () => {
  const { rules, declarations } = scanCss(readFileSync(join(__dirname, '..', 'components', 'Forms', 'form.css'), 'utf8'));
  const decl = (selector: string, property: string) => {
    const rule = rules.filter((r) => r.prelude === selector).pop();
    return rule && declarations.filter((d) => d.rule === rule.index && d.property === property).pop()?.value;
  };
  it('canary', () => expect(decl('.form-container', 'display')).toBe('flex'));
  it('never shrinks, so the button keeps its place above the footer', () => {
    expect(decl('.processing-run', 'flex-shrink')).toBe('0');
    expect(decl('.processing-run', 'border-top')).toBe('1px solid var(--border-color)');
  });
  it('the button and the readout span gutter to gutter', () => {
    expect(decl('.processing-run .btn', 'width')).toBe('100%');
    expect(decl('.processing-run .progress-readout', 'max-width')).toBe('none');
  });
});

describe('the breadcrumb CSS is gone', () => {
  it('index.css has no .analize-stage-breadcrumb rule', () => {
    const index = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');
    expect(scanCss(index).rules.some((r) => r.prelude.includes('analize-stage-breadcrumb'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run it.** `npx jest src/helpers/processingRunZone.test.tsx` → FAIL (module not found).

- [ ] **Step 3: Implement.** Create `src/components/Forms/Components/ProcessingRunZone.tsx`:

```tsx
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * The Processing panel's run zone: fixed above the footer, outside the
 * scrolling settings, so the button never moves with what is open above it.
 * One button, two states (rule 5): Analyze, or Stop while a run is going,
 * with the readout under it.
 */
export const ProcessingRunZone = ({
  running,
  testing,
  onAnalyze,
  onStop,
  children,
}: {
  running: boolean;
  testing: boolean;
  onAnalyze: () => void;
  onStop: () => void;
  children?: ReactNode;
}) => {
  const { t } = useTranslation();
  const waitLabel = t('Processing.waitForTest', { defaultValue: 'Wait for Test PIV to finish' });

  return (
    <div className="processing-run">
      {running ? (
        <button id="stop-button" type="button" className="btn btn-lg btn-danger" onClick={onStop}>
          {t('Processing.stop')}
        </button>
      ) : (
        <button
          id="analize-button"
          type="button"
          className="btn btn-lg btn-primary"
          aria-disabled={testing || undefined}
          title={testing ? waitLabel : undefined}
          onClick={() => {
            if (testing) return;
            onAnalyze();
          }}
        >
          {t('Processing.analize')}
        </button>
      )}
      {running && children}
    </div>
  );
};
```

Replace `src/components/Forms/Components/AnalyzingProgress.tsx` entirely with:

```tsx
import { useTranslation } from 'react-i18next';
import { ProgressReadout } from '../../ProgressReadout';
import { AnalyzeRunState, readoutFoot } from '../../../helpers/analyzeRunState';

/** The run's readout. State comes from useAnalyzeStage in FormProcessing, which the technique rows share. */
export const AnalyzingProgress = ({ state }: { state: AnalyzeRunState }) => {
  const { t } = useTranslation();
  const { label, time } = readoutFoot(state, t);
  return <ProgressReadout percentage={state.percentage} label={label} time={time} />;
};
```

(The old "set 100% when the run ends" effect is dropped: the readout unmounts as soon as `isBackendWorking` turns false, so it never rendered.)

Add `export { ProcessingRunZone } from './ProcessingRunZone';` to `src/components/Forms/Components/index.ts`, in the style the file already uses.

Add `"waitForTest": "Wait for Test PIV to finish"` to `Processing` in `en/global.json`.

In `src/index.css`, delete the `.analize-stage-breadcrumb` and `.analize-stage-breadcrumb-active` rules. `grep -rn "analize-stage-breadcrumb" src` → no output.

In `src/components/Forms/form.css`, append:

```css
/* Processing run zone: fixed between the scrolling settings and the footer.
   One button and, while running, the readout under it, both spanning the
   panel's gutter (rule 5). D6: the readout keeps --text-display. */
.processing-run {
    flex-shrink: 0;
    border-top: 1px solid var(--border-color);
    padding: var(--space-4) var(--space-4) var(--space-2);
}

.processing-run .btn {
    width: 100%;
}

.processing-run .progress-readout {
    max-width: none;
    margin-top: var(--space-4);
}
```

`ProcessingRunZone` is not mounted yet; Task 6 mounts it. `FormProcessing.tsx` still passes `resetProgress` to `AnalyzingProgress` and will not type-check until Task 6. To keep this task green on its own, change the one call site in `FormProcessing.tsx` now to:

```tsx
{isBackendWorking && isTesting === false && <AnalyzingProgress state={runState} />}
```

and add, next to the other hooks in `FormProcessing`:

```tsx
const runState = useAnalyzeStage(isBackendWorking && !isTesting);
```

with `import { useAnalyzeStage } from '../../hooks/useAnalyzeStage';`. Delete the `resetProgress` state and every `setResetProgress(...)` call (the hook resets itself).

- [ ] **Step 4: Run.** `npx jest src/helpers/processingRunZone.test.tsx src/helpers/loaderRetirement.test.ts src/helpers/progressReadout.test.tsx` → PASS. Full suite, tsc, lint as expected.

- [ ] **Step 5: Commit.**

```bash
git add src/components/Forms/Components/ProcessingRunZone.tsx src/components/Forms/Components/AnalyzingProgress.tsx src/components/Forms/Components/index.ts src/components/Forms/FormProcessing.tsx src/components/Forms/form.css src/index.css src/translations/en/global.json src/helpers/processingRunZone.test.tsx
git commit -m "Task 4: Add the one-button run zone and drop the stage breadcrumb"
```

---

### Task 5: LSPIV settings and the ROI height row

**Files:**
- Move: `src/components/Forms/Components/HardModeProcessing.tsx` → `LspivSettings.tsx` (`git mv`)
- Create: `src/components/Forms/Components/RoiHeightRow.tsx`, `src/helpers/lspivSettings.test.ts`
- Modify: `src/components/Forms/Components/index.ts`, `src/helpers/loaderRetirement.test.ts` (Test button path), `src/translations/en/global.json`

**Interfaces:**
- Consumes: Task 1 classes. `useDataSlice()` → `processing.form`, `onUpdateProcessing`, `onReCalculateMask`, `isBackendWorking`. `useUiSlice()` → `showInterrogationWindow`, `onSetShowInterrogationWindow`, `onAddStepAlert`, `onClearStepAlert`.
- Produces:

```ts
export const LspivSettings: (props: {
  id: string;                 // DOM id the LSPIV row's disclosure button points at
  onClickTest: (event: React.MouseEvent<HTMLButtonElement>) => void;
  isTesting: boolean;
}) => JSX.Element;
export const RoiHeightRow: () => JSX.Element;
```

Field names registered with react-hook-form are unchanged (`remove_background`, `clahe`, `clip_limit`, `std_filtering`, `std_threshold`, `median_test`, `median_epsilon`, `median_threshold`, `step_1`, `roi_height`). `step_2` is no longer a field; it is derived text.

- [ ] **Step 1: Write the failing test.** Create `src/helpers/lspivSettings.test.ts`:

```ts
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const DIR = join(__dirname, '..', 'components', 'Forms', 'Components');
const read = (name: string) => readFileSync(join(DIR, name), 'utf8');

describe('LspivSettings replaces HardModeProcessing', () => {
  it('the old block is gone', () => {
    expect(existsSync(join(DIR, 'HardModeProcessing.tsx'))).toBe(false);
  });
});

describe('LspivSettings layout (rules 2, 3, 6, 7)', () => {
  const src = read('LspivSettings.tsx');

  it('hangs under the LSPIV row, threaded in its colour', () => {
    expect(src).toMatch(/className="tech-params"/);
    expect(src).toMatch(/'--tech': 'var\(--tech-lspiv\)'/);
  });

  it('uses three quiet group labels', () => {
    expect(src.match(/className="panel-group"/g)).toHaveLength(3);
  });

  it('uses compact switches and fields, no legacy pills or field titles', () => {
    expect(src.match(/className="switch switch-sm"/g)).toHaveLength(4);
    expect(src).not.toMatch(/field-title|switch-container|input-field-little|divider-line/);
  });

  it('renders each dependent only while its switch is on (rule 6)', () => {
    expect(src).toMatch(/\{clahe && \(/);
    expect(src).toMatch(/\{stdFiltering && \(/);
    expect(src).toMatch(/\{medianTestFiltering && \(/);
    expect(src.match(/field-row field-row-child/g)!.length).toBeGreaterThanOrEqual(4);
  });

  it('shows the second pass as text, not a read-only field (rule 7)', () => {
    expect(src).toMatch(/className="field-readonly"[^>]*>\s*\{step1 \/ 2\} px/);
    expect(src).not.toMatch(/readOnly/);
  });

  it('Test PIV is an outlined secondary button that keeps its busy sweep', () => {
    expect(src).toMatch(/className="btn btn-sm btn-secondary button-with-loader"/);
    expect(src).toMatch(/isBackendWorking && isTesting && <span className="btn-progress-sweep"/);
    expect(src).toMatch(/if \(isBackendWorking\) return;/);
  });
});

describe('Review Focus 2-4: values reach the form and the store', () => {
  const src = read('LspivSettings.tsx');

  it('every field forwards to react-hook-form before updating the store', () => {
    // A field that replaces the registered onChange leaves the form's copy
    // stale, which shows the moment a dependent unmounts and remounts.
    const forwards = src.match(/\.onChange\(event\)/g) ?? [];
    expect(forwards.length).toBe(9); // 4 switches + clip, std threshold, epsilon, median threshold, window size
  });

  it('Std filtering threshold is written to the store', () => {
    expect(src).toMatch(/onUpdateProcessing\(\{ stdThreshold:/);
  });

  it('changing the window size does not reset the whole form', () => {
    expect(src).not.toMatch(/\breset\(/);
    expect(src).toMatch(/setValue\('step_1', value\)/);
  });
});

describe('RoiHeightRow (Review Focus 5)', () => {
  const src = read('RoiHeightRow.tsx');
  it('is a section-level row', () => {
    expect(src).toMatch(/className="field-row field-row-top"/);
  });
  it('never recalculates the mask from an empty or non-positive value', () => {
    expect(src).toMatch(/if \(Number\.isNaN\(value\) \|\| value <= 0\) \{\s*setValue\('roi_height', heightRoi\);\s*return;/);
  });
});
```

The "9 forwards" count is deliberate: it fails if a future field forgets to forward. Count again if you add or remove a field and update the comment with it.

- [ ] **Step 2: Run it.** `npx jest src/helpers/lspivSettings.test.ts` → FAIL.

- [ ] **Step 3: Implement.** `git mv src/components/Forms/Components/HardModeProcessing.tsx src/components/Forms/Components/LspivSettings.tsx`, then replace its contents with:

```tsx
import { CSSProperties } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useDataSlice, useUiSlice } from '../../../hooks';
import { WINDOW_SIZES } from '../../../constants/constants';
import { EyeBtn } from '../../CustomIcons/EyeBtn';

/**
 * LSPIV's own settings, hung under its technique row in Advanced mode and tied
 * to it by a thread in its colour (preview 2026-10-01, rule 7). Every value
 * that needs a switch renders only while that switch is on (rule 6). Nothing
 * here can change mid-run.
 */
export const LspivSettings = ({
  id,
  onClickTest,
  isTesting,
}: {
  id: string;
  onClickTest: (event: React.MouseEvent<HTMLButtonElement>) => void;
  isTesting: boolean;
}) => {
  const { register, setValue } = useFormContext();
  const { processing, onUpdateProcessing, isBackendWorking } = useDataSlice();
  const { showInterrogationWindow, onSetShowInterrogationWindow } = useUiSlice();
  const { medianTestFiltering, clahe, stdFiltering, step1 } = processing.form;
  const { t } = useTranslation();

  const removeBackground = register('remove_background');
  const claheField = register('clahe');
  const clipLimit = register('clip_limit');
  const stdField = register('std_filtering');
  const stdThreshold = register('std_threshold');
  const medianField = register('median_test');
  const medianEpsilon = register('median_epsilon');
  const medianThreshold = register('median_threshold');
  const step1Field = register('step_1');

  /** The typed number, or null for an empty or partial entry the store must not see. */
  const numberOf = (event: React.ChangeEvent<HTMLInputElement>): number | null => {
    const value = parseFloat(event.currentTarget.value);
    return Number.isNaN(value) ? null : value;
  };

  return (
    <div className="tech-params" id={id} style={{ '--tech': 'var(--tech-lspiv)' } as CSSProperties}>
      <p className="panel-group">{t('Processing.preProcessing', { defaultValue: 'Pre-processing' })}</p>
      <div className="field-row">
        <span className="field-row-label">{t('Processing.removeBackground')}</span>
        <label className="switch switch-sm">
          <input
            type="checkbox"
            {...removeBackground}
            disabled={isBackendWorking}
            onChange={(event) => {
              removeBackground.onChange(event);
              onUpdateProcessing({ removeBackground: event.currentTarget.checked });
            }}
          />
          <span className="slider"></span>
        </label>
      </div>
      <div className="field-row">
        <span className="field-row-label">{t('Processing.clahe')}</span>
        <label className="switch switch-sm">
          <input
            type="checkbox"
            {...claheField}
            disabled={isBackendWorking}
            onChange={(event) => {
              claheField.onChange(event);
              onUpdateProcessing({ clahe: event.currentTarget.checked });
            }}
          />
          <span className="slider"></span>
        </label>
      </div>
      {clahe && (
        <div className="field-row field-row-child">
          <label className="field-row-label" htmlFor="processing-clip-limit">
            {t('Processing.clipLimit')}
          </label>
          <input
            id="processing-clip-limit"
            className="field"
            type="number"
            {...clipLimit}
            disabled={isBackendWorking}
            onChange={(event) => {
              clipLimit.onChange(event);
              const value = numberOf(event);
              if (value !== null) onUpdateProcessing({ clipLimit: value });
            }}
          />
        </div>
      )}

      <p className="panel-group">{t('Processing.filtering', { defaultValue: 'Filtering' })}</p>
      <div className="field-row">
        <span className="field-row-label">{t('Processing.stdFiltering')}</span>
        <label className="switch switch-sm">
          <input
            type="checkbox"
            {...stdField}
            disabled={isBackendWorking}
            onChange={(event) => {
              stdField.onChange(event);
              onUpdateProcessing({ stdFiltering: event.currentTarget.checked });
            }}
          />
          <span className="slider"></span>
        </label>
      </div>
      {stdFiltering && (
        <div className="field-row field-row-child">
          <label className="field-row-label" htmlFor="processing-std-threshold">
            {t('Processing.threshold')}
          </label>
          <input
            id="processing-std-threshold"
            className="field"
            type="number"
            {...stdThreshold}
            disabled={isBackendWorking}
            onChange={(event) => {
              stdThreshold.onChange(event);
              const value = numberOf(event);
              if (value !== null) onUpdateProcessing({ stdThreshold: value });
            }}
          />
        </div>
      )}
      <div className="field-row">
        <span className="field-row-label">{t('Processing.medianTestFiltering')}</span>
        <label className="switch switch-sm">
          <input
            type="checkbox"
            {...medianField}
            disabled={isBackendWorking}
            onChange={(event) => {
              medianField.onChange(event);
              onUpdateProcessing({ medianTestFiltering: event.currentTarget.checked });
            }}
          />
          <span className="slider"></span>
        </label>
      </div>
      {medianTestFiltering && (
        <>
          <div className="field-row field-row-child">
            <label className="field-row-label" htmlFor="processing-median-epsilon">
              {t('Processing.epsilon')}
            </label>
            <input
              id="processing-median-epsilon"
              className="field"
              type="number"
              step="0.01"
              {...medianEpsilon}
              disabled={isBackendWorking}
              onChange={(event) => {
                medianEpsilon.onChange(event);
                const value = numberOf(event);
                if (value !== null) onUpdateProcessing({ medianTestEpsilon: value });
              }}
            />
          </div>
          <div className="field-row field-row-child">
            <label className="field-row-label" htmlFor="processing-median-threshold">
              {t('Processing.threshold')}
            </label>
            <input
              id="processing-median-threshold"
              className="field"
              type="number"
              {...medianThreshold}
              disabled={isBackendWorking}
              onChange={(event) => {
                medianThreshold.onChange(event);
                const value = numberOf(event);
                if (value !== null) onUpdateProcessing({ medianTestThreshold: value });
              }}
            />
          </div>
        </>
      )}

      <p className="panel-group">{t('Processing.interrogationWindow', { defaultValue: 'Interrogation window' })}</p>
      <div className="field-row">
        <label className="field-row-label" htmlFor="processing-STEP_1">
          {t('Processing.windowSize', { defaultValue: 'Window size' })}
        </label>
        <span className="tech-params-inline">
          <EyeBtn
            active={showInterrogationWindow}
            action={() => onSetShowInterrogationWindow(!showInterrogationWindow)}
            noBorder={true}
          />
          <select
            id="processing-STEP_1"
            className="field field-wide field-select"
            {...step1Field}
            disabled={isBackendWorking}
            onChange={(event) => {
              step1Field.onChange(event);
              const value = parseInt(event.currentTarget.value);
              onUpdateProcessing({ step1: value });
              setValue('step_1', value);
            }}
          >
            <option value="512">{WINDOW_SIZES.BIG}</option>
            <option value="256">{WINDOW_SIZES.MEDIUM}</option>
            <option value="128">{WINDOW_SIZES.SMALL}</option>
            <option value="64">{WINDOW_SIZES.TINY}</option>
          </select>
        </span>
      </div>
      <div className="field-row field-row-child">
        <span className="field-row-label">{t('Processing.secondPass', { defaultValue: 'Second pass' })}</span>
        <span className="field-readonly" id="processing-STEP_2">
          {step1 / 2} px
        </span>
      </div>

      <button
        id="test-button"
        type="button"
        className="btn btn-sm btn-secondary button-with-loader"
        aria-busy={(isBackendWorking && isTesting) || undefined}
        aria-disabled={(isBackendWorking && !isTesting) || undefined}
        onClick={(event) => {
          if (isBackendWorking) return;
          onClickTest(event);
        }}
      >
        {t('Processing.test')}
        {isBackendWorking && isTesting && <span className="btn-progress-sweep" aria-hidden="true" />}
      </button>
    </div>
  );
};
```

`.onChange(event)` occurrences: removeBackground, claheField, clipLimit, stdField, stdThreshold, medianField, medianEpsilon, medianThreshold, step1Field = 9.

Check `onUpdateProcessing`'s parameter type in `src/hooks/useDataSlice.ts` (the interface around line 59). If `clipLimit`, `medianTestEpsilon` or `medianTestThreshold` are typed as `string` there, the old code was storing strings: change those three to `number` in that interface (the store defaults in `src/store/data/dataSlice.ts` and `loadProjectHelpers.ts` already hold numbers; confirm by reading both). If a type is wider than that, report it rather than casting.

Create `src/components/Forms/Components/RoiHeightRow.tsx`:

```tsx
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useDataSlice, useUiSlice } from '../../../hooks';

/**
 * ROI height applies to the whole cross-section, not to one technique, so it
 * sits beside Station number at the top (Advanced only), not under LSPIV.
 */
export const RoiHeightRow = () => {
  const { register, setValue } = useFormContext();
  const { processing, onUpdateProcessing, onReCalculateMask, isBackendWorking } = useDataSlice();
  const { onAddStepAlert, onClearStepAlert } = useUiSlice();
  const { heightRoi } = processing.form;
  const { t } = useTranslation();

  const commit = async (event: React.SyntheticEvent<HTMLInputElement>) => {
    if ((event as React.KeyboardEvent<HTMLInputElement>).key !== 'Enter' && event.type !== 'blur') return;
    event.preventDefault();
    const value = parseInt((event.target as HTMLInputElement).value);
    if (Number.isNaN(value) || value <= 0) {
      setValue('roi_height', heightRoi);
      return;
    }
    if (value === heightRoi) return;
    onClearStepAlert('processing-roi-recalc-error');
    try {
      await onReCalculateMask(value);
      onUpdateProcessing({ heightRoi: value });
    } catch (error) {
      onAddStepAlert('processing-roi-recalc-error', 'error', (error as Error).message);
    }
  };

  return (
    <div className="field-row field-row-top">
      <label className="field-row-label" htmlFor="processing-roi-height">
        {t('Processing.roiHeight')}
      </label>
      <input
        id="processing-roi-height"
        className="field"
        type="number"
        {...register('roi_height')}
        disabled={isBackendWorking}
        onKeyDown={commit}
        onBlur={commit}
      />
    </div>
  );
};
```

(The old handler focused `#processing-HEADER` after a recalculation; no element has that id, so the line is dropped.)

In `src/components/Forms/Components/index.ts`, replace the `HardModeProcessing` export with `LspivSettings` and add `RoiHeightRow`. Run `grep -rn "HardModeProcessing" src` → the only hit left is `FormProcessing.tsx` (Task 6 replaces it) and comments in `listPrimitiveAdoption.test.ts`; update that test's comment to say `LspivSettings.tsx`.

In `src/helpers/loaderRetirement.test.ts`, change the path `components/Forms/Components/HardModeProcessing.tsx` to `components/Forms/Components/LspivSettings.tsx`.

In `en/global.json` → `Processing`, add: `"preProcessing": "Pre-processing"`, `"filtering": "Filtering"`, `"interrogationWindow": "Interrogation window"`, `"windowSize": "Window size"`, `"secondPass": "Second pass"`.

So this task builds on its own, change `FormProcessing.tsx`'s `<HardModeProcessing active={extraFields} … />` line to:

```tsx
{extraFields && <LspivSettings id="lspiv-settings" onClickTest={handleOnClickTest} isTesting={isTesting} />}
```

and update its import. Task 6 moves it under the LSPIV row.

- [ ] **Step 4: Run.** `npx jest src/helpers/lspivSettings.test.ts src/helpers/loaderRetirement.test.ts src/helpers/listPrimitiveAdoption.test.ts` → PASS. Full suite, tsc, lint as expected.

- [ ] **Step 5: Commit.**

```bash
git add src/components/Forms/Components/LspivSettings.tsx src/components/Forms/Components/HardModeProcessing.tsx src/components/Forms/Components/RoiHeightRow.tsx src/components/Forms/Components/index.ts src/components/Forms/FormProcessing.tsx src/hooks/useDataSlice.ts src/helpers/lspivSettings.test.ts src/helpers/loaderRetirement.test.ts src/helpers/listPrimitiveAdoption.test.ts src/translations/en/global.json
git commit -m "Task 5: Rebuild the advanced block as LSPIV's own settings and fix the values it dropped"
```

(Drop `src/hooks/useDataSlice.ts` from the list if Step 3 did not change it.)

---

### Task 6: Assemble the Processing panel

**Files:**
- Modify: `src/components/Forms/FormProcessing.tsx`, `src/pages/Processing.tsx`
- Modify: `src/components/Forms/form.css`, `src/index.css` (`.tech-row`)
- Create: `src/helpers/processingPanelLayout.test.ts`
- Must stay green unchanged: `src/helpers/previewModeAdoption.test.ts`, `src/helpers/techniqueRowCss.test.ts`, `src/helpers/listPrimitiveAdoption.test.ts`

**Interfaces:**
- Consumes: `ProcessingRunZone`, `AnalyzingProgress({ state })` (Task 4); `useAnalyzeStage`, `enabledStages`, `techniqueRunStatus` (Task 3); `LspivSettings`, `RoiHeightRow` (Task 5); `.field-row`, `.field`, `.panel-rule` (Task 1).
- Produces: `FormProcessing` returns a fragment of two siblings for `.form-container`: the scrolling `.body.processing-body` and the `ProcessingRunZone`. Props unchanged.

- [ ] **Step 1: Write the failing test.** Create `src/helpers/processingPanelLayout.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { scanCss } from './cssScanner';

const SRC = join(__dirname, '..');
const form = readFileSync(join(SRC, 'components', 'Forms', 'FormProcessing.tsx'), 'utf8');

const cssDecl = (file: string) => {
  const { rules, declarations } = scanCss(readFileSync(join(SRC, file), 'utf8'));
  return (selector: string, property: string) => {
    const rule = rules.filter((r) => r.prelude === selector).pop();
    return rule && declarations.filter((d) => d.rule === rule.index && d.property === property).pop()?.value;
  };
};

describe('Processing panel order (preview, all three states)', () => {
  const order = [
    'id="stations-number"',
    '<RoiHeightRow',
    'className="panel-rule"',
    'technique="lspiv"',
    '<LspivSettings',
    'technique="stiv"',
    'technique="iwave"',
    '<ProcessingRunZone',
  ];
  it('reads top to bottom as Station number, ROI height, rule, LSPIV + its settings, STIV, iWave, run zone', () => {
    const at = order.map((needle) => form.indexOf(needle));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('ROI height and LSPIV settings exist only in Advanced', () => {
    expect(form).toMatch(/\{extraFields && <RoiHeightRow \/>\}/);
    expect(form).toMatch(/\{extraFields && lspivOpen && \(/);
  });

  it('the run zone sits outside the scrolling body', () => {
    expect(form.indexOf('<ProcessingRunZone')).toBeGreaterThan(form.indexOf('</FormProvider>'));
    expect(form).toMatch(/className=\{`body processing-body/);
  });

  it('has one Analyze and one Stop, both inside the run zone', () => {
    expect(form).not.toMatch(/id="analize-button"|id="stop-button"/);
  });

  it('no legacy dividers or titles in the panel', () => {
    expect(form).not.toMatch(/divider-line|switch-container|input-field-little|processing-header/);
  });
});

describe('LSPIV disclosure (rule 7, D5)', () => {
  it('is a labelled icon button that names what it controls', () => {
    expect(form).toMatch(/aria-expanded=\{lspivOpen\}/);
    expect(form).toMatch(/aria-controls="lspiv-settings"/);
    expect(form).toMatch(/useState<boolean>\(true\)/);
  });
  it('only exists in Advanced', () => {
    expect(form).toMatch(/\{extraFields && \(\s*<span className="tech-cell tech-disclose">/);
  });
});

describe('per-row run status replaces the breadcrumb', () => {
  it('each row asks techniqueRunStatus about itself', () => {
    for (const technique of ['lspiv', 'stiv', 'iwave']) {
      expect(form).toContain(`<RunStatus status={statusOf('${technique}')} />`);
    }
  });
});

describe('Processing panel CSS', () => {
  const formCss = cssDecl('components/Forms/form.css');
  const indexCss = cssDecl('index.css');

  it('canary', () => expect(formCss('.form-container', 'display')).toBe('flex'));

  it('the settings scroll and the run zone does not', () => {
    expect(formCss('.form-container .body.processing-body', 'flex')).toBe('1 1 auto');
    expect(formCss('.form-container .body.processing-body', 'min-height')).toBe('0');
  });

  it('technique rows are 40px (D7) and gain a disclosure column in Advanced (D3)', () => {
    expect(indexCss('.tech-row', 'min-height')).toBe('40px');
    expect(formCss('.processing-form.is-advanced .tech-row', 'grid-template-columns')).toBe(
      '12px 1fr 28px 78px 28px 28px'
    );
  });

  it('LSPIV settings line up with the technique name and hang on a thread in its colour', () => {
    expect(formCss('.tech-params', 'padding-left')).toBe('calc(var(--space-2) + 12px + var(--space-2))');
    expect(formCss('.tech-params::before', 'background')).toBe('color-mix(in srgb, var(--tech) 55%, transparent)');
  });

  it('the chevron turns when open', () => {
    expect(formCss(".tech-disclose [aria-expanded='true'] svg", 'transform')).toBe('rotate(180deg)');
  });

  it('a running row reads in primary text, the others muted', () => {
    expect(formCss('.tech-status', 'color')).toBe('var(--text-subdued)');
    expect(formCss('.tech-status.tech-status-running', 'color')).toBe('var(--text-primary)');
  });
});
```

- [ ] **Step 2: Run it.** `npx jest src/helpers/processingPanelLayout.test.ts` → FAIL.

- [ ] **Step 3: Implement `FormProcessing.tsx`.** Keep every existing handler, label and guard (`previewModeAdoption.test.ts` reads them; the name button must stay the first `<button>` after each `<TechniqueRow`, within 1400 characters). Changes:

1. Imports: add `ProcessingRunZone`, `LspivSettings`, `RoiHeightRow` from `./Components` (drop `HardModeProcessing`); `enabledStages`, `techniqueRunStatus`, `TechniqueRunStatus` from `../../helpers/analyzeRunState`; `StageKey` type from `../../helpers/parseAnalyzeStage`.
2. Delete dead code: the `step_2` default value, `handleTab` and the form's `onKeyDown={handleTab}` (it only logged), the `add-mask-icon` branch of `handleOnClick` (no element has that id in this form). Split `handleOnClick` into:

```tsx
  const handleAnalyze = () => {
    if (isBackendWorking) return;
    setIsTesting(false);
    onClearStepAlert('processing-backend-error');
    onSetQuiverAll()
      .then(() => setShowMedian(true))
      .catch((error) => onAddStepAlert('processing-backend-error', 'error', error.message));
  };

  const handleStop = () => {
    onKillBackend();
  };
```

   and drop `setResetProgress` from `handleOnClickTest` (already done in Task 4 if it compiled; check).
3. Add state and status:

```tsx
  const running = isBackendWorking && !isTesting;
  const runState = useAnalyzeStage(running);
  const stages = enabledStages(stiv, iwave);
  const statusOf = (technique: StageKey): TechniqueRunStatus | null =>
    running ? techniqueRunStatus(technique, stages, runState.stage) : null;
  // D5: open the first time Advanced turns on; a collapse lasts while this step is mounted.
  const [lspivOpen, setLspivOpen] = useState<boolean>(true);
```

4. Add, above `FormProcessing` in the same file:

```tsx
/** A technique row's own run status, replacing the LSPIV → STIV → iWave breadcrumb. */
const RunStatus = ({ status }: { status: TechniqueRunStatus | null }) => {
  const { t } = useTranslation();
  if (status === null) return null;
  const text = {
    done: t('Processing.statusDone', { defaultValue: 'Done' }),
    running: t('Processing.statusRunning', { defaultValue: 'Running' }),
    queued: t('Processing.statusQueued', { defaultValue: 'Queued' }),
  }[status];
  return <span className={`tech-status${status === 'running' ? ' tech-status-running' : ''}`}>{text}</span>;
};
```

5. Replace the returned JSX with this structure (unchanged inner pieces shown as `…same as today…` are copied verbatim from the current file; nothing inside them changes except where shown):

```tsx
  return (
    <>
      <div className={`body processing-body${extraFields ? ' is-advanced' : ''}`} id="form-analizing">
        <div className="wrapper">
          <FormProvider {...methods}>
            <form id="form-processing" className={`processing-form${extraFields ? ' is-advanced' : ''}`}>
              <div className="field-row field-row-top">
                <label className="field-row-label" htmlFor="stations-number">
                  {t('Results.stationNumber')}
                </label>
                <span className="field-stepper">
                  <button type="button" className="btn-step" onClick={() => handleStationsStep(-1)}>
                    −
                  </button>
                  <input
                    key={name}
                    className="field"
                    type="number"
                    defaultValue={numStations}
                    {...methods.register(`${name}_STATIONS_NUMBER`)}
                    id="stations-number"
                    onKeyDown={handleStationsChangeInput}
                    onBlur={handleStationsChangeInput}
                  />
                  <button type="button" className="btn-step" onClick={() => handleStationsStep(1)}>
                    +
                  </button>
                </span>
              </div>
              <FieldError name="stations-number" />
              {extraFields && <RoiHeightRow />}

              <hr className="panel-rule" />

              <TechniqueRow technique="lspiv" active={previewMode === 'frames'} className="tech-row technique-row-processing">
                <span className="tech-name-cell">
                  {/* …same LSPIV name <button className="field-title" …> as today… */}
                  <RunStatus status={statusOf('lspiv')} />
                </span>
                <ExportMp4 />
                {/* …same Median technique-seed-flag button as today… */}
                {/* …same LSPIV ✓ ibtn (pressed, aria-disabled, early return) as today… */}
                {extraFields && (
                  <span className="tech-cell tech-disclose">
                    <button
                      type="button"
                      className="ibtn ibtn-sm"
                      aria-expanded={lspivOpen}
                      aria-controls="lspiv-settings"
                      aria-label={t('Processing.lspivSettings', { defaultValue: 'LSPIV settings' })}
                      title={t('Processing.lspivSettings', { defaultValue: 'LSPIV settings' })}
                      onClick={() => setLspivOpen(!lspivOpen)}
                    >
                      {Icons.ChevDown('currentColor')}
                    </button>
                  </span>
                )}
              </TechniqueRow>
              {extraFields && lspivOpen && (
                <LspivSettings id="lspiv-settings" onClickTest={handleOnClickTest} isTesting={isTesting} />
              )}

              <TechniqueRow technique="stiv" /* …same props as today… */>
                <span className="tech-name-cell">
                  {/* …same STIV name button and angle-reset button as today… */}
                  <RunStatus status={statusOf('stiv')} />
                </span>
                {/* …same two empty tech-cells and STIV ✓ as today… */}
              </TechniqueRow>

              <TechniqueRow technique="iwave" /* …same props as today… */>
                <span className="tech-name-cell">
                  {/* …same iWave name button as today… */}
                  <RunStatus status={statusOf('iwave')} />
                </span>
                {/* …same two empty tech-cells and iWave ✓ as today… */}
              </TechniqueRow>
            </form>
          </FormProvider>
        </div>
      </div>
      <ProcessingRunZone running={running} testing={isBackendWorking && isTesting} onAnalyze={handleAnalyze} onStop={handleStop}>
        <AnalyzingProgress state={runState} />
      </ProcessingRunZone>
    </>
  );
```

   Check `Icons.ChevDown`'s signature in `src/components/CustomIcons/Icons.tsx` (`(c?: string, rot?: number)`); pass only the colour so CSS owns the rotation. When `extraFields` turns false, `lspivOpen` keeps its value, so turning Advanced back on restores the last open/closed state.

6. `src/pages/Processing.tsx`: no JSX change beyond Task 2. Confirm `<FormProcessing … />` still sits between `<StepAlertList />` and `<div className="footer">`; the fragment's two children become flex items of `.form-container`.

- [ ] **Step 4: Implement the CSS.** In `src/index.css`, `.tech-row`: `min-height: 34px` → `min-height: 40px` (D7). In `src/components/Forms/form.css`:
   - In the `#form-result .divider-line, #form-processing .divider-line` rule, remove `#form-processing .divider-line` from the selector list.
   - Append:

```css
/* Processing panel (preview 2026-10-01). The settings scroll; the run zone
   below them and the footer never move. .body's height: 100% would push the
   run zone off the panel, so this body flexes instead. */
.form-container .body.processing-body {
    flex: 1 1 auto;
    min-height: 0;
    height: auto;
    margin-bottom: 0;
    padding-bottom: 0;
}

.processing-form {
    padding: 0 var(--space-4) var(--space-4);
}

.field-stepper {
    display: flex;
    align-items: center;
    gap: 6px;
}

/* D3: the disclosure column exists only in Advanced, so Basic keeps today's
   five columns. */
.processing-form.is-advanced .tech-row {
    grid-template-columns: 12px 1fr 28px 78px 28px 28px;
}

.tech-disclose svg {
    transition: transform 200ms var(--motion-ease);
}

.tech-disclose [aria-expanded='true'] svg {
    transform: rotate(180deg);
}

.tech-status {
    margin-left: var(--space-2);
    font-size: var(--text-caption);
    font-weight: 500;
    color: var(--text-subdued);
    white-space: nowrap;
}

.tech-status.tech-status-running {
    color: var(--text-primary);
}

/* A technique's own settings, hung under its row. Labels start on the
   technique name's edge (row inset + 12px swatch + gap); the 1px thread runs
   through the swatch's centre in the technique's colour, which is what scales
   to iWave when its settings arrive. */
.tech-params {
    position: relative;
    margin: 2px 0 var(--space-3);
    padding-left: calc(var(--space-2) + 12px + var(--space-2));
}

.tech-params::before {
    content: '';
    position: absolute;
    left: calc(var(--space-2) + 6px - 0.5px);
    top: 0;
    bottom: 4px;
    width: 1px;
    background: color-mix(in srgb, var(--tech) 55%, transparent);
}

.tech-params .field-row {
    min-height: 36px;
    padding-left: 0;
}

.tech-params .field-row.field-row-child {
    padding-left: var(--space-4);
}

.tech-params .panel-group {
    padding-left: 0;
}

.tech-params-inline {
    display: flex;
    align-items: center;
    gap: var(--space-1);
}

/* Test PIV sits next to what it tests. .button-with-loader's 165px floor was
   for a spinner child; the sweep is absolutely positioned and moves nothing. */
.tech-params .button-with-loader {
    min-width: 0;
    margin-top: var(--space-3);
}
```

   Then delete CSS this task orphaned. For each class, `grep -rn "<class>" src --include="*.tsx"` first; delete the rule only on zero hits: `.analize-output`, `.spacer-div`, `.input-container-2` (expect hits elsewhere, keep), `.hard-mode-processing` (still used by `HardModeCrossSections` until Task 9, keep).

- [ ] **Step 5: Run.** `npx jest src/helpers/processingPanelLayout.test.ts src/helpers/previewModeAdoption.test.ts src/helpers/techniqueRowCss.test.ts src/helpers/listPrimitiveAdoption.test.ts src/helpers/typeAndRadiusScale.test.ts src/helpers/reducedMotion.test.ts` → PASS. Full suite, tsc, lint as expected.

- [ ] **Step 6: See it.** Use the `run` skill to launch the app, open a project at the Processing step and compare against the preview in all three themes (Settings → theme): Basic, Advanced with LSPIV open, and a run in progress. Check: Station number and the technique rows share a left edge; every control ends on one right edge; Analyze does not move when LSPIV's settings open; CLAHE off hides Clip limit and on restores the value you typed (Review Focus 2); Stop appears in Analyze's place; rows read Done/Running/Queued; a second Analyze after Stop opens on `–` (Review Focus 1). Note anything that differs from the preview in the task report with a screenshot.

- [ ] **Step 7: Commit.**

```bash
git add src/components/Forms/FormProcessing.tsx src/components/Forms/form.css src/index.css src/helpers/processingPanelLayout.test.ts src/translations/en/global.json
git commit -m "Task 6: Hang LSPIV's settings under its row and fix the run zone above the footer"
```

(Add `"lspivSettings": "LSPIV settings"` to `Processing` in `en/global.json` in this task.)

---

## Part B: the rules on every other Advanced block

Every remaining Advanced block is built from two components, `RealWorldCoordinates` and `PixelCoordinates` (Oblique, UAV, Cross sections), plus the Video step's `FramesResolution` and `LensCorrection`. Moving those onto the primitives covers every panel's Advanced section. The panels' basic sections are not in this plan.

### Task 7: Coordinate blocks on the row grammar

**Files:**
- Modify: `src/components/Forms/Components/RealWorldCoordinates.tsx`, `PixelCoordinates.tsx`, `HardModeOblique.tsx`, `HardModeUav.tsx`, `HardModeCrossSections.tsx`
- Modify: `src/components/Forms/form.css`
- Create: `src/helpers/panelRulesRollout.test.ts`

**Interfaces:**
- Consumes: Task 1 classes; `getLabelStyle(type, step, fields, index): '' | 'red' | 'green' | 'lightblue'` from `src/helpers/hardModeFormHelpers.ts` (unchanged).
- Produces: `.point-label`, `.point-dot`, `.point-dot-red|green|lightblue`, `.field-coord`, `.field-unit`, `.panel-advanced`.

Rule 2 bans pill labels; D8 keeps each point's colour as a ringed dot beside a neutral label. Element ids that other code scrolls to stay: `REAL_WORLD`, `pixel-coordinates`, `span-footer`, `span-footer-${name}`, `${name}-form-cross-section-footer`, and each input's `id={name}`.

- [ ] **Step 1: Write the failing test.** Create `src/helpers/panelRulesRollout.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { scanCss } from './cssScanner';
import { contrastRatio, parseThemeTokens, resolveRgb, ThemeName } from './themeTokens';

const SRC = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
const C = 'components/Forms/Components/';

describe('coordinate blocks (rules 2, 3)', () => {
  for (const file of ['RealWorldCoordinates.tsx', 'PixelCoordinates.tsx']) {
    const src = read(C + file);
    it(`${file}: rows, not pills`, () => {
      expect(src).toMatch(/className="field-row"/);
      expect(src).not.toMatch(/read-only|input-container-2|input-field-container|form-subtitle|only-one-item/);
    });
    it(`${file}: the title is a quiet group label that keeps its scroll id`, () => {
      expect(src).toMatch(/<p className="panel-group" id="(REAL_WORLD|pixel-coordinates)"/);
    });
    it(`${file}: the point colour is a dot beside a neutral label (D8)`, () => {
      expect(src).toMatch(/className=\{`point-dot point-dot-\$\{style\}`\}/);
      expect(src).toMatch(/className="field field-coord"/);
    });
  }

  it('the advanced wrappers drop their one-off padding for the shared gutter', () => {
    for (const file of ['HardModeOblique.tsx', 'HardModeUav.tsx', 'HardModeCrossSections.tsx']) {
      const src = read(C + file);
      expect(src).toMatch(/panel-advanced/);
      expect(src).toMatch(/<hr className="panel-rule" \/>/);
      expect(src).not.toMatch(/hard-mode-processing|paddingLeft/);
    }
  });
});

describe('point dots are findable in every theme (D8)', () => {
  const css = read('index.css');
  const themes = parseThemeTokens(css);
  // The ring, not the fill, carries the edge in light, where --d23 and --d12
  // sit at 1.77 and 1.38 against the panel. Floors just under the measured
  // ring contrast; report a failure, never lower a floor.
  it.each(['dark', 'light', 'dracula'] as ThemeName[])('%s: the ring stands off the panel', (name) => {
    const t = themes[name];
    expect(contrastRatio(resolveRgb(t, '--text-subdued'), resolveRgb(t, '--surface-panel'))).toBeGreaterThanOrEqual(3);
  });

  const { rules, declarations } = scanCss(read('components/Forms/form.css'));
  const decl = (selector: string, property: string) => {
    const rule = rules.filter((r) => r.prelude === selector).pop();
    return rule && declarations.filter((d) => d.rule === rule.index && d.property === property).pop()?.value;
  };
  it('canary', () => expect(decl('.form-container', 'display')).toBe('flex'));
  it('the dot has a ring and the point colours', () => {
    expect(decl('.point-dot', 'box-shadow')).toBe('0 0 0 1px var(--text-subdued)');
    expect(decl('.point-dot-red', 'background')).toBe('var(--d34)');
    expect(decl('.point-dot-green', 'background')).toBe('var(--d23)');
    expect(decl('.point-dot-lightblue', 'background')).toBe('var(--d12)');
  });
});
```

Before relying on the ring floor of 3, measure `--text-subdued` against `--surface-panel` in each theme with `themeTokens` (a two-line script, as in this plan's planning notes). If any theme is under 3, set that theme's floor just under its measured value, and tell the product owner the dot's edge is weaker there.

- [ ] **Step 2: Run it.** `npx jest src/helpers/panelRulesRollout.test.ts` → FAIL.

- [ ] **Step 3: Implement.** In both `RealWorldCoordinates.tsx` and `PixelCoordinates.tsx`, keep all logic (`handleInputField`, error keys, `register` names, the next-field focus) and replace the returned JSX. `RealWorldCoordinates`:

```tsx
  return (
    <>
      <p className="panel-group" id="REAL_WORLD">
        {t(`${modeName}.RealWorld.title`)}
      </p>
      {pointsNames.map((name, i) => {
        const style = getLabelStyle(type, step, fields, i);
        const prefix = step === 3 ? type : section;
        const next = `${pointsNames[i === fields - 1 ? i : i + 1]}`;
        return (
          <Fragment key={i}>
            <div className="field-row">
              <label className="field-row-label point-label" htmlFor={name}>
                {style && <span className={`point-dot point-dot-${style}`} aria-hidden="true" />}
                {t(`${modeName}.RealWorld.${name}`)}
              </label>
              <span className="field-with-unit">
                <input
                  type="number"
                  step="any"
                  className="field field-coord"
                  id={`${name}`}
                  {...register(`${prefix}_${name}`)}
                  onKeyDown={(event) => handleInputField(event, next)}
                  onBlur={(event) => handleInputField(event, next)}
                />
                {showUnitLabel && <span className="field-unit">{unitLabel}</span>}
              </span>
            </div>
            <FieldError name={fieldErrorName(pointsNames[i])} />
          </Fragment>
        );
      })}
    </>
  );
```

with `import { Fragment } from 'react';`. `PixelCoordinates` is the same shape with `id="pixel-coordinates"`, `t(\`${modeName}.Pixel.title\`)`, `t(\`${modeName}.Pixel.${name}\`)` and no unit span. This also removes the duplicated input that the `showUnitLabel` ternary carried.

Wrappers:
- `HardModeOblique.tsx`: `<div className={extraFields ? 'panel-advanced' : 'hidden'}>` and an `<hr className="panel-rule" />` as its first child.
- `HardModeUav.tsx`: `<div id="hard-mode-uav" className="panel-advanced">` with the same `<hr>` first.
- `HardModeCrossSections.tsx`: `<div className={extraFields ? 'panel-advanced' : 'hidden'}>` (drop the `style` prop) with the same `<hr>` first.

Append to `form.css`:

```css
/* Advanced blocks on the other panels: the same gutter as Processing. */
.panel-advanced {
    width: 100%;
    box-sizing: border-box;
    padding: 0 var(--space-4) var(--space-4);
}

/* D8: the point colour rides on a dot, not a pill. The ring keeps the dot
   findable in light, where the fills sit near the panel. */
.point-label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
}

.point-dot {
    width: 10px;
    height: 10px;
    flex-shrink: 0;
    border-radius: 50%;
    box-shadow: 0 0 0 1px var(--text-subdued);
}

.point-dot-red { background: var(--d34); }
.point-dot-green { background: var(--d23); }
.point-dot-lightblue { background: var(--d12); }

/* Coordinates need room for UTM-sized values. */
.field.field-coord {
    width: 120px;
    text-align: right;
}

.field-with-unit {
    display: flex;
    align-items: center;
    gap: var(--space-1);
}

.field-unit {
    font-size: var(--text-caption);
    color: var(--text-subdued);
}
```

Check red = left, green = right still holds: `getLabelStyle` is unchanged, so the same index gets the same colour. Then delete the rules nothing uses any more, each only after `grep -rn "<class>" src --include="*.tsx"` returns nothing: `.hard-mode-processing` (both the rule and the one inside the media query near the top of `form.css`), `.only-one-item`, `.label-priority.read-only`, `.input-field-container-compact` rules. Keep `.read-only`, `.input-container-2` and `.form-subtitle` unless the grep shows zero consumers.

- [ ] **Step 4: Run.** `npx jest src/helpers/panelRulesRollout.test.ts` → PASS. Full suite, tsc, lint as expected. Then use the `run` skill: on Oblique, UAV and Cross sections, turn Advanced on in each theme and confirm the dots sit next to the right labels and that typing a coordinate + Enter still moves to the next field and updates the canvas point.

- [ ] **Step 5: Commit.**

```bash
git add src/components/Forms/Components/RealWorldCoordinates.tsx src/components/Forms/Components/PixelCoordinates.tsx src/components/Forms/Components/HardModeOblique.tsx src/components/Forms/Components/HardModeUav.tsx src/components/Forms/Components/HardModeCrossSections.tsx src/components/Forms/form.css src/helpers/panelRulesRollout.test.ts
git commit -m "Task 7: Put the coordinate blocks on the panel row grammar with point-colour dots"
```

---

### Task 8: Video step's Advanced blocks

**Files:**
- Modify: `src/components/Forms/Components/FramesResolution.tsx`, `LensCorrection.tsx`, `src/components/Forms/FormVideo.tsx`, `src/pages/pages.css`
- Modify: `src/helpers/panelRulesRollout.test.ts`

**Interfaces:**
- Consumes: Task 1 classes. `LensDropdown` is unchanged (it owns `.lens-row-select`, which stays).

- [ ] **Step 1: Add the failing tests** to `src/helpers/panelRulesRollout.test.ts`:

```ts
describe('Video Advanced blocks (rules 2, 3, 6)', () => {
  const frames = read(C + 'FramesResolution.tsx');
  const lens = read(C + 'LensCorrection.tsx');

  it('Frames resolution: a group label over one row', () => {
    expect(frames).toMatch(/<p className="panel-group"/);
    expect(frames).toMatch(/className="field-row"/);
    expect(frames).not.toMatch(/field-title|lens-row\b|lens-row-label|lens-settings|style=\{\{/);
  });

  it('Lens correction: a compact switch, with camera and lens as its dependents', () => {
    expect(lens).toMatch(/className="switch switch-sm"/);
    expect(lens.match(/field-row field-row-child/g)!.length).toBeGreaterThanOrEqual(2);
    expect(lens).not.toMatch(/switch-container|field-title|lens-row\b|lens-row-label|lens-settings/);
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement.** `FramesResolution.tsx` return:

```tsx
  return (
    <div id="video-resolution">
      <p className="panel-group">{t('VideoRange.framesResolution')}</p>
      <div className="field-row">
        <span className="field-row-label">{t('VideoRange.ExtraInfo.resolution').replace(':', '').trim()}</span>
        <LensDropdown
          options={resolutions}
          value={readOnly ? 1 : factor}
          onChange={(v) => onChangeFramesResolution(v as number)}
          disabled={readOnly}
        />
      </div>
    </div>
  );
```

`LensCorrection.tsx`: keep all logic and `settingsRef`; replace the return with:

```tsx
  return (
    <div>
      <div className="field-row">
        <label className="field-row-label" htmlFor="lens-correction-toggle">
          {t('VideoRange.lensCorrection')}
        </label>
        <label className="switch switch-sm">
          <input
            id="lens-correction-toggle"
            type="checkbox"
            checked={enabled}
            disabled={noProfiles && !enabled}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>
      {enabled &&
        (noProfiles ? (
          <p className="field-row field-row-child field-row-label">{t('VideoRange.noProfiles')}</p>
        ) : (
          <div ref={settingsRef}>
            <div className="field-row field-row-child">
              <span className="field-row-label">{t('Calibration.cameraName')}</span>
              <LensDropdown
                options={profiles.map((g) => ({ label: g.camera, value: g.camera }))}
                value={selectedCamera}
                onChange={(v) => handleCameraChange(v as string)}
                onOpen={scrollBodyToBottom}
              />
            </div>
            {selectedGroup && !selectedGroup.isLegacy && (
              <div className="field-row field-row-child">
                <span className="field-row-label">{t('Calibration.lensName')}</span>
                <LensDropdown
                  options={selectedGroup.lenses!.map((l) => ({ label: l.name, value: l.path }))}
                  value={lensCorrection ?? ''}
                  onChange={(v) => onSetLensCorrection(v as string)}
                  onOpen={scrollBodyToBottom}
                />
              </div>
            )}
          </div>
        ))}
    </div>
  );
```

If `scrollBodyToBottom` or `settingsRef` reads `.lens-settings` by class, switch it to the ref. Then, in `src/pages/pages.css`, delete `.lens-row`, `.lens-row:last-child`, `.lens-row-label`, `.lens-row-right`, `.lens-settings`, `.lens-correction-section` after `grep -rn` confirms zero `.tsx` consumers for each. `.lens-row-select` stays.

The Video form's Advanced block sits in `FormVideo.tsx` lines ~224-225 (`{extraFields && <FramesResolution />}`, `{extraFields && <LensCorrection />}`). Wrap the pair in `{extraFields && (<div className="panel-advanced"><hr className="panel-rule" /><FramesResolution /><LensCorrection /></div>)}` so the Video panel gets the same gutter and divider as the others.

- [ ] **Step 4: Run** the rollout test → PASS; full suite, tsc, lint. Use the `run` skill on the Video step in all three themes: Advanced on, lens correction on, pick a camera and lens; the dropdowns open and the panel scrolls as before.

- [ ] **Step 5: Commit.**

```bash
git add src/components/Forms/Components/FramesResolution.tsx src/components/Forms/Components/LensCorrection.tsx src/components/Forms/FormVideo.tsx src/pages/pages.css src/helpers/panelRulesRollout.test.ts
git commit -m "Task 8: Put the Video step's Advanced blocks on the panel row grammar"
```

---

### Task 9: Close out

**Files:** this plan; memory.

- [ ] **Step 1:** Full verification on the final tree: `npx jest 2>&1 | tail -4`, `npx tsc --noEmit 2>&1 | grep -c "error TS"`, `npm run lint 2>&1 | grep problems`. Compare to Task 0's baseline plus the suites added (7 new test files). tsc and lint not above baseline.
- [ ] **Step 2:** `grep -rn "LockBtn\|HardModeProcessing\|analize-stage-breadcrumb\|resetProgress" src` → no output outside comments that explain history.
- [ ] **Step 3:** Theme walkthrough with the `run` skill: Processing (Basic, Advanced, running), Oblique, UAV, Cross sections, Video, each in dark, light and dracula. Attach screenshots of Processing in all three themes to the report.
- [ ] **Step 4:** Append an `## Outcome` section to this plan: what shipped, every deviation from the preview with its reason, decisions D1–D9 as finally taken, and the owed follow-ups (translations for the new keys in 11 locales; app-wide light-field decision A6 still open for `.input-field`; basic sections of the other panels not yet on the row grammar).
- [ ] **Step 5:** Commit the plan update: `git add docs/superpowers/plans/2026-10-01-processing-panel-advanced.md && git commit -m "Plan: Record the Processing panel redesign's outcome"`.

---

## Outcome

Executed inline on 2026-10-01 (Tasks 0-8), then closed out. Tasks 1-8 are commits `4347c05` to `2c9e146` on `ui/design-refresh`; the 22 pre-existing pending edits went in first as `2d91faa`.

**Final numbers** (baseline in brackets): suites 93 (86), tests 1017 (931), tsc errors 68 (68), lint 22 problems, 19 errors, 3 warnings (23 / 20 / 3). Seven new test files, as planned.

**What shipped**
- Panel-row primitives in `index.css` (`.field-row`, `.field`, `.panel-group`, `.panel-rule`, `.switch-sm`).
- `AdvancedToggle` on every panel in place of `LockBtn`.
- Run-stage state as a pure reducer plus `useAnalyzeStage`, which resets on every run start.
- One Analyze/Stop button in a fixed `ProcessingRunZone`; breadcrumb removed; Done / Running / Queued on each technique row.
- `LspivSettings` hung under the LSPIV row, `RoiHeightRow` at the top, and the four value-dropping bugs fixed (Review Focus 2-5).
- Coordinate blocks and the Video step's Advanced blocks on the same grammar, point colours as ringed dots (D8).

**Decisions D1-D9:** all defaults taken, confirmed by the product owner on 2026-10-01.

**Deviations**
- `reducedMotion.test.ts` scroll-call floor 19 -> 17: this plan removes Processing's two scroll-to-footer calls.
- `.lens-correction-section` and its `.switch-container` rules kept in `pages.css`: `StabilizationRegions.tsx` still uses the class.
- `useDataSlice`'s `clipLimit`, `medianTestEpsilon`, `medianTestThreshold` retyped `string` -> `number` to match the store.
- Plan-supplied tests and components were run through `eslint --fix` (prettier) so lint did not rise.

**Not done: visual checks.** Task 6 Step 6, Task 7 Step 4, Task 8 Step 4 and Task 9 Step 3 (launch the app, compare against the preview in dark, light and dracula, screenshots) were not performed. Every assertion is source-text, stylesheet or `renderToStaticMarkup` based. Review Focus 1 and 2 (second Analyze after Stop opens on the dash; CLAHE off then on restores the typed value) need a human pass in the running app.

**Owed follow-ups**
- Translations for the new keys in the 11 other locales.
- App-wide light-field decision A6 still open for `.input-field`.
- Basic sections of the other panels are not yet on the row grammar.
- Task 7 ring contrast: `--text-subdued` against the panel measured at 3:1 or better in all three themes, so no floor was lowered.
