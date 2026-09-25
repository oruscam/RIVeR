# Phase 6c — Canvas Chrome & Lists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get every user-created object (sections, masks, stabilisation regions) into a visible list built from the `.chip`/`.list-row` primitives, and get every control off the image canvas except the mode-hint pill and the per-shape toolbar.

**Architecture:** Four screens change. Two lists come out from behind the Advanced-settings gate, two inline-positioned wrappers come off the canvas, stabilisation regions gain the edit/undo/delete parity masks already have, and Processing's technique rows are rebuilt as a grid so their toggles align while only LSPIV carries Median and the MP4 export. No new primitives: 6a built `.chip`, `.chip-sm`, `.list-row`, `.ibtn`, `.ibtn-sm`, `.ibtn-danger` and 6b adopted them. 6c is adoption plus deletion of the private classes that duplicate them.

**Tech Stack:** Electron, React 18.3.1, TypeScript, Redux Toolkit, D3, Jest 29 + ts-jest (`testEnvironment: "node"`, **no DOM**), i18next.

**Spec:** `docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md` (§4/6c, §2's canvas rule, decision D5, amendment A1)

**Approved preview:** `docs/superpowers/previews/2026-09-25-phase-6c-canvas-lists.html` — approved by the product owner 2026-09-25 across four rounds of revision. **This preview is the binding visual reference.** Where the spec and the preview disagree, the preview wins and the difference is recorded as an amendment (see Task 10).

---

## Global Constraints

Every task's requirements implicitly include this section.

- Git author must be `antoine.patalano@gmail.com`. Never commit to `main` or `river-labs`. The branch `ui/design-refresh` stays unmerged.
- All work happens in the worktree `/Users/antoine/river_compil/.worktrees/ui-design-refresh/gui`. **Never `cd` to the original repository root.**
- **Never edit `src/translations/*/global.json`.** New copy uses `t(key, { defaultValue })`.
- **Never use bare `git stash` / `git stash pop`** — the stash stack is shared with the main checkout and other worktrees. Prefer a temporary WIP commit; if you must stash, `git stash push -u -m "<unique-tag>"` then `git stash apply <sha>`, never `pop`.
- **Never run `git checkout -- <file>`** to undo an experiment. It reverts the whole file and destroyed real work twice during 6a and 6b. Undo with an editor or `perl -0pi`.
- Contrast floors in `src/helpers/themeStateContrast.test.ts` **may never be lowered**, and no existing assertion in any test file may be weakened, deleted or have a threshold reduced.
- The lint command is **`npm run lint`** exactly. `npx eslint src --ext .ts,.tsx` under-reports (9 vs 20) and has already caused one false alarm in this phase. `npx eslint --fix` works on `.ts`/`.tsx` but **not** on `.css`.
- Baseline at the start of 6c: **655 tests / 63 suites passing**, `npx tsc --noEmit` **64 errors**, `npm run lint` **20 problems (17 errors, 3 warnings)**. The 64 and the 20 may not regress. New tests raise the test count; report the new number.
- Commit messages end with exactly:
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_011cZG8ZfMukQVEkPP5V8VvV
  ```

### Carried-over contracts from 6b — read before writing any state

1. **The `aria-disabled` dual contract.** Chromium dispatches no pointer events — and therefore no `title` tooltip — on a natively `disabled` control. A control that must explain _why_ it is unavailable therefore carries `aria-disabled="true"` instead of `disabled`, **and** an early-return guard in its click handler, because `aria-disabled` is advisory only. The attribute's expression and the guard's condition must read the same value. `src/helpers/legacyButtonRetirement.test.ts` asserts the pairing.
2. **Token collapse.** `--surface-field` ≡ `--input-background`; `--surface-raised` ≡ `--card-surface` ≡ `--surface-panel` (1.00:1); dracula `--border-color` ≡ `--on-hover` ≡ `--input-background` ≡ `#44475a`; light `--surface-field` vs `--surface-panel` is **1.05:1**. "Use a different token" is not reliably a visible change. Use `color-mix()` or an inset ring, never a swapped surface token. Compute contrast with `src/helpers/themeTokens.ts` — do not re-derive the maths.
3. **A hover rule out-specifies a state rule.** Every `:hover` in the `.chip`/`.list-row`/`.btn`/`.ibtn` families must exclude the states it would otherwise repaint. 6b shipped four cascade defects of this shape before they were caught.
4. **A media query adds no specificity.** A `@media (prefers-reduced-motion: reduce)` override must match or beat its trigger's selector or it silently does nothing.
5. **A guard can fail green.** Five times in 6b a check silently stopped checking while still passing. Every sweep gets a **canary** asserting it still sees something known-present, and every new guard is **mutation-tested** — read the real file, build the mutant as an in-memory string, run the logic against both. Never edit-and-restore. When fixing a guard, re-run the _whole_ mutant set, not just the new case: 6b's fix for one blinding bug introduced a worse one because only the new case was checked.
6. Jest here has **no DOM**. No test in this project can observe cascade, specificity, media queries or geometry. Those are found by reading the stylesheet and by the manual walkthrough — never assume a green suite covers them.

---

## Corrections to the spec's inventory

Measured 2026-09-25 against `4533ead`. Recorded as amendment A10 in Task 10.

| Spec §4/6c says                                                                | Actually                                                                                                                                                          |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AddMaskButton.tsx` is `position:absolute; top:12px; right:12px` inline-styled | `AddMaskButton.tsx` has **no positioning at all**. The inline wrapper is at the call site, `src/pages/CrossSections.tsx:68-70`, at `zIndex: 10`.                  |
| The regions gate is `FormVideo.tsx:222`                                        | It is `FormVideo.tsx:227` (`{extraFields && type === 'uav' && <StabilizationRegions />}`).                                                                        |
| `Processing.tsx:152-154` floats `ExportMp4`                                    | Correct — `zIndex: 1000`.                                                                                                                                         |
| `StabilizationCanvas.tsx:417` gives regions one `ConfirmMaskBtn`               | Correct.                                                                                                                                                          |
| The cross-section row keeps `.list-row` _if_ inline rename survives            | **Resolved: it does not.** Masks are numbered, not named (product-owner decision, 2026-09-25), so no row in this phase contains a text input. Sections are chips. |

## Product-owner decisions taken during preview review (2026-09-25)

- **D6 — Masks and regions are numbered, never named.** `Mask 1`, `Region 1`. No inline rename, no free-text label anywhere in a list row. One numbering style for every user-created object.
- **D7 — The MP4 export is an icon in the LSPIV technique row**, not a standalone button in an action row. Option A of three shown.
- **D8 — Technique rows put the name and the toggle on one line, with the toggle column aligned across LSPIV/STIV/iWave.** Median sits to the toggle's left, the export icon to Median's left; both are LSPIV-only. Alignment is achieved with reserved grid columns, not a flex run.
- **D9 — LSPIV's toggle is on by default and cannot be turned off**, expressed as `aria-pressed="true"` + `aria-disabled="true"` + a tooltip, per contract 1 above.
- **D10 — Regions are editable, exactly as masks are.** A region takes edit + delete (it has no visibility state) where a mask takes eye + edit + delete.
- **D11 — One glyph per toggle; the accent fill carries on/off.** Not ✓ versus ✕: swapping the glyph double-encodes, and ✕ reads as failure rather than "not selected".
- **D12 — The technique-row rebuild belongs to 6c, not 6d.** The rows and the export icon are one visual unit; splitting them would have 6c ship an icon into a layout 6d then rebuilds.

---

## File Structure

**Created**

- `src/components/Forms/Components/RegionList.tsx` — the numbered region list (rows + `[+] Add region` chip). Split out of `StabilizationRegions.tsx` so the list has one responsibility and `StabilizationRegions` keeps the stabilisation on/off concern.
- `src/components/Forms/Components/MaskList.tsx` — the numbered mask list. Same reasoning; `MaskCreation.tsx` currently mixes the list with the drawing-mode controls.
- `src/components/ShapeToolbar.tsx` — the per-shape canvas toolbar (Done / Undo point / Delete), shared by masks and regions. Today masks have one and regions do not; one component prevents them drifting apart again.
- `src/helpers/canvasChrome.test.ts` — the sweep that keeps controls off the canvas.
- `src/helpers/listPrimitiveAdoption.test.ts` — the sweep that keeps the lists on `.chip`/`.list-row`.

**Modified**

- `src/pages/CrossSections.tsx` — delete the floating wrapper (lines 68-70).
- `src/pages/Processing.tsx` — delete the floating wrapper (lines 152-154).
- `src/components/Forms/Components/MaskCreation.tsx` — becomes drawing controls only.
- `src/components/Forms/Components/HardModeCrossSections.tsx` — stops rendering `MaskCreation`.
- `src/components/Forms/Components/AddMaskButton.tsx` — becomes the `[+] Add mask` chip.
- `src/components/Forms/Components/StabilizationRegions.tsx` — renders `RegionList`.
- `src/components/Forms/FormVideo.tsx:227` — regions leave the `extraFields` gate.
- `src/components/VideoPlayer/StabilizationCanvas.tsx` — adopts `ShapeToolbar`; region edit mode.
- `src/components/CrossSections/Sections.tsx` — sections become chips.
- `src/components/Forms/FormProcessing.tsx` — technique rows rebuilt.
- `src/components/TechniqueRow.tsx` — gains the reserved-column grid.
- `src/components/Graphs/TechniqueLegend.tsx` — the eye control's `disabled` → `aria-disabled` + guard.
- `src/index.css` — `.tech-row` grid; delete `.technique-seed-flag`, `.technique-eye-btn`, `.technique-disclosure-btn` once replaced.
- `src/components/components.css`, `src/components/Graphs/graphs.css` — delete the private row classes the primitives replace; delete the three orphaned `.progress-indicator*` rules (dead since `2ba4526`, 0 consumers).
- `docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md` — amendment A10.

---

## Task ordering and why

Regions first (Tasks 1-2), because region editing is the one change that cannot ship in halves: the Edit control in the list and the Done/Undo/Delete toolbar on the canvas are the same feature, and an Edit button without the toolbar opens a dead end. Then masks and sections (Tasks 3-5), which are list migrations against primitives that already exist. Then the canvas cleanup (Task 6), which can only run once both floating controls have replacements. Then the technique rows and export (Tasks 7-8). Then the guards (Task 9) and the record (Task 10).

---

### Task 1: The shared shape toolbar

**Files:**

- Create: `src/components/ShapeToolbar.tsx`
- Modify: `src/index.css` (add `.shape-toolbar`)
- Test: covered by Task 9's `canvasChrome.test.ts`; this task adds no test of its own because the component is pure markup over existing primitives and this project cannot render components.

**Interfaces:**

- Consumes: `.ibtn`, `.ibtn-sm`, `.ibtn-danger` from `src/index.css` (6a/6b).
- Produces: `ShapeToolbar({ onUndo, onDelete, onDone, canUndo, labels })`, used by Task 2 and available to the mask canvas.

- [ ] **Step 1: Write the component**

```tsx
import { useTranslation } from 'react-i18next';

interface ShapeToolbarProps {
  /** Remove the most recently placed point. Disabled when there is none. */
  onUndo: () => void;
  /** Discard the whole shape. */
  onDelete: () => void;
  /** Finish editing this shape. */
  onDone: () => void;
  canUndo: boolean;
  /** What the shape is called, for the tooltips: 'mask' or 'region'. */
  kind: 'mask' | 'region';
}

/**
 * The only control cluster allowed to sit over an image canvas besides the
 * mode-hint pill (spec section 2). Shared by masks and regions deliberately:
 * before 6c, masks had a three-button toolbar and regions had a single green
 * tick, so a region could be confirmed but never undone or deleted from the
 * canvas. One component is what stops them diverging again.
 */
export const ShapeToolbar = ({ onUndo, onDelete, onDone, canUndo, kind }: ShapeToolbarProps) => {
  const { t } = useTranslation();

  return (
    <div className="shape-toolbar">
      <button
        type="button"
        className="ibtn ibtn-sm"
        onClick={onUndo}
        aria-disabled={!canUndo}
        title={t('Canvas.undoPoint', { defaultValue: 'Undo last point' })}
      >
        {/* Placeholder glyph: swap for the project's own icon component. */}
        &#8630;
      </button>
      <button
        type="button"
        className="ibtn ibtn-sm ibtn-danger"
        onClick={onDelete}
        title={
          kind === 'mask'
            ? t('Canvas.deleteMask', { defaultValue: 'Delete mask' })
            : t('Canvas.deleteRegion', { defaultValue: 'Delete region' })
        }
      >
        &#128465;
      </button>
      <button
        type="button"
        className="ibtn ibtn-sm"
        onClick={onDone}
        title={t('Canvas.done', { defaultValue: 'Done' })}
      >
        &#10003;
      </button>
    </div>
  );
};
```

**Note on the undo button:** it is `aria-disabled`, not `disabled`, because its tooltip is the only thing explaining why it is inert. Per Global Constraint 1 it therefore also needs a guard — add `if (!canUndo) return;` inside the `onUndo` the caller passes, or guard at the top of the handler in `StabilizationCanvas`. Task 9's sweep will fail if the pairing is missing.

- [ ] **Step 2: Add the CSS, after the `.ibtn` family so it can rely on it**

```css
/* The per-shape canvas toolbar. One of exactly two things allowed over footage
   (spec section 2); the other is the mode-hint pill. Centred at the bottom so it
   never covers the shape being edited, which is usually mid-frame. */
.shape-toolbar {
  position: absolute;
  bottom: var(--space-3);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: var(--space-1);
  padding: var(--space-1);
  border-radius: var(--radius-full);
  background-color: var(--surface-panel);
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.3);
}
```

- [ ] **Step 3: Verify and commit**

Run `npx jest`, `npx tsc --noEmit 2>&1 | grep -c "error TS"`, `npm run lint`. Expect 655/63, 64, 20 — this task adds no tests.

```bash
git add src/components/ShapeToolbar.tsx src/index.css
git commit -m "Add the shared per-shape canvas toolbar"
```

---

### Task 2: Stabilisation regions — editable, numbered, always visible

**Files:**

- Create: `src/components/Forms/Components/RegionList.tsx`
- Modify: `src/components/Forms/Components/StabilizationRegions.tsx`, `src/components/Forms/FormVideo.tsx` (line 227), `src/components/VideoPlayer/StabilizationCanvas.tsx` (the `ConfirmMaskBtn` at line 417)

**Interfaces:**

- Consumes: `ShapeToolbar` from Task 1.
- Produces: `RegionList`, and an `activeRegionIndex` editing concept the canvas reads.

- [ ] **Step 1: Read the three files before changing anything**

`StabilizationRegions.tsx` is 93 lines, `StabilizationCanvas.tsx` is 422. Find the region state's shape in the Redux slice before designing the edit action — do not invent a field name. Report what you found in the task report.

- [ ] **Step 2: Build `RegionList`**

Numbered rows, `Region 1` style per D6, each with edit and delete, then a `[+] Add region` chip. Use `.list-row` with `aria-selected={index === activeRegionIndex}`, `.ibtn ibtn-sm` for edit, `.ibtn ibtn-sm ibtn-danger` for delete, `.chip chip-sm` for add. Match the approved preview's Video Range panel exactly.

- [ ] **Step 3: Take regions out of the Advanced gate**

`FormVideo.tsx:227` currently reads `{extraFields && type === 'uav' && <StabilizationRegions />}`. Regions must stay visible whenever stabilisation is on, so the `extraFields &&` conjunct goes; the `type === 'uav'` conjunct stays (regions are UAV-only). If stabilisation has its own on/off flag in the slice, gate on that instead — locate it rather than assuming.

- [ ] **Step 4: Give the canvas the full toolbar**

Replace the lone `ConfirmMaskBtn` at `StabilizationCanvas.tsx:417` with `ShapeToolbar`, wired to undo-point, delete-region and done. Delete the `style={{ background: accentColor }}` inline prop — `.ibtn` states carry that now.

- [ ] **Step 5: Verify and commit**

Expect tests/tsc/lint unchanged from baseline. Commit as one change: the list control and the toolbar are one feature.

```bash
git commit -m "Make stabilisation regions editable and always visible"
```

---

### Task 3: The mask list comes out from behind Advanced

**Files:**

- Create: `src/components/Forms/Components/MaskList.tsx`
- Modify: `src/components/Forms/Components/MaskCreation.tsx`, `src/components/Forms/Components/HardModeCrossSections.tsx`, `src/pages/CrossSections.tsx`

- [ ] **Step 1** Read `MaskCreation.tsx` (55 lines) and separate two concerns: the list of masks, and the drawing-mode controls. The list moves to `MaskList.tsx`.
- [ ] **Step 2** Build `MaskList` as numbered `.list-row` rows (`Mask 1`, per D6) carrying eye, edit and delete, matching the approved preview. Hidden masks are distinguished by the eye control's own state, **not** by dimming the label.
- [ ] **Step 3** Render `MaskList` in the Cross Sections form panel unconditionally — outside `HardModeCrossSections`, which today wraps it in `extraFields ? … : 'hidden'`. Remove `<MaskCreation />` from `HardModeCrossSections.tsx` if nothing else there needs it; if the drawing controls genuinely belong to Advanced, leave those behind and move only the list.
- [ ] **Step 4** Verify and commit.

---

### Task 4: `[+] Add mask` becomes a chip beside the list

**Files:** `src/components/Forms/Components/AddMaskButton.tsx`, `src/pages/CrossSections.tsx`

- [ ] **Step 1** Change `AddMaskButton` from rendering `MaskBtn` to rendering `<button type="button" className="chip chip-sm">`, keeping its existing `handleClick` (which already toggles out of mask mode when a mask is active) and both `title` strings verbatim — they are already translated with `defaultValue`.
- [ ] **Step 2** Move its render site from the floating wrapper into the form panel, directly beneath `MaskList`.
- [ ] **Step 3** Verify and commit.

---

### Task 5: Sections become chips

**Files:** `src/components/CrossSections/Sections.tsx`

- [ ] **Step 1** Read the file. Sections are single-choice with no per-row controls, so they are `.chip` with `aria-selected` on the current one (spec A1). Per D6 there is no inline rename, so if the current implementation has one, its removal is part of this task — say so explicitly in the report, since it removes a capability.
- [ ] **Step 2** Preserve every handler, `title`, and `t()` call. The `[+] Add section` affordance is a chip at the end of the row.
- [ ] **Step 3** Verify and commit.

---

### Task 6: Nothing floats over the canvas

**Files:** `src/pages/CrossSections.tsx` (lines 68-70), `src/pages/Processing.tsx` (lines 152-154)

- [ ] **Step 1** Delete both inline-positioned wrappers. Both replacements must already exist (Task 4's chip; Task 8's export icon), so **run this task after Task 8** or the export becomes unreachable. If Task 8 has not landed, stop and say so rather than deleting a control with nowhere to go.
- [ ] **Step 2** Grep for other inline `position: 'absolute'` inside a `media-container` and report anything found — the spec names two, and the inventory confirmed two, but a third would belong here.
- [ ] **Step 3** Verify and commit.

---

### Task 7: Technique rows as a grid with aligned toggles

**Files:** `src/components/TechniqueRow.tsx`, `src/components/Forms/FormProcessing.tsx`, `src/index.css`

- [ ] **Step 1: Add the grid to `.tech-row` in `src/index.css`**

```css
/* Reserved trailing columns, not a flex run. Only LSPIV carries Median and the
   MP4 export, so in a flex row STIV's and iWave's toggles would slide left by
   the width of two controls and the aligned toggle column the design requires
   would not exist. The Median cell is a fixed width for the same reason: a text
   label's width changes once translated, and this app ships 12 locales. */
