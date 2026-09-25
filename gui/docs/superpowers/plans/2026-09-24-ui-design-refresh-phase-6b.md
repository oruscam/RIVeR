# UI Design Refresh — Phase 6b (Button & icon-button adoption) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire the four legacy button families and the legacy `.ib` icon button, moving every call site onto Phase 3a's `.btn` family and `.ibtn`, and delete the CSS they leave behind.

**Architecture:** Three primitive states are missing before any migration can preserve behaviour (a pressed/toggled button, a danger icon button, a success icon button). Task 1 builds them, gated by contrast tests, and Task 2 renders a static three-theme preview so the size change is seen before 31 call sites move. Tasks 3–6 migrate the text buttons batched **by role**, not by file, because the old class name does not carry the role. Tasks 7–9 migrate the 14 icon buttons. Tasks 10–11 delete the dead CSS and install sweep guards so the classes cannot come back.

**Tech Stack:** React 18 + TypeScript, plain CSS custom properties, Jest 29 + ts-jest (`testEnvironment: "node"` — **no DOM**, so every test is pure-logic or source-text assertion under `src/helpers/`).

**Spec:** `docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md` (§4/6b, decisions D3/D4/D5, §9 amendment log)

**Predecessor:** `docs/superpowers/plans/2026-09-23-ui-design-refresh-phase-6a.md` (complete — 5 tasks, tip `89a5572`)

---

## Global Constraints

Copied verbatim from the phase's standing constraints. Every task's requirements implicitly include this section.

- Git author must be `antoine.patalano@gmail.com`.
- **Never** commit to `river-labs` or `main`. All work stays on `ui/design-refresh`, which stays unmerged.
- **Never** edit `src/translations/*/global.json`. New user-visible copy uses `t(key, { defaultValue: '...' })`.
- All work happens in the worktree at `/Users/antoine/river_compil/.worktrees/ui-design-refresh/gui`. Never `cd` to the original repository root.
- **Never use bare `git stash` / `git stash pop`** — the stash stack is shared with the main checkout and other worktrees. Prefer a temporary WIP commit; if you must stash, use `git stash push -u -m "<unique-tag>"` then `git stash apply <sha>` (never `pop`).
- **Never run `git checkout -- <file>` to undo an experiment.** It reverts the whole file, including changes you made earlier in the task. This destroyed two real fixes during 6a. Revert the specific hunk with an editor instead.
- Baseline that may not regress: **618 tests / 61 suites passing**, `npx tsc --noEmit` = **64** pre-existing errors, `npm run lint` = **20 problems (17 errors, 3 warnings)**.
- The lint command is **`npm run lint`**, exactly. The narrower `npx eslint src --ext .ts,.tsx` reports 9 and has already caused one false alarm.
- Commit messages end with:
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_011cZG8ZfMukQVEkPP5V8VvV
  ```
- **Contrast floors in `src/helpers/themeStateContrast.test.ts` may never be lowered.** If a floor fails, the palette moved or the CSS regressed — report it.
- Before writing any interaction state, resolve the token chain per theme with `src/helpers/themeTokens.ts`. Do not assume two token names are two colours (see the token-collapse table below).

### Token collapse facts (from 6a — do not "correct" a rule toward one of these)

| Collapse | Themes |
|---|---|
| `--surface-field` ≡ `--input-background` | all three |
| `--surface-raised` ≡ `--card-surface` ≡ `--surface-panel` (1.00:1) | all three |
| `--border-color` ≡ `--on-hover` ≡ `--input-background` ≡ `#44475a` | dracula only |
| light `--surface-field` vs `--surface-panel` | 1.05:1 |

---

## Corrections to the spec's inventory (ruling, recorded as amendment A7)

The spec's §1 table and §4/6b were measured at Phase 5d's tip and are wrong in two ways. The numbers below are measured on `89a5572` and are what this plan implements.

**Text buttons: 31 distinct call sites, not 33.** The spec summed `wizard-button ×22 + button-1 ×7 + danger-button ×2 + button-with-loader ×2`. Three sites carry *both* `wizard-button` and `button-1` (`CameraCalibration.tsx:522`, `:527`) or matched the `wizard-button` grep only through the unrelated `wizard-button-active` modifier (`FootageMode.tsx:152`). Distinct `<button>` elements: 21 `wizard-button` + 6 `button-1`-only + 2 `danger-button` + 2 `button-with-loader` = **31**.

**Icon buttons: 14 call sites, not 9.** `grep -rnE 'className=[^>]*\bib\b' src --include="*.tsx"` returns 14 across 14 files.

**`wizard-button-active` is a state with 18 usages, and `.btn` has no equivalent.** The spec called 6b "mechanical and well-defined". It is not: the `.btn` family has no pressed/toggled variant at all, so a literal class swap would silently delete the active state from 18 call sites. Task 1 builds it.

**`.ib` carries four states `.ibtn` does not have:** `.ib.active` (toggled), `.ib.is-success`, `.ib-off`, `.ib-danger` + `.ib-danger.is-armed`. Migrating without building replacements would delete `TrashBtn`'s arm-to-confirm, `ExportBtn`'s success flash, and `FormResults`' explained-unavailable affordance. Task 1 builds the three that have consumers.

**`.ib:disabled` sets `pointer-events: none`** (`piv-icons.css:39-44`) — the exact tooltip-killing pattern 6a documented and fixed for `.btn`/`.ibtn`. `FormResults.tsx:98` already works around it by hand with `ib-off`. Migration must use the `[aria-disabled="true"]` contract so the explanatory `title` survives.

### Rulings taken while writing this plan

| # | Ruling | Why | Cost if wrong |
|---|---|---|---|
| **R1** | Migrated wizard/page buttons use **`.btn btn-lg`** (48px, 16px), not bare `.btn` (40px, 14px). Buttons inside dense field rows use `.btn`. | Legacy buttons are 50px tall at 20px font. 48px/16px is the smallest visible jump and is still on D3's type scale (`--text-section`). Going straight to 40px/14px would shrink every button in the app by 20%. | Every migrated button is 8px taller than the audit's spec. One-line fix per variant; Task 2's preview is there to catch it first. |
| **R2** | The three meanings currently sharing `wizard-button-active` keep **one visual** (accent fill) but get **three distinct DOM attributes**: `aria-pressed` (toggle), `data-complete` (step finished), `aria-busy` (running). | 6b is an adoption sub-plan, not a redesign; differentiating three states visually needs previews and belongs to the sub-plan owning each screen. Recording the meaning now means a later sub-plan can differentiate without re-reading 18 call sites. `aria-pressed` on a "step finished" button would make a screen reader announce "pressed", which is false. | One extra selector in one CSS rule. |
| **R3** | `CameraCalibration.tsx`'s 7 sites migrate now, even though **6e rebuilds that file**. | 7 small edits, and it keeps Task 11's sweep guard true from 6b onward instead of leaving an exception that has to be remembered for three sub-plans. | ~7 edits thrown away by 6e. |
| **R4** | Dead CSS with zero consumers in the same region is deleted: `.button-transparent`, `.label-1`, `.danger-button-active`. | 6b's "done means" already requires removed classes' CSS be deleted rather than orphaned. `danger-button-active` is applied in `FormAnalizing.tsx:96` but **has no CSS rule at all** — it has never done anything. | Trivially revertible. |
| **R5** | **Out of 6b's scope, deliberately:** `.video-button` (7 sites), `.mask-toolbar-btn`, `.btn-step`, `.technique-eye-btn`, `.technique-disclosure-btn`, `.station-tag-pin-btn`, `.confirm-mask-btn`, `.copy-btn-wrap`. | The spec scopes 6b to the four named legacy families plus `.ib`. The canvas toolbar is 6c's; the technique rows are 6d/6f's. | Named here so a reviewer does not report them as misses. |

---

## File Structure

**CSS (primitive states, then deletions)**
- `src/index.css` — add the `.btn` pressed/complete/busy rule and three `.ibtn` state rules (Task 1); delete `.danger-button*`, `.button-1*`, `.wizard-button*`, `.button-with-loader*`, `.button-transparent`, `.label-1` (Task 10).
- `src/components/CustomIcons/piv-icons.css` — delete `.ib*` (Task 10). `.cl` and the wiggle keyframes stay: `TrashBtn` still uses them.
- `src/index.css` / `src/components/Forms/form.css` — `.form-button`, `.button-rectification`, `.solver-button` keep their sizing roles and stay (Task 3 note).

**Tests (all source-text or pure logic — there is no DOM)**
- `src/helpers/buttonAndFieldTokens.test.ts` — extend with the new primitive states and the sweep guards.
- `src/helpers/themeStateContrast.test.ts` — two new gated pairs.
- `src/helpers/legacyButtonRetirement.test.ts` — **new**: the invariant that the legacy classes are gone from both TSX and CSS.

