# Camera Calibration UI — Design Alignment

Status: Draft for review
Branch: `feature/camera-calibration-design-alignment`

## 1. Problem

The Camera Calibration module (`src/pages/CameraCalibration.tsx`, `src/pages/pages.css` lines 210–902) was built as a largely self-contained unit rather than composed from RIVeR's existing design system. It reuses some base primitives (`button-1`, `wizard-button`, `input-field-oblique`) but reinvents several others from scratch, which is why it visually and behaviorally reads as a different application bolted onto RIVeR. A code-level audit (not just a visual one) turned up six concrete, fixable gaps:

1. The thumbnail filmstrip uses a different visual language than the app's real `Carousel` component.
2. The per-view RMS histogram is hand-rolled with plain `<div>`s instead of the app's shared D3/`graphs.css` chart pipeline.
3. The empty state (before any images are imported) renders a blank rectangle — dead CSS and unused, already-translated copy for a proper drop zone exist but were never wired up.
4. Two small consistency bugs: the "Fair" grade pill hardcodes a color that doesn't adapt across RIVeR's three themes, and the action buttons override the standard `button-1` font size.
5. The save/profile confirmation is a solid-filled green block with a unicode `✓`, inconsistent with RIVeR's one other "validation message" (the PDF-export success screen), which uses a soft-tint card and a real icon.
6. The solving spinner never shows a percentage, unlike the identical-looking loader used during PIV processing — because the calibration Python solver doesn't emit progress data, not because of a frontend bug.

## 2. Goals

- Make Camera Calibration's visual language indistinguishable from the rest of RIVeR: same carousel behavior, same chart system, same color tokens, same feedback idioms.
- Fix the two small correctness bugs (theme color, empty state) that are cheap wins regardless of anything else.
- Unify the app's two "validation message" surfaces into one shared component, and give both a proper icon via `lucide-react` (adopted here for the first time in the codebase).
- Give calibration's progress indicator real percentage/time data, matching the one already used during PIV processing.

## 3. Non-goals

- Not converting Camera Calibration from a full-screen modal (`cal-overlay`, `position: fixed`) into a `react-use-wizard` step. That's a navigation/architecture decision, not a styling one, and was explicitly scoped out in favor of the lighter-weight restyle approach.
- Not migrating the rest of the app to `lucide-react`. This spec introduces it for exactly two icons (see §7); no other icon in the app is being touched.
- Not changing the calibration solver's algorithm, output format, or CLI flags beyond adding progress reporting (§8).

## 4. Item 1 — Thumbnail carousel alignment

**Current state.** `CalThumb` (`CameraCalibration.tsx:15-26`) and its CSS (`.cal-thumb`, `.cal-carousel`, `pages.css:357-400`) render small (56×42px default) chips, with active/inactive state driven by `opacity` (1 / 0.7 / 0.35) and a thin 2px border. RIVeR's actual carousel (`components/Carousel.tsx`, `.img-carousel*` in `components.css:524-560`) renders large frames, dims inactive frames via `filter: brightness(0.42)` rather than opacity, marks the active frame with a thick 4px accent border, overlays a frame-number watermark, and is flanked by press-and-hold prev/next arrow buttons plus a numeric jump box (`.carousel-info input`).

**Design.** Bring `.cal-thumb`/`.cal-carousel` in line with `.img-carousel`'s visual rules without adopting the full `Carousel.tsx` component wholesale (calibration's filmstrip is deliberately a compact multi-thumbnail strip, not a single large active-frame view — that difference in *layout* is legitimate given the use case; it's the *visual treatment* that should match):

