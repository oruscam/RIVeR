# UI Design Refresh Phase 4c — Results panel: crosshair, pinnable station tag, expandable technique rows

## 1. Problem

**Spec:** RIVeR Design Audit artifact — https://claude.ai/code/artifact/02bcbe1c-e016-4d2e-9b66-d1bc80f31dcb
(§ Screens → Results; § Rollout, Phase 4: *"On Results: expandable technique
rows, a crosshair across the charts and a pinnable station tag with spread and
quality."*). This is the last unclaimed slice of Phase 4, split out in the
Phase 4a brainstorming (see that plan's "Deferred" section).

The audit's own finding (medium severity, "Station detail disappears when you
reach for a layer switch"):

> The unified tag in `AllInOne.tsx` (discharge and its share, each visible
> technique's velocity, stage) is the right idea and should stay. But comparing
> "seeded vs unseeded" or "σ on vs off" at one station means scrolling up to
> 9–12px σ / % / Q glyphs, and the tag closes as soon as the pointer leaves the
> chart. The tag also leaves out spread and quality, which are the reason for
> turning those layers on.

Three concrete problems in the current `river-labs` code (verified directly,
not just from the audit's now-stale line numbers):

1. **Two separate, uncoordinated hover systems.** `AllInOne.tsx` drives a
   cursor-following HTML tooltip off the shared `uiSlice.hoveredStation` (used
   by the charts and `Grid.tsx`). `VelocityVector.tsx` keeps its **own local**
   `hoveredStation` state for the canvas chevrons, with its own separate
   tooltip (`#vectors-tooltip`, velocity-only). Hovering a chevron never moves
   the chart crosshair or the Grid highlight, and vice versa.
2. **The crosshair is incomplete and accidental.** Only `velocitySvg.ts` draws
   an explicit `hover-guide-line`. It visually crosses the discharge and stage
   (bathymetry) panels only because all three share one `<svg>` and happen to
   stack without gaps — `dischargeSvg.ts` only dims bar opacity, and
   `bathimetrySvg.ts` has no `hoveredStation` prop at all, so a margin change
   in either would silently break the illusion.
3. **The technique rows are exactly the glyph problem the audit describes.**
   `TechniqueLegend.tsx` renders `σ`, `%`, `Q` as 1–2 character toggle buttons
   (`technique-band-glyph`) crammed next to the name and eye icon. Seeding,
   uncertainty bands and quality have no room to be labelled or to show a
   per-technique total.

## 2. Goals

- One `hoveredStation` (already in `uiSlice`) drives canvas chevrons, all
  three mini-charts, and the Grid — regardless of which one the pointer is
  over. Canvas chevrons stop keeping local hover state.
- A crosshair (vertical guide line) appears on **all three** mini-charts
  (discharge, velocity, stage), each drawn by its own module, not inherited
  by accident from a shared SVG.
- The hovered station is highlighted on the canvas itself: a halo + ring +
  numbered badge on its chevron, matching the audit's mockup.
- One **docked, pinnable station tag** replaces both of today's tooltips
  (`AllInOne.tsx`'s cursor-following div and `VelocityVector.tsx`'s
  `#vectors-tooltip`). It keeps every value the current combined tooltip
  shows (discharge + share, each visible technique's velocity, stage) and
  adds spread (σ / P5–95) and quality (seeded/unseeded, STIV low-confidence,
  iWave quality score) per technique.
- Clicking the hovered station — on the canvas, on a chart, or in the Grid —
  pins the tag to that station so it survives the pointer moving away, so a
  user can toggle layers without losing the detail view. Clicking the pinned
  station again, or the tag's own pin button, unpins it.
- Each technique row gains an independent expand/collapse disclosure. The
  expanded body replaces the σ/%/Q glyphs with written-label controls
  (artificial seeding, "σ band", "5–95% band", quality). Multiple rows can be
  open at once — this project favours information density over minimalism
  for Results (`river-results-panel-needs`).
- Each technique row shows its own computed total (today only the *active*
  technique's total appears, in `FormResults.tsx`'s big number).

## 3. Non-goals / deferred

- No change to `getEffectiveTechniqueData`, the discharge/velocity
  computation, or the STIV angle tuner.
- No change to Processing's own quiver overlay or search-line rendering
  (Phase 4b territory).
- No keyboard access for the technique rows' disclosure — matches the
  pre-existing, already-tracked gap from Phase 3b/3a (whole rows still lack
  `role`/`tabIndex` in Results).
- No new translation entries authored for the 12-language set — deferred to
  the translation team, as every prior phase has done; new copy ships with
  `defaultValue`-backed keys only.
- No change to the STIV angle reset toast/Undo channel (Phase 4a's own
  deferred item).
- The Phase 4b-flagged disagreement between search-line colours and the
  visible colour bar on Processing's default view is unrelated and untouched.

## 4. Current architecture (verified against `ui/design-refresh` tip `b15b6d9`)

```
FormResults.tsx
 ├─ TechniqueLegend.tsx          (per-technique row: name/activate, seed flag,
 │    └─ TechniqueRow.tsx          σ/%/Q glyphs, eye toggle)
 ├─ AllInOne.tsx                 (one <svg>, three stacked D3 sub-charts)
 │    ├─ createDischargeChart()  (dischargeSvg.ts — bars, dims on hover)
 │    ├─ createVelocityChart()   (velocitySvg.ts — lines/markers, draws the
 │    │                           only real hover-guide-line today)
 │    ├─ bathimetrySvg()         (bathimetrySvg.ts — stage/bed profile, no
 │    │                           hoveredStation param at all)
 │    └─ hover overlay rect      (sets uiSlice.hoveredStation, shows a
 │                                 cursor-following tooltip div)
 └─ Grid.tsx                     (rows read/write uiSlice.hoveredStation)

ImageResults.tsx
 └─ VelocityVector.tsx           (own LOCAL hoveredStation state, unrelated
      └─ drawVectors.ts            to uiSlice's; per-chevron hit area shows
                                    #vectors-tooltip, velocity-only)
```

`uiSlice.hoveredStation: number | null` and `onSetHoveredStation` already
exist and are already bidirectional between `Grid.tsx` and the charts (Phase
4b). The only missing producer/consumer is the canvas.

## 5. Design

### 5.1 Unify hover: canvas joins `uiSlice.hoveredStation`

- Delete `VelocityVector.tsx`'s local `hoveredStation`/`setHoveredStation`
  state. Pass `useUiSlice()`'s `hoveredStation`/`onSetHoveredStation` down to
  `drawVectors` in its place.
- `drawVectors.ts`'s per-chevron hit-area `mouseover`/`mouseout` call
  `onSetHoveredStation(i)` / `onSetHoveredStation(null)` directly, replacing
  the calls to the old `onHoverStation` local setter. The `isHovered` opacity
  boost logic (already keyed on `hoveredStation === i`) is unchanged.
- `drawVectors.ts` stops opening `#vectors-tooltip` — that responsibility
  moves entirely to the new `StationTag` (§5.3).

### 5.2 Crosshair on all three charts, and a canvas highlight

- `dischargeSvg.ts`: add a `hover-guide-line` drawn the same way
  `velocitySvg.ts` does today (own `y1`/`y2` within this chart's own
  `graphHeight`), in addition to (not instead of) the existing opacity dim.
- `bathimetrySvg.ts`: add a `hoveredStation` prop (currently entirely
  absent), draw its own `hover-guide-line`, and add a small circle marker on
  the stage/bed line at that station — the same treatment
  `velocitySvg.ts` already gives its own series markers.
- `velocitySvg.ts`'s existing line changes from spanning all three stacked
  panels' height (`y1: margin.top` to `y2: graphHeight * 3 - margin.bottom`)
  to spanning only its own chart's bounds, matching the new discharge and
  stage lines — each of the three charts now owns exactly its own line,
  rather than one line accidentally bleeding across a shared SVG.
- New small drawing module, `drawStationHighlight.ts` (next to
  `drawVectors.ts`), draws the mockup's canvas marker at the hovered
  station's chevron tip: a dark halo stroke, an accent-coloured ring, and a
  filled accent circle with the station number. Uses `--accent-color` — not
  the `--pin-*` tokens, since this is a hover indicator, not a placed,
  draggable point (`river-canvas-conventions`'s precision-pin rule doesn't
  apply to a non-interactive highlight). Rendered into
  `VelocityVector`'s existing `interactiveLayerRef` SVG, keyed off the same
  unified `hoveredStation`, so it appears no matter which of {canvas, chart,
  Grid} triggered the hover.

### 5.3 Pinnable, docked `StationTag`

- `uiSlice`: add `pinnedStation: number | null` (mirrors `hoveredStation`'s
  shape) and actions `pinStation(index: number)` / `unpinStation()`. A
  `pinStation` call on the currently-pinned index unpins (toggle).
- Click handlers, added at the three existing hover-producer sites, call
  `pinStation`/toggle on click:
  - `AllInOne.tsx`'s hover overlay `rect` — click uses the same
    nearest-station lookup its `mousemove` already does.
  - `drawVectors.ts`'s per-chevron hit area — click pins that station.
  - `Grid.tsx`'s row — click pins that row's station (new; today rows only
    set hover).
- New `StationTag.tsx` (in `src/components/Graphs/`, alongside the other
  Results chart modules), mounted once from `ImageResults.tsx`, absolutely
  positioned over the canvas panel per the mockup (top-right, matching where
  `ColorBar` anchors bottom-right). It reads `pinnedStation ?? hoveredStation`
  from `uiSlice` and the active section's `data`; renders nothing when both
  are `null`.
- Content: everything the current combined tooltip shows (discharge value +
  share, each visible technique's velocity using the existing ● ■ ▲
  marker+colour convention, stage) **plus**, per technique: spread (LSPIV's
  σ / P5–95 already computed for the chart bands; STIV's σ; a written
  "unseeded" / "low confidence" / a numeric iWave quality score) — all
  values the chart-band computations already produce, just not surfaced in
  the tooltip today.
- A pin icon button in the tag's header mirrors the click-to-pin behaviour
  (pin when unpinned viewing a hovered station, unpin when already pinned) —
  needed because a `StationTag` shown for a pure hover (nothing pinned yet)
  still needs an explicit way to pin without moving the pointer.
- `AllInOne.tsx`'s `getOrCreateTooltip()`/cursor-following div and
  `drawVectors.ts`'s `#vectors-tooltip` are deleted once `StationTag` is
  wired in — replaced, not duplicated.

### 5.4 Expandable technique rows, written labels, per-technique totals

- `TechniqueRow.tsx` (the shared shell used by both Results and Processing)
  gains an optional disclosure affordance: a chevron button, visually like
  the mockup's rotate-on-expand chevron, distinct from the existing name
  button (activates) and eye button (toggles visibility). Processing does
  not opt into it — Results-only, since Processing's rows have no
  layer-toggle body to expand.
- `TechniqueLegend.tsx` keeps one `expanded: Record<Technique, boolean>`
  piece of local component state (not Redux — this is transient UI state,
  same tier as `chartWidth` in `FormResults.tsx`), independent per
  technique so multiple rows can be open at once.
- Expanded body (rendered under a row when `expanded[key]` is true) contains
  written-label versions of the same controls that exist today, wired to
  the same `onChangeDataValues`/`onUpdateSection` calls — only presentation
  changes:
  - LSPIV: "Artificial seeding" switch, "σ band" toggle, "5–95% band" toggle.
  - STIV: "σ band" toggle (only when `stiv_sigma_profile` exists, as today).
  - iWave: "Quality shading" toggle (only when `iwave_quality_profile`
    exists, as today).
- Each row's collapsed state gains a trailing value — that technique's own
  total discharge, computed via the same `getEffectiveTechniqueData(data,
  key, techOptions)` call `AllInOne.tsx` already makes per visible technique
  (technically now duplicated between the two components — kept simple for
  4c; hoisting it into one shared computation is a legitimate follow-up
  spotted during implementation, not blocking).

## 6. Testing

- Pure helpers get unit tests: `drawStationHighlight`'s geometry (given a
  station index and transform, the halo/ring/badge screen position), the
  `StationTag` content builder (given section data + hovered/pinned station,
  the rows it produces — especially spread/quality formatting for
  missing/low-confidence data), and the discharge/bathymetry guide-line
  position math (mirroring `velocitySvg.ts`'s existing test coverage, if
  any — check before assuming none exists).
- Component/interaction tests: clicking a canvas chevron / chart position /
  Grid row pins and unpins correctly (including the toggle-on-same-station
  case); a pinned tag survives the pointer moving to hover a different
  station elsewhere (canvas highlight and per-chart crosshairs follow the
  live hover, the tag does not); each technique row's expand/collapse is
  independent of the others and of the existing activate/visibility clicks
  (regression coverage, matching the pattern Phase 3b already established
  for `TechniqueRow`'s existing click targets).
- Full `npx jest` run with no new failures against the existing baselines
  (currently 64 pre-existing `tsc` errors, ~20 lint problems — confirm exact
  counts at plan-writing time from the worktree tip).

## 7. Decisions already made (not open questions for the plan)

- The canvas/chart/Grid tooltips unify into one docked tag — not kept as two
  systems (canvas keeps a separate mini-tooltip was the rejected
  alternative).
- Pinning is triggered by clicking the station itself (canvas, chart, or
  Grid), not only by a pin button inside the tag.
- Technique rows expand independently; there is no accordion behaviour.