**TSX call sites (31 text + 14 icon), batched by role**
- Task 3 (plain actions, 11): `FormVideo.tsx`, `Uav.tsx`, `Oblique.tsx`, `HomePage.tsx`, `CameraCalibration.tsx`
- Task 4 (toggles, 9): `Carousel.tsx`, `FormOblique.tsx`, `FormIpcam.tsx`, `FormCrossSections.tsx`, `FormUav.tsx`, `CameraCalibration.tsx`
- Task 5 (completion, 6): `FormOblique.tsx`, `FormIpcam.tsx`, `FormCrossSections.tsx`, `FootageMode.tsx`
- Task 6 (danger + loader, 5): `FormAnalizing.tsx`, `FormProcessing.tsx`, `HardModeProcessing.tsx`
- Task 7 (row icons, 4): `TrashBtn.tsx`, `EyeBtn.tsx`, `EditMaskBtn.tsx`, `MaskBtn.tsx`
- Task 8 (chrome & selectors, 7): `ThemeToggle.tsx`, `LanguageSelector.tsx`, `UnitSelector.tsx` (×2), `CopyBtn.tsx`, `ExportBtn.tsx`, `FormResults.tsx`
- Task 9 (video transport, 3): `PlayBtn.tsx`, `SoundBtn.tsx`, `FrameBtn.tsx`

**Preview**
- `docs/superpowers/previews/2026-09-24-phase-6b-buttons.html` — **new**, static, all three themes side by side (Task 2).

---

## Task 1: Build the three missing primitive states

**Files:**
- Modify: `src/index.css` (after the `.btn:disabled` rule at 688-693, and after `.ibtn:disabled` at 725-729)
- Test: `src/helpers/buttonAndFieldTokens.test.ts`, `src/helpers/themeStateContrast.test.ts`

**Interfaces:**
- Produces, for Tasks 3–9:
  - `.btn[aria-pressed="true"]`, `.btn[aria-selected="true"]`, `.btn[data-complete="true"]`, `.btn[aria-busy="true"]` — accent fill + `--on-accent` label.
  - `.ibtn[aria-pressed="true"]` — accent fill + `--on-accent` icon.
  - `.ibtn-danger` — hover/armed fill of `--status-bad` with `--on-error` icon; armed via `[data-armed="true"]`.
  - `.ibtn[data-state="success"]` — `--status-good` icon colour.
  - `.ibtn-sm` already exists (`src/index.css:955`, 6a) — 24px, for rows.
- Consumes: 6a's `--accent-color`, `--on-accent`, `--status-bad`, `--on-error`, `--status-good`, `--surface-panel`, `--motion-fast`, `--motion-ease`.

**Contrast already measured** — the controller measured these with `src/helpers/themeTokens.ts` on `89a5572` before this plan was written. Do not re-derive; do not lower:

| Pair | dark | light | dracula | Floor | Status |
|---|---|---|---|---|---|
| `--accent-color` vs `--surface-panel` | 3.893 | 4.431 | 6.546 | 3.0 | already gated by 6a |
| `--on-accent` on `--accent-color` | 4.732 | 5.413 | 5.903 | 4.5 | already gated by 6a |
| `--on-error` on `--status-bad` | 6.842 | 5.450 | 5.518 | 4.5 | already gated (themeTextContrast) |
| `--status-good` vs `--surface-panel` | 8.534 | **4.136** | 11.506 | **4.0** | **new** |
| `--status-bad` vs `--surface-panel` | 6.002 | **4.462** | 5.025 | **4.4** | **new** |

The pressed state therefore introduces **no new colour pair** — it is built from two pairs 6a already measured and gates. Only the two icon-button fills are new.

- [ ] **Step 1: Write the failing primitive-state tests**

Append to `src/helpers/buttonAndFieldTokens.test.ts`, inside the existing `describe('.btn button component', ...)` block:

```ts
  it('gives .btn a pressed/selected state carrying all four meanings on one accent fill', () => {
    // Four attributes, one visual: aria-pressed (toggle), aria-selected
    // (tablist), data-complete (step finished), aria-busy (running). 6b records
    // the meaning in the DOM so a later sub-plan can differentiate the visuals
    // without re-reading 18 call sites. See plan ruling R2.
    const rule = css.match(/\.btn\[aria-pressed="true"\][^{]*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    const selector = rule![0].slice(0, rule![0].indexOf('{'));
    for (const attr of ['aria-pressed="true"', 'aria-selected="true"', 'data-complete="true"', 'aria-busy="true"']) {
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
    const selectors = [...css.matchAll(/^\.ibtn-danger[^{\n]*\{/gm)].map((m) => m[0]);
    expect(selectors.length).toBeGreaterThanOrEqual(1);
    const fill = selectors.find((s) => s.includes(':hover'));
    expect(fill).toBeDefined();
    expect(fill).toContain(':not([aria-disabled="true"])');
    expect(css).toContain('.ibtn-danger[data-armed="true"]');
  });
```

Append to `src/helpers/themeStateContrast.test.ts`, inside the `STATE_PAIRS` array (before the closing `];`):

```ts
  {
    label: '.ibtn[data-state="success"] icon (--status-good) vs panel',
    floor: 4.0,
    ratio: (t) => contrastRatio(resolveRgb(t, '--status-good'), panel(t)),
  },
  {
    label: '.ibtn-danger fill (--status-bad) vs panel',
    floor: 4.4,
    ratio: (t) => contrastRatio(resolveRgb(t, '--status-bad'), panel(t)),
  },
```

- [ ] **Step 2: Run them and confirm they fail for the right reason**

Run: `npx jest src/helpers/buttonAndFieldTokens.test.ts src/helpers/themeStateContrast.test.ts`

Expected: the three `buttonAndFieldTokens` tests fail (`rule` is `null` / no match — the CSS does not exist yet). The two new `themeStateContrast` pairs **pass immediately** — they measure tokens that already exist, and their job is to keep passing. Confirm they pass at the measured values; if either fails, stop and report, because the palette would have moved since measurement.

- [ ] **Step 3: Add the `.btn` pressed rule**

In `src/index.css`, immediately after the `.btn:disabled, .btn[aria-disabled="true"]` rule (currently ending line 693) and before `.ibtn {`:

```css
/* Pressed / selected / complete / busy — one fill, four meanings.
   `.wizard-button-active` carried all four before Phase 6b and rendered them
   identically; the attributes keep them distinguishable in the DOM so a later
   sub-plan can separate the visuals without re-auditing every call site.
   aria-selected is here because 6d's Frames|Space-time|Spectrum is a tablist,
   matching the contract .chip and .seg already declare.
   Both colours are gated in themeStateContrast.test.ts (accent vs panel >= 3.0,
   on-accent on accent >= 4.5). */
.btn[aria-pressed="true"],
.btn[aria-selected="true"],
.btn[data-complete="true"],
.btn[aria-busy="true"] {
  background-color: var(--accent-color);
  color: var(--on-accent);
}
```

- [ ] **Step 4: Add the three `.ibtn` state rules**

In `src/index.css`, immediately after the `.ibtn:disabled, .ibtn[aria-disabled="true"]` rule (currently ending line 729):

```css
/* aria-busy is here, not added later by Task 8, so that no task has to perform
   surgery on another task's rule. ExportBtn (Task 8) is its only consumer. */
.ibtn[aria-pressed="true"],
.ibtn[aria-busy="true"] {
  background-color: var(--accent-color);
  color: var(--on-accent);
}

/* Replaces .ib-danger. The fill must not appear on an aria-disabled control:
   this codebase uses aria-disabled rather than :disabled wherever a title
   tooltip has to survive, because Chromium dispatches no pointer events on a
   natively disabled control (see form.css:769-774). */
.ibtn-danger:hover:not(:disabled):not([aria-disabled="true"]),
.ibtn-danger[data-armed="true"] {
  background-color: var(--status-bad);
  color: var(--on-error);
}

/* Replaces .ib.is-success. Icon-only, so this is a non-text contrast pair;
   measured worst case 4.136:1 in light, gated at 4.0. */
.ibtn[data-state="success"] {
  color: var(--status-good);
}
```

- [ ] **Step 5: Run the full suite and the gates**

Run: `npx jest`
Expected: **627 passed, 61 suites** — 618 baseline + 3 new `buttonAndFieldTokens` cases + 2 new `STATE_PAIRS` entries × 3 themes (6 cases, because the state-pair block loops over `NAMES`) = 9. If the number differs, count the loop expansion rather than adjusting the expectation.

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → expect `64`.
Run: `npm run lint` → expect `20 problems`. If prettier complains about the new CSS, run `npx eslint src/index.css --fix` is **not** applicable to CSS; fix the formatting by hand to match the surrounding two-space indentation.

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/helpers/buttonAndFieldTokens.test.ts src/helpers/themeStateContrast.test.ts
git commit -m "$(cat <<'EOF'
Add the pressed, danger and success states the button migration needs

.btn had no pressed variant and .ibtn had no danger or success state, so a
literal class swap would have deleted the active state from 18 call sites and
broken TrashBtn's arm-to-confirm and ExportBtn's success flash.

