# UI Design Refresh Phase 4c — Results crosshair, pinnable station tag, expandable technique rows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify hover across the canvas/charts/Grid on Results, complete the crosshair across all three mini-charts, replace both of today's tooltips with one docked pinnable station tag (with spread and quality), and turn the technique rows' cramped σ/%/Q glyphs into independently expandable, written-label controls with a per-technique total.

**Architecture:** `uiSlice.hoveredStation` (already shared by charts and Grid) gains a canvas producer and a new `pinnedStation` counterpart; `dischargeSvg.ts`/`velocitySvg.ts`/`bathimetrySvg.ts` each draw their own hover guide line instead of one bleeding across a shared SVG; a new pure `stationTagContent.ts` builder feeds a new `StationTag` React component that replaces both of today's D3-appended tooltip divs; `TechniqueLegend.tsx` gains local per-technique expand state and a written-label body.

**Tech Stack:** React, Redux Toolkit, D3 (imperative chart/canvas drawing), TypeScript, Jest (`testEnvironment: "node"` — no DOM/React rendering in tests; only pure-logic modules are unit-tested), react-i18next, react-icons/lu.

**Spec:** `gui/docs/superpowers/specs/2026-09-18-ui-design-refresh-phase-4c-design.md`

## Global Constraints

- No `Co-Authored-By` or other attribution trailer on any commit (project convention, `river-git` skill).
- New copy uses `t(key, { defaultValue: '...' })` only — no edits to the actual locale JSON files; translation entries are deferred to the translation team, matching every prior phase.
- No new test infrastructure: this codebase's Jest config is `testEnvironment: "node"` with no `@testing-library/react` and no `.test.tsx` files anywhere. Automated tests are pure-logic `.test.ts` files only (no DOM, no component rendering). Every interactive change (click-to-pin, expand/collapse, D3 draw calls) gets a **Manual check-in** step instead of an automated test — this matches the existing convention, not a gap introduced by this plan.
- Baseline to preserve, confirm at the start of Task 1 and re-confirm at the end of the final task: run `npx jest`, `npx tsc --noEmit`, `npm run lint` and record the counts (last known, at tip `d9d2989`: ~445 tests passing, 64 pre-existing `tsc` errors, ~20 lint problems). No task may add new `tsc` errors or lint problems, or reduce the passing test count.
- Follow existing per-file conventions exactly: CSS custom properties (`var(--accent-color)`, `var(--background-color)`, `var(--status-fair)`, `var(--secondary-text-color)`, ...), the `technique-swatch technique-swatch-${key}` marker convention, and the `getEffectiveTechniqueData(data, technique, options)` helper for anything discharge/velocity-derived — never re-derive discharge/velocity math locally.
- Commit after every task (and after every fix wave in the final task), with a concise imperative message — no trailing metadata.

---

## Task 1: `pinnedStation` in `uiSlice`

**Files:**
- Modify: `src/store/ui/types.ts`
- Modify: `src/store/ui/uiSlice.ts`
- Modify: `src/store/ui/uiSlice.test.ts`
- Modify: `src/hooks/useUiSlice.ts`

**Interfaces:**
- Produces: `UIState.pinnedStation: number | null`; actions `setPinnedStation(payload: number | null)`, `toggleStationPin(payload: number)`; hook methods `onPinStation(index: number): void` (toggles — pinning an already-pinned index unpins), `onUnpinStation(): void` (always clears). Later tasks call these from the canvas, the chart hover overlay, the Grid, and `StationTag`'s own pin button.

- [ ] **Step 1: Add `pinnedStation` to `UIState`**

In `src/store/ui/types.ts`, add the field next to `hoveredStation`:

```ts
  hoveredStation: number | null;
  /** Set by clicking a station (canvas chevron, chart position, or Grid row) —
   *  survives the pointer moving away so a user can toggle technique layers
   *  without losing the detail view. Clicking the same station again, or the
   *  station tag's own pin button, clears it. */
  pinnedStation: number | null;
```

- [ ] **Step 2: Write the failing reducer tests**

In `src/store/ui/uiSlice.test.ts`, add `pinnedStation: null` to `baseState`'s literal (next to `hoveredStation: null,`), add the two new action imports to the top `import` block, and add:

```ts
describe('pinnedStation', () => {
  it('pins a station from null', () => {
    const state = reducer(baseState(), toggleStationPin(3));
    expect(state.pinnedStation).toBe(3);
  });

  it('unpins when the same station is toggled again', () => {
    const pinned = baseState({ pinnedStation: 3 });
    expect(reducer(pinned, toggleStationPin(3)).pinnedStation).toBeNull();
  });

  it('switches the pin to a different station', () => {
    const pinned = baseState({ pinnedStation: 3 });
    expect(reducer(pinned, toggleStationPin(7)).pinnedStation).toBe(7);
  });

  it('setPinnedStation(null) always clears, regardless of toggle parity', () => {
    const pinned = baseState({ pinnedStation: 3 });
    expect(reducer(pinned, setPinnedStation(null)).pinnedStation).toBeNull();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx jest src/store/ui/uiSlice.test.ts`
Expected: FAIL — `toggleStationPin`/`setPinnedStation` are not exported yet.

- [ ] **Step 4: Implement the reducers**

In `src/store/ui/uiSlice.ts`, add `pinnedStation: null,` to `initialState` (next to `hoveredStation: null,`), and add two reducers next to `setHoveredStation`:

```ts
    setPinnedStation: (state, action: PayloadAction<number | null>) => {
      state.pinnedStation = action.payload;
    },
    toggleStationPin: (state, action: PayloadAction<number>) => {
      state.pinnedStation = state.pinnedStation === action.payload ? null : action.payload;
    },
```

Add both to the `export const { ... }` list at the bottom of the file.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/store/ui/uiSlice.test.ts`
Expected: PASS, all tests including the four new ones.

- [ ] **Step 6: Expose the hook methods**

In `src/hooks/useUiSlice.ts`, add `setPinnedStation, toggleStationPin` to the import from `'../store/ui/uiSlice'`, add `pinnedStation` to the `useSelector` destructure, and add next to `onSetHoveredStation`:

```ts
  /**
   * Pins the station tag to a station so it survives the pointer moving
   * away — clicking an already-pinned station unpins it. Triggered from the
   * canvas chevrons, the chart hover overlay, and a Grid row (StationTag.tsx).
   */
  const onPinStation = (index: number) => {
    dispatch(toggleStationPin(index));
  };

  /** Explicit unpin, used by the station tag's own pin button. */
  const onUnpinStation = () => {
    dispatch(setPinnedStation(null));
  };
```

Add `pinnedStation,` to the returned ATTRIBUTES block and `onPinStation, onUnpinStation,` to the returned METHODS block.

- [ ] **Step 7: Run the full suite**

Run: `npx jest`
Expected: no new failures; test count increases by 4.

- [ ] **Step 8: Commit**

```bash
git add src/store/ui/types.ts src/store/ui/uiSlice.ts src/store/ui/uiSlice.test.ts src/hooks/useUiSlice.ts
git commit -m "Add pinnedStation to uiSlice, with a toggle-pin action"
```

---

## Task 2: Extract the shared `isLowConfidence` predicate

**Files:**
- Create: `src/helpers/lowConfidence.ts`
- Test: `src/helpers/lowConfidence.test.ts`
- Modify: `src/helpers/index.ts`
- Modify: `src/components/StationSearchLines.tsx`

**Interfaces:**
- Produces: `isLowConfidence(v: number | null | undefined, sigma: number | null | undefined): boolean`, re-exported from `../helpers`. Used by Task 8's `stationTagContent.ts` for the STIV quality column, and by `StationSearchLines.tsx` (already had an identical local copy).

This is a pre-existing duplication (the same check lives, byte-for-byte, in `Carousel.tsx` and `StationSearchLines.tsx`) that the station tag needs a third copy of — worth sharing now rather than adding a fourth. `Carousel.tsx`'s own copy is left untouched (unrelated call site, not blocking this phase).

- [ ] **Step 1: Write the failing test**

Create `src/helpers/lowConfidence.test.ts`:

```ts
import { isLowConfidence } from './lowConfidence';

