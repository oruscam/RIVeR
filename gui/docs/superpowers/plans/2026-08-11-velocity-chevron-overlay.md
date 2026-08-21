# Velocity Chevron Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Results step's polygon velocity arrows with an animated chevron-chase overlay that draws nothing at zero velocity, points upstream for reverse flow, carries a colour bar matching Processing, and shows a signed hover readout.

**Architecture:** Glyph geometry is defined in real-world metres at each station and projected per-vertex through the homography (a homography does not preserve perpendicularity, so pixel-space shortcuts are wrong by 25–48° on real oblique frames). Chevron count and animation period are *derived* from that geometry rather than tuned. Rendering stays in the existing d3 `drawVectors` seam; `VelocityVector` owns a single requestAnimationFrame loop.

**Tech Stack:** TypeScript, React 18, d3 v7, Vite/Electron, Jest (`testEnvironment: "node"`).

**Design spec:** `gui/docs/superpowers/specs/2026-08-11-velocity-chevron-overlay-design.md` — read §4, §5 and §7 before Task 2.

## Global Constraints

- Work from `/Users/antoine/river/gui`. Tests: `npx jest`. Types: `npx tsc --noEmit` (a large block of pre-existing `TS6305` composite-cache errors is expected and unrelated — only NEW errors naming your files count). Lint: `npx eslint <files>`.
- This project has **no React component test infrastructure** (`jest.config.ts` → `testEnvironment: "node"`). Do NOT add jsdom or React testing libraries. Only pure functions get automated tests; components are verified manually in Task 5.
- Fixed glyph parameters, already chosen — do not re-tune: thickness factor **3.3**, wing span **0.7**, drop shadow **soft** (`dy=1, stdDeviation=1.4, floodOpacity=0.45`), pitch fraction **0.8**, default period **1.7 s**, max count **6**.
- The existing 4-stop palette (`createColorMap` in `commons/vectors.ts`) is unchanged.
- Do not modify `data.activeMagnitude` or the Electron `transformCrossSectionsData.ts` — other callers depend on them.
- Commit after each task. **Do not add a `Co-Authored-By` trailer.** Do not push.
- Branch is already `feat/velocity-overlay-redesign`.

---

### Task 1: Make `getVelocityLimits` technique-aware

**Files:**
- Modify: `gui/src/helpers/drawArrows.ts` (the `getVelocityLimits` function near the end)
- Create: `gui/src/helpers/getVelocityLimits.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `getVelocityLimits(magnitudes: (number | null)[] | null): { min: number; max: number }` — a NEW signature taking one section's already-resolved profile instead of `(sections, activeIndex)`. Task 4 calls it with `getEffectiveTechniqueData(...).resolved`.

**Context:** `getVelocityLimits` currently reads `sections[active].data.activeMagnitude`, an LSPIV-only array built in the Electron layer. Its sibling `getGlobalMagnitudes` was already converted to take resolved arrays (commit `c0eab6a`); this is the same change for the colour-bar path. Without it the bar labels the scale with LSPIV numbers while the chevrons are coloured by STIV.

- [ ] **Step 1: Write the failing tests**

Create `gui/src/helpers/getVelocityLimits.test.ts`:

```ts
import { getVelocityLimits } from './drawArrows';

