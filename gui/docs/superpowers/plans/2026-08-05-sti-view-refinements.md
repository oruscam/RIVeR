# STI View Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Processing step's STI view visually consistent with the PIV view — centred layout, three velocity-coloured orientation lines, a badge styled as the PIV arrow tooltip, and the same colorbar.

**Architecture:** One pure helper derives the velocity colour scale (bounds + per-station colours) and is shared by the context ticks, the orientation lines, the badge, and the colorbar, so the four cannot disagree. The PIV tooltip's box style is lifted out of `drawQuiver.ts`'s inline d3 calls into theme properties plus one shared class, which the STI badge then adopts.

**Tech Stack:** React + TypeScript (Vite), Redux Toolkit, d3, jest + ts-jest (`testEnvironment: "node"`).

## Global Constraints

- **Icons:** Lucide only (`react-icons/lu`).
- **Colors:** no hardcoded colors. Every color must be a `var(--*)` custom property defined in **all three** theme blocks of `gui/src/index.css` (`[data-theme="dark"]`, `[data-theme="light"]`, `[data-theme="dracula"]`), or come from `createColorMap()` / `TECHNIQUE_COLORS`.
- **CSS state rules must beat their base rule by specificity, not source order.** Compound the base class onto the modifier (`.base.base-modifier`), never rely on file emission order — a same-specificity modifier in a different stylesheet silently loses.
- **i18n:** any new or changed key must be applied to **all 12** locale files under `gui/src/translations/<lang>/global.json` (ar, de, en, es, fr, hi, it, ja, ko, pt, ru, zh). Non-English locales carry the English string verbatim.
- **Never put the native `disabled` attribute on a button that also needs a `title` tooltip** — Chromium/Electron suppresses tooltips on disabled controls.
- **Presentation only.** No change to STIV's computed angle, velocity, or sign.
- Verification is manual (build + visual check) except where this plan mandates a unit test.

---

### Task 1: Velocity colour-scale helper

**Files:**
- Create: `gui/src/helpers/stiColorScale.ts`
- Create: `gui/src/helpers/stiColorScale.test.ts`
- Modify: `gui/src/helpers/index.ts`
- Modify: `gui/src/store/data/types.ts`

**Interfaces:**
- Produces: `getStiColorScale(profile: (number | null)[] | undefined, colorbarLimits: ColorbarLimits): StiColorScale` where `StiColorScale = { min: number | null; max: number | null; colors: string[] }`. Exported from `stiColorScale.ts` and re-exported from `helpers/index.ts`.
- Produces: `STI_FALLBACK_COLOR = 'var(--accent-color)'`, the colour to use where a station has no velocity.
- Consumes: `createColorMap(): string[]` and `Normalize` (constructor `(vmin, vmax)`, method `normalize(value): number`) from `gui/commons/vectors.ts`.
- Produces: `ColorbarLimits` becomes an exported type from `gui/src/store/data/types.ts`.

- [ ] **Step 1: Export the ColorbarLimits type**

In `gui/src/store/data/types.ts`, the interface already exists at line 37. Only its export list changes. Find:

```ts
export type { DataState, Processing, FormProcessing, Quiver };
```

and replace with:

```ts
export type { ColorbarLimits, DataState, Processing, FormProcessing, Quiver };
```

- [ ] **Step 2: Write the failing tests**

Create `gui/src/helpers/stiColorScale.test.ts`:

```ts
import { getStiColorScale, STI_FALLBACK_COLOR } from './stiColorScale';

const AUTO = { min: null, max: null, default: true };
const MANUAL = { min: 0, max: 10, default: false };

describe('getStiColorScale', () => {
  it('uses the profile own min/max when limits are automatic', () => {
    const { min, max } = getStiColorScale([1, 2, 3], AUTO);
    expect(min).toBe(1);
    expect(max).toBe(3);
  });

  it('uses the manual limits when they are locked, ignoring the profile range', () => {
    const { min, max } = getStiColorScale([1, 2, 3], MANUAL);
    expect(min).toBe(0);
    expect(max).toBe(10);
  });

  it('returns one colour per station, index-aligned with the profile', () => {
    const { colors } = getStiColorScale([1, 2, 3], AUTO);
    expect(colors).toHaveLength(3);
    colors.forEach((c) => expect(c).toMatch(/^rgb/));
  });

  it('maps the extremes of the scale to different colours', () => {
    const { colors } = getStiColorScale([1, 3], AUTO);
    expect(colors[0]).not.toBe(colors[1]);
  });

  it('clamps values outside manual limits to the end colours', () => {
    // -5 is below the manual min and 99 above its max; both must still resolve to a
    // real colour rather than indexing off either end of the colour map.
    const { colors } = getStiColorScale([-5, 5, 99], MANUAL);
    const inRange = getStiColorScale([0, 5, 10], MANUAL);
    expect(colors[0]).toBe(inRange.colors[0]);
    expect(colors[2]).toBe(inRange.colors[2]);
  });

  it('maps a null station to transparent', () => {
    const { colors } = getStiColorScale([1, null, 3], AUTO);
    expect(colors[1]).toBe('transparent');
    expect(colors).toHaveLength(3);
  });

  it('handles a uniform profile without producing an undefined colour', () => {
    // Normalize divides by (vmax - vmin); an all-equal profile would make that a
    // division by zero and index the colour map with NaN.
    const { min, max, colors } = getStiColorScale([2, 2, 2], AUTO);
    expect(min).toBe(2);
    expect(max).toBe(2);
    colors.forEach((c) => expect(c).toMatch(/^rgb/));
  });

  it('returns an empty scale for an undefined, empty, or all-null profile', () => {
    expect(getStiColorScale(undefined, AUTO)).toEqual({ min: null, max: null, colors: [] });
    expect(getStiColorScale([], AUTO)).toEqual({ min: null, max: null, colors: [] });
    expect(getStiColorScale([null, null], AUTO)).toEqual({ min: null, max: null, colors: [] });
  });

  it('falls back to automatic bounds when limits are unlocked but carry stale values', () => {
    const { min, max } = getStiColorScale([1, 2, 3], { min: 0, max: 10, default: true });
    expect(min).toBe(1);
    expect(max).toBe(3);
  });

  it('exposes a non-transparent fallback colour for stations without a value', () => {
    expect(STI_FALLBACK_COLOR).toBe('var(--accent-color)');
  });
});
```

- [ ] **Step 3: Run the tests to confirm they fail**

Run: `cd gui && npx jest src/helpers/stiColorScale.test.ts`
Expected: FAIL — cannot find module `./stiColorScale`.

- [ ] **Step 4: Implement the helper**

Create `gui/src/helpers/stiColorScale.ts`:

```ts
import { createColorMap, Normalize } from '../../commons/vectors';
import type { ColorbarLimits } from '../store/data/types';

export interface StiColorScale {
  /** Lower bound of the colour scale in SI (m/s); null when no scale can be derived. */
  min: number | null;
  /** Upper bound of the colour scale in SI (m/s); null when no scale can be derived. */
  max: number | null;
  /** One colour per station, index-aligned with the profile. Stations with no value
   *  are 'transparent' — appropriate for the context ticks, which should show a gap.
   *  Consumers that must stay visible (lines, badge text) use STI_FALLBACK_COLOR. */
  colors: string[];
}

/** Colour for elements that must remain visible when a station has no STIV value.
 *  'transparent' would render them invisible rather than merely uncoloured. */
export const STI_FALLBACK_COLOR = 'var(--accent-color)';

/**
 * Derive the velocity colour scale for the STI view.
 *
 * Bounds follow the rule the context ticks already used: when the colorbar limits are
 * locked (`default === false`) they are shared across LSPIV and STIV, because both
 * views read the same store field. When automatic, each view uses its own range — for
 * STIV, that is the min/max of `stiv_velocity_profile`.
 */
export const getStiColorScale = (
  profile: (number | null)[] | undefined,
  colorbarLimits: ColorbarLimits
): StiColorScale => {
  if (!profile) return { min: null, max: null, colors: [] };

  const values = profile.filter((v): v is number => v !== null);
  if (values.length === 0) return { min: null, max: null, colors: [] };

  const isManual =
    colorbarLimits.default === false && colorbarLimits.min !== null && colorbarLimits.max !== null;
  const min = isManual ? (colorbarLimits.min as number) : Math.min(...values);
  const max = isManual ? (colorbarLimits.max as number) : Math.max(...values);

  const colorMap = createColorMap();
  const norm = new Normalize(min, max);
  // Normalize divides by (max - min). A uniform profile makes that zero, which would
  // index the colour map with NaN and yield undefined; pin those to the low end.
  const isDegenerate = max === min;

  const colors = profile.map((v) => {
    if (v === null) return 'transparent';
    if (isDegenerate) return colorMap[0];
    const clamped = Math.max(min, Math.min(max, v));
    const index = Math.max(
      0,
      Math.min(Math.floor(norm.normalize(clamped) * (colorMap.length - 1)), colorMap.length - 1)
    );
    return colorMap[index];
  });

  return { min, max, colors };
};
```