describe('isLowConfidence', () => {
  it('is true when sigma exceeds the velocity magnitude', () => {
    expect(isLowConfidence(0.3, 0.5)).toBe(true);
    expect(isLowConfidence(-0.3, 0.5)).toBe(true);
  });

  it('is false when sigma is below the velocity magnitude', () => {
    expect(isLowConfidence(1.1, 0.2)).toBe(false);
  });

  it('is false for a dry-bank station (v === 0) even if sigma sits at its floor', () => {
    expect(isLowConfidence(0, 0.05)).toBe(false);
  });

  it('is false when either value is null or undefined', () => {
    expect(isLowConfidence(null, 0.5)).toBe(false);
    expect(isLowConfidence(0.3, null)).toBe(false);
    expect(isLowConfidence(undefined, undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/lowConfidence.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement it**

Create `src/helpers/lowConfidence.ts`:

```ts
/**
 * A station counts as STIV low-confidence when its raw uncertainty exceeds
 * its raw velocity magnitude — mirrors Carousel.tsx's own inline check
 * exactly. A dry-bank station has v = 0 and sigma at its floor, which would
 * otherwise satisfy `sigma > |v|` while meaning nothing, hence the
 * `v !== 0` guard.
 */
export const isLowConfidence = (v: number | null | undefined, sigma: number | null | undefined): boolean =>
  v !== null && v !== undefined && v !== 0 && sigma !== null && sigma !== undefined && sigma > Math.abs(v);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/helpers/lowConfidence.test.ts`
Expected: PASS.

- [ ] **Step 5: Re-export it from the helpers barrel**

In `src/helpers/index.ts`, add near the other single-file imports:

```ts
import { isLowConfidence } from './lowConfidence';
```

In the `export { ... }` list, insert `isLowConfidence,` alphabetically between `isAnglePoorlyConstrained,` and `isStationTuned,`:

```ts
  isAnglePoorlyConstrained,
  isLowConfidence,
  isStationTuned,
```

- [ ] **Step 6: Rewire `StationSearchLines.tsx` to the shared copy**

In `src/components/StationSearchLines.tsx`, delete the local definition and its doc comment:

```ts
/** Mirrors Carousel.tsx's lowConfidence check exactly: a dry-bank station has
 *  v = 0 and sigma at its floor, which would otherwise satisfy sigma > |v|
 *  while meaning nothing. */
const isLowConfidence = (v: number | null | undefined, sigma: number | null | undefined): boolean =>
  v !== null && v !== undefined && v !== 0 && sigma !== null && sigma !== undefined && sigma > Math.abs(v);
```

Add `isLowConfidence` to the existing import from `'../helpers'`:

```ts
import {
  computeStationSearchLines,
  computeSearchLinesFromCenters,
  getStiColorScale,
  isLowConfidence,
  isStationTuned,
} from '../helpers';
```

- [ ] **Step 7: Run the full suite**

Run: `npx jest`
Expected: no new failures; test count increases by 4. `StationSearchLines.tsx`'s own existing behaviour is unchanged (same predicate, same call site).

- [ ] **Step 8: Commit**

```bash
git add src/helpers/lowConfidence.ts src/helpers/lowConfidence.test.ts src/helpers/index.ts src/components/StationSearchLines.tsx
git commit -m "Share the STIV low-confidence predicate instead of duplicating it"
```

---

## Task 3: `stationBadgeGeometry.ts` — pure geometry for the canvas hover badge

**Files:**
- Create: `src/components/Graphs/stationBadgeGeometry.ts`
- Test: `src/components/Graphs/stationBadgeGeometry.test.ts`

**Interfaces:**
- Produces: `getStationBadgeGeometry(center: Point): StationBadgeGeometry` where `StationBadgeGeometry = { circle: { cx: number; cy: number; r: number }; label: Point }`. Consumed by Task 4's `drawVectors.ts`.
- Mirrors this codebase's existing split (`pinGeometry.ts` + `drawPin.ts`, `magnifierGeometry.ts` + `drawMagnifier.ts`): the pure geometry gets a unit test, the D3 mutation that consumes it does not (there is no DOM test harness in this project — see Global Constraints).

Visually this reuses the existing "numbered chip on canvas" language already established by `StabilizationCanvas.tsx`'s `RegionBadge` (dark-filled circle, accent-coloured stroke ring, white number centred inside) rather than the audit mockup's separate halo-ring-plus-pill-label — one circle is simpler, consistent with what's already on screen elsewhere in this app, and communicates the same thing.

- [ ] **Step 1: Write the failing test**

Create `src/components/Graphs/stationBadgeGeometry.test.ts`:

```ts
import { getStationBadgeGeometry, STATION_BADGE_BASE } from './stationBadgeGeometry';

describe('getStationBadgeGeometry', () => {
  it('centres the circle on the given point with the fixed radius', () => {
    const geo = getStationBadgeGeometry({ x: 100, y: 50 });
    expect(geo.circle).toEqual({ cx: 100, cy: 50, r: STATION_BADGE_BASE.RADIUS });
  });

  it('centres the label on the point, nudged for alphabetic baseline', () => {
    const geo = getStationBadgeGeometry({ x: 100, y: 50 });
    expect(geo.label).toEqual({ x: 100, y: 50 + STATION_BADGE_BASE.LABEL_Y_NUDGE });
  });

  it('tracks a different centre point', () => {
    const geo = getStationBadgeGeometry({ x: -20, y: 300 });
    expect(geo.circle.cx).toBe(-20);
    expect(geo.circle.cy).toBe(300);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/components/Graphs/stationBadgeGeometry.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement it**

Create `src/components/Graphs/stationBadgeGeometry.ts`:

```ts
import { Point } from '../../types';

/** Fixed dimensions for the hovered-station badge drawn on the canvas —
 *  same visual language as StabilizationCanvas.tsx's RegionBadge (dark-filled
 *  circle, accent stroke, white number), sized a little larger since chevrons
 *  are smaller targets than region corner handles. */
export const STATION_BADGE_BASE = {
  RADIUS: 15,
  RING_WIDTH: 2,
  LABEL_Y_NUDGE: 4.5, // no dominant-baseline set, so alphabetic text needs this to look centred
};

export interface StationBadgeGeometry {
  circle: { cx: number; cy: number; r: number };
  label: Point;
}

/** Computes the badge's circle and label position from the station's exact
 *  screen point (the chevron's base — the real station location, always
 *  defined even at zero velocity, unlike the chevron tip). */
export const getStationBadgeGeometry = (center: Point): StationBadgeGeometry => ({
  circle: { cx: center.x, cy: center.y, r: STATION_BADGE_BASE.RADIUS },
  label: { x: center.x, y: center.y + STATION_BADGE_BASE.LABEL_Y_NUDGE },
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/components/Graphs/stationBadgeGeometry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Graphs/stationBadgeGeometry.ts src/components/Graphs/stationBadgeGeometry.test.ts
git commit -m "Add pure geometry for the canvas hover-station badge"
```

---

## Task 4: Canvas hover joins `uiSlice`; click pins; draw the station badge

**Files:**
- Modify: `src/components/Graphs/VelocityVector.tsx`
- Modify: `src/components/Graphs/drawVectors.ts`

**Interfaces:**
- Consumes: `useUiSlice().hoveredStation/onSetHoveredStation/onPinStation` (Task 1), `getStationBadgeGeometry` (Task 3).
- Produces: `drawVectors`'s hover/pin callbacks now flow through the same `uiSlice.hoveredStation`/`pinnedStation` every other producer uses — no change to its exported name or the caller's per-section loop shape.

This removes `VelocityVector.tsx`'s own local hover state and `drawVectors.ts`'s own `#vectors-tooltip`. Between this task and Task 9 (which adds `StationTag`), hovering a canvas chevron shows no tooltip at all — a deliberate, temporary gap: keeping the old velocity-only tooltip pointed at a *different* hover concept than the one the rest of the panel now shares would be actively wrong, not just incomplete.

- [ ] **Step 1: Drop `VelocityVector.tsx`'s local hover state**

In `src/components/Graphs/VelocityVector.tsx`, change:

```ts
  const { seeAll } = useUiSlice();
```

to:

```ts
  const { seeAll, hoveredStation, onSetHoveredStation, onPinStation } = useUiSlice();
```

Delete this block entirely (it defined the now-redundant local state):

```ts
  // Hover lives here, not as a DOM mutation inside drawVectors: the draw
  // effect below tears down and rebuilds every polygon on each animation
  // frame, so any opacity change written directly onto a polygon is gone by
  // the next frame. Keeping it as state means the next draw (triggered by
  // this very state change, see the dependency array below) renders the
  // hovered station's chevrons at full opacity instead.
  // (Unrelated to the `hoveredStation` in the ui slice used for chart/grid
  // sync — this one is local to the image overlay.)
  const [hoveredStation, setHoveredStation] = useState<number | null>(null);
```

Also delete the three tooltip-defensive-recovery `useEffect`s right below it (the ones that hide `#vectors-tooltip`) — they manage a tooltip element this task removes from `drawVectors.ts` in Step 3:

```ts
  // Defensive recovery for a stuck tooltip: ...
  useEffect(() => {
    if (hoveredStation === null) {
      d3.select<HTMLDivElement, unknown>('#vectors-tooltip').style('opacity', 0);
    }
  }, [hoveredStation]);

  // A tooltip must never survive a genuine context change ...
  useEffect(() => {
    d3.select<HTMLDivElement, unknown>('#vectors-tooltip').style('opacity', 0);
  }, [activeSection, seeAll, sectionIndex]);

  // Unmount-only hide, so the tooltip node appended to <body> can never
  // outlive this component.
  useEffect(() => {
    return () => {
      d3.select<HTMLDivElement, unknown>('#vectors-tooltip').style('opacity', 0);
    };
  }, []);
```

`useState` may now be an unused import if nothing else in the file uses it — check the rest of the file (the animation `phase` state at `const [phase, setPhase] = useState(0);` still uses it) and leave the import as-is.

- [ ] **Step 2: Pass the shared hover/pin through to `drawVectors`**

In both `drawVectors(...)` call sites inside the `sections.forEach` loop, replace the two arguments:

```ts
            hoveredStation,
            setHoveredStation,
```

with:

```ts
            hoveredStation,
            onSetHoveredStation,
            onPinStation,
```

(three arguments now, in that order — `onPinStation` is a new parameter `drawVectors` gains in Step 3). The draw effect's dependency array already lists `hoveredStation` at the end — no change needed there since the name is unchanged, only its source (Redux instead of local state).

- [ ] **Step 3: `drawVectors.ts` — new signature, drop the local tooltip, draw the badge**

Add the import at the top:

```ts
import { getStationBadgeGeometry } from './stationBadgeGeometry';
```

Remove these two now-unused imports:

```ts
import { getThemedHost } from '../../helpers/themedHost';
```

and remove `formatSignedVelocity` from the `chevronGlyph` import list (the list still needs `chevronCount, flowDirection, THICKNESS_FACTOR, WING_SPAN`).

Change the function signature's tail from:

```ts
  hoveredStation: number | null,
  onHoverStation: (station: number | null) => void,
  unitSistem?: string
) => {
```

to:

```ts
  hoveredStation: number | null,
  onHoverStation: (station: number | null) => void,
  onPinStation: (station: number) => void,
  unitSistem?: string
) => {
```

Delete the tooltip-creation block:

```ts
  // Tooltip: one lazily created node reused across renders. Styling comes from
  // the shared .velocity-readout class — the same one the PIV arrow tooltip and
  // the STI badge use — so the three cannot drift apart, and so the background
  // follows the theme (it is cream in light and #282a36 in dracula, not the dark
  // grey a hardcoded colour would pin it to).
  let tooltip = d3.select<HTMLDivElement, unknown>('#vectors-tooltip');
  if (tooltip.empty()) {
    tooltip = d3
      .select<HTMLDivElement, unknown>(getThemedHost() as HTMLDivElement)
      .append('div')
      .attr('id', 'vectors-tooltip')
      .attr('class', 'velocity-readout')
      .style('position', 'absolute')
      .style('top', '0px')
      .style('pointer-events', 'none')
      .style('opacity', '0');
  }
```

Replace the hit-area block:

```ts
    if (isReport === false && typeof factor === 'number') {
      // Hit area is the whole swept glyph, not the chevrons: chevrons move, so
      // hit-testing them would make the tooltip flicker as they slide out from
      // under the pointer.
      const hit = [place(0, hw), place(lengthM, hw), place(lengthM, -hw), place(0, -hw)];
      svg
        .append('polygon')
        .attr('points', hit.map((p) => `${p.x},${p.y}`).join(' '))
        .attr('fill', 'transparent')
        .attr('pointer-events', 'all')
        .classed(`section-${sectionIndex}`, true)
        .on('mouseover', function (event) {
          onHoverStation(i);
          tooltip.transition().duration(200).style('opacity', 1);
          tooltip
            .html(formatSignedVelocity(v, unitSistem === 'imperial'))
            .style('left', `${event.pageX}px`)
            .style('top', `${event.pageY}px`)
            .style('color', color)
            .style('z-index', 1000);
        })
        .on('mouseout', function () {
          onHoverStation(null);
          tooltip.transition().duration(300).style('opacity', 0);
        });
    }
```

with:

```ts
    if (isReport === false && typeof factor === 'number') {
      // Hit area is the whole swept glyph, not the chevrons: chevrons move, so
      // hit-testing them would make the highlight flicker as they slide out
      // from under the pointer. Hover and pin both key off the shared
      // uiSlice.hoveredStation/pinnedStation now — no tooltip of its own; the
      // docked StationTag (ImageResults.tsx) reads that same state.
      const hit = [place(0, hw), place(lengthM, hw), place(lengthM, -hw), place(0, -hw)];
      svg
        .append('polygon')
        .attr('points', hit.map((p) => `${p.x},${p.y}`).join(' '))
        .attr('fill', 'transparent')
        .attr('pointer-events', 'all')
        .style('cursor', 'pointer')
        .classed(`section-${sectionIndex}`, true)
        .on('mouseover', function () {
          onHoverStation(i);
        })
        .on('mouseout', function () {
          onHoverStation(null);
        })
        .on('click', function () {
          onPinStation(i);
        });
    }

    // Highlight: a badge at the hovered station's base point (the real
    // station location — always defined, unlike the tip, which collapses at
    // zero velocity). Drawn regardless of which of {canvas, chart, Grid} set
    // hoveredStation, since it now reads the one shared value.
    if (hoveredStation === i) {
      const geo = getStationBadgeGeometry(base);
      const badge = group.append('g').attr('class', 'station-badge').attr('pointer-events', 'none');
      badge
        .append('circle')
        .attr('cx', geo.circle.cx)
        .attr('cy', geo.circle.cy)
        .attr('r', geo.circle.r)
        .attr('fill', 'rgba(0, 0, 0, 0.6)')
        .attr('stroke', 'var(--accent-color)')
        .attr('stroke-width', 2);
      badge
        .append('text')
        .attr('x', geo.label.x)
        .attr('y', geo.label.y)
        .attr('text-anchor', 'middle')
        .attr('font-size', 12)
        .attr('font-weight', 700)
        .attr('fill', '#fff')
        .text(i + 1);
    }
```

The badge block sits after the hit-area block, both still inside the same `magnitude.forEach((v, i) => { ... })` loop (`group` and `base` are already in scope there from the existing chevron-drawing code above).

- [ ] **Step 4: Run the full suite**

Run: `npx jest`
Expected: no new failures (this task adds no new test files — `drawVectors.ts`/`VelocityVector.tsx` have no direct tests, matching the rest of this file family; see Global Constraints).

- [ ] **Step 5: Manual check-in**

Launch the app on the Results screen of a project with at least one completed technique. Hover a chevron on the canvas: confirm the same station highlights in the velocity chart (existing behaviour, now shared) and a dark circle with the station number appears at the chevron's base on the canvas. Hover a Grid row or a chart position instead: confirm the canvas badge now also appears there (this is new — previously the canvas never reacted to chart/Grid hover). Click a chevron: confirm nothing currently visible changes yet (the pin exists in Redux but nothing reads `pinnedStation` until Task 9) — check via Redux DevTools or a temporary `console.log` that `pinnedStation` toggles.

- [ ] **Step 6: Commit**

```bash
git add src/components/Graphs/VelocityVector.tsx src/components/Graphs/drawVectors.ts
git commit -m "Canvas hover/pin join the shared uiSlice station state; draw a hover badge"
```

---

## Task 5: Crosshair — discharge and velocity charts

**Files:**
- Modify: `src/components/Graphs/dischargeSvg.ts`
- Modify: `src/components/Graphs/velocitySvg.ts`

**Interfaces:**
- No signature change to either — both already accept `hoveredStation`.

- [ ] **Step 1: Discharge chart's own guide line**

In `src/components/Graphs/dischargeSvg.ts`, after the bars are appended (right after the closing `);` of the `.attr('opacity', (d) => { ... });` call that ends the `svg.selectAll('.bar')...` chain, and before the `// Label` comment), add:

```ts
  // ---- Crosshair: this chart's own segment of the vertical guide line,
  // drawn regardless of which of {chart, Grid, canvas} set hoveredStation.
  // Own bounds (margin.top..graphHeight), not shared with the other two
  // stacked charts — each of the three now draws exactly its own line. ----
  if (hoveredStation !== null && hoveredStation >= 0 && hoveredStation < distance.length) {
    svg
      .append('line')
      .attr('class', 'hover-guide-line')
      .attr('x1', xScale(distance[hoveredStation]))
      .attr('x2', xScale(distance[hoveredStation]))
      .attr('y1', margin.top)
      .attr('y2', graphHeight)
      .attr('stroke', 'var(--accent-color)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');
  }
```

- [ ] **Step 2: Rescope the velocity chart's guide line to its own third**

In `src/components/Graphs/velocitySvg.ts`, update the file's top doc comment — it currently reads (in part):

```ts
 * Hover/tooltip is NOT handled here — AllInOne.tsx owns one combined overlay + tooltip
 * spanning all three stacked panels (Q, velocity, stage), so there's a single hover
 * experience for the whole chart instead of a tooltip per panel.
```

Replace with:

```ts
 * Hover is driven by AllInOne.tsx's shared overlay (and, as of Phase 4c, the canvas
 * and Grid too, via uiSlice.hoveredStation) — this module only draws its own segment
 * of the crosshair and its own series markers; discharge and stage each draw their own
 * matching segment (dischargeSvg.ts/bathimetrySvg.ts) instead of relying on one line
 * bleeding across a shared SVG.
 */
```

Then change the guide-line block from:

```ts
  if (hoveredStation !== null && hoveredStation !== undefined) {
    const hoveredPoint = series[0]?.points.find((p) => p.i === hoveredStation);
    if (hoveredPoint) {
      svg
        .append('line')
        .attr('class', 'hover-guide-line')
        .attr('x1', xScale(hoveredPoint.x))
        .attr('x2', xScale(hoveredPoint.x))
        .attr('y1', margin.top)
        .attr('y2', graphHeight * 3 - margin.bottom)
        .attr('stroke', 'var(--accent-color)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3');
    }
  }
```

to:

```ts
  if (hoveredStation !== null && hoveredStation !== undefined) {
    const hoveredPoint = series[0]?.points.find((p) => p.i === hoveredStation);
    if (hoveredPoint) {
      svg
        .append('line')
        .attr('class', 'hover-guide-line')
        .attr('x1', xScale(hoveredPoint.x))
        .attr('x2', xScale(hoveredPoint.x))
        .attr('y1', graphHeight)
        .attr('y2', graphHeight * 2)
        .attr('stroke', 'var(--accent-color)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3');
    }
  }
```

- [ ] **Step 3: Run the full suite**

Run: `npx jest`
Expected: no new failures (no test files for either module).

- [ ] **Step 4: Manual check-in**

On Results, hover a station in the Grid. Confirm a dashed accent line now appears in the discharge chart (top third) as well as the velocity chart (middle third) — each stopping at its own chart's boundary rather than one line running the full height.

- [ ] **Step 5: Commit**

```bash
git add src/components/Graphs/dischargeSvg.ts src/components/Graphs/velocitySvg.ts
git commit -m "Give the discharge chart its own crosshair line; scope velocity's to its own third"
```

---

## Task 6: Crosshair — stage/bathymetry chart

**Files:**
- Modify: `src/components/Graphs/bathimetrySvg.ts`
- Modify: `src/components/Graphs/AllInOne.tsx`

**Interfaces:**
- Produces: `bathimetrySvg` gains three new optional props: `hoveredStation?: number | null`, `stationDistances?: number[]`, `stationStage?: (number | null)[]`.
- Consumes (from `AllInOne.tsx`): `hoveredStation` (already read there), `shiftedDistance`, `data.depth`, `level` (all already computed/read in the existing effect).

The bed-profile `data: Point[]` this module already receives is a dense line (hundreds of points), not one point per discharge station — so the hovered station's guide line and marker are positioned from the same per-station arrays the discharge/velocity charts use (`shiftedDistance`, and `level - depth[i]` for the stage value), passed in by the caller, not read off the bed-profile line itself.

- [ ] **Step 1: Add the new props and draw the guide line + marker**

In `src/components/Graphs/bathimetrySvg.ts`, add to `BathimetryChartProps`:

```ts
  /** Station currently hovered anywhere in the Results panel (chart, Grid,
   *  or canvas) — draws this chart's own segment of the crosshair plus a
   *  marker on the bed line at that station. Only meaningful in the
   *  xScaleAllInOne branch (this chart is never hover-aware standalone/report). */
  hoveredStation?: number | null;
  /** That station's x position, matching the shared xScale — same shifted
   *  distance the discharge/velocity charts use. */
  stationDistances?: number[];
  /** That station's stage (level − depth), pre-computed by the caller since
   *  this module only receives the dense bed-profile line, not per-station depth. */
  stationStage?: (number | null)[];
```

Add the same three to the destructured parameters:

```ts
export const bathimetrySvg = ({
  svgElement,
  data,
  level = 0,
  showLeftBank,
  leftBank,
  rightBank,
  xScaleAllInOne,
  sizes,
  isReport = false,
  x1Intersection,
  x2Intersection,
  wetSegments,
  unitSistem,
  hoveredStation,
  stationDistances,
  stationStage,
}: BathimetryChartProps) => {
```

Inside the `if (xScaleAllInOne && sizes) { ... }` branch, after the `translateX = marginAllInOne.left + GRAPHS.GRID_Y_OFFSET_ALL_IN_ONE;` line and before the branch's closing `}`, add:

```ts

    if (
      hoveredStation !== null &&
      hoveredStation !== undefined &&
      stationDistances &&
      stationStage &&
      stationDistances[hoveredStation] !== undefined &&
      typeof stationStage[hoveredStation] === 'number'
    ) {
      const hoveredX = stationDistances[hoveredStation];
      const hoveredY = stationStage[hoveredStation] as number;
      svg
        .append('line')
        .attr('class', 'hover-guide-line')
        .attr('x1', xScale(hoveredX))
        .attr('x2', xScale(hoveredX))
        .attr('y1', graphHeight * 2)
        .attr('y2', heightSizes - marginAllInOne.bottom)
        .attr('stroke', 'var(--accent-color)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3');
      svg
        .append('circle')
        .attr('class', 'hover-guide-marker')
        .attr('cx', xScale(hoveredX))
        .attr('cy', yScale(hoveredY))
        .attr('r', 4)
        .attr('fill', 'var(--accent-color)')
        .attr('stroke', 'var(--background-color)')
        .attr('stroke-width', 1.2);
    }
```

- [ ] **Step 2: Thread the new props from `AllInOne.tsx`**

In `src/components/Graphs/AllInOne.tsx`, change the `bathimetrySvg({ ... })` call from:

```ts
      bathimetrySvg({
        svgElement: svgRef.current,
        data: bathData,
        level,
        showLeftBank: false,
        sizes: { width, height, margin, graphHeight },
        xScaleAllInOne: xScale,
        isReport,
        unitSistem,
      });
```

to:

```ts
      bathimetrySvg({
        svgElement: svgRef.current,
        data: bathData,
        level,
        showLeftBank: false,
        sizes: { width, height, margin, graphHeight },
        xScaleAllInOne: xScale,
        isReport,
        unitSistem,
        hoveredStation,
        stationDistances: shiftedDistance,
        stationStage: shiftedDistance.map((_, i) => (level ?? 0) - data.depth[i]),
      });
```

- [ ] **Step 3: Run the full suite**

Run: `npx jest`
Expected: no new failures.

- [ ] **Step 4: Manual check-in**

On Results, hover a station. Confirm the stage/bathymetry chart (bottom third) now also shows the dashed accent line, stopping at its own boundary, plus a small filled circle on the bed-profile line at that station's stage value.

- [ ] **Step 5: Commit**

```bash
git add src/components/Graphs/bathimetrySvg.ts src/components/Graphs/AllInOne.tsx
git commit -m "Give the stage chart its own crosshair line and a hovered-station marker"
```

---

## Task 7: Pin from the chart and the Grid

**Files:**
- Modify: `src/components/Graphs/AllInOne.tsx`
- Modify: `src/components/Grid.tsx`

**Interfaces:**
- Consumes: `useUiSlice().onPinStation` (Task 1).

- [ ] **Step 1: `AllInOne.tsx` — factor the nearest-station lookup, add a click handler**

Add `onPinStation` to the `useUiSlice()` destructure:

```ts
  const { screenSizes, theme, language, hoveredStation, onSetHoveredStation, onPinStation } = useUiSlice();
```

Change the hover-overlay block from:

```ts
        svg
          .append('rect')
          .attr('class', 'chart-hover-overlay')
          .attr('x', margin.left)
          .attr('y', margin.top)
          .attr('width', Math.max(0, width - margin.left - margin.right))
          .attr('height', Math.max(0, height - margin.top - margin.bottom))
          .attr('fill', 'transparent')
          .style('cursor', 'crosshair')
          .on('mousemove', function (event) {
            const [mx] = d3.pointer(event, svg.node());
            const x0 = xScale.invert(mx);
            let idx = 0,
              best = Infinity;
            shiftedDistance.forEach((d, i) => {
              const diff = Math.abs(d - x0);
              if (diff < best) {
                best = diff;
                idx = i;
              }
            });
            onSetHoveredStation(idx);
            showTooltip(idx, event.clientX, event.clientY);
          })
          .on('mouseleave', () => {
            onSetHoveredStation(null);
            hideTooltip();
          });
```

to:

```ts
        const findNearestStation = (event: MouseEvent): number => {
          const [mx] = d3.pointer(event, svg.node());
          const x0 = xScale.invert(mx);
          let idx = 0;
          let best = Infinity;
          shiftedDistance.forEach((d, i) => {
            const diff = Math.abs(d - x0);
            if (diff < best) {
              best = diff;
              idx = i;
            }
          });
          return idx;
        };

        svg
          .append('rect')
          .attr('class', 'chart-hover-overlay')
          .attr('x', margin.left)
          .attr('y', margin.top)
          .attr('width', Math.max(0, width - margin.left - margin.right))
          .attr('height', Math.max(0, height - margin.top - margin.bottom))
          .attr('fill', 'transparent')
          .style('cursor', 'crosshair')
          .on('mousemove', function (event) {
            const idx = findNearestStation(event);
            onSetHoveredStation(idx);
            showTooltip(idx, event.clientX, event.clientY);
          })
          .on('mouseleave', () => {
            onSetHoveredStation(null);
            hideTooltip();
          })
          .on('click', function (event) {
            onPinStation(findNearestStation(event));
          });
```

(`showTooltip`/`hideTooltip` are still called here — Task 9 removes them along with the rest of the old tooltip machinery. This step only adds the click handler and removes the duplicated lookup.)

- [ ] **Step 2: `Grid.tsx` — click a row to pin it**

Add `onPinStation` to the `useUiSlice()` destructure:

```ts
  const { hoveredStation, onSetHoveredStation, onPinStation, onShowToast } = useUiSlice();
```

Change the custom row renderer from:

```tsx
          renderers={{
            renderRow: (key, props) => (
              <Row
                key={key}
                {...props}
                onMouseEnter={() => onRowMouseEnter(props.row.id)}
                onMouseLeave={onRowMouseLeave}
              />
            ),
          }}
```

to:

```tsx
          renderers={{
            renderRow: (key, props) => (
              <Row
                key={key}
                {...props}
                onMouseEnter={() => onRowMouseEnter(props.row.id)}
                onMouseLeave={onRowMouseLeave}
                onClick={() => onPinStation(props.row.id)}
              />
            ),
          }}
```

- [ ] **Step 3: Run the full suite**

Run: `npx jest`
Expected: no new failures.

- [ ] **Step 4: Manual check-in**

On Results, click a position in one of the charts: confirm `pinnedStation` toggles in Redux DevTools (nothing visible changes yet — Task 9 wires the display). Click a Grid row: confirm the same. Click the react-data-grid `<Row>` specifically — if `onClick` is not forwarded to the row's rendered DOM element by this version of `react-data-grid` (verify here), fall back to adding `onCellClick`'s existing `handleCellClick` to also call `onPinStation(row.id)` for any column key, not just `'select-row'`.

- [ ] **Step 5: Commit**

```bash
git add src/components/Graphs/AllInOne.tsx src/components/Grid.tsx
git commit -m "Pin a station by clicking it in the chart or the Grid"
```

---

## Task 8: `stationTagContent.ts` — pure content builder

**Files:**
- Create: `src/components/Graphs/stationTagContent.ts`
- Test: `src/components/Graphs/stationTagContent.test.ts`

**Interfaces:**
- Produces: `buildStationTagContent(params: StationTagParams): StationTagContent | null`, `StationTagContent`, `StationTagRow` — consumed by Task 9's `StationTag.tsx`.
- Consumes: `getEffectiveTechniqueData`, `isLowConfidence` (both from `../../helpers`).

- [ ] **Step 1: Write the failing tests**

Create `src/components/Graphs/stationTagContent.test.ts`:

```ts
import { buildStationTagContent } from './stationTagContent';
import type { SectionData } from '../../store/section/types';

const STEP = 1;
const FPS = 30;

/** Three stations, 10 m apart, flat 1 m depth. */
const baseData = (over?: Partial<SectionData>): SectionData =>
  ({
    distance: [0, 10, 20],
    depth: [1, 1, 1],
    check: [true, true, true],
    activeCheck: [true, true, true],
    streamwise_velocity_magnitude: [1, 2, 3],
    minus_std: [0.8, 1.7, 2.7],
    plus_std: [1.2, 2.3, 3.3],
    percentile_5th: [0.7, 1.6, 2.5],
    percentile_95th: [1.3, 2.4, 3.5],
    stiv_velocity_profile: [1.1, 0.05, 3.2],
    stiv_sigma_profile: [0.2, 0.5, 0.3],
    iwave_velocity_profile: [0.9, 1.9, 2.9],
    iwave_quality_profile: [0.5, 0.71, 0.9],
    showLspiv: true,
    showStiv: true,
    showIwave: true,
    ...over,
  }) as unknown as SectionData;

const opts = {
  activeTechnique: 'lspiv' as const,
  interpolated: false,
  artificialSeeding: false,
  alpha: 1,
  step: STEP,
  fps: FPS,
  level: 2,
  unitSistem: 'si',
};

describe('buildStationTagContent', () => {
  it('returns null for a station index out of range', () => {
    expect(buildStationTagContent({ data: baseData(), stationIndex: 5, ...opts })).toBeNull();
  });

  it('formats discharge with its share of the section total', () => {
    const content = buildStationTagContent({ data: baseData(), stationIndex: 1, ...opts });
    expect(content?.dischargeText).toMatch(/m³\/s/);
    expect(content?.dischargeText).toMatch(/%/);
  });

  it('formats depth and area from the station and its effective wetted area', () => {
    const content = buildStationTagContent({ data: baseData(), stationIndex: 0, ...opts });
    // W[0] = distance[1] - distance[0] = 10; depth[0] = 1 -> A[0] = 10
    expect(content?.depthAreaText).toBe('1.00 m · 10.00 m²');
  });

  it('formats stage from level minus depth', () => {
    const content = buildStationTagContent({ data: baseData(), stationIndex: 0, ...opts });
    expect(content?.stageText).toBe('1.00 m');
  });

  it('includes LSPIV std and percentile spread', () => {
    const content = buildStationTagContent({ data: baseData(), stationIndex: 0, ...opts });
    const lspivRow = content?.rows.find((r) => r.key === 'lspiv');
    expect(lspivRow?.spreadText).toContain('±0.200');
    expect(lspivRow?.spreadText).toContain('P5–95 0.700–1.300');
  });

  it('labels LSPIV quality by artificial seeding', () => {
    const seeded = buildStationTagContent({ data: baseData(), stationIndex: 0, ...opts, artificialSeeding: true });
    const unseeded = buildStationTagContent({ data: baseData(), stationIndex: 0, ...opts });
    expect(seeded?.rows.find((r) => r.key === 'lspiv')?.qualityText).toBe('seeded');
    expect(unseeded?.rows.find((r) => r.key === 'lspiv')?.qualityText).toBe('unseeded');
  });

  it('flags a STIV station as low confidence when sigma exceeds |v|', () => {
    // station 1: v = 0.05, sigma = 0.5
    const content = buildStationTagContent({ data: baseData(), stationIndex: 1, ...opts });
    const stivRow = content?.rows.find((r) => r.key === 'stiv');
    expect(stivRow?.qualityText).toBe('low confidence');
    expect(stivRow?.qualityWarn).toBe(true);
    expect(stivRow?.spreadText).toBe('±0.500');
  });

  it('does not flag a STIV station whose sigma is below |v|', () => {
    // station 0: v = 1.1, sigma = 0.2
    const content = buildStationTagContent({ data: baseData(), stationIndex: 0, ...opts });
    const stivRow = content?.rows.find((r) => r.key === 'stiv');
    expect(stivRow?.qualityText).toBe('—');
    expect(stivRow?.qualityWarn).toBe(false);
  });

  it('shows the iWave quality score with no spread', () => {
    const content = buildStationTagContent({ data: baseData(), stationIndex: 1, ...opts });
    const iwaveRow = content?.rows.find((r) => r.key === 'iwave');
    expect(iwaveRow?.qualityText).toBe('0.71');
    expect(iwaveRow?.spreadText).toBe('—');
  });

  it('excludes a hidden technique from the rows', () => {
    const content = buildStationTagContent({ data: baseData({ showStiv: false }), stationIndex: 0, ...opts });
    expect(content?.rows.find((r) => r.key === 'stiv')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/components/Graphs/stationTagContent.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement it**

Create `src/components/Graphs/stationTagContent.ts`:

```ts
import { SectionData, Technique } from '../../store/section/types';
import { getEffectiveTechniqueData, isLowConfidence } from '../../helpers';
import { UNIT_CONVERSIONS, UNITS } from '../../constants/constants';

const TECHNIQUE_ORDER: Technique[] = ['lspiv', 'stiv', 'iwave'];
const TECHNIQUE_LABEL: Record<Technique, string> = { lspiv: 'LSPIV', stiv: 'STIV', iwave: 'iWave' };

const visibilityField = (key: Technique): 'showLspiv' | 'showStiv' | 'showIwave' =>
  key === 'lspiv' ? 'showLspiv' : key === 'stiv' ? 'showStiv' : 'showIwave';

const hasTechniqueData = (data: SectionData, key: Technique): boolean =>
  key === 'lspiv' ? true : key === 'stiv' ? !!data.stiv_velocity_profile : !!data.iwave_velocity_profile;

export interface StationTagRow {
  key: Technique;
  label: string;
  velocityText: string;
  /** Uncertainty for this station: LSPIV's ± std plus its P5–95 range, STIV's
   *  ± sigma, or '—' for iWave (no per-station uncertainty measure exists). */
  spreadText: string;
  /** LSPIV: 'seeded'/'unseeded'. STIV: 'low confidence' or '—'. iWave: the
   *  quality score, or '—'. */
  qualityText: string;
  qualityWarn: boolean;
}

export interface StationTagContent {
  stationNumber: number;
  distanceText: string;
  dischargeText: string;
  depthAreaText: string;
  stageText: string;
  rows: StationTagRow[];
}

export interface StationTagParams {
  data: SectionData;
  stationIndex: number;
  activeTechnique: Technique;
  interpolated: boolean;
  artificialSeeding: boolean;
  alpha: number;
  step: number;
  fps: number;
  level?: number;
  unitSistem?: string;
}

/**
 * Builds every value the docked station tag shows for one station: today's
 * combined discharge/velocity/stage readout, plus depth/area, and — the
 * audit's own finding — spread (sigma / P5–95) and quality (seeded/unseeded,
 * STIV low confidence, iWave quality score) per technique. Pure: every value
 * is either already on SectionData or produced by getEffectiveTechniqueData,
 * so this has no DOM/D3 dependency and is fully unit-testable.
 */
export const buildStationTagContent = ({
  data,
  stationIndex,
  activeTechnique,
  interpolated,
  artificialSeeding,
  alpha,
  step,
  fps,
  level = 0,
  unitSistem = 'si',
}: StationTagParams): StationTagContent | null => {
  if (stationIndex < 0 || stationIndex >= data.distance.length) return null;

  const isImperial = unitSistem === 'imperial';
  const lengthFactor = isImperial ? UNIT_CONVERSIONS.M_TO_FT : 1;
  const areaFactor = lengthFactor * lengthFactor;
  const flowFactor = isImperial ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;
  const lengthUnit = isImperial ? UNITS.IMPERIAL.LONGITUDE : UNITS.SI.LONGITUDE;
  const areaUnit = isImperial ? UNITS.IMPERIAL.AREA : UNITS.SI.AREA;
  const flowUnit = isImperial ? UNITS.IMPERIAL.FLOW : UNITS.SI.FLOW;
  const velocityUnit = isImperial ? UNITS.IMPERIAL.VELOCITY : UNITS.SI.VELOCITY;

  const techOptions = { interpolated, artificialSeeding, alpha, step, fps };
  const activeEffective = getEffectiveTechniqueData(data, activeTechnique, techOptions);

  const qVal = activeEffective?.Q[stationIndex];
  const qShare = activeEffective?.Q_portion[stationIndex];
  const dischargeText =
    qVal !== undefined && qVal !== null
      ? `${(qVal * flowFactor).toFixed(3)} ${flowUnit}${
          qShare !== undefined && qShare !== null && isFinite(qShare) ? `  ·  ${(qShare * 100).toFixed(1)}%` : ''
        }`
      : '—';

  const depth = data.depth[stationIndex];
  const area = activeEffective?.A[stationIndex];
  const depthAreaText =
    typeof depth === 'number'
      ? `${(depth * lengthFactor).toFixed(2)} ${lengthUnit} · ${
          area !== undefined ? (area * areaFactor).toFixed(2) : '—'
        } ${areaUnit}`
      : '—';

  const stageText = typeof depth === 'number' ? `${((level - depth) * lengthFactor).toFixed(2)} ${lengthUnit}` : '—';

  const distanceText = `x ${(data.distance[stationIndex] * lengthFactor).toFixed(2)} ${lengthUnit}`;

  const rows: StationTagRow[] = TECHNIQUE_ORDER.filter(
    (key) => hasTechniqueData(data, key) && data[visibilityField(key)] !== false
  )
    .map((key): StationTagRow | null => {
      const effective = getEffectiveTechniqueData(data, key, techOptions);
      if (!effective) return null;
      const v = effective.resolved[stationIndex];
      const velocityText = v === null ? '—' : `${(v * lengthFactor).toFixed(3)} ${velocityUnit}`;

      if (key === 'lspiv') {
        const minus = data.minus_std[stationIndex];
        const plus = data.plus_std[stationIndex];
        const p5 = data.percentile_5th[stationIndex];
        const p95 = data.percentile_95th[stationIndex];
        const stdText =
          typeof minus === 'number' && typeof plus === 'number'
            ? `±${(((plus - minus) / 2) * lengthFactor).toFixed(3)}`
            : null;
        const pText =
          typeof p5 === 'number' && typeof p95 === 'number'
            ? `P5–95 ${(p5 * lengthFactor).toFixed(3)}–${(p95 * lengthFactor).toFixed(3)}`
            : null;
        return {
          key,
          label: TECHNIQUE_LABEL[key],
          velocityText,
          spreadText: [stdText, pText].filter(Boolean).join(' · ') || '—',
          qualityText: artificialSeeding ? 'seeded' : 'unseeded',
          qualityWarn: false,
        };
      }

      if (key === 'stiv') {
        const sigma = effective.sigma[stationIndex];
        const lowConf = isLowConfidence(data.stiv_velocity_profile?.[stationIndex], data.stiv_sigma_profile?.[stationIndex]);
        return {
          key,
          label: TECHNIQUE_LABEL[key],
          velocityText,
          spreadText: typeof sigma === 'number' ? `±${(sigma * lengthFactor).toFixed(3)}` : '—',
          qualityText: lowConf ? 'low confidence' : '—',
          qualityWarn: lowConf,
        };
      }

      const quality = data.iwave_quality_profile?.[stationIndex];
      return {
        key,
        label: TECHNIQUE_LABEL[key],
        velocityText,
        spreadText: '—',
        qualityText: typeof quality === 'number' ? quality.toFixed(2) : '—',
        qualityWarn: false,
      };
    })
    .filter((r): r is StationTagRow => r !== null);

  return {
    stationNumber: stationIndex + 1,
    distanceText,
    dischargeText,
    depthAreaText,
    stageText,
    rows,
  };
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/components/Graphs/stationTagContent.test.ts`
Expected: PASS, all 10 tests.

- [ ] **Step 5: Run the full suite**

Run: `npx jest`
Expected: no new failures; test count increases by 10.

- [ ] **Step 6: Commit**

```bash
git add src/components/Graphs/stationTagContent.ts src/components/Graphs/stationTagContent.test.ts
git commit -m "Add a pure content builder for the station tag"
```

---

## Task 9: `StationTag` component — replaces both old tooltips

**Files:**
- Create: `src/components/Graphs/StationTag.tsx`
- Modify: `src/components/Graphs/graphs.css`
- Modify: `src/components/ImageResults.tsx`
- Modify: `src/components/Graphs/AllInOne.tsx`

**Interfaces:**
- Consumes: `buildStationTagContent` (Task 8), `useUiSlice().hoveredStation/pinnedStation/onPinStation/onUnpinStation` (Task 1).

- [ ] **Step 1: Build the component**

Create `src/components/Graphs/StationTag.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { LuPin, LuPinOff } from 'react-icons/lu';
import { useProjectSlice, useSectionSlice, useUiSlice } from '../../hooks';
import { buildStationTagContent } from './stationTagContent';
import './graphs.css';

/**
 * Docked, pinnable readout for one station — replaces the old cursor-following
 * combined tooltip (AllInOne.tsx) and the canvas chevrons' own velocity-only
 * tooltip (drawVectors.ts) with a single card anchored over the canvas.
 * Shows whichever of {pinnedStation, hoveredStation} is set, preferring the
 * pinned one so toggling technique layers doesn't lose the detail view.
 */
export const StationTag = () => {
  const { t } = useTranslation();
  const { hoveredStation, pinnedStation, onPinStation, onUnpinStation } = useUiSlice();
  const { sections, activeSection } = useSectionSlice();
  const { video, projectDetails } = useProjectSlice();

  const section = sections[activeSection];
  const data = section?.data;
  const stationIndex = pinnedStation ?? hoveredStation;

  if (!data || stationIndex === null) return null;

  const content = buildStationTagContent({
    data,
    stationIndex,
    activeTechnique: section.activeTechnique,
    interpolated: section.interpolated,
    artificialSeeding: section.artificialSeeding,
    alpha: section.alpha,
    step: video.parameters.step,
    fps: video.data.fps,
    level: section.bathimetry.level,
    unitSistem: projectDetails.unitSistem,
  });

  if (!content) return null;

  const isPinned = pinnedStation !== null;

  return (
    <div className="station-tag">
      <div className="station-tag-header">
        <b>
          {t('Graphs.station')} {content.stationNumber}
        </b>
        <span>{content.distanceText}</span>
        <button
          type="button"
          className={`station-tag-pin-btn${isPinned ? ' station-tag-pin-btn-on' : ''}`}
          title={
            isPinned
              ? t('Results.unpinStation', { defaultValue: 'Unpin' })
              : t('Results.pinStation', { defaultValue: 'Click the station to pin' })
          }
          onClick={() => (isPinned ? onUnpinStation() : onPinStation(stationIndex))}
        >
          {isPinned ? <LuPinOff size={13} /> : <LuPin size={13} />}
        </button>
      </div>
      <div className="station-tag-kv">
        <span>{t('Graphs.discharge')}</span>
        <b>{content.dischargeText}</b>
        <span>{t('Results.depthArea', { defaultValue: 'Depth · area' })}</span>
        <b>{content.depthAreaText}</b>
        <span>{t('Graphs.stage')}</span>
        <b>{content.stageText}</b>
      </div>
      <div className="station-tag-table">
        {content.rows.map((row) => (
          <div className="station-tag-row" key={row.key}>
            <span
              className={`technique-swatch technique-swatch-${row.key}`}
              style={{ background: `var(--tech-${row.key})` }}
            />
            <span>{row.label}</span>
            <b>{row.velocityText}</b>
            <span>{row.spreadText}</span>
            <span className={row.qualityWarn ? 'station-tag-warn' : undefined}>{row.qualityText}</span>
          </div>
        ))}
      </div>
      <p className="station-tag-hint">
        {t('Results.stationTagHint', { defaultValue: 'Click the station to keep this open while you change layers' })}
      </p>
    </div>
  );
};
```

- [ ] **Step 2: CSS — remove the old tooltip block, add the station tag's**

In `src/components/Graphs/graphs.css`, replace the entire `UNIFIED HOVER TOOLTIP` section:

```css
/* =============================================================================
   UNIFIED HOVER TOOLTIP (velocity chart) — one card for Q + every visible velocity
   profile + stage, instead of a tooltip per series. RIVeR popup chrome (.ldrop spec).
   ============================================================================= */
.velocity-tooltip {
    position: fixed;
    display: none;
    min-width: 160px;
    padding: 9px 12px;
    border-radius: 12px;
    border: 1px solid var(--input-background);
    background: var(--secondary-background-color);
    box-shadow: 0 10px 32px rgba(0, 0, 0, 0.4);
    pointer-events: none;
    font-size: 12px;
    z-index: 200;
}

.velocity-tooltip-head {
    font-size: 10.5px;
    color: var(--secondary-text-color);
    font-weight: 600;
    margin-bottom: 6px;
    white-space: nowrap;
}

.velocity-tooltip-row {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 2px 0;
    white-space: nowrap;
}

.velocity-tooltip-row-active .velocity-tooltip-label,
.velocity-tooltip-row-active .velocity-tooltip-val {
    font-weight: 700;
}

.velocity-tooltip-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
}

.velocity-tooltip-label {
    flex: 1;
    color: var(--primary-text-color);
    font-weight: 500;
}

.velocity-tooltip-val {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: var(--primary-text-color);
    margin-left: 10px;
}
```

with:

```css
/* =============================================================================
   STATION TAG (Results canvas) — docked, pinnable readout for one station.
   Replaces the old cursor-following combined tooltip and the canvas chevrons'
   own velocity-only tooltip with a single card, per-technique spread/quality.
   ============================================================================= */
.station-tag {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 1000;
    min-width: 220px;
    max-width: 280px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--input-background);
    background: var(--secondary-background-color);
    box-shadow: 0 10px 32px rgba(0, 0, 0, 0.4);
    font-size: 12px;
}

.station-tag-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 6px;
    margin-bottom: 6px;
    border-bottom: 1px solid var(--input-background);
}

.station-tag-header b {
    font-size: 13.5px;
    white-space: nowrap;
}

.station-tag-header span {
    color: var(--secondary-text-color);
    flex: 1;
}

.station-tag-pin-btn {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--secondary-text-color);
    cursor: pointer;
    flex-shrink: 0;
}

.station-tag-pin-btn:hover {
    background: var(--input-background);
    color: var(--primary-text-color);
}

.station-tag-pin-btn-on {
    color: var(--accent-color);
}

.station-tag-kv {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px 10px;
    padding-bottom: 6px;
    margin-bottom: 6px;
    border-bottom: 1px solid var(--input-background);
}

.station-tag-kv span {
    color: var(--secondary-text-color);
}

.station-tag-kv b {
    text-align: right;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}

.station-tag-table {
    display: grid;
    gap: 4px;
}

.station-tag-row {
    display: grid;
    grid-template-columns: 12px auto 1fr auto auto;
    gap: 6px;
    align-items: center;
    white-space: nowrap;
}

.station-tag-row b {
    font-variant-numeric: tabular-nums;
    text-align: right;
}

.station-tag-row span {
    color: var(--secondary-text-color);
    font-size: 11px;
}

.station-tag-warn {
    color: var(--status-fair);
}

.station-tag-hint {
    margin: 7px 0 0;
    color: var(--muted-text-color, var(--secondary-text-color));
    font-size: 10.5px;
}
```

If `--muted-text-color` is not an existing token in `src/index.css`, drop that fallback pair and use `var(--secondary-text-color)` directly for `.station-tag-hint` — check before writing this rule.

- [ ] **Step 3: Mount it in `ImageResults.tsx`**

Add the import:

```ts
import { StationTag } from './Graphs/StationTag';
```

Change:

```tsx
      {/* Outside the zoomed element so the bar keeps its size and corner. */}
      {isReport === false && hasData && <ColorBar min={min} max={max} />}
```

to:

```tsx
      {/* Outside the zoomed element so the bar/tag keep their size and corner. */}
      {isReport === false && hasData && <ColorBar min={min} max={max} />}
      {isReport === false && <StationTag />}
```

- [ ] **Step 4: Remove `AllInOne.tsx`'s old tooltip machinery**

Delete the top-level `getOrCreateTooltip` function and its doc comment (lines near the top of the file, before the `AllInOne` component definition):

```ts
function getOrCreateTooltip(): d3.Selection<HTMLDivElement, unknown, HTMLElement, any> {
  let el = d3.select<HTMLDivElement, unknown>('.combined-chart-tooltip');
  if (el.empty()) {
    // Appended to the themed host, not <body>: the app's CSS custom properties
    // are declared on [data-theme] (a div inside body), so a tooltip parented to
    // body falls outside that scope and its var()-driven background and border
    // resolve to nothing. See helpers/themedHost.ts.
    el = d3
      .select(getThemedHost())
      .append('div')
      .attr('class', 'velocity-tooltip graph-tooltip-text combined-chart-tooltip') as any;
  }
  return el;
}
```

Remove the now-unused `getThemedHost` import if nothing else in the file uses it (check first — it should not).

Replace the entire `if (!isReport) { ... }` block (which currently declares `isImperial`/`velocityFactor`/`flowFactor`/`lengthFactor`/`unitLabel`/`flowUnit`/`lengthUnit`/`formatValue`/`tooltip`/`showTooltip`/`hideTooltip`, then the overlay `rect` from Task 7) with:

```ts
      if (!isReport) {
        const findNearestStation = (event: MouseEvent): number => {
          const [mx] = d3.pointer(event, svg.node());
          const x0 = xScale.invert(mx);
          let idx = 0;
          let best = Infinity;
          shiftedDistance.forEach((d, i) => {
            const diff = Math.abs(d - x0);
            if (diff < best) {
              best = diff;
              idx = i;
            }
          });
          return idx;
        };

        svg
          .append('rect')
          .attr('class', 'chart-hover-overlay')
          .attr('x', margin.left)
          .attr('y', margin.top)
          .attr('width', Math.max(0, width - margin.left - margin.right))
          .attr('height', Math.max(0, height - margin.top - margin.bottom))
          .attr('fill', 'transparent')
          .style('cursor', 'crosshair')
          .on('mousemove', function (event) {
            onSetHoveredStation(findNearestStation(event));
          })
          .on('mouseleave', () => {
            onSetHoveredStation(null);
          })
          .on('click', function (event) {
            onPinStation(findNearestStation(event));
          });
      }
```

- [ ] **Step 5: Run the full suite**

Run: `npx jest`
Expected: no new failures.

- [ ] **Step 6: Manual check-in**

On Results, in all three themes (dark/light/dracula): hover a chevron, a chart position, and a Grid row in turn — confirm the same docked card appears top-right over the canvas each time, showing discharge/share, depth·area, stage, and every visible technique's velocity/spread/quality (STIV's low-confidence text in the warning colour). Click a station: confirm the card's pin icon switches to "pinned" and the card survives moving the pointer elsewhere (still shows the pinned station) until you click the pin icon or the same station again. Confirm the old free-floating cursor-following tooltip is gone entirely (both on the canvas and on the charts).

- [ ] **Step 7: Commit**

```bash
git add src/components/Graphs/StationTag.tsx src/components/Graphs/graphs.css src/components/ImageResults.tsx src/components/Graphs/AllInOne.tsx
git commit -m "Add the docked, pinnable StationTag; remove both old tooltips"
```

---

## Task 10: Expandable technique rows, written labels, per-technique totals

**Files:**
- Modify: `src/components/Graphs/TechniqueLegend.tsx`
- Modify: `src/components/Graphs/graphs.css`

**Interfaces:**
- No change to `TechniqueRow.tsx` — it deliberately owns no interaction (per its own doc comment), so the disclosure button is one more of `TechniqueLegend`'s own children, and the expanded body is a sibling `<div>` rendered alongside `<TechniqueRow>`, not inside it.

- [ ] **Step 1: Rewrite `TechniqueLegend.tsx`**

Replace the file's contents with:

```tsx
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuChevronRight, LuEye, LuEyeOff } from 'react-icons/lu';
import { useProjectSlice, useSectionSlice } from '../../hooks';
import { getEffectiveTechniqueData } from '../../helpers';
import { UNIT_CONVERSIONS, UNITS } from '../../constants/constants';
import { Technique } from '../../store/section/types';
import { TechniqueRow } from '../TechniqueRow';
import './graphs.css';

const TECHNIQUES: { key: Technique; label: string }[] = [
  { key: 'lspiv', label: 'LSPIV' },
  { key: 'stiv', label: 'STIV' },
  { key: 'iwave', label: 'iWave' },
];

const visibilityField = (key: Technique): 'showLspiv' | 'showStiv' | 'showIwave' =>
  key === 'lspiv' ? 'showLspiv' : key === 'stiv' ? 'showStiv' : 'showIwave';

/**
 * One row per technique: click the name to make it active (drives VS/Q/interpolation/alpha
 * — goal 1); the eye icon toggles chart visibility independently (goal 2); the trailing
 * total is that technique's own discharge, always visible; the disclosure chevron expands
 * a written-label body (artificial seeding / uncertainty band / quality shading — goal 4),
 * replacing the old cramped single-letter glyphs. Each row's expanded state is independent
 * so two techniques' layer controls can be compared open at once.
 */
export const TechniqueLegend = () => {
  const { sections, activeSection, onSetActiveTechnique, onChangeDataValues, onUpdateSection } = useSectionSlice();
  const { video, projectDetails } = useProjectSlice();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Record<Technique, boolean>>({ lspiv: false, stiv: false, iwave: false });
  const section = sections[activeSection];
  const data = section?.data;

  if (!data) return null;

  const isImperial = projectDetails.unitSistem === 'imperial';
  const flowUnit = isImperial ? UNITS.IMPERIAL.FLOW : UNITS.SI.FLOW;
  const flowFactor = isImperial ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;
  const techOptions = {
    interpolated: section.interpolated,
    artificialSeeding: section.artificialSeeding,
    alpha: section.alpha,
    step: video.parameters.step,
    fps: video.data.fps,
  };

  const hasData = (key: Technique): boolean => {
    if (key === 'lspiv') return true;
    if (key === 'stiv') return !!data.stiv_velocity_profile;
    return !!data.iwave_velocity_profile;
  };

  const isVisible = (key: Technique): boolean => data[visibilityField(key)] !== false;

  const handleActivate = (key: Technique) => {
    if (!hasData(key) || key === section.activeTechnique) return;
    onSetActiveTechnique(key);
    if (!isVisible(key)) onChangeDataValues({ type: visibilityField(key) });
  };

  const handleToggleVisibility = (key: Technique) => {
    if (key === section.activeTechnique) return;
    onChangeDataValues({ type: visibilityField(key) });
  };

  const toggleExpanded = (key: Technique) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="technique-legend">
      {TECHNIQUES.filter((tech) => hasData(tech.key)).map(({ key, label }) => {
        const isActive = key === section.activeTechnique;
        const visible = isVisible(key);
        const color = `var(--tech-${key})`;
        const effective = getEffectiveTechniqueData(data, key, techOptions);
        const totalText = effective ? (effective.total_Q * flowFactor).toFixed(2) : '—';
        const isOpen = expanded[key];

        return (
          <Fragment key={key}>
            <TechniqueRow technique={key} active={isActive} hidden={!visible}>
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
              <span className="technique-row-total" title={`${totalText} ${flowUnit}`}>
                {totalText}
              </span>
              <button
                type="button"
                className="technique-eye-btn"
                disabled={isActive}
                title={
                  isActive
                    ? t('Results.cantHideActiveTechnique')
                    : t(visible ? 'Results.hideTechnique' : 'Results.showTechnique', { technique: label })
                }
                onClick={() => handleToggleVisibility(key)}
              >
                {visible ? <LuEye size={15} /> : <LuEyeOff size={15} />}
              </button>
              <button
                type="button"
                className={`technique-disclosure-btn${isOpen ? ' technique-disclosure-btn-open' : ''}`}
                aria-expanded={isOpen}
                aria-label={
                  isOpen
                    ? t('Results.collapseTechnique', { defaultValue: 'Collapse {{technique}} layers', technique: label })
                    : t('Results.expandTechnique', { defaultValue: 'Expand {{technique}} layers', technique: label })
                }
                onClick={() => toggleExpanded(key)}
              >
                <LuChevronRight size={15} />
              </button>
            </TechniqueRow>
            {isOpen && visible && (
              <div className="technique-row-body">
                {key === 'lspiv' && (
                  <button
                    type="button"
                    className={`technique-row-body-toggle${section.artificialSeeding ? ' technique-row-body-toggle-on' : ''}`}
                    aria-pressed={!!section.artificialSeeding}
                    onClick={() => onUpdateSection({ artificialSeeding: 'artificial-seeding' }, undefined)}
                  >
                    {t(section.artificialSeeding ? 'Results.seeded' : 'Results.unseeded')}
                  </button>
                )}
                {key === 'lspiv' && (
                  <>
                    <button
                      type="button"
                      className={`technique-row-body-toggle${data.showVelocityStd ? ' technique-row-body-toggle-on' : ''}`}
                      aria-pressed={!!data.showVelocityStd}
                      title={t('Results.showVelStd')}
                      onClick={() => onChangeDataValues({ type: 'showVelocityStd' })}
                    >
                      {t('Results.showVelStdLabel', { defaultValue: 'σ band' })}
                    </button>
                    <button
                      type="button"
                      className={`technique-row-body-toggle${data.showPercentile ? ' technique-row-body-toggle-on' : ''}`}
                      aria-pressed={!!data.showPercentile}
                      title={t('Results.showProfile')}
                      onClick={() => onChangeDataValues({ type: 'showPercentile' })}
                    >
                      {t('Results.showProfileLabel', { defaultValue: '5–95% band' })}
                    </button>
                  </>
                )}
                {key === 'stiv' && data.stiv_sigma_profile && (
                  <button
                    type="button"
                    className={`technique-row-body-toggle${data.showStivStd ? ' technique-row-body-toggle-on' : ''}`}
                    aria-pressed={!!data.showStivStd}
                    title={t('Results.showStivStd')}
                    onClick={() => onChangeDataValues({ type: 'showStivStd' })}
                  >
                    {t('Results.showStivStdLabel', { defaultValue: 'σ band' })}
                  </button>
                )}
                {key === 'iwave' && data.iwave_quality_profile && (
                  <button
                    type="button"
                    className={`technique-row-body-toggle${data.showIwaveQuality ? ' technique-row-body-toggle-on' : ''}`}
                    aria-pressed={!!data.showIwaveQuality}
                    title={t('Results.showIwaveQuality')}
                    onClick={() => onChangeDataValues({ type: 'showIwaveQuality' })}
                  >
                    {t('Results.showIwaveQualityLabel', { defaultValue: 'Quality shading' })}
                  </button>
                )}
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 2: CSS**

In `src/components/Graphs/graphs.css`, delete the now-unused rules (the collapsed row no longer renders these — the same controls now live in `.technique-row-body`):

```css
.technique-seed-flag {
    font-size: 11px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 8px;
    border: 1px solid var(--secondary-text-color);
    color: var(--secondary-text-color);
    white-space: nowrap;
    background: transparent;
    cursor: pointer;
    transition: background-color 0.14s ease;
}

.technique-seed-flag:hover {
    background: var(--input-background);
}

/* Seeded = normal/positive state, takes the theme accent color; unseeded stays a neutral
   gray above — it's an expected mode, not a warning. */
.technique-seed-flag-seeded {
    border-color: var(--accent-color);
    color: var(--accent-color);
}

.technique-band-glyphs {
    display: flex;
    gap: 2px;
}

.technique-band-glyph {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    border: none;
    cursor: pointer;
    background: transparent;
    color: var(--secondary-text-color);
}

.technique-band-glyph:hover {
    background: var(--input-background);
    color: var(--primary-text-color);
}

.technique-band-glyph-on {
    background: var(--accent-color);
    color: #fff;
}

.technique-band-glyph-on:hover {
    background: var(--accent-color);
    opacity: 0.85;
}
```

Replace that block with:

```css
.technique-row-total {
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--secondary-text-color);
    white-space: nowrap;
}

.technique-disclosure-btn {
    width: 22px;
    height: 22px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--secondary-text-color);
    cursor: pointer;
    flex-shrink: 0;
    transition: transform 0.14s ease, color 0.14s ease, background-color 0.14s ease;
}

.technique-disclosure-btn:hover {
    background: var(--input-background);
    color: var(--primary-text-color);
}

.technique-disclosure-btn-open {
    transform: rotate(90deg);
    color: var(--primary-text-color);
}

.technique-row-body {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 4px 8px 10px 34px;
}

.technique-row-body-toggle {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 8px;
    border: 1px solid var(--secondary-text-color);
    color: var(--secondary-text-color);
    background: transparent;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.14s ease, color 0.14s ease, border-color 0.14s ease;
}

.technique-row-body-toggle:hover {
    background: var(--input-background);
}

.technique-row-body-toggle-on {
    border-color: var(--accent-color);
    color: var(--accent-color);
}
```

- [ ] **Step 3: Run the full suite**

Run: `npx jest`
Expected: no new failures. `techniqueRowClassName.test.ts`/`techniqueRowCss.test.ts` are untouched (`TechniqueRow.tsx` itself didn't change).

- [ ] **Step 4: Run `tsc` and lint**

Run: `npx tsc --noEmit` and `npm run lint`
Expected: same pre-existing counts as the plan's Global Constraints baseline — no new errors from the rewritten file (in particular, confirm `onUpdateSection`'s second argument and `artificialSeeding: 'artificial-seeding'` payload shape match `useSectionSlice`'s actual signature exactly as the deleted code used them — this rewrite must not change that call).

- [ ] **Step 5: Manual check-in**

On Results, with a project that has LSPIV + STIV + iWave data: click each technique's disclosure chevron — confirm it rotates and reveals written-label toggles (not glyphs), that multiple rows can be expanded at once, and that each toggle still does what it did before (σ band / 5–95% band / artificial seeding / quality shading), verified against the velocity chart's bands appearing/disappearing. Confirm each row's trailing number is that technique's own total discharge (not just the active one's), and that it updates when Interpolate/Alpha/seeding change. Confirm the eye icon and name-click behaviour are unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/components/Graphs/TechniqueLegend.tsx src/components/Graphs/graphs.css
git commit -m "Expandable technique rows with written labels and per-technique totals"
```

---

## Task 11: Final full-branch review and verification

**Files:** none new — this task re-reads everything Tasks 1–10 touched as a whole, the same way Phase 4a/4b's final review caught cross-task bugs no task-scoped review could see (e.g. an unstable dependency tearing down an overlay, a guard that never fired). Fix findings inline; re-run verification after each fix.

- [ ] **Step 1: Run the full suite and record counts**

Run: `npx jest`, `npx tsc --noEmit`, `npm run lint`
Expected: 21 new tests over the plan's starting baseline (4 from Task 1's `pinnedStation` reducer tests + 4 from Task 2's `isLowConfidence` + 3 from Task 3's `stationBadgeGeometry` + 10 from Task 8's `stationTagContent` — e.g. 445 + 21 = 466 if the branch was still at 445 when this plan started; confirm against whatever `npx jest` actually reported at the start of Task 1, since the branch may have moved since this plan was written). `tsc`/lint counts unchanged from the plan's Global Constraints baseline. Investigate and fix any drift before proceeding.

- [ ] **Step 2: Cross-task read-through**

Re-read, in one pass: `uiSlice.ts`/`useUiSlice.ts` (Task 1), `VelocityVector.tsx`/`drawVectors.ts` (Task 4), the three chart modules + `AllInOne.tsx` (Tasks 5–7), `StationTag.tsx`/`stationTagContent.ts`/`ImageResults.tsx` (Tasks 8–9), `TechniqueLegend.tsx` (Task 10). Specifically check for the failure classes Phase 4b's final review actually found: a value read via `getCSSVar()` once instead of staying a live `var()` string (theme-switch bugs); an effect's dependency array missing a value it reads (stale closures — in particular, `AllInOne.tsx`'s draw effect's dependency array already lists `hoveredStation`; confirm it still needs nothing new after Tasks 6/7's edits); a guard that's checking the wrong signal (e.g. confirm `StationTag`'s "no data" early return can't ever show a stale station from a previous section after switching sections — `stationIndex` comes from Redux, which Grid/AllInOne already reset to `null` on `mouseleave`/section change elsewhere, but verify directly rather than assuming).

- [ ] **Step 3: Full three-theme manual walkthrough**

Note (matching Phase 4b's own Task 10 finding): this environment cannot run the actual Electron shell (the renderer crashes outside Electron's preload bridge). If this plan is executed somewhere that can run the real desktop app, do the walkthrough here — dark, light, and dracula — covering: canvas/chart/Grid hover all show the same badge/crosshair/tag; pin/unpin from all three trigger points; `StationTag`'s warning text colour is legible in light theme; expandable technique rows in all three themes. If this environment cannot run it, explicitly flag to the user that this step is owed, exactly as Phase 4b's plan did — do not claim it as done.

- [ ] **Step 4: Fix wave**

Fix anything Step 2 or Step 3 surfaced, inline, then re-run Step 1's full verification. Repeat until clean.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "Phase 4c final review: fix wave"
```

(Skip this commit if Step 4 found nothing to fix.)