The pressed fill introduces no new colour pair - it reuses accent-vs-panel and
on-accent-on-accent, both already gated. The two icon fills are new and gated
at their measured worst-theme values (status-good 4.136 light, status-bad 4.462
light).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011cZG8ZfMukQVEkPP5V8VvV
EOF
)"
```

---

## Task 2: Static three-theme preview of the size change

**Files:**
- Create: `docs/superpowers/previews/2026-09-24-phase-6b-buttons.html`

**Why this task exists:** legacy buttons are 50px tall at 20px font with fixed widths (132px / 165px / 232px). `.btn` is 40px/14px auto-width and `.btn-lg` is 48px/16px. Migrating 31 call sites visibly resizes every button on every wizard screen. Spec §8 requires previews before 6c–6f and does not require one for 6b, but 6b is the sub-plan that actually changes the size. This is the cheapest possible insurance: one static file, no dependency on the migration, and the migration tasks do not wait for it.

**Interfaces:**
- Consumes: the token blocks from `src/index.css` and the `.btn`/`.ibtn` rules including Task 1's additions.
- Produces: nothing code depends on. It is a review artifact.

- [ ] **Step 1: Write the preview page**

Create `docs/superpowers/previews/2026-09-24-phase-6b-buttons.html`. It must be self-contained (no build step, opens with `open <file>`), and must **import the real stylesheet rather than copying rules**, so it cannot drift:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Phase 6b — button sizes, three themes</title>
    <link rel="stylesheet" href="../../../src/index.css" />
    <style>
      body {
        margin: 0;
        font-family: Inter, system-ui, sans-serif;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
      }
      .pane {
        background: var(--surface-panel);
        color: var(--text-primary);
        padding: 24px;
        min-height: 100vh;
      }
      h2 {
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-subdued);
        margin: 0 0 4px;
      }
      h3 {
        font-size: 12px;
        font-weight: 400;
        color: var(--text-subdued);
        margin: 20px 0 8px;
      }
      .row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        margin-bottom: 8px;
      }
    </style>
  </head>
  <body>
    <div class="pane" data-theme="dark"></div>
    <div class="pane" data-theme="light"></div>
    <div class="pane" data-theme="dracula"></div>
    <script>
      const panes = document.querySelectorAll('.pane');
      const body = (theme) => `
        <h2>${theme}</h2>
        <h3>before — legacy (50px, 20px)</h3>
        <div class="row">
          <button class="wizard-button">Draw line</button>
          <button class="wizard-button wizard-button-active">Draw line</button>
          <button class="button-1">New project</button>
          <button class="danger-button">Stop</button>
        </div>
        <h3>after — .btn-lg (48px, 16px) · plan ruling R1</h3>
        <div class="row">
          <button class="btn btn-lg btn-secondary">Draw line</button>
          <button class="btn btn-lg btn-secondary" aria-pressed="true">Draw line</button>
          <button class="btn btn-lg btn-primary">New project</button>
          <button class="btn btn-lg btn-danger">Stop</button>
          <button class="btn btn-lg btn-secondary" data-complete="true">Import distances</button>
          <button class="btn btn-lg btn-secondary" disabled>Unavailable</button>
        </div>
        <h3>after — .btn (40px, 14px), the audit's size</h3>
        <div class="row">
          <button class="btn btn-secondary">Draw line</button>
          <button class="btn btn-secondary" aria-pressed="true">Draw line</button>
          <button class="btn btn-primary">New project</button>
          <button class="btn btn-danger">Stop</button>
        </div>
        <h3>icon buttons — .ib (45px) then .ibtn (32px) and .ibtn-sm (24px)</h3>
        <div class="row">
          <button class="ib">&#9654;</button>
          <button class="ib active">&#9654;</button>
          <button class="ib ib-danger">&#128465;</button>
        </div>
        <div class="row">
          <button class="ibtn">&#9654;</button>
          <button class="ibtn" aria-pressed="true">&#9654;</button>
          <button class="ibtn ibtn-danger">&#128465;</button>
          <button class="ibtn" data-state="success">&#10003;</button>
          <button class="ibtn" aria-disabled="true" title="Run STIV first">&#9654;</button>
          <button class="ibtn ibtn-sm">&#9654;</button>
        </div>
      `;
      panes.forEach((p) => (p.innerHTML = body(p.dataset.theme)));
    </script>
  </body>
</html>
```

- [ ] **Step 2: Verify it renders all three themes with no missing tokens**

Run: `open docs/superpowers/previews/2026-09-24-phase-6b-buttons.html`

Check, in each of the three panes: every button has a visible fill or outline; no button renders as unstyled browser default (that would mean the stylesheet path is wrong); the pressed and `data-complete` buttons show the accent fill; the `aria-disabled` icon button is dimmed **and still shows its tooltip on hover** (this is the 6a contract — a natively `disabled` button would not).

If the relative stylesheet path does not resolve, fix the path — do not inline a copy of the rules.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/previews/2026-09-24-phase-6b-buttons.html
git commit -m "$(cat <<'EOF'
Add a three-theme preview of the button size change

6b resizes every button in the app (50px/20px legacy to 48px/16px). The spec
requires previews before 6c-6f and not for 6b, but 6b is the sub-plan that
makes the change. Links the real stylesheet rather than copying rules so it
cannot drift.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011cZG8ZfMukQVEkPP5V8VvV
EOF
)"
```

---

## Task 3: Migrate the 11 plain action buttons

**Files:**
- Modify: `src/components/Forms/FormVideo.tsx:166`, `:186`
- Modify: `src/pages/Uav.tsx:161`
- Modify: `src/pages/Oblique.tsx:190`
- Modify: `src/pages/HomePage.tsx:52`, `:55`
- Modify: `src/pages/CameraCalibration.tsx:384`, `:387`, `:390`, `:522`, `:527`
- Test: covered by Task 11's sweep guard; no new test in this task

**Interfaces:**
- Consumes: `.btn`, `.btn-lg`, `.btn-primary`, `.btn-secondary`, `.btn-tertiary` (Phase 3a, `src/index.css:607-693`).
- Produces: nothing later tasks import.

These 11 buttons have no state modifier. Each keeps its `id`, `onClick`, `ref`, `disabled`, `title` and children **exactly** as they are; only `className` changes, plus `type="button"` where noted. `.form-button`, `.solver-button` and `.button-rectification` are **layout** classes (flex sizing, widths, margins) and stay — they do not set colour or height.

Role mapping, by what the button does:

| Site | Current `className` | New `className` | Role |
|---|---|---|---|
| `FormVideo.tsx:166` | `"wizard-button form-button me-1"` | `"btn btn-lg btn-secondary form-button me-1"` | sets the start time — secondary |
| `FormVideo.tsx:186` | `"wizard-button form-button me-1"` | `"btn btn-lg btn-secondary form-button me-1"` | sets the end time — secondary |
| `Uav.tsx:161` | `"wizard-button form-button solver-button"` | `"btn btn-lg btn-primary form-button solver-button"` | runs the solver — primary |
| `Oblique.tsx:190` | `"wizard-button form-button solver-button"` | `"btn btn-lg btn-primary form-button solver-button"` | runs the solver — primary |
| `HomePage.tsx:52` | `"button-1"` | `"btn btn-lg btn-primary"` | new project — the screen's primary |
| `HomePage.tsx:55` | `"button-1"` | `"btn btn-lg btn-secondary"` | load project — secondary |
| `CameraCalibration.tsx:384` | `"button-1"` | `"btn btn-lg btn-secondary"` | open board — secondary |
| `CameraCalibration.tsx:387` | `"button-1"` | `"btn btn-lg btn-secondary"` | open folder — secondary |
| `CameraCalibration.tsx:390` | `"button-1"` | `"btn btn-lg btn-primary"` | solve — primary |
| `CameraCalibration.tsx:522` | `"wizard-button button-1"` | `"btn btn-lg btn-tertiary"` | back — navigational |
| `CameraCalibration.tsx:527` | `"wizard-button button-1"` | `"btn btn-lg btn-primary"` | save profile — primary |

- [ ] **Step 1: Apply the 11 className changes**

Edit each site per the table. Match on the exact current `className` string; two sites in `FormVideo.tsx` share the same string, so disambiguate by the `id` on the same element (`start-button` at 166, `end-button` at 186).

- [ ] **Step 2: Add the missing `type="button"`**

`CameraCalibration.tsx:522` and `:527` have no `type` attribute, so they take the HTML default of `submit`. Add `type="button"` to both. Do not add it anywhere it is already present.

**Corrected after Tasks 3-5 were reviewed:** an earlier version of this step claimed these two buttons "default to submit inside a `<form>`". They are not inside a form — `CameraCalibration.tsx` contains no `<form>` element, and neither does the `HomePage` that mounts it, so `type` has **no functional effect here today**. The addition is hygiene, not a bug fix: `submit` is the wrong default for a button that closes a dialog or saves a profile by callback, and 6e re-lays this screen out onto the standard workspace, where a surrounding form is likely. Do not go looking for the same "bug" elsewhere on the strength of the original wording.

- [ ] **Step 3: Verify nothing regressed**

Run: `npx jest` → expect the Task 1 count, unchanged.
Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → expect `64`.
Run: `npm run lint` → expect `20 problems`. Prettier may want to reflow a `className` that got longer; if so run `npx eslint <the changed files> --fix`.

- [ ] **Step 4: Verify the count by grep**

Run: `grep -rn "wizard-button\|button-1" src --include="*.tsx" | wc -l`
Expected: **16**, down from **27** (measured on `89a5572`). The 11 removed are exactly this task's sites. The 16 remaining are Task 4's nine toggles and Task 5's seven completion/busy sites, less the two that share a line — verify the remainder is that set rather than only the count.

- [ ] **Step 5: Commit**

```bash
git add src/components/Forms/FormVideo.tsx src/pages/Uav.tsx src/pages/Oblique.tsx src/pages/HomePage.tsx src/pages/CameraCalibration.tsx
git commit -m "$(cat <<'EOF'
Migrate the 11 stateless action buttons to the .btn family