- [ ] **Step 5: Run the tests to confirm they pass**

Run: `cd gui && npx jest src/helpers/stiColorScale.test.ts`
Expected: PASS — 10 tests.

- [ ] **Step 6: Re-export the helper**

In `gui/src/helpers/index.ts`, add the import after the existing `stationPositions` import line:

```ts
import { getStiColorScale, STI_FALLBACK_COLOR } from './stiColorScale';
import type { StiColorScale } from './stiColorScale';
```

Add to the existing `export type { ... }` line so it reads:

```ts
export type { StiColorScale, Technique, DischargeResult, TechniqueDischargeData, TechniqueOptions };
```

And add both names to the alphabetical `export { ... }` block — `getStiColorScale,` immediately after `getPointsDistances,`, and `STI_FALLBACK_COLOR,` immediately after `setChangesByForm,`.

- [ ] **Step 7: Build and commit**

Run: `cd gui && npm run build && npx jest`
Expected: build clean; all tests pass (90 previous + 10 new = 100).

```bash
git add gui/src/helpers/stiColorScale.ts gui/src/helpers/stiColorScale.test.ts gui/src/helpers/index.ts gui/src/store/data/types.ts
git commit -m "feat(gui): shared velocity colour-scale helper for the STI view"
```

---

### Task 2: Shared readout style for the PIV tooltip and STI badge

**Files:**
- Modify: `gui/src/index.css`
- Modify: `gui/src/components/Graphs/drawQuiver.ts`
- Modify: `gui/src/components/components.css`
- Modify: `gui/src/components/StiViewer.tsx`

**Interfaces:**
- Produces: CSS custom properties `--readout-background` and `--readout-border`, defined in all three theme blocks.
- Produces: CSS class `.velocity-readout` carrying the shared box style.
- Consumes: nothing from Task 1.

- [ ] **Step 1: Add the theme properties**

In `gui/src/index.css`, add these two lines to **each** of the three theme blocks — `[data-theme="dark"]` (starts line 10), `[data-theme="light"]` (starts line 76), and `[data-theme="dracula"]` (starts line 142). Add them immediately after that block's existing `--secondary-background-color:` line.

For `[data-theme="dark"]`:

```css
  --readout-background: rgba(50, 50, 50, 0.85);
  --readout-border: #262626;
```

For `[data-theme="light"]`:

```css
  --readout-background: rgba(245, 240, 233, 0.92);
  --readout-border: #C9BFB2;
```

For `[data-theme="dracula"]`:

```css
  --readout-background: rgba(40, 42, 54, 0.9);
  --readout-border: #44475a;
```

The dark values are exactly the literals `drawQuiver.ts` uses today, so the dark theme is pixel-identical after this change. Light and dracula previously got the dark tooltip regardless of theme; they now get a readout that matches their palette.