.tech-row {
  display: grid;
  grid-template-columns: 12px 1fr 28px 78px 28px;
  gap: var(--space-2);
  align-items: center;
  min-height: 34px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-md);
}
```

- [ ] **Step 2** Give `TechniqueRow` the five-cell structure, with the export and Median cells rendered as empty `<span className="tech-cell" />` for STIV and iWave rather than omitted — omitting them collapses the grid and breaks the alignment this task exists to create.
- [ ] **Step 3** Replace the row-level `onClick` with an explicit toggle button per row. This removes the `event.stopPropagation()` the Median button currently needs (`FormProcessing.tsx:215`) to avoid also switching the preview mode. Per D11 all three toggles use the same glyph and let `.ibtn[aria-pressed="true"]`'s accent fill carry on/off.
- [ ] **Step 4** LSPIV's toggle is `aria-pressed="true"` plus `aria-disabled="true"` with a tooltip (D9), **and** an early-return guard in its handler (Global Constraint 1).
- [ ] **Step 5: Fix the Results legend's eye control while the contract is in hand**

`src/components/Graphs/TechniqueLegend.tsx` pairs `disabled={isActive}` with `title={t('Results.cantHideActiveTechnique')}`. Because Chromium dispatches no pointer events to a disabled control, that tooltip — the only thing explaining why the active technique cannot be hidden — never appears. This is the same defect 6b fixed in `FormResults.tsx`, in the sibling component, and it is in scope because 6c owns the list primitives on both screens.

Change `disabled={isActive}` to `aria-disabled={isActive}` and add `if (isActive) return;` at the top of `handleToggleVisibility`'s body for that row. Both halves, per Global Constraint 1 — the attribute alone leaves a live control that merely looks dead.

- [ ] **Step 6** Verify and commit.

---

### Task 8: The MP4 export moves into the LSPIV row

**Files:** `src/components/Forms/Components/ExportMp4.tsx` (locate it), `src/components/Forms/FormProcessing.tsx`

- [ ] **Step 1** Render the export as `.ibtn ibtn-sm` in the LSPIV row's first reserved cell (D7).
- [ ] **Step 2** Per decision D5 — _there will never be video export for STIV or iWave_ — the control is `aria-disabled="true"` with a tooltip saying video export is LSPIV-only when there is no LSPIV result, **plus** a click guard. Delete the current `opacity: 0.5; pointer-events: none` wrapper: it explains nothing and, by removing pointer events, suppresses the very tooltip that would.
- [ ] **Step 3** Verify and commit.

---

### Task 9: The guards

**Files:**

- Create: `src/helpers/canvasChrome.test.ts`, `src/helpers/listPrimitiveAdoption.test.ts`

- [ ] **Step 1** `canvasChrome.test.ts`: sweep every `.tsx` for an inline `position: 'absolute'` (or `position:absolute` in a style object) inside a `media-container` subtree, and assert the set is empty apart from an allow-list naming the mode pill and `.shape-toolbar` with a comment saying why each is allowed. Parse structurally, never per physical line.
- [ ] **Step 2** `listPrimitiveAdoption.test.ts`: assert the mask, region and section lists use `.list-row`/`.chip`, and that the private classes they replace (`technique-seed-flag`, `technique-eye-btn`, `technique-disclosure-btn`, plus any list class deleted in Task 3-5) appear nowhere. Give every sweep a non-trivial floor.
- [ ] **Step 3** Extend the `aria-disabled` pairing sweep in `legacyButtonRetirement.test.ts` to cover the new controls, or confirm the existing general sweep already does — read it before duplicating it.
- [ ] **Step 4** **Mutation-test every assertion, read-only**: read the committed file, build the mutant as an in-memory string, run the assertion logic against both. Report per assertion what you broke and that it failed on the mutant. Then re-run `npx eslint --fix` if needed and **re-run the mutation checks afterwards**, since reformatting has broken a guard in this phase before.
- [ ] **Step 5** Verify and commit.

---

### Task 10: Record the corrections and decisions

**Files:** `docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md`

- [ ] **Step 0: Delete the private classes the primitives replaced**

Deliberately last, and deliberately separate from the tasks that stopped using them — the same split 6b used, so a missed call site shows up as an unstyled control rather than as a silent visual loss.

For each of `.technique-seed-flag` (and its `-seeded` / `.technique-flag-off` variants), `.technique-eye-btn`, `.technique-disclosure-btn` (and `-open`), plus any list class Tasks 3-5 stopped using: **grep the whole tree first** — `.ts`, `.tsx`, `.css`, and `docs/superpowers/previews/` — and delete the rule only if it has no consumer. Report the grep per class. A class with a live consumer stays, and is reported as a survivor with its file and line; a deletion that breaks a live screen is far worse than a leftover rule Task 9's sweep will flag.

Note that `docs/superpowers/previews/` legitimately contains retired class names: the 6b preview inlines the declarations it needs under a `.before-legacy` wrapper. Do not let a preview's deliberate usage block a deletion, and do not delete a preview's markup.

- [ ] **Step 1** Correct §4/6c's inventory from the "Corrections to the spec's inventory" table above: the floating wrapper's real location, the regions gate's real line, and that inline rename is resolved as _not surviving_.
- [ ] **Step 2** Append amendment **A10** to §9 recording decisions D6-D12 with their reasoning, and noting that the approved preview is the binding visual reference for 6c.
- [ ] **Step 3** Delete the three orphaned `.progress-indicator*` rules from `components.css` (dead since `2ba4526` replaced the bar with `Stepper.tsx`; 0 consumers, verified 2026-09-25) — but **grep the whole tree first** and skip the deletion if anything references them.
- [ ] **Step 4** Verify and commit.

---

## Verification (whole sub-plan)

1. `npx jest` — all suites pass. Baseline 655 + Task 9's new tests. **Confirm the real number and account for any difference rather than adjusting the expectation.**
2. `npx tsc --noEmit 2>&1 | grep -c "error TS"` → **64**, unchanged.
3. `npm run lint` → **20 problems (17 errors, 3 warnings)**, unchanged.
4. `grep -rn "position: 'absolute'" src/pages src/components --include="*.tsx"` — every hit is the mode pill or `.shape-toolbar`.
5. `open docs/superpowers/previews/2026-09-25-phase-6c-canvas-lists.html` — the shipped screens match the approved preview in all three themes.
6. **Manual, for the product owner:** launch Electron and, in each theme, draw a mask and a region, edit each, undo a point, delete each, and export an MP4 with and without an LSPIV result. No automated test in this project renders a component, and 6b shipped two geometry defects that only a walkthrough caught.

## What 6c deliberately does not do

- It does not touch `.seg` or the Processing preview's segmented control beyond the technique rows themselves — that is 6d.
- It does not re-layout camera calibration (6e), Home (6f), or sweep type and radius (6g).
- It does not resolve the open light-theme field-surface decision (spec §6, amendment A6), which remains with the product owner.
- It does not add the app-wide `prefers-reduced-motion` sweep carried as debt against 6g.