describe('getVelocityLimits', () => {
  it('spans the min and max of the resolved profile', () => {
    expect(getVelocityLimits([0.5, 1.5, 2.5])).toEqual({ min: 0, max: 2.5 });
  });

  it('keeps negative velocities in range (STIV reports reverse flow)', () => {
    expect(getVelocityLimits([-1.25, 0.4, 2.08])).toEqual({ min: -1.25, max: 2.08 });
  });

  it('always spans zero', () => {
    expect(getVelocityLimits([1.5, 2.5])).toEqual({ min: 0, max: 2.5 });
    expect(getVelocityLimits([-1.5, -2.5])).toEqual({ min: -2.5, max: 0 });
  });

  it('ignores null and NaN entries', () => {
    expect(getVelocityLimits([null, 1.5, NaN, 0.5])).toEqual({ min: 0, max: 1.5 });
  });

  it('returns a zero range when there is nothing to draw', () => {
    expect(getVelocityLimits(null)).toEqual({ min: 0, max: 0 });
    expect(getVelocityLimits([])).toEqual({ min: 0, max: 0 });
    expect(getVelocityLimits([null, null])).toEqual({ min: 0, max: 0 });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/helpers/getVelocityLimits.test.ts`
Expected: FAIL — the current function takes `(sections, active)`, so these calls produce wrong results or throw.

- [ ] **Step 3: Replace the implementation**

In `gui/src/helpers/drawArrows.ts`, replace the whole `getVelocityLimits` function (its JSDoc block included) with:

```ts
/**
 * Velocity range for the colour bar in Results, spanning zero.
 *
 * Takes the section's already-resolved per-station velocities (the same array
 * the chevrons and the velocity chart use) rather than reading a fixed LSPIV
 * column off the section — the bar has to be labelled with the numbers that
 * actually coloured the glyphs, or it mislabels the scale whenever the user
 * selects STIV or iWave.
 */
const getVelocityLimits = (magnitudes: (number | null)[] | null): { min: number; max: number } => {
  let max = 0;
  let min = 0;
  if (!magnitudes) return { min, max };

  const filtered = magnitudes.filter((value): value is number => value !== null && !isNaN(value));
  if (filtered.length === 0) return { min, max };

  max = Math.max(max, ...filtered);
  min = Math.min(min, ...filtered);
  return { min, max };
};
```

- [ ] **Step 4: Fix the existing caller so the build stays green**

`src/pages/Results.tsx` currently calls `getVelocityLimits(sections, activeSection)` and its result feeds only a commented-out `<ColorBar>`. Delete the now-dead code: remove the `useMemo` block that computes `{ max, min }`, and remove the `getVelocityLimits` import and the `useMemo` import if it becomes unused. Leave the commented `<ColorBar />` line alone — Task 4 removes it. (The real `<ColorBar>` goes in `ImageResults.tsx`, per the spec.)

- [ ] **Step 5: Verify**

Run:
```bash
npx jest src/helpers/getVelocityLimits.test.ts
npx jest
npx tsc --noEmit 2>&1 | grep -v TS6305 | grep -E "drawArrows|Results" || echo "no new type errors"
npx eslint src/helpers/drawArrows.ts src/helpers/getVelocityLimits.test.ts src/pages/Results.tsx
```
Expected: new tests pass, full suite passes, no new type errors, lint clean.

- [ ] **Step 6: Commit**

```bash
cd /Users/antoine/river
git add gui/src/helpers/drawArrows.ts gui/src/helpers/getVelocityLimits.test.ts gui/src/pages/Results.tsx
git commit -m "fix: make getVelocityLimits technique-aware for the Results colour bar

It read data.activeMagnitude, an LSPIV-only array built in the Electron
layer, so the colour bar would label the scale with LSPIV numbers while
the glyphs were coloured by STIV or iWave. Now takes the section's
resolved profile, matching the getGlobalMagnitudes change in c0eab6a."
```

---

### Task 2: Pure chevron geometry helpers

**Files:**
- Create: `gui/src/helpers/chevronGlyph.ts`
- Create: `gui/src/helpers/chevronGlyph.test.ts`
- Modify: `gui/src/helpers/index.ts` (re-export)

**Interfaces:**
- Consumes: `transformRealWorldToPixel` from `../../commons/coordinates` is NOT used here — this module is pure maths on plain numbers so it stays unit-testable. Projection happens in Task 3.
- Produces:
  ```ts
  export interface Vec { x: number; y: number }
  export function flowDirection(
    i: number,
    velocity: number,
    east: number[], north: number[],
    streamwiseEast?: number[], streamwiseNorth?: number[]
  ): Vec
  export function chevronCount(lengthM: number, widthM: number): number
  export function formatSignedVelocity(v: number, isImperial: boolean): string
  export const PITCH_FRACTION: number
  export const MAX_CHEVRON_COUNT: number
  export const THICKNESS_FACTOR: number
  export const WING_SPAN: number
  export const DEFAULT_PERIOD_S: number
  ```
  Task 3 imports all of these.

**Context:** Read spec §4 (direction), §5.1 (count/period rules) and §6 (reverse flow) first. Key points:
- Direction prefers RIVeR's stored `streamwise_east`/`streamwise_north`; falls back to the section's real-world perpendicular when absent or zero-length. Never a pixel-space perpendicular.
- Negative velocity flips the direction 180°; length uses `|v|`.
- Count holds *pitch* constant: `clamp(round(L / (W × 0.8)), 1, 6)`.

- [ ] **Step 1: Write the failing tests**

Create `gui/src/helpers/chevronGlyph.test.ts`:

```ts
import { flowDirection, chevronCount, formatSignedVelocity, PITCH_FRACTION, MAX_CHEVRON_COUNT } from './chevronGlyph';

// A straight section running east, so its real-world perpendicular is +north.
const east = [0, 1, 2, 3, 4];
const north = [0, 0, 0, 0, 0];

describe('flowDirection', () => {
  it('uses the stored streamwise vector when present, normalised', () => {
    const d = flowDirection(2, 1.0, east, north, [0, 0, 3, 0, 0], [0, 0, 4, 0, 0]);
    expect(d.x).toBeCloseTo(0.6, 6);
    expect(d.y).toBeCloseTo(0.8, 6);
  });

  it('flips 180 degrees for a negative velocity (reverse flow)', () => {
    const d = flowDirection(2, -1.0, east, north, [0, 0, 3, 0, 0], [0, 0, 4, 0, 0]);
    expect(d.x).toBeCloseTo(-0.6, 6);
    expect(d.y).toBeCloseTo(-0.8, 6);
  });

  it('falls back to the section perpendicular when no streamwise vector is given', () => {
    const d = flowDirection(2, 1.0, east, north);
    expect(Math.abs(d.x)).toBeCloseTo(0, 6);
    expect(Math.abs(d.y)).toBeCloseTo(1, 6);
  });

  it('falls back when the streamwise vector is present but zero-length', () => {
    const d = flowDirection(2, 1.0, east, north, [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]);
    expect(Math.abs(d.y)).toBeCloseTo(1, 6);
  });

  it('returns a unit vector', () => {
    const d = flowDirection(1, 2.5, east, north, [0, 7, 0, 0, 0], [0, 7, 0, 0, 0]);
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1, 6);
  });
});

describe('chevronCount', () => {
  // Width W and pitch W*PITCH_FRACTION; the longest arrow is 2*spacing where W is
  // 0.5*spacing, i.e. L/W = 4 ⇒ 4/0.8 = 5 chevrons.
  it('gives 5 at the longest arrow, matching the chosen look', () => {
    expect(chevronCount(4, 1)).toBe(5);
  });

  it('scales down with arrow length so the pitch stays constant', () => {
    expect(chevronCount(2, 1)).toBe(Math.round(2 / PITCH_FRACTION));
    expect(chevronCount(0.8, 1)).toBe(1);
  });

  it('never returns less than 1', () => {
    expect(chevronCount(0.01, 1)).toBe(1);
    expect(chevronCount(0, 1)).toBe(1);
  });

  it('clamps at the maximum', () => {
    expect(chevronCount(1000, 1)).toBe(MAX_CHEVRON_COUNT);
  });

  it('is safe when width is zero', () => {
    expect(chevronCount(3, 0)).toBe(1);
  });
});

describe('formatSignedVelocity', () => {
  it('shows an explicit plus for forward flow', () => {
    expect(formatSignedVelocity(1.9193, false)).toBe('+1.92 m/s');
  });

  it('uses a true minus sign (U+2212) for reverse flow', () => {
    expect(formatSignedVelocity(-1.2496, false)).toBe('−1.25 m/s');
  });

  it('shows zero with a plus', () => {
    expect(formatSignedVelocity(0, false)).toBe('+0.00 m/s');
  });

  it('converts to imperial', () => {
    expect(formatSignedVelocity(1, true)).toBe('+3.28 ft/s');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/helpers/chevronGlyph.test.ts`
Expected: FAIL — `Cannot find module './chevronGlyph'`.

- [ ] **Step 3: Implement the helper**

Create `gui/src/helpers/chevronGlyph.ts`:

```ts
import { UNIT_CONVERSIONS, UNITS } from '../constants/constants';

export interface Vec {
  x: number;
  y: number;
}

/** Chevron pitch as a fraction of the glyph width. Back-derived from the count
 *  of 5 chosen at the longest arrow, so the fastest station is unchanged and
 *  only slow stations stop being crowded. */
export const PITCH_FRACTION = 0.8;
export const MAX_CHEVRON_COUNT = 6;
/** Chevron thickness = width * 0.16 * THICKNESS_FACTOR, in metres. */
export const THICKNESS_FACTOR = 3.3;
/** Wing half-span as a fraction of the glyph width. */
export const WING_SPAN = 0.7;
/** One period for every station, so apparent speed is proportional to velocity
 *  (a chevron crosses its arrow, whose length is proportional to v, in T). */
export const DEFAULT_PERIOD_S = 1.7;

const unit = (x: number, y: number): Vec => {
  const l = Math.hypot(x, y);
  return l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
};

/**
 * Real-world flow direction at station `i`, as a unit vector.
 *
 * Prefers RIVeR's own streamwise vector. The tempting alternative — the
 * section's perpendicular, oriented so it points "up" the image — was measured
 * to agree on the available test projects only because both cameras look
 * downstream; a camera looking upstream would silently reverse every glyph.
 * The perpendicular is used solely as a fallback when the streamwise vector is
 * missing or degenerate.
 *
 * A negative velocity flips the direction: reverse flow points upstream.
 */
export function flowDirection(
  i: number,
  velocity: number,
  east: number[],
  north: number[],
  streamwiseEast?: number[],
  streamwiseNorth?: number[]
): Vec {
  let dir: Vec = { x: 0, y: 0 };

  const se = streamwiseEast?.[i];
  const sn = streamwiseNorth?.[i];
  if (typeof se === 'number' && typeof sn === 'number' && !isNaN(se) && !isNaN(sn)) {
    dir = unit(se, sn);
  }

  if (dir.x === 0 && dir.y === 0) {
    const a = Math.max(0, i - 1);
    const b = Math.min(east.length - 1, i + 1);
    const tangent = unit(east[b] - east[a], north[b] - north[a]);
    dir = { x: -tangent.y, y: tangent.x };
  }

  return velocity < 0 ? { x: -dir.x, y: -dir.y } : dir;
}

/**
 * Chevrons for one station, holding the PITCH constant rather than the count.
 * Arrow length is proportional to velocity, so a fixed count would cram N
 * chevrons into a short slow arrow and spread the same N thinly over a long
 * fast one; constant pitch keeps the ridge density identical everywhere.
 */
export function chevronCount(lengthM: number, widthM: number): number {
  const pitch = widthM * PITCH_FRACTION;
  if (!(pitch > 0)) return 1;
  return Math.max(1, Math.min(MAX_CHEVRON_COUNT, Math.round(lengthM / pitch)));
}

/** e.g. "+1.92 m/s" / "−1.25 m/s". Uses U+2212, matching the STI badge. */
export function formatSignedVelocity(v: number, isImperial: boolean): string {
  const value = isImperial ? v * UNIT_CONVERSIONS.M_TO_FT : v;
  const unitLabel = isImperial ? UNITS.IMPERIAL.VELOCITY : UNITS.SI.VELOCITY;
  const sign = value < 0 ? '−' : '+';
  return `${sign}${Math.abs(value).toFixed(2)} ${unitLabel}`;
}
```

- [ ] **Step 4: Re-export from the helpers barrel**

In `gui/src/helpers/index.ts`, add `chevronGlyph` to the imports/exports following the file's existing style (it imports named symbols then re-exports them in one `export { ... }` block). Export: `flowDirection`, `chevronCount`, `formatSignedVelocity`, `PITCH_FRACTION`, `MAX_CHEVRON_COUNT`, `THICKNESS_FACTOR`, `WING_SPAN`, `DEFAULT_PERIOD_S`.

- [ ] **Step 5: Verify**

Run:
```bash
npx jest src/helpers/chevronGlyph.test.ts
npx jest
npx tsc --noEmit 2>&1 | grep -v TS6305 | grep chevronGlyph || echo "no new type errors"
npx eslint src/helpers/chevronGlyph.ts src/helpers/chevronGlyph.test.ts src/helpers/index.ts
```
Expected: 15 new tests pass, full suite passes, clean types and lint.

- [ ] **Step 6: Commit**

```bash
cd /Users/antoine/river
git add gui/src/helpers/chevronGlyph.ts gui/src/helpers/chevronGlyph.test.ts gui/src/helpers/index.ts
git commit -m "Add chevron glyph geometry helpers

Pure rules behind the new velocity overlay: flow direction from RIVeR's
stored streamwise vectors (flipped for reverse flow, section perpendicular
only as fallback), chevron count at constant pitch, and signed velocity
formatting. Kept free of projection maths so they stay unit-testable in
this project's node test environment."
```

---

### Task 3: Draw the animated chevrons

**Files:**
- Modify: `gui/src/components/Graphs/drawVectors.ts` (full rewrite of the drawing body)
- Modify: `gui/src/components/Graphs/VelocityVector.tsx` (rAF loop, static fallbacks)

**Interfaces:**
- Consumes: everything exported in Task 2; `transformRealWorldToPixel` from `../../commons/coordinates`; `createColorMap`, `Normalize` from `../../commons/vectors`.
- Produces: `drawVectors(...)` keeps its name and its existing parameter list, with `phase: number` appended as the last parameter before `unitSistem`. `VelocityVector` keeps its props unchanged.

**Context:** Read spec §4, §5, §6, §8, §9. `drawVectors` is called from `VelocityVector.tsx` in two places (the `seeAll` branch and the single-section branch) — both must be updated. There is no component test infrastructure; correctness here is verified manually in Task 5.

- [ ] **Step 1: Rewrite `drawVectors.ts`**

Replace the entire contents of `gui/src/components/Graphs/drawVectors.ts` with:

```ts
import * as d3 from 'd3';
import { transformRealWorldToPixel } from '../../commons/coordinates';
import { createColorMap, Normalize } from '../../commons/vectors';
import {
  chevronCount,
  flowDirection,
  formatSignedVelocity,
  THICKNESS_FACTOR,
  WING_SPAN,
} from '../../helpers/chevronGlyph';
import { SectionData } from '../../store/section/types';

type Pt = { x: number; y: number };

/**
 * Draws one animated chevron glyph per station over the snapshot.
 *
 * Every vertex is defined in REAL-WORLD METRES at the station and projected
 * through the homography. This is not a stylistic choice: a homography does not
 * preserve perpendicularity, so building the glyph in pixel space (taking the
 * section's perpendicular on screen, sizing from pixel spacing) was measured
 * wrong by 25-48 degrees of direction and ~5x of scale on real oblique frames.
 * Projecting metres makes perspective exact and needs no correction factor.
 *
 * `phase` is the animation clock in turns (0..1 per cycle); the caller owns the
 * requestAnimationFrame loop and passes a fixed value for static renders.
 */
export const drawVectors = (
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  factor: number | { x: number; y: number },
  sectionIndex: number,
  interpolated: boolean,
  data: SectionData,
  /** Per-station velocities already resolved for the active technique,
   *  interpolation, seeding and station checks — what the chart plots. */
  magnitude: (number | null)[],
  isReport: boolean,
  transformationMatrix: number[][],
  imageWidth: number,
  imageHeight: number,
  globalMin: number,
  globalMax: number,
  phase: number,
  unitSistem?: string
) => {
  const { east, north, distance, check, streamwise_east, streamwise_north } = data;
  if (!east || !north || !magnitude || !distance) return;

  const fx = typeof factor === 'number' ? factor : factor.x;
  const fy = typeof factor === 'number' ? factor : factor.y;

  const n = east.length;
  const spacingM = n > 1 ? Math.abs(distance[n - 1] - distance[0]) / (n - 1) : 1;
  const maxLenM = spacingM * 2;
  const widthM = spacingM * 0.5;
  const thicknessM = widthM * 0.16 * THICKNESS_FACTOR;

  const colorMap = createColorMap();
  const norm = new Normalize(globalMin, globalMax);
  const range = Math.max(Math.abs(globalMin), Math.abs(globalMax)) || 1;

  // Tooltip: one lazily created node reused across renders, matching the
  // previous arrow overlay's behaviour.
  let tooltip = d3.select<HTMLDivElement, unknown>('#vectors-tooltip');
  if (tooltip.empty()) {
    tooltip = d3
      .select<HTMLDivElement, unknown>('body')
      .append('div')
      .attr('id', 'vectors-tooltip')
      .style('position', 'absolute')
      .style('top', '0px')
      .style('background', 'rgba(50, 50, 50, 0.85)')
      .style('border', '1px solid #262626')
      .style('padding', '5px 10px')
      .style('border-radius', '5px')
      .style('pointer-events', 'none')
      .style('opacity', '0');
  }

  magnitude.forEach((v, i) => {
    if (v === null || isNaN(v)) return;
    if (check[i] === false && interpolated === false) return;

    const speed = Math.abs(v);
    const lengthM = (speed / range) * maxLenM;
    if (lengthM <= 0) return; // zero velocity draws nothing at all

    const dir = flowDirection(i, v, east, north, streamwise_east, streamwise_north);
    // Cross axis: the section tangent, so wings sit across the flow.
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    const tx = east[b] - east[a];
    const ty = north[b] - north[a];
    const tl = Math.hypot(tx, ty) || 1;
    const tan = { x: tx / tl, y: ty / tl };

    /** (along, across) in metres → display pixels. */
    const place = (along: number, across: number): Pt => {
      const e = east[i] + dir.x * along + tan.x * across;
      const nn = north[i] + dir.y * along + tan.y * across;
      const [px, py] = transformRealWorldToPixel(e, nn, transformationMatrix);
      return { x: px / fx, y: py / fy };
    };

    const base = place(0, 0);
    const tip = place(lengthM, 0);
    if (Math.hypot(tip.x - base.x, tip.y - base.y) < 2) return;

    const clamped = Math.max(globalMin, Math.min(globalMax, v));
    const idx = Math.max(0, Math.min(Math.floor(norm.normalize(clamped) * (colorMap.length - 1)), colorMap.length - 1));
    const color = colorMap[idx];

    const count = chevronCount(lengthM, widthM);
    const hw = widthM * WING_SPAN;
    const back = widthM * 0.5;

    const group = svg.append('g').classed(`section-${sectionIndex}`, true);
    if (!isReport) group.attr('filter', 'url(#chevron-soft-shadow)');

    // Fixed per-station phase offset so a shared period doesn't march in lockstep.
    const offset = (i * 0.618) % 1;

    for (let k = 0; k < count; k++) {
      const f = (phase + offset + k / count) % 1;
      const apex = Math.max(0, lengthM * f);
      const wing = Math.max(0, apex - back);
      const innerApex = Math.max(0, apex - thicknessM);
      const innerWing = Math.max(0, wing - thicknessM);
      const pts = [
        place(wing, hw), place(apex, 0), place(wing, -hw),
        place(innerWing, -hw), place(innerApex, 0), place(innerWing, hw),
      ];
      group
        .append('polygon')
        .attr('points', pts.map((p) => `${p.x},${p.y}`).join(' '))
        .attr('fill', color)
        .attr('fill-opacity', Math.sin(Math.PI * f) * 0.95)
        .attr('stroke', color)
        .attr('stroke-opacity', Math.sin(Math.PI * f) * 0.5)
        .attr('stroke-width', 0.8)
        .attr('stroke-linejoin', 'round')
        .attr('pointer-events', 'none');
    }

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
          group.selectAll('polygon').attr('fill-opacity', 1);
          tooltip.transition().duration(200).style('opacity', 1);
          tooltip
            .html(formatSignedVelocity(v, unitSistem === 'imperial'))
            .style('left', `${event.pageX}px`)
            .style('top', `${event.pageY}px`)
            .style('color', color)
            .style('z-index', 1000);
        })
        .on('mouseout', function () {
          tooltip.transition().duration(300).style('opacity', 0);
        });
    }
  });
};
```

- [ ] **Step 2: Add the shadow filter and the animation loop in `VelocityVector.tsx`**

Make these changes to `gui/src/components/Graphs/VelocityVector.tsx`:

(a) Extend the imports at the top:
```ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_PERIOD_S } from '../../helpers/chevronGlyph';
```

(b) Inside the component, before the existing draw `useEffect`, add the clock. It stops for reports and for users who asked for reduced motion — the glyph is fully legible static, so motion is an enhancement and never the only carrier of meaning:

```ts
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animated = !isReport && !prefersReducedMotion;

  const [phase, setPhase] = useState(0);
  const rafRef = useRef(0);
  useEffect(() => {
    if (!animated) return;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setPhase((p) => (p + dt / DEFAULT_PERIOD_S) % 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animated]);
```

(c) Inside the existing draw `useEffect`, right after `svg.attr('width', ...)`, append the shadow filter once per render:

```ts
    // One filter definition, applied per station group — 15 filter passes a
    // frame instead of one per chevron.
    const defs = svg.append('defs');
    defs
      .append('filter')
      .attr('id', 'chevron-soft-shadow')
      .attr('x', '-60%')
      .attr('y', '-60%')
      .attr('width', '220%')
      .attr('height', '220%')
      .append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 1)
      .attr('stdDeviation', 1.4)
      .attr('flood-color', '#000')
      .attr('flood-opacity', 0.45);
```

(d) Pass `phase` to BOTH `drawVectors` calls, as the argument immediately before `projectDetails.unitSistem`.

(e) Add `phase` to the draw `useEffect`'s dependency array.

- [ ] **Step 3: Verify**

Run:
```bash
npx jest
npx tsc --noEmit 2>&1 | grep -v TS6305 | grep -E "drawVectors|VelocityVector" || echo "no new type errors"
npx eslint src/components/Graphs/drawVectors.ts src/components/Graphs/VelocityVector.tsx
```
Expected: suite passes (no tests cover these files directly), no new type errors, lint clean. If eslint reports only a pre-existing `react-hooks/exhaustive-deps` warning on `AllInOne.tsx`, ignore it — it is not in these files.

- [ ] **Step 4: Commit**

```bash
cd /Users/antoine/river
git add gui/src/components/Graphs/drawVectors.ts gui/src/components/Graphs/VelocityVector.tsx
git commit -m "Replace velocity arrows with an animated chevron overlay

Chevrons are built in real-world metres at each station and projected
per-vertex through the homography, so perspective is exact rather than
approximated in pixel space. Zero or absent velocity now draws nothing at
all, and reverse flow points upstream. Count follows a constant pitch and
every station shares one period, so apparent speed stays proportional to
velocity. Animation stops for the report and for prefers-reduced-motion;
the static glyph carries the same information."
```

---

### Task 4: Colour bar in Results

**Files:**
- Modify: `gui/src/components/ImageResults.tsx`
- Modify: `gui/src/pages/Results.tsx` (drop the dead commented `<ColorBar />` line)

**Interfaces:**
- Consumes: `getVelocityLimits` (Task 1 signature), `getEffectiveTechniqueData`, `ColorBar`, `useDataSlice().colorbarLimits`.
- Produces: no new exports.

**Context:** `.colorbar-container` is `position: absolute; bottom: 16px; right: 16px` (`components.css:755`), so it anchors to the nearest positioned ancestor. Both existing usages put it directly inside `image-with-data-container` (`ImageProcessing.tsx:182`, `ImageWithData.tsx:95`) — Results must match, which is why this goes in `ImageResults.tsx`, not the page. `ColorBar` also writes back to `colorbarLimits` (manual min/max + refresh), so a locked range must clamp the glyph colours too, mirroring `ImageProcessing.tsx:72-86`.

- [ ] **Step 1: Compute the limits in `ImageResults.tsx`**

Add to the imports:
```ts
import { useMemo } from 'react';
import { ColorBar } from './ColorBar';
import { getEffectiveTechniqueData, getVelocityLimits } from '../helpers';
import { useDataSlice, useSectionSlice } from '../hooks';
```
(merge with the existing `../hooks` import rather than duplicating it).

Inside the component, after the existing hook calls:
```ts
  const { sections, activeSection } = useSectionSlice();
  const { colorbarLimits } = useDataSlice();

  // The bar has to be labelled with the numbers that actually coloured the
  // glyphs, so the range comes from the active technique's resolved profile —
  // the same array the chevrons and the velocity chart use. A manually locked
  // range wins, exactly as it does in Processing.
  const { min, max } = useMemo(() => {
    const section = sections[activeSection];
    if (!section?.data) return { min: 0, max: 0 };
    const effective = getEffectiveTechniqueData(section.data, section.activeTechnique, {
      interpolated: section.interpolated,
      artificialSeeding: section.artificialSeeding,
      alpha: section.alpha,
    });
    if (colorbarLimits.default === false) {
      return { min: colorbarLimits.min as number, max: colorbarLimits.max as number };
    }
    return getVelocityLimits(effective ? effective.resolved : null);
  }, [sections, activeSection, colorbarLimits.default, colorbarLimits.min, colorbarLimits.max]);
```

- [ ] **Step 2: Render it inside the container**

In `ImageResults.tsx`, immediately after the closing `)}` of the `{isReport === false && ( <OverlaySvg> ... )}` block and before the container's closing `</div>`, add:

```tsx
      {/* Outside the zoomed element so the bar keeps its size and corner. */}
      {isReport === false && <ColorBar min={min} max={max} />}
```

- [ ] **Step 3: Make the glyph colours honour a locked range**

`VelocityVector` currently derives `globalMin`/`globalMax` from `getGlobalMagnitudes(resolvedPerSection)`. Locked limits must win there too, or the bar and the chevrons disagree. In `VelocityVector.tsx`:

Add `colorbarLimits` to the existing `useDataSlice()` destructure (add the hook import if the component does not already use it), then replace the `globalMin`/`globalMax` memo with:

```ts
  const { max: dataMax, min: dataMin } = useMemo(() => {
    return getGlobalMagnitudes(resolvedPerSection);
  }, [resolvedPerSection]);

  // A locked colour-bar range wins, so the bar and the glyphs always agree.
  const globalMin = colorbarLimits.default === false ? (colorbarLimits.min as number) : dataMin;
  const globalMax = colorbarLimits.default === false ? (colorbarLimits.max as number) : dataMax;
```

Add `globalMin`, `globalMax` to the draw effect's dependency array if not already present (they are).

- [ ] **Step 4: Remove the dead line in `pages/Results.tsx`**

Delete the commented `{/* <ColorBar min={min} max={max} /> */}` line, and the `ColorBar` entry from that file's import if it is now unused.

- [ ] **Step 5: Verify**

Run:
```bash
npx jest
npx tsc --noEmit 2>&1 | grep -v TS6305 | grep -E "ImageResults|Results|VelocityVector" || echo "no new type errors"
npx eslint src/components/ImageResults.tsx src/pages/Results.tsx src/components/Graphs/VelocityVector.tsx
```
Expected: suite passes, no new type errors, lint clean.

- [ ] **Step 6: Commit**

```bash
cd /Users/antoine/river
git add gui/src/components/ImageResults.tsx gui/src/pages/Results.tsx gui/src/components/Graphs/VelocityVector.tsx
git commit -m "Show the velocity colour bar in Results

Same component and same position as Processing (inside
image-with-data-container, which is what .colorbar-container's absolute
positioning anchors to). The range comes from the active technique's
resolved profile so the bar is labelled with the numbers that coloured the
glyphs, and a manually locked range now clamps both the bar and the
chevrons instead of only the bar."
```

---

### Task 5: Manual verification and prototype cleanup

**Files:**
- Delete: `gui/src/devPreview/` (whole directory), `gui/overlay.html`

No code changes. The overlay has no automated coverage by design (Global Constraints), so this task is the gate.

- [ ] **Step 1: Remove the throwaway prototype**

```bash
cd /Users/antoine/river
rm -rf gui/src/devPreview gui/overlay.html
lsof -ti:5185 | xargs kill 2>/dev/null || true
git status --short gui/
```
Expected: no `devPreview` or `overlay.html` entries remain.

- [ ] **Step 2: Launch the app**

```bash
cd /Users/antoine/river/gui && npm run dev
```

- [ ] **Step 3: Verify on `oblique/20250703T1004`**

Open that project and go to Results. Confirm:
- Chevrons animate along each station, chasing away from the section.
- Both bank stations (velocity `null`) draw **nothing** — no stub, no tip.
- The colour bar appears bottom-right of the image, same size/position as Processing's.
- Hovering a glyph shows e.g. `+1.92 m/s` in that glyph's colour, and the glyph brightens.
- Zooming/panning the image keeps the bar fixed in the corner.

- [ ] **Step 4: Verify on `P1060716/20260728T1656` — the harder case**

- Switch technique to **STIV**: station 1 has a true `0.00` and must draw **nothing at all**. This is the original complaint; check it explicitly.
- Station 0 sits at x ≈ −21.7 px (off the left edge) — confirm no artefact, stray polygon or stretched glyph appears.
- Any negative station points **upstream** (opposite the others) and reads `−…` on hover.
- Switching LSPIV ↔ STIV re-colours the chevrons **and** re-labels the colour bar.

- [ ] **Step 5: Verify the locked colour bar**

Type a narrower min/max into the colour-bar inputs and press Enter. Confirm the chevron colours clamp to that range (not just the bar), then press the refresh button and confirm both return to the data range.

- [ ] **Step 6: Verify the static paths**

- Export/preview the **report** and confirm chevrons render static and correct, with no colour bar interactivity issues.
- Enable reduced motion (macOS: System Settings → Accessibility → Display → Reduce motion) and reload: chevrons must render static but complete.

- [ ] **Step 7: Themes and multi-section**

- Check all three themes (dark / light / dracula).
- With 2+ cross-sections, toggle "see all" and confirm every section's glyphs draw and animate, and that performance stays smooth.

- [ ] **Step 8: Report results**

Summarise what was verified and anything that deviated. If something does not match, stop and report rather than marking this complete.

- [ ] **Step 9: Commit the cleanup**

```bash
cd /Users/antoine/river
git add -A gui/
git commit -m "Remove the velocity-overlay prototype

The chevron design it was used to choose is now implemented in
VelocityVector/drawVectors; the throwaway preview harness and its dev
entry point are no longer needed."
```

---

## Plan self-review notes

- **Spec coverage:** §4 geometry → Tasks 2+3. §5 glyph + §5.1 derived count/period → Tasks 2+3. §6 reverse flow → Task 2 (`flowDirection` flip) + Task 5 verification. §7 colour bar → Tasks 1+4. §8 hover readout → Tasks 2 (`formatSignedVelocity`) + 3. §9 animation lifecycle → Task 3. §10 files → all tasks. §11 testing → Tasks 1, 2 (automated) + Task 5 (manual checklist, mirrors the spec's list).
- **Type consistency:** `getVelocityLimits`'s new one-argument signature is defined in Task 1 and consumed in Task 4. `flowDirection`/`chevronCount`/`formatSignedVelocity` and the constants are defined in Task 2 and consumed in Task 3. `drawVectors` gains exactly one parameter (`phase`), added in Task 3 and passed by the same task's `VelocityVector` edits — no task leaves the build broken.
- **No placeholders:** every step carries literal code or a literal command.
