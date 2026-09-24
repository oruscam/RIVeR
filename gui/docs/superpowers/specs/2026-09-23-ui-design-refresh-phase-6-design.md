# UI Design Refresh — Phase 6 (Layout & adoption) Design Spec

**Date:** 2026-09-23
**Branch:** `ui/design-refresh` (base: Phase 5d's tip `475ef17`)
**Source audit:** RIVeR Design Audit artifact — https://claude.ai/code/artifact/02bcbe1c-e016-4d2e-9b66-d1bc80f31dcb

---

## 1. Why this phase exists

The audit's rollout defined five phases, and all five shipped (1 bug fixes, 2 tokens, 3a-3c buttons/techniques/pins, 4a-4d messages/overlays/results/progress, 5a-5d screen polish). But a walkthrough of the shipped branch against the audit surfaced a consistent pattern: **phases 1-5 fixed the token layer and individual widgets; they did not do the audit's layout work, and they did not adopt the primitives they created.**

Measured on the branch at `475ef17`:

| Audit finding | State after phases 1-5 |
|---|---|
| #2 "Every action looks the same", #3 "Labels are styled as buttons" | 33 legacy button call sites remain (`wizard-button` ×22, `button-1` ×7, `danger-button` ×2, `button-with-loader` ×2) against 5 uses of the `.btn` family Phase 3a created |
| #23 "Four different icon-button shapes" | `.ibtn` has **zero** consumers; all 9 icon buttons still use the older `.ib` |
| #19 "Over 40 font sizes" | **46** distinct `font-size` values across `src/**/*.css`; Phase 5d set exactly three elements |
| #20 "18 different corner radii" | **25** distinct `border-radius` values — drifted *worse* than the audit measured; Phase 2's `--radius-*` tokens were never adopted |
| Chips (sections/masks) and segmented controls, used throughout the audit's mockups | Neither `.chip` nor `.seg` exists in the codebase at all |
| `--wash-1`/`--wash-2` theme washes (Home halo, Results panel) | Tokens absent; gradients never implemented |

Phase 2 and Phase 3a both shipped primitives "declared and tested, with no consumer yet," on the assumption a later phase would adopt them. That adoption never happened. Phase 6's job is to finish it, and to do the audit's *placement* work — where controls and lists live — which no phase has touched.

## 2. Governing rule

**Build the primitive once, then adopt it everywhere in the same phase.**

A sub-plan that introduces a component or token must be followed by sub-plans that consume it, inside Phase 6. No Phase 6 sub-plan ends with an unconsumed primitive.

A second rule, specific to the canvas, is derived directly from the audit's mockups and governs 6c:

**Lists and "Add" actions live in the right-hand form panel as chips. The image canvas carries only transient, mode-scoped chrome: the mode-hint pill and the per-shape toolbar.**

The audit applies this without exception — Cross Sections puts `[hatch] Mask 1` / `[+] Add mask` chips in the panel and leaves a single `+` on the canvas; Video Range puts numbered region rows with per-row delete in the panel and leaves only the "Editing regions · 2 of 2 minimum ✓ · Done" hint pill plus a Delete toolbar next to the selected shape on the canvas.

## 3. Decisions taken

Recorded 2026-09-23 with the product owner, in response to a walkthrough of the shipped branch:

| # | Decision | Rationale given |
|---|---|---|
| D1 | **Camera calibration gets a full re-layout** onto the app's standard workspace | It currently reads as separate software. Adopting only the component language would leave the layout mismatch, which is the actual complaint. |
| D2 | **Recent projects ships at the audit's fidelity**: footage-type icon tile, project name, type and date — no video-frame thumbnails | Keeps it polish-sized. Frame extraction/caching adds real failure modes (missing files, moved projects) for little gain. |
| D3 | **Outfit extends to all headings and prominent numbers**, and the 46 font sizes collapse onto the audit's six-step scale. Inter stays for body/UI text. JetBrains Mono is **not** adopted. | The product owner likes the audit's typography. Mono was offered for tabular numerics and declined for now. |
| D4 | **The button-system migration happens inside Phase 6**, not as a later phase | Leaving 33 legacy call sites keeps undermining every other fix; it is mechanical and well-defined. |
| D5 | **There will be no video export for STIV or iWave.** Export stays LSPIV-only, permanently. | Product decision. Closes the question of what a STIV/iWave export would even contain. |

D5 has a UI consequence that is in scope: the export control must make its LSPIV-only nature legible rather than silently doing nothing — disabled with an explanatory tooltip outside an LSPIV context, matching the audit's convention for Space-time ("Run STIV first") and Next ("Add a video to continue").

## 4. The seven sub-plans

Ordered by dependency. Each is independently reviewable and independently revertible.

### 6a — Primitives & tokens

**Builds:** `.chip` / `.chip-sm`, `.seg` segmented control, `.list-row` + `.ibtn-sm`, `--wash-2` theme token, and a type-scale token set.

> **Amended 2026-09-24 (A1, A2, A3)** — after 6a's final review. Originally this sub-plan built only the chip, the seg, the wash and a six-step scale. Three additions and one correction, all decided with the product owner:
> - **`.list-row` + `.ibtn-sm` are now part of 6a.** `.chip` was cut for the *shape* in the audit's mockups, not for the *markup* of the lists 6c must convert. Verified against the real code: `MaskCreation.tsx:36-51` rows are a label plus three icon buttons (`EyeBtn`/`EditMaskBtn`/`TrashBtn`); `StabilizationRegions.tsx` rows are a label plus two; the cross-section "tab" being replaced (`Sections.tsx:118-145`) contains a rename `<input type="text">` *and* a delete button. A `<button>` may not nest a button or an input, and on a `<div>` host `:disabled` never matches, `:focus-visible` needs a tabindex, and `aria-pressed` needs `role="button"` — which re-prohibits the nested content. So `.chip` serves the `[+] Add` affordance and plain single-choice selection (cross sections); everything with per-row actions uses `.list-row`, a container with a label and an actions slot. `.ibtn-sm` (~24px) comes with it, because `.ibtn` is 32px and would fill a 32px row edge-to-edge.
> - **The type scale gains a seventh step, `--text-subtitle: 20px`.** The audit's six steps jump 16 → 24, but this codebase's mass sits at 20px: measured 17 declarations of `font-size: 20px` and 8 of `18px` across `src/**/*.css`. Without a 20px step, 6g stops being a mechanical sweep and becomes a design change that visibly resizes ~25 elements. A deliberate, documented deviation from the audit, taken because the audit never had to absorb this codebase's existing sizes.
> - **`.seg` segments drop to 26px so the track is 32px**, matching `.chip`, `.btn-sm` and `.ibtn`. The audit's 28px segments in a 3px-inset track make a 34px control, which would sit 2px off its neighbours in 6e's calibration toolbar row.
> - **`--wash-1` is not built.** It appears only in the audit document's own page-header rule; both RIVeR gradients ramp `--wash-2 → --surface-panel`. Declaring an unconsumed token is the mistake this phase exists to correct. If 6f needs a second colour stop it adds `--wash-1` there, with a consumer, in the same commit.

**Audit source, verbatim:**
- `.chip` — `height:32px; padding:0 14px; border-radius:999px; background:var(--field); color:var(--text); font:500 13px; ` selected: `background:var(--accent); color:var(--on-accent)`; `.chip.sm` — `height:28px; padding:0 11px; font-size:12.5px`
- `.seg` — `display:inline-flex; background:var(--field); border-radius:999px; padding:3px`; buttons `height:28px; padding:0 14px; border-radius:999px; font:600 13px; color:var(--sub)`; selected `background:var(--accent); color:var(--on-accent)`
- `--wash-1`/`--wash-2` — dark `#0E4C8F`/`#0B2D52`, light `#BFDDF5`/`#DDEBF7`, dracula `#4A3673`/`#33294F`
- Type scale — 40px Outfit 700 · 24px Outfit 700 · 16px Inter 700 · 14px Inter 400 · 13px Inter 500 (subdued) · 12px Inter 400 (subdued)

Token names are fixed here so the later sub-plans don't each invent their own: `--text-display` (40), `--text-title` (24), **`--text-subtitle` (20)**, `--text-section` (16), `--text-body` (14), `--text-meta` (13), `--text-caption` (12). Sizes only — weight and colour stay with the consuming rule, since the same size appears at different weights (e.g. 14px Inter 400 body text vs. a 14px 600 value readout).

**Two contracts, recorded here so 6c-6e don't each decide them separately:**

- **Selected state is carried by an ARIA attribute, and both readings are supported.** `.chip` and `.seg button` match on `[aria-pressed="true"], [aria-selected="true"]`. A consumer may therefore use toggle-button semantics *or* the tablist/`aria-selected` pattern — which matters because 6d's `Frames | Space-time | Spectrum` is canonically a tablist, and had the CSS accepted only `aria-pressed` the primitive would have been re-cut on its first use.
- **Disabled state is carried by either `:disabled` or `[aria-disabled="true"]`.** Chromium dispatches no pointer events on natively `disabled` controls, so a `disabled` button cannot show the explanatory tooltip that 6d ("Run STIV first") and 6e ("Name the camera to save") both require. This codebase already hit and documented that exact constraint — see the comment at `src/components/Forms/form.css:769-774`. Consumers needing a tooltip use `aria-disabled` plus their own click guard; consumers not needing one may use native `disabled`.

**Token mapping** (audit name → this codebase, all of which already exist from Phases 2/3a/5d):

| Audit | Ours |
|---|---|
| `--field` | `--surface-field` |
| `--text` | `--text-primary` |
| `--sub` | `--text-subdued` |
| `--accent` | `--accent-color` |
| `--on-accent` | `--on-accent` |
| `--line` | `--border-color` |
| `--panel` | `--surface-panel` |
| `--raised` | `--surface-raised` |
| `--display` | `--font-display` |

`--wash-1`/`--wash-2` are the only genuinely new colour values, and unlike the scale tokens they are theme-specific, so they belong in each `[data-theme]` block rather than the bare `:root`.

**Done means:** primitives exist, are theme-correct in all three themes, and are covered by source-text tests. Consumers arrive in 6c-6g, per the governing rule.

### 6b — Button & icon-button adoption

**Migrates:** all 33 legacy button call sites to `.btn` + the right variant, and all 9 `.ib` icon buttons to `.ibtn`.

Mapping is by role, not by old class name: primary action → `.btn-primary`, secondary → `.btn-secondary`, low-emphasis/navigational → `.btn-tertiary`, destructive → `.btn-danger`. `button-with-loader` is the one survivor: it stays as a *modifier* carrying the in-button progress behaviour, applied alongside `.btn` (`className="btn btn-primary button-with-loader"`), because that behaviour has no equivalent in the `.btn` family.

Placed early, before 6c-6f rearrange the same files, so the layout sub-plans inherit migrated buttons rather than re-touching them.

**Done means:** `grep -r "button-1\|wizard-button\|danger-button" src --include="*.tsx"` returns nothing; no `className` in `src/**/*.tsx` applies `ib` as a standalone icon-button class; and the CSS rules for the removed classes are deleted, not merely orphaned.

### 6c — Canvas chrome & lists

The phase's main coherence fix, implementing §2's canvas rule.

**Which primitive for which list** (amended 2026-09-24, A1): `.chip` is for single-choice selection with no per-row controls — cross-section selection — and for every `[+] Add …` affordance. `.list-row` is for anything carrying per-row actions: mask rows (label + eye/edit/trash), region rows (label + edit/trash), and the cross-section row *if* inline rename survives the redesign. Do not reach for `.chip` and then bolt actions onto it; that is the ad-hoc widening this phase exists to prevent.

**Cross Sections** (`src/pages/CrossSections.tsx`, `src/components/Forms/Components/MaskCreation.tsx`, `AddMaskButton.tsx`, `HardModeCrossSections.tsx`): the mask list becomes `.list-row` rows in the form panel with a trailing `[+] Add mask` chip, and **moves out from behind the Advanced-settings toggle** — today `MaskCreation` renders inside `HardModeCrossSections`, so a user who draws a mask cannot see the list of masks unless Advanced is on. The floating `AddMaskButton` (currently `position:absolute; top:12px; right:12px` inline-styled on the canvas) is removed; the `[+] Add mask` chip replaces it. Cross-section selection becomes chips too, per the audit ("Sections and masks are chips with 'Add' at the end, instead of browser-style tabs").

**Video Range** (`src/pages/VideoRange.tsx`, `src/components/Forms/Components/StabilizationRegions.tsx`, `src/components/VideoPlayer/StabilizationCanvas.tsx`): the region list leaves the `extraFields &&` gate (`FormVideo.tsx:222`) and becomes the audit's numbered rows with a per-row delete button, always visible while stabilisation is on. Regions gain the **same Done / Undo point / Delete toolbar masks already have** — today they get a single `ConfirmMaskBtn` green tick (`StabilizationCanvas.tsx:417`) and no way to undo a point or delete from the canvas.

**Processing** (`src/pages/Processing.tsx:152-154`): `ExportMp4` leaves the canvas (`top:12px; right:12px; z-index:1000`) for the form panel, and per D5 becomes explicitly LSPIV-scoped — disabled with a tooltip when there is no LSPIV result to export, instead of the current silent `opacity:0.5; pointer-events:none` wrapper.

**Done means:** no inline-positioned control floats over any image canvas except the mode-hint pill and per-shape toolbars; no list of user-created objects is hidden behind Advanced settings.

### 6d — Processing preview control

**Replaces** the current implicit interaction — clicking a technique row's body sets `previewMode` (`FormProcessing.tsx:197/224/274`) — with the audit's explicit segmented control on the canvas: `Frames | Space-time | Spectrum`, built on 6a's `.seg`, with disabled states and tooltips ("Run STIV first", "Run iWave first").

This decouples two meanings that are currently conflated in one row: the row's **switch** decides whether a technique runs; the **segmented control** decides what the canvas shows. The technique rows keep their switches, their colour identity and their per-technique extras (Median pill, angle reset), and lose only the row-click-to-preview behaviour.

`previewMode` moves from local `useState` (`Processing.tsx:29`) into `uiSlice`, since it becomes a first-class, user-visible view mode rather than component-local state.

**Canvas chrome** (amended 2026-09-24, A4): this control sits *on* the canvas, which §2's rule otherwise reserves for the mode-hint pill and per-shape toolbars. The reconciliation: §2 bars *lists and Add actions* from the canvas, not view switches — a segmented control that changes what the canvas renders belongs on the canvas, the way the audit's own mockup places it. Over footage, though, the panel `.seg` is wrong: `--surface-field` is an opaque panel colour and gives no separation from video. 6d therefore owns a `.seg-float` variant on the translucent-dark-plus-blur backdrop this codebase already uses twice, un-tokenized — `.mode-hint` (`src/components/Messages/messages.css:12-14`, `rgba(10,12,14,.82)` + `blur(6px)`) and `.mask-toolbar` (`src/components/components.css:1309-1311`, `rgba(10,12,14,.86)` + `blur(6px)`). 6d extracts that into a `--canvas-chrome` token with those two existing rules plus `.seg-float` as its three consumers, which satisfies §2's build-then-adopt rule and removes a duplication rather than adding a third copy.

**Done means:** a user can see, at a glance and without prior knowledge, which technique's imagery the canvas is showing and which others are available.

### 6e — Camera calibration re-layout

**Rebuilds** `src/pages/CameraCalibration.tsx` (653 lines) and its 60 `.cal-*` rules onto the app's standard workspace: `.regular-page` → `.media-container` (canvas, left) + `.form-container` (panel, right), with footer actions, using 6a's primitives and 6b's buttons.

It **remains a full-screen overlay launched from Home** — it does not become a wizard step. What changes is that it stops having a private design language.

The audit's calibration specifics come along:
- Metric ratings become worded badges (`Good` / `Fair` / `Bad`), not coloured text alone
- Corrected / Heatmap becomes a `.seg`, replacing the gold outline (audit finding #6, "Six different colours mean active")
- The two italic hints merge into one alert with a clear title
- Save stays disabled until the camera is named, with a tooltip saying so

**Done means:** a screenshot of the calibration module and a screenshot of any wizard step are recognisably the same application.

### 6f — Home: recents & halo

**Recent projects** (D2): a persisted list — nothing tracks opened projects today (confirmed: no recents handling anywhere in `gui/electron/`), so this sub-plan adds the persistence, records a project on open/save, and renders the audit's rows (footage-type icon tile, name, "Fixed camera · 28 Jun").

Two details settled here rather than left to the plan:
- **Storage is renderer-side `localStorage`**, matching this codebase's established precedent for small persisted preferences (`language`, `unitSystem`, `river-main-carousel-height`). No new Electron-side store, no new IPC channel.
- **Entries whose directory no longer exists are dropped**, not shown greyed out. The list is validated when Home mounts; a project that has been moved or deleted silently leaves the list. This avoids dead rows that fail on click, at the cost of a project reappearing only when next opened from disk.

**Theme wash** (point 2 of the walkthrough): the audit's halo, using 6a's tokens — `radial-gradient(120% 70% at 50% 0%, var(--wash-2) 0%, var(--surface-panel) 60%)` on Home, and `linear-gradient(180deg, var(--wash-2) 0%, var(--surface-panel) 26%)` on the Results form panel, which is where the audit uses it a second time.

### 6g — Type & radius sweep

**Adopts** 6a's scale across the codebase: Outfit on every heading and prominent number (D3), the 46 font sizes collapsed onto the **seven**-step scale, and the 25 `border-radius` values onto `--radius-sm/md/lg/full`.

Last in the order, so it sweeps the settled state rather than being re-broken by 6c-6f.

**What the 20px step buys** (amended 2026-09-24, A2): with `--text-subtitle: 20px` in the scale, this is a mechanical sweep. Without it, the 17 `font-size: 20px` and 8 `font-size: 18px` declarations measured across `src/**/*.css` would each have to jump to 16 or 24 — ~25 visible resizes, which is a design change requiring three-theme sign-off, not a token substitution. Two parts of the sweep remain non-mechanical regardless and should be budgeted as such: the 22 `em`/`rem`/`clamp()` values (deterministic to convert, since `html { font-size: 16px }`, but each needs a decision about whether it *should* be fixed-size), and the sub-12px values (`11px` ×7, plus `10.5`/`10px`), which have no scale step below `--text-caption` and must either grow to 12px or earn a documented exception.

**This file is in scope too**: `src/index.css`'s own primitives violate the scale it defines — `.btn` is 14px, `.btn-lg` 16px, `.btn-sm` 13px, which are exactly `--text-body`, `--text-section` and `--text-meta`. 6g sweeps `index.css`, not only feature CSS.

**Done means:** every `font-size` in `src/**/*.css` is either one of 6a's six scale tokens or a documented exception carrying a comment saying why (canvas-overlay text sized against image pixels is the expected class of exception); likewise every `border-radius` is one of `--radius-sm/md/lg/full` or a commented exception. The counts drop from 46 and 25 to the token sets plus that explicit, reviewable exception list — "zero exceptions" is not the target, "no unexplained values" is.

## 5. Out of scope

- **Video export for STIV or iWave** — closed permanently by D5. Only the LSPIV exporter's *legibility* is in scope (6c).
- **Video-frame thumbnails for recent projects** — closed by D2 in favour of the audit's icon tiles.
- **JetBrains Mono / tabular numerics** — offered and declined in D3. The digit-shimmer note from Phase 5d's review stays parked.
- **Merging this branch** — `ui/design-refresh` stays unmerged, as it has through every phase.

## 6. Carried-forward debt this phase does not clear

These were surfaced by Phase 5's reviews and remain open; Phase 6 does not address them, and they should not be silently absorbed into it:

- Missing translations for Phase 5's new copy: `Processing.framePairCaption`, `Step-2.footageType.{uav,oblique,ipcam}` and their `…Description` siblings, across all 12 locales (`ar de en es fr hi it ja ko pt ru zh`) — today every one of them falls through to the English `defaultValue`.
- **`yarn.lock` is stale** relative to `package.json` (missing `@fontsource/outfit`). The CI release pipeline builds with `yarn install`/`yarn build`, so a release build from this branch fails until a dedicated lockfile sync lands. Phase 6 adds no new dependencies, so it neither worsens nor fixes this.
- The manual three-theme Electron walkthrough owed since Phase 1. **This is now unblocked** — the local Electron install was repaired on 2026-09-23 — so for the first time the walkthrough can actually be performed, by the product owner, on their own machine.

## 7. Constraints & conventions

Inherited unchanged from Phases 1-5; every Phase 6 plan restates them in its own Global Constraints:

- Base branch is `ui/design-refresh`. Never commit to `river-labs`/`main`.
- Commits end with the session's attribution trailer; author email `antoine.patalano@gmail.com`.
- New copy uses `t(key, { defaultValue })` only — no edits to the 12 `src/translations/*/global.json` files.
- Jest runs with `testEnvironment: "node"` and no DOM. Pure logic is unit-tested; JSX and CSS are covered by source-text assertions under `src/helpers/`, matching `src/helpers/techniqueRowCss.test.ts`.
- Test, `tsc` and lint counts may not regress. At `475ef17` the baseline is 57 suites / 524 tests passing, 64 pre-existing `tsc` errors, 20 pre-existing lint problems (17 errors, 3 warnings).
- Every visual change is owed a three-theme check (dark, light, dracula). Unlike prior phases, this one can actually be honoured — see §6.

## 8. Review and preview

Four of the seven sub-plans (6c, 6d, 6e, 6f) change **where things live** rather than how they are coloured. For those, a static HTML preview of the proposed screens — in all three themes, in the manner of the audit artifact itself — should be produced and approved **before** implementation, since approving a picture is more reliable than approving prose for a layout change.

---

## 9. Amendment log

Changes made to this spec after it was first approved, each with the evidence that prompted it. Recorded rather than silently edited, so the reasoning survives.

### 2026-09-24 — after Phase 6a's final whole-branch review

6a shipped its primitives and the final review then asked the question the spec had not: *will 6b-6g actually be able to adopt these without re-cutting them?* For `.chip` the answer was no. Four amendments followed, three of them decided with the product owner.

| # | Amendment | Evidence that prompted it |
|---|---|---|
| **A1** | `.list-row` + `.ibtn-sm` added to 6a's scope; §4/6c now states which primitive each list uses | `.chip` was cut as a single-action `<button>`, but `MaskCreation.tsx:36-51` rows carry three icon buttons, `StabilizationRegions.tsx` rows carry two, and the cross-section "tab" at `Sections.tsx:118-145` contains a rename `<input>` plus a delete button. A `<button>` cannot nest a button or an input; a `<div>` host breaks `:disabled`, `:focus-visible` and `aria-pressed`. `.chip` could serve only 1 of 6c's 4 lists. `.ibtn` at 32px would also fill a 32px row edge-to-edge, hence `.ibtn-sm`. |
| **A2** | Type scale gains a seventh step, `--text-subtitle: 20px`; §4/6g records what it buys and what stays non-mechanical | Measured across `src/**/*.css`: 17 declarations of `font-size: 20px` (the single most common size) and 8 of `18px`, against a scale that jumped 16 → 24. Without the step, 6g stops being a sweep and becomes ~25 visible resizes. |
| **A3** | `.seg` segments 28px → 26px, so the track is 32px | `.chip`, `.btn-sm` and `.ibtn` are all 32px. The audit's 28px-in-3px-track makes 34px, which would sit 2px off its neighbours in 6e's calibration toolbar row. |
| **A4** | §4/6d reconciled with §2's canvas rule, and given ownership of a `--canvas-chrome` token | §2 said the canvas carries *only* the mode-hint pill and per-shape toolbars, while §4/6d put a segmented control there. Reconciled: §2 bars lists and Add actions, not view switches. Separately, a panel `.seg` on `--surface-field` gives no separation over footage, and the translucent-dark-plus-blur idiom it needs is already duplicated un-tokenized in `messages.css:12-14` and `components.css:1309-1311`. |

Also settled in 6a and recorded in §4/6a rather than left implicit: the **selected-state contract** (`[aria-pressed="true"], [aria-selected="true"]` both match, so a consumer may use toggle-button *or* tablist semantics) and the **disabled-state contract** (`:disabled` or `[aria-disabled="true"]`, because Chromium suppresses pointer events — and therefore tooltips — on natively disabled controls, which 6d and 6e both need). Both came out of the same review: as first cut, `.seg` would have been re-cut on its first use in 6d.

**One process note worth carrying forward.** 6a waived the three-theme check on the grounds that nothing it added renders yet. That waiver is defensible but it is exactly what let two live defects through: a selected chip that de-selected and became illegible on hover (a specificity inversion), and a hover state that was a literal no-op in dracula and inverted in dark, because `--border-color` and `--input-background` resolve to the same `#44475a`. For a sub-phase that only adds token-consuming CSS, the cheap substitute for a walkthrough is a test that resolves the alias chain per theme and asserts the states actually differ. Worth adding when 6f touches `--wash-2`, which is the next genuinely new colour value.