- Replace opacity-based dimming with `filter: brightness(0.42)` for inactive/unused thumbs, matching `.img-carousel:not(.img-carousel-active)`.
- Replace the 2px border with the app's 4px `var(--accent-color)` border for the active thumb.
- Keep the existing "unused" (not used in solve) visual distinction, but express it consistently — e.g., combine the brightness dimming with the existing `.cal-thumb-dot` used/unused indicator dot rather than a separate opacity rule, so there's one dimming mechanism, not two competing ones (currently `.unused` sets `opacity: 0.35` on top of the active/inactive opacity logic — two overlapping opacity rules should collapse into one brightness rule).
- Leave the resize-drag-handle behavior (`useResizableCarousel`) as is — it's calibration-specific (variable-height filmstrip) and has no equivalent elsewhere to conform to.

**Files touched:** `src/pages/pages.css` (`.cal-thumb`, `.cal-thumb.active`, `.cal-thumb.unused` rules), no `.tsx` changes required beyond possibly removing now-redundant class logic if the CSS consolidation simplifies `CalThumb`'s className string.

## 5. Item 2 — Histogram → shared D3/graphs.css pipeline

**Current state.** The "Per-view RMS Distribution" chart (`CameraCalibration.tsx:445-471`, CSS `pages.css:591-683`) is built from nested `<div>`s: one `.cal-bar-col` per bin with an inline `height: %` style, manual axis-label thinning (`i % 4 === 0`), and a rotated-text y-axis label via `writing-mode: vertical-rl`. Every other chart in the app (`components/Graphs/*.tsx` + matching `*Svg.ts` files, e.g. `TestPlot.tsx` + `testPlotSvg.ts`) follows one convention: a React component holding an `<svg ref>`, and a plain D3 drawing function (no React) that renders into it, using `getCSSVar()` to pull theme colors and classing generated elements as `.graph-text` / `.tick` / `.domain` / `.graph-grid` / `.legend-text` so `graphs.css`'s theme-aware rules apply automatically across dark/light/dracula.

**Design.**

- Add `src/components/Graphs/calibrationHistogramSvg.ts` following the `testPlotSvg.ts` convention: takes the existing `csvRows` data (`{ bin_center_px, count }[]`, already computed by the backend — no data-shape change needed) and draws bars via `d3.scaleBand`/`d3.scaleLinear`, a real `d3.axisBottom` for reprojection-error bins and `d3.axisLeft` for count, gridlines classed `.graph-grid`, axis text classed `.graph-text`/`.tick text`, and the "Count" / "Reprojection error (px)" labels classed `.legend-text` — replacing the manual rotated-div label and the `i % 4 === 0` thinning (D3's axis generator handles tick collision/thinning natively via `.ticks(n)`).
- Add a thin wrapper component (e.g. `components/Graphs/CalibrationHistogram.tsx`) mirroring `TestPlot.tsx`'s shape: owns the `<svg ref>`, pulls `theme` for redraw-on-theme-change, calls the drawing function in a `useEffect`.
- In `CameraCalibration.tsx`, replace the `.cal-histogram*` JSX block (lines 445-471) with `<CalibrationHistogram rows={csvRows} />`.
- Remove `.cal-histogram*`, `.cal-bar*`, `.cal-yaxis-label` rules from `pages.css` once the replacement is in place (dead CSS).

**Files touched:** new `src/components/Graphs/calibrationHistogramSvg.ts`, new `src/components/Graphs/CalibrationHistogram.tsx`, edits to `src/components/Graphs/index.ts` (export), `src/pages/CameraCalibration.tsx`, `src/pages/pages.css` (removal).

## 6. Item 3 — Empty-state drop zone

**Current state.** `.cal-drop-zone`, `.cal-drop-text`, `.cal-drop-hint` are fully styled in `pages.css:293-314`, and `Calibration.dropZone` ("Drop a folder of calibration images") / `Calibration.dropHint` ("or use Import Images") already exist, translated, in `src/translations/en/global.json:317-318` (and presumably the other 11 locale files). None of this is referenced in `CameraCalibration.tsx`. When `images.length === 0`, `.cal-canvas` (`pages.css:249-260`, background `#0a0a0a` dark / `#d8d3cc` light) renders with no children at all — a flat, unexplained rectangle. RIVeR's established empty/drop-zone idiom elsewhere (`FootageMode.tsx`'s `.browse-video-drop-area`, `pages.css:184-201`) is a dashed border, bold instructional text, and a scale-up animation on drag-over.