- [ ] **Step 2: Add the shared class**

In `gui/src/index.css`, append at the end of the file:

```css
/* =============================================================================
   Velocity readout — the PIV arrow tooltip (appended to <body> by drawQuiver.ts)
   and the STI badge. One class so the two cannot drift apart.
   Deliberately sets no font rules: both must inherit the app font identically,
   which is what makes them look like the same control.
   ============================================================================= */
.velocity-readout {
    background: var(--readout-background);
    border: 1px solid var(--readout-border);
    padding: 5px 10px;
    border-radius: 5px;
}
```

- [ ] **Step 3: Switch the PIV tooltip onto the class**

In `gui/src/components/Graphs/drawQuiver.ts`, find the tooltip creation block:

```ts
    tooltip = d3
      .select<HTMLDivElement, unknown>('body')
      .append('div')
      .attr('id', 'quiver-tooltip')
      .style('position', () => 'absolute')
      .style('top', () => '0px')
      .style('background', () => 'rgba(50, 50, 50, 0.85)')
      .style('border', () => '1px solid #262626')
      .style('padding', () => '5px 10px')
      .style('border-radius', () => '5px')
      .style('pointer-events', () => 'none')
      .style('opacity', () => '0');
```

and replace with:

```ts
    tooltip = d3
      .select<HTMLDivElement, unknown>('body')
      .append('div')
      .attr('id', 'quiver-tooltip')
      .attr('class', 'velocity-readout')
      .style('position', () => 'absolute')
      .style('top', () => '0px')
      .style('pointer-events', () => 'none')
      .style('opacity', () => '0');
```

Then find the `mouseover` handler's tooltip call:

```ts
      tooltip
        .html(`${displayVel.toFixed(2)} ${unitLabel}`)
        .style('left', () => event.pageX + 10 + 'px')
        .style('top', () => event.pageY - 28 + 'px')
        .style('background', () => 'rgba(50, 50, 50, 0.85)')
        .style('border', () => '1px solid #262626')
        .style('color', () => d.color)
        .style('z-index', () => '1000');
```

and replace with:

```ts
      tooltip
        .html(`${displayVel.toFixed(2)} ${unitLabel}`)
        .style('left', () => event.pageX + 10 + 'px')
        .style('top', () => event.pageY - 28 + 'px')
        .style('color', () => d.color)
        .style('z-index', () => '1000');
```

**Both `background`/`border` removals are required.** Inline styles beat the class, so leaving the `mouseover` pair in place would keep the hardcoded colours winning on every hover and defeat the theming. **`.style('color', () => d.color)` must stay** — the class supplies the box, not the per-arrow velocity colour.

Note the reuse branch (`else { tooltip.style('opacity', ...) }`) needs no change: an existing `#quiver-tooltip` already carries the class from when it was created.

- [ ] **Step 4: Adopt the class on the STI badge**

In `gui/src/components/StiViewer.tsx`, find:

```tsx
        <div className="sti-badge">
```

and replace with:

```tsx
        <div className="sti-badge velocity-readout">
```

In `gui/src/components/components.css`, find the `.sti-badge` rule and replace the whole rule with:

```css
/* Box style (background, border, padding, radius) and font come from
   .velocity-readout, shared with the PIV arrow tooltip. Only placement and the
   multi-line layout are specific to the badge. */
.sti-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    line-height: 1.5;
}
```

The removed `font-size: 11px` and `font-weight: 600` are intentional: the PIV tooltip sets no font rules and inherits the app default, so the badge must do the same to match it. The badge will render slightly larger than before — that is the requested change, not a regression.

- [ ] **Step 5: Build and verify**

Run: `cd gui && npm run build && npx jest`
Expected: build clean; 100 tests pass.

Verify in the running app:
- Hovering a PIV arrow still shows a tooltip, still coloured by that arrow's velocity, with the same box as before in the dark theme.
- Grep for the removed literals to confirm none remain in these files:
  `grep -n "rgba(50, 50, 50\|#262626" gui/src/components/Graphs/drawQuiver.ts` → no matches.

