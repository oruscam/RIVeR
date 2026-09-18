# RIVeR GUI Design Refresh — Phase 4b (Canvas Overlays: Masks, Regions, STIV Search Lines, Colour Bar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the four canvas-overlay findings the design audit scoped to 4b — masks, stabilization regions, STIV search lines, and the velocity colour bar — replacing hard-coded, state-blind drawing code with the shared token system and the "overlays show state" rule already established for pins (Phase 3c) and STIV search lines' own halo strokes.

**Architecture:** Same pattern as every prior phase: no new dependencies, pure geometry/state-derivation helpers extracted and unit-tested (mirroring `pinGeometry.ts`), imperative D3/SVG drawing code left to the manual browser walkthrough (mirroring `drawMagnifier.ts`), theme colours added as CSS custom properties consumed via `getCSSVar`. Masks and the colour-bar reset icon both gain a small floating pill/button UI reusing Phase 4a's `.mode-hint`-style dark pill convention; no new page layout, no new Redux slices — every piece of state this plan wires up (`hoveredStation`, `tunedFlags`, the STIV low-confidence check, `colorbarLimits.default`) already exists.

**Tech Stack:** React 18 + TypeScript, Redux Toolkit, D3 (v7) for canvas overlay drawing, react-i18next, Jest + React Testing Library.

**Spec:** RIVeR design audit artifact (2026-09-10 review), "Canvas overlays" section (`#canvas`) — see this plan's own findings/quotes below, transcribed directly from the artifact. Prior art: `gui/docs/superpowers/plans/2026-09-12-ui-design-refresh-phase-3c.md` (pins/magnifier — the halo-stroke and `getCSSVar`-per-theme-token conventions this plan reuses) and `gui/docs/superpowers/plans/2026-09-17-ui-design-refresh-phase-4a.md` (messages — the `.mode-hint` pill convention this plan reuses, and the "4b/4c/4d" scope split, § "Deferred / explicitly out of scope").

## Global Constraints

- **Overlays are theme-invariant.** Audit: "These overlays sit on footage rather than on the interface theme, so they look the same in dark, light and dracula. Only the controls around them change." New overlay-drawing colours that have no reason to differ per theme (mask white/dim) go in the bare `:root` scale-token block, exactly like `--pin-ink` — not redeclared per `[data-theme]`. Colours that already exist per-theme (`--accent-color`, `--pin-muted`, `--status-fair`) are reused as-is, never hard-coded.
- **Red is left, green is right; masks no longer use that red.** `[[river-canvas-conventions]]`: cross-section pins keep RIVeR's historical red-L/green-R. The audit's mask finding is specifically that masks *also* use that same red (`#ED6B57`), conflating "mask" with "left bank" when the two sit side by side. This plan's mask recolour must not touch `--pin-left`/`--pin-right`.
- **Point markers stay precise; masks/regions are shapes, not points** — the "exact tip" rule (`[[river-canvas-conventions]]`) governs pins only (already done in Phase 3c) and does not apply to mask/region vertices or handles.
- **The left canvas is imagery/geometry only.** Nothing in this plan adds a chart, graph, or numeric readout panel to the image canvas beyond the existing dark-pill label convention.
- **No new i18n copy without `defaultValue`.** Any new `t('...')` call added by this plan supplies an inline `defaultValue`, matching every existing call site (see Phase 4a's Global Constraints) — the 12 `src/translations/*/global.json` files are not touched.
- **No new hex literals scattered across files.** Every new overlay colour is a CSS custom property read via `getCSSVar` (or an existing one already exposed by `getPinColors`/`getTechniqueColors`), continuing the exact fix pattern Phase 3c used for pins — this is the audit's core "Masks... The hex value is repeated in 7 places across two files" complaint, and this plan must not repeat it for a fifth+ time.
- **Baseline at the start of this plan:** worktree `ui/design-refresh` (`/Users/antoine/river_compil/.worktrees/ui-design-refresh`), tip commit `bb4a092` (Phase 4a, fully landed). 38 suites / 428 tests passing, `npm test` in `gui/`. Every task in this plan must leave that count at 38+N suites / 428+M tests, all green, before its commit.

---

## Audit findings this plan implements (verbatim from the artifact's "Canvas overlays" comparison table and the two related numbered findings)

| Overlay | Today | Proposed |
|---|---|---|
| Masks | Coral hatch `#ED6B57` (same as error and left bank), round coral vertices, and a floating green tick to confirm | White hatch with a dimmed fill, dashed outline and square handles, and a small toolbar (Done, Undo point, Delete) next to the shape |
| Stabilisation regions | Blue rectangle, "Region 1" label, check button next to it, and the amber bar at the bottom saying "Add at least 2 regions" | Solid outline with corner handles and a numbered badge. The selected region uses the accent colour, and a mode hint at the top counts regions ("1 of 2 minimum") |
| STIV search lines | Always `--accent-color` with the same badge, whatever the state | Preview: white. Hovered: accent and thicker. After a run: velocity colour. Tuned: ✎ badge. Uncertain: dashed with !. No data: grey dashed |
| Colour bar | Plain number inputs that don't look editable, fixed hex colours, shown as "0.00 – 0.00" before any data, and an icon from a different icon set | Values that look editable on hover, a marker for the hovered value, a *Manual* label when edited, reset only when needed, and hidden until velocities exist |

Numbered findings (Medium): "Masks use the same red as errors and the left bank" (`Graphs/drawMask.ts:32,114,167,193,280`, `components/DrawMask.tsx:80,157`, `CustomIcons/ConfirmMaskBtn.tsx`) and "STIV search lines never change state" (`components/StationSearchLines.tsx:108–160`, `components/StiAngleTuner.tsx`) — the latter's own text: "The data for those states already exists: `tunedFlags`, the `stiAngleLowConfidence` check, per-station STIV velocity and `hoveredStation`. The overlay just doesn't use it." Numbered finding (Low): "The colour bar hides its own state" (`components/ColorBar.tsx:7–12,21–22,86–90`).

**Already done, not in this plan's scope:** the "Stabilisation regions... mode hint at the top counts regions" half of that row already shipped in Phase 4a (`StabilizationRegions.tsx`'s `onSetModeHint(..., '{{count}} of 2 min.')`) and masks' "Editing mask N" mode hint likewise already shipped (`MaskCreation.tsx`). This plan's regions/masks tasks touch only the on-canvas SVG drawing, not the side-panel mode hints, which are untouched and correct as-is.

---

## File Structure

