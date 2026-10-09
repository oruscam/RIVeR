# Overlay Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every line and pin drawn over a frame (app canvases and exported report) comes from one style module at two sizes, L/R bank pins show in Results (active section) and the report, and no pin head is cut off by the image border.

**Architecture:** A new `Graphs/overlayStyle.ts` holds the size table and a pure `overlayLineParts` (halo + stroke + optional dash/ticks) that `drawOverlayLine` paints with d3. A new `Graphs/pinLean.ts` computes the lean angle and the visible image rectangle; `drawPin` draws the needle/head/label in a rotatable `.pin-arm` group. The drawers (`drawSections`, `drawOblique`, `drawIpcam`, `obliqueSvg`, `ipcamSvg`) switch to these.

**Tech Stack:** React 18 + TypeScript, d3 v7, Jest (ts-jest, `testEnvironment: "node"`, no jsdom).

**Spec:** `docs/superpowers/specs/2026-10-03-overlay-style-design.md`

## Global Constraints

- Work in `/Users/antoine/river_compil/.worktrees/ui-design-refresh/gui` on branch `ui/design-refresh`. Do not merge.
- Commits: concise imperative message, **no `Co-Authored-By` or any trailer**, author email `antoine.patalano@gmail.com` (`git -c user.email=antoine.patalano@gmail.com commit ...`).
- Size table (exact): app line 3 px, halo 6 px `rgba(0, 0, 0, 0.5)`, dash 7.5/9, end ticks 9 px each side at 0.6 × line width, thin line 1 px no halo, pin divisor 1; report = every width halved (1.5, 3, 3.75/4.5, 4.5, 0.75), pin divisor 2.
- Colours do not change; the report gets light-theme colours through `getCSSVar`'s `[data-theme-scope]` lookup (no new colour constant).
- Out of scope: station search lines, velocity vectors, quiver, masks/regions, window-size preview, section name badge styling, ipcam ellipses, each canvas's zoom mechanism.
- Run tests with `npx jest <path>`; the full suite with `npx jest`. Type check: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "src/"` must print nothing.
- Do not run `npx prettier --write` on `src/pages/Report.tsx` (a test pins the one-line `.catch(() => img.src)`).

## Review Focus

1. **Zero-length segment** (a section whose two dir points coincide, or a point pair dragged onto itself): end ticks must not produce `NaN` coordinates. Pinned in Task 1.
2. **Tip outside the bounds** (an ipcam point outside the visible area when zoomed in, or off-image): the pin must point at the centre with a finite angle, never loop or return `NaN`. Pinned in Task 2.
3. **Empty bounds** (frame width/height 0 before layout, or a zero-size report box during the measuring pass): `pinLeanAngle` returns 0. Pinned in Task 2.
4. **Zoomed and panned canvas**: lean must use the visible part of the image, so a pin near the viewport edge leans inward. Pinned in Task 2 (`visibleImageBounds` image-space case).
5. **Results with "see all" off**: inactive sections must not draw L/R pins (the early return must stay ahead of the pin code); the report draws them for its one section. Pinned in Task 3.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/components/Graphs/overlayStyle.ts` (new) | Size table, `overlayLineParts` (pure), `drawOverlayLine` (d3) |
| `src/components/Graphs/overlayStyle.test.ts` (new) | Table, parts, d3 painting via fake selection |
| `src/components/Graphs/pinLean.ts` (new) | `Bounds`, `pinLeanAngle`, `visibleImageBounds` (pure) |
| `src/components/Graphs/pinLean.test.ts` (new) | Lean and bounds cases |
| `src/components/Graphs/testing/fakeSelection.ts` (new) | Minimal d3-selection stand-in for node tests |
| `src/components/Graphs/drawPin.ts` | `.pin-arm` group, `bounds` option, `updatePinLean` |
| `src/components/Graphs/drawPin.test.ts` (new) | Arm rotation and upright label |
| `src/components/CrossSections/drawSections.ts` | Shared lines, report size, L/R pins in results/report, bounds, live lean |
| `src/components/Graphs/drawOblique.ts`, `src/components/DrawOblique.tsx` | Shared lines with zoom, bounds, live lean |
| `src/components/Graphs/drawIpcam.ts`, `src/components/DrawIpcam.tsx` | Thin reprojection line, bounds, live lean |
| `src/components/Graphs/obliqueSvg.ts`, `src/components/Graphs/ipcamSvg.ts` | Report size, bounds, oblique point 1 red |
| `src/components/Report/CalibrationSheet.tsx`, `src/constants/constants.ts` | Drop `pinDivisor`, `METHOD_PIN_DIVISOR`, `MARKS` |
| `src/helpers/overlayStyleGuard.test.ts` (new) | Source guards across drawers |
| `src/components/LineAndText.tsx`, `src/components/Graphs/drawSvgSectionLine.ts` | Deleted |

---

### Task 1: Overlay style module

**Files:**
- Create: `src/components/Graphs/overlayStyle.ts`
- Create: `src/components/Graphs/testing/fakeSelection.ts`
- Test: `src/components/Graphs/overlayStyle.test.ts`

**Interfaces:**
- Produces:
  - `type OverlaySize = 'app' | 'report'`
  - `OVERLAY_STYLE: Record<OverlaySize, { LINE_WIDTH: number; THIN_WIDTH: number; PIN_DIVISOR: number }>`
  - `OVERLAY_RATIOS = { HALO, DASH_ON, DASH_OFF, TICK_HALF_LENGTH, TICK_WIDTH }`, `OVERLAY_HALO_COLOR`
  - `interface LinePart { role: 'halo' | 'stroke' | 'tick'; x1: number; y1: number; x2: number; y2: number; stroke: string; width: number; dash: string | null }`
  - `interface OverlayLineOptions { from: Point; to: Point; color: string; size: OverlaySize; dashed?: boolean; ticks?: boolean; thin?: boolean; zoom?: number }`
  - `overlayLineParts(o: OverlayLineOptions): LinePart[]`
  - `drawOverlayLine(o: OverlayLineOptions & { layer: d3.Selection<SVGGElement, unknown, null, undefined>; className?: string; nonScaling?: boolean }): d3.Selection<SVGGElement, unknown, null, undefined>`
  - `fakeSelection(): FakeSelection` and `interface FakeNode { tag: string; attrs: Record<string, unknown>; text?: string; children: FakeNode[] }` (test helper)

- [ ] **Step 1: Write the test helper**

`src/components/Graphs/testing/fakeSelection.ts`:

```ts
/**
 * A tiny stand-in for a d3 selection, so drawing code can be exercised in
 * Jest's node environment (this repo has no jsdom). It records every
 * appended element and attribute; `select('.cls')` finds a descendant by class.
 */
export interface FakeNode {
  tag: string;
  attrs: Record<string, unknown>;
  text?: string;
  children: FakeNode[];
}

const find = (node: FakeNode, cls: string): FakeNode | null => {
  for (const child of node.children) {
    if (String(child.attrs.class ?? '').split(' ').includes(cls)) return child;
    const deeper = find(child, cls);
    if (deeper) return deeper;
  }
  return null;
};

export const fakeSelection = (node: FakeNode = { tag: 'g', attrs: {}, children: [] }) => {
  const sel = {
    node: () => node,
    append: (tag: string) => {
      const child: FakeNode = { tag, attrs: {}, children: [] };
      node.children.push(child);
      return fakeSelection(child);
    },
    attr: (key: string, value?: unknown) => {
      if (value === undefined) return node.attrs[key];
      node.attrs[key] = value;
      return sel;
    },
    style: () => sel,
    text: (value: string) => {
      node.text = value;
      return sel;
    },
    select: (selector: string) => {
      const found = find(node, selector.replace(/^\./, ''));
      return fakeSelection(found ?? { tag: 'none', attrs: {}, children: [] });
    },
    datum: () => sel,
    call: () => sel,
    raise: () => sel,
  };
  return sel;
};

/** All descendants (depth-first) with the given tag. */
export const allTags = (node: FakeNode, tag: string): FakeNode[] =>
  node.children.flatMap((c) => [...(c.tag === tag ? [c] : []), ...allTags(c, tag)]);
```