**Design.**

- In `getCanvasContent()` / the render path of `CameraCalibration.tsx`, when `images.length === 0` and not `dragOver`, render the existing (currently dead) `.cal-drop-zone` markup with `Calibration.dropZone` / `Calibration.dropHint` text instead of returning nothing.
- Align `.cal-drop-zone`'s border treatment with `.browse-video-drop-area` (dashed border, rounded corners) rather than leaving it borderless, so it reads as an actionable target consistent with the rest of the app, and reuse the existing `.drag-over-cal` dashed-border-on-hover rule (already defined, `pages.css:135-138`) for the drag-active state — this rule is already correctly implemented and themed; it's only the *idle* empty state that's missing.
- No new translation keys needed — `dropZone`/`dropHint` already exist and are presumably already localized across all 12 locales (verify during implementation; only add missing locale strings if any are found absent).

**Files touched:** `src/pages/CameraCalibration.tsx` (render branch), `src/pages/pages.css` (`.cal-drop-zone` border rule).

## 7. Item 4 — Token and sizing consistency fixes

**Bug A — un-themed "Fair" color.** `.cal-grade-pill.fair` and `.cal-metric-fair` (`pages.css:538, 565`) hardcode `#F5BF61`, while their `.good`/`.bad` siblings correctly reference `var(--success-color)`/`var(--background-error)`, which are redefined per theme (`index.css:12-168`: dark/light/dracula each have distinct success/error shades). Fix: add a `--warning-color` (or reuse an existing warning/fair token if one exists — verify during implementation) to each of the three theme blocks in `index.css`, and point both `.cal-grade-pill.fair` and `.cal-metric-fair` at it.

**Bug B — button sizing drift.** `.button-1.cal-action-btn` (`pages.css:478-482`) overrides the standard `button-1` font size (fixed `20px`) with `clamp(13px, 1.3vw, 18px)`. Fix: drop the override and let calibration's action buttons (Show Board / Import Images / Solve) use the standard `button-1` sizing; if the two-up row genuinely doesn't fit at 20px in the panel's minimum width (`.cal-right { min-width: 400px }`), prefer widening the minimum panel width slightly over shrinking the font — text size should stay consistent with every other `button-1` in the app.

**Files touched:** `src/index.css` (new theme token, all three theme blocks), `src/pages/pages.css` (`.cal-grade-pill.fair`, `.cal-metric-fair`, `.button-1.cal-action-btn`).

## 8. Item 5 — Unified validation/save banner with Lucide icon

**Current state.** RIVeR has exactly one existing "validation message" pattern: `SuccessfulMessage.tsx`, shown at the end of the Report/PDF-export step, styled by `#successful-container` etc. in `report.css:683-737`. It uses a soft theme-tinted background (`var(--success-background)`: `#E8F5E9` light / `#2D671B` dark / `#1a3a22` dracula) with `var(--success-color)` for icon and accents, and a checkmark rendered via the app's generic `Icon` component wrapping a raw SVG asset (`assets/icons/check.svg`, used nowhere else in the codebase). Camera Calibration's save confirmation (`.cal-save-confirm-box`, `pages.css:740-753`) instead solid-fills `var(--success-color)` and uses a literal `✓` character in the JSX text — visually closer to a toast/alert, which doesn't otherwise exist in RIVeR's vocabulary, and inconsistent even with calibration's own error chip two states away (`.cal-error-chip`, which *does* correctly use a tint, not a solid fill).

**Design.**