Mapped by role rather than by old class name, per spec section 4/6b. The
layout co-classes (.form-button, .solver-button) stay: they set flex sizing
and margins, not colour or height.

Also adds the missing type="button" to the two calibration footer buttons,
which defaulted to submit inside a form.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011cZG8ZfMukQVEkPP5V8VvV
EOF
)"
```

---

## Task 4: Migrate the 9 toggle buttons to `aria-pressed`

**Files:**
- Modify: `src/components/Carousel.tsx:202`
- Modify: `src/components/Forms/FormOblique.tsx:75`
- Modify: `src/components/Forms/FormIpcam.tsx:98`, `:108`
- Modify: `src/components/Forms/FormCrossSections.tsx:168`, `:185`
- Modify: `src/components/Forms/FormUav.tsx:84`
- Modify: `src/pages/CameraCalibration.tsx:592`, `:600`

**Interfaces:**
- Consumes: `.btn[aria-pressed="true"]` from Task 1.
- Produces: nothing later tasks import.

These nine are genuine toggles: the boolean that drove `wizard-button-active` is a mode the user turns on and off. The class moves out of `className` and becomes an `aria-pressed` attribute, which is both the CSS hook and the accessibility fix — today a screen reader gets no indication that these buttons have a state at all.

**Pattern.** Before:

```tsx
className={`wizard-button form-button me-1 ${drawLine ? 'wizard-button-active' : ''}`}
```

After:

```tsx
className="btn btn-lg btn-secondary form-button me-1"
aria-pressed={drawLine}
```

`aria-pressed` takes the boolean directly — React renders `aria-pressed="true"` / `"false"`. Do **not** write `aria-pressed={drawLine ? 'true' : 'false'}`; the boolean is correct and shorter. If the expression is not already a boolean, coerce it in the attribute (noted per site below).

| Site | Current `className` | New `className` | New attribute |
|---|---|---|---|
| `Carousel.tsx:202` | `` `wizard-button button-rectification ${showMedian ? 'wizard-button-active' : ''}` `` | `"btn btn-lg btn-secondary button-rectification"` | `aria-pressed={showMedian}` |
| `FormOblique.tsx:75` | `` `wizard-button form-button me-1 ${drawPoints ? 'wizard-button-active' : ''}` `` | `"btn btn-lg btn-secondary form-button me-1"` | `aria-pressed={drawPoints}` |
| `FormIpcam.tsx:98` | `` `wizard-button me-1 button-rectification ${cameraSolution === null ? 'mb-2' : ''} ${cameraSolution?.mode === 'direct-solve' \|\| mode === 'direct-solve' ? 'wizard-button-active' : ''}` `` | `` `btn btn-lg btn-secondary me-1 button-rectification ${cameraSolution === null ? 'mb-2' : ''}` `` | `aria-pressed={cameraSolution?.mode === 'direct-solve' \|\| mode === 'direct-solve'}` |
| `FormIpcam.tsx:108` | `` `wizard-button button-rectification ${cameraSolution === null ? 'mb-2' : ''} ${cameraSolution?.mode === 'optimize-solution' \|\| mode === 'optimize-solution' ? 'wizard-button-active' : ''}` `` | `` `btn btn-lg btn-secondary button-rectification ${cameraSolution === null ? 'mb-2' : ''}` `` | `aria-pressed={cameraSolution?.mode === 'optimize-solution' \|\| mode === 'optimize-solution'}` |
| `FormCrossSections.tsx:168` | `` `wizard-button form-button me-1 ${drawLine ? 'wizard-button-active' : ''}` `` | `"btn btn-lg btn-secondary form-button me-1"` | `aria-pressed={drawLine}` |
| `FormCrossSections.tsx:185` | `` `wizard-button form-button me-1 ${drawLine ? 'wizard-button-active' : ''}` `` | `"btn btn-lg btn-secondary form-button me-1"` | `aria-pressed={drawLine}` |
| `FormUav.tsx:84` | `` `wizard-button form-button me-1 ${drawLine ? 'wizard-button-active' : ''}` `` | `"btn btn-lg btn-secondary form-button me-1"` | `aria-pressed={drawLine}` |
| `CameraCalibration.tsx:592` | `` `wizard-button${viewMode !== 'heatmap' ? ' wizard-button-active' : ''}` `` | `"btn btn-lg btn-secondary"` | `aria-pressed={viewMode !== 'heatmap'}` |
| `CameraCalibration.tsx:600` | `` `wizard-button${viewMode === 'heatmap' ? ' wizard-button-active' : ''}` `` | `"btn btn-lg btn-secondary"` | `aria-pressed={viewMode === 'heatmap'}` |

`FormCrossSections.tsx:168` and `:185` carry the identical string; disambiguate by surrounding context (they are in different branches of the same component — confirm with `grep -n` after each edit that exactly one remains).

- [ ] **Step 1: Apply the 9 changes**

Note on the two `FormIpcam` sites: the `mb-2` ternary stays in `className` because it is a layout class, while the active ternary becomes `aria-pressed`. The template literal therefore survives — do not flatten it to a plain string.

- [ ] **Step 2: Leave a pointer for 6e**

`CameraCalibration.tsx:592`/`:600` are a two-option view switch — canonically 6a's `.seg` segmented control, which 6e will build when it re-lays out this screen. Add this comment immediately above the `<div className="cal-view-controls">` that wraps them:

```tsx
{/* Two mutually exclusive view modes: 6e converts this pair to 6a's .seg
    segmented control as part of the calibration re-layout. Kept as two
    aria-pressed buttons here so 6b's sweep guard holds. */}
```

- [ ] **Step 3: Verify**

Run: `npx jest` → unchanged count.
Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → expect `64`. A TS error here most likely means an `aria-pressed` expression is not a `boolean` — coerce with `!!`, do not cast.
Run: `npm run lint` → expect `20 problems`.
Run: `grep -rn "wizard-button-active" src --include="*.tsx" | wc -l` → expect **7**, down from 16: Task 5's six completion sites plus `FormAnalizing.tsx:81`'s busy site.

- [ ] **Step 4: Commit**

```bash
git add src/components/Carousel.tsx src/components/Forms/FormOblique.tsx src/components/Forms/FormIpcam.tsx src/components/Forms/FormCrossSections.tsx src/components/Forms/FormUav.tsx src/pages/CameraCalibration.tsx
git commit -m "$(cat <<'EOF'
Move the 9 toggle buttons onto aria-pressed