- [ ] **Step 2: Write the failing tests**

`src/components/Graphs/overlayStyle.test.ts`:

```ts
import type * as d3 from 'd3';
import { OVERLAY_STYLE, OVERLAY_RATIOS, OVERLAY_HALO_COLOR, overlayLineParts, drawOverlayLine } from './overlayStyle';
import { fakeSelection, allTags } from './testing/fakeSelection';

const seg = { from: { x: 0, y: 0 }, to: { x: 100, y: 0 }, color: '#F5BF61' };

describe('overlay size table', () => {
  test('app and report values from the spec', () => {
    expect(OVERLAY_STYLE.app).toEqual({ LINE_WIDTH: 3, THIN_WIDTH: 1, PIN_DIVISOR: 1 });
    expect(OVERLAY_STYLE.report).toEqual({ LINE_WIDTH: 1.5, THIN_WIDTH: 0.75, PIN_DIVISOR: 2 });
    expect(OVERLAY_RATIOS).toEqual({ HALO: 2, DASH_ON: 2.5, DASH_OFF: 3, TICK_HALF_LENGTH: 3, TICK_WIDTH: 0.6 });
    expect(OVERLAY_HALO_COLOR).toBe('rgba(0, 0, 0, 0.5)');
  });
});

describe('overlayLineParts', () => {
  test('solid app line: halo (6 px) painted before the 3 px stroke', () => {
    const parts = overlayLineParts({ ...seg, size: 'app' });
    expect(parts.map((p) => p.role)).toEqual(['halo', 'stroke']);
    expect(parts[0]).toMatchObject({ stroke: 'rgba(0, 0, 0, 0.5)', width: 6, dash: null, x1: 0, x2: 100 });
    expect(parts[1]).toMatchObject({ stroke: '#F5BF61', width: 3, dash: null });
  });

  test('dashed report line with ticks: halved sizes, dash on halo and stroke, ticks 4.5 px each side', () => {
    const parts = overlayLineParts({ ...seg, size: 'report', dashed: true, ticks: true });
    expect(parts.map((p) => p.role)).toEqual(['halo', 'stroke', 'tick', 'tick']);
    expect(parts[0]).toMatchObject({ width: 3, dash: '3.75,4.5' });
    expect(parts[1]).toMatchObject({ width: 1.5, dash: '3.75,4.5' });
    // horizontal line → vertical ticks at both ends
    expect(parts[2]).toMatchObject({ x1: 0, y1: -4.5, x2: 0, y2: 4.5, dash: null, stroke: '#F5BF61' });
    expect(parts[2].width).toBeCloseTo(0.9); // 1.5 × 0.6 is not exactly 0.9 in floating point
    expect(parts[3]).toMatchObject({ x1: 100, y1: -4.5, x2: 100, y2: 4.5 });
  });

  test('zoom divides every width, dash and tick length', () => {
    const parts = overlayLineParts({ ...seg, size: 'app', dashed: true, ticks: true, zoom: 2 });
    expect(parts[0].width).toBe(3);
    expect(parts[1].width).toBe(1.5);
    expect(parts[1].dash).toBe('3.75,4.5');
    expect(parts[2]).toMatchObject({ y1: -4.5, y2: 4.5 });
    expect(parts[2].width).toBeCloseTo(0.9);
  });

  test('thin line has no halo', () => {
    const parts = overlayLineParts({ ...seg, size: 'app', thin: true });
    expect(parts).toHaveLength(1);
    expect(parts[0]).toMatchObject({ role: 'stroke', width: 1 });
    expect(overlayLineParts({ ...seg, size: 'report', thin: true })[0].width).toBe(0.75);
  });

  test('a zero-length segment gives finite ticks', () => {
    const parts = overlayLineParts({ from: { x: 5, y: 5 }, to: { x: 5, y: 5 }, color: 'red', size: 'app', ticks: true });
    parts.forEach((p) => [p.x1, p.y1, p.x2, p.y2].forEach((v) => expect(Number.isFinite(v)).toBe(true)));
  });
});

describe('drawOverlayLine', () => {
  test('appends one group with the parts as round-capped lines, no pointer events', () => {
    const layer = fakeSelection();
    drawOverlayLine({
      layer: layer as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      ...seg,
      size: 'app',
      dashed: true,
      ticks: true,
      className: 'static-section-line section-a',
      nonScaling: true,
    });
    const group = layer.node().children[0];
    expect(group.tag).toBe('g');
    expect(group.attrs.class).toBe('static-section-line section-a');
    expect(group.attrs['pointer-events']).toBe('none');
    const lines = allTags(layer.node(), 'line');
    expect(lines).toHaveLength(4);
    expect(lines[0].attrs).toMatchObject({ stroke: 'rgba(0, 0, 0, 0.5)', 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-dasharray': '7.5,9', 'vector-effect': 'non-scaling-stroke' });
    expect(lines[1].attrs).toMatchObject({ stroke: '#F5BF61', 'stroke-width': 3 });
    expect(lines[2].attrs['stroke-dasharray']).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest src/components/Graphs/overlayStyle.test.ts`
Expected: FAIL, `Cannot find module './overlayStyle'`.

- [ ] **Step 4: Implement**

`src/components/Graphs/overlayStyle.ts`:

```ts
import type * as d3 from 'd3';

/**
 * One way to draw a line over a frame, at two sizes: the app canvases and the
 * exported report (spec 2026-10-03-overlay-style). Every overlay line is a
 * coloured stroke over a dark halo so it reads on bright water and dark grass;
 * the report size halves every width for its small printed frames.
 */
export type OverlaySize = 'app' | 'report';

type Point = { x: number; y: number };

export const OVERLAY_STYLE: Record<OverlaySize, { LINE_WIDTH: number; THIN_WIDTH: number; PIN_DIVISOR: number }> = {
  app: { LINE_WIDTH: 3, THIN_WIDTH: 1, PIN_DIVISOR: 1 },
  report: { LINE_WIDTH: 1.5, THIN_WIDTH: 0.75, PIN_DIVISOR: 2 },
};

/** Multiples of the line width, so both sizes keep the same proportions. */
export const OVERLAY_RATIOS = { HALO: 2, DASH_ON: 2.5, DASH_OFF: 3, TICK_HALF_LENGTH: 3, TICK_WIDTH: 0.6 };

export const OVERLAY_HALO_COLOR = 'rgba(0, 0, 0, 0.5)';

export interface LinePart {
  role: 'halo' | 'stroke' | 'tick';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  width: number;
  dash: string | null;
}

export interface OverlayLineOptions {
  from: Point;
  to: Point;
  color: string;
  size: OverlaySize;
  /** Section transect dash, on halo and stroke. */
  dashed?: boolean;
  /** Perpendicular ticks at both ends (section transect). */
  ticks?: boolean;
  /** Thin reference line (ipcam reprojection): no halo. */
  thin?: boolean;
  /** Divides every width, dash and tick length, for layers inside a scale() transform. */
  zoom?: number;
}

export const overlayLineParts = ({
  from,
  to,
  color,
  size,
  dashed = false,
  ticks = false,
  thin = false,
  zoom = 1,
}: OverlayLineOptions): LinePart[] => {
  const style = OVERLAY_STYLE[size];
  const w = (thin ? style.THIN_WIDTH : style.LINE_WIDTH) / zoom;
  const segment = { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
  const dash = dashed ? `${w * OVERLAY_RATIOS.DASH_ON},${w * OVERLAY_RATIOS.DASH_OFF}` : null;

  const parts: LinePart[] = [];
  if (!thin) parts.push({ role: 'halo', ...segment, stroke: OVERLAY_HALO_COLOR, width: w * OVERLAY_RATIOS.HALO, dash });
  parts.push({ role: 'stroke', ...segment, stroke: color, width: w, dash });

  if (ticks) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    // A zero-length segment has no direction: fall back to a vertical tick instead of NaN.
    const len = Math.hypot(dx, dy);
    const px = len === 0 ? 0 : -dy / len;
    const py = len === 0 ? 1 : dx / len;
    const half = w * OVERLAY_RATIOS.TICK_HALF_LENGTH;
    [from, to].forEach((p) =>
      parts.push({
        role: 'tick',
        x1: p.x - px * half,
        y1: p.y - py * half,
        x2: p.x + px * half,
        y2: p.y + py * half,
        stroke: color,
        width: w * OVERLAY_RATIOS.TICK_WIDTH,
        dash: null,
      })
    );
  }
  return parts;
};

/**
 * Paints `overlayLineParts` into a new <g> on `layer` and returns it.
 * `nonScaling` keeps widths in screen pixels inside a zoomed layer (the
 * cross-section layers use this instead of `zoom`).
 */
export const drawOverlayLine = ({
  layer,
  className = '',
  nonScaling = false,
  ...options
}: OverlayLineOptions & {
  layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  className?: string;
  nonScaling?: boolean;
}) => {
  const group = layer.append('g').attr('class', className).attr('pointer-events', 'none');
  overlayLineParts(options).forEach((p) => {
    group
      .append('line')
      .attr('class', `ov-${p.role}`)
      .attr('x1', p.x1)
      .attr('y1', p.y1)
      .attr('x2', p.x2)
      .attr('y2', p.y2)
      .attr('stroke', p.stroke)
      .attr('stroke-width', p.width)
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', p.dash)
      .attr('vector-effect', nonScaling ? 'non-scaling-stroke' : null);
  });
  return group;
};
```

