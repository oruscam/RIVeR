# Fixed Station Control Points Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the fixed-station Control Points step into RIVeR's panel grammar and overlay style, with a graded result, a per-point error column and one Solve in the footer.

**Architecture:** Pure helpers (grade, table rows, map ticks) carry the logic and are unit-tested in Jest's node environment. The two frame drawers (`drawIpcam.ts` for the app, `ipcamSvg.ts` for the report) share new primitives in `overlayStyle.ts`. The method choice is lifted from `FormIpcam` to the `Ipcam` page, which owns the footer Solve.

**Tech Stack:** React 18, Redux slices behind hooks, d3 v7, react-data-grid 7.0.0-beta.46, react-i18next, Jest (node environment, no jsdom), plain CSS with tokens in `src/index.css`.

**Spec:** `docs/superpowers/specs/2026-10-09-ipcam-control-points-design.md` · Preview: `docs/superpowers/previews/2026-10-09-ipcam-control-points.html`

## Global Constraints

- All paths are relative to `gui/`. Run every command from `gui/`.
- Grades: good under 5 px, fair from 5 to 10 px inclusive, bad over 10 px. One function decides it everywhere.
- Ellipse geometry: `rx = width / (2 * factor)`, `ry = height / (2 * factor)`, rotation `angle` in degrees.
- Frame colours are theme-invariant and declared in the bare `:root` block of `src/index.css`; panel colours come from theme tokens only. No colour literals in `drawIpcam.ts`, `ipcamSvg.ts`, `pointsMapSvg.ts` or the new CSS.
- Displayed values use at most 2 decimals.
- Backend `mode` strings stay `'direct-solve'` and `'optimize-solution'`. The store shape does not change.
- Every user-visible string goes through `t()` and exists in all 12 languages (`ar de en es fr hi it ja ko pt ru zh`).
- A control that must explain why it is unavailable uses `aria-disabled="true"` plus an early return in its handler, never native `disabled` (Chromium shows no `title` tooltip on a disabled control).
- React renders `aria-x={false}` as the string `"false"`; pass `undefined` to omit an attribute.
- Lint command is exactly `npm run lint`. Type check is `npx tsc --noEmit -p tsconfig.json`; its baseline is 68 `TS6305` lines of dist noise, so compare the count before and after rather than expecting zero.
- A guard test must be seen failing before it is trusted: break the rule on purpose, watch it fail, restore.
- Commits: author email `antoine.patalano@gmail.com`, no `Co-Authored-By` line, no "Generated with" line.

## Review Focus

1. **Stored errors that no longer line up with the points** (a point placed or removed after the solve): `ipcamPointErrors` returns `error: null`; the table shows a blank cell, the residual draws white, and nothing throws. Tested in Tasks 1 and 4.
2. **Sorting must not change which point a checkbox or a click addresses**: row ids stay the point's index in the store. Tested in Task 4.
3. **A project saved by an older version reopens with `cameraSolution.mode` set to something unexpected or missing**: the Method switch falls back to All points. Tested in Task 6.
4. **Coordinates in imperial units and very large eastings** (7 digits plus 2 decimals) must fit the table at the 400 px minimum panel width without a horizontal scrollbar. Checked in the Task 8 walkthrough.
5. **A degenerate ellipse** (zero or NaN axes from a covariance of fewer than two points): nothing is drawn for it. Tested in Task 2.

---

### Task 1: Error grade and residual colours

**Files:**
- Create: `src/helpers/ipcamErrorGrade.ts`
- Test: `src/helpers/ipcamErrorGrade.test.ts`
- Modify: `src/index.css` (bare `:root` block, after the `--pin-muted` line), `src/helpers/getCSSVar.ts` (after `getPinColors`)

**Interfaces:**
- Produces: `IPCAM_ERROR_LIMITS`, `type ErrorGrade = 'good' | 'fair' | 'bad'`, `ipcamErrorGrade(errorPx: number | null | undefined): ErrorGrade | null`, `getResidualColors(): { good: string; fair: string; bad: string; none: string }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/helpers/ipcamErrorGrade.test.ts
import { ipcamErrorGrade, IPCAM_ERROR_LIMITS } from './ipcamErrorGrade';

describe('ipcamErrorGrade', () => {
  test('limits from the spec', () => {
    expect(IPCAM_ERROR_LIMITS).toEqual({ GOOD: 5, FAIR: 10 });
  });
  test.each([
    [0, 'good'],
    [4.99, 'good'],
    [5, 'fair'],
    [10, 'fair'],
    [10.01, 'bad'],
    [250, 'bad'],
  ])('%p px is %s', (px, grade) => {
    expect(ipcamErrorGrade(px)).toBe(grade);
  });
  test('no value, no grade', () => {
    expect(ipcamErrorGrade(null)).toBeNull();
    expect(ipcamErrorGrade(undefined)).toBeNull();
    expect(ipcamErrorGrade(NaN)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx jest src/helpers/ipcamErrorGrade.test.ts`
Expected: FAIL, "Cannot find module './ipcamErrorGrade'".

- [ ] **Step 3: Implement**

```ts
// src/helpers/ipcamErrorGrade.ts
/** Reprojection error limits in px: under GOOD is good, up to FAIR is fair, over it is bad. */
export const IPCAM_ERROR_LIMITS = { GOOD: 5, FAIR: 10 };

export type ErrorGrade = 'good' | 'fair' | 'bad';

/** One grading rule for the mean error, each point's error, and the residual drawn on the frame. */
export const ipcamErrorGrade = (errorPx: number | null | undefined): ErrorGrade | null => {
  if (errorPx === null || errorPx === undefined || Number.isNaN(errorPx)) return null;
  if (errorPx < IPCAM_ERROR_LIMITS.GOOD) return 'good';
  if (errorPx <= IPCAM_ERROR_LIMITS.FAIR) return 'fair';
  return 'bad';
};
```

In `src/index.css`, directly after the `--pin-muted: #808080;` line:

```css
  /* Reprojection residual colours (fixed station control points), by the
     point's own error grade. Drawn on footage, so one fixed set in every
     theme, the same values as the pins. */
  --residual-good: #62C655;
  --residual-fair: #F5BF61;
  --residual-bad:  #ED6B57;
```

In `src/helpers/getCSSVar.ts`, after `getPinColors`:

```ts
/**
 * Returns the reprojection residual colours by error grade. Theme-invariant
 * (bare :root block, like the pins); `none` is the overlay line colour, for a
 * point whose error is unknown.
 */
export const getResidualColors = () => ({
  good: getCSSVar('--residual-good', '#62C655'),
  fair: getCSSVar('--residual-fair', '#F5BF61'),
  bad: getCSSVar('--residual-bad', '#ED6B57'),
  none: getCSSVar('--overlay-line', '#FFFFFF'),
});
```

- [ ] **Step 4: Run the test**

Run: `npx jest src/helpers/ipcamErrorGrade.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/helpers/ipcamErrorGrade.ts src/helpers/ipcamErrorGrade.test.ts src/index.css src/helpers/getCSSVar.ts
git commit -m "Grade a reprojection error and give the residual its colours"
```

---

### Task 2: Overlay primitives for the ellipse and the residual

**Files:**
- Modify: `src/components/Graphs/overlayStyle.ts`
- Test: `src/components/Graphs/overlayStyle.test.ts`
- Modify: `docs/superpowers/specs/2026-10-03-overlay-style-design.md` (the style table row "Thin reference line")