These carried wizard-button-active from a boolean the user toggles. The state
now lives in aria-pressed, which is both the CSS hook and an accessibility
fix: a screen reader previously got no indication these buttons had a state.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011cZG8ZfMukQVEkPP5V8VvV
EOF
)"
```

---

## Task 5: Migrate the 6 completion / busy buttons

**Files:**
- Modify: `src/components/Forms/FormOblique.tsx:88`
- Modify: `src/components/Forms/FormIpcam.tsx:65`, `:78`
- Modify: `src/components/Forms/FormCrossSections.tsx:152`, `:213`
- Modify: `src/pages/FootageMode.tsx:152`
- Modify: `src/components/Forms/FormAnalizing.tsx:81`

**Interfaces:**
- Consumes: `.btn[data-complete="true"]` and `.btn[aria-busy="true"]` from Task 1.
- Produces: nothing later tasks import.

These seven sites (six completion, one busy) also used `wizard-button-active`, but the boolean is **not** a toggle — it reports that a step has produced data, or that work is running. `aria-pressed="true"` would make a screen reader announce "pressed", which is false. Per ruling R2 they keep the same accent fill via a different attribute.

| Site | Boolean | New `className` | New attribute |
|---|---|---|---|
| `FormOblique.tsx:88` | `isDistancesLoaded` | `"btn btn-lg btn-secondary form-button me-1"` | `data-complete={isDistancesLoaded}` |
| `FormIpcam.tsx:65` | `points !== null` | `"btn btn-lg btn-secondary form-button me-1"` | `data-complete={points !== null}` |
| `FormIpcam.tsx:78` | `imagesPath !== null` | `"btn btn-lg btn-secondary form-button me-1"` | `data-complete={imagesPath !== null}` |
| `FormCrossSections.tsx:152` | `bathimetry.path` | `"btn btn-lg btn-secondary form-button bathimetry-button mt-1 me-1"` | `data-complete={!!bathimetry.path}` |
| `FormCrossSections.tsx:213` | `bathimetry.path` | `"btn btn-lg btn-secondary form-button bathimetry-button me-1"` | `data-complete={!!bathimetry.path}` |
| `FootageMode.tsx:152` | `video` | `"btn btn-lg btn-secondary"` | `data-complete={!!video}` |
| `FormAnalizing.tsx:81` | `isBackendWorking` | `"btn btn-lg btn-primary form-button"` | `aria-busy={isBackendWorking}` |

**`data-*` attributes need a boolean here, and `!!` is required on three of them.** React 18.3.1 renders `data-complete={true}` as `data-complete="true"` and `data-complete={false}` as **`data-complete="false"`** — it does *not* omit the attribute for `false` (only `undefined` and `null` omit it; verified with `renderToStaticMarkup` during Task 1's review). The CSS selector is `[data-complete="true"]`, so `"false"` simply does not match and the state is off, which is the behaviour we want either way.

What the `!!` is for is different: `bathimetry.path` and `video` are a string and an object, and React would render `data-complete="/some/path.csv"` — which never matches `[data-complete="true"]`, so the state would be silently dead rather than erroring. Hence `!!` on the three non-boolean cases above. It is required, not cosmetic.

`aria-busy` is a real ARIA attribute and takes the boolean directly.

- [ ] **Step 1: Apply the 7 changes**

`FormAnalizing.tsx:81` changes variant as well as class: it is the screen's analyze action, so it becomes `btn-primary` rather than `btn-secondary`. Its old `wizard-button` styling was the same neutral outline as every other legacy button, which is finding #2 in the audit ("every action looks the same") — this is the fix, not scope creep.

- [ ] **Step 2: Verify**

Run: `npx jest` → unchanged count.
Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → expect `64`.
Run: `npm run lint` → expect `20 problems`.
Run: `grep -rn "wizard-button" src --include="*.tsx" | wc -l` → expect **0**.
Run: `grep -rn "button-1" src --include="*.tsx" | wc -l` → expect **0**.

- [ ] **Step 3: Commit**

```bash
git add src/components/Forms/FormOblique.tsx src/components/Forms/FormIpcam.tsx src/components/Forms/FormCrossSections.tsx src/pages/FootageMode.tsx src/components/Forms/FormAnalizing.tsx
git commit -m "$(cat <<'EOF'
Split completion and busy out of the old active class

Six of these buttons light up because a step produced data and one because
work is running - neither is a toggle, so aria-pressed would make a screen
reader announce "pressed" falsely. They keep the same accent fill through
data-complete and aria-busy.

FormAnalizing's analyze button also becomes btn-primary: it is the screen's
main action and looked identical to every neutral button, which is the audit's
finding #2.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011cZG8ZfMukQVEkPP5V8VvV
EOF
)"
```

---

## Task 6: Migrate the 2 danger buttons and the 2 loader buttons

**Files:**
- Modify: `src/components/Forms/FormAnalizing.tsx:96`
- Modify: `src/components/Forms/FormProcessing.tsx:299`, `:309`
- Modify: `src/components/Forms/Components/HardModeProcessing.tsx:57`

**Interfaces:**
- Consumes: `.btn-danger`, `.btn[aria-busy="true"]` from Task 1.
- Produces: nothing later tasks import.

`button-with-loader` is the one legacy class that **survives**, per spec §4/6b: it stays as a modifier carrying the in-button progress behaviour, applied alongside `.btn`. Its CSS is therefore **not** deleted in Task 10 — but the parts of it that duplicate `.btn` (height, border, radius, background, colour, font) must go, or it will override the primitive it is supposed to modify.

| Site | Current `className` | New `className` | New attribute |
|---|---|---|---|
| `FormAnalizing.tsx:96` | `` `danger-button ${isBackendWorking ? 'danger-button-active' : ''}` `` | `"btn btn-lg btn-danger"` | *(none — see below)* |
| `FormProcessing.tsx:309` | `"danger-button"` | `"btn btn-lg btn-danger"` | *(none)* |
| `FormProcessing.tsx:299` | `"button-with-loader me-1"` | `"btn btn-lg btn-primary button-with-loader me-1"` | *(none)* |
| `HardModeProcessing.tsx:57` | `` `button-with-loader me-1 ${isBackendWorking && isTesting ? 'button-with-loader-active' : ''}` `` | `"btn btn-lg btn-primary button-with-loader me-1"` | `aria-busy={isBackendWorking && isTesting}` |

**`danger-button-active` is dropped with no replacement, deliberately.** It is applied at `FormAnalizing.tsx:96` but **no CSS rule of that name exists anywhere** — verify with `grep -rn "danger-button-active" src --include="*.css"`, which returns nothing. It has never had a visual effect. The stop button is already `btn-danger` red and already `disabled={!isBackendWorking}`, so the state it was reaching for is conveyed twice over.

- [ ] **Step 1: Apply the 4 changes**

- [ ] **Step 2: Reduce `.button-with-loader` to a modifier**

In `src/index.css`, replace the whole `.button-with-loader` rule (currently lines 557-571) with just the properties `.btn` does not provide, and delete the `:hover` and `:disabled` rules that fight the primitive. Replace lines 557-597 with:

```css
/* =============================================================================
   BUTTON-WITH-LOADER (modifier)
   The one legacy button class that survives Phase 6b, per spec section 4/6b:
   it carries the in-button progress layout, which the .btn family has no
   equivalent for. Applied alongside .btn (className="btn btn-lg btn-primary
   button-with-loader"), so everything .btn already sets - height, border,
   radius, background, colour, font, hover, disabled - is deliberately absent
   here. Adding any of them back would override the primitive this modifies.
   ============================================================================= */

.button-with-loader {
  justify-content: space-around;
  flex-shrink: 0;
}

.button-with-loader p {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
```

Note what is gone and why: `display: flex` (`.btn` is `inline-flex`), `min-height: 50px` (`.btn-lg` sizes it), `background-color` / `color` / `border` / `border-radius` (`.btn-primary` and `.btn` set these), `padding-left`/`padding-right` (`.btn-lg` has `padding: 0 var(--space-6)`), `align-items: center` (`.btn` has it), `font-size: 20px`/`font-weight: 400` on the `p` (`.btn` sets 14/16px 700 and the `p` should inherit), `.button-with-loader:hover`, `.button-with-loader-active` and `.button-with-loader:disabled` (`.btn` handles all three, the last two via `aria-busy` and `:disabled`).

**Correction (amendment A8).** This step originally listed `width: 165px` among the properties `.btn-lg` replaces. It does not: `.btn-lg` sets height and horizontal padding, neither of which fixes a width. The spinner is a conditionally rendered child, so a content-sized loader button changes width the instant it starts working — the button jumps under the cursor that just clicked it. The surviving rule therefore keeps `min-width: 165px`, which holds the button stable across the spinner toggle without the clipping a fixed `width` causes once a label is translated into a longer locale. A property `.btn` does not provide is not a duplicate, and "the primitive handles sizing" has to be checked property by property rather than assumed.

- [ ] **Step 3: Check the `button-with-loader-active` class is now unreferenced**

Run: `grep -rn "button-with-loader-active" src`
Expected: nothing. `HardModeProcessing.tsx` was its only consumer and Step 1 replaced it with `aria-busy`.

- [ ] **Step 4: Verify**

Run: `npx jest` → unchanged count.
Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → expect `64`.
Run: `npm run lint` → expect `20 problems`.
Run: `grep -rn "danger-button" src --include="*.tsx" | wc -l` → expect **0**.

- [ ] **Step 5: Commit**

```bash
git add src/components/Forms/FormAnalizing.tsx src/components/Forms/FormProcessing.tsx src/components/Forms/Components/HardModeProcessing.tsx src/index.css
git commit -m "$(cat <<'EOF'
Migrate the danger and loader buttons, reducing the loader to a modifier

button-with-loader survives as a modifier per spec section 4/6b, so everything
in it that duplicated .btn - height, border, radius, fill, font, hover,
disabled - is removed; leaving those in would override the primitive it is
meant to modify.

danger-button-active is dropped with no replacement: it was applied in
FormAnalizing but no CSS rule of that name has ever existed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011cZG8ZfMukQVEkPP5V8VvV
EOF
)"
```

---

## Task 7: Migrate the 4 row icon buttons, with a size prop

**Files:**
- Modify: `src/components/CustomIcons/TrashBtn.tsx:28`
- Modify: `src/components/CustomIcons/EyeBtn.tsx:23`
- Modify: `src/components/CustomIcons/EditMaskBtn.tsx:20`
- Modify: `src/components/CustomIcons/MaskBtn.tsx:29`
- Test: `src/helpers/rowIconButtons.test.ts` (**new**)

**Interfaces:**
- Consumes: `.ibtn`, `.ibtn-sm` (6a, `src/index.css:955`), `.ibtn-danger`, `.ibtn[aria-pressed]`, `.ibtn[data-state="success"]` (Task 1).
- **Produces, for 6c:** each of these four components accepts an optional `size?: 'md' | 'sm'` prop, defaulting to `'md'`. `'sm'` adds `ibtn-sm`. 6c places `TrashBtn`, `EyeBtn` and `EditMaskBtn` inside `.list-row`, where 6a's 32px `.ibtn` would fill a 32px row edge to edge — `.ibtn-sm` (24px) is why 6a built it.

These four are the icon buttons that 6c must place inside `.list-row`. They are migrated first, and given the size prop in the same task, so 6c does not have to reopen them.

- [ ] **Step 1: Write the failing test**

Create `src/helpers/rowIconButtons.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The four icon buttons 6c places inside .list-row. Each must be on the .ibtn
 * primitive and must accept size="sm", because .ibtn is 32px and a 32px row
 * would be filled edge to edge — which is why 6a built .ibtn-sm at 24px.
 *
 * Source-text assertions: this project's Jest runs with testEnvironment
 * "node" and has no DOM, so a rendered-output test is not available here.
 */