- [ ] **Step 6: Commit**

```bash
git add gui/src/index.css gui/src/components/Graphs/drawQuiver.ts gui/src/components/components.css gui/src/components/StiViewer.tsx
git commit -m "feat(gui): share one readout style between the PIV tooltip and STI badge"
```

---

### Task 3: STI canvas — three coloured orientation lines, centred frame

**Files:**
- Modify: `gui/src/components/StiViewer.tsx`
- Modify: `gui/src/components/components.css`

**Interfaces:**
- Consumes: `getStiColorScale`, `STI_FALLBACK_COLOR` from `../helpers` (Task 1).
- Consumes: `.velocity-readout` on the badge (Task 2) — already applied; this task only sets the badge's text colour.

- [ ] **Step 1: Replace the local colour memo with the shared helper**

In `gui/src/components/StiViewer.tsx`, change the helpers import. Find:

```tsx
import { createColorMap, Normalize } from '../../commons/vectors';
```

and replace with:

```tsx
import { getStiColorScale, STI_FALLBACK_COLOR } from '../helpers';
```

Then find the whole `stationColors` memo (the `const stationColors = useMemo(...)` block, ending `}, [data?.stiv_velocity_profile, colorbarLimits.default, colorbarLimits.min, colorbarLimits.max]);`) and replace it with:

```tsx
  const { colors: stationColors } = useMemo(
    () => getStiColorScale(data?.stiv_velocity_profile, colorbarLimits),
    [data?.stiv_velocity_profile, colorbarLimits]
  );

  // The lines and the badge must stay visible even where STIV produced no value for
  // this station, so they take the fallback rather than the ticks' 'transparent'.
  const readoutColor =
    stationColors[activeStation] && stationColors[activeStation] !== 'transparent'
      ? stationColors[activeStation]
      : STI_FALLBACK_COLOR;
```

`useMemo` is still imported and used, so its import line is unchanged.

- [ ] **Step 2: Draw three thicker, velocity-coloured lines**

In the same file, find the overlay block:

```tsx
        {angleRad !== null && (
          <svg className="sti-overlay" width={viewW} height={viewH}>
            <line
              x1={viewW / 2 - (Math.cos(angleRad) * Math.min(viewW, viewH) * 0.8) / 2}
              y1={viewH / 2 - (Math.sin(angleRad) * Math.min(viewW, viewH) * 0.8) / 2}
              x2={viewW / 2 + (Math.cos(angleRad) * Math.min(viewW, viewH) * 0.8) / 2}
              y2={viewH / 2 + (Math.sin(angleRad) * Math.min(viewW, viewH) * 0.8) / 2}
              stroke="var(--accent-color)"
              strokeWidth={2}
            />
          </svg>
        )}
```

and replace with:

```tsx
        {angleRad !== null && (
          <svg className="sti-overlay" width={viewW} height={viewH}>
            {/* One line per quarter of the frame width, all at the reported angle, so
                the angle can be checked against streaks in more than one region.
                Each keeps the length the single centre line used. Outer lines may run
                past the frame on steep angles; .sti-frame clips them. */}
            {[0.25, 0.5, 0.75].map((fraction) => {
              const halfLength = (Math.min(viewW, viewH) * 0.8) / 2;
              const cx = viewW * fraction;
              const cy = viewH / 2;
              return (
                <line
                  key={fraction}
                  x1={cx - Math.cos(angleRad) * halfLength}
                  y1={cy - Math.sin(angleRad) * halfLength}
                  x2={cx + Math.cos(angleRad) * halfLength}
                  y2={cy + Math.sin(angleRad) * halfLength}
                  stroke={readoutColor}
                  strokeWidth={3}
                />
              );
            })}
          </svg>
        )}
```

- [ ] **Step 3: Colour the badge text**

In the same file, find:

```tsx
        <div className="sti-badge velocity-readout">
```

and replace with:

```tsx
        <div className="sti-badge velocity-readout" style={{ color: readoutColor }}>
```