**Interfaces:**
- Produces:
  - `OVERLAY_STYLE[size]` gains `ELLIPSE_WIDTH` (app 1.5, report 0.75) and `RESIDUAL_WIDTH` (app 2.5, report 1.25); `THIN_WIDTH` is removed.
  - `OverlayLineOptions.thin` is replaced by `width?: number` (overrides the size's `LINE_WIDTH`, before zoom).
  - `overlayEllipseParts(o: OverlayEllipseOptions): EllipsePart[]` and `drawOverlayEllipse(o & { layer })`, where
    `OverlayEllipseOptions = { cx: number; cy: number; width: number; height: number; angle: number; color: string; size: OverlaySize; zoom?: number }` (`width`/`height` are full axis lengths in layer units, `angle` in degrees) and
    `EllipsePart = { role: 'halo' | 'stroke'; cx: number; cy: number; rx: number; ry: number; rotate: string; stroke: string; width: number }`.

- [ ] **Step 1: Write the failing tests**

In `overlayStyle.test.ts`, replace the body of `'app and report values from the spec'` first two expectations, delete the `'thin line has no halo'` test, and add:

```ts
// replaces the two OVERLAY_STYLE expectations
expect(OVERLAY_STYLE.app).toEqual({ LINE_WIDTH: 3, ELLIPSE_WIDTH: 1.5, RESIDUAL_WIDTH: 2.5, PIN_DIVISOR: 1 });
expect(OVERLAY_STYLE.report).toEqual({ LINE_WIDTH: 1.5, ELLIPSE_WIDTH: 0.75, RESIDUAL_WIDTH: 1.25, PIN_DIVISOR: 2 });
```

```ts
describe('line width override', () => {
  test('the residual keeps its halo at its own width', () => {
    const parts = overlayLineParts({ ...seg, size: 'app', width: OVERLAY_STYLE.app.RESIDUAL_WIDTH });
    expect(parts.map((p) => p.role)).toEqual(['halo', 'stroke']);
    expect(parts[0].width).toBe(5);
    expect(parts[1].width).toBe(2.5);
  });
  test('zoom divides the override too', () => {
    const parts = overlayLineParts({ ...seg, size: 'app', width: 2.5, zoom: 2 });
    expect(parts[1].width).toBe(1.25);
  });
});

describe('overlayEllipseParts', () => {
  const e = { cx: 100, cy: 50, width: 40, height: 20, angle: -12, color: '#FFFFFF' };
  test('axis lengths become radii; halo under the stroke', () => {
    const parts = overlayEllipseParts({ ...e, size: 'app' });
    expect(parts.map((p) => p.role)).toEqual(['halo', 'stroke']);
    expect(parts[1]).toMatchObject({ cx: 100, cy: 50, rx: 20, ry: 10, stroke: '#FFFFFF', width: 1.5 });
    expect(parts[1].rotate).toBe('rotate(-12, 100, 50)');
    expect(parts[0]).toMatchObject({ stroke: 'rgba(0, 0, 0, 0.5)', width: 3, rx: 20, ry: 10 });
  });
  test('report size halves the widths, zoom divides them', () => {
    expect(overlayEllipseParts({ ...e, size: 'report' })[1].width).toBe(0.75);
    expect(overlayEllipseParts({ ...e, size: 'app', zoom: 3 })[1].width).toBe(0.5);
  });
  test.each([
    ['zero width', { width: 0 }],
    ['NaN height', { height: NaN }],
    ['negative width', { width: -4 }],
  ])('a degenerate ellipse (%s) draws nothing', (_name, bad) => {
    expect(overlayEllipseParts({ ...e, ...bad, size: 'app' })).toEqual([]);
  });
});
```

Add `overlayEllipseParts` to the import at the top of the test file.

- [ ] **Step 2: Run and see them fail**

Run: `npx jest src/components/Graphs/overlayStyle.test.ts`
Expected: FAIL on the size table and "overlayEllipseParts is not a function".

- [ ] **Step 3: Implement in `overlayStyle.ts`**

Replace the `OVERLAY_STYLE` declaration:

```ts
export const OVERLAY_STYLE: Record<
  OverlaySize,
  { LINE_WIDTH: number; ELLIPSE_WIDTH: number; RESIDUAL_WIDTH: number; PIN_DIVISOR: number }
> = {
  app: { LINE_WIDTH: 3, ELLIPSE_WIDTH: 1.5, RESIDUAL_WIDTH: 2.5, PIN_DIVISOR: 1 },
  report: { LINE_WIDTH: 1.5, ELLIPSE_WIDTH: 0.75, RESIDUAL_WIDTH: 1.25, PIN_DIVISOR: 2 },
};
```

In `OverlayLineOptions`, replace the `thin` member with:

```ts
  /** Line width before zoom, when it is not the size's LINE_WIDTH (the ipcam residual). */
  width?: number;
```

In `overlayLineParts`, replace `thin = false,` with `width,` in the destructuring, and replace the three lines from `const w =` to the stroke push with:

```ts
  const w = (width ?? style.LINE_WIDTH) / zoom;
  const segment = { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
  const dash = dashed ? `${w * OVERLAY_RATIOS.DASH_ON},${w * OVERLAY_RATIOS.DASH_OFF}` : null;

  const parts: LinePart[] = [];
  parts.push({ role: 'halo', ...segment, stroke: OVERLAY_HALO_COLOR, width: w * OVERLAY_RATIOS.HALO, dash });
  parts.push({ role: 'stroke', ...segment, stroke: color, width: w, dash });
```

Append at the end of the file:

```ts
export interface OverlayEllipseOptions {
  cx: number;
  cy: number;
  /** Full axis lengths in the layer's units, as the backend returns them. */
  width: number;
  height: number;
  /** Rotation in degrees. */
  angle: number;
  color: string;
  size: OverlaySize;
  zoom?: number;
}

export interface EllipsePart {
  role: 'halo' | 'stroke';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotate: string;
  stroke: string;
  width: number;
}

/** An outline ellipse: coloured stroke over the dark halo, never filled. */
export const overlayEllipseParts = ({
  cx,
  cy,
  width,
  height,
  angle,
  color,
  size,
  zoom = 1,
}: OverlayEllipseOptions): EllipsePart[] => {
  if (!(width > 0) || !(height > 0)) return [];
  const w = OVERLAY_STYLE[size].ELLIPSE_WIDTH / zoom;
  const shape = { cx, cy, rx: width / 2, ry: height / 2, rotate: `rotate(${angle}, ${cx}, ${cy})` };
  return [
    { role: 'halo', ...shape, stroke: OVERLAY_HALO_COLOR, width: w * OVERLAY_RATIOS.HALO },
    { role: 'stroke', ...shape, stroke: color, width: w },
  ];
};

export const drawOverlayEllipse = ({
  layer,
  className = '',
  ...options
}: OverlayEllipseOptions & {
  layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  className?: string;
}) => {
  const group = layer.append('g').attr('class', className).attr('pointer-events', 'none');
  overlayEllipseParts(options).forEach((p) => {
    group
      .append('ellipse')
      .attr('class', `ov-${p.role}`)
      .attr('cx', p.cx)
      .attr('cy', p.cy)
      .attr('rx', p.rx)
      .attr('ry', p.ry)
      .attr('transform', p.rotate)
      .attr('fill', 'none')
      .attr('stroke', p.stroke)
      .attr('stroke-width', p.width);
  });
  return group;
};
```

Update the comment on the file header's first paragraph only if it mentions the thin line; delete the `/** Thin reference line (ipcam reprojection): no halo. */` doc line with the member.

In `docs/superpowers/specs/2026-10-03-overlay-style-design.md`, replace the table row `| Thin reference line (ipcam reprojection) | 1 px, no halo | 0.75 px, no halo |` with:

```markdown
| Ipcam residual (amended 2026-10-09) | 2.5 px with halo | 1.25 px with halo |
| Ipcam uncertainty ellipse outline (added 2026-10-09) | 1.5 px with halo | 0.75 px with halo |
```

- [ ] **Step 4: Run the tests**

Run: `npx jest src/components/Graphs/overlayStyle.test.ts`
Expected: PASS. `drawIpcam.ts` and `ipcamSvg.ts` still pass `thin: true`, so `npx tsc --noEmit -p tsconfig.json` reports two new errors there; Task 3 removes them. Do not commit a broken type check: Task 3 is committed together with this one.

---

### Task 3: Draw the frame overlay in the new style

**Files:**
- Modify: `src/components/Graphs/drawIpcam.ts`, `src/components/Graphs/ipcamSvg.ts`, `src/components/Report/CalibrationSheet.tsx:192-198`, `src/store/ipcam/types.ts:1-10`, `src/constants/constants.ts:70-73`
- Test: `src/helpers/overlayStyleGuard.test.ts`

**Interfaces:**
- Consumes: `drawOverlayEllipse`, `OVERLAY_STYLE` (Task 2); `ipcamErrorGrade`, `getResidualColors` (Task 1); `ipcamPointErrors(points, { reprojectionErrors, pointIndices })` (existing, returns `{ index, label, error, used }[]`).
- Produces: `ipcamSvg` takes a new optional `solution?: { reprojectionErrors: number[]; pointIndices?: number[] }`.

- [ ] **Step 1: Rewrite the guard expectations (failing first)**

In `overlayStyleGuard.test.ts`, inside `'oblique and ipcam canvases use the shared overlay style'`, replace the two `ipcam` expectations of the first test with:

```ts
    expect(ipcam).toContain('drawOverlayEllipse(');
    expect(ipcam).toMatch(/drawOverlayLine\(\{[\s\S]*width: OVERLAY_STYLE\.app\.RESIDUAL_WIDTH/);
    expect(ipcam).not.toContain('thin:');
    expect(ipcam).not.toContain('COLORS.');
    expect(ipcam).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(ipcam).not.toMatch(/\/ \(factor \* 1\.8\)/);
```

In `'report calibration overlays use the report size'`, replace the two `ipcam` expectations with:

```ts
    expect(ipcam).toContain('drawOverlayEllipse(');
    expect(ipcam).toMatch(/drawOverlayLine\(\{[\s\S]*width: OVERLAY_STYLE\.report\.RESIDUAL_WIDTH/);
    expect(ipcam).not.toContain('thin:');
    expect(ipcam).not.toContain('COLORS.');
    expect(ipcam).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
```

Add one test to the same file:

```ts
describe('the tan ellipse colour is gone', () => {
  test('COLORS.ELLIPSE is not declared or used', () => {
    expect(read('src/constants/constants.ts')).not.toContain('ELLIPSE');
  });
});
```

Run: `npx jest src/helpers/overlayStyleGuard.test.ts`
Expected: FAIL on every new expectation.

- [ ] **Step 2: `drawIpcam.ts`**

Replace the imports' `COLORS` and `drawOverlayLine` lines with:

```ts
import { getOverlayColors, getPinColors, getResidualColors } from '../../helpers/getCSSVar';
import { ipcamErrorGrade } from '../../helpers/ipcamErrorGrade';
import { ipcamPointErrors } from '../../helpers/ipcamPointErrors';
import { drawOverlayEllipse, drawOverlayLine, OVERLAY_STYLE } from './overlayStyle';
```

A point left out of the solve draws at 0.7 of the pin size, so its divisor grows:

```ts
/** A point left out of the solve keeps a smaller pin. */
const MUTED_PIN_SCALE = 0.7;
```

Replace the `localPoints.forEach` block with:

```ts
  const errors =
    cameraSolution === null
      ? new Map<number, number | null>()
      : new Map(ipcamPointErrors(localPoints, cameraSolution).map((e) => [e.index, e.error]));

  localPoints.forEach((point, index) => {
    if (cameraSolution === null && point.selected === false) return;
    if (point.wasEstablished === false && activePoint !== index) return;

    const error = errors.get(index) ?? null;
    if (cameraSolution !== null && point.selected) {
      drawEllipse(point, layer, factor, scale);
      drawResidual(point, error, layer, factor, scale);
    }

    const muted = !point.selected && activePoint !== index;
    const g = drawPin({
      layer,
      tip: point,
      kind: getPinKind(index, point.selected),
      divisor: muted ? scale / MUTED_PIN_SCALE : scale,
      bounds,
      active: activePoint === index,
    });
    g.attr('cursor', 'default')
      .datum({ index })
      .call(dragPoint as any);

    if (activePoint === index) {
      drawPointChip({ layer, pin: g, point, error: cameraSolution === null ? undefined : error, scale, bounds });
    }
  });
```

Replace `drawEllipses` and `drawProjectionPoint` with:

```ts
const drawEllipse = (
  point: IpcamPoint,
  layer: d3.Selection<SVGGElement, unknown, null, undefined>,
  factor: number,
  scale: number
) => {
  const { ellipse } = point;
  if (ellipse === null || ellipse === undefined) return;
  drawOverlayEllipse({
    layer,
    cx: ellipse.center[0] / factor,
    cy: ellipse.center[1] / factor,
    width: ellipse.width / factor,
    height: ellipse.height / factor,
    angle: ellipse.angle,
    color: getOverlayColors().line,
    size: 'app',
    zoom: scale,
    className: 'ipcam-ellipse',
  });
};

const drawResidual = (
  point: IpcamPoint,
  error: number | null,
  layer: d3.Selection<SVGGElement, unknown, null, undefined>,
  factor: number,
  scale: number
) => {
  const { projectedPoint, x, y } = point;
  if (projectedPoint === null || projectedPoint === undefined) return;
  const colors = getResidualColors();
  const color = colors[ipcamErrorGrade(error) ?? 'none'];
  const to = { x: projectedPoint[0] / factor, y: projectedPoint[1] / factor };

  drawOverlayLine({
    layer,
    from: { x, y },
    to,
    color,
    size: 'app',
    width: OVERLAY_STYLE.app.RESIDUAL_WIDTH,
    zoom: scale,
    className: 'ipcam-reprojection',
  });
  layer
    .append('circle')
    .attr('class', 'ipcam-reprojection-dot')
    .attr('cx', to.x)
    .attr('cy', to.y)
    .attr('r', (OVERLAY_STYLE.app.RESIDUAL_WIDTH * 1.4) / scale)
    .attr('fill', color)
    .attr('stroke', getPinColors().ink)
    .attr('stroke-width', 1 / scale)
    .attr('pointer-events', 'none');
};

/**
 * The active point's label and, after a solve, its error, on canvas chrome
 * beside the pin head. `error` undefined means "no solve yet": label only.
 */
const drawPointChip = ({
  layer,
  pin,
  point,
  error,
  scale,
  bounds,
}: {
  layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  pin: d3.Selection<SVGGElement, unknown, null, undefined>;
  point: IpcamPoint;
  error: number | null | undefined;
  scale: number;
  bounds: { x: number; y: number; width: number; height: number };
}) => {
  const d = (n: number) => n / scale;
  const headY = Number(pin.attr('data-head-y'));
  const chip = layer.append('g').attr('class', 'ipcam-chip').attr('pointer-events', 'none');
  const rect = chip.append('rect').attr('class', 'ipcam-chip-bg').attr('rx', d(6));
  const text = chip
    .append('text')
    .attr('class', 'ipcam-chip-text')
    .attr('font-size', d(12))
    .attr('dominant-baseline', 'central');
  text.append('tspan').attr('font-weight', 600).text(point.label);

  const grade = ipcamErrorGrade(error);
  const dotGap = grade ? d(16) : d(8);
  if (typeof error === 'number') {
    text.append('tspan').attr('dx', dotGap).text(`${error.toFixed(2)} px`);
  }

  // Lay out from the measured text; jsdom-less tests never reach this function.
  const node = text.node();
  const textWidth = node ? node.getComputedTextLength() : 0;
  const width = textWidth + d(20);
  const height = d(24);
  const gap = d(22);
  const fitsRight = point.x + gap + width <= bounds.x + bounds.width;
  const left = fitsRight ? point.x + gap : point.x - gap - width;
  const top = Math.max(bounds.y, Math.min(bounds.y + bounds.height - height, headY - height / 2));

  rect.attr('x', left).attr('y', top).attr('width', width).attr('height', height);
  text.attr('x', left + d(10)).attr('y', top + height / 2);

  if (grade && node) {
    const labelWidth = (node.firstChild as SVGTSpanElement).getComputedTextLength();
    chip
      .append('circle')
      .attr('cx', left + d(10) + labelWidth + d(8))
      .attr('cy', top + height / 2)
      .attr('r', d(3.5))
      .attr('fill', getResidualColors()[grade]);
  }
};
```

The chip's fill and text colour come from CSS, so add to `src/components/Graphs/graphs.css` (end of file):

```css
/* Active control point chip on the fixed-station frame: canvas chrome, the
   same in every theme. */
.ipcam-chip-bg {
  fill: var(--canvas-chrome);
}

.ipcam-chip-text {
  fill: var(--overlay-line);
  font-family: inherit;
}
```

Delete the now-unused `COLORS` import.

- [ ] **Step 3: `ipcamSvg.ts` (report)**

Replace the imports' `COLORS` and `drawOverlayLine` lines with:

```ts
import { getOverlayColors, getPinColors, getResidualColors } from '../../helpers/getCSSVar';
import { ipcamErrorGrade } from '../../helpers/ipcamErrorGrade';
import { ipcamPointErrors } from '../../helpers/ipcamPointErrors';
import { drawOverlayEllipse, drawOverlayLine, OVERLAY_STYLE } from './overlayStyle';
```

`src/helpers/reportDocument.test.ts:88` forbids `getCSSVar|getTechniqueColors|getPinColors` in the report document. Read that test first: if `ipcamSvg.ts` is among the files it scans, take the colours from the fallbacks instead by adding to `ipcamSvg.ts`:

```ts
// The report is a fixed light document, independent of the app theme: the
// overlay colours are the theme-invariant values, not read from the DOM.
const REPORT_OVERLAY = { line: '#FFFFFF', ink: '#0B0D10', good: '#62C655', fair: '#F5BF61', bad: '#ED6B57' };
```

and drop the three `getCSSVar` imports and the hex-literal expectation for the report half of the guard (Step 1's second block). If the test does not scan `ipcamSvg.ts`, use the `get*Colors()` helpers as in `drawIpcam.ts`.

Add to `ipcamSvgProps`:

```ts
  /** The stored solve, to grade each residual. Without it residuals draw in the neutral line colour. */
  solution?: { reprojectionErrors: number[]; pointIndices?: number[] };
```

Replace the loop body's ellipse and projected-point blocks with:

```ts
  const errors = solution
    ? new Map(ipcamPointErrors(points, solution).map((e) => [e.index, e.error]))
    : new Map<number, number | null>();
  const residual = getResidualColors();

  for (let i = 0; i < points.length; i++) {
    const { ellipse, projectedPoint, x, y, selected } = points[i];

    if (ellipse && selected) {
      drawOverlayEllipse({
        layer: clippedGroup,
        cx: ellipse.center[0] / factor.x,
        cy: ellipse.center[1] / factor.y,
        width: ellipse.width / factor.x,
        height: ellipse.height / factor.y,
        angle: ellipse.angle,
        color: getOverlayColors().line,
        size: 'report',
      });
    }

    if (projectedPoint && selected && x && y) {
      const color = residual[ipcamErrorGrade(errors.get(i) ?? null) ?? 'none'];
      const to = { x: projectedPoint[0] / factor.x, y: projectedPoint[1] / factor.y };
      drawOverlayLine({
        layer: clippedGroup,
        from: { x: x / factor.x, y: y / factor.y },
        to,
        color,
        size: 'report',
        width: OVERLAY_STYLE.report.RESIDUAL_WIDTH,
      });
      clippedGroup
        .append('circle')
        .attr('cx', to.x)
        .attr('cy', to.y)
        .attr('r', OVERLAY_STYLE.report.RESIDUAL_WIDTH * 1.4)
        .attr('fill', color)
        .attr('stroke', getPinColors().ink)
        .attr('stroke-width', 0.5);
    }
```

(The pin block that follows stays.) Add `solution` to the destructured props.

In `CalibrationSheet.tsx`, pass the solve to the drawer:

```tsx
      ipcamSvg({
        factor,
        points,
        svgElement: svgRef.current,
        width: box.width,
        height: box.height,
        solution: cameraSolution ?? undefined,
      });
```

and add `cameraSolution` to that effect's dependency array.

- [ ] **Step 4: Types and the dead colour**

In `src/store/ipcam/types.ts`, replace the `Ellipse` comments:

```ts
interface Ellipse {
  // Center of the ellipse [x, y], in original image pixels
  center: number[];
  // Full length of the first axis (a diameter, not a radius)
  width: number;
  // Full length of the second axis
  height: number;
  // Rotation angle in degrees
  angle: number;
}
```

In `src/constants/constants.ts`, delete the `ELLIPSE: { FILL: ..., STROKE: ... },` member of `COLORS`.

- [ ] **Step 5: Verify**

Run: `npx jest src/helpers/overlayStyleGuard.test.ts src/components/Graphs/overlayStyle.test.ts src/helpers/reportDocument.test.ts src/helpers/noDuplicateColorConstants.test.ts`
Expected: PASS.

Prove the guard bites: in `drawIpcam.ts` change `width: ellipse.width / factor` to `width: ellipse.width / (factor * 1.8)`, rerun the guard, expect FAIL, restore.

Run: `npx tsc --noEmit -p tsconfig.json | wc -l` (expect the baseline count) and `npm run lint` (no new problems).

- [ ] **Step 6: Commit Tasks 2 and 3 together**

```bash
git add src/components/Graphs/overlayStyle.ts src/components/Graphs/overlayStyle.test.ts src/components/Graphs/drawIpcam.ts src/components/Graphs/ipcamSvg.ts src/components/Graphs/graphs.css src/components/Report/CalibrationSheet.tsx src/store/ipcam/types.ts src/constants/constants.ts src/helpers/overlayStyleGuard.test.ts docs/superpowers/specs/2026-10-03-overlay-style-design.md
git commit -m "Draw the ipcam ellipse as an outline and grade each residual by its error"
```

---

### Task 4: Table rows, with per-point error and sorting

**Files:**
- Create: `src/helpers/ipcamGridRows.ts`
- Test: `src/helpers/ipcamGridRows.test.ts`

**Interfaces:**
- Consumes: `ipcamPointErrors` (existing), `ipcamErrorGrade`, `ErrorGrade` (Task 1).
- Produces:

```ts
export type ErrorSort = 'none' | 'worst' | 'best';
export interface IpcamGridRow {
  id: number;            // index into the store's points array, never the display position
  label: string;
  X: number; Y: number; Z: number;   // already in the display unit, 2 decimals
  selected: boolean;
  error: number | null;  // px, null when unknown
  grade: ErrorGrade | null;
}
export const nextErrorSort: (s: ErrorSort) => ErrorSort;               // none → worst → best → none
export const ipcamGridRows: (
  points: IpcamPoint[],
  solution: { reprojectionErrors: number[]; pointIndices?: number[] } | null,
  coordFactor: number,
  sort: ErrorSort
) => IpcamGridRow[];
```

- [ ] **Step 1: Write the failing test**

```ts
// src/helpers/ipcamGridRows.test.ts
import { ipcamGridRows, nextErrorSort } from './ipcamGridRows';
import { IpcamPoint } from '../store/ipcam/types';

const point = (label: string, x: number, y: number, selected = true): IpcamPoint => ({
  label,
  X: 4388445.891,
  Y: 6524020.07,
  Z: 388.04,
  x,
  y,
  selected,
  wasEstablished: true,
  image: null,
  ellipse: null,
  projectedPoint: null,
});

// B is not placed on the image (x = y = 0), so the backend returned three errors for A, C, D.
const points = [point('A', 10, 10), point('B', 0, 0), point('C', 30, 30, false), point('D', 40, 40)];
const solution = { reprojectionErrors: [3.2, 14.05, 9.1] };

describe('ipcamGridRows', () => {
  test('file order: one row per point, id is the store index, error joined by index', () => {
    const rows = ipcamGridRows(points, solution, 1, 'none');
    expect(rows.map((r) => [r.id, r.label, r.error, r.grade])).toEqual([
      [0, 'A', 3.2, 'good'],
      [1, 'B', null, null],
      [2, 'C', 14.05, 'bad'],
      [3, 'D', 9.1, 'fair'],
    ]);
    expect(rows[2].selected).toBe(false);
  });

  test('worst first, rows without an error last, ids unchanged', () => {
    expect(ipcamGridRows(points, solution, 1, 'worst').map((r) => r.id)).toEqual([2, 3, 0, 1]);
  });

  test('best first, rows without an error still last', () => {
    expect(ipcamGridRows(points, solution, 1, 'best').map((r) => r.id)).toEqual([0, 3, 2, 1]);
  });

  test('before a solve every error is null and sorting keeps file order', () => {
    const rows = ipcamGridRows(points, null, 1, 'worst');
    expect(rows.map((r) => r.id)).toEqual([0, 1, 2, 3]);
    expect(rows.every((r) => r.error === null)).toBe(true);
  });

  test('stored errors that no longer line up give null errors, not a throw', () => {
    const rows = ipcamGridRows(points, { reprojectionErrors: [1, 2] }, 1, 'worst');
    expect(rows.every((r) => r.error === null && r.grade === null)).toBe(true);
    expect(rows.map((r) => r.id)).toEqual([0, 1, 2, 3]);
  });

  test('coordinates are converted and rounded to 2 decimals', () => {
    const [row] = ipcamGridRows(points, null, 2, 'none');
    expect(row.X).toBe(8776891.78);
    expect(row.Z).toBe(776.08);
  });

  test('equal errors keep file order (stable)', () => {
    const same = { reprojectionErrors: [5, 5, 5] };
    expect(ipcamGridRows(points, same, 1, 'worst').map((r) => r.id)).toEqual([0, 2, 3, 1]);
  });
});

describe('nextErrorSort', () => {
  test('none, worst, best, none', () => {
    expect(nextErrorSort('none')).toBe('worst');
    expect(nextErrorSort('worst')).toBe('best');
    expect(nextErrorSort('best')).toBe('none');
  });
});
```

- [ ] **Step 2: Run and see it fail**

Run: `npx jest src/helpers/ipcamGridRows.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// src/helpers/ipcamGridRows.ts
import { IpcamPoint } from '../store/ipcam/types';
import { ErrorGrade, ipcamErrorGrade } from './ipcamErrorGrade';
import { ipcamPointErrors } from './ipcamPointErrors';

export type ErrorSort = 'none' | 'worst' | 'best';

export interface IpcamGridRow {
  /** Index into the store's points array. Sorting never changes it. */
  id: number;
  label: string;
  X: number;
  Y: number;
  Z: number;
  selected: boolean;
  /** Reprojection error in px; null before a solve, for an unplaced point, or when stale. */
  error: number | null;
  grade: ErrorGrade | null;
}

export const nextErrorSort = (sort: ErrorSort): ErrorSort =>
  sort === 'none' ? 'worst' : sort === 'worst' ? 'best' : 'none';

const round2 = (value: number) => parseFloat(value.toFixed(2));

export const ipcamGridRows = (
  points: IpcamPoint[],
  solution: { reprojectionErrors: number[]; pointIndices?: number[] } | null,
  coordFactor: number,
  sort: ErrorSort
): IpcamGridRow[] => {
  const errors = solution
    ? new Map(ipcamPointErrors(points, solution).map((e) => [e.index, e.error]))
    : new Map<number, number | null>();

  const rows = points.map((p, id) => {
    const error = errors.get(id) ?? null;
    return {
      id,
      label: p.label,
      X: round2(p.X * coordFactor),
      Y: round2(p.Y * coordFactor),
      Z: round2(p.Z * coordFactor),
      selected: p.selected,
      error,
      grade: ipcamErrorGrade(error),
    };
  });

  if (sort === 'none') return rows;
  const sign = sort === 'worst' ? -1 : 1;
  // Array.prototype.sort is stable, so equal errors keep file order.
  return [...rows].sort((a, b) => {
    if (a.error === null && b.error === null) return 0;
    if (a.error === null) return 1;
    if (b.error === null) return -1;
    return sign * (a.error - b.error);
  });
};
```

- [ ] **Step 4: Run the test**

Run: `npx jest src/helpers/ipcamGridRows.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/helpers/ipcamGridRows.ts src/helpers/ipcamGridRows.test.ts
git commit -m "Build the control points table rows with each point's error and a sort"
```

---

### Task 5: Translations

**Files:**
- Create: `scripts/ipcam-control-points-i18n.mjs` (run once, then deleted before the commit; `mkdir -p scripts` first if the folder is missing)
- Modify: `src/translations/*/global.json` (12 files)
- Test: `src/helpers/translations.test.ts`

**Interfaces:**
- Produces keys under `ControlPoints3d`: `method`, `allPoints`, `optimized`, `meanReprojectionError`, `pointsUsed`, `pointsUsedOf`, `errorPx`, `onTheFrame`, `hintUntick`, `hintMinPoints`, `optimizedNeedsPoints`. `cameraHeight` loses its colon. Grades reuse `Calibration.grade.good|fair|bad`; Solve reuses `Commons.solve`. The old keys `directSolve`, `optimize`, `reprojectionErrors`, `numberOfPoints` stay until Task 6 stops reading them and are deleted there.

- [ ] **Step 1: Write the failing test**

Append to `src/helpers/translations.test.ts`:

```ts
describe('fixed station control points copy', () => {
  const KEYS = [
    'method',
    'allPoints',
    'optimized',
    'meanReprojectionError',
    'pointsUsed',
    'pointsUsedOf',
    'errorPx',
    'onTheFrame',
    'hintUntick',
    'hintMinPoints',
    'optimizedNeedsPoints',
    'cameraHeight',
  ];
  test.each(languages)('%s has every key, with no trailing colon or space', (lang) => {
    const tree = load(lang);
    for (const key of KEYS) {
      const value = get(tree, `ControlPoints3d.${key}`);
      expect(typeof value).toBe('string');
      expect(value).toBe(value.trim());
      expect(value).not.toMatch(/[:：]$/);
    }
  });
  test.each(languages)('%s keeps its interpolation slots', (lang) => {
    const tree = load(lang);
    expect(get(tree, 'ControlPoints3d.pointsUsedOf')).toContain('{{total}}');
    expect(get(tree, 'ControlPoints3d.onTheFrame')).toContain('{{label}}');
    expect(get(tree, 'ControlPoints3d.hintMinPoints')).toContain('{{count}}');
    expect(get(tree, 'ControlPoints3d.optimizedNeedsPoints')).toContain('{{count}}');
  });
});
```

Run: `npx jest src/helpers/translations.test.ts -t "fixed station"`
Expected: FAIL for all 12 languages.

- [ ] **Step 2: Write and run the script**

```js
// scripts/ipcam-control-points-i18n.mjs
import { readFileSync, writeFileSync } from 'fs';

const T = {
  en: ['Method', 'All points', 'Optimized', 'Mean reprojection error', 'Points used', 'of {{total}}', 'Error px', '{{label}} on the frame', 'Untick the points with the largest error, then solve again.', 'Tick at least {{count}} points to solve.', 'Needs at least {{count}} ticked points', 'Camera height'],
  es: ['Método', 'Todos los puntos', 'Optimizado', 'Error medio de reproyección', 'Puntos usados', 'de {{total}}', 'Error px', '{{label}} en la imagen', 'Desmarca los puntos con mayor error y resuelve de nuevo.', 'Marca al menos {{count}} puntos para resolver.', 'Requiere al menos {{count}} puntos marcados', 'Altura de la cámara'],
  pt: ['Método', 'Todos os pontos', 'Otimizado', 'Erro médio de reprojeção', 'Pontos usados', 'de {{total}}', 'Erro px', '{{label}} na imagem', 'Desmarque os pontos com maior erro e resolva novamente.', 'Marque pelo menos {{count}} pontos para resolver.', 'Requer pelo menos {{count}} pontos marcados', 'Altura da câmera'],
  fr: ['Méthode', 'Tous les points', 'Optimisé', 'Erreur moyenne de reprojection', 'Points utilisés', 'sur {{total}}', 'Erreur px', '{{label}} sur l’image', 'Décochez les points à plus forte erreur, puis résolvez à nouveau.', 'Cochez au moins {{count}} points pour résoudre.', 'Nécessite au moins {{count}} points cochés', 'Hauteur de la caméra'],
  it: ['Metodo', 'Tutti i punti', 'Ottimizzato', 'Errore medio di riproiezione', 'Punti usati', 'di {{total}}', 'Errore px', '{{label}} sull’immagine', 'Deseleziona i punti con l’errore maggiore, poi risolvi di nuovo.', 'Seleziona almeno {{count}} punti per risolvere.', 'Richiede almeno {{count}} punti selezionati', 'Altezza della telecamera'],
  de: ['Methode', 'Alle Punkte', 'Optimiert', 'Mittlerer Reprojektionsfehler', 'Verwendete Punkte', 'von {{total}}', 'Fehler px', '{{label}} im Bild', 'Punkte mit dem größten Fehler abwählen und erneut lösen.', 'Mindestens {{count}} Punkte zum Lösen auswählen.', 'Benötigt mindestens {{count}} ausgewählte Punkte', 'Kamerahöhe'],
  ru: ['Метод', 'Все точки', 'Оптимизация', 'Средняя ошибка репроекции', 'Использовано точек', 'из {{total}}', 'Ошибка px', '{{label}} на кадре', 'Снимите отметку с точек с наибольшей ошибкой и решите снова.', 'Отметьте не менее {{count}} точек для решения.', 'Нужно не менее {{count}} отмеченных точек', 'Высота камеры'],
  ar: ['الطريقة', 'كل النقاط', 'محسَّن', 'متوسط خطأ إعادة الإسقاط', 'النقاط المستخدمة', 'من {{total}}', 'الخطأ px', '{{label}} على الصورة', 'ألغِ تحديد النقاط ذات الخطأ الأكبر ثم أعد الحل.', 'حدِّد {{count}} نقاط على الأقل للحل.', 'يتطلب {{count}} نقاط محددة على الأقل', 'ارتفاع الكاميرا'],
  hi: ['विधि', 'सभी बिंदु', 'अनुकूलित', 'औसत पुनःप्रक्षेपण त्रुटि', 'उपयोग किए गए बिंदु', '{{total}} में से', 'त्रुटि px', 'फ़्रेम पर {{label}}', 'सबसे अधिक त्रुटि वाले बिंदुओं को अचयनित करें, फिर दोबारा हल करें।', 'हल करने के लिए कम से कम {{count}} बिंदु चुनें।', 'कम से कम {{count}} चयनित बिंदु आवश्यक हैं', 'कैमरा ऊँचाई'],
  ja: ['手法', '全ポイント', '最適化', '平均再投影誤差', '使用ポイント数', '/ {{total}}', '誤差 px', 'フレーム上の {{label}}', '誤差の大きいポイントのチェックを外して、再度解析してください。', '解析には {{count}} 点以上をチェックしてください。', 'チェックしたポイントが {{count}} 点以上必要です', 'カメラ高さ'],
  ko: ['방법', '모든 포인트', '최적화', '평균 재투영 오차', '사용된 포인트', '/ {{total}}', '오차 px', '프레임의 {{label}}', '오차가 가장 큰 포인트를 선택 해제한 뒤 다시 풀어 주세요.', '풀려면 {{count}}개 이상의 포인트를 선택하세요.', '선택된 포인트가 {{count}}개 이상 필요합니다', '카메라 높이'],
  zh: ['方法', '全部点', '优化', '平均重投影误差', '使用的点', '/ {{total}}', '误差 px', '画面上的 {{label}}', '取消勾选误差最大的点，然后重新求解。', '至少勾选 {{count}} 个点才能求解。', '至少需要 {{count}} 个已勾选的点', '相机高度'],
};
const KEYS = ['method', 'allPoints', 'optimized', 'meanReprojectionError', 'pointsUsed', 'pointsUsedOf', 'errorPx', 'onTheFrame', 'hintUntick', 'hintMinPoints', 'optimizedNeedsPoints', 'cameraHeight'];

for (const [lang, values] of Object.entries(T)) {
  const path = `src/translations/${lang}/global.json`;
  const raw = readFileSync(path, 'utf8');
  const tree = JSON.parse(raw);
  KEYS.forEach((key, i) => (tree.ControlPoints3d[key] = values[i]));
  writeFileSync(path, JSON.stringify(tree, null, 2) + (raw.endsWith('\n') ? '\n' : ''));
}
```

Before running, check the files' indentation with `head -3 src/translations/en/global.json`; if it is not two spaces, change the `2` in `JSON.stringify` to match, so the diff stays limited to the changed keys.

Run: `node scripts/ipcam-control-points-i18n.mjs && git diff --stat src/translations`
Expected: 12 files changed, about 12 insertions and 1 deletion each. If a file shows hundreds of changed lines, the indentation guess was wrong: `git checkout src/translations`, fix, rerun.

- [ ] **Step 3: Run the tests**

Run: `npx jest src/helpers/translations.test.ts`
Expected: PASS, including the suites that were already there.

- [ ] **Step 4: Commit**

```bash
rm scripts/ipcam-control-points-i18n.mjs
git add src/translations src/helpers/translations.test.ts
git commit -m "Add the control points copy in every language"
```

---

### Task 6: The panel (method switch, result block, footer Solve)

**Files:**
- Create: `src/helpers/ipcamSolve.ts`, `src/helpers/ipcamSolve.test.ts`
- Modify: `src/components/Forms/FormIpcam.tsx` (whole file), `src/pages/Ipcam.tsx`, `src/components/Forms/form.css` (end of file), `src/translations/*/global.json` (delete four old keys)

**Interfaces:**
- Consumes: `ipcamErrorGrade` (Task 1); translation keys (Task 5); `useIpcamSlice()` members `onGetCameraSolution(mode: string): Promise<void>`, `cameraSolution`, `selectedCounter`, `points`.
- Produces:

```ts
// src/helpers/ipcamSolve.ts
export type SolveMethod = 'direct-solve' | 'optimize-solution';
export const SOLVE_MIN_POINTS: Record<SolveMethod, number>;        // 6 and 7
export const solveMethodOf: (mode: string | undefined | null) => SolveMethod;
export const canSolve: (method: SolveMethod, ticked: number) => boolean;
```

`FormIpcam` props: `{ method: SolveMethod; onMethodChange: (m: SolveMethod) => void }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/helpers/ipcamSolve.test.ts
import { canSolve, solveMethodOf, SOLVE_MIN_POINTS } from './ipcamSolve';

describe('solve method', () => {
  test('the limits the buttons had', () => {
    expect(SOLVE_MIN_POINTS).toEqual({ 'direct-solve': 6, 'optimize-solution': 7 });
  });
  test('a stored mode maps to its method', () => {
    expect(solveMethodOf('direct-solve')).toBe('direct-solve');
    expect(solveMethodOf('optimize-solution')).toBe('optimize-solution');
  });
  test.each([undefined, null, '', 'optimize', 'something-else'])(
    'an unknown stored mode (%p) falls back to all points',
    (mode) => {
      expect(solveMethodOf(mode)).toBe('direct-solve');
    }
  );
  test('enough ticked points', () => {
    expect(canSolve('direct-solve', 5)).toBe(false);
    expect(canSolve('direct-solve', 6)).toBe(true);
    expect(canSolve('optimize-solution', 6)).toBe(false);
    expect(canSolve('optimize-solution', 7)).toBe(true);
  });
});
```

Run: `npx jest src/helpers/ipcamSolve.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 2: Implement the helper**

```ts
// src/helpers/ipcamSolve.ts
/** The backend's two solve modes: every ticked point, or the subset that minimises the error. */
export type SolveMethod = 'direct-solve' | 'optimize-solution';

export const SOLVE_MIN_POINTS: Record<SolveMethod, number> = { 'direct-solve': 6, 'optimize-solution': 7 };

/** The method a stored solution was made with; anything unknown reads as all points. */
export const solveMethodOf = (mode: string | undefined | null): SolveMethod =>
  mode === 'optimize-solution' ? 'optimize-solution' : 'direct-solve';

export const canSolve = (method: SolveMethod, ticked: number) => ticked >= SOLVE_MIN_POINTS[method];
```

Run: `npx jest src/helpers/ipcamSolve.test.ts`
Expected: PASS.

- [ ] **Step 3: Rewrite `FormIpcam.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import { useAutoShrinkFont, useGlobalSlice, useIpcamSlice, useProjectSlice, useUiSlice } from '../../hooks';
import { UNIT_CONVERSIONS, UNITS } from '../../constants/constants';
import { PointsMap } from '../Graphs';
import { IpcamGrid } from '../index';
import { DropHereText } from './Components/DropHereText';
import { ipcamErrorGrade } from '../../helpers/ipcamErrorGrade';
import { canSolve, SOLVE_MIN_POINTS, SolveMethod } from '../../helpers/ipcamSolve';

const METHODS: { id: SolveMethod; labelKey: string }[] = [
  { id: 'direct-solve', labelKey: 'ControlPoints3d.allPoints' },
  { id: 'optimize-solution', labelKey: 'ControlPoints3d.optimized' },
];

export const FormIpcam = ({
  method,
  onMethodChange,
}: {
  method: SolveMethod;
  onMethodChange: (method: SolveMethod) => void;
}) => {
  const { onGetPoints, onGetImages, cameraSolution, selectedCounter, points, imagesPath, pointsPath } =
    useIpcamSlice();
  const { isBackendWorking } = useGlobalSlice();
  const { onAddStepAlert, onClearStepAlert } = useUiSlice();
  const { projectDetails } = useProjectSlice();
  const { t } = useTranslation();

  const importPointsButtonRef = useAutoShrinkFont<HTMLButtonElement>([t]);
  const importImagesButtonRef = useAutoShrinkFont<HTMLButtonElement>([t]);

  const isImperial = projectDetails.unitSistem === 'imperial';
  const heightFactor = isImperial ? UNIT_CONVERSIONS.M_TO_FT : 1;
  const lengthUnit = isImperial ? UNITS.IMPERIAL.LONGITUDE : UNITS.SI.LONGITUDE;

  const handleOnClickImport = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const id = (event.currentTarget as HTMLButtonElement).id;
    if (id === 'import-points') {
      onClearStepAlert('ipcam-import-points');
      onGetPoints().catch((error) => onAddStepAlert('ipcam-import-points', 'error', error.message));
    } else {
      onClearStepAlert('ipcam-import-images');
      onGetImages(undefined).catch((error) => onAddStepAlert('ipcam-import-images', 'error', error.message));
    }
  };

  const placed = points === null ? 0 : points.filter((p) => !(p.x === 0 && p.y === 0)).length;
  const grade = cameraSolution ? ipcamErrorGrade(cameraSolution.meanError) : null;
  const tooFew = points !== null && !canSolve(method, selectedCounter);

  return (
    <div className="body processing-body">
      <div className="wrapper">
        <form id="form-control-points" className={`${isBackendWorking ? 'disabled' : ''}`}>
          <div className="panel-section">
            <div className="panel-actions">
              <button
                ref={importPointsButtonRef}
                className="btn btn-secondary panel-action"
                data-complete={points !== null}
                id="import-points"
                type="button"
                onClick={handleOnClickImport}
              >
                {t('ControlPoints3d.importPoints')}
              </button>
              <button
                ref={importImagesButtonRef}
                className="btn btn-secondary panel-action"
                data-complete={imagesPath !== null}
                id="import-images"
                type="button"
                onClick={handleOnClickImport}
              >
                {t('ControlPoints3d.importImages')}
              </button>
            </div>

            <DropHereText text={t('Commons.dropHereText')} show={pointsPath === null} />

            <div className="field-row field-row-top">
              <span className="field-row-label" id="ipcam-method-label">
                {t('ControlPoints3d.method')}
              </span>
              <span className="seg" role="group" aria-labelledby="ipcam-method-label">
                {METHODS.map(({ id, labelKey }) => {
                  const unavailable = points === null || !canSolve(id, selectedCounter);
                  const needsPoints = points !== null && unavailable;
                  return (
                    <button
                      key={id}
                      type="button"
                      id={`ipcam-method-${id}`}
                      aria-pressed={method === id}
                      aria-disabled={needsPoints && method !== id ? true : undefined}
                      title={
                        needsPoints
                          ? t('ControlPoints3d.optimizedNeedsPoints', { count: SOLVE_MIN_POINTS[id] })
                          : undefined
                      }
                      onClick={() => {
                        if (needsPoints && method !== id) return;
                        onMethodChange(id);
                      }}
                    >
                      {t(labelKey)}
                    </button>
                  );
                })}
              </span>
            </div>

            {tooFew && (
              <p className="cp-hint" role="status">
                {t('ControlPoints3d.hintMinPoints', { count: SOLVE_MIN_POINTS[method] })}
              </p>
            )}

            {cameraSolution && (
              <div className="cp-result">
                <div className="field-row cp-headline">
                  <span className="field-row-label">{t('ControlPoints3d.meanReprojectionError')}</span>
                  <span className="cp-value">
                    {cameraSolution.meanError.toFixed(2)} <small>px</small>
                    {grade && <span className={`badge badge-${grade}`}>{t(`Calibration.grade.${grade}`)}</span>}
                  </span>
                </div>
                <div className="field-row">
                  <span className="field-row-label">{t('ControlPoints3d.pointsUsed')}</span>
                  <span className="cp-value">
                    {cameraSolution.numPoints ?? selectedCounter}{' '}
                    <small>{t('ControlPoints3d.pointsUsedOf', { total: placed })}</small>
                  </span>
                </div>
                <div className="field-row">
                  <span className="field-row-label">{t('ControlPoints3d.cameraHeight')}</span>
                  <span className="cp-value">
                    {(cameraSolution.cameraPosition[2] * heightFactor).toFixed(2)} <small>{lengthUnit}</small>
                  </span>
                </div>
                {!tooFew && (grade === 'fair' || grade === 'bad') && (
                  <p className="cp-hint">{t('ControlPoints3d.hintUntick')}</p>
                )}
              </div>
            )}

            <IpcamGrid />

            <PointsMap />
          </div>
        </form>
      </div>
    </div>
  );
};
```

Note `event.currentTarget` (not `target`): `useAutoShrinkFont` may wrap the label in a child element, and a click on the child must still read the button's id.

- [ ] **Step 4: `Ipcam.tsx` owns the method and the Solve button**

Add imports:

```tsx
import { useGlobalSlice } from '../hooks/index';
import { canSolve, solveMethodOf, SolveMethod } from '../helpers/ipcamSolve';
```

(merge `useGlobalSlice` into the existing `'../hooks/index'` import.) Add `selectedCounter` and `onGetCameraSolution` to the `useIpcamSlice()` destructuring, and inside the component:

```tsx
  const { isBackendWorking } = useGlobalSlice();
  const [method, setMethod] = useState<SolveMethod>(() => solveMethodOf(cameraSolution?.mode));

  const solveDisabled = points === null || isBackendWorking || !canSolve(method, selectedCounter);

  const handleOnClickSolve = () => {
    onClearStepAlert('ipcam-camera-solution');
    onGetCameraSolution(method).catch((error) => {
      onAddStepAlert('ipcam-camera-solution', 'error', error.message);
    });
  };
```

Replace `<FormIpcam />` with `<FormIpcam method={method} onMethodChange={setMethod} />` and the footer with:

```tsx
        <div className="footer">
          <div className="processing-run">
            <button
              type="button"
              className="btn btn-lg btn-primary"
              id="solve-ipcam"
              disabled={solveDisabled}
              onClick={handleOnClickSolve}
            >
              {t('Commons.solve')}
            </button>
          </div>
          <WizardButtons canFollow={cameraSolution !== null} onClickNext={handleOnClickNext} />
        </div>
```

Native `disabled` is right here: the reason is given by the hint line in the panel, not by a tooltip.

- [ ] **Step 5: CSS**

Append to `src/components/Forms/form.css`:

```css
/* FIXED STATION CONTROL POINTS (preview 2026-10-09).
   Result rows: the row grammar, read-only. Label left, value right in tabular
   600, unit in subdued caption text; 32px tall because nothing is edited. */
.cp-result {
    margin-top: var(--space-1);
}

.cp-result .field-row {
    min-height: 32px;
}

.cp-value {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-body);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--text-primary);
    white-space: nowrap;
}