Note on the fake: `attr(key, null)` must store `null` (the fake's `value === undefined` check only treats a missing value as a getter), which is what the `stroke-dasharray` assertion relies on.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/components/Graphs/overlayStyle.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/Graphs/overlayStyle.ts src/components/Graphs/overlayStyle.test.ts src/components/Graphs/testing/fakeSelection.ts
git -c user.email=antoine.patalano@gmail.com commit -m "Add the shared overlay line style: halo, dash and ticks at app and report sizes"
```

---

### Task 2: Pin lean

**Files:**
- Create: `src/components/Graphs/pinLean.ts`
- Test: `src/components/Graphs/pinLean.test.ts`
- Modify: `src/components/Graphs/drawPin.ts`
- Test: `src/components/Graphs/drawPin.test.ts` (new)

**Interfaces:**
- Consumes: `PIN_BASE`, `getPinGeometry` from `./pinGeometry` (unchanged); `fakeSelection`, `allTags` from Task 1.
- Produces:
  - `interface Bounds { x: number; y: number; width: number; height: number }`
  - `pinLeanAngle(tip: Point, divisor?: number, bounds?: Bounds): number` (degrees, 0 = upright, positive = clockwise)
  - `visibleImageBounds(view: { width: number; height: number; position: Point; scale: number }, space: 'screen' | 'image'): Bounds`
  - `DrawPinOptions.bounds?: Bounds`
  - `updatePinLean(pin: d3.Selection<SVGGElement, unknown, null, undefined>, liveTip: Point, divisor: number, bounds: Bounds | undefined): void`

- [ ] **Step 1: Write the failing lean tests**

`src/components/Graphs/pinLean.test.ts`:

```ts
import { pinLeanAngle, visibleImageBounds } from './pinLean';

const B = { x: 0, y: 0, width: 400, height: 300 };

describe('pinLeanAngle', () => {
  test('upright without bounds, or when the head fits', () => {
    expect(pinLeanAngle({ x: 100, y: 5 })).toBe(0);
    expect(pinLeanAngle({ x: 100, y: 100 }, 1, B)).toBe(0);
    expect(pinLeanAngle({ x: 100, y: 48 }, 1, B)).toBe(0); // head top = 48 - 34 - 12 = 2 = margin
  });

  test('just below the top edge: the smallest lean that fits', () => {
    expect(pinLeanAngle({ x: 100, y: 46 }, 1, B)).toBe(20);
  });

  test('at the top edge it leans toward the centre side', () => {
    expect(pinLeanAngle({ x: 100, y: 5 }, 1, B)).toBe(106);
    expect(pinLeanAngle({ x: 300, y: 5 }, 1, B)).toBe(-106);
  });

  test('side edges and a corner', () => {
    expect(pinLeanAngle({ x: 5, y: 150 }, 1, B)).toBe(16);
    expect(pinLeanAngle({ x: 395, y: 150 }, 1, B)).toBe(-16);
    expect(pinLeanAngle({ x: 5, y: 5 }, 1, B)).toBe(106);
  });

  test('an exact tie goes clockwise', () => {
    expect(pinLeanAngle({ x: 200, y: 5 }, 1, B)).toBe(106);
  });

  test('the divisor shrinks the pin before fitting', () => {
    expect(pinLeanAngle({ x: 100, y: 3 }, 2, B)).toBe(104);
  });

  test('nothing fits: point at the centre, finite', () => {
    expect(pinLeanAngle({ x: 2, y: 2 }, 1, { x: 0, y: 0, width: 20, height: 20 })).toBeCloseTo(135);
    expect(pinLeanAngle({ x: 500, y: 150 }, 1, B)).toBeCloseTo(-90); // tip outside the bounds
  });

  test('empty bounds (before layout) stay upright', () => {
    expect(pinLeanAngle({ x: 0, y: 0 }, 1, { x: 0, y: 0, width: 0, height: 0 })).toBe(0);
  });
});

describe('visibleImageBounds', () => {
  const view = { width: 400, height: 300, position: { x: 0, y: 0 }, scale: 1 };

  test('at zoom 1 the whole image, in both spaces', () => {
    expect(visibleImageBounds(view, 'screen')).toEqual({ x: 0, y: 0, width: 400, height: 300 });
    expect(visibleImageBounds(view, 'image')).toEqual({ x: 0, y: 0, width: 400, height: 300 });
  });

  test('zoomed 2× about the centre: the screen is full, the image shows its middle half', () => {
    const z = { ...view, scale: 2 };
    expect(visibleImageBounds(z, 'screen')).toEqual({ x: 0, y: 0, width: 400, height: 300 });
    expect(visibleImageBounds(z, 'image')).toEqual({ x: 100, y: 75, width: 200, height: 150 });
  });

  test('panned right by 50 at 2×', () => {
    const z = { ...view, scale: 2, position: { x: 50, y: 0 } };
    expect(visibleImageBounds(z, 'image')).toEqual({ x: 75, y: 75, width: 200, height: 150 });
  });

  test('zoomed out (scale < 1): the screen rect shrinks to the image', () => {
    const z = { ...view, scale: 0.5 };
    expect(visibleImageBounds(z, 'screen')).toEqual({ x: 100, y: 75, width: 200, height: 150 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/components/Graphs/pinLean.test.ts`
Expected: FAIL, `Cannot find module './pinLean'`.

- [ ] **Step 3: Implement `pinLean.ts`**

`src/components/Graphs/pinLean.ts`:

```ts
import { PIN_BASE } from './pinGeometry';

type Point = { x: number; y: number };

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Gap kept between the head and the bounds' edge, at divisor 1. */
const MARGIN = 2;

const headCentre = (tip: Point, angle: number, armLength: number) => {
  const rad = (angle * Math.PI) / 180;
  return { x: tip.x + armLength * Math.sin(rad), y: tip.y - armLength * Math.cos(rad) };
};

/**
 * How far a pin leans so its head stays inside `bounds` (spec §2): 0 when the
 * upright head fits, else the smallest whole-degree turn about the tip that
 * fits (nearest-to-centre side on a tie, clockwise on an exact tie), else
 * straight at the centre. Degrees, positive = clockwise on screen, which is
 * what an SVG rotate() takes.
 */
export const pinLeanAngle = (tip: Point, divisor: number = 1, bounds?: Bounds): number => {
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return 0;
  const arm = PIN_BASE.HEAD_OFFSET_Y / divisor;
  const r = PIN_BASE.HEAD_RADIUS / divisor;
  const m = MARGIN / divisor;
  const left = bounds.x + m + r;
  const right = bounds.x + bounds.width - m - r;
  const top = bounds.y + m + r;
  const bottom = bounds.y + bounds.height - m - r;
  const fits = (angle: number) => {
    const c = headCentre(tip, angle, arm);
    return c.x >= left && c.x <= right && c.y >= top && c.y <= bottom;
  };
  if (fits(0)) return 0;

  const centre = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const distanceToCentre = (angle: number) => {
    const c = headCentre(tip, angle, arm);
    return Math.hypot(c.x - centre.x, c.y - centre.y);
  };
  for (let step = 1; step <= 180; step++) {
    const cw = fits(step);
    const ccw = fits(-step);
    if (cw && ccw) return distanceToCentre(step) <= distanceToCentre(-step) ? step : -step;
    if (cw) return step;
    if (ccw) return -step;
  }
  const dx = centre.x - tip.x;
  const dy = centre.y - tip.y;
  if (dx === 0 && dy === 0) return 0;
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
};

/**
 * The part of the image currently on screen, for a canvas whose zoom layer is
 * `translate(position) translate(c) scale(scale) translate(-c)` (OverlaySvg)
 * and whose viewport is the image's display size. `screen` gives it in the
 * viewport's pixels (pins in the UI layer); `image` gives it in the zoom
 * layer's own coordinates (pins inside the scaled layer).
 */
export const visibleImageBounds = (
  view: { width: number; height: number; position: Point; scale: number },
  space: 'screen' | 'image'
): Bounds => {
  const { width, height, position, scale } = view;
  const cx = width / 2;
  const cy = height / 2;
  if (space === 'screen') {
    const x0 = Math.max(0, position.x + cx - cx * scale);
    const x1 = Math.min(width, position.x + cx + cx * scale);
    const y0 = Math.max(0, position.y + cy - cy * scale);
    const y1 = Math.min(height, position.y + cy + cy * scale);
    return { x: x0, y: y0, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) };
  }
  const toImage = (s: number, pos: number, c: number) => c + (s - pos - c) / scale;
  const x0 = Math.max(0, toImage(0, position.x, cx));
  const x1 = Math.min(width, toImage(width, position.x, cx));
  const y0 = Math.max(0, toImage(0, position.y, cy));
  const y1 = Math.min(height, toImage(height, position.y, cy));
  return { x: x0, y: y0, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) };
};
```

- [ ] **Step 4: Run lean tests**

Run: `npx jest src/components/Graphs/pinLean.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Write the failing drawPin tests**

`src/components/Graphs/drawPin.test.ts`:

```ts
import type * as d3 from 'd3';
import { drawPin, updatePinLean } from './drawPin';
import { fakeSelection, allTags } from './testing/fakeSelection';

type G = d3.Selection<SVGGElement, unknown, null, undefined>;
const B = { x: 0, y: 0, width: 400, height: 300 };

describe('drawPin lean', () => {
  test('an upright pin has an arm group with no transform', () => {
    const layer = fakeSelection();
    drawPin({ layer: layer as unknown as G, tip: { x: 100, y: 100 }, kind: 'point', label: '1', bounds: B });
    const arm = layer.select('.pin-arm').node();
    expect(arm.tag).toBe('g');
    expect(arm.attrs.transform).toBeNull();
  });

  test('near the top edge the arm rotates about the tip and the label is counter-rotated about the head centre', () => {
    const layer = fakeSelection();
    drawPin({ layer: layer as unknown as G, tip: { x: 100, y: 5 }, kind: 'left', label: 'L', bounds: B });
    const arm = layer.select('.pin-arm').node();
    expect(arm.attrs.transform).toBe('rotate(106, 100, 5)');
    const label = layer.select('.pin-label').node();
    expect(label.attrs.transform).toBe('rotate(-106, 100, -29)'); // head centre = 5 - 34
  });

  test('the ring and centre dot stay outside the arm, on the tip', () => {
    const layer = fakeSelection();
    drawPin({ layer: layer as unknown as G, tip: { x: 100, y: 5 }, kind: 'point', bounds: B });
    const arm = layer.select('.pin-arm').node();
    const armCircles = allTags(arm, 'circle');
    const all = allTags(layer.node(), 'circle');
    const outside = all.filter((c) => !armCircles.includes(c));
    outside.forEach((c) => {
      expect(c.attrs.cx).toBe(100);
      expect(c.attrs.cy).toBe(5);
    });
  });

  test('updatePinLean re-leans a dragged pin about the tip it was drawn at', () => {
    const layer = fakeSelection();
    const pin = drawPin({ layer: layer as unknown as G, tip: { x: 100, y: 100 }, kind: 'point', label: '2', bounds: B });
    updatePinLean(pin, { x: 100, y: 5 }, 1, B);
    expect(layer.select('.pin-arm').node().attrs.transform).toBe('rotate(106, 100, 100)');
    expect(layer.select('.pin-label').node().attrs.transform).toBe('rotate(-106, 100, 66)');
    updatePinLean(pin, { x: 100, y: 150 }, 1, B);
    expect(layer.select('.pin-arm').node().attrs.transform).toBeNull();
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx jest src/components/Graphs/drawPin.test.ts`
Expected: FAIL (`updatePinLean` is not exported; no `.pin-arm`).

- [ ] **Step 7: Rework `drawPin.ts`**

Replace the body of `src/components/Graphs/drawPin.ts` from the imports to the end with:

```ts
import * as d3 from 'd3';
import { Point } from '../../types';
import { getPinGeometry, PIN_BASE } from './pinGeometry';
import { getPinColors } from '../../helpers/getCSSVar';
import { pinLeanAngle, type Bounds } from './pinLean';

export type PinKind = 'left' | 'right' | 'point' | 'muted';

export interface DrawPinOptions {
  /** Group (or layer) to append the pin into. */
  layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  /** The exact pixel this pin marks — the crosshair's centre. */
  tip: Point;
  kind: PinKind;
  /** Short glyph drawn inside the head (e.g. "L", "R", "1"). Omit for no label. */
  label?: string;
  /** Divides every dimension — see pinGeometry.ts's `getPinGeometry` doc. */
  divisor?: number;
  /** Extra class(es) appended to the root <g>, e.g. for later selection/cleanup. */
  className?: string;
  /** Draws a thin accent ring around the head — ipcam's "currently selected
   *  for editing" state, which no longer gets its own pin colour. */
  active?: boolean;
  /** The visible image, in the layer's coordinates. When the upright head
   *  would cross its edge the pin leans inward (pinLean.ts). */
  bounds?: Bounds;
}

const HALO = 'rgba(0, 0, 0, 0.6)';
const WHITE = '#fff';

/** Rotates the arm about the tip it was drawn at and keeps the label upright. */
const applyLean = (pin: d3.Selection<SVGGElement, unknown, null, undefined>, angle: number) => {
  const tipX = Number(pin.attr('data-tip-x'));
  const tipY = Number(pin.attr('data-tip-y'));
  const headY = Number(pin.attr('data-head-y'));
  pin.select('.pin-arm').attr('transform', angle === 0 ? null : `rotate(${angle}, ${tipX}, ${tipY})`);
  pin.select('.pin-label').attr('transform', angle === 0 ? null : `rotate(${-angle}, ${tipX}, ${headY})`);
};

/**
 * Paints one push-pin: a crosshair at the tip whose centre is the exact pixel,
 * and an arm (needle, coloured head, optional label) that stands straight up,
 * or leans inward when `bounds` says the head would leave the image. Every
 * stroked part gets a dark halo under a white line, so the pin reads on both
 * bright water and dark shade. Returns the root <g> so the caller can attach
 * drag behaviour to it.
 */
export const drawPin = (options: DrawPinOptions): d3.Selection<SVGGElement, unknown, null, undefined> => {
  const { layer, tip, kind, label, divisor = 1, className = '', active = false, bounds } = options;
  const geo = getPinGeometry(tip, divisor);
  const colors = getPinColors();
  const fill = colors[kind];
  const d = (n: number) => n / divisor;

  const g = layer
    .append('g')
    .attr('class', `pin pin-${kind} ${className}`.trim())
    .attr('data-tip-x', tip.x)
    .attr('data-tip-y', tip.y)
    .attr('data-head-y', geo.head.cy);

  // Crosshair ring at the tip: halo then white ring.
  g.append('circle')
    .attr('cx', geo.ring.cx)
    .attr('cy', geo.ring.cy)
    .attr('r', geo.ring.r)
    .attr('fill', 'none')
    .attr('stroke', HALO)
    .attr('stroke-width', d(PIN_BASE.RING_HALO_WIDTH));
  g.append('circle')
    .attr('cx', geo.ring.cx)
    .attr('cy', geo.ring.cy)
    .attr('r', geo.ring.r)
    .attr('fill', 'none')
    .attr('stroke', WHITE)
    .attr('stroke-width', d(PIN_BASE.RING_WIDTH));

  // Three ticks (left/right/bottom — the needle stands in for the fourth, top, tick).
  ([geo.ticks.left, geo.ticks.right, geo.ticks.bottom] as const).forEach((tick) => {
    g.append('line')
      .attr('x1', tick.x1)
      .attr('y1', tick.y1)
      .attr('x2', tick.x2)
      .attr('y2', tick.y2)
      .attr('stroke', WHITE)
      .attr('stroke-width', d(PIN_BASE.TICK_WIDTH))
      .attr('stroke-linecap', 'round');
  });

  // Centre dot — the exact pixel that gets saved.
  g.append('circle')
    .attr('cx', geo.centerDot.x)
    .attr('cy', geo.centerDot.y)
    .attr('r', d(PIN_BASE.CENTER_DOT_RADIUS))
    .attr('fill', WHITE);

  // The arm leans as one piece; drawn upright, rotated by applyLean.
  const arm = g.append('g').attr('class', 'pin-arm');

  // Needle: halo then white line, from the head's bottom edge to the ring's top edge.
  arm
    .append('line')
    .attr('x1', geo.needle.x)
    .attr('x2', geo.needle.x)
    .attr('y1', geo.needle.y1)
    .attr('y2', geo.needle.y2)
    .attr('stroke', HALO)
    .attr('stroke-width', d(PIN_BASE.NEEDLE_HALO_WIDTH))
    .attr('stroke-linecap', 'round');
  arm
    .append('line')
    .attr('x1', geo.needle.x)
    .attr('x2', geo.needle.x)
    .attr('y1', geo.needle.y1)
    .attr('y2', geo.needle.y2)
    .attr('stroke', WHITE)
    .attr('stroke-width', d(PIN_BASE.NEEDLE_WIDTH))
    .attr('stroke-linecap', 'round');

  // Head: an optional accent ring for "active", halo then coloured fill with a white border, then the label.
  if (active) {
    arm
      .append('circle')
      .attr('cx', geo.head.cx)
      .attr('cy', geo.head.cy)
      .attr('r', geo.head.r + d(3))
      .attr('fill', 'none')
      .attr('stroke', 'var(--accent-color, #58B8F0)')
      .attr('stroke-width', d(2));
  }
  arm
    .append('circle')
    .attr('cx', geo.head.cx)
    .attr('cy', geo.head.cy)
    .attr('r', geo.head.r)
    .attr('fill', fill)
    .attr('stroke', HALO)
    .attr('stroke-width', d(PIN_BASE.HEAD_HALO_WIDTH));
  arm
    .append('circle')
    .attr('cx', geo.head.cx)
    .attr('cy', geo.head.cy)
    .attr('r', geo.head.r)
    .attr('fill', fill)
    .attr('stroke', WHITE)
    .attr('stroke-width', d(PIN_BASE.HEAD_BORDER_WIDTH));

  if (label) {
    arm
      .append('text')
      .attr('class', 'pin-label')
      .attr('x', geo.label.x)
      .attr('y', geo.label.y)
      .attr('text-anchor', 'middle')
      .attr('font-size', d(PIN_BASE.LABEL_FONT_SIZE))
      .attr('font-weight', 700)
      .attr('fill', colors.ink)
      .attr('pointer-events', 'none')
      .text(label);
  }

  applyLean(g, pinLeanAngle(tip, divisor, bounds));
  return g;
};

/**
 * Re-leans a pin while it is dragged. The pin's root <g> is moved with a
 * translate() by the drag handlers, so the arm still rotates about the tip it
 * was drawn at; only the angle follows the live tip.
 */
export const updatePinLean = (
  pin: d3.Selection<SVGGElement, unknown, null, undefined>,
  liveTip: Point,
  divisor: number,
  bounds: Bounds | undefined
) => applyLean(pin, pinLeanAngle(liveTip, divisor, bounds));
```

The fake's `select('.pin-label')` returns an empty node when there is no label; setting `transform` on it is harmless. Real d3 likewise ignores `.attr` on an empty selection.

- [ ] **Step 8: Run pin tests and the existing geometry tests**

Run: `npx jest src/components/Graphs`
Expected: PASS (`pinGeometry.test.ts` unchanged and green, plus the new files).

- [ ] **Step 9: Commit**

```bash
git add src/components/Graphs/pinLean.ts src/components/Graphs/pinLean.test.ts src/components/Graphs/drawPin.ts src/components/Graphs/drawPin.test.ts
git -c user.email=antoine.patalano@gmail.com commit -m "Lean pins inward when their head would leave the image"
```

---

### Task 3: Cross-section drawing (Cross Sections, Processing, Results, report, UAV)

**Files:**
- Modify: `src/components/CrossSections/drawSections.ts`
- Test: `src/helpers/overlayStyleGuard.test.ts` (new; Task 6 adds more cases to it)

**Interfaces:**
- Consumes: `drawOverlayLine`, `OVERLAY_STYLE`, `OverlaySize` (Task 1); `visibleImageBounds`, `Bounds` (Task 2); `drawPin`, `updatePinLean` (Task 2).
- Produces: unchanged exports `drawStaticSection`, `drawInteractiveSection`, `getResizedPoint`.

- [ ] **Step 1: Write the failing source tests**

`src/helpers/overlayStyleGuard.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

describe('drawSections uses the shared overlay style', () => {
  const src = read('src/components/CrossSections/drawSections.ts');
  test('lines go through drawOverlayLine; no own stroke widths or resize factor', () => {
    expect(src).toContain('drawOverlayLine(');
    expect(src).not.toMatch(/\.attr\('stroke-width'/);
    expect(src).not.toContain('resizeFactor');
  });
  test('L/R pins: x-sections and report always, results only for the active section', () => {
    expect(src).toMatch(/module === 'x-sections' \|\| module === 'report' \|\| \(module === 'results' && isActive\)/);
  });
  test('the "see all off" early return for inactive results sections stays ahead of the pins', () => {
    expect(src.indexOf("seeAll === false && !isActive && module === 'results'")).toBeLessThan(src.indexOf('showBankPins'));
  });
  test('every pin gets bounds, and dragged pins re-lean', () => {
    expect(src).toContain("visibleImageBounds(");
    expect(src.match(/updatePinLean\(/g)?.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/helpers/overlayStyleGuard.test.ts`
Expected: FAIL on all four tests.

- [ ] **Step 3: Imports and styles**

In `src/components/CrossSections/drawSections.ts`, change the imports at the top to:

```ts
import { BankLabels, resolvePinLabel } from '../../helpers/pinLabel';
import * as d3 from 'd3';
import { COLORS } from '../../constants/constants';
import { drawPin, PinKind, updatePinLean } from '../Graphs/drawPin';
import { showMagnifier, hideMagnifier } from '../Graphs/drawMagnifier';
import { drawOverlayLine, OVERLAY_STYLE, type OverlaySize } from '../Graphs/overlayStyle';
import { visibleImageBounds, type Bounds } from '../Graphs/pinLean';
```

Replace `getSectionStyles` (the whole function, lines ~57-105) with:

```ts
/**
 * Colour and size by module. Widths live in overlayStyle.ts; only the report
 * draws at report size.
 */
const getSectionStyles = (module: string) => {
  let lineColor = COLORS.BLACK;
  let textColor = COLORS.BLACK;

  switch (module) {
    case 'uav':
      lineColor = COLORS.LIGHT_BLUE;
      textColor = COLORS.MARK_R;
      break;
    case 'x-sections':
    case 'results':
    case 'report':
      lineColor = COLORS.YELLOW;
      textColor = COLORS.YELLOW;
      break;
    case 'processing':
      lineColor = COLORS.DARK_GREY;
      textColor = COLORS.BLACK;
      break;
    default:
      break;
  }

  const size: OverlaySize = module === 'report' ? 'report' : 'app';
  return { size, lineColor, textColor };
};
```

- [ ] **Step 4: Replace `drawLine` with a thin wrapper**

Replace the whole `drawLine` function and its doc comment (lines ~107-193) with:

```ts
/**
 * A section line in "image space" divided by fx/fy (pass 1/1 for points
 * already in zoom space). The dashed transect gets end ticks so it reads as a
 * measurement line; the solid direction line does not. Widths stay in screen
 * pixels inside the zoom layer (non-scaling stroke), as before.
 */
const drawLine = ({
  points,
  group,
  color,
  size,
  fx,
  fy,
  dashed = false,
  className,
}: {
  points: [Point, Point];
  group: d3.Selection<SVGGElement, unknown, null, undefined>;
  color: string;
  size: OverlaySize;
  fx: number;
  fy: number;
  dashed?: boolean;
  className: string;
}) =>
  drawOverlayLine({
    layer: group,
    from: { x: points[0].x / fx, y: points[0].y / fy },
    to: { x: points[1].x / fx, y: points[1].y / fy },
    color,
    size,
    dashed,
    ticks: dashed,
    className,
    nonScaling: true,
  });
```

- [ ] **Step 5: `drawIcon` takes size and bounds**

Replace `drawIcon` with:

```ts
const drawIcon = (
  position: Point,
  type: 'L' | 'R',
  layer: d3.Selection<SVGGElement, unknown, null, undefined>,
  draggable: boolean,
  extraClass: string = '',
  module: string,
  bankLabels?: BankLabels,
  size: OverlaySize = 'app',
  bounds?: Bounds
) => {
  const isLeft = type === 'L';
  const kind: PinKind = module === 'uav' ? 'point' : isLeft ? 'left' : 'right';
  const label = resolvePinLabel(module, type, bankLabels);

  const g = drawPin({
    layer,
    tip: position,
    kind,
    label,
    divisor: OVERLAY_STYLE[size].PIN_DIVISOR,
    bounds,
    className: `pin-${draggable ? 'draggable' : 'static'} pin-${type} ${extraClass}`.trim(),
  });
  g.attr('cursor', draggable ? 'move' : 'default').attr('pointer-events', draggable ? 'all' : 'none');

  return g;
};
```

- [ ] **Step 6: `drawSectionLabel` without `resizeFactor`**

In `drawSectionLabel`: remove `resizeFactor,` from the destructured parameters, remove `resizeFactor: number;` from its type, and change `const FONT_SIZE = 13 / resizeFactor;` to `const FONT_SIZE = 13;`. (It is never called for the report, so the factor was always 1.)

- [ ] **Step 7: `drawStaticSection`**

In `drawStaticSection`:

1. Change `const { resizeFactor, lineColor, textColor } = getSectionStyles(module);` to `const { size, lineColor, textColor } = getSectionStyles(module);`
2. In both `drawLine({...})` calls replace `resizeFactor,` with `size,`.
3. In the `drawSectionLabel({...})` call remove the `resizeFactor,` line.
4. Replace the final "Icons in UI" block:

```ts
  // Icons in UI (screen space) — only when not deferring to interactive layer
  if (!skipLine && module === 'x-sections' && hasMeaningfulDirPoints) {
    const toScreen = toScreenFactory({ imageWidth, imageHeight, position, scale, fx, fy });
    const p0 = toScreen(dirPoints[0]);
    const p1 = toScreen(dirPoints[1]);

    drawIcon(p0, 'L', uiLayer, false, sectionClass, module, bankLabels);
    drawIcon(p1, 'R', uiLayer, false, sectionClass, module, bankLabels);
  }
```

with:

```ts
  // Bank pins in UI (screen space). Results shows them on the active section
  // only (several sections can be drawn at once); the report's frame shows
  // one section, so it always gets them.
  const showBankPins = module === 'x-sections' || module === 'report' || (module === 'results' && isActive);
  if (!skipLine && showBankPins && hasMeaningfulDirPoints) {
    const toScreen = toScreenFactory({ imageWidth, imageHeight, position, scale, fx, fy });
    const p0 = toScreen(dirPoints[0]);
    const p1 = toScreen(dirPoints[1]);
    const bounds = visibleImageBounds({ width: imageWidth, height: imageHeight, position, scale }, 'screen');

    drawIcon(p0, 'L', uiLayer, false, sectionClass, module, bankLabels, size, bounds);
    drawIcon(p1, 'R', uiLayer, false, sectionClass, module, bankLabels, size, bounds);
  }
```

- [ ] **Step 8: `drawInteractiveSection`**

1. Change `const { resizeFactor, lineColor } = getSectionStyles(module);` to `const { size, lineColor } = getSectionStyles(module);`
2. In both `drawLine({...})` calls replace `resizeFactor,` with `size,`.
3. After the `toScreenFromZoom` declaration add:

```ts
  const bounds = visibleImageBounds(
    { width: viewport.imageWidth, height: viewport.imageHeight, position: viewport.position, scale: viewport.scale },
    'screen'
  );
```

4. In the start-point `'drag'` handler, inside `if (startScreenAtDraw) { ... }` after the `.attr('transform', ...)` call, add:

```ts
        updatePinLean(d3.select<SVGGElement, unknown>(this), pScreen, OVERLAY_STYLE[size].PIN_DIVISOR, bounds);
```

5. Same in the end-point `'drag'` handler inside `if (endScreenAtDraw) { ... }`:

```ts
        updatePinLean(d3.select<SVGGElement, unknown>(this), pScreen, OVERLAY_STYLE[size].PIN_DIVISOR, bounds);
```

6. Pass size and bounds to both interactive `drawIcon` calls:

```ts
    const c1 = drawIcon(pScreen, 'L', uiLayer, true, `${sectionClass} ${interactiveUiClass}`, module, bankLabels, size, bounds);
```

```ts
    const c2 = drawIcon(pScreen, 'R', uiLayer, true, `${sectionClass} ${interactiveUiClass}`, module, bankLabels, size, bounds);
```

- [ ] **Step 9: Run tests and type check**

Run: `npx jest src/helpers/overlayStyleGuard.test.ts src/components/Graphs && npx tsc --noEmit -p tsconfig.json 2>&1 | grep "src/"`
Expected: tests PASS; tsc prints nothing.

- [ ] **Step 10: Commit**

```bash
git add src/components/CrossSections/drawSections.ts src/helpers/overlayStyleGuard.test.ts
git -c user.email=antoine.patalano@gmail.com commit -m "Draw section lines in the shared style, show bank pins in Results and the report, lean pins at the border"
```

---

### Task 4: Oblique and ipcam canvases

**Files:**
- Modify: `src/components/Graphs/drawOblique.ts`, `src/components/DrawOblique.tsx`
- Modify: `src/components/Graphs/drawIpcam.ts`, `src/components/DrawIpcam.tsx`
- Modify: `src/constants/constants.ts` (delete `MARKS`)
- Test: `src/helpers/overlayStyleGuard.test.ts`

**Interfaces:**
- Consumes: `drawOverlayLine` (Task 1); `visibleImageBounds` (Task 2); `drawPin` with `bounds`, `updatePinLean` (Task 2).
- Produces: `drawOblique` and `drawIpcam` each take a new required prop `position: { x: number; y: number }`.

- [ ] **Step 1: Add failing guard tests**

Append to `src/helpers/overlayStyleGuard.test.ts`:

```ts
describe('oblique and ipcam canvases use the shared overlay style', () => {
  const oblique = read('src/components/Graphs/drawOblique.ts');
  const ipcam = read('src/components/Graphs/drawIpcam.ts');
  test('distance lines and the reprojection line go through drawOverlayLine', () => {
    expect(oblique.match(/drawOverlayLine\(/g)?.length).toBe(2);
    expect(oblique).not.toMatch(/\.attr\('stroke-width'/);
    expect(ipcam).toMatch(/drawOverlayLine\(\{[\s\S]*thin: true/);
    // the only literal width left in drawIpcam is the confidence ellipse (out of scope)
    expect(ipcam.match(/\.attr\('stroke-width'/g)?.length).toBe(1);
  });
  test('pins get the visible image (image space) and re-lean while dragged', () => {
    for (const src of [oblique, ipcam]) {
      expect(src).toContain("visibleImageBounds(");
      expect(src).toContain("'image'");
      expect(src).toContain('updatePinLean(');
    }
  });
  test('MARKS is gone', () => {
    expect(read('src/constants/constants.ts')).not.toMatch(/export const MARKS/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/helpers/overlayStyleGuard.test.ts`
Expected: the three new tests FAIL.

- [ ] **Step 3: `drawOblique.ts`**

1. Imports: replace `import { MARKS } from '../../constants/constants';` and `import { drawPin } from './drawPin';` with:

```ts
import { drawPin, updatePinLean } from './drawPin';
import { drawOverlayLine } from './overlayStyle';
import { visibleImageBounds } from './pinLean';
```

2. Props: add `position: { x: number; y: number };` to `drawObliqueProps` (after `scale: number;`) and `position,` to the destructuring (after `scale,`).
3. At the top of the function body, before `const dragPoint`, add:

```ts
  // Pins live in the zoomed layer, so their bounds are the visible image in image space.
  const bounds = visibleImageBounds({ width: imageWidth, height: imageHeight, position, scale }, 'image');
```

4. In the `'drag'` handler, right after the `.attr('transform', ...)` call add:

```ts
      updatePinLean(d3.select<SVGGElement, unknown>(this), { x, y }, scale, bounds);
```

5. Replace the side-line block

```ts
    layer
      .append('line')
      .attr('x1', point.x)
      ...
      .attr('stroke-width', MARKS.STROKE_WIDTH / scale)
      .attr('pointer-events', 'none');
```

(the first `layer.append('line')` chain in the `localPoints.forEach`) with:

```ts
    const sideColors = [DC.D12, DC.D23, DC.D34, DC.D14];
    drawOverlayLine({
      layer,
      from: point,
      to: localPoints[(i + 1) % localPoints.length],
      color: sideColors[i] ?? DC.D12,
      size: 'app',
      zoom: scale,
      className: 'oblique-distance',
    });
```

6. Replace the diagonal block (the second `layer.append('line')` chain) with:

```ts
    drawOverlayLine({
      layer,
      from: point,
      to: localPoints[(i + 2) % localPoints.length],
      color: i === 3 ? DC.D24 : DC.D13,
      size: 'app',
      zoom: scale,
      className: 'oblique-distance',
    });
```

(The old switch mapped i=2 → D13, i=3 → D24, default D13; i=0 and i=1 draw the same diagonals again as i=2 and i=3, which is today's behaviour and stays.)

7. In the pins loop pass bounds:

```ts
    const g = drawPin({ layer, tip: point, kind: i === 0 ? 'left' : 'point', label: `${i + 1}`, divisor: scale, bounds });
```

- [ ] **Step 4: `DrawOblique.tsx`**

In the `drawOblique({...})` call add `position,` after `scale,`. `position` is already a prop of the component and already in the effect's dependency list.

- [ ] **Step 5: `drawIpcam.ts`**

1. Imports: change `import { drawPin, PinKind } from './drawPin';` to

```ts
import { drawPin, PinKind, updatePinLean } from './drawPin';
import { drawOverlayLine } from './overlayStyle';
import { visibleImageBounds } from './pinLean';
```

2. Props: add `position: { x: number; y: number };` to `drawIpcamProps` (after `scale: number;`) and `position,` to the destructuring.
3. After `if (localPoints === null) return;` add:

```ts
  const bounds = visibleImageBounds({ width, height, position, scale }, 'image');
```

4. In the `'drag'` handler, after the `.attr('transform', ...)` call add:

```ts
      updatePinLean(d3.select<SVGGElement, unknown>(this), { x, y }, scale, bounds);
```

5. In the `drawPin({...})` call add `bounds,` after `divisor: scale,`.
6. In `drawProjectionPoint`, replace the line chain

```ts
  layer
    .append('line')
    .attr('x1', x)
    .attr('y1', y)
    .attr('x2', projectedX / factor)
    .attr('y2', projectedY / factor)
    .attr('stroke', COLORS.RED)
    .attr('stroke-width', 3 / scale);
```

with:

```ts
  drawOverlayLine({
    layer,
    from: { x, y },
    to: { x: projectedX / factor, y: projectedY / factor },
    color: COLORS.RED,
    size: 'app',
    thin: true,
    zoom: scale,
    className: 'ipcam-reprojection',
  });
```

- [ ] **Step 6: `DrawIpcam.tsx`**

In the `drawIpcam({...})` call add `position,` after `scale,` (already a prop and an effect dependency).

- [ ] **Step 7: Delete `MARKS`**

In `src/constants/constants.ts` delete:

```ts
export const MARKS = {
  STROKE_WIDTH: 3,
};
```

- [ ] **Step 8: Run tests and type check**

Run: `npx jest src/helpers/overlayStyleGuard.test.ts src/components/Graphs && npx tsc --noEmit -p tsconfig.json 2>&1 | grep "src/"`
Expected: PASS; tsc prints nothing.

- [ ] **Step 9: Commit**

```bash
git add src/components/Graphs/drawOblique.ts src/components/DrawOblique.tsx src/components/Graphs/drawIpcam.ts src/components/DrawIpcam.tsx src/constants/constants.ts src/helpers/overlayStyleGuard.test.ts
git -c user.email=antoine.patalano@gmail.com commit -m "Draw calibration distances and reprojection lines in the shared style, lean oblique and ipcam pins at the border"
```

---

### Task 5: Report calibration overlays

**Files:**
- Modify: `src/components/Graphs/obliqueSvg.ts`, `src/components/Graphs/ipcamSvg.ts`
- Modify: `src/components/Report/CalibrationSheet.tsx`, `src/constants/constants.ts`
- Test: `src/helpers/overlayStyleGuard.test.ts`

**Interfaces:**
- Consumes: `drawOverlayLine`, `OVERLAY_STYLE` (Task 1); `drawPin` with `bounds` (Task 2).
- Produces: `obliqueSvg(props)` and `ipcamSvg(props)` lose the `pinDivisor` option; everything else unchanged.

- [ ] **Step 1: Add failing guard tests**

Append to `src/helpers/overlayStyleGuard.test.ts`:

```ts
describe('report calibration overlays use the report size', () => {
  const oblique = read('src/components/Graphs/obliqueSvg.ts');
  const ipcam = read('src/components/Graphs/ipcamSvg.ts');
  test('lines through drawOverlayLine at report size, pins at the report divisor inside the frame', () => {
    expect(oblique).toContain("size: 'report'");
    expect(oblique).not.toMatch(/\.attr\('stroke-width'/);
    expect(ipcam).toMatch(/drawOverlayLine\(\{[\s\S]*thin: true/);
    expect(ipcam.match(/\.attr\('stroke-width'/g)?.length).toBe(1); // the ellipse
    for (const src of [oblique, ipcam]) {
      expect(src).toContain('OVERLAY_STYLE.report.PIN_DIVISOR');
      expect(src).toMatch(/bounds: \{ x: 0, y: 0, width, height \}/);
      expect(src).not.toContain('pinDivisor');
    }
  });
  test('oblique point 1 is the red left pin, as on the canvas', () => {
    expect(oblique).toMatch(/kind: i === 0 \? 'left' : 'point'/);
  });
  test('the report no longer carries its own pin divisor', () => {
    expect(read('src/components/Report/CalibrationSheet.tsx')).not.toContain('pinDivisor');
    expect(read('src/constants/constants.ts')).not.toContain('METHOD_PIN_DIVISOR');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/helpers/overlayStyleGuard.test.ts`
Expected: the three new tests FAIL.

- [ ] **Step 3: Rewrite `obliqueSvg.ts`**

Replace the whole file with:

```ts
import { factor, Point } from '../../types';
import * as d3 from 'd3';
import { getDistanceColors } from '../../helpers/getCSSVar';
import { drawPin } from './drawPin';
import { drawOverlayLine, OVERLAY_STYLE } from './overlayStyle';

interface obliqueSvgProps {
  factor: factor;
  coordinates: Point[];
  distances: {
    d12: number;
    d23: number;
    d34: number;
    d41: number;
    d13: number;
    d24: number;
  };
  svgElement: SVGSVGElement;
  width: number;
  height: number;
}

/** The report's oblique calibration frame: the 6 distances and the 4 control points, at report size. */
export const obliqueSvg = ({ factor, coordinates, svgElement, width, height }: obliqueSvgProps) => {
  const svg = d3.select(svgElement);
  svg.attr('width', width).attr('height', height).style('background-color', 'transparent');
  const layer = svg as unknown as d3.Selection<SVGGElement, unknown, null, undefined>;

  // getCSSVar reads the report root's light theme while the report is mounted.
  const DC = getDistanceColors();
  const at = (p: Point) => ({ x: p.x / factor.x, y: p.y / factor.y });
  const pairs: [number, number, string][] = [
    [0, 1, DC.D12],
    [1, 2, DC.D23],
    [2, 3, DC.D34],
    [3, 0, DC.D14],
    [0, 2, DC.D13],
    [1, 3, DC.D24],
  ];
  pairs.forEach(([a, b, color]) => {
    if (!coordinates[a] || !coordinates[b]) return;
    drawOverlayLine({ layer, from: at(coordinates[a]), to: at(coordinates[b]), color, size: 'report' });
  });

  // Point 1 is upstream left: the red "left" pin, as on the Oblique canvas.
  coordinates.forEach((point, i) => {
    drawPin({
      layer,
      tip: at(point),
      kind: i === 0 ? 'left' : 'point',
      label: `${i + 1}`,
      divisor: OVERLAY_STYLE.report.PIN_DIVISOR,
      bounds: { x: 0, y: 0, width, height },
    });
  });
};
```

- [ ] **Step 4: `ipcamSvg.ts`**

1. Imports: add `import { drawOverlayLine, OVERLAY_STYLE } from './overlayStyle';`.
2. Remove the `pinDivisor` prop and its doc comment from `ipcamSvgProps`, and change the signature back to `({ factor, points, svgElement, width, height }: ipcamSvgProps)`.
3. Replace the reprojection line chain

```ts
        clippedGroup
          .append('line')
          .attr('x1', x / factor.x)
          .attr('y1', y / factor.y)
          .attr('x2', projectedPoint[0] / factor.x)
          .attr('y2', projectedPoint[1] / factor.y)
          .attr('stroke', COLORS.RED)
          .attr('stroke-width', 1);
```

with:

```ts
        drawOverlayLine({
          layer: clippedGroup,
          from: { x: x / factor.x, y: y / factor.y },
          to: { x: projectedPoint[0] / factor.x, y: projectedPoint[1] / factor.y },
          color: COLORS.RED,
          size: 'report',
          thin: true,
        });
```

4. In the `drawPin({...})` call replace `divisor: pinDivisor,` with:

```ts
        divisor: OVERLAY_STYLE.report.PIN_DIVISOR,
        bounds: { x: 0, y: 0, width, height },
```

- [ ] **Step 5: `CalibrationSheet.tsx` and constants**

In `src/components/Report/CalibrationSheet.tsx` delete both lines `pinDivisor: REPORT_FLOW.METHOD_PIN_DIVISOR,` (one in the `obliqueSvg({...})` call, one in the `ipcamSvg({...})` call). In `src/constants/constants.ts` delete from `REPORT_FLOW`:

```ts
  /** Pin size divisor on those frames: the app draws pins at 1.2, which would cover a 240 px frame. */
  METHOD_PIN_DIVISOR: 2,
```

- [ ] **Step 6: Run tests and type check**

Run: `npx jest src/helpers && npx tsc --noEmit -p tsconfig.json 2>&1 | grep "src/"`
Expected: PASS (including `reportDocument.test.ts`); tsc prints nothing.

- [ ] **Step 7: Commit**

```bash
git add src/components/Graphs/obliqueSvg.ts src/components/Graphs/ipcamSvg.ts src/components/Report/CalibrationSheet.tsx src/constants/constants.ts src/helpers/overlayStyleGuard.test.ts
git -c user.email=antoine.patalano@gmail.com commit -m "Draw the report's calibration frames at report size with pins kept inside the frame"
```

---

### Task 6: Remove dead drawers, full check

**Files:**
- Delete: `src/components/LineAndText.tsx`, `src/components/Graphs/drawSvgSectionLine.ts`
- Modify: `src/components/index.ts` and `src/components/Graphs/index.ts` only if they re-export either file
- Test: `src/helpers/overlayStyleGuard.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing new.

- [ ] **Step 1: Add the failing guard**

Append to `src/helpers/overlayStyleGuard.test.ts`:

```ts
import { existsSync } from 'fs';

describe('dead overlay drawers', () => {
  test('LineAndText and drawSvgSectionLine are gone', () => {
    expect(existsSync(join(__dirname, '..', 'components', 'LineAndText.tsx'))).toBe(false);
    expect(existsSync(join(__dirname, '..', 'components', 'Graphs', 'drawSvgSectionLine.ts'))).toBe(false);
  });
});
```

(Move the `existsSync` import up into the existing `import { readFileSync } from 'fs';` line so the file has one `fs` import: `import { existsSync, readFileSync } from 'fs';`.)

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/helpers/overlayStyleGuard.test.ts`
Expected: the new test FAILS.

- [ ] **Step 3: Delete**

```bash
grep -rn "LineAndText\|drawSvgSectionLine" src
git rm src/components/LineAndText.tsx src/components/Graphs/drawSvgSectionLine.ts
grep -rn "LineAndText\|drawSvgSectionLine" src
```

The first grep must show only the two files themselves (and the guard test); if an `index.ts` re-exports either, remove that line. The second grep must show only the guard test.

- [ ] **Step 4: Full suite, types, lint**

Run: `npx jest 2>&1 | grep -E "Tests:|Suites:|✕"`
Expected: all suites pass.

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "src/"`
Expected: no output.

Run: `npx eslint --fix src/components/Graphs src/components/CrossSections/drawSections.ts src/components/DrawOblique.tsx src/components/DrawIpcam.tsx src/helpers/overlayStyleGuard.test.ts`
Expected: no errors left (`--fix` applies the project's prettier rules, e.g. wrapping the long `drawIcon(...)` calls). Then re-run `npx jest src/helpers/overlayStyleGuard.test.ts`: the guards match on substrings that prettier does not split, but confirm. If `--fix` changed files, include them in this task's commit.

- [ ] **Step 5: Commit**

```bash
git add -A src/components src/helpers/overlayStyleGuard.test.ts
git -c user.email=antoine.patalano@gmail.com commit -m "Remove the unused LineAndText and drawSvgSectionLine drawers"
```

- [ ] **Step 6: Hand the visual check to the user**

Tell the user what to look at in the app (no automated check covers the look):
- Report: section frames show a thin dashed section with L/R pins; the oblique frame's pins near the top edge lean inward, point 1 is red; distance lines have a dark halo.
- Results with "see all" on: L/R pins only on the active section; switching the active section moves them.
- Cross Sections, Oblique, ipcam, UAV: lines 3 px with a halo; dragging a pin toward an edge makes it lean; zoomed in, a pin near the viewport edge leans inward.
- Each in dark, light and Dracula.