- **`src/index.css`** — modify: two new bare-`:root` overlay tokens (`--overlay-line`, `--overlay-dim`), declared once like `--pin-ink`.
- **`src/helpers/getCSSVar.ts`** — modify: new `getOverlayColors()` reader, alongside the existing `getPinColors`/`getTechniqueColors`/`getDistanceColors`.
- **`src/helpers/overlayColorTokens.test.ts`** — new: pins down the two new tokens' values and bare-root placement, mirroring `pinColorTokens.test.ts`'s `--pin-ink` test.
- **`src/components/CustomIcons/Icons.tsx`** — modify: new `Undo` icon (Lucide `rotate-ccw`, matching the audit mockup's own `#i-reset` symbol), reused by both the mask toolbar's "Undo point" button and the colour bar's reset button.
- **`src/components/Graphs/drawMask.ts`** — modify: hatch/outline/vertex colours from hard-coded `#ED6B57` to the new tokens; round vertices → square handles; halo strokes behind edges/vertices; label text from red to white.
- **`src/components/DrawMask.tsx`** — modify: the static (non-active) mask layer's inline colours (same red → tokens); new `onUndoLastPoint` registration wired to a new pure helper.
- **`src/helpers/maskPoints.ts`** — new: pure `popLastMaskPoint` helper (removes the most-recently-added point by id), unit-tested in isolation from D3.
- **`src/helpers/maskPoints.test.ts`** — new.
- **`src/components/MaskToolbar.tsx`** — new: the floating Done/Undo point/Delete pill, replacing `ConfirmMaskBtn` for masks only (regions keep their existing single-button `ConfirmMaskBtn`).
- **`src/components/CrossSections/ImageCrossSections.tsx`** — modify: renders `MaskToolbar` instead of the bare `ConfirmMaskBtn`, wires `onUndoLastPoint`/`onDeleteMask`.
- **`src/components/components.css`** — modify: `.mask-toolbar`/`.mask-toolbar-btn` (mirrors `.mode-hint`'s dark-pill styling from `messages.css`), colour-bar hover-marker/manual-badge/editable-look rules.
- **`src/components/VideoPlayer/StabilizationCanvas.tsx`** — modify: `MASK_COLOR` constant replaced by active/inactive colour split (accent vs. muted), numbered circular badge added next to each region's label.
- **`src/components/Graphs/searchLineState.ts`** — new: pure `getSearchLineVisual` helper deriving stroke colour/width, halo colour/width, dash, label suffix, and badge background from a station's run/hover/tuned/low-confidence state.
- **`src/components/Graphs/searchLineState.test.ts`** — new.
- **`src/components/StationSearchLines.tsx`** — modify: consumes `getSearchLineVisual` + `getStiColorScale` + `hoveredStation`/`tunedFlags`/low-confidence per station instead of one flat `accentColor`; dispatches `onSetHoveredStation` on line hover.
- **`src/components/ColorBar.tsx`** — modify: hover marker over the gradient, *Manual* label + reset-only-when-`colorbarLimits.default === false`, `Icons.Undo` replacing `react-icons/gr`'s `GrRefresh`.
- **`src/hooks/useVelocityColorRange.ts`** — modify: returns a new `hasData: boolean` alongside `min`/`max`.
- **`src/components/ImageResults.tsx`** — modify: guards `<ColorBar>` with the new `hasData` (today it renders unconditionally and shows "0.00 – 0.00 m/s" before any run — the audit's own literal complaint).

---

## Task 1: Overlay design tokens and the shared Undo icon

**Files:**
- Modify: `src/index.css:29-34` (the bare `:root` scale-token block, right after `--pin-ink`)
- Modify: `src/helpers/getCSSVar.ts`
- Modify: `src/components/CustomIcons/Icons.tsx`
- Test: `src/helpers/overlayColorTokens.test.ts`

**Interfaces:**
- Produces: `getOverlayColors(): { line: string; dim: string }` — consumed by Task 2/3 (masks). `Icons.Undo(color?: string): JSX.Element` — consumed by Task 4 (mask toolbar) and Task 9 (colour bar reset).

- [ ] **Step 1: Write the failing token test**

```typescript
// src/helpers/overlayColorTokens.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { getOverlayColors } from './getCSSVar';

const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');

describe('overlay colour tokens', () => {
  it('--overlay-line and --overlay-dim are theme-invariant, declared once in the bare :root scale-token block', () => {
    const rootMatch = css.match(/:root\s*\{([\s\S]*?)\n\}/);
    expect(rootMatch?.[1]).toMatch(/--overlay-line:\s*#FFFFFF/);
    expect(rootMatch?.[1]).toMatch(/--overlay-dim:\s*rgba\(0,\s*0,\s*0,\s*0\.4\)/);

    for (const theme of ['dark', 'light', 'dracula'] as const) {
      const match = css.match(new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([\\s\\S]*?)\\n\\}`));
      expect(match?.[1]).not.toMatch(/--overlay-line/);
      expect(match?.[1]).not.toMatch(/--overlay-dim/);
    }
  });

  it('getOverlayColors reads the CSS variables with the bare-root values as fallback', () => {
    // No document/theme element in this jsdom-less test environment, so
    // getCSSVar falls through to each call's fallback.
    expect(getOverlayColors()).toEqual({
      line: '#FFFFFF',
      dim: 'rgba(0, 0, 0, 0.4)',
    });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest src/helpers/overlayColorTokens.test.ts`
Expected: FAIL — `getOverlayColors` is not exported, and the tokens don't exist yet.

- [ ] **Step 3: Add the tokens**

In `src/index.css`, extend the existing bare `:root` block (immediately after the `--pin-ink` declaration, still inside the same block):

```css
  /* Pin ink — the label colour drawn inside a pin's head. Always a near-black,
     since every pin fill (left/right/point) is a light, saturated colour in
     every theme; unlike --pin-left/right/point/muted below, this one value
     works everywhere and isn't redeclared per theme. */
  --pin-ink: #0B0D10;

  /* Mask overlay colours — white outline/hatch over a dimmed fill, per the
     design audit's Canvas overlays finding ("Masks use the same red as
     errors and the left bank"). Like --pin-ink, these sit on footage rather
     than app chrome, so one value works in every theme and isn't
     redeclared per [data-theme]. */
  --overlay-line: #FFFFFF;
  --overlay-dim:  rgba(0, 0, 0, 0.4);
```

- [ ] **Step 4: Add `getOverlayColors`**

In `src/helpers/getCSSVar.ts`, append after `getPinColors`:

```typescript
/**
 * Returns the mask/region overlay drawing colours from the current theme's
 * CSS variables. Both are theme-invariant (declared once in the bare
 * :root block, like --pin-ink) — see index.css.
 */
export const getOverlayColors = () => ({
  line: getCSSVar('--overlay-line', '#FFFFFF'),
  dim: getCSSVar('--overlay-dim', 'rgba(0, 0, 0, 0.4)'),
});
```

- [ ] **Step 5: Run the token test to confirm it passes**

Run: `npx jest src/helpers/overlayColorTokens.test.ts`
Expected: PASS

- [ ] **Step 6: Add the shared Undo icon**

In `src/components/CustomIcons/Icons.tsx`, add next to `Check`/`Trash` (same Lucide-derived inline-path convention as every other icon in this file; path data matches the audit mockup's own `#i-reset` symbol — Lucide's `rotate-ccw`):

```typescript
  Undo: (c?: string) => (
    <I color={c} d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" extra={['M3 3v5h5']} />
  ),
```

- [ ] **Step 7: Typecheck and run the full suite**

Run: `npx tsc --noEmit -p tsconfig.tmp-check.json 2>&1 | grep -c "error TS"` (copy `tsconfig.json`, drop `"noEmit": false` overrides if any — same scratch-check approach as Phase 4a Task 2; delete the scratch file after) and `npm test`
Expected: tsc error count unchanged from the 64 pre-existing baseline; 39 suites / 430 tests passing (2 new tests).

- [ ] **Step 8: Commit**

```bash
git add src/index.css src/helpers/getCSSVar.ts src/helpers/overlayColorTokens.test.ts src/components/CustomIcons/Icons.tsx
git commit -m "Add --overlay-line/--overlay-dim tokens and a shared Undo icon"
```

---

## Task 2: Recolour masks — white hatch, dimmed fill, square handles

**Files:**
- Modify: `src/components/Graphs/drawMask.ts`
- Modify: `src/components/DrawMask.tsx:80,156-159` (static/read-only mask layer — the non-active masks rendered alongside the one being edited)

**Interfaces:**
- Consumes: `getOverlayColors()` from Task 1.
- Produces: no new exports — `drawMask`/`drawMaskLabel`'s signatures are unchanged, only their internal colours and vertex shape.

- [ ] **Step 1: Recolour the interactive (active) mask in `drawMask.ts`**

Replace every `#ED6B57` hard-code in `src/components/Graphs/drawMask.ts` with the new tokens, and switch the fill pattern from a solid-colour dashed hatch to a white hatch over a dimmed fill. Import at the top:

```typescript
import { getOverlayColors } from '../../helpers/getCSSVar';
```

Replace the `isFirstRender` pattern block (currently draws only diagonal white-free hatch lines in `#ED6B57`) with a dimmed base rect plus a white hatch pattern layered on top — this needs two fill layers instead of one `fill="url(#dashFill)"`, so the polygon gains a sibling. Replace:

```typescript
  if (isFirstRender) {
    const defs = svg.append('defs');
    const pattern = defs
      .append('pattern')
      .attr('id', 'dashFill')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 10)
      .attr('height', 10);

    pattern.append('path').attr('d', 'M0 10 L10 0').attr('stroke', '#ED6B57').attr('stroke-width', 1);
  }
```

with:

```typescript
  const overlay = getOverlayColors();

  if (isFirstRender) {
    const defs = svg.append('defs');
    const pattern = defs
      .append('pattern')
      .attr('id', 'dashFill')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 10)
      .attr('height', 10);

    pattern.append('path').attr('d', 'M0 10 L10 0').attr('stroke', overlay.line).attr('stroke-width', 1);
  }
```

Then, where the polygon is created/updated (`polygon.mask-polygon`), give it a dimmed base fill in addition to the hatch — the audit mockup layers `fill:rgba(0,0,0,.4)` under the hatch pattern, not instead of it. Replace the polygon block:

```typescript
  let polygon = svg.select<SVGPolygonElement>('polygon.mask-polygon');
  if (polygon.empty()) {
    polygon = svg
      .append('polygon')
      .attr('class', 'mask-polygon')
      .attr('fill', 'url(#dashFill)')
      .attr('stroke', 'none')
      .attr('points', polygonPoints);
  } else {
    polygon.transition(t as any).attr('points', polygonPoints);
  }
```

with:

```typescript
  let dimFill = svg.select<SVGPolygonElement>('polygon.mask-dim');
  if (dimFill.empty()) {
    dimFill = svg
      .insert('polygon', 'polygon.mask-polygon')
      .attr('class', 'mask-dim')
      .attr('fill', overlay.dim)
      .attr('stroke', 'none')
      .attr('points', polygonPoints)
      .style('pointer-events', 'none');
  } else {
    dimFill.transition(t as any).attr('points', polygonPoints);
  }

  let polygon = svg.select<SVGPolygonElement>('polygon.mask-polygon');
  if (polygon.empty()) {
    polygon = svg
      .append('polygon')
      .attr('class', 'mask-polygon')
      .attr('fill', 'url(#dashFill)')
      .attr('stroke', 'none')
      .attr('points', polygonPoints);
  } else {
    polygon.transition(t as any).attr('points', polygonPoints);
  }
```

`polygon.mask-polygon` keeps owning the drag/mousedown handlers exactly as before (`pointer-events: auto`) — `polygon.mask-dim` is purely decorative (`pointer-events: none`) and sits underneath it in paint order via `insert(..., 'polygon.mask-polygon')`.

- [ ] **Step 2: Recolour the edges, "+" controls, and vertices**

Replace every remaining `'#ED6B57'` in the same file (edge lines, `+` circles, draggable vertex circles) with `overlay.line`:

```typescript
  lines
    .enter()
    .append('line')
    .attr('class', 'edge-line')
    .attr('stroke', overlay.line)
    .attr('stroke-width', 2)
```

```typescript
  plusCircles
    .enter()
    .append('circle')
    .attr('class', 'plus-circle')
    .attr('r', size(10))
    .attr('fill', overlay.line)
```

Vertex circles become squares (`<rect>` instead of `<circle>`), matching the audit's "square handles" — replace the draggable-points block:

```typescript
  // Draggable control points (constantes en px)
  const circles = svg.selectAll<SVGCircleElement, any>('circle.point').data(points, (d: any) => d.id);

  const circlesEnter = circles
    .enter()
    .append('circle')
    .attr('class', 'point')
    .attr('r', size(8))
    .attr('fill', '#ED6B57')
    .style('cursor', 'pointer')
    .style('pointer-events', 'auto')
    .attr('cx', (d) => transformToViewport(d.x, d.y).x)
    .attr('cy', (d) => transformToViewport(d.x, d.y).y);

  circlesEnter
    .merge(circles as any)
    .transition(t as any)
    .attr('r', size(7))
    .attr('cx', (d) => transformToViewport(d.x, d.y).x)
    .attr('cy', (d) => transformToViewport(d.x, d.y).y);

  svg
    .selectAll<SVGCircleElement, any>('circle.point')
    .on('mouseover', function () {
      d3.select(this).transition().duration(150).attr('r', size(11));
    })
    .on('mouseout', function () {
      d3.select(this).transition().duration(150).attr('r', size(8));
    })
    .on('mousedown', function (event, d: any) {
      event.stopPropagation();
      // Usa el id directamente, no el índice
      setDragging(d.id);
    });

  circles.exit().remove();

  svg.selectAll('circle.point').raise();
```

with (squares centred on the point, side length = 2× the old radius, so hit-area stays the same footprint):

```typescript
  // Draggable control points — square handles, matching the audit's mask spec
  // (round handles stay pin/vertex-only elsewhere; masks are the one overlay
  // whose handles are explicitly square).
  const squareSide = (r: number) => 2 * r;
  const points_ = svg.selectAll<SVGRectElement, any>('rect.point').data(points, (d: any) => d.id);

  const pointsEnter = points_
    .enter()
    .append('rect')
    .attr('class', 'point')
    .attr('width', squareSide(size(8)))
    .attr('height', squareSide(size(8)))
    .attr('fill', overlay.line)
    .attr('stroke', 'rgba(0, 0, 0, 0.75)')
    .attr('stroke-width', 1.5)
    .style('cursor', 'pointer')
    .style('pointer-events', 'auto')
    .attr('x', (d) => transformToViewport(d.x, d.y).x - squareSide(size(8)) / 2)
    .attr('y', (d) => transformToViewport(d.x, d.y).y - squareSide(size(8)) / 2);

  pointsEnter
    .merge(points_ as any)
    .transition(t as any)
    .attr('width', squareSide(size(7)))
    .attr('height', squareSide(size(7)))
    .attr('x', (d) => transformToViewport(d.x, d.y).x - squareSide(size(7)) / 2)
    .attr('y', (d) => transformToViewport(d.x, d.y).y - squareSide(size(7)) / 2);

  svg
    .selectAll<SVGRectElement, any>('rect.point')
    .on('mouseover', function (_event, d: any) {
      const half = squareSide(size(11)) / 2;
      d3.select(this)
        .transition()
        .duration(150)
        .attr('width', squareSide(size(11)))
        .attr('height', squareSide(size(11)))
        .attr('x', transformToViewport(d.x, d.y).x - half)
        .attr('y', transformToViewport(d.x, d.y).y - half);
    })
    .on('mouseout', function (_event, d: any) {
      const half = squareSide(size(8)) / 2;
      d3.select(this)
        .transition()
        .duration(150)
        .attr('width', squareSide(size(8)))
        .attr('height', squareSide(size(8)))
        .attr('x', transformToViewport(d.x, d.y).x - half)
        .attr('y', transformToViewport(d.x, d.y).y - half);
    })
    .on('mousedown', function (event, d: any) {
      event.stopPropagation();
      // Usa el id directamente, no el índice
      setDragging(d.id);
    });

  points_.exit().remove();

  svg.selectAll('rect.point').raise();
```

(The local `points_` name avoids shadowing the function's own `points` parameter.)

- [ ] **Step 3: Recolour the mask label text**

In `drawMaskLabel` (same file), the label text is currently the same red (`#ED6B57`) as everything else this task removes — every other floating label in the app (pin labels, search-line labels, region labels) is white text on a dark chip. Replace:

```typescript
    label.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-weight', 600)
      .attr('fill', '#ED6B57');
```

with:

```typescript
    label.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-weight', 600)
      .attr('fill', '#fff');
```

(`'#fff'` here — not a new token — matches the literal `#fff` every sibling label already uses: `RegionLabel` in `StabilizationCanvas.tsx:122`, `StationSearchLines.tsx`'s station-number text at `:147`.)

- [ ] **Step 4: Recolour the static (non-active) mask layer in `DrawMask.tsx`**

Replace the two remaining `'#ED6B57'` hard-codes:

```typescript
      pattern.append('path').attr('d', 'M0 10 L10 0').attr('stroke', '#ED6B57').attr('stroke-width', 1);
```

with `.attr('stroke', getOverlayColors().line)` (add the same import as Task 2 Step 1), and:

```typescript
      layer
        .append('polygon')
        .attr('points', pts)
        .attr('fill', 'url(#dashFill)') // pattern defined on svgRef root — always available
        .attr('stroke', '#ED6B57')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.75)
        .style('pointer-events', 'none');
```

with a dimmed base polygon inserted first, then the hatched one with the white stroke:

```typescript
      layer
        .append('polygon')
        .attr('points', pts)
        .attr('fill', getOverlayColors().dim)
        .attr('stroke', 'none')
        .style('pointer-events', 'none');

      layer
        .append('polygon')
        .attr('points', pts)
        .attr('fill', 'url(#dashFill)') // pattern defined on svgRef root — always available
        .attr('stroke', getOverlayColors().line)
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.75)
        .style('pointer-events', 'none');
```

- [ ] **Step 5: Manual visual check**

Run `npm run dev`, open a project on Cross Sections, add a mask with 4+ points, confirm it, add a second mask and leave it un-confirmed (active/editing). Confirm in all three themes (dark/light/dracula per `[[feedback_ui_three_themes]]`): the hatch is white on a dimmed background (not coral), vertices are visible squares, the label reads "Mask N" in white on the dark chip, and a mask next to a cross-section's red L pin no longer reads as "also part of the left bank."

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: 39 suites / 430 tests passing (unchanged from Task 1 — this task adds no new tests, it's pure D3 recolouring covered by the manual check above, same as Phase 3c's drawing modules).

- [ ] **Step 7: Commit**

```bash
git add src/components/Graphs/drawMask.ts src/components/DrawMask.tsx
git commit -m "Recolour masks: white hatch over a dimmed fill, square handles, white label"
```

---

## Task 3: Halo strokes behind mask edges and vertices

**Files:**
- Modify: `src/components/Graphs/drawMask.ts`
- Modify: `src/components/DrawMask.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — purely additive drawing elements.

Audit principle: "Every stroke has a halo. A dark outline behind each line and label keeps it readable on bright water and dark shade. The search lines already do this. The proposal applies it to every overlay." `StationSearchLines.tsx` already draws a `rgba(0, 0, 0, 0.45)` halo line under its accent line (Task 6/7 build on that same convention) — masks currently have none.

- [ ] **Step 1: Add a halo line under each mask edge**

In `drawMask.ts`, insert a halo `<line>` before the existing dashed edge line (same `edgesData` join, inserted first so it paints underneath):

```typescript
  const edgeHalos = svg.selectAll<SVGLineElement, any>('line.edge-halo').data(edgesData, (d: any) => d.id);

  edgeHalos
    .enter()
    .insert('line', 'line.edge-line')
    .attr('class', 'edge-halo')
    .attr('stroke', 'rgba(0, 0, 0, 0.55)')
    .attr('stroke-width', 4)
    .style('pointer-events', 'none')
    .attr('x1', (d) => d.va.x)
    .attr('y1', (d) => d.va.y)
    .attr('x2', (d) => d.vb.x)
    .attr('y2', (d) => d.vb.y)
    .merge(edgeHalos as any)
    .transition(t as any)
    .attr('x1', (d) => d.va.x)
    .attr('y1', (d) => d.va.y)
    .attr('x2', (d) => d.vb.x)
    .attr('y2', (d) => d.vb.y);

  edgeHalos.exit().remove();
```

Insert this block immediately before the existing `const lines = svg.selectAll...` block so the halo is created first and the coloured dashed line's own `.insert`-free `.append` naturally paints on top of it (D3 append order = paint order; since `edge-halo` is inserted before `line.edge-line` exists yet on first render, and appended in the same relative position on every subsequent render via the shared `edgesData` join, the halo stays underneath).

- [ ] **Step 2: Add a halo behind each square vertex handle**

Vertex halos are simplest as a slightly larger, dark, `pointer-events: none` square drawn directly under each `rect.point` (same coordinates, no interaction). Insert this immediately before the `rect.point` block from Task 2 Step 2:

```typescript
  const vertexHalos = svg.selectAll<SVGRectElement, any>('rect.point-halo').data(points, (d: any) => d.id);

  const haloSide = (r: number) => 2 * r + 3;
  vertexHalos
    .enter()
    .insert('rect', 'rect.point')
    .attr('class', 'point-halo')
    .attr('fill', 'rgba(0, 0, 0, 0.55)')
    .style('pointer-events', 'none')
    .attr('width', haloSide(size(8)))
    .attr('height', haloSide(size(8)))
    .attr('x', (d) => transformToViewport(d.x, d.y).x - haloSide(size(8)) / 2)
    .attr('y', (d) => transformToViewport(d.x, d.y).y - haloSide(size(8)) / 2)
    .merge(vertexHalos as any)
    .transition(t as any)
    .attr('width', haloSide(size(7)))
    .attr('height', haloSide(size(7)))
    .attr('x', (d) => transformToViewport(d.x, d.y).x - haloSide(size(7)) / 2)
    .attr('y', (d) => transformToViewport(d.x, d.y).y - haloSide(size(7)) / 2);

  vertexHalos.exit().remove();
```

(`rect.point`'s own hover-grow handlers from Task 2 don't need to touch the halo — a static 1.5px margin around the handle reads fine at both sizes, matching how the pin ring's halo doesn't resize on pin hover either.)

- [ ] **Step 3: Manual visual check**

Run `npm run dev`, draw a mask over a bright patch of water (or a light-theme background) and confirm the white outline/handles stay legible against it in all three themes — this is the exact scenario the audit principle calls out ("readable on bright water and dark shade").

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: 39 suites / 430 tests passing, unchanged (purely additive D3 elements, no new pure logic to unit test).

- [ ] **Step 5: Commit**

```bash
git add src/components/Graphs/drawMask.ts
git commit -m "Add halo strokes behind mask edges and vertex handles"
```

---

## Task 4: Mask toolbar — Done / Undo point / Delete

**Files:**
- Create: `src/helpers/maskPoints.ts`
- Create: `src/helpers/maskPoints.test.ts`
- Create: `src/components/MaskToolbar.tsx`
- Modify: `src/components/DrawMask.tsx`
- Modify: `src/components/CrossSections/ImageCrossSections.tsx`
- Modify: `src/components/components.css`

**Interfaces:**
- Produces: `popLastMaskPoint(points: {id: string|number; x: number; y: number}[]): {id: string|number; x: number; y: number}[]` — pure, pops the last array entry (points are appended in click/drag order, so "last in the array" is "most recently placed").
- Produces: `<MaskToolbar onDone={() => void} onUndoPoint={() => void} onDelete={() => void} canUndo={boolean} style={React.CSSProperties} />`.
- Consumes: `Icons.Check`/`Icons.Undo`/`Icons.Trash` (Task 1 + existing).

- [ ] **Step 1: Write the failing test for the pure undo helper**

```typescript
// src/helpers/maskPoints.test.ts
import { popLastMaskPoint } from './maskPoints';

describe('popLastMaskPoint', () => {
  it('removes the last point in the array', () => {
    const points = [
      { id: 0, x: 1, y: 1 },
      { id: 1, x: 2, y: 2 },
      { id: 2, x: 3, y: 3 },
    ];
    expect(popLastMaskPoint(points)).toEqual([
      { id: 0, x: 1, y: 1 },
      { id: 1, x: 2, y: 2 },
    ]);
  });

  it('does not mutate the input array', () => {
    const points = [{ id: 0, x: 1, y: 1 }];
    const result = popLastMaskPoint(points);
    expect(points).toHaveLength(1);
    expect(result).toEqual([]);
  });

  it('returns an empty array unchanged', () => {
    expect(popLastMaskPoint([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest src/helpers/maskPoints.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write the helper**

```typescript
// src/helpers/maskPoints.ts

/**
 * Removes the most-recently-added point from a mask's local point list — the
 * "Undo point" toolbar action. Points are appended (never reordered) as the
 * user clicks/drags, so "most recent" is simply the array's last entry.
 * Pure so it's testable without DrawMask.tsx's D3/effect machinery.
 */
export const popLastMaskPoint = <T>(points: T[]): T[] => points.slice(0, -1);
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx jest src/helpers/maskPoints.test.ts`
Expected: PASS

- [ ] **Step 5: Expose an undo action from `DrawMask.tsx`**

`DrawMask.tsx` owns `points`/`setPoints`/`nextIdRef` as local state and returns `null` (no JSX) — the parent (`ImageCrossSections.tsx`) needs a way to trigger the same `setPoints` from its own toolbar button. Add a `registerActions` callback prop, called whenever the relevant closures change (mirroring how `onLivePoints` is already streamed every render):

```typescript
export const DrawMask = ({
  factor,
  layers,
  scale,
  imageWidth,
  imageHeight,
  onLivePoints,
  registerActions,
}: {
  factor: number;
  layers: OverlayLayers;
  scale: number;
  imageWidth: number;
  imageHeight: number;
  onLivePoints?: (points: { x: number; y: number }[]) => void;
  /** Called on every render with the current undo action, so the parent's
   *  toolbar always invokes it against up-to-date `points`/`activeMaskIndex`. */
  registerActions?: (actions: { undoLastPoint: () => void }) => void;
}) => {
```

and, near the other `useEffect`s (after the `onLivePoints` one):

```typescript
  useEffect(() => {
    registerActions?.({
      undoLastPoint: () => setPoints((pts) => popLastMaskPoint(pts)),
    });
  }, [registerActions]);
```

Add the import: `import { popLastMaskPoint } from '../helpers/maskPoints';`.

(`setPoints` is a stable dispatch function from `useState`, so this effect only needs to re-run when `registerActions` itself changes — it always closes over the *current* `setPoints`, which is what matters since React guarantees `useState` setters are referentially stable across renders.)

- [ ] **Step 6: Build `MaskToolbar`**

```typescript
// src/components/MaskToolbar.tsx
import { useTranslation } from 'react-i18next';
import { Icons } from './CustomIcons/Icons';
import './components.css';

interface MaskToolbarProps {
  style?: React.CSSProperties;
  onDone: () => void;
  onUndoPoint: () => void;
  onDelete: () => void;
  /** Disabled once there's nothing left to undo (0 or 1 point placed). */
  canUndo: boolean;
}

/**
 * Floating Done / Undo point / Delete pill next to the mask being drawn or
 * edited, replacing the single ConfirmMaskBtn tick for masks (stabilization
 * regions keep their own single-button ConfirmMaskBtn — see the audit's
 * comparison table, which doesn't propose a toolbar for regions).
 */
export const MaskToolbar = ({ style, onDone, onUndoPoint, onDelete, canUndo }: MaskToolbarProps) => {
  const { t } = useTranslation();

  return (
    <div className="mask-toolbar" style={style} onMouseDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="mask-toolbar-btn"
        onClick={onUndoPoint}
        disabled={!canUndo}
        title={t('CrossSections.undoPoint', { defaultValue: 'Undo point' })}
      >
        {Icons.Undo('currentColor')}
      </button>
      <button
        type="button"
        className="mask-toolbar-btn mask-toolbar-btn-danger"
        onClick={onDelete}
        title={t('CrossSections.deleteMask', { defaultValue: 'Delete mask' })}
      >
        {Icons.Trash('currentColor')}
      </button>
      <button
        type="button"
        className="mask-toolbar-btn mask-toolbar-btn-done"
        onClick={onDone}
        title={t('CrossSections.confirmMask', { defaultValue: 'Confirm mask' })}
      >
        {Icons.Check('currentColor')}
      </button>
    </div>
  );
};
```

- [ ] **Step 7: Style the toolbar pill**

Append to `src/components/components.css` (mirrors `messages.css`'s `.mode-hint` dark-pill convention — same background/blur/radius, since both are floating chips over video content):

```css
.mask-toolbar {
    position: absolute;
    display: flex;
    gap: 2px;
    background: rgba(10, 12, 14, 0.86);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border-radius: var(--radius-full);
    padding: 3px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
    z-index: 10;
}

.mask-toolbar-btn {
    border: 0;
    background: transparent;
    color: #fff;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color var(--motion-fast) var(--motion-ease);
}

.mask-toolbar-btn:hover {
    background: rgba(255, 255, 255, 0.16);
}

.mask-toolbar-btn:disabled {
    opacity: 0.38;
    cursor: not-allowed;
}

.mask-toolbar-btn-danger:hover {
    color: var(--status-bad);
}

.mask-toolbar-btn-done {
    color: var(--status-good);
}
```

- [ ] **Step 8: Wire it into `ImageCrossSections.tsx`**

Replace the `ConfirmMaskBtn` import and floating-button JSX. Add state for the registered undo action and the current point count (for `canUndo`):

```typescript
import { useCallback, useRef, useState } from 'react';
import { useDataSlice, useImageZoomPan, useProjectSlice, useUiSlice } from '../../hooks';
import { OverlaySvg } from '../OverlaySvg';
import { DrawSectionsD3 } from './DrawSectionsD3';
import { DrawMask } from '../DrawMask';
import { MaskToolbar } from '../MaskToolbar';
```

(drop the `ConfirmMaskBtn` import). Inside the component, alongside the existing `livePoints` state:

```typescript
  const actionsRef = useRef<{ undoLastPoint: () => void } | null>(null);
  const registerActions = useCallback((actions: { undoLastPoint: () => void }) => {
    actionsRef.current = actions;
  }, []);
```

And the `{ processing, onUpdateActiveMask }` destructure gains `onDeleteMask`:

```typescript
  const { processing, onUpdateActiveMask, onDeleteMask } = useDataSlice();
```

Pass `registerActions` to `<DrawMask>`:

```typescript
            <DrawMask
              factor={factor!}
              layers={layers}
              scale={scale}
              imageWidth={imageWidth!}
              imageHeight={imageHeight!}
              onLivePoints={handleLivePoints}
              registerActions={registerActions}
            />
```

Replace the floating-button block:

```typescript
      {/* Floating confirm button — follows the active mask centroid */}
      {confirmBtnPos && (
        <div
          style={{
            position: 'absolute',
            left: confirmBtnPos.x,
            top: confirmBtnPos.y,
            zIndex: 10,
            transform: 'translate(-50%, -50%)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <ConfirmMaskBtn onClick={() => onUpdateActiveMask(activeMaskIndex!)} title="Confirm mask" />
        </div>
      )}
```

with:

```typescript
      {/* Floating toolbar — follows the active mask centroid */}
      {confirmBtnPos && (
        <MaskToolbar
          style={{
            left: confirmBtnPos.x,
            top: confirmBtnPos.y,
            transform: 'translate(-50%, -50%)',
          }}
          canUndo={livePoints.length > 1}
          onUndoPoint={() => actionsRef.current?.undoLastPoint()}
          onDelete={() => onDeleteMask(activeMaskIndex!)}
          onDone={() => onUpdateActiveMask(activeMaskIndex!)}
        />
      )}
```

(`canUndo={livePoints.length > 1}`: with 0 or 1 point left, "undo" would leave nothing to draw a mask from — `onDeleteMask` is the correct action at that point, not a disabled-looking undo loop.)

- [ ] **Step 9: Manual check**

Run `npm run dev`, on Cross Sections click "Add mask", place 4 points, click "Undo point" twice (confirm the last two points disappear and the polygon redraws live), click "Delete" (confirm the whole mask and its Redux entry are gone, editing mode exits), then repeat and use "Done" (confirm the mask is saved and editing exits without deleting it). Check all three themes.

- [ ] **Step 10: Run the full suite**

Run: `npm test`
Expected: 40 suites / 433 tests passing (3 new maskPoints tests).

- [ ] **Step 11: Commit**

```bash
git add src/helpers/maskPoints.ts src/helpers/maskPoints.test.ts src/components/MaskToolbar.tsx src/components/DrawMask.tsx src/components/CrossSections/ImageCrossSections.tsx src/components/components.css
git commit -m "Replace the mask confirm tick with a Done / Undo point / Delete toolbar"
```

---

## Task 5: Stabilization regions — accent colour when active, numbered badge

**Files:**
- Modify: `src/components/VideoPlayer/StabilizationCanvas.tsx`

**Interfaces:**
- Consumes: `getCSSVar` (already imported project-wide via `src/helpers/getCSSVar.ts`; this file currently imports nothing from it — add the import).
- Produces: no new exports; `Props` is unchanged.

Audit: "Solid outline with corner handles and a numbered badge. The selected region uses the accent colour[; inactive regions keep the existing muted look]." Today every region — active or not — uses the same fixed `MASK_COLOR = 'var(--d12)'`. The corner handles already exist (unchanged by this task); a numbered badge (currently there's only the "Region N" text label, no distinct circular number chip) is new.

- [ ] **Step 1: Split the fixed colour into active/inactive**

Replace:

```typescript
const MASK_COLOR = 'var(--d12)';
```

with:

```typescript
import { getCSSVar } from '../../helpers/getCSSVar';

const INACTIVE_COLOR = 'var(--pin-muted)';
```

(add the import at the top of the file alongside the existing ones). Then, in the component body, compute the active colour once (theme-aware, same pattern `StationSearchLines.tsx` already uses for `accentColor`):

```typescript
  const accentColor = getCSSVar('--accent-color', '#0678BE');
```

Every remaining use of `MASK_COLOR` in the file becomes conditional on `isActive`:

- The region `<rect>`'s `stroke={MASK_COLOR}` → `stroke={isActive ? accentColor : INACTIVE_COLOR}`.
- The four corner-handle `<circle>`s' `fill={MASK_COLOR}` → `fill={accentColor}` (unchanged — handles only render `{isActive && (...)}` in the first place, so they're always the active colour already; this is a no-op rename, not a behavior change, done for clarity since `MASK_COLOR` no longer exists).
- `RegionLabel`'s `fill={MASK_COLOR}` prop — `RegionLabel` is rendered once per region regardless of active state, so pass the resolved colour in from the caller: change `RegionLabel`'s prop from a hardcoded internal `fill={MASK_COLOR}` to a new `color` prop, and pass `color={isActive ? accentColor : INACTIVE_COLOR}` from the `regions.map` call site.
- `StabilizationCanvas.tsx:380`'s `<ConfirmMaskBtn ... style={{ background: MASK_COLOR }} />` → `style={{ background: accentColor }}` (the confirm button only ever renders for the active region, so this is always the accent colour).

- [ ] **Step 2: Add the numbered badge**

Add a small circular number chip at the region's top-left corner, next to (not replacing) the existing `RegionLabel` text — same visual language as the mask label's dark chip, but circular with just the number, matching the pin-label / search-line-label "small dark badge" family already established. Insert this new sub-component above `RegionLabel` in the same file:

```typescript
/** Small circular number chip at a region's top-left corner. */
const RegionBadge = ({
  x,
  y,
  n,
  color,
  size,
}: {
  x: number;
  y: number;
  n: number;
  color: string;
  size: (px: number) => number;
}) => (
  <g style={{ pointerEvents: 'none' }}>
    <circle cx={x} cy={y} r={size(11)} fill="rgba(0, 0, 0, 0.6)" stroke={color} strokeWidth={size(1.5)} />
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size(11)} fontWeight={700} fill="#fff">
      {n}
    </text>
  </g>
);
```

Render it inside the `regions.map` callback, right after the region's `<rect>`:

```typescript
              <RegionBadge x={x} y={y} n={index + 1} color={isActive ? accentColor : INACTIVE_COLOR} size={size} />
```

- [ ] **Step 3: Manual check**

Run `npm run dev`, go to Video Range, enable Stabilize video, add two regions. Confirm the active (currently-being-edited) region is drawn in the app's accent colour with a numbered badge at its corner, and inactive regions are muted grey — in all three themes.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: 40 suites / 433 tests passing, unchanged (JSX-only change, no new pure logic — covered by the manual check, same as the rest of this file's existing untested drawing code).

- [ ] **Step 5: Commit**

```bash
git add src/components/VideoPlayer/StabilizationCanvas.tsx
git commit -m "Stabilization regions: accent colour when active, numbered badge"
```

---

## Task 6: STIV search-line visual-state helper

**Files:**
- Create: `src/components/Graphs/searchLineState.ts`
- Create: `src/components/Graphs/searchLineState.test.ts`

**Interfaces:**
- Produces: `getSearchLineVisual(input: SearchLineStateInput): SearchLineVisual` — pure, no DOM/CSS reads (colours are passed in as already-resolved strings, mirroring `pinGeometry.ts`'s plain-numbers-in convention), consumed by Task 7.

This is the pure half of "STIV search lines never change state." Preview/no-data/tuned/uncertain/hover are derived here in isolation; Task 7 wires it to real D3 elements and Redux state.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/components/Graphs/searchLineState.test.ts
import { getSearchLineVisual } from './searchLineState';

const colors = {
  preview: '#FFFFFF',
  accent: '#0678BE',
  muted: '#808080',
  warning: '#F5BF61',
  badge: 'rgba(50, 50, 50, 0.85)',
};

describe('getSearchLineVisual', () => {
  it('is white and not dashed before any STIV run', () => {
    const v = getSearchLineVisual({
      hasRun: false,
      velocityColor: null,
      isHovered: false,
      tuned: false,
      lowConfidence: false,
      colors,
    });
    expect(v).toEqual({
      strokeColor: colors.preview,
      haloColor: 'rgba(0, 0, 0, 0.45)',
      strokeWidth: 1.5,
      haloWidth: 3.5,
      dashed: false,
      labelSuffix: '',
      badgeBackground: colors.badge,
    });
  });

  it('is grey and dashed for a station with no value after a run', () => {
    const v = getSearchLineVisual({
      hasRun: true,
      velocityColor: null,
      isHovered: false,
      tuned: false,
      lowConfidence: false,
      colors,
    });
    expect(v.strokeColor).toBe(colors.muted);
    expect(v.dashed).toBe(true);
  });

  it('uses the velocity colour, solid, once a station has a value', () => {
    const v = getSearchLineVisual({
      hasRun: true,
      velocityColor: '#62C655',
      isHovered: false,
      tuned: false,
      lowConfidence: false,
      colors,
    });
    expect(v.strokeColor).toBe('#62C655');
    expect(v.dashed).toBe(false);
    expect(v.labelSuffix).toBe('');
    expect(v.badgeBackground).toBe(colors.badge);
  });

  it('appends a ✎ suffix and keeps the normal badge when tuned', () => {
    const v = getSearchLineVisual({
      hasRun: true,
      velocityColor: '#62C655',
      isHovered: false,
      tuned: true,
      lowConfidence: false,
      colors,
    });
    expect(v.labelSuffix).toBe(' ✎');
    expect(v.badgeBackground).toBe(colors.badge);
  });

  it('dashes the line, appends a ! suffix, and turns the badge warning-coloured when low-confidence', () => {
    const v = getSearchLineVisual({
      hasRun: true,
      velocityColor: '#62C655',
      isHovered: false,
      tuned: false,
      lowConfidence: true,
      colors,
    });
    expect(v.dashed).toBe(true);
    expect(v.labelSuffix).toBe(' !');
    expect(v.badgeBackground).toBe(colors.warning);
  });

  it('tuned wins the label suffix over lowConfidence when (in principle) both are true', () => {
    // isStationTuned/lowConfidence are mutually exclusive in practice — a manual
    // angle override replaces the fit sigma is derived from (mergedSigmaProfile
    // nulls sigma for tuned stations) — but the helper still needs a defined,
    // tested order so a future caller can't get an ambiguous suffix.
    const v = getSearchLineVisual({
      hasRun: true,
      velocityColor: '#62C655',
      isHovered: false,
      tuned: true,
      lowConfidence: true,
      colors,
    });
    expect(v.labelSuffix).toBe(' ✎');
  });

  it('thickens the line and swaps the halo to accent when hovered, keeping the state colour', () => {
    const v = getSearchLineVisual({
      hasRun: true,
      velocityColor: '#62C655',
      isHovered: true,
      tuned: false,
      lowConfidence: false,
      colors,
    });
    expect(v.strokeColor).toBe('#62C655');
    expect(v.haloColor).toBe(colors.accent);
    expect(v.strokeWidth).toBeGreaterThan(1.5);
    expect(v.haloWidth).toBeGreaterThan(3.5);
  });

  it('hover applies the same way in preview (before any run)', () => {
    const v = getSearchLineVisual({
      hasRun: false,
      velocityColor: null,
      isHovered: true,
      tuned: false,
      lowConfidence: false,
      colors,
    });
    expect(v.strokeColor).toBe(colors.preview);
    expect(v.haloColor).toBe(colors.accent);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npx jest src/components/Graphs/searchLineState.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write the helper**

```typescript
// src/components/Graphs/searchLineState.ts

export interface SearchLineColors {
  /** Before any STIV run. */
  preview: string;
  /** Hover halo colour, and the badge's normal (non-warning) background is
   *  passed separately as `badge` — accent is used only for the halo. */
  accent: string;
  /** After a run, for a station with no resolved value. */
  muted: string;
  /** Uncertain/low-confidence badge background. */
  warning: string;
  /** The normal (non-warning) badge background — the dark chip every other
   *  overlay label already uses. */
  badge: string;
}

export interface SearchLineStateInput {
  /** True once STIV has produced velocities for the current station count —
   *  StationSearchLines.tsx's existing `hasAuthoritativeCenters` check. */
  hasRun: boolean;
  /** This station's colour from getStiColorScale, or null when hasRun is
   *  true but this particular station has no resolved value. Ignored
   *  (always treated as absent) when hasRun is false. */
  velocityColor: string | null;
  isHovered: boolean;
  /** effective.tunedFlags[i] / isStationTuned(...) for this station. */
  tuned: boolean;
  /** The Carousel.tsx "low confidence" check for this station:
   *  sigma !== null && sigma > |velocity|, velocity !== 0. */
  lowConfidence: boolean;
  colors: SearchLineColors;
}

export interface SearchLineVisual {
  strokeColor: string;
  haloColor: string;
  strokeWidth: number;
  haloWidth: number;
  dashed: boolean;
  /** Appended to the plain station number in the label, e.g. ' ✎' or ' !'. */
  labelSuffix: string;
  badgeBackground: string;
}

const BASE_STROKE_WIDTH = 1.5;
const BASE_HALO_WIDTH = 3.5;
const HOVER_STROKE_WIDTH = 2.5;
const HOVER_HALO_WIDTH = 5;
const BASE_HALO_COLOR = 'rgba(0, 0, 0, 0.45)';

/**
 * Derives a station's STIV search-line appearance from its run/hover/tuned/
 * low-confidence state — the audit's "STIV search lines never change state"
 * finding. Pure: every colour is passed in already resolved (from
 * getCSSVar/getStiColorScale), so this has no DOM dependency and is fully
 * unit-testable, the same split pinGeometry.ts uses for pins.
 */
export const getSearchLineVisual = ({
  hasRun,
  velocityColor,
  isHovered,
  tuned,
  lowConfidence,
  colors,
}: SearchLineStateInput): SearchLineVisual => {
  const hasValue = hasRun && velocityColor !== null;

  const strokeColor = hasValue ? (velocityColor as string) : hasRun ? colors.muted : colors.preview;
  const dashed = (hasRun && !hasValue) || lowConfidence;
  const labelSuffix = tuned ? ' ✎' : lowConfidence ? ' !' : '';
  const badgeBackground = !tuned && lowConfidence ? colors.warning : colors.badge;

  return {
    strokeColor,
    haloColor: isHovered ? colors.accent : BASE_HALO_COLOR,
    strokeWidth: isHovered ? HOVER_STROKE_WIDTH : BASE_STROKE_WIDTH,
    haloWidth: isHovered ? HOVER_HALO_WIDTH : BASE_HALO_WIDTH,
    dashed,
    labelSuffix,
    badgeBackground,
  };
};
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npx jest src/components/Graphs/searchLineState.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/Graphs/searchLineState.ts src/components/Graphs/searchLineState.test.ts
git commit -m "Add getSearchLineVisual: pure STIV search-line state derivation"
```

---

## Task 7: Wire search-line states into `StationSearchLines.tsx`

**Files:**
- Modify: `src/components/StationSearchLines.tsx`

**Interfaces:**
- Consumes: `getSearchLineVisual` (Task 6), `getStiColorScale` (existing, `src/helpers`), `isStationTuned` (existing, `src/helpers`), `hoveredStation`/`onSetHoveredStation` (existing, `useUiSlice`).

- [ ] **Step 1: Pull in the per-station state**

Add the new imports and hook reads:

```typescript
import { computeStationSearchLines, computeSearchLinesFromCenters, getStiColorScale, isStationTuned } from '../helpers';
import { getSearchLineVisual } from './Graphs/searchLineState';
import { useDataSlice, useSectionSlice, useUiSlice } from '../hooks';
```

Inside the component, alongside the existing `const { sections, activeSection, transformationMatrix } = useSectionSlice();`:

```typescript
  const { colorbarLimits } = useDataSlice();
  const { hoveredStation, onSetHoveredStation } = useUiSlice();
```

(`useDataSlice` is already imported for `processing`; add `colorbarLimits` to that existing destructure instead of a second call: `const { processing, colorbarLimits } = useDataSlice();`.)

- [ ] **Step 2: Compute low-confidence per station, matching Carousel.tsx's check exactly**

Add this helper function above the component (co-located since it's specific to this file's data shape, not shared elsewhere beyond Carousel.tsx's own inline version — extracting a shared helper is not in this plan's scope; both call sites independently encode the same short rule, matching how `isStationTuned` is already the one piece that *is* shared):

```typescript
/** Mirrors Carousel.tsx's lowConfidence check exactly: a dry-bank station has
 *  v = 0 and sigma at its floor, which would otherwise satisfy sigma > |v|
 *  while meaning nothing. */
const isLowConfidence = (v: number | null | undefined, sigma: number | null | undefined): boolean =>
  v !== null && v !== undefined && v !== 0 && sigma !== null && sigma !== undefined && sigma > Math.abs(v);
```

- [ ] **Step 3: Replace the flat `accentColor` draw with per-station state**

Replace the single `const accentColor = getCSSVar('--accent-color', '#0678BE');` line and everything below it that draws `station-search-line-halo`/`station-search-line`/`station-search-dot`/labels, with per-station visuals. First, resolve the colour palette once (outside the `lines.forEach`, since `getCSSVar` reads are cheap but there's no reason to repeat them per station):

```typescript
    const visualColors = {
      preview: getCSSVar('--overlay-line', '#FFFFFF'),
      accent: getCSSVar('--accent-color', '#0678BE'),
      muted: getCSSVar('--pin-muted', '#808080'),
      warning: getCSSVar('--status-fair', '#F5BF61'),
      badge: 'rgba(50, 50, 50, 0.85)',
    };

    const stivProfile = data?.stiv_velocity_profile;
    const stivSigma = data?.stiv_sigma_profile;
    const manualAngles = data?.stiv_angle_manual_profile;
    const { colors: stivColors } = hasAuthoritativeCenters
      ? getStiColorScale(stivProfile, colorbarLimits)
      : { colors: [] as string[] };

    const visuals = lines.map((line) => {
      const stationIndex = line.station - 1; // display number is 1-based; array index is 0-based
      const rawColor = stivColors[stationIndex];
      return getSearchLineVisual({
        hasRun: hasAuthoritativeCenters,
        velocityColor: rawColor && rawColor !== 'transparent' ? rawColor : null,
        isHovered: hoveredStation === stationIndex,
        tuned: hasAuthoritativeCenters ? isStationTuned(manualAngles, stationIndex) : false,
        lowConfidence: hasAuthoritativeCenters ? isLowConfidence(stivProfile?.[stationIndex], stivSigma?.[stationIndex]) : false,
        colors: visualColors,
      });
    });
```

(`getStiColorScale`'s `STI_FALLBACK_COLOR` fallback isn't used here — the fallback exists for elements that must never render invisible; search lines already have their own explicit "no data" grey-dashed state from `getSearchLineVisual`, so a plain `null` check against `'transparent'` is the correct signal, not the fallback colour.)

Now replace the three `enter()...merge()` D3 blocks (halo, line, dot) to read per-datum from `visuals` (index-aligned with `lines`, since both are built from the same array in the same order) instead of the single flat `accentColor`:

```typescript
    layer
      .selectAll('line.station-search-line-halo')
      .data(lines)
      .enter()
      .append('line')
      .attr('class', 'station-search-line-halo')
      .attr('x1', (d) => d.a.x / factor)
      .attr('y1', (d) => d.a.y / factor)
      .attr('x2', (d) => d.b.x / factor)
      .attr('y2', (d) => d.b.y / factor)
      .attr('stroke', (_d, i) => visuals[i].haloColor)
      .attr('stroke-width', (_d, i) => visuals[i].haloWidth);

    layer
      .selectAll('line.station-search-line')
      .data(lines)
      .enter()
      .append('line')
      .attr('class', 'station-search-line')
      .attr('x1', (d) => d.a.x / factor)
      .attr('y1', (d) => d.a.y / factor)
      .attr('x2', (d) => d.b.x / factor)
      .attr('y2', (d) => d.b.y / factor)
      .attr('stroke', (_d, i) => visuals[i].strokeColor)
      .attr('stroke-width', (_d, i) => visuals[i].strokeWidth)
      .attr('stroke-dasharray', (_d, i) => (visuals[i].dashed ? '5 4' : null));

    layer
      .selectAll('circle.station-search-dot')
      .data(lines)
      .enter()
      .append('circle')
      .attr('class', 'station-search-dot')
      .attr('cx', (d) => d.a.x / factor)
      .attr('cy', (d) => d.a.y / factor)
      .attr('r', 3)
      .attr('fill', (_d, i) => visuals[i].strokeColor)
      .attr('stroke', 'rgba(0, 0, 0, 0.45)')
      .attr('stroke-width', 1);
```

- [ ] **Step 4: Redraw the labels with a badge that changes colour, and a wider invisible hit-line for hover**

Replace the `labelGroups` block (text colour was `accentColor`, now white-on-badge like every sibling label; badge background switches per station):

```typescript
    const labelGroups = layer
      .selectAll('g.station-search-label')
      .data(lines)
      .enter()
      .append('g')
      .attr('class', 'station-search-label')
      .attr('transform', (d) => `translate(${d.b.x / factor}, ${d.b.y / factor})`);

    labelGroups
      .append('text')
      .attr('x', 10)
      .attr('y', 0)
      .attr('dominant-baseline', 'central')
      .attr('fill', '#fff')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text((d, i) => `${d.station}${visuals[i].labelSuffix}`);

    labelGroups.each(function (_d, i) {
      const g = d3.select(this);
      const textNode = g.select('text').node() as SVGTextElement;
      try {
        const bbox = textNode.getBBox();
        const padX = 4;
        const padY = 2;
        g.insert('rect', 'text')
          .attr('x', bbox.x - padX)
          .attr('y', bbox.y - padY)
          .attr('width', bbox.width + padX * 2)
          .attr('height', bbox.height + padY * 2)
          .attr('rx', 3)
          .attr('ry', 3)
          .attr('fill', visuals[i].badgeBackground);
      } catch {
        // getBBox may fail if not yet attached to the DOM — silently skip
      }
    });
```

Then add a wide, invisible hit-line per station (the visible line is only 1.5–2.5px, too thin to hover reliably) that dispatches `onSetHoveredStation`, appended last in this effect so it sits on top for pointer events without affecting paint order visually (`fill/stroke: transparent` never paints):

```typescript
    layer
      .selectAll('line.station-search-hit')
      .data(lines)
      .enter()
      .append('line')
      .attr('class', 'station-search-hit')
      .attr('x1', (d) => d.a.x / factor)
      .attr('y1', (d) => d.a.y / factor)
      .attr('x2', (d) => d.b.x / factor)
      .attr('y2', (d) => d.b.y / factor)
      .attr('stroke', 'transparent')
      .attr('stroke-width', 14)
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => onSetHoveredStation(d.station - 1))
      .on('mouseleave', () => onSetHoveredStation(null));
```

- [ ] **Step 5: Update the effect's dependency array**

Add the new reads (`colorbarLimits`, `hoveredStation`, `onSetHoveredStation`) to the existing `useEffect`'s dependency array:

```typescript
  }, [
    numStations,
    sectionPoints,
    data,
    heightRoi,
    transformationMatrix,
    factor,
    stationLayerRef,
    colorbarLimits,
    hoveredStation,
    onSetHoveredStation,
  ]);
```

- [ ] **Step 6: Manual check**

Run `npm run dev`, open Processing with a section that has a run STIV analysis including at least one tuned station (use the STIV angle tuner to override one) and, if the test project has one, a naturally low-confidence station. Confirm: before any STIV run the lines are plain white; after a run each takes its station's velocity colour; the tuned station shows "N ✎"; a low-confidence station is dashed with "N !" on a warning-coloured badge; hovering a line (or the corresponding Grid row, since both now share `hoveredStation`) thickens it and swaps its halo to the accent colour; a station with no resolved value (if the project has one, e.g. a masked-out station) is grey and dashed. Check all three themes.

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: 41 suites / 441 tests passing, unchanged (this task is integration wiring around the already-tested Task 6 helper; the D3 rendering itself is covered by the manual check, same precedent as `StationSearchLines.tsx`'s own pre-existing untested draw code).

- [ ] **Step 8: Commit**

```bash
git add src/components/StationSearchLines.tsx
git commit -m "Wire STIV search lines to run/hover/tuned/low-confidence state"
```

---

## Task 8: Colour bar — hover marker over the gradient

**Files:**
- Modify: `src/components/ColorBar.tsx`
- Modify: `src/components/components.css`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — purely internal component state.

**Scoping decision:** the audit's "a marker for the hovered value" is implemented as the colour bar tracking the mouse directly over its own gradient (a classic legend hover-to-preview gesture) rather than syncing to the app-wide `hoveredStation` (wired for search lines in Task 7). The four `<ColorBar>` call sites use genuinely different data (the LSPIV quiver's own min/max in `ImageProcessing.tsx:208` vs. the STIV-specific `getStiColorScale` result in the same file's `previewMode === 'sti'` branch vs. `useVelocityColorRange`'s cross-section aggregate in `ImageResults.tsx`/`ImageWithData.tsx`) — plumbing `hoveredStation` through correctly for all four without showing a station's value against the *wrong* technique's colour range is real, separate work the audit doesn't specify closely enough to spec here. A self-contained mouse-over-the-bar marker is unambiguous, low-risk, and satisfies the finding's literal text.

- [ ] **Step 1: Add hover-fraction state and a marker element**

In `ColorBar.tsx`, add local state and mouse handlers on the gradient div:

```typescript
  const [hoverFraction, setHoverFraction] = useState<number | null>(null);

  const handleGradientMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setHoverFraction(fraction);
  };

  const handleGradientMouseLeave = () => setHoverFraction(null);

  const hoveredValue = hoverFraction === null ? null : toDisplay(min) + hoverFraction * (toDisplay(max) - toDisplay(min));
```

Replace the plain gradient `<div>`:

```typescript
      <div className="colorbar" style={{ background: gradient }} />
```

with:

```typescript
      <div
        className="colorbar"
        style={{ background: gradient }}
        onMouseMove={handleGradientMouseMove}
        onMouseLeave={handleGradientMouseLeave}
      >
        {hoverFraction !== null && (
          <div className="colorbar-marker" style={{ left: `${hoverFraction * 100}%` }}>
            <span>{hoveredValue!.toFixed(2)}</span>
          </div>
        )}
      </div>
```

- [ ] **Step 2: Style the marker**

Append to `src/components/components.css`, after the existing `.colorbar` rule:

```css
.colorbar {
    position: relative;
    flex: 1;
    height: 14px;
    border-radius: 10px;
    cursor: crosshair;
}

.colorbar-marker {
    position: absolute;
    top: -4px;
    bottom: -4px;
    width: 2px;
    background: #fff;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.7);
    transform: translateX(-50%);
    pointer-events: none;
}

.colorbar-marker span {
    position: absolute;
    bottom: 19px;
    left: 50%;
    transform: translateX(-50%);
    background: #fff;
    color: #0B0D10;
    font: 700 10.5px var(--ui, inherit);
    padding: 1px 5px;
    border-radius: 4px;
    white-space: nowrap;
}
```

(`.colorbar` already existed with `flex: 1; height: 14px; border-radius: 10px;` — this step adds `position: relative` so the marker's `position: absolute` is scoped to the bar, plus `cursor: crosshair` as the "looks interactive" affordance.)

- [ ] **Step 3: Manual check**

Run `npm run dev`, get to a screen with a populated colour bar (Results, after a run), move the mouse across the gradient and confirm a marker + value tooltip tracks it, in all three themes, honoring the imperial/SI unit toggle (`toDisplay` is already applied).

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: 41 suites / 441 tests passing, unchanged (interactive-only change, covered by the manual check).

- [ ] **Step 5: Commit**

```bash
git add src/components/ColorBar.tsx src/components/components.css
git commit -m "Colour bar: hover marker over the gradient"
```

---

## Task 9: Colour bar — Manual label, reset icon, hide until data exists

**Files:**
- Modify: `src/components/ColorBar.tsx`
- Modify: `src/components/components.css`
- Modify: `src/hooks/useVelocityColorRange.ts`
- Modify: `src/components/ImageResults.tsx`
- Test: `src/hooks/useVelocityColorRange.test.ts` (new)

**Interfaces:**
- Produces: `hasResolvedData(resolvedPerSection: ((number | null)[] | null)[]): boolean` — pure, exported from `useVelocityColorRange.ts`, consumed by the hook itself and unit-tested directly (this codebase has no precedent anywhere for mounting a hook against a mocked Redux `Provider` — every existing hook-adjacent test targets a pure function instead, e.g. `pinGeometry.test.ts`/`searchLineState.test.ts`/`maskPoints.test.ts` in this same plan — so the new logic is factored out to fit that pattern rather than introducing a new one).
- Produces: `useVelocityColorRange(): { min: number; max: number; hasData: boolean }` — `hasData` added to the existing return shape; both existing consumers (`ColorBar`'s indirect min/max sources) keep working unchanged, only `ImageResults.tsx` reads the new field.

- [ ] **Step 1: Swap the reset icon and add the Manual label**

In `ColorBar.tsx`, replace the `react-icons/gr` import:

```typescript
import { GrRefresh } from 'react-icons/gr';
```

with:

```typescript
import { Icons } from './CustomIcons/Icons';
```

and the refresh button:

```typescript
      {activeStep !== 7 && (
        <button onClick={onRefresh} disabled={colorbarLimits.default}>
          <GrRefresh />
        </button>
      )}
```

with a *Manual* label shown only when the limits are actually locked, plus the reset button using the shared icon (already disabled when `colorbarLimits.default` is true, i.e. reset is only ever actionable "when needed," per the audit):

```typescript
      {colorbarLimits.default === false && (
        <span className="colorbar-manual-badge">{t('Processing.colorbarManual', { defaultValue: 'Manual' })}</span>
      )}
      {activeStep !== 7 && (
        <button
          onClick={onRefresh}
          disabled={colorbarLimits.default}
          title={t('Processing.colorbarReset', { defaultValue: 'Reset to data range' })}
        >
          {Icons.Undo('currentColor')}
        </button>
      )}
```

Add `const { t } = useTranslation();` and `import { useTranslation } from 'react-i18next';` (the component doesn't currently use i18n at all — every other RIVeR component does, so this brings it in line rather than hard-coding new English strings).

- [ ] **Step 2: Style the Manual badge**

Append to `src/components/components.css`:

```css
.colorbar-manual-badge {
    font: 600 10.5px var(--ui, inherit);
    color: #fff;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
    border-radius: 4px;
    padding: 1px 6px;
    white-space: nowrap;
}
```

- [ ] **Step 3: Write the failing test for the pure `hasResolvedData` helper**

```typescript
// src/hooks/useVelocityColorRange.test.ts
import { hasResolvedData } from './useVelocityColorRange';

describe('hasResolvedData', () => {
  it('is false when no section has data yet', () => {
    expect(hasResolvedData([null])).toBe(false);
  });

  it('is false when a section has data but every value is null (e.g. every station unchecked)', () => {
    expect(hasResolvedData([[null, null]])).toBe(false);
  });

  it('is true once at least one section has a resolved value, even if that value is 0', () => {
    expect(hasResolvedData([[null], [0, 1.2]])).toBe(true);
  });

  it('is true when the only section with data has a single 0 value (all-dry-bank cross-section)', () => {
    expect(hasResolvedData([[0, 0, 0]])).toBe(true);
  });
});
```

- [ ] **Step 4: Run it to confirm it fails**

Run: `npx jest src/hooks/useVelocityColorRange.test.ts`
Expected: FAIL — module doesn't export `hasResolvedData`.

- [ ] **Step 5: Add `hasResolvedData` and wire it into the hook**

In `src/hooks/useVelocityColorRange.ts`, `getGlobalMagnitudes`'s `min`/`max` alone can't distinguish "no data yet" from "real data whose min/max both happen to be 0" (a dry-bank-only cross-section is legitimately all zero) — add a small pure export, alongside the hook, that resolves this from `resolvedPerSection` directly:

```typescript
/**
 * True once at least one section has at least one resolved (non-null)
 * velocity. Exported and pure so it's unit-testable in isolation — unlike
 * min/max (via getGlobalMagnitudes), a station's real value can legitimately
 * be 0, so "min === 0 && max === 0" can't be used to mean "no data yet".
 */
export const hasResolvedData = (resolvedPerSection: ((number | null)[] | null)[]): boolean =>
  resolvedPerSection.some((arr) => arr !== null && arr.some((v) => v !== null));
```

Then, inside `useVelocityColorRange`, replace the final `return useMemo(...)` block:

```typescript
  return useMemo(() => {
    if (colorbarLimits.default === false) {
      return { min: colorbarLimits.min as number, max: colorbarLimits.max as number };
    }
    return { min: dataMin, max: dataMax };
  }, [colorbarLimits.default, colorbarLimits.min, colorbarLimits.max, dataMin, dataMax]);
```

with:

```typescript
  const hasData = useMemo(() => hasResolvedData(resolvedPerSection), [resolvedPerSection]);

  return useMemo(() => {
    if (colorbarLimits.default === false) {
      return { min: colorbarLimits.min as number, max: colorbarLimits.max as number, hasData };
    }
    return { min: dataMin, max: dataMax, hasData };
  }, [colorbarLimits.default, colorbarLimits.min, colorbarLimits.max, dataMin, dataMax, hasData]);
```

and update the function's return-type annotation at its declaration (`export const useVelocityColorRange = (): { min: number; max: number } =>`) to `: { min: number; max: number; hasData: boolean } =>`.

- [ ] **Step 6: Run the test to confirm it passes**

Run: `npx jest src/hooks/useVelocityColorRange.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 7: Hide the Results colour bar until there's data**

In `src/components/ImageResults.tsx`, the hook call already exists — just destructure and guard with the new field:

```typescript
  const { min, max, hasData } = useVelocityColorRange();
```

```typescript
      {isReport === false && hasData && <ColorBar min={min} max={max} />}
```

(This is the exact "0.00 – 0.00" bug the audit calls out by name — `ImageResults.tsx` was the one call site with no data guard at all; `ImageWithData.tsx` already checks `data.length !== 0` and `ImageProcessing.tsx` already checks `min !== undefined && max !== undefined`/`stiMin !== null && stiMax !== null`, so neither needs a change here.)

- [ ] **Step 8: Manual check**

Run `npm run dev`, open a fresh project, go to Results before running any analysis (or a section that hasn't been run) — confirm no colour bar / "0.00 – 0.00 m/s" appears. Run an analysis, return to Results, confirm the bar now appears with the real range, the *Manual* badge only shows after editing the min/max fields, and the reset button uses the same rotate-arrow icon as the mask toolbar's Undo.

- [ ] **Step 9: Run the full suite**

Run: `npm test`
Expected: 42 suites / 445 tests passing (4 new `useVelocityColorRange` tests).

- [ ] **Step 10: Commit**

```bash
git add src/components/ColorBar.tsx src/components/components.css src/hooks/useVelocityColorRange.ts src/hooks/useVelocityColorRange.test.ts src/components/ImageResults.tsx
git commit -m "Colour bar: Manual label, shared reset icon, hide until data exists"
```

---

## Task 10: Final review pass — full walkthrough, typecheck/lint baselines, commit

**Files:** none new — verification only.

- [ ] **Step 1: Full typecheck baseline**

Run: `npx tsc --noEmit -p tsconfig.tmp-check.json 2>&1 | grep -c "error TS"` (create the scratch tsconfig the same way Phase 4a Task 2 did, delete it after)
Expected: 64 (the pre-existing baseline from every prior phase — unchanged; report the actual count and stop to investigate before continuing if it differs).

- [ ] **Step 2: Full lint baseline**

Run: `npm run lint 2>&1 | tail -30` (or this project's equivalent lint script — match whatever Phase 4a's own final task used)
Expected: the pre-Phase-4b baseline problem count, unchanged (24, per Phase 4a's ending state, unless a later phase already moved it — check the latest `[[ui-redesign-progress]]` memory entry for the current number before comparing).

- [ ] **Step 3: Full test suite**

Run: `npm test`
Expected: 42 suites / 445 tests passing, 0 failing.

- [ ] **Step 4: Manual full walkthrough**

Run `npm run dev`. Walk through, in all three themes (dark/light/dracula per `[[feedback_ui_three_themes]]`):

- **Cross Sections:** draw a mask (white hatch/dimmed fill/square handles/halo strokes), use all three toolbar buttons (Undo point, Delete, Done), confirm a mask next to a red L pin no longer reads as "left bank."
- **Video Range:** enable stabilization, add two regions, confirm the active region is accent-coloured with a numbered badge and the existing "1 of 2 minimum" mode hint (from Phase 4a) still appears.
- **Processing:** with a run STIV analysis (including one manually tuned station), confirm search lines show preview/run/tuned/hover states correctly and hovering a line (or a Grid row) is now bidirectionally synced; confirm the colour bar's hover marker tracks the mouse.
- **Results:** confirm the colour bar is hidden until there's data, shows the *Manual* badge and shared reset icon once limits are edited, and is hidden again after Reset.

- [ ] **Step 5: Commit (only if the walkthrough surfaced fixes)**

```bash
git add -A
git commit -m "Phase 4b final review: fix walkthrough findings"
```

(Skip this step entirely if the walkthrough found nothing to fix — don't create an empty commit.)

---

## Self-review notes

- **Spec coverage:** all four comparison-table rows (masks, regions, search lines, colour bar) and both numbered findings (masks-red, search-lines-static) have a task; the colour-bar numbered finding's four sub-claims (editable-look, hover marker, Manual label, hidden-until-data, icon set) are split across Tasks 8–9 by risk/complexity, all covered.
- **Placeholder scan:** no TBD/"add appropriate handling"/deferred-without-explanation steps; the one deliberate scope-narrowing (Task 8's marker being mouse-over-the-bar rather than `hoveredStation`-synced) is explained with a concrete reason (four call sites with incompatible data ranges), not left vague.
- **Type consistency:** `getSearchLineVisual`'s `SearchLineVisual`/`SearchLineColors`/`SearchLineStateInput` types are used identically in Task 6's tests and Task 7's call site; `popLastMaskPoint`/`MaskToolbar`'s prop names match between Task 4's helper, component, and `DrawMask.tsx`/`ImageCrossSections.tsx` wiring; `useVelocityColorRange`'s new `hasData` field name matches between Task 9's hook change and its `ImageResults.tsx` consumer.

## Deferred / explicitly out of scope

- **The mockup's "click the first point to close a mask" ring/gesture** — illustrative in the audit's specimen figure only, not in the Today/Proposed comparison table used to scope this plan's tasks, and not an existing real interaction (`drawMask.ts` has no "close on first-point click" handler today). Matches Phase 4a's own precedent of not inventing behavior a mockup merely illustrates (see that plan's "STIV model weights not found" note).
- **Colour-bar hover marker synced to `hoveredStation`** (Task 8's scoping decision) — a real app-wide hover-sync extension, not specified closely enough by the audit to plan safely across all four `ColorBar` call sites' differing data ranges; flag to the product owner as a possible follow-up once Task 7's search-line hover has been used in practice.
- **12-language translation entries** for this plan's new `defaultValue`-backed keys (`CrossSections.undoPoint`, `CrossSections.deleteMask`, `CrossSections.confirmMask`, `Processing.colorbarManual`, `Processing.colorbarReset`) — deferred to the translation team, matching every prior phase.
- **4c (Results panel: crosshair, pinnable station tag, expandable technique rows) and 4d (step progress, advanced-mode persistence)** — separate plans, per the phase-4 brainstorming split recorded in 4a's own "Deferred" section.