.cp-value small {
    margin-left: calc(var(--space-1) * -1);
    font-size: var(--text-caption);
    font-weight: 400;
    color: var(--text-subdued);
}

/* The headline row: the mean error one step up, with its grade badge. */
.cp-result .cp-headline .field-row-label,
.cp-result .cp-headline .cp-value {
    font-size: var(--text-section);
}

.cp-hint {
    margin: 0;
    padding: 0 var(--space-2);
    font-size: var(--text-caption);
    line-height: 1.5;
    color: var(--text-subdued);
}
```

- [ ] **Step 6: Delete the four old keys**

Run:

```bash
node -e "
const fs=require('fs');
for (const l of fs.readdirSync('src/translations',{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name)) {
  const p='src/translations/'+l+'/global.json'; const raw=fs.readFileSync(p,'utf8'); const t=JSON.parse(raw);
  for (const k of ['directSolve','optimize','reprojectionErrors','numberOfPoints']) delete t.ControlPoints3d[k];
  fs.writeFileSync(p, JSON.stringify(t,null,2)+(raw.endsWith('\n')?'\n':''));
}"
grep -rn "ControlPoints3d\.\(directSolve\|optimize'\|reprojectionErrors\|numberOfPoints\)" src
```

Expected: the grep prints nothing.

- [ ] **Step 7: Verify**

Run: `npx jest` (whole suite), `npx tsc --noEmit -p tsconfig.json | wc -l` (baseline), `npm run lint`.
Expected: all pass with no new problems. If a test elsewhere pins `direct-solve` button ids (`grep -rn "direct-solve\|optimize-solution" src --include=*.test.ts`), update it to the new ids `ipcam-method-direct-solve` / `ipcam-method-optimize-solution` and `solve-ipcam`.

- [ ] **Step 8: Commit**

```bash
git add src/helpers/ipcamSolve.ts src/helpers/ipcamSolve.test.ts src/components/Forms/FormIpcam.tsx src/pages/Ipcam.tsx src/components/Forms/form.css src/translations
git commit -m "Choose the solve method on a switch, solve from the footer, grade the result"
```

---

### Task 7: The points table

**Files:**
- Modify: `src/components/IpcamGrid.tsx` (whole file), `src/components/components.css` (the `#ipcam-grid` rules at lines ~612-619 and a new block after them)
- Test: `src/helpers/ipcamGridCss.test.ts` (new), `src/helpers/themeStateContrast.test.ts`

**Interfaces:**
- Consumes: `ipcamGridRows`, `nextErrorSort`, `ErrorSort`, `IpcamGridRow` (Task 4); translation keys `errorPx`, `onTheFrame` (Task 5); `useIpcamSlice()` members `points`, `activePoint`, `cameraSolution`, `onChangePointSelected({ index })`, `onChangePointSelected({ rowsIndex })`, `onSetPointPixelCoordinates`, `onChangeActiveImage`.

- [ ] **Step 1: Write the failing CSS and contrast tests**

```ts
// src/helpers/ipcamGridCss.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

const css = readFileSync(join(__dirname, '..', 'components', 'components.css'), 'utf8');
const src = readFileSync(join(__dirname, '..', 'components', 'IpcamGrid.tsx'), 'utf8');

// Everything between the block's opening comment and the next top-level comment banner.
const start = css.indexOf('/* IPCAM GRID');
const block = css.slice(start, css.indexOf('/* END IPCAM GRID */'));

describe('control points table chrome', () => {
  test('the block exists and is closed', () => {
    expect(start).toBeGreaterThan(-1);
    expect(block.length).toBeGreaterThan(200);
  });
  test('no shadow, no uppercase header, no accent rule under the header', () => {
    expect(block).toMatch(/#ipcam-grid\s*\{[^}]*box-shadow:\s*none/);
    expect(block).toMatch(/text-transform:\s*none/);
    expect(block).not.toMatch(/border-bottom:[^;]*var\(--accent-color\)/);
  });
  test('only tokens: no colour literals', () => {
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(block).not.toMatch(/rgba?\(/);
  });
  test('numbers are tabular and right-aligned', () => {
    expect(block).toMatch(/font-variant-numeric:\s*tabular-nums/);
    expect(block).toMatch(/justify-content:\s*flex-end/);
  });
});

describe('control points table columns', () => {
  test('pixel x / y are gone, the error column is there, no placeholder rows', () => {
    expect(src).not.toMatch(/key: 'x'/);
    expect(src).not.toMatch(/key: 'y'/);
    expect(src).toContain("key: 'error'");
    expect(src).not.toContain('Array.from({ length: 10 }');
  });
  test('rows are keyed by the store index', () => {
    expect(src).toMatch(/rowKeyGetter = \(row: IpcamGridRow\): number => row\.id/);
  });
});
```

In `themeStateContrast.test.ts`, append to `STATE_PAIRS` (use the same helper style as the entries above it):

```ts
  {
    label: 'ipcam grid: fair grade dot vs the odd row',
    floor: 3,
    ratio: (t) => contrastRatio(resolveRgb(t, '--status-fair'), resolveRgb(t, '--grid-bg-odd')),
  },
  {
    label: 'ipcam grid: bad grade dot vs the even row',
    floor: 3,
    ratio: (t) => contrastRatio(resolveRgb(t, '--status-bad'), resolveRgb(t, '--grid-bg-even')),
  },
```

Run: `npx jest src/helpers/ipcamGridCss.test.ts src/helpers/themeStateContrast.test.ts`
Expected: the CSS test FAILS. The contrast test may pass already; if either new pair is under 3 in a theme, do not lower the floor: stop and report the measured value, because the fix is then a ring around the dot (`box-shadow: 0 0 0 1px var(--text-subdued)`), which the user must see.

- [ ] **Step 2: Rewrite `IpcamGrid.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIpcamSlice, useProjectSlice } from '../hooks';
import { UNIT_CONVERSIONS } from '../constants/constants';
import DataGrid, { SelectColumn, DataGridHandle } from 'react-data-grid';
import { useTranslation } from 'react-i18next';
import { ErrorSort, IpcamGridRow, ipcamGridRows, nextErrorSort } from '../helpers/ipcamGridRows';

const rowKeyGetter = (row: IpcamGridRow): number => row.id;

const SORT_GLYPH: Record<ErrorSort, string> = { none: '', worst: ' ↓', best: ' ↑' };

export const IpcamGrid = () => {
  const ref = useRef<DataGridHandle | null>(null);
  const [selectedRows, setSelectedRows] = useState<ReadonlySet<number>>(() => new Set());
  const [previousSelectedRows, setPreviousSelectedRows] = useState<ReadonlySet<number>>(() => new Set());
  const [sort, setSort] = useState<ErrorSort>('none');

  const {
    points,
    activePoint,
    cameraSolution,
    onChangePointSelected,
    onSetPointPixelCoordinates,
    onChangeActiveImage,
  } = useIpcamSlice();

  const { video, projectDetails } = useProjectSlice();
  const { width, height } = video.data;
  const { factor: imageReduceFactor } = video.parameters;
  const isImperial = projectDetails.unitSistem === 'imperial';
  const coordFactor = isImperial ? UNIT_CONVERSIONS.M_TO_FT : 1;
  const { t } = useTranslation();

  const rows = useMemo(
    () => (points === null ? [] : ipcamGridRows(points, cameraSolution, coordFactor, sort)),
    [points, cameraSolution, coordFactor, sort]
  );

  const columns = useMemo(
    () => [
      { ...SelectColumn, name: 'select', width: 28, cellClass: 'cp-cell-select', headerCellClass: 'cp-cell-select' },
      { key: 'label', name: t('ControlPoints3d.label'), cellClass: 'cp-cell-label', headerCellClass: 'cp-cell-label' },
      { key: 'X', name: t('ControlPoints3d.east'), cellClass: 'cp-cell-num', headerCellClass: 'cp-cell-num' },
      { key: 'Y', name: t('ControlPoints3d.north'), cellClass: 'cp-cell-num', headerCellClass: 'cp-cell-num' },
      { key: 'Z', name: 'Z', width: 56, cellClass: 'cp-cell-num', headerCellClass: 'cp-cell-num' },
      {
        key: 'error',
        name: t('ControlPoints3d.errorPx'),
        width: 72,
        cellClass: 'cp-cell-num',
        headerCellClass: 'cp-cell-num',
        renderHeaderCell: () => (
          <button
            type="button"
            className="cp-sort"
            aria-pressed={sort !== 'none' ? true : undefined}
            onClick={() => setSort(nextErrorSort(sort))}
          >
            {t('ControlPoints3d.errorPx')}
            {SORT_GLYPH[sort]}
          </button>
        ),
        renderCell: ({ row }: { row: IpcamGridRow }) =>
          row.error === null ? null : (
            <span className={`cp-err${row.grade && row.grade !== 'good' ? ` cp-err-${row.grade}` : ''}`}>
              {row.error.toFixed(2)}
            </span>
          ),
      },
    ],
    [t, sort]
  );

  const handleCellClick = ({ row, column }: { row: IpcamGridRow; column: { key: string } }) => {
    if (column.key === 'select-row') {
      onChangePointSelected({ index: row.id });
      return;
    }
    if (points && points[row.id].image != null) {
      onChangeActiveImage(points[row.id].image!);
    }
    onSetPointPixelCoordinates({
      index: row.id,
      imageSize: { width: width * imageReduceFactor, height: height * imageReduceFactor },
    });
  };

  useEffect(() => {
    if (points !== null) {
      const selected = new Set(points.flatMap((point, index) => (point.selected ? [index] : [])));
      setSelectedRows(selected);
      setPreviousSelectedRows(selected);
    }
  }, [points]);

  // Keep the active point's row in view, wherever the sort has put it.
  useEffect(() => {
    if (activePoint === null || activePoint === undefined) return;
    const rowIdx = rows.findIndex((row) => row.id === activePoint);
    if (rowIdx >= 0) ref.current?.scrollToCell({ rowIdx });
  }, [activePoint, rows]);

  // The header checkbox has no event of its own: a jump to all or none selected is how it shows.
  useEffect(() => {
    if (selectedRows.size === points?.length || selectedRows.size === 0) {
      if (selectedRows.size !== previousSelectedRows.size) {
        onChangePointSelected({ rowsIndex: selectedRows.size });
        setPreviousSelectedRows(selectedRows);
      }
    }
  }, [selectedRows, points?.length, previousSelectedRows.size, onChangePointSelected]);

  if (points === null) return null;

  const active = activePoint === null || activePoint === undefined ? null : points[activePoint];

  return (
    <div className="grid-container" id="ipcam-grid">
      <DataGrid
        columns={columns}
        rows={rows}
        rowHeight={30}
        headerRowHeight={30}
        selectedRows={selectedRows}
        onSelectedRowsChange={setSelectedRows}
        rowKeyGetter={rowKeyGetter}
        rowClass={(row) =>
          [row.id === activePoint ? 'cp-row-active' : '', row.selected ? '' : 'cp-row-off'].join(' ').trim()
        }
        className="grid"
        onCellClick={handleCellClick}
        ref={ref}
      />
      {active && !(active.x === 0 && active.y === 0) && (
        <div className="cp-table-foot">
          <span>{t('ControlPoints3d.onTheFrame', { label: active.label })}</span>
          <span>
            x {active.x.toFixed(1)} · y {active.y.toFixed(1)} px
          </span>
        </div>
      )}
    </div>
  );
};
```

Check `DataGridHandle` and `scrollToCell` exist in `node_modules/react-data-grid/lib/index.d.ts` (`grep -n "DataGridHandle" -A8 node_modules/react-data-grid/lib/index.d.ts`); if `scrollToCell` takes `{ idx, rowIdx }` with `idx` required, pass `idx: 1`.

- [ ] **Step 3: CSS**

In `src/components/components.css`, replace the two existing `#ipcam-grid` rules (`#ipcam-grid { max-height: 450px; width: 95%; }` and `#ipcam-grid .grid { block-size: 400px; }`) with:

```css
/* IPCAM GRID (preview 2026-10-09). The control points table sits on the panel
   section's width with the quiet chrome of the row grammar: no shadow, a
   caption header, tabular numbers on the right. Scoped to this table; the
   Results grid keeps the .grid look. */
#ipcam-grid {
    width: 100%;
    max-height: none;
    margin-top: var(--space-3);
    overflow: hidden;
    box-shadow: none;
}

#ipcam-grid .grid {
    block-size: clamp(190px, 34vh, 400px);
    --rdg-font-size: var(--text-caption);
    --rdg-header-background-color: var(--grid-header-bg);
    font-variant-numeric: tabular-nums;
}

#ipcam-grid .grid .rdg-header-row {
    border-bottom: 1px solid var(--border-color);
    font-size: var(--text-caption);
    font-weight: 600;
    letter-spacing: 0;
    text-transform: none;
    color: var(--text-subdued);
}

#ipcam-grid .rdg-cell {
    padding-inline: 6px;
    border-inline-end: 0;
    border-block-end: 0;
}

#ipcam-grid .cp-cell-num {
    display: flex;
    align-items: center;
    justify-content: flex-end;
}

#ipcam-grid .cp-cell-label {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    cursor: pointer;
}

#ipcam-grid .cp-cell-select {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-inline: 0;
}

/* The header's sort control: the header text itself, as a button. */
#ipcam-grid .cp-sort {
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    white-space: nowrap;
}

#ipcam-grid .cp-sort[aria-pressed="true"],
#ipcam-grid .cp-sort:hover {
    color: var(--text-primary);
}

#ipcam-grid .cp-sort:focus-visible {
    outline: 2px solid var(--accent-color);
    outline-offset: 2px;
}

/* A grade dot before a fair or bad error; a good one carries none. */
#ipcam-grid .cp-err {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
}

#ipcam-grid .cp-err-fair::before,
#ipcam-grid .cp-err-bad::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 50%;
}

#ipcam-grid .cp-err-fair::before {
    background-color: var(--status-fair);
}

#ipcam-grid .cp-err-bad::before {
    background-color: var(--status-bad);
}

/* The active point: an accent tint and bar, the same point ringed on the
   frame. color-mix, not a surface token: the surfaces collapse in light and
   dracula. */
#ipcam-grid .rdg-row.cp-row-active .rdg-cell {
    background-color: color-mix(in srgb, var(--accent-color) 16%, transparent);
}

#ipcam-grid .rdg-row.cp-row-active .rdg-cell:first-child {
    box-shadow: inset 2px 0 0 var(--accent-color);
}

/* A point left out of the solve keeps its values, subdued. */
#ipcam-grid .rdg-row.cp-row-off .rdg-cell {
    color: var(--text-subdued);
}

#ipcam-grid .cp-table-foot {
    display: flex;
    justify-content: space-between;
    padding: 6px var(--space-2);
    border-top: 1px solid var(--border-color);
    font-size: var(--text-caption);
    font-variant-numeric: tabular-nums;
    color: var(--text-subdued);
}
/* END IPCAM GRID */
```

Write no `*/` inside the prose of these comments other than the closing one: a stray one closes the comment early and the browser drops the next rule while tests stay green.

- [ ] **Step 4: Verify**

Run: `npx jest src/helpers/ipcamGridCss.test.ts src/helpers/themeStateContrast.test.ts`
Expected: PASS. Prove the guard bites: add `box-shadow: 0 4px 16px #000;` to the `#ipcam-grid` rule, rerun, expect two FAILs, restore.

Run: `npx tsc --noEmit -p tsconfig.json | wc -l` and `npm run lint`.

- [ ] **Step 5: Commit**

```bash
git add src/components/IpcamGrid.tsx src/components/components.css src/helpers/ipcamGridCss.test.ts src/helpers/themeStateContrast.test.ts
git commit -m "Show each control point's error in a table that fits the panel"
```

---

### Task 8: The map, then the walkthrough

**Files:**
- Create: `src/components/Graphs/pointsMapFormat.ts`, `src/components/Graphs/pointsMapFormat.test.ts`
- Modify: `src/components/Graphs/PointsMap.tsx`, `src/components/Graphs/pointsMapSvg.ts`, `src/components/Graphs/scaleBar.ts`, `src/components/Graphs/graphs.css`, `src/constants/constants.ts` (delete `IPCAM_GRID_PROPORTION` if nothing else reads it)

**Interfaces:**
- Produces: `coordTick(value: number): string` (plain integer, no separators); `scaleBarLabel(lengthInUnit: number, unit: string): string` (no decimals when the value is whole, otherwise up to 2); `scaleBar(...)` gains an optional last argument `variant?: 'image' | 'panel'` (default `'image'`, today's look, used by UAV and Oblique).

- [ ] **Step 1: Write the failing test**

```ts
// src/components/Graphs/pointsMapFormat.test.ts
import { coordTick, scaleBarLabel } from './pointsMapFormat';

describe('map formatting', () => {
  test('a coordinate tick is a plain integer', () => {
    expect(coordTick(6524050)).toBe('6524050');
    expect(coordTick(4388450.4)).toBe('4388450');
    expect(coordTick(-120.6)).toBe('-121');
  });
  test('the scale bar label drops false decimals', () => {
    expect(scaleBarLabel(30, 'm')).toBe('30 m');
    expect(scaleBarLabel(98.4252, 'ft')).toBe('98.43 ft');
    expect(scaleBarLabel(0.5, 'm')).toBe('0.5 m');
  });
});
```

Run: `npx jest src/components/Graphs/pointsMapFormat.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 2: Implement the formatters**

```ts
// src/components/Graphs/pointsMapFormat.ts
/** A map coordinate is a position, not a quantity: no thousands separators. */
export const coordTick = (value: number): string => String(Math.round(value));

/** "30 m", not "30.00 m": at most two decimals, and none that are zero. */
export const scaleBarLabel = (lengthInUnit: number, unit: string): string =>
  `${parseFloat(lengthInUnit.toFixed(2))} ${unit}`;
```

Run the test. Expected: PASS.

- [ ] **Step 3: `scaleBar.ts`**

Add the parameter `variant: 'image' | 'panel' = 'image'` after `unitSistem`, import `scaleBarLabel`, and replace the two appended elements' styling:

```ts
  scaleBarGroup
    .append('rect')
    .attr('class', `scale-bar-rect scale-bar-${variant}`)
    .attr('x', marginLeft + xScale(xPos))
    .attr('y', marginTop + yScale(yPos))
    .attr('width', xScale(scaleLength) - xScale(0))
    .attr('height', yScale(0) - yScale(barHeight));

  scaleBarGroup
    .append('text')
    .attr('class', `scale-bar-text scale-bar-${variant}`)
    .attr('x', marginLeft + xScale(xPos + scaleLength / 2))
    .attr('y', marginTop + yScale(yPos) - 10)
    .attr('text-anchor', 'middle')
    .text(
      variant === 'panel'
        ? scaleBarLabel(scaleLength * displayFactor, unitLabel)
        : `${(scaleLength * displayFactor).toFixed(2)} ${unitLabel}`
    );
```

and in `graphs.css` keep today's look for the default variant and add the panel one:

```css
/* Scale bar. "image" sits on an orthoimage (UAV, Oblique): white on the
   photo, as before. "panel" is the fixed-station map, haloed so it reads on
   the photo and on the panel ground alike. */
.scale-bar-rect.scale-bar-image {
  fill: #ffffff; /* scale-exception: on footage, theme-invariant */
  stroke: #000000;
}

.scale-bar-text.scale-bar-image {
  fill: #ffffff;
  font-size: 14px;
  font-weight: bold;
}

.scale-bar-rect.scale-bar-panel {
  fill: var(--overlay-line);
  stroke: var(--pin-ink);
}

.scale-bar-text.scale-bar-panel {
  fill: var(--overlay-line);
  stroke: var(--pin-ink);
  stroke-width: 3px;
  paint-order: stroke;
  font-size: var(--text-caption);
  font-weight: 600;
}
```

Check how `graphs.css` writes exceptions for literal colours in existing rules (search `scale-exception`) and whether a colour-literal guard scans this file (`grep -rln "graphs.css" src/helpers/*.test.ts`); if one does, use `var(--overlay-line)` / `var(--pin-ink)` for the image variant as well, which are the same values.

- [ ] **Step 4: `pointsMapSvg.ts` and `PointsMap.tsx`**

In `pointsMapSvg.ts`:

1. Import `coordTick` and `getOverlayColors`, `getPinColors` from `../../helpers/getCSSVar`; delete the `COLORS` import.
2. In `drawAnalizeResult`, set `margin.left = 62; margin.bottom = 26; margin.right = 8; margin.top = 8;`.
3. Replace both axis constructions (the initial ones and the two inside `zoomed`) with:

```ts
  const makeXAxis = (scale: d3.ScaleLinear<number, number>) =>
    d3.axisBottom(scale).ticks(3).tickSizeOuter(0).tickFormat((d) => coordTick(d as number));
  const makeYAxis = (scale: d3.ScaleLinear<number, number>) =>
    d3.axisLeft(scale).ticks(3).tickSizeOuter(0).tickFormat((d) => coordTick(d as number));
```

   using `makeXAxis(xScale)`, `makeYAxis(yScale)` at creation and `makeXAxis(newXScale)`, `makeYAxis(newYScale)` in `zoomed`. Remove the two `.attr('font-size', '12px')` calls and give the groups `class` `'x-axis points-map-axis'` and `'y-axis points-map-axis'` (keep `x-axis` / `y-axis` first: `zoomed` selects them).
4. Pass `'panel'` as the last argument of both `scaleBar(...)` calls.
5. In `drawPoints`, draw each cross twice: first a halo pair, then the coloured pair. Replace the two `stroke` callbacks and widths:

```ts
  const overlay = getOverlayColors();
  const pins = getPinColors();
  const crossColor = (d: { selected: boolean }, i: number) =>
    d.selected === false ? 'transparent' : i === activePoint ? overlay.line : pins.point;
  const crossWidth = (_d: unknown, i: number) => (i === activePoint ? 2.5 : 2);
```

   For each of `line1` and `line2`, append before it a selection with class `cross-halo` and the same `x1/y1/x2/y2`, `stroke` `(d) => (d.selected === false ? 'transparent' : 'rgba(0, 0, 0, 0.55)')`, `stroke-width` 4, `stroke-linecap` `round`; return the halos too (`halo1`, `halo2`) and update them in `zoomed` exactly as `line1` and `line2` are updated. Import `OVERLAY_HALO_COLOR` from `./overlayStyle` and use it instead of the literal.
6. In the pre-solve branch (the `else` with "Ticks on all edges"), replace every `.attr('stroke', 'white')` with `.attr('class', 'points-map-frame')` kept alongside the existing class (for example `.attr('class', 'x-tick-top points-map-frame')`), and the tooltip's `.attr('fill', 'white')` with `.attr('class', 'points-map-tip')`.

Add to `graphs.css`:

```css
/* Fixed-station points map: quiet axes in theme tokens. */
.points-map-axis {
  font-size: 11px; /* scale-exception: axis ticks, one step under --text-caption so 7-digit coordinates fit */
  font-variant-numeric: tabular-nums;
  color: var(--text-subdued);
}

.points-map-axis .domain,
.points-map-axis .tick line {
  stroke: var(--border-color);
}

.points-map-frame {
  stroke: var(--text-subdued);
}

.points-map-tip {
  fill: var(--text-primary);
  font-size: var(--text-caption);
}
```

In `PointsMap.tsx`, size from the container instead of the window:

```tsx
export const PointsMap = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const { points, activePoint, cameraSolution } = useIpcamSlice();
  const { projectDetails } = useProjectSlice();

  const cameraPosition = cameraSolution?.cameraPosition;
  const orthoExtent = cameraSolution?.orthoExtent;
  const orthoImagePath = cameraSolution?.orthoImagePath;

  useEffect(() => {
    if (!boxRef.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(boxRef.current);
    return () => observer.disconnect();
  }, []);

  // The orthoimage's own shape, capped at a square, so the map never pushes the table off the panel.
  const aspect =
    orthoExtent && orthoExtent[1] !== orthoExtent[0]
      ? Math.abs(orthoExtent[3] - orthoExtent[2]) / Math.abs(orthoExtent[1] - orthoExtent[0])
      : 1;
  const height = Math.round(width * Math.min(1, Math.max(0.5, aspect)));

  useEffect(() => {
    d3.select(svgRef.current).selectAll('*').remove();
    if (points && svgRef.current && width > 0) {
      pointsMapSvg({
        svgElement: svgRef.current,
        points,
        activePoint: activePoint ?? undefined,
        orthoImagePath,
        cameraPosition,
        orthoExtent,
        unitSistem: projectDetails.unitSistem,
      });
    }
  }, [points, width, height, cameraPosition, projectDetails.unitSistem, activePoint, orthoExtent, orthoImagePath]);

  return (
    <div ref={boxRef} className="points-map-box">
      {points && width > 0 && <svg ref={svgRef} width={width} height={height} className="points-map-svg" />}
    </div>
  );
};
```

(update the imports: `useEffect, useRef, useState` from react; drop `useUiSlice` and `GRAPHS`.) Check how `activePoint` was passed before (`number | null` into a `number | undefined` prop) and keep whichever form type-checks. Keep the map inert as it is today: the old svg carried an inline `pointerEvents: 'none'`, so wheel and drag pass through to the panel's scroll. That now lives in the `.points-map-svg` rule below; do not remove it, or scrolling the panel over the map would zoom the map instead.

Add to `graphs.css`:

```css
.points-map-box {
  margin-top: var(--space-3);
}

.points-map-svg {
  display: block;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: var(--grid-bg-odd);
  box-sizing: border-box;
  pointer-events: none;
}
```

and delete the `.points-map { background-color: #ffffff; }` rule in `components.css` if `pointsMapSvg.ts` no longer needs it: the inner `svg.append('svg')...attr('class', 'points-map')` element is an empty child with no geometry, so remove that line in `pointsMapSvg.ts` as well.

Then: `grep -rn "IPCAM_GRID_PROPORTION" src` and delete the constant if only its declaration is left.

- [ ] **Step 5: Verify the code**

Run: `npx jest`, `npx tsc --noEmit -p tsconfig.json | wc -l`, `npm run lint`.
Expected: all green, type-check count at the baseline.

- [ ] **Step 6: Commit**

```bash
git add src/components/Graphs/pointsMapFormat.ts src/components/Graphs/pointsMapFormat.test.ts src/components/Graphs/PointsMap.tsx src/components/Graphs/pointsMapSvg.ts src/components/Graphs/scaleBar.ts src/components/Graphs/graphs.css src/components/components.css src/constants/constants.ts
git commit -m "Fit the control points map to the panel with plain coordinates and haloed markers"
```

- [ ] **Step 7: In-app walkthrough (dark, light, dracula)**

Start the app as the camera-calibration memory describes: `npm run dev -- --port 5174 --strictPort`, then launch Electron with Playwright `_electron.launch({ executablePath: 'node_modules/.bin/electron', args: ['.'], env: { ...process.env, VITE_DEV_SERVER_URL: 'http://localhost:5174' } })`, passing the `gui` directory and not `dist-electron/main.js`. Open a fixed-station project from `~/Documents/RIVeR` that has points and images. For each theme, screenshot and check:

1. Before import: no table, no placeholder rows, drop hint visible, Solve disabled.
2. After import: Method switch on All points, Solve enabled, table shows Label / East / North / Z with an empty Error column, no horizontal scrollbar at a 400 px panel.
3. Solve with All points: result block with the mean error, its badge and the right unit; residuals coloured per point; ellipses outlined in white and visibly smaller than before in the report; map full width with plain coordinates.
4. Click the Error header: worst first, then best first, then file order; ticking a checkbox after sorting unticks the right pin on the frame.
5. Click a row: the pin gets its ring and the chip with label and error; the row gets the accent bar; the line under the table shows its x / y.
6. Untick points until 5 remain: the hint "Tick at least 6 points to solve." shows and Solve is disabled; hovering Optimized shows its tooltip.
7. Switch to Optimized and Solve: the result updates, unticked points go grey and small on the frame.
8. Imperial units (report step, then back): coordinates and camera height convert, the table still fits.
9. Report step: the calibration sheet's frame shows the new ellipse and residuals.
10. Zoom the frame to 4x: ellipse and residual strokes keep their on-screen width; the chip stays inside the image near the right edge.

Fix what the walkthrough shows in one batch, rerun the affected tests, and commit the fixes as their own commit. Report anything that cannot be fixed without a design decision instead of deciding it.