- Extract a shared `SuccessBanner` component (`src/components/SuccessBanner.tsx` or similar shared location) that accepts an icon, title, and message/children, replacing the current single-purpose body of `SuccessfulMessage.tsx`. `SuccessfulMessage.tsx` becomes a thin wrapper passing its existing title/message/"go home" link into `SuccessBanner`.
- Style `SuccessBanner` with `var(--success-background)` + `var(--success-color)`, i.e. formalize the existing Report-step styling as the shared component's default, rather than inventing something new.
- Support a compact variant (smaller padding/icon, inline in a narrow panel) for Camera Calibration's use, versus the larger standalone-card variant used at the end of the Report step — same colors and icon, different sizing, driven by a `size` or `compact` prop.
- Icon: replace both the raster `check.svg` (Report) and the calibration `✓` unicode character with `CircleCheckBig` from `lucide-react` (already a `package.json` dependency, currently unused anywhere in the codebase), colored via `currentColor` so it inherits `var(--success-color)` automatically and themes with no extra work.
- Update `CameraCalibration.tsx`'s save-confirmation block (`pages.css:531-538` render, `.cal-save-confirm-box` CSS) to render `<SuccessBanner compact icon={CircleCheckBig} ...>` with the existing "Saved to" + clickable path content as children, replacing the bespoke solid-fill box.
- Update `SuccessfulMessage.tsx` to render `<SuccessBanner icon={CircleCheckBig} title={...} ...>` in place of its current `Icon`/`check` usage.
- Remove `#check-icon` CSS and the now-unused `check.svg` import once both call sites are migrated (verify no other consumer of `check.svg` first — confirmed none exist today, per audit).

**Files touched:** new `src/components/SuccessBanner.tsx` (+ CSS, likely added to `components.css`), `src/components/Report/SuccessfulMessage.tsx`, `src/pages/CameraCalibration.tsx`, `src/pages/pages.css` (remove `.cal-save-confirm-box*`), `src/components/Report/report.css` (remove `#successful-container` et al. once superseded, or retarget to shared classes).

## 9. Item 6 — Solving progress bar

**Current state.** The solving spinner (`CameraCalibration.tsx:393-400`) reuses the app's ring CSS (`.loader-wrapper-big`/`.loader-big`, `components.css:323-339`) but never populates the percentage overlay (`.loader-percentage-big`) or remaining-time line (`.loader-remaining-time`) that the same CSS supports — it just shows a spinning ring plus a raw status-text paragraph (`progressMsg`). The one place in RIVeR that *does* show a real percentage — `AnalyzingProgress.tsx`, used during PIV processing — listens to the same `river-cli-message` IPC channel calibration already subscribes to (`useCalibrationSlice.ts:64-67`), and extracts percentage/remaining-time via regex (`(\d+%)\|` and `\[(\d{2}:\d{2})<(\d{2}:\d{2})`) from `tqdm`-formatted stdout, feeding the result into the shared `Loading` component (`components/Loading.tsx`).

The reason calibration never shows a percentage is that its Python solver never emits one. `../river/core/camera_calibration.py`'s `RiverCalibrator.run_from_images` (loop starting line 161, `for p in sorted(image_paths):`) iterates a known-length list of images doing per-frame corner detection — the same shape of loop the main PIV pipeline already wraps in `tqdm` — but currently only prints a few static status lines (`cli/commands/camera_calibration.py:36-49`: "Found N images...", "RMS: ...", "Saved profile...", "Generating report..."). This is a backend gap, not a frontend rendering bug; the current spinner accurately reflects that no progress data exists yet.

**Design.**

- **Backend** (`../river/core/camera_calibration.py`): wrap the `for p in sorted(image_paths):` loop in `tqdm`, matching whatever format/config the main PIV pipeline uses (verify exact `tqdm` invocation in `core/piv_pipeline.py` during implementation so the stdout format is byte-identical to what the frontend regex already expects — no frontend regex changes should be needed if this is done correctly).
- **Shared frontend helper**: extract the percentage/time-remaining regex parsing currently inlined in `AnalyzingProgress.tsx:15-35` into a small pure helper (e.g. `src/helpers/parseCliProgress.ts`, exporting something like `parseCliProgress(text: string): { percentage: string; time: string }`), so the logic exists once. Update `AnalyzingProgress.tsx` to call it (behavior-preserving refactor, covered by a unit test — see §10).
- **Calibration frontend**: in `useCalibrationSlice.ts`'s `handleMsg` (line 64-66), run incoming messages through the same shared parser alongside the existing raw `progressMsg` storage (raw text is still useful as a status line for non-percentage messages like "Generating report…"). In `CameraCalibration.tsx`, replace the bare `.loader-wrapper-big`/`.loader-big` + `<p>` block (lines 393-400) with the shared `<Loading percentage={...} time={...} size="big" isComplete={...} />` component, matching `AnalyzingProgress.tsx`'s usage exactly.