const COMPONENTS = ['TrashBtn', 'EyeBtn', 'EditMaskBtn', 'MaskBtn'] as const;

const source = (name: string): string =>
  readFileSync(join(__dirname, '..', 'components', 'CustomIcons', `${name}.tsx`), 'utf8');

describe.each(COMPONENTS)('%s', (name) => {
  const src = source(name);

  it('uses the .ibtn primitive and no longer uses the legacy .ib', () => {
    expect(src).toContain('ibtn');
    // A standalone `ib` class token, i.e. not the `ibtn`/`ibtn-sm` prefix.
    expect(src).not.toMatch(/\bib\b(?!tn)/);
  });

  it('accepts a size prop and maps "sm" to .ibtn-sm', () => {
    expect(src).toMatch(/size\??:\s*'md'\s*\|\s*'sm'/);
    expect(src).toContain('ibtn-sm');
  });
});

describe('TrashBtn danger affordance', () => {
  it('carries .ibtn-danger and drives the armed fill from data-armed', () => {
    const src = source('TrashBtn');
    expect(src).toContain('ibtn-danger');
    expect(src).toContain('data-armed');
    // The old `.is-armed` class is replaced by the data attribute.
    expect(src).not.toContain('is-armed');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx jest src/helpers/rowIconButtons.test.ts`
Expected: FAIL — all four `ibtn` assertions fail because the components still say `ib`.

- [ ] **Step 3: Migrate the four components**

For each, add the size prop to its props type and interface, and build the class list. The concrete pattern, using `EditMaskBtn.tsx` (currently `<button type="button" className="ib" onClick={handleClick}>`):

```tsx
className={`ibtn${size === 'sm' ? ' ibtn-sm' : ''}`}
```

with the prop added to the component's existing props type as `size?: 'md' | 'sm'` and destructured with a default: `size = 'md'`.

Per-component specifics:

- **`EditMaskBtn.tsx:20`** — `className="ib"` → the pattern above.
- **`EyeBtn.tsx:23`** — currently `` className={`ib ${active ? '' : ''}`} `` , a ternary with two empty branches that has never done anything. Replace with `` className={`ibtn${size === 'sm' ? ' ibtn-sm' : ''}`} `` and add `aria-pressed={active}`, which is what the dead ternary was reaching for.
- **`MaskBtn.tsx:29`** — currently `` className={`ib ${className}`} `` with a comment in Spanish noting `.active`/`.pulse` were removed. Replace with `` className={`ibtn${size === 'sm' ? ' ibtn-sm' : ''} ${className}`} `` and delete the stale comment.
- **`TrashBtn.tsx:28`** — currently `` className={`ib ib-danger ${armed ? 'is-armed' : ''}`} ``. Replace with:
  ```tsx
  className={`ibtn ibtn-danger${size === 'sm' ? ' ibtn-sm' : ''}`}
  data-armed={armed}
  ```
  `armed` is already a boolean in this component — confirm before relying on it; if it is not, wrap in `!!`. The `.cl` icon-stack markup and the `wiggle` animation stay exactly as they are; Task 10 keeps their CSS.

- [ ] **Step 4: Run the test and the suite**

Run: `npx jest src/helpers/rowIconButtons.test.ts` → PASS.
Run: `npx jest` → previous count + 9 (4 components × 2 tests + 1 TrashBtn test).
Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → expect `64`. A new error most likely means a caller passes a prop the new type does not allow, or `size` was added to a type alias that a caller spreads — read the error rather than casting.
Run: `npm run lint` → expect `20 problems`.

- [ ] **Step 5: Commit**

```bash
git add src/components/CustomIcons/TrashBtn.tsx src/components/CustomIcons/EyeBtn.tsx src/components/CustomIcons/EditMaskBtn.tsx src/components/CustomIcons/MaskBtn.tsx src/helpers/rowIconButtons.test.ts
git commit -m "$(cat <<'EOF'
Move the four row icon buttons to .ibtn and give them a size prop

These are the icon buttons 6c places inside .list-row, so they get size="sm"
(.ibtn-sm, 24px) in the same change - .ibtn is 32px and would fill a 32px row
edge to edge, which is why 6a built the small variant.

EyeBtn's active ternary had two empty branches and had never rendered
anything; it becomes aria-pressed, which is what it was reaching for.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011cZG8ZfMukQVEkPP5V8VvV
EOF
)"
```

---

## Task 8: Migrate the 7 chrome and selector icon buttons

**Files:**
- Modify: `src/components/ThemeToggle.tsx:32`
- Modify: `src/components/CustomIcons/LanguageSelector.tsx:64`
- Modify: `src/components/CustomIcons/UnitSelector.tsx:20`, `:57`
- Modify: `src/components/CustomIcons/CopyBtn.tsx:30`
- Modify: `src/components/CustomIcons/ExportBtn.tsx:37`
- Modify: `src/components/Forms/FormResults.tsx:98`

**Interfaces:**
- Consumes: `.ibtn`, `.ibtn[aria-pressed]`, `.ibtn[data-state="success"]` (Task 1).
- Produces: nothing later tasks import.

| Site | Current | New |
|---|---|---|
| `ThemeToggle.tsx:32` | `` `ib ${open ? 'active' : ''}` `` | `className="ibtn"` + `aria-pressed={open}` |
| `LanguageSelector.tsx:64` | `` `ib ${open ? 'active' : ''}` `` | `className="ibtn"` + `aria-pressed={open}` |
| `UnitSelector.tsx:20` | `"ib"` with `style={{ border: 'none' }}` | `className="ibtn"`, **delete the inline `style`** — `.ibtn` already has `border: 0`, and the inline override existed only to cancel `.ib`'s 2px border |
| `UnitSelector.tsx:57` | `` `ib ${open ? 'active' : ''}` `` | `className="ibtn"` + `aria-pressed={open}` |
| `CopyBtn.tsx:30` | `` `ib ${isAnimating ? 'active' : ''}` `` | `className="ibtn"` + `data-state={isAnimating ? 'success' : undefined}` — the animation signals a successful copy, not a toggled mode |
| `ExportBtn.tsx:37` | `` `ib ${phase === 'running' ? 'active' : ''} ${isDone ? 'is-success' : ''} ${className}` `` | `` className={`ibtn ${className}`} `` + `aria-busy={phase === 'running'}` + `data-state={isDone ? 'success' : undefined}` |
| `FormResults.tsx:98` | `` hasGaps ? `ib${interpolated ? ' active' : ''}` : 'ib ib-off' `` | `className="ibtn"` + `aria-pressed={interpolated}` + `aria-disabled={!hasGaps}` |

**No CSS changes in this task.** `ExportBtn` needs `.ibtn[aria-busy="true"]`, and Task 1 already wrote it into the same rule as `.ibtn[aria-pressed="true"]` for exactly this reason — so no task has to edit another task's rule. If that selector is missing, stop and report it rather than adding it here.

**`FormResults.tsx:98` is the important one.** It currently hand-rolls the `aria-disabled` workaround with `ib-off` because `.ib:disabled` sets `pointer-events: none`, which would kill the `title` explaining *why* interpolation is unavailable. The migration replaces that with the primitive's own contract: `aria-disabled={!hasGaps}` keeps the tooltip and dims the control. The existing `title` and `aria-label` ternaries stay exactly as they are.

**A click guard is now required at `FormResults.tsx:98`.** `aria-disabled` is advisory — unlike `disabled`, it does **not** stop the click. Whatever the `onClick` is, it must return early when `!hasGaps`. Read the handler and add the guard; if the handler is inline, wrap its body:

```tsx
onClick={() => {
  if (!hasGaps) return;
  /* existing body unchanged */
}}
```

This is the same contract 6a documented for `.btn`/`.ibtn` and the reason the phase supports both disabled readings.

- [ ] **Step 1: Apply the 7 `className` and attribute changes**

- [ ] **Step 2: Add the `FormResults` click guard**

- [ ] **Step 3: Verify**

Run: `npx jest` → unchanged count (no new tests in this task; Task 11's sweep covers it).
Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → expect `64`.
Run: `npm run lint` → expect `20 problems`.
Run: `grep -rnE 'className=[^>]*\bib\b(?!tn)' src --include="*.tsx" | wc -l` → expect **3** (Task 9's video transport buttons).

- [ ] **Step 4: Commit**

```bash
git add src/components/ThemeToggle.tsx src/components/CustomIcons/LanguageSelector.tsx src/components/CustomIcons/UnitSelector.tsx src/components/CustomIcons/CopyBtn.tsx src/components/CustomIcons/ExportBtn.tsx src/components/Forms/FormResults.tsx
git commit -m "$(cat <<'EOF'
Move the chrome and selector icon buttons to .ibtn

Each old `active` class is replaced by the attribute that states what it
meant: aria-pressed for an open popover, data-state="success" for a completed
copy or export, aria-busy for one in flight.

FormResults hand-rolled the aria-disabled workaround with ib-off, because
.ib:disabled sets pointer-events:none and would have killed the title
explaining why interpolation is unavailable. It now uses the primitive's own
contract, with the click guard aria-disabled requires.

UnitSelector loses an inline border:none that existed only to cancel .ib's
2px border.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011cZG8ZfMukQVEkPP5V8VvV
EOF
)"
```

---

## Task 9: Migrate the 3 video transport buttons

**Files:**
- Modify: `src/components/CustomIcons/VideoPlayerIcons/PlayBtn.tsx:34`
- Modify: `src/components/CustomIcons/VideoPlayerIcons/SoundBtn.tsx:23`
- Modify: `src/components/CustomIcons/VideoPlayerIcons/FrameBtn.tsx:48`

**Interfaces:**
- Consumes: `.ibtn` (Phase 3a / Task 1).
- Produces: nothing later tasks import.

| Site | Current | New |
|---|---|---|
| `PlayBtn.tsx:34` | `` `ib ${control.play ? '' : ''}` `` | `className="ibtn"` — the ternary has two empty branches and has never rendered anything; drop it rather than preserving it |
| `SoundBtn.tsx:23` | `"ib"` | `className="ibtn"` |
| `FrameBtn.tsx:48` | `"ib"` | `className="ibtn"` |

These three are migrated separately from Task 8 because they sit in the video player, the one place where the 45px → 32px change is most visible as a group. Verify them together in the preview from Task 2 before committing.

- [ ] **Step 1: Apply the 3 changes**

- [ ] **Step 2: Verify**

Run: `npx jest` → unchanged count.
Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → expect `64`.
Run: `npm run lint` → expect `20 problems`.
Run: `grep -rnE 'className=[^>]*\bib\b(?!tn)' src --include="*.tsx" | wc -l` → expect **0**.

- [ ] **Step 3: Commit**

```bash
git add src/components/CustomIcons/VideoPlayerIcons/
git commit -m "$(cat <<'EOF'
Move the video transport buttons to .ibtn

PlayBtn's class ternary had two empty branches and never rendered anything; it
is dropped rather than carried over.

This is the last of the 14 .ib call sites.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011cZG8ZfMukQVEkPP5V8VvV
EOF
)"
```

---

## Task 10: Delete the legacy CSS

**Files:**
- Modify: `src/index.css` — delete `.danger-button` (427-454), `.button-transparent` (456-461), `.button-1` (463-488), `.label-1` (490-494), `.wizard-button` (496-537)
- Modify: `src/components/CustomIcons/piv-icons.css` — delete `.ib` (9-26), `.ib.is-success` (28-32), `.ib:active` (35-37), `.ib:disabled` (39-44), `.ib-off` (46-50), `.ib-off:active` (52-54), `.ib.active` (56-60), `.ib-danger` (62-64), `.ib-danger:hover` (66-70), `.ib-danger:hover .cl` (72-74), `.ib-danger.is-armed` (76-80)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. This task removes.

Line numbers are as of `89a5572` and **will have shifted** — Task 6 already rewrote `src/index.css:557-597`. Locate each rule by its selector, not by line number.

**Three things stay, and a reviewer will ask about each:**
- `.video-button` (`src/index.css:539-555`) — 7 live call sites, out of 6b's scope per ruling R5.
- `.button-with-loader` and `.button-with-loader p` — the surviving modifier, reduced in Task 6.
- `.cl`, `.cl.show` and the `wiggle` keyframes in `piv-icons.css` — `TrashBtn` still uses the icon-stack markup and the wiggle animation. Only the `.ib-danger:hover .cl` *trigger* is deleted; Task 1's `.ibtn-danger` replaces the fill, and the wiggle now needs a new trigger.

**The wiggle animation needs re-hooking.** `.ib-danger:hover .cl { animation: wiggle ... }` was the only thing starting it. Add its replacement to `src/index.css`, next to the `.ibtn-danger` rule:

```css
.ibtn-danger:hover:not(:disabled):not([aria-disabled="true"]) .cl {
  animation: wiggle 0.48s ease both;
}
```

The `wiggle` keyframes themselves live in `piv-icons.css` and are global, so this works across stylesheets — verify by hovering the delete button in the running app or by confirming `@keyframes wiggle` is not inside any `@scope`/`@layer` block.

- [ ] **Step 1: Confirm every class is unreferenced before deleting**

Run:
```bash
for c in danger-button button-transparent button-1 label-1 wizard-button ib-off ib-danger is-armed; do
  printf '%-22s %s\n' "$c" "$(grep -rn "$c" src --include='*.tsx' | wc -l | tr -d ' ')"
done
```
Expected: `0` for every one. A non-zero count means an earlier task missed a site — fix that first; do not delete a rule that still has a consumer.

Note `button-1` will also match `button-1` inside longer identifiers if any exist; if the count is non-zero, inspect before concluding.

- [ ] **Step 2: Delete the rules from `src/index.css`**

- [ ] **Step 3: Delete the `.ib*` rules from `piv-icons.css` and add the wiggle trigger to `src/index.css`**

- [ ] **Step 4: Verify**

Run: `npx jest` → unchanged count. If `src/helpers/cssRules.test.ts` fails, read it: it may assert a rule count or the presence of a deleted selector, in which case update the assertion to match the new reality and say so in the commit.
Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → expect `64`.
Run: `npm run lint` → expect `20 problems`.

- [ ] **Step 5: Confirm the deletions by grep**

Run: `grep -rnE "^\s*\.(wizard-button|button-1|danger-button|ib)([ ,:.{]|$)" src --include="*.css" | wc -l` → expect **0**.

**Correction (amendment A9).** This check was originally written as `grep -rn "wizard-button\|button-1\|danger-button\|\.ib[ ,:.{]" src --include="*.css"` expecting 0, and it returns 4 even when the deletion is complete and correct: all four matches are comment prose naming the classes that were removed (`.button-1, .wizard-button(-active) and .danger-button were the legacy equivalents`). A verification grep that a correct implementation fails is worse than no grep — it invites an implementer to either stop and ask or, far worse, delete the explanatory comments to make the number reach zero. The anchored form above matches only a selector at the start of a line, which is what the check was always trying to assert.

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/components/CustomIcons/piv-icons.css
git commit -m "$(cat <<'EOF'
Delete the legacy button and icon-button CSS

Spec section 4/6b requires the rules be deleted rather than left orphaned.
Also removes .button-transparent and .label-1, which had zero consumers before
this phase started.

.video-button stays (7 live call sites, out of 6b's scope), as do
button-with-loader as a modifier and the .cl icon stack TrashBtn still uses.
The wiggle animation was triggered only by .ib-danger:hover, so it is
re-hooked onto .ibtn-danger:hover.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011cZG8ZfMukQVEkPP5V8VvV
EOF
)"
```

---

## Task 11: Install the retirement guard

**Files:**
- Create: `src/helpers/legacyButtonRetirement.test.ts`

**Interfaces:**
- Consumes: the whole `src` tree as text.
- Produces: the invariant that keeps 6c–6g from reintroducing a retired class.

This is the task that makes the migration stick. 6a learned the lesson the hard way: an **enumerated** guard missed `.btn-secondary` and `.btn-tertiary` because the enumeration was written from the rules that existed that day. This guard is a **sweep** — it walks the file tree and fails on any occurrence, so it covers files that do not exist yet.

- [ ] **Step 1: Write the test**

Create `src/helpers/legacyButtonRetirement.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Phase 6b retired four legacy button families and the legacy .ib icon button.
 * This is a sweep, not an enumeration: it walks the tree so a file added by a
 * later sub-plan is covered without anyone remembering to list it. 6a shipped
 * an enumerated guard that missed two rules for exactly that reason.
 *
 * If a later phase deliberately reintroduces one of these names, delete its
 * entry here in the same commit and say why - do not weaken the sweep.
 */
const SRC = join(__dirname, '..');

const walk = (dir: string, extensions: string[]): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full, extensions);
    return extensions.some((extension) => entry.endsWith(extension)) ? [full] : [];
  });

const relative = (path: string): string => path.slice(SRC.length + 1);

const offenders = (extensions: string[], pattern: RegExp): string[] =>
  walk(SRC, extensions)
    .filter((file) => !file.endsWith('legacyButtonRetirement.test.ts'))
    .flatMap((file) => {
      const lines = readFileSync(file, 'utf8').split('\n');
      return lines.flatMap((line, index) => (pattern.test(line) ? [`${relative(file)}:${index + 1}`] : []));
    });

describe('retired button classes stay retired', () => {
  // The four legacy families. `button-with-loader` is deliberately absent:
  // spec section 4/6b keeps it as a modifier alongside .btn.
  const RETIRED = ['wizard-button', 'button-1', 'danger-button', 'button-transparent', 'label-1'];

  it.each(RETIRED)('%s appears nowhere in src', (name) => {
    // Word-boundary both sides so `button-10` or `my-button-1x` would not
    // match, and neither would a longer class that merely contains the name.
    expect(offenders(['.tsx', '.ts', '.css'], new RegExp(`\\b${name}\\b(?!-)`))).toEqual([]);
  });

  it('no TSX className applies the legacy .ib icon-button class', () => {
    // `ib` as a standalone class token, excluding the `ibtn`/`ibtn-sm` family.
    expect(offenders(['.tsx'], /className=[^>]*\bib\b(?!tn)/)).toEqual([]);
  });

  it('no stylesheet still declares an .ib rule', () => {
    expect(offenders(['.css'], /^\s*\.ib\b(?!tn)/)).toEqual([]);
  });
});

describe('the .btn and .ibtn families are actually adopted', () => {
  // The counter-test: the sweep above passes trivially on an empty tree, so
  // assert the migration's positive outcome too. Numbers are floors, not
  // equalities, so 6c-6g adding call sites does not fail this.
  it('the .btn family has the call sites 6b migrated', () => {
    const uses = offenders(['.tsx'], /className=[^>]*\bbtn\b/);
    expect(uses.length).toBeGreaterThanOrEqual(30);
  });

  it('the .ibtn family has the call sites 6b migrated', () => {
    const uses = offenders(['.tsx'], /\bibtn\b/);
    expect(uses.length).toBeGreaterThanOrEqual(14);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx jest src/helpers/legacyButtonRetirement.test.ts`
Expected: PASS, all 8 tests. If a retirement test fails it names the exact `file:line` still carrying the class — fix the site, do not adjust the pattern. If a counter-test fails, the floor is above what actually shipped: count the real uses and lower the floor to that number, noting it in the commit.

- [ ] **Step 3: Mutation-test the guard before trusting it**

A guard that cannot fail is worse than no guard. Verify each half actually bites:

1. Temporarily add `className="wizard-button"` to any TSX file. Run the test. Expect the `wizard-button` case to fail and to print that file and line. Revert the edit **with your editor, not `git checkout --`** (that reverts the whole file, which destroyed work twice in 6a).
2. Temporarily change one migrated `className="ibtn"` back to `className="ib"`. Run the test. Expect both the `.ib` case and possibly the `.ibtn` floor to fail. Revert the same way.
3. Confirm `git diff --stat` shows only the new test file before committing.

- [ ] **Step 4: Full verification**

Run: `npx jest` → previous count + **9** (5 `it.each` retirement cases + 2 sweep cases + 2 counter-tests).
Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → expect `64`.
Run: `npm run lint` → expect `20 problems`. This test is new TypeScript, so prettier may flag it; run `npx eslint src/helpers/legacyButtonRetirement.test.ts --fix` and re-measure.

- [ ] **Step 5: Confirm 6b's "done means" from the spec, verbatim**

Spec §4/6b: *"`grep -r "button-1\|wizard-button\|danger-button" src --include="*.tsx"` returns nothing; no `className` in `src/**/*.tsx` applies `ib` as a standalone icon-button class; and the CSS rules for the removed classes are deleted, not merely orphaned."*

Run all three and paste the output into the task report:
```bash
grep -r "button-1\|wizard-button\|danger-button" src --include="*.tsx"; echo "exit=$?"
grep -rnE 'className=[^>]*\bib\b(?!tn)' src --include="*.tsx"; echo "exit=$?"
grep -rnE '^\s*\.(wizard-button|button-1|danger-button|ib)\b' src --include="*.css"; echo "exit=$?"
```
All three must print nothing and `exit=1`.

- [ ] **Step 6: Commit**

```bash
git add src/helpers/legacyButtonRetirement.test.ts
git commit -m "$(cat <<'EOF'
Guard the button retirement with a tree sweep

A sweep rather than an enumeration: it walks src so a file added by 6c-6g is
covered without anyone listing it. 6a shipped an enumerated disabled-state
guard that missed .btn-secondary and .btn-tertiary for exactly that reason.

Paired with floor assertions on .btn and .ibtn adoption, because the sweep
alone would pass on an empty tree.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011cZG8ZfMukQVEkPP5V8VvV
EOF
)"
```

---

## Task 12: Record the amendment in the spec

**Files:**
- Modify: `docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md` (§4/6b, and §9's amendment table)

**Interfaces:**
- Consumes: nothing.
- Produces: the record 6c–6g read.

- [ ] **Step 1: Correct §4/6b's inventory**

In §4's `### 6b — Button & icon-button adoption` section, replace the `**Migrates:**` line with the measured counts and add the correction, using the "Corrections to the spec's inventory" section of this plan as the source. State the 31/14 figures, why the original 33/9 were wrong, and that `wizard-button-active` carried three distinct meanings.

- [ ] **Step 2: Add amendment A7 to §9**

Append a row to §9's amendment table:

| **A7** | 6b's inventory corrected to 31 text buttons and 14 icon buttons (from 33 and 9), and three primitive states added to 6b's scope: `.btn[aria-pressed]`/`[data-complete]`/`[aria-busy]`, `.ibtn[aria-pressed]`/`[aria-busy]`, `.ibtn-danger`, `.ibtn[data-state="success"]`. Migrated buttons use `.btn-lg` (48px) rather than `.btn` (40px). | The spec called 6b "mechanical and well-defined". It was not: `.btn` had no pressed variant, so a class swap would have deleted the active state from 18 call sites, and `.ib` carried four states `.ibtn` lacked — dropping them would have broken TrashBtn's arm-to-confirm, ExportBtn's success flash and FormResults' explained-unavailable affordance. Three sites were double-counted; five `.ib` sites were never counted. |

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md
git commit -m "$(cat <<'EOF'
Record 6b's corrected inventory and added scope as A7

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011cZG8ZfMukQVEkPP5V8VvV
EOF
)"
```

---

## Verification (whole sub-plan)

Before declaring 6b complete:

1. `npx jest` — all suites pass. **Measured: 649 tests, 63 suites.**

   Accounted against the original prediction of 645, as this step required rather than adjusting the expectation. The 4-test difference is two separate additions, both made after the plan was written and both deliberate:

   - **+2 during Task 1's cascade fixes.** The Opus review of Task 1 found that every hover rule in the family out-specified the new state rules and repainted them away. Fixing it needed two new guards the plan had not foreseen: the family-wide "a colour-painting hover rule never repaints a state it out-specifies" sweep, and the "an already-filled variant shows the state as an inset ring" test for `.btn-primary`/`.btn-danger`.
   - **+2 in Task 11.** Beyond the 9 the plan specified, Task 11 carried the controller's added requirement (ruling R12) to pair every `aria-disabled` button with an early-return click guard: the pairing sweep itself, plus a canary that fails if the sweep ever degrades to finding nothing.

   So: 618 baseline + 3 (Task 1 CSS) + 6 (Task 1 contrast, 2 pairs × 3 themes) + 2 (Task 1 cascade guards) + 9 (Task 7) + 11 (Task 11) = **649**.
2. `npx tsc --noEmit 2>&1 | grep -c "error TS"` → **64**, unchanged.
3. `npm run lint` → **20 problems (17 errors, 3 warnings)**, unchanged.
4. The three "done means" greps from Task 11 Step 5 all return nothing.
5. `open docs/superpowers/previews/2026-09-24-phase-6b-buttons.html` — the "after" rows render correctly in all three themes.
6. **Manual, for the product owner, not for an agent:** launch the Electron app and walk one wizard end to end in each theme. 6b touches every screen's buttons and no automated test in this project can render a component.

## What 6b deliberately does not do

- It does not convert `CameraCalibration`'s two-option view switch to `.seg` — 6e owns that screen's layout.
- It does not touch `.video-button`, `.mask-toolbar-btn`, `.btn-step`, `.technique-eye-btn`, `.technique-disclosure-btn`, `.station-tag-pin-btn`, `.confirm-mask-btn` or `.copy-btn-wrap` (ruling R5).
- It does not differentiate the pressed, complete and busy visuals — one fill, three attributes (ruling R2).
- It does not resolve the open light-theme field-surface decision (spec §6, amendment A6), which remains with the product owner and blocks nothing here.