- [ ] **Step 4: Centre the STI vertically**

In `gui/src/components/components.css`, find the `.sti-viewer` rule and replace it with:

```css
.sti-viewer {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    height: 100%;
}
```

- [ ] **Step 5: Build, test, verify**

Run: `cd gui && npm run build && npx jest`
Expected: build clean; 100 tests pass.

Verify in the running app, with STIV results and the STIV eye open:
- Three parallel lines at 25/50/75% of the frame width, visibly thicker than before.
- Lines and badge text share the colour of the active station's context tick above.
- The STI sits vertically centred in the media area, at several window sizes.
- Selecting a station with no STIV value still shows visible lines and legible badge text.
- All three themes.

- [ ] **Step 6: Commit**

```bash
git add gui/src/components/StiViewer.tsx gui/src/components/components.css
git commit -m "feat(gui): three velocity-coloured orientation lines, centred STI"
```

---

### Task 4: Carousel vertical alignment in STI mode

**Files:**
- Modify: `gui/src/components/Carousel.tsx`
- Modify: `gui/src/components/components.css`

**Interfaces:** none changed — `Carousel`'s props are untouched. `mode === 'processing'` already identifies STI mode (`Processing.tsx` passes `mode={stiMode ? 'processing' : 'analize'}`).

- [ ] **Step 1: Add the modifier class**

In `gui/src/components/Carousel.tsx`, inside the `Row` component, find:

```tsx
      <div
        key={index}
        className="img-carousel-container"
```

and replace with:

```tsx
      <div
        key={index}
        className={`img-carousel-container${
          mode === 'processing' ? ' img-carousel-container-centered' : ''
        }`}
```

- [ ] **Step 2: Add the centring rule**

In `gui/src/components/components.css`, immediately after the existing `.img-carousel-container` rule, add:

```css
/* STI strips are far wider than they are tall, so inside the fixed row height that
   react-window sets inline they render at the top while .img-water-mark (top: 45%)
   and the carousel arrows sit near the middle — three different vertical positions.
   Centring the strip puts all three on one line.
   The base class is compounded on deliberately: .img-carousel-container sets
   display: inline-block at the same specificity, and relying on source order to win
   would break the moment either rule moves. */
.img-carousel-container.img-carousel-container-centered {
    display: flex;
    align-items: center;
    justify-content: center;
}
```

- [ ] **Step 3: Build, test, verify**

Run: `cd gui && npm run build && npx jest`
Expected: build clean; 100 tests pass.

Verify in the running app:
- With the STIV eye open, each STI strip is vertically centred, with its station number on the strip and the ◀ ▶ arrows on the same centre line.
- The Processing step's normal (LSPIV) carousel is unchanged.
- The Pixel Size and other steps' carousels are unchanged.

- [ ] **Step 4: Commit**

```bash
git add gui/src/components/Carousel.tsx gui/src/components/components.css
git commit -m "fix(gui): centre STI thumbnails with the carousel arrows and number"
```

---

### Task 5: ColorBar in STI mode

**Files:**
- Modify: `gui/src/components/ImageProcessing.tsx`

**Interfaces:**
- Consumes: `getStiColorScale` from `../helpers` (Task 1); `ColorBar` (already imported in this file).

- [ ] **Step 1: Import the helper and the section data**

In `gui/src/components/ImageProcessing.tsx`, find:

```tsx
import { getQuiverValues, createColorMap, Normalize } from '../../commons/vectors';
```

and add a new import line immediately after it:

```tsx
import { getStiColorScale } from '../helpers';
```

Then find:

```tsx
  const { transformationMatrix } = useSectionSlice();
```

and replace with:

```tsx
  const { transformationMatrix, sections, activeSection } = useSectionSlice();
```

- [ ] **Step 2: Render the colorbar in the STI branch**

Find the `stiMode` early return:

```tsx
  if (stiMode) {
    return (
      <div className="image-with-data-container" style={{ width: realWidth, height: realHeight }}>
        <StiViewer
          stiPaths={stiPaths ?? []}
          stiStations={stiStations ?? []}
          activeStation={active}
          containerWidth={realWidth!}
          containerHeight={realHeight! - 90}
        />
      </div>
    );
  }
```

and replace with:

```tsx
  if (stiMode) {
    // Same bounds the STI's ticks, lines, and badge use, so the bar is a legend for
    // exactly what is drawn. ColorBar writes through to the shared colorbarLimits,
    // which is what makes manually locked limits apply to the PIV view too.
    const { min: stiMin, max: stiMax } = getStiColorScale(
      sections[activeSection]?.data?.stiv_velocity_profile,
      colorbarLimits
    );

    return (
      <div className="image-with-data-container" style={{ width: realWidth, height: realHeight }}>
        <StiViewer
          stiPaths={stiPaths ?? []}
          stiStations={stiStations ?? []}
          activeStation={active}
          containerWidth={realWidth!}
          containerHeight={realHeight! - 90}
        />
        {stiMin !== null && stiMax !== null && <ColorBar min={stiMin} max={stiMax} />}
      </div>
    );
  }
```

`colorbarLimits` is already destructured from `useDataSlice()` at the top of this component, so no change is needed there.

- [ ] **Step 3: Build, test, verify**

Run: `cd gui && npm run build && npx jest`
Expected: build clean; 100 tests pass.

Verify in the running app:
- The colorbar appears below the STI, looking exactly like the PIV one.
- Its min/max match the range of STIV's own velocities while limits are automatic.
- Typing a min/max there and switching to the LSPIV view shows the PIV field using those same limits.
- The refresh button returns STIV to its own range.
- A section with no STIV results shows no colorbar rather than a broken one.

- [ ] **Step 4: Commit**

```bash
git add gui/src/components/ImageProcessing.tsx
git commit -m "feat(gui): show the velocity colorbar in the STI view"
```

---

### Task 6: Final cross-check against the spec

**Files:** none (verification-only task)

**Interfaces:** none

- [ ] **Step 1: Re-read the spec's Goals**

Open `gui/docs/superpowers/specs/2026-08-05-sti-view-refinements-design.md` §2 and confirm each bullet holds in the running app.

- [ ] **Step 2: Confirm no hardcoded colours were introduced**

Run:
```bash
grep -nE "#[0-9a-fA-F]{3,6}|rgba?\(" gui/src/components/StiViewer.tsx gui/src/components/Graphs/drawQuiver.ts gui/src/components/ImageProcessing.tsx
```
Expected: no matches in these three files. Colour literals are allowed only in `gui/src/index.css`'s theme blocks.

- [ ] **Step 3: Confirm the theme properties exist in all three themes**

Run:
```bash
grep -c "\-\-readout-background" gui/src/index.css
grep -c "\-\-readout-border" gui/src/index.css
```
Expected: `3` for each (one per theme block).

- [ ] **Step 4: Confirm the PIV tooltip kept its per-arrow colour**

Run:
```bash
grep -n "style('color', () => d.color)" gui/src/components/Graphs/drawQuiver.ts
```
Expected: exactly one match. Losing this line would make every PIV tooltip render in the inherited text colour instead of its velocity colour.

- [ ] **Step 5: Full regression check**

Run: `cd gui && npx jest`
Expected: 100 tests pass across 8 suites.

Run: `cd gui && npx eslint src/helpers/stiColorScale.ts src/components/StiViewer.tsx src/components/ImageProcessing.tsx src/components/Carousel.tsx src/components/Graphs/drawQuiver.ts`
Expected: no errors.

Run: `./venv/bin/python -m pytest --timeout=120 -q --ignore=tests/test_iwave_pipeline.py --ignore=tests/test_cli_video_to_frames.py`
Expected: the same 8 pre-existing failures (`test_compute_section.py`, `test_define_roi_masks.py`, `test_compute_section_cache.py`, all from an unrelated `conftest.py` tablib stub), no new ones. This branch touches no Python.