**Files touched:** `../river/core/camera_calibration.py` (add `tqdm`), new `src/helpers/parseCliProgress.ts`, `src/components/Forms/Components/AnalyzingProgress.tsx` (refactor to use shared helper), `src/hooks/useCalibrationSlice.ts`, `src/pages/CameraCalibration.tsx`.

**Risk note:** this is the one item that touches the Python solver rather than pure GUI/CSS. It needs a full re-run of the calibration solve flow (not just a visual check) to confirm the `tqdm` output doesn't break the existing `result?.error?.message` / stdout-vs-stderr handling in `useCalibrationSlice.ts:64-79` and `executeRiverCli.ts` (stderr is already treated specially there — verify `tqdm`'s default stderr output doesn't collide with existing error-message capture, since `executeRiverCli.ts:64` forwards `lastStderrMessage` and `tqdm` writes to stderr by default).

## 10. Testing strategy

The codebase's existing test coverage (`jest.config.js`) is limited to Jest unit tests over Electron IPC handlers and pure helper functions (`electron/ipcMainHandlers/*.test.ts`, `utils/parseDistancesData.test.ts`) — there is no existing React component test suite to extend. Testing scope for this work follows that same convention rather than introducing a new testing paradigm:

- **Unit test** the new `parseCliProgress` helper (§9) directly — it's a pure string-in/object-out function, the same shape as `parseDistancesData.test.ts`, and is the one piece of new logic with real edge cases (missing percentage, missing time, malformed tqdm lines, the `isBackendWorking === false` 100%-completion special case currently embedded in `AnalyzingProgress.tsx`).
- **Manual verification** for everything visual (items 1-5) and the theme-color fix (item 4A): run the app in all three themes (dark/light/dracula) and step through the full calibration flow (empty → images loaded → solving → solved → saved) per item, since there's no visual-regression tooling in this repo to automate it.
- **Manual end-to-end run** of a real calibration solve (item 6) after the `tqdm` backend change, checking that: percentages render, the run still completes and produces a valid profile/report, and genuine solver errors still surface correctly in the UI (not swallowed by the stderr-progress-line changes).

## 11. Sequencing

Items are independent of each other and can land in any order or as separate commits/PRs; suggested order by risk (lowest first) so early wins are bankable before the riskier backend item:

1. Item 4 (token/sizing fixes) — smallest, pure CSS.
2. Item 3 (empty-state drop zone) — wiring existing dead code, no new code.
3. Item 1 (carousel alignment) — CSS-only.
4. Item 5 (banner unification + Lucide icon) — new shared component, two call sites.
5. Item 2 (histogram → D3) — new component + drawing function, most new code among the frontend-only items.
6. Item 6 (progress bar) — last, since it's the only item touching the Python solver and carries the stderr-collision risk noted in §9.

## 12. Open questions

- Item 4A: confirm whether a "warning/fair" theme token already exists under a different name before adding a new one (`--warning-color` was assumed; grep `index.css` for existing amber/yellow tokens during implementation).
- Item 3: confirm all 12 locale files actually have `Calibration.dropZone`/`dropHint` translated (only English was checked here) before relying on them being complete.
- Item 6: confirm the exact `tqdm` configuration used by `core/piv_pipeline.py` so the calibration solver's new progress output is format-identical, avoiding any frontend regex changes.
