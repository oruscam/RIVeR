# Report Compact Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the exported report's layout as a compact flow of blocks: a header, one compact block per cross section with a report-specific profile plot, and the method blocks, all packed onto as few A4 pages as possible.

**Architecture:** The report becomes an ordered list of blocks (header, section, table continuation, method). Report.tsx renders every block once in a hidden measuring column with the same width as a page body, reads each block's height, and a pure `paginate` packs the blocks onto pages in order. The profile plot is a pure geometry helper (`reportPlot.ts`) rendered by a plain React SVG component whose colours come from CSS classes, so the exported HTML stays self-contained and print-safe. The data model from the first build (`reportModel.ts`, `getEffectiveTechniqueData`) is unchanged.

**Tech Stack:** React 18 + TypeScript, react-i18next, Jest (ts-jest, `testEnvironment: node`, no jsdom: tests are pure-function tests or source-text guards), Electron.

**Spec:** `gui/docs/superpowers/specs/2026-10-02-report-redesign-design.md`. Read §8 (compact layout amendment) first: it overrides §3 and §6. Approved mockups: `gui/docs/superpowers/previews/2026-10-02-report-compact.html` (one page, single section) and `gui/docs/superpowers/previews/2026-10-02-report-compact-sections.html`.

## Global Constraints

- Work in `/Users/antoine/river_compil/.worktrees/ui-design-refresh/gui` on branch `ui/design-refresh`. Commit with the `river-git` skill conventions, author `antoine.patalano@gmail.com`, and **no Co-Authored-By line**. Stage files explicitly; never `git add -A` at the repo root; never `git stash`.
- The export is one self-contained HTML file (inlined CSS, data-URI images). No external fonts, scripts or stylesheets.
- The report is a fixed light document, independent of the app theme (dark, light, dracula). Plot colours come from CSS classes using `var(--tech-*)` / `var(--pin-*)` inside `.report-doc`, never from `getCSSVar` at render time.
- A4 portrait. A block never splits across pages; page footer reads "River @ Site · date" and "page n / N" with N = number of pages.
- Values display with at most 2 decimals (`src/helpers/displayDecimals.test.ts` stays green); pixel size (GSD) keeps its declared 4-significant-digit exception.
- SI and imperial both respected: the model holds SI values; components convert with `UNIT_CONVERSIONS` and label with `getUnit`.
- Show only what was applied: no "No" rows for corrections that were not used.
- Discharge per section is the active technique's live value (`getEffectiveTechniqueData` / `reportModel`), never `data.total_Q`.
- σ exists only for LSPIV; STIV/iWave show Q without ±.
- Techniques are told apart by colour **and** by label or marker; never colour alone. Interpolated stations are told apart by a hollow marker / `*`, never colour alone.
- Red = left bank, green = right bank.
- RIVeR version comes from `import.meta.env.VITE_APP_VERSION`.
- New UI strings use `t('Report.Doc.<key>', { defaultValue: '...' })` and are added to `src/translations/en/global.json` (inside `Report.Doc`) only.
- `report.css` keeps its `scale-exempt-file` header comment as its first bytes. No sub-pixel borders (project guard). No inline `fontSize` styles (project guard `inlineStyleScale.test.ts`).
- No eyebrow / kicker labels (`.doc-kicker` is removed).
- Type: body 11 px, tables 9.5 px, plot labels 8 px.
- Lint command is `npm run lint` (baseline 47 problems at the plan's start commit; add none). Type check: `npx tsc --noEmit -p .` (only pre-existing TS6305 dist noise).

## Review Focus

1. **A long section (100+ stations).** The section block keeps its first 48 stations and the rest continue in table-continuation blocks; no block is taller than a page, nothing is clipped, and page n / N stays correct. Pinned in Task 1 (`stationChunks`, `paginate` oversized block) and Task 7 (blocks built from chunks).
2. **Translated labels that wrap** (e.g. Spanish/French strings longer than English). Heights are measured, not estimated, so a wrapping line pushes a block to the next page instead of overflowing. Pinned in Task 7 (measurement guard: heights read from `offsetHeight` of `[data-block]`).
3. **A section with a null velocity at a station** (excluded, not interpolated). The plot breaks the line there, the table shows "-" for both Vs and Q. Pinned in Task 2 (path breaks on null) and Task 4 (Q cell guard).
4. **Dark or dracula app theme at export.** Plot colours come from CSS classes inside the light scope, so the exported plot is light whatever the app theme. Pinned in Task 3 (guard: no `getCSSVar`/`getTechniqueColors` in ProfilePlot, classes present in report.css).
5. **Export failure on one image** (missing ortho path, tainted canvas). The spinner clears and the user is not left stuck. Pinned in Task 7 (try/finally guard; per-image fallback to the original src).

---

## File Structure

| File | Responsibility |
|---|---|
| Create `src/helpers/reportFlow.ts` | Pure: `paginate` blocks onto pages, `stationChunks`, `splitInto` for table columns. |
| Create `src/helpers/reportFlow.test.ts` | Tests. |
| Create `src/helpers/reportPlot.ts` | Pure: `niceTicks`, `formatTick`, `buildProfilePlot` geometry, `plotInputFromSection`. |
| Create `src/helpers/reportPlot.test.ts` | Tests. |
| Create `src/components/Report/ProfilePlot.tsx` | Renders the plot geometry as SVG with CSS classes. |
| Create `src/components/Report/SectionBlock.tsx` | Section header line, comparison line, frame + plot row, first table chunk. |
| Create `src/components/Report/TableContinuation.tsx` | A later chunk of a long station table. |
| Modify `src/components/Report/StationTable.tsx` | Three columns; Q "-" where Vs is null. |
| Create `src/components/Report/FootageIcon.tsx` | Inline SVG line icon per footage type (same drawings as `src/assets/icons/*.svg`). |
| Create `src/components/Report/ReportHeader.tsx` | Masthead, verdict, applied line, multi-section tables. |
| Modify `src/components/Report/CalibrationSheet.tsx` | Export `CalibrationPanel` (compact, image beside text); keep a temporary `CalibrationSheet` wrapper until Task 7. |
| Create `src/components/Report/Method.tsx` | `MethodBlock` (calibration + footage), `SnapshotStrip`, `ProcessingBlock`, `Colophon`. |
| Modify `src/components/Report/Sheet.tsx` | Footer with logo, "River @ Site · date", page n / N. |
| Modify `src/components/Report/report.css` | Compact rules, plot classes, measuring column, font fix. |
| Modify `src/pages/Report.tsx` | Build blocks, measure, paginate, render pages; robust export. |
| Modify `src/components/Report/index.ts` | Export the new components. |
| Delete `src/components/Report/Cover.tsx`, `SectionSheet.tsx`, `FootageSheet.tsx` (Task 7) | Replaced. |
| Modify `src/helpers/reportLayout.ts`, `reportLayout.test.ts`, `src/constants/constants.ts` (Task 7) | Remove `buildSheets`, `splitColumns`, unused `REPORT_SHEET` keys. |
| Modify `src/helpers/reportDocument.test.ts` | Source-text guards (each task appends; Task 7 removes guards for deleted files). |
| Modify `src/translations/en/global.json` | New `Report.Doc` keys. |

---

### Task 1: Page flow helpers

**Files:**
- Create: `src/helpers/reportFlow.ts`
- Test: `src/helpers/reportFlow.test.ts`
- Modify: `src/constants/constants.ts` (add `REPORT_FLOW` right after `REPORT_SHEET`)

**Interfaces:**
- Produces:
  ```ts
  export interface FlowBlock { id: string; height: number }
  /** Pages of block ids, in order. A block never splits; a block taller than the page gets a page of its own. */
  export function paginate(blocks: FlowBlock[], pageHeight: number, gap: number): string[][];
  /** [start, end) station ranges: the first holds up to REPORT_FLOW.FIRST_CHUNK_STATIONS, the rest up to CONTINUATION_CHUNK_STATIONS each. */
  export function stationChunks(count: number): [number, number][];
  /** Split [start, end) into `parts` contiguous ranges, earlier ones longer by at most one; never returns empty ranges. */
  export function splitInto(start: number, end: number, parts: number): [number, number][];
  ```
  `REPORT_FLOW = { BODY_HEIGHT: 1020, GAP: 10, FRAME_WIDTH: 300, FRAME_MAX_HEIGHT: 200, PLOT_WIDTH: 380, PLOT_HEIGHT: 196, TABLE_COLUMNS: 3, FIRST_CHUNK_STATIONS: 48, CONTINUATION_CHUNK_STATIONS: 180, METHOD_IMAGE_WIDTH: 140, FALLBACK_BLOCK_HEIGHT: 400 }`.

- [ ] **Step 1: Add the constants**

```ts
// in src/constants/constants.ts, directly after the REPORT_SHEET block
/**
 * Compact report flow (spec §8). A4 at 96 dpi is 794 × 1123 px; with 11 mm top padding and the
 * footer (~48 px incl. its 8 mm bottom margin) a page body is ~1033 px tall; BODY_HEIGHT keeps
 * a small safety margin. The page body is 186 mm (~703 px) wide.
 */
export const REPORT_FLOW = {
  BODY_HEIGHT: 1020,
  GAP: 10,
  FRAME_WIDTH: 300,
  FRAME_MAX_HEIGHT: 200,
  PLOT_WIDTH: 380,
  PLOT_HEIGHT: 196,
  TABLE_COLUMNS: 3,
  /** Stations shown inside the section block itself (three columns of 16). */
  FIRST_CHUNK_STATIONS: 48,
  /** Stations per table-continuation block (three columns of 60). */
  CONTINUATION_CHUNK_STATIONS: 180,
  METHOD_IMAGE_WIDTH: 140,
  /** Used for a block until its height has been measured once. */
  FALLBACK_BLOCK_HEIGHT: 400,
};
```

- [ ] **Step 2: Write the failing tests**

```ts
import { paginate, splitInto, stationChunks } from './reportFlow';

describe('paginate', () => {
  const b = (id: string, height: number) => ({ id, height });

  test('packs blocks in order, adding the gap between blocks on the same page', () => {
    // 400 + 10 + 400 = 810 fits; + 10 + 300 = 1120 does not.
    expect(paginate([b('a', 400), b('b', 400), b('c', 300)], 1000, 10)).toEqual([['a', 'b'], ['c']]);
  });

  test('a block that exactly fills the remaining space stays on the page', () => {
    expect(paginate([b('a', 490), b('b', 500)], 1000, 10)).toEqual([['a', 'b']]);
  });

  test('a block taller than a page gets its own page and does not loop', () => {
    expect(paginate([b('a', 100), b('huge', 1500), b('c', 100)], 1000, 10)).toEqual([['a'], ['huge'], ['c']]);
  });

  test('no blocks: one empty page, so the report still has a page to show', () => {
    expect(paginate([], 1000, 10)).toEqual([[]]);
  });
});

describe('stationChunks', () => {
  test('a short section is one chunk', () => {
    expect(stationChunks(15)).toEqual([[0, 15]]);
  });
  test('exactly 48 stations makes no empty continuation', () => {
    expect(stationChunks(48)).toEqual([[0, 48]]);
  });
  test('250 stations: 48 in the section block, then 180, then the rest', () => {
    expect(stationChunks(250)).toEqual([
      [0, 48],
      [48, 228],
      [228, 250],
    ]);
  });
  test('no stations: one empty chunk', () => {
    expect(stationChunks(0)).toEqual([[0, 0]]);
  });
});

describe('splitInto', () => {
  test('15 rows in three columns of 5', () => {
    expect(splitInto(0, 15, 3)).toEqual([
      [0, 5],
      [5, 10],
      [10, 15],
    ]);
  });
  test('uneven counts: earlier columns are longer by at most one', () => {
    expect(splitInto(0, 16, 3)).toEqual([
      [0, 6],
      [6, 11],
      [11, 16],
    ]);
  });
  test('fewer rows than columns: no empty columns', () => {
    expect(splitInto(10, 12, 3)).toEqual([
      [10, 11],
      [11, 12],
    ]);
  });
  test('empty range: no columns', () => {
    expect(splitInto(0, 0, 3)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npx jest src/helpers/reportFlow.test.ts`
Expected: FAIL, "Cannot find module './reportFlow'".

- [ ] **Step 4: Implement**

```ts
import { REPORT_FLOW } from '../constants/constants';

export interface FlowBlock {
  id: string;
  height: number;
}

/** Pages of block ids, in order. A block never splits; a block taller than the page gets a page of its own. */
export function paginate(blocks: FlowBlock[], pageHeight: number, gap: number): string[][] {
  const pages: string[][] = [[]];
  let used = 0;
  blocks.forEach((block) => {
    const page = pages[pages.length - 1];
    const needed = page.length === 0 ? block.height : used + gap + block.height;
    if (page.length > 0 && needed > pageHeight) {
      pages.push([block.id]);
      used = block.height;
      return;
    }
    page.push(block.id);
    used = needed;
  });
  return pages;
}

export function stationChunks(count: number): [number, number][] {
  const first = Math.min(count, REPORT_FLOW.FIRST_CHUNK_STATIONS);
  const chunks: [number, number][] = [[0, first]];
  for (let start = first; start < count; start += REPORT_FLOW.CONTINUATION_CHUNK_STATIONS) {
    chunks.push([start, Math.min(count, start + REPORT_FLOW.CONTINUATION_CHUNK_STATIONS)]);
  }
  return chunks;
}

export function splitInto(start: number, end: number, parts: number): [number, number][] {
  const count = end - start;
  if (count <= 0) return [];
  const columns = Math.min(parts, count);
  const base = Math.floor(count / columns);
  const extra = count % columns;
  const ranges: [number, number][] = [];
  let from = start;
  for (let k = 0; k < columns; k++) {
    const to = from + base + (k < extra ? 1 : 0);
    ranges.push([from, to]);
    from = to;
  }
  return ranges;
}
```

- [ ] **Step 5: Run tests**

Run: `npx jest src/helpers/reportFlow.test.ts` → PASS. Then `npx jest src/helpers` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/helpers/reportFlow.ts src/helpers/reportFlow.test.ts src/constants/constants.ts
git commit -m "Report flow: pack blocks onto A4 pages, chunk long station tables, split tables into columns"
```

---

### Task 2: Profile plot geometry

**Files:**
- Create: `src/helpers/reportPlot.ts`
- Test: `src/helpers/reportPlot.test.ts`

**Interfaces:**
- Consumes: `Technique` from `src/helpers/techniqueDischarge.ts`; `REPORT_FLOW.PLOT_WIDTH/PLOT_HEIGHT` (Task 1).
- Produces:
  ```ts
  export interface PlotTick { y: number; label: string; zero: boolean }
  export interface PlotPanel { title: string; top: number; height: number; ticks: PlotTick[] }
  export interface PlotMarker { x: number; y: number; hollow: boolean }
  export interface PlotSeries { technique: Technique; active: boolean; path: string; markers: PlotMarker[] }
  export interface PlotBar { x: number; y: number; width: number; height: number }
  export interface ProfilePlotGeometry {
    width: number; height: number; left: number; right: number;
    panels: { q: PlotPanel; v: PlotPanel; d: PlotPanel };
    bars: PlotBar[];
    series: PlotSeries[];
    bed: { area: string; line: string };
    xTicks: { x: number; label: string }[];
    xAxisY: number;
    banks: { left: number; right: number };
  }
  export interface ProfilePlotInput {
    /** Display units (already converted for imperial). */
    x: number[]; depth: number[]; q: (number | null)[];
    series: { technique: Technique; active: boolean; v: (number | null)[]; interp: boolean[] }[];
    titles: { q: string; v: string; d: string };
  }
  export function niceTicks(min: number, max: number, target?: number): number[];
  export function formatTick(value: number, step: number): string;
  export function buildProfilePlot(input: ProfilePlotInput): ProfilePlotGeometry;
  ```

Geometry (viewBox units, matches the approved mockup): width 380, height 196, left 28, right 6. Panels: q top 10 height 36; v top 62 height 58; d top 136 height 34. x tick labels at y 179, x-axis title at y 190 (`xAxisY = 179`). Bars are 60 % of the mean station spacing wide, centred on each station. Depth is drawn downward from 0 at the panel top.

- [ ] **Step 1: Write the failing tests**

```ts
import { buildProfilePlot, formatTick, niceTicks } from './reportPlot';

describe('niceTicks', () => {
  test('rounds the domain out to a 1-2-2.5-5 step', () => {
    expect(niceTicks(0, 0.23, 3)).toEqual([0, 0.1, 0.2, 0.3]);
    expect(niceTicks(-0.33, 1.03, 4)).toEqual([-0.5, 0, 0.5, 1, 1.5]);
  });
  test('no float noise in the ticks', () => {
    expect(niceTicks(0, 0.7, 3)).toEqual([0, 0.25, 0.5, 0.75]);
  });
  test('a flat domain still gets a usable axis', () => {
    expect(niceTicks(0, 0, 3)).toEqual([0, 0.5, 1]);
    expect(niceTicks(2, 2, 3)).toEqual([1, 2, 3]);
  });
});

describe('formatTick', () => {
  test('as many decimals as the step needs, never more than 2', () => {
    expect(formatTick(1, 1)).toBe('1');
    expect(formatTick(0.5, 0.5)).toBe('0.5');
    expect(formatTick(0.25, 0.25)).toBe('0.25');
    expect(formatTick(0.125, 0.125)).toBe('0.13');
  });
});

const input = {
  x: [0, 1, 2, 3],
  depth: [0, 1, 1.2, 0],
  q: [0, 0.2, 0.3, 0],
  series: [
    { technique: 'stiv' as const, active: false, v: [0.1, 0.8, null, 0.2], interp: [false, false, false, false] },
    { technique: 'lspiv' as const, active: true, v: [null, 0.4, 0.5, null], interp: [false, false, true, false] },
  ],
  titles: { q: 'Q (m³/s)', v: 'Vs (m/s)', d: 'd (m)' },
};

describe('buildProfilePlot', () => {
  const g = buildProfilePlot(input);

  test('fixed frame from the approved mockup', () => {
    expect([g.width, g.height, g.left, g.right]).toEqual([380, 196, 28, 6]);
    expect(g.panels.q).toMatchObject({ top: 10, height: 36, title: 'Q (m³/s)' });
    expect(g.panels.v).toMatchObject({ top: 62, height: 58 });
    expect(g.panels.d).toMatchObject({ top: 136, height: 34 });
  });

  test('x maps the first and last station to the plot edges; banks sit there', () => {
    expect(g.banks).toEqual({ left: 28, right: 374 });
  });

  test('a null velocity breaks the line into separate segments', () => {
    const stiv = g.series.find((s) => s.technique === 'stiv')!;
    expect(stiv.path.match(/M/g)).toHaveLength(2);
    expect(stiv.markers).toHaveLength(3);
  });

  test('the active technique is drawn last so it sits on top', () => {
    expect(g.series[g.series.length - 1].technique).toBe('lspiv');
  });

  test('interpolated stations are hollow markers', () => {
    const lspiv = g.series.find((s) => s.technique === 'lspiv')!;
    expect(lspiv.markers.map((m) => m.hollow)).toEqual([false, true]);
  });

  test('one bar per station with a non-zero discharge, rising from the zero line', () => {
    expect(g.bars).toHaveLength(2);
    const zeroY = g.panels.q.ticks.find((t) => t.zero)!.y;
    g.bars.forEach((bar) => expect(bar.y + bar.height).toBeCloseTo(zeroY));
  });

  test('depth grows downward from 0 at the panel top', () => {
    const zero = g.panels.d.ticks.find((t) => t.label === '0')!;
    expect(zero.y).toBeCloseTo(g.panels.d.top);
    expect(g.bed.line.startsWith('M')).toBe(true);
    expect(g.bed.area.endsWith('Z')).toBe(true);
  });

  test('every tick label has at most 2 decimals', () => {
    const labels = [...g.panels.q.ticks, ...g.panels.v.ticks, ...g.panels.d.ticks].map((t) => t.label);
    labels.forEach((l) => expect(l).toMatch(/^-?\d+(\.\d{1,2})?$/));
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest src/helpers/reportPlot.test.ts`
Expected: FAIL, "Cannot find module './reportPlot'".

- [ ] **Step 3: Implement**

```ts
import { REPORT_FLOW } from '../constants/constants';
import type { Technique } from './techniqueDischarge';

export interface PlotTick {
  y: number;
  label: string;
  zero: boolean;
}
export interface PlotPanel {
  title: string;
  top: number;
  height: number;
  ticks: PlotTick[];
}
export interface PlotMarker {
  x: number;
  y: number;
  hollow: boolean;
}
export interface PlotSeries {
  technique: Technique;
  active: boolean;
  path: string;
  markers: PlotMarker[];
}
export interface PlotBar {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface ProfilePlotGeometry {
  width: number;
  height: number;
  left: number;
  right: number;
  panels: { q: PlotPanel; v: PlotPanel; d: PlotPanel };
  bars: PlotBar[];
  series: PlotSeries[];
  bed: { area: string; line: string };
  xTicks: { x: number; label: string }[];
  xAxisY: number;
  banks: { left: number; right: number };
}
export interface ProfilePlotInput {
  /** Display units (already converted for imperial). */
  x: number[];
  depth: number[];
  q: (number | null)[];
  series: { technique: Technique; active: boolean; v: (number | null)[]; interp: boolean[] }[];
  titles: { q: string; v: string; d: string };
}

const LEFT = 28;
const RIGHT = 6;
const PANEL = { q: { top: 10, height: 36 }, v: { top: 62, height: 58 }, d: { top: 136, height: 34 } };
const X_AXIS_Y = 179;
const r = (v: number) => Math.round(v * 100) / 100;
const clean = (v: number) => +v.toFixed(10);

const niceStep = (raw: number) => {
  const exp = Math.floor(Math.log10(raw));
  const f = raw / 10 ** exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nf * 10 ** exp;
};

export function niceTicks(min: number, max: number, target = 4): number[] {
  let lo = min;
  let hi = max;
  if (hi - lo === 0) {
    if (lo === 0) hi = 1;
    else {
      lo -= 1;
      hi += 1;
    }
  }
  const step = niceStep((hi - lo) / target);
  const start = Math.floor(clean(lo / step)) * step;
  const end = Math.ceil(clean(hi / step)) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(clean(v));
  return ticks;
}

export function formatTick(value: number, step: number): string {
  const decimals = Math.min(2, (String(+step.toFixed(2)).split('.')[1] ?? '').length);
  return value.toFixed(decimals);
}

const finite = (values: (number | null)[]) => values.filter((v): v is number => typeof v === 'number' && isFinite(v));

export function buildProfilePlot(input: ProfilePlotInput): ProfilePlotGeometry {
  const width = REPORT_FLOW.PLOT_WIDTH;
  const height = REPORT_FLOW.PLOT_HEIGHT;
  const plotW = width - LEFT - RIGHT;
  const xMin = Math.min(...input.x);
  const xMax = Math.max(...input.x);
  const xSpan = xMax - xMin || 1;
  const sx = (v: number) => r(LEFT + ((v - xMin) / xSpan) * plotW);

  const axis = (values: number[], panel: { top: number; height: number }, down = false) => {
    const lo = down ? 0 : Math.min(0, ...values);
    const hi = Math.max(0, ...values);
    const ticks = niceTicks(lo, hi, down ? 2 : 3);
    const t0 = ticks[0];
    const t1 = ticks[ticks.length - 1];
    const step = ticks.length > 1 ? ticks[1] - ticks[0] : 1;
    const sy = (v: number) =>
      r(down ? panel.top + ((v - t0) / (t1 - t0)) * panel.height : panel.top + panel.height - ((v - t0) / (t1 - t0)) * panel.height);
    return { sy, ticks: ticks.map((t) => ({ y: sy(t), label: formatTick(t, step), zero: t === 0 })) };
  };

  const qAxis = axis(finite(input.q), PANEL.q);
  const vAxis = axis(input.series.flatMap((s) => finite(s.v)), PANEL.v);
  const dAxis = axis(finite(input.depth), PANEL.d, true);

  const spacing = input.x.length > 1 ? plotW / (input.x.length - 1) : plotW;
  const barW = r(spacing * 0.6);
  const bars: PlotBar[] = [];
  input.q.forEach((q, i) => {
    if (typeof q !== 'number' || q === 0) return;
    const y0 = qAxis.sy(0);
    const y1 = qAxis.sy(q);
    bars.push({ x: r(sx(input.x[i]) - barW / 2), y: Math.min(y0, y1), width: barW, height: r(Math.abs(y0 - y1)) });
  });

  const ordered = [...input.series.filter((s) => !s.active), ...input.series.filter((s) => s.active)];
  const series: PlotSeries[] = ordered.map((s) => {
    let path = '';
    let pen = false;
    const markers: PlotMarker[] = [];
    s.v.forEach((v, i) => {
      if (typeof v !== 'number') {
        pen = false;
        return;
      }
      const x = sx(input.x[i]);
      const y = vAxis.sy(v);
      path += `${pen ? 'L' : 'M'}${x},${y}`;
      pen = true;
      markers.push({ x, y, hollow: s.interp[i] === true });
    });
    return { technique: s.technique, active: s.active, path, markers };
  });

  const bedPoints = input.x.map((x, i) => `${sx(x)},${dAxis.sy(input.depth[i] ?? 0)}`);
  const line = bedPoints.length ? `M${bedPoints.join('L')}` : '';
  const area = bedPoints.length
    ? `M${sx(input.x[0])},${dAxis.sy(0)}L${bedPoints.join('L')}L${sx(input.x[input.x.length - 1])},${dAxis.sy(0)}Z`
    : '';

  const xt = niceTicks(xMin, xMax, 5).filter((t) => t >= xMin && t <= xMax);
  const xStep = xt.length > 1 ? xt[1] - xt[0] : 1;

  return {
    width,
    height,
    left: LEFT,
    right: RIGHT,
    panels: {
      q: { title: input.titles.q, ...PANEL.q, ticks: qAxis.ticks },
      v: { title: input.titles.v, ...PANEL.v, ticks: vAxis.ticks },
      d: { title: input.titles.d, ...PANEL.d, ticks: dAxis.ticks },
    },
    bars,
    series,
    bed: { area, line },
    xTicks: xt.map((t) => ({ x: sx(t), label: formatTick(t, xStep) })),
    xAxisY: X_AXIS_Y,
    banks: { left: sx(xMin), right: sx(xMax) },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx jest src/helpers/reportPlot.test.ts` → PASS. Then `npx jest src/helpers` → PASS (`displayDecimals.test.ts` included).

- [ ] **Step 5: Commit**

```bash
git add src/helpers/reportPlot.ts src/helpers/reportPlot.test.ts
git commit -m "Report profile plot geometry: nice ticks, three panels on one axis, gaps on missing velocities"
```

---

### Task 3: Profile plot component

**Files:**
- Modify: `src/helpers/reportPlot.ts` (add `plotInputFromSection`)
- Modify: `src/helpers/reportPlot.test.ts` (append)
- Create: `src/components/Report/ProfilePlot.tsx`
- Modify: `src/components/Report/report.css` (append plot classes before the `@media print` block)
- Modify: `src/helpers/reportDocument.test.ts` (append), `src/translations/en/global.json`

**Interfaces:**
- Consumes: `buildProfilePlot`, `ProfilePlotInput` (Task 2); `getEffectiveTechniqueData`, `TechniqueOptions` from `src/helpers/techniqueDischarge.ts`; `TECHNIQUE_ORDER` from `src/helpers/reportModel.ts`; `SectionData`, `Technique` from `src/store/section/types.ts`.
- Produces:
  ```ts
  // reportPlot.ts
  export function plotInputFromSection(
    data: SectionData,
    activeTechnique: Technique,
    options: TechniqueOptions,
    units: { length: number; flow: number },
    titles: { q: string; v: string; d: string }
  ): ProfilePlotInput | null;
  ```
  ```tsx
  // ProfilePlot.tsx
  export const ProfilePlot: React.FC<{ storeIndex: number }>;
  ```

- [ ] **Step 1: Append failing tests**

To `src/helpers/reportPlot.test.ts`:

```ts
import { plotInputFromSection } from './reportPlot';
import type { SectionData } from '../store/section/types';

const data = {
  num_stations: 4,
  id: [1, 2, 3, 4],
  distance: [0, 1, 2, 3],
  depth: [0, 1, 1, 0],
  check: [true, true, true, true],
  activeCheck: [true, true, true, true],
  streamwise_velocity_magnitude: [null, 0.5, 0.5, null],
  stiv_velocity_profile: [0.2, 0.8, 0.8, 0.2],
  total_Q: 999,
} as unknown as SectionData;
const options = { interpolated: false, artificialSeeding: false, alpha: 1, step: 1, fps: 30 };
const titles = { q: 'Q', v: 'Vs', d: 'd' };

describe('plotInputFromSection', () => {
  test('one series per computed technique, active flagged; q from the active technique', () => {
    const p = plotInputFromSection(data, 'stiv', options, { length: 1, flow: 1 }, titles)!;
    expect(p.series.map((s) => [s.technique, s.active])).toEqual([
      ['lspiv', false],
      ['stiv', true],
    ]);
    expect(p.q[1]).toBeGreaterThan(0);
  });

  test('imperial: lengths and velocities by the length factor, discharge by the flow factor', () => {
    const si = plotInputFromSection(data, 'lspiv', options, { length: 1, flow: 1 }, titles)!;
    const imp = plotInputFromSection(data, 'lspiv', options, { length: 2, flow: 3 }, titles)!;
    expect(imp.x[3]).toBeCloseTo(si.x[3] * 2);
    expect(imp.depth[1]).toBeCloseTo(si.depth[1] * 2);
    expect(imp.series[0].v[1]!).toBeCloseTo(si.series[0].v[1]! * 2);
    expect(imp.q[1]!).toBeCloseTo(si.q[1]! * 3);
  });

  test('a station whose active velocity is null has no discharge bar', () => {
    const p = plotInputFromSection(data, 'lspiv', options, { length: 1, flow: 1 }, titles)!;
    expect(p.q[0]).toBeNull();
  });

  test('null when the active technique has no result', () => {
    expect(plotInputFromSection(data, 'iwave', options, { length: 1, flow: 1 }, titles)).toBeNull();
  });
});
```

To `src/helpers/reportDocument.test.ts`:

```ts
describe('Profile plot', () => {
  const src = read('src/components/Report/ProfilePlot.tsx');
  const css = read('src/components/Report/report.css');
  test('colours come from CSS classes in the light scope, not from the app theme at render time', () => {
    expect(src).not.toMatch(/getCSSVar|getTechniqueColors|getPinColors/);
    expect(src).toContain('rp-line--');
    expect(css).toMatch(/\.rp-line--lspiv\s*\{[^}]*stroke:\s*var\(--tech-lspiv\)/);
    expect(css).toMatch(/\.rp-bank--left\s*\{[^}]*fill:\s*var\(--pin-left\)/);
  });
  test('distinct markers per technique; interpolated stations hollow', () => {
    expect(src).toMatch(/lspiv[\s\S]*circle/);
    expect(src).toContain('rp-marker--hollow');
  });
  test('does not reuse the app AllInOne plot', () => {
    expect(src).not.toContain('AllInOne');
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest src/helpers/reportPlot.test.ts src/helpers/reportDocument.test.ts`
Expected: FAIL (`plotInputFromSection` not exported; `ProfilePlot.tsx` missing).

- [ ] **Step 3: Implement `plotInputFromSection`**

Append to `src/helpers/reportPlot.ts` (and add the imports at the top: `import { getEffectiveTechniqueData, type TechniqueOptions } from './techniqueDischarge';`, `import { TECHNIQUE_ORDER } from './reportModel';`, `import type { SectionData } from '../store/section/types';`):

```ts
/** Everything the plot draws, in display units. The Results-screen show/hide toggles are ignored on purpose. */
export function plotInputFromSection(
  data: SectionData,
  activeTechnique: Technique,
  options: TechniqueOptions,
  units: { length: number; flow: number },
  titles: { q: string; v: string; d: string }
): ProfilePlotInput | null {
  const active = getEffectiveTechniqueData(data, activeTechnique, options);
  if (!active) return null;
  const scale = (values: (number | null)[], f: number) => values.map((v) => (typeof v === 'number' ? v * f : null));
  const series = TECHNIQUE_ORDER.flatMap((technique) => {
    const effective = technique === activeTechnique ? active : getEffectiveTechniqueData(data, technique, options);
    if (!effective) return [];
    return [
      {
        technique,
        active: technique === activeTechnique,
        v: scale(effective.resolved, units.length),
        interp: effective.interpFlags,
      },
    ];
  });
  return {
    x: data.distance.map((v) => v * units.length),
    depth: data.depth.map((v) => v * units.length),
    q: active.Q.map((q, i) => (active.resolved[i] === null ? null : q * units.flow)),
    series,
    titles,
  };
}
```

If importing `TECHNIQUE_ORDER` from `reportModel.ts` creates a circular import, copy the constant (`['lspiv', 'stiv', 'iwave']`) locally instead and say so in the report.

- [ ] **Step 4: Implement `ProfilePlot.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import { getUnit } from '../../helpers';
import { useProjectSlice, useSectionSlice } from '../../hooks';
import { REPORT_FLOW, UNIT_CONVERSIONS } from '../../constants/constants';
import { buildProfilePlot, plotInputFromSection, type PlotMarker } from '../../helpers/reportPlot';
import { TECHNIQUE_LABEL } from '../../helpers/reportModel';
import type { Technique } from '../../store/section/types';

const Marker = ({ technique, m }: { technique: Technique; m: PlotMarker }) => {
  const cls = `rp-marker rp-marker--${technique}${m.hollow ? ' rp-marker--hollow' : ''}`;
  if (technique === 'lspiv') return <circle className={cls} cx={m.x} cy={m.y} r={2.2} />;
  if (technique === 'stiv') return <rect className={cls} x={m.x - 2} y={m.y - 2} width={4} height={4} />;
  return <path className={cls} d={`M${m.x},${m.y - 2.6}L${m.x + 2.4},${m.y + 1.8}L${m.x - 2.4},${m.y + 1.8}Z`} />;
};

/** Discharge per station, surface velocity per technique and depth on one x axis, drawn for paper. */
export const ProfilePlot = ({ storeIndex }: { storeIndex: number }) => {
  const { t } = useTranslation();
  const { sections } = useSectionSlice();
  const { projectDetails, video } = useProjectSlice();
  const section = sections[storeIndex];
  if (!section?.data) return null;

  const { unitSistem } = projectDetails;
  const imperial = unitSistem === 'imperial';
  const input = plotInputFromSection(
    section.data,
    section.activeTechnique,
    {
      interpolated: section.interpolated,
      artificialSeeding: section.artificialSeeding,
      alpha: section.alpha,
      step: video.parameters.step,
      fps: video.data.fps,
    },
    { length: imperial ? UNIT_CONVERSIONS.M_TO_FT : 1, flow: imperial ? UNIT_CONVERSIONS.M3_TO_FT3 : 1 },
    {
      q: `${t('Report.Doc.plotQ', { defaultValue: 'Discharge per station' })} Q (${getUnit(unitSistem, 'flow')})`,
      v: `${t('Report.Doc.plotV', { defaultValue: 'Surface velocity' })} Vs (${getUnit(unitSistem, 'velocity')})`,
      d: `${t('Report.Doc.plotD', { defaultValue: 'Depth' })} d (${getUnit(unitSistem, 'longitude')})`,
    }
  );
  if (!input) return null;
  const g = buildProfilePlot(input);
  const lineLabel = (technique: Technique, active: boolean) =>
    `${TECHNIQUE_LABEL[technique]}${active ? ` · ${t('Report.Doc.reported', { defaultValue: 'reported' })}` : ''}`;
  const legend = [...g.series].reverse();

  return (
    <svg className="rp" width={REPORT_FLOW.PLOT_WIDTH} height={REPORT_FLOW.PLOT_HEIGHT} viewBox={`0 0 ${g.width} ${g.height}`}>
      {[g.panels.q, g.panels.v, g.panels.d].map((p) => (
        <g key={p.top}>
          <text className="rp-title" x={g.left} y={p.top - 4}>
            {p.title}
          </text>
          {p.ticks.map((tk) => (
            <g key={tk.label}>
              <line className={tk.zero ? 'rp-grid rp-grid--zero' : 'rp-grid'} x1={g.left} x2={g.width - g.right} y1={tk.y} y2={tk.y} />
              <text className="rp-tick" x={g.left - 4} y={tk.y + 2.8} textAnchor="end">
                {tk.label}
              </text>
            </g>
          ))}
        </g>
      ))}

      {g.bars.map((b, i) => (
        <rect key={i} className={`rp-bar rp-bar--${section.activeTechnique}`} x={b.x} y={b.y} width={b.width} height={b.height} />
      ))}

      {g.series.map((s) => (
        <g key={s.technique}>
          <path className={`rp-line rp-line--${s.technique}${s.active ? ' rp-line--active' : ''}`} d={s.path} />
          {s.markers.map((m, i) => (
            <Marker key={i} technique={s.technique} m={m} />
          ))}
        </g>
      ))}

      {g.series.length > 1 &&
        legend.map((s, k) => {
          const x = g.width - g.right - 168 + k * 62;
          const y = g.panels.v.top - 7;
          return (
            <g key={s.technique}>
              <Marker technique={s.technique} m={{ x, y, hollow: false }} />
              <text className="rp-legend" x={x + 6} y={y + 2.8}>
                {lineLabel(s.technique, s.active)}
              </text>
            </g>
          );
        })}

      <path className="rp-water" d={g.bed.area} />
      <path className="rp-bed" d={g.bed.line} />

      {g.xTicks
        .filter((tk) => tk.x > g.banks.left + 12 && tk.x < g.banks.right - 12)
        .map((tk) => (
          <text key={tk.label} className="rp-tick" x={tk.x} y={g.xAxisY} textAnchor="middle">
            {tk.label}
          </text>
        ))}
      <text className="rp-bank rp-bank--left" x={g.banks.left} y={g.xAxisY} textAnchor="start">
        L
      </text>
      <text className="rp-bank rp-bank--right" x={g.banks.right} y={g.xAxisY} textAnchor="end">
        R
      </text>
      <text className="rp-tick" x={(g.banks.left + g.banks.right) / 2} y={g.xAxisY + 11} textAnchor="middle">
        {t('Report.Doc.station', { defaultValue: 'Station' })} x ({getUnit(unitSistem, 'longitude')})
      </text>
    </svg>
  );
};
```

- [ ] **Step 5: Append the plot CSS** to `report.css`, before `@media print`:

```css
/* Report profile plot (ProfilePlot.tsx). Colours resolve inside the light report scope. */
.rp {
  display: block;
  overflow: visible;
}
.rp text {
  font-family: var(--doc-font);
  font-size: 8px;
  fill: var(--doc-muted);
}
.rp .rp-title {
  fill: var(--doc-ink);
  font-weight: 600;
}
.rp .rp-legend {
  fill: var(--doc-ink);
}
.rp-grid {
  stroke: #e6eaef;
  stroke-width: 0.6;
}
.rp-grid--zero {
  stroke: #9aa6b4;
  stroke-width: 0.8;
}
.rp-bar--lspiv {
  fill: var(--tech-lspiv);
  fill-opacity: 0.75;
}
.rp-bar--stiv {
  fill: var(--tech-stiv);
  fill-opacity: 0.75;
}
.rp-bar--iwave {
  fill: var(--tech-iwave);
  fill-opacity: 0.75;
}
.rp-line {
  fill: none;
  stroke-width: 1;
}
.rp-line--active {
  stroke-width: 1.8;
}
.rp-line--lspiv {
  stroke: var(--tech-lspiv);
}
.rp-line--stiv {
  stroke: var(--tech-stiv);
}
.rp-line--iwave {
  stroke: var(--tech-iwave);
}
.rp-marker {
  stroke-width: 1;
}
.rp-marker--lspiv {
  fill: var(--tech-lspiv);
  stroke: var(--tech-lspiv);
}
.rp-marker--stiv {
  fill: #ffffff;
  stroke: var(--tech-stiv);
}
.rp-marker--iwave {
  fill: #ffffff;
  stroke: var(--tech-iwave);
}
.rp-marker--hollow {
  fill: #ffffff;
}
.rp-water {
  fill: #e3eef8;
}
.rp-bed {
  fill: none;
  stroke: #6b5c4a;
  stroke-width: 1.2;
}
.rp .rp-bank {
  font-weight: 700;
}
.rp .rp-bank--left {
  fill: var(--pin-left);
}
.rp .rp-bank--right {
  fill: var(--pin-right);
}
```

The `stroke-width` values are SVG user units, not CSS borders, so the sub-pixel-border guard does not apply; if a project CSS guard still rejects a value, follow its message and say so.

- [ ] **Step 6: Add the keys** to `Report.Doc` in `en/global.json`: `"plotQ": "Discharge per station"`, `"plotV": "Surface velocity"`, `"plotD": "Depth"`, `"station": "Station"`.

- [ ] **Step 7: Run** — `npx jest src/helpers/reportPlot.test.ts src/helpers/reportDocument.test.ts` → PASS; `npx jest src/helpers` → PASS; `npx tsc --noEmit -p .` → no new errors.

- [ ] **Step 8: Commit**

```bash
git add src/helpers/reportPlot.ts src/helpers/reportPlot.test.ts src/components/Report/ProfilePlot.tsx src/components/Report/report.css src/helpers/reportDocument.test.ts src/translations/en/global.json
git commit -m "Report profile plot: a print SVG with discharge, velocity per technique and depth on one axis"
```

---

### Task 4: Section block and three-column station table

**Files:**
- Create: `src/components/Report/SectionBlock.tsx`
- Create: `src/components/Report/TableContinuation.tsx`
- Modify: `src/components/Report/StationTable.tsx`
- Modify: `src/components/Report/report.css`
- Modify: `src/helpers/reportDocument.test.ts` (append), `src/translations/en/global.json`

**Interfaces:**
- Consumes: `SectionResult`, `TECHNIQUE_LABEL` (reportModel); `splitInto`, `REPORT_FLOW` (Task 1); `ProfilePlot` (Task 3); `ImageResults` (`reportFactor`, `reportWidth`, `reportHeight`, `isReport`, `sectionIndex`).
- Produces:
  ```tsx
  export const StationTable: React.FC<{ storeIndex: number; rowStart: number; rowEnd: number }>; // now three columns
  export const SectionBlock: React.FC<{
    result: SectionResult; rowEnd: number;
    frame: { width: number; height: number }; factor: { x: number; y: number };
    /** Measuring pass: same box sizes, no D3 drawing. */
    measure?: boolean;
  }>;
  export const TableContinuation: React.FC<{ result: SectionResult; rowStart: number; rowEnd: number }>;
  ```
  The section block shows stations `[0, rowEnd)`; `rowEnd` comes from `stationChunks(n)[0][1]` (Task 7).

- [ ] **Step 1: Append failing guards**

```ts
describe('Section block (compact)', () => {
  const block = read('src/components/Report/SectionBlock.tsx');
  const cont = read('src/components/Report/TableContinuation.tsx');
  const table = read('src/components/Report/StationTable.tsx');
  test('one header line: technique by label and colour, seeded tag, Q, stats; comparison only with 2+ techniques', () => {
    expect(block).toContain('TECHNIQUE_LABEL[result.technique]');
    expect(block).toContain('result.seeded');
    expect(block).toMatch(/result\.comparison\.length\s*>\s*1/);
  });
  test('frame and the report plot side by side; the app AllInOne is gone', () => {
    expect(block).toContain('<ProfilePlot');
    expect(block).toContain('<ImageResults');
    expect(block).not.toContain('AllInOne');
    expect(block).toContain('sec-row');
  });
  test('measuring pass draws no D3 overlay', () => {
    expect(block).toMatch(/measure\s*\?/);
  });
  test('continuation names the section and says it continues', () => {
    expect(cont).toContain('Report.Doc.continued');
    expect(cont).toContain('<StationTable');
  });
  test('three columns; Q shows "-" where the velocity is missing, as on the Results grid', () => {
    expect(table).toContain('splitInto(');
    expect(table).toContain('REPORT_FLOW.TABLE_COLUMNS');
    expect(table).toMatch(/resolved\[i\]\s*===\s*null\s*\?\s*'-'/);
  });
  test('the interpolated-station note only appears when a row carries a star', () => {
    expect(table).toMatch(/interpFlags\.slice\(rowStart,\s*rowEnd\)\.some/);
  });
});
```

Run: `npx jest src/helpers/reportDocument.test.ts` → FAIL (files missing).

- [ ] **Step 2: Rewrite `StationTable.tsx`**

Replace the `splitColumns` import with `import { splitInto } from '../../helpers/reportFlow';`, add `REPORT_FLOW` to the constants import, add `useTranslation`, and change:

- the Q cell to `<td>{effective.resolved[i] === null ? '-' : fmt(effective.Q[i], qF)}</td>`;
- the return to:

```tsx
  const starred = effective.interpFlags.slice(rowStart, rowEnd).some(Boolean);
  return (
    <>
      <div className="doc-cols doc-cols--3">
        {splitInto(rowStart, rowEnd, REPORT_FLOW.TABLE_COLUMNS).map(column)}
      </div>
      {starred && (
        <p className="doc-note">* {t('Report.Doc.interpolatedStation', { defaultValue: 'interpolated station' })}</p>
      )}
    </>
  );
```

(`const { t } = useTranslation();` goes with the other hooks at the top, before the early returns.)

- [ ] **Step 3: Write `SectionBlock.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import { getUnit } from '../../helpers';
import { useProjectSlice } from '../../hooks';
import { REPORT_FLOW, UNIT_CONVERSIONS } from '../../constants/constants';
import { TECHNIQUE_LABEL, type SectionResult } from '../../helpers/reportModel';
import { ImageResults } from '../ImageResults';
import { ProfilePlot } from './ProfilePlot';
import { StationTable } from './StationTable';

interface SectionBlockProps {
  result: SectionResult;
  rowEnd: number;
  frame: { width: number; height: number };
  factor: { x: number; y: number };
  /** Measuring pass: same box sizes, no D3 drawing. */
  measure?: boolean;
}

export const SectionBlock = ({ result, rowEnd, frame, factor, measure = false }: SectionBlockProps) => {
  const { t } = useTranslation();
  const { projectDetails } = useProjectSlice();
  const qF = projectDetails.unitSistem === 'imperial' ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;
  const flow = getUnit(projectDetails.unitSistem, 'flow');

  return (
    <article className="sec">
      <div className="sec-head">
        <h2 className="sec-name">{result.name}</h2>
        <span className={`doc-tech doc-tech--${result.technique}`}>{TECHNIQUE_LABEL[result.technique]}</span>
        {result.seeded && (
          <span className="doc-tag doc-tag--seeded">{t('Report.Doc.seeded', { defaultValue: 'Seeded' })}</span>
        )}
        <span className="sec-q">
          {(result.totalQ * qF).toFixed(2)}{' '}
          <span className="sec-q-unit">
            {result.qStd !== null && <>± {(result.qStd * qF).toFixed(2)} </>}
            {flow}
          </span>
        </span>
        <span className="doc-meta">
          {result.measuredPct.toFixed(2)} % {t('Results.measured')} · {result.interpolatedPct.toFixed(2)} %{' '}
          {t('Results.interpolated')} · {result.numStations} {t('Report.Doc.stations', { defaultValue: 'stations' })}
          {result.alpha !== null && <> · α {result.alpha.toFixed(2)}</>}
        </span>
      </div>

      {result.comparison.length > 1 && (
        <ul className="doc-compare">
          {result.comparison.map((c) => (
            <li key={c.technique} data-active={c.active}>
              <span className={`doc-tech doc-tech--${c.technique}`}>{TECHNIQUE_LABEL[c.technique]}</span>{' '}
              {(c.totalQ * qF).toFixed(2)} {flow}
              {c.active && <> · {t('Report.Doc.reported', { defaultValue: 'reported' })}</>}
            </li>
          ))}
        </ul>
      )}

      <div className="sec-row">
        <figure className="doc-figure sec-frame">
          {measure ? (
            <div style={{ width: frame.width, height: frame.height }} />
          ) : (
            <ImageResults
              reportFactor={factor}
              reportWidth={frame.width}
              reportHeight={frame.height}
              isReport={true}
              sectionIndex={result.index}
            />
          )}
        </figure>
        {measure ? (
          <div style={{ width: REPORT_FLOW.PLOT_WIDTH, height: REPORT_FLOW.PLOT_HEIGHT }} />
        ) : (
          <ProfilePlot storeIndex={result.index} />
        )}
      </div>

      <StationTable storeIndex={result.index} rowStart={0} rowEnd={rowEnd} />
    </article>
  );
};
```

- [ ] **Step 4: Write `TableContinuation.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import type { SectionResult } from '../../helpers/reportModel';
import { StationTable } from './StationTable';

/** A later part of a long station table, on a page of its own if needed. */
export const TableContinuation = ({ result, rowStart, rowEnd }: { result: SectionResult; rowStart: number; rowEnd: number }) => {
  const { t } = useTranslation();
  return (
    <article className="sec">
      <div className="sec-head">
        <h2 className="sec-name">
          {result.name} <span className="doc-meta">({t('Report.Doc.continued', { defaultValue: 'continued' })})</span>
        </h2>
      </div>
      <StationTable storeIndex={result.index} rowStart={rowStart} rowEnd={rowEnd} />
    </article>
  );
};
```

- [ ] **Step 5: Append CSS** to `report.css` before the plot block:

```css
/* Compact section block (spec §8). */
.sec {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sec-head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 14px;
  padding-bottom: 3px;
  border-bottom: 1px solid var(--doc-ink);
}
.sec-name {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
}
.sec-q {
  color: var(--doc-accent);
  font-size: 14px;
  font-weight: 650;
}
.sec-q-unit {
  color: var(--doc-muted);
  font-size: 11px;
  font-weight: 500;
}
.sec-row {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 14px;
  align-items: start;
}
.sec-frame {
  align-self: start;
}
.doc-cols--3 {
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}
.doc-note {
  margin: 0;
  color: var(--doc-muted);
  font-size: 9px;
}
```

and in the existing rules make tables compact: `.doc-table { font-size: 9.5px; }` (add the property), `.doc-table th { padding: 1px 4px; font-size: 8.5px; }`, `.doc-table td { padding: 1px 4px; }`; change `.doc-compare` to `padding: 0; border: none;` (the line now sits right under the header rule) — edit those properties in place.

- [ ] **Step 6: Run** — `npx jest src/helpers/reportDocument.test.ts` → the new block passes. The older `Section sheet` guard (`splitColumns` in StationTable) now fails: change that one assertion to `expect(table).toContain('splitInto(')` (the old SectionSheet file is deleted in Task 7). Then `npx jest src/helpers` → PASS; `npx tsc --noEmit -p .` → no new errors. (SectionSheet.tsx still compiles: StationTable's props are unchanged.)

- [ ] **Step 7: Commit**

```bash
git add src/components/Report/SectionBlock.tsx src/components/Report/TableContinuation.tsx src/components/Report/StationTable.tsx src/components/Report/report.css src/helpers/reportDocument.test.ts
git commit -m "Report section block: frame beside the profile plot, three-column station table, continuation for long tables"
```

---

### Task 5: Report header with footage icon

**Files:**
- Create: `src/components/Report/FootageIcon.tsx`
- Create: `src/components/Report/ReportHeader.tsx`
- Modify: `src/components/Report/report.css`
- Modify: `src/helpers/reportDocument.test.ts` (append), `src/translations/en/global.json`

**Interfaces:**
- Consumes: `ReportModel`, `SummaryRow`, `SummaryKey`, `AppliedCorrections`, `TECHNIQUE_LABEL` (reportModel).
- Produces:
  ```tsx
  export const FootageIcon: React.FC<{ type: 'uav' | 'oblique' | 'ipcam' | ''; className?: string }>; // renders null for ''
  export const ReportHeader: React.FC<{ model: ReportModel; summary: SummaryRow[] | null; applied: AppliedCorrections; footage: 'uav' | 'oblique' | 'ipcam' | ''; version: string }>;
  ```

- [ ] **Step 1: Append failing guards**

```ts
describe('Report header (compact)', () => {
  const src = read('src/components/Report/ReportHeader.tsx');
  const icon = read('src/components/Report/FootageIcon.tsx');
  test('leads with the total from the model, never data.total_Q', () => {
    expect(src).toContain('model.totalQ');
    expect(src).not.toContain('total_Q');
  });
  test('footage type with its icon, date, version', () => {
    expect(src).toContain('<FootageIcon');
    expect(src).toMatch(/Report\.Doc\.footage\./);
    expect(src).toContain('meditionDate');
    expect(src).toContain('version');
  });
  test('the icons are the app footage-picker drawings, inline so the export stays self-contained', () => {
    expect(icon).toContain('stroke="currentColor"');
    expect(icon).toMatch(/uav[\s\S]*oblique[\s\S]*ipcam/);
    expect(icon).not.toMatch(/import .*\.svg/);
  });
  test('applied line only lists what was applied', () => {
    expect(src).toMatch(/applied\.lensCorrection\s*&&/);
    expect(src).toMatch(/applied\.stabilizationRegions\s*!==\s*null\s*&&/);
  });
  test('section list and summary table only with 2+ sections', () => {
    expect(src).toMatch(/model\.sections\.length\s*>\s*1\s*&&/);
    expect(src).toMatch(/summary\s*&&/);
    expect(src).toContain('row.lspivOnly');
    expect(src).toContain('model.skipped');
  });
  test('no eyebrow labels', () => {
    expect(src).not.toContain('doc-kicker');
  });
});
```

Run → FAIL (files missing).

- [ ] **Step 2: Write `FootageIcon.tsx`** (drawings copied from `src/assets/icons/drone.svg`, `oblique.svg`, `ipcam.svg`):

```tsx
type Footage = 'uav' | 'oblique' | 'ipcam' | '';

const DRAWINGS: Record<Exclude<Footage, ''>, React.ReactNode> = {
  uav: (
    <>
      <circle cx="5.5" cy="5.5" r="3" />
      <circle cx="18.5" cy="5.5" r="3" />
      <circle cx="5.5" cy="18.5" r="3" />
      <circle cx="18.5" cy="18.5" r="3" />
      <path d="M7.8 7.8l2.2 2.2M16.2 7.8 14 10M7.8 16.2l2.2-2.2M16.2 16.2 14 14" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1.2" />
    </>
  ),
  oblique: (
    <>
      <rect x="5" y="2.5" width="14" height="8.5" rx="1.8" />
      <circle cx="12" cy="6.75" r="2.1" />
      <path d="M12 11v3.2M12 14.2 6.5 21.5M12 14.2l5.5 7.3M12 14.2v7.3" />
    </>
  ),
  ipcam: (
    <>
      <path d="M16.75 12h3.632a1 1 0 0 1 .894 1.447l-2.034 4.069a1 1 0 0 1-1.708.134l-2.124-2.97" />
      <path d="M17.106 9.053a1 1 0 0 1 .447 1.341l-3.106 6.211a1 1 0 0 1-1.342.447L3.61 12.3a2.92 2.92 0 0 1-1.3-3.91L3.69 5.6a2.92 2.92 0 0 1 3.92-1.3z" />
      <path d="M2 19h3.76a2 2 0 0 0 1.8-1.1L9 15" />
      <path d="M2 21v-4" />
      <path d="M7 9h.01" />
    </>
  ),
};

/** The footage-picker line icons, inline so the exported report stays one self-contained file. */
export const FootageIcon = ({ type, className = '' }: { type: Footage; className?: string }) =>
  type === '' ? null : (
    <svg
      className={`doc-ficon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {DRAWINGS[type]}
    </svg>
  );
```

- [ ] **Step 3: Write `ReportHeader.tsx`**

Keep `FOOTAGE_DEFAULT`, `SUMMARY_LABEL`, the unit factors and the across-sections table body exactly as they are in `Cover.tsx` (copy them); the structure changes to:

```tsx
import { useTranslation } from 'react-i18next';
import { getUnit } from '../../helpers';
import { useProjectSlice } from '../../hooks';
import { UNIT_CONVERSIONS } from '../../constants/constants';
import {
  TECHNIQUE_LABEL,
  type AppliedCorrections,
  type ReportModel,
  type SummaryKey,
  type SummaryRow,
} from '../../helpers/reportModel';
import { FootageIcon } from './FootageIcon';

interface ReportHeaderProps {
  model: ReportModel;
  /** null with a single section: the table would repeat the section row. */
  summary: SummaryRow[] | null;
  applied: AppliedCorrections;
  footage: 'uav' | 'oblique' | 'ipcam' | '';
  version: string;
}

const FOOTAGE_DEFAULT = { uav: 'UAV (nadir)', oblique: 'Oblique', ipcam: 'IP camera', '': '-' };

/** Labels reuse the old report's Report.Summary keys, so existing translations keep working. */
const SUMMARY_LABEL: Record<SummaryKey, [string, string]> = {
  W: ['Report.Summary.width', 'Width'],
  A: ['Report.Summary.area', 'Area'],
  Q: ['Report.Summary.q', 'Q'],
  meanV: ['Report.Summary.meanV', 'meanV'],
  alpha: ['Report.Summary.alpha', 'Alpha'],
  meanVs: ['Report.Summary.averageVs', 'Average Vs'],
  maxD: ['Report.Summary.maxD', 'Max d'],
  meanD: ['Report.Summary.meanD', 'Mean d'],
  measured: ['Report.Summary.measured', '% Measured'],
};

export const ReportHeader = ({ model, summary, applied, footage, version }: ReportHeaderProps) => {
  const { t } = useTranslation();
  const { projectDetails } = useProjectSlice();
  const { riverName, site, meditionDate, unitSistem } = projectDetails;
  const qF = unitSistem === 'imperial' ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;
  const flow = getUnit(unitSistem, 'flow');
  const q = (v: number) => (v * qF).toFixed(2);
  const lF = unitSistem === 'imperial' ? UNIT_CONVERSIONS.M_TO_FT : 1;
  const unitFactor = (unit: SummaryRow['unit']) =>
    unit === 'longitude' || unit === 'velocity' ? lF : unit === 'area' ? lF * lF : unit === 'flow' ? qF : 1;
  const measuredPct =
    model.sections.length === 0 ? 0 : model.sections.reduce((a, s) => a + s.measuredPct, 0) / model.sections.length;
  const stations = model.sections.reduce((a, s) => a + s.numStations, 0);

  return (
    <header className="rh">
      <div className="rh-mast">
        <h1 className="doc-h1">
          {riverName} @ {site}
        </h1>
        <div className="rh-meta">
          <span className="rh-footage">
            <FootageIcon type={footage} />
            {t(`Report.Doc.footage.${footage || 'none'}`, { defaultValue: FOOTAGE_DEFAULT[footage] })}
          </span>
          <span>
            <b>{meditionDate}</b> · RIVeR {version}
          </span>
        </div>
      </div>

      <div className="rh-verdict">
        <p className="doc-q">
          {q(model.totalQ)}
          <span className="doc-q-unit">{flow}</span>
          {model.qStdBetween !== null && (
            <span className="doc-q-pm">
              ± {q(model.qStdBetween)} {flow}
            </span>
          )}
        </p>
        <dl className="rh-facts">
          <div>
            <dt>{t('Results.measured')}</dt>
            <dd>{measuredPct.toFixed(2)} %</dd>
          </div>
          {model.cov !== null && (
            <div>
              <dt>COV</dt>
              <dd>{(model.cov * 100).toFixed(2)} %</dd>
            </div>
          )}
          <div>
            <dt>{t('Report.Doc.sections', { defaultValue: 'Sections' })}</dt>
            <dd>{model.sections.length}</dd>
          </div>
          <div>
            <dt>{t('Report.Doc.technique', { defaultValue: 'Technique' })}</dt>
            <dd>
              {model.techniquesUsed.map((tq) => (
                <span key={tq} className={`doc-tech doc-tech--${tq}`}>
                  {TECHNIQUE_LABEL[tq]}
                </span>
              ))}
            </dd>
          </div>
          <div>
            <dt>{t('Report.Doc.stationsTitle', { defaultValue: 'Stations' })}</dt>
            <dd>{stations}</dd>
          </div>
        </dl>
      </div>

      <ul className="doc-applied">
        {applied.lensCorrection && (
          <li>
            {t('Report.Doc.lens', { defaultValue: 'Lens correction' })} <b>{applied.lensCorrection}</b>
          </li>
        )}
        {applied.stabilizationRegions !== null && (
          <li>
            {t('Report.Doc.stabilization', {
              count: applied.stabilizationRegions,
              defaultValue_one: 'Stabilized ({{count}} region)',
              defaultValue_other: 'Stabilized ({{count}} regions)',
            })}
          </li>
        )}
        <li>
          {t('Report.Doc.step', { defaultValue: 'Frame step' })} <b>{applied.step}</b>
        </li>
        <li>
          {t('Report.Doc.resize', { defaultValue: 'Resize factor' })} <b>{applied.resizeFactor}</b>
        </li>
      </ul>

      {model.sections.length > 1 && (
        <div className="rh-tables">
          <table className="doc-table doc-table--numeric">
            {/* same thead/tbody as the section list in Cover.tsx (Section, Technique, Q, ±σ, measured), unchanged */}
          </table>
          {summary && (
            <table className="doc-table doc-table--numeric">
              {/* same thead/tbody as the across-sections table in Cover.tsx (mean / std / COV rows with row.lspivOnly), unchanged */}
            </table>
          )}
        </div>
      )}

      {model.skipped.length > 0 && (
        <p className="doc-meta">
          {t('Report.Doc.skipped', { defaultValue: 'Not processed, left out:' })} {model.skipped.join(', ')}
        </p>
      )}
    </header>
  );
};
```

The two `<table>` bodies are a straight copy of `Cover.tsx` lines 87-121 (section list) and 132-162 (summary), with the summary's `<h2>` dropped; paste them in place of the two comments. Do not leave the comments.

- [ ] **Step 4: Append CSS** to `report.css`:

```css
/* Report header (spec §8). */
.rh {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rh-mast {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: 4px 16px;
  padding-bottom: 6px;
  border-bottom: 2px solid var(--doc-ink);
}
.rh-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  color: var(--doc-muted);
}
.rh-meta b {
  color: var(--doc-ink);
  font-weight: 600;
}
.rh-footage {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--doc-ink);
  font-weight: 600;
}
.doc-ficon {
  width: 16px;
  height: 16px;
  color: var(--doc-accent);
}
.rh-verdict {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0 22px;
  align-items: center;
}
.rh-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 18px;
  margin: 0;
}
.rh-facts div {
  display: flex;
  flex-direction: column;
}
.rh-facts dt {
  color: var(--doc-muted);
  font-size: 9px;
}
.rh-facts dd {
  display: flex;
  gap: 8px;
  margin: 0;
  font-weight: 600;
}
.rh-tables {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}
```

and in place: `.doc-h1 { font-size: 19px; }`, `.doc-q { font-size: 34px; }`, `.doc-q-unit, .doc-q-pm { font-size: 13px; }`, `.doc-applied { padding: 4px 0; gap: 2px 14px; color: var(--doc-muted); }` plus `.doc-applied b { color: var(--doc-ink); font-weight: 600; }`.

- [ ] **Step 5: Keys** — add to `Report.Doc`: `"sections": "Sections"`, `"stationsTitle": "Stations"`.

- [ ] **Step 6: Run** — `npx jest src/helpers/reportDocument.test.ts` → PASS (the old Cover guards still pass on the old file); `npx jest src/helpers` → PASS; `npx tsc --noEmit -p .` → no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/Report/FootageIcon.tsx src/components/Report/ReportHeader.tsx src/components/Report/report.css src/helpers/reportDocument.test.ts src/translations/en/global.json
git commit -m "Report header: footage icon, verdict with facts, applied line, multi-section tables side by side"
```

---

### Task 6: Method blocks

**Files:**
- Modify: `src/components/Report/CalibrationSheet.tsx`
- Create: `src/components/Report/Method.tsx`
- Modify: `src/components/Report/report.css`
- Modify: `src/helpers/reportDocument.test.ts` (append), `src/translations/en/global.json`

**Interfaces:**
- Consumes: `REPORT_FLOW.METHOD_IMAGE_WIDTH` (Task 1); `snapshotFrames`, `frameBox`, `frameFactor` (reportLayout); `lensLabel`, `TECHNIQUE_LABEL`, `ReportModel` (reportModel); `formatNumberTo2Decimals` from `src/helpers`.
- Produces:
  ```tsx
  // CalibrationSheet.tsx
  export const CalibrationPanel: React.FC<{ measure?: boolean }>;   // h3 + per-type content, image beside text
  export const CalibrationSheet: React.FC;                           // TEMPORARY wrapper for Report.tsx, removed in Task 7
  export const hasCalibration: (type: string, ipcamSolved: boolean) => boolean; // unchanged
  // Method.tsx
  export const MethodBlock: React.FC<{ showCalibration: boolean; measure?: boolean }>; // "How this was measured" + calibration + footage
  export const SnapshotStrip: React.FC;
  export const ProcessingBlock: React.FC<{ model: ReportModel }>;
  export const Colophon: React.FC<{ version: string }>;
  ```

Layout from the approved mockup: `MethodBlock` is an `h2` "How this was measured" over a two-column grid; each column is `.mc` (method column) = `h3` across the top, a 140 px image on the left, text and tables on the right. The calibration column's image is the UAV rectified frame / oblique first frame with points / IP-camera first frame with points; the footage column's image is the first frame with the stabilization regions (only when stabilization was applied; otherwise the footage text takes the whole column).

- [ ] **Step 1: Append failing guards**

```ts
describe('Method blocks (compact)', () => {
  const method = read('src/components/Report/Method.tsx');
  const cal = read('src/components/Report/CalibrationSheet.tsx');
  test('method block: heading, calibration beside footage', () => {
    expect(method).toContain('Report.Doc.howMeasured');
    expect(method).toContain('<CalibrationPanel');
    expect(method).toContain('committedStabilizationRegions');
    expect(method).toContain('doc-region');
  });
  test('calibration panel keeps one block per footage type, with a small image beside the text', () => {
    expect(cal).toMatch(/type === 'uav'/);
    expect(cal).toMatch(/type === 'oblique'/);
    expect(cal).toMatch(/type === 'ipcam'/);
    expect(cal).toContain('REPORT_FLOW.METHOD_IMAGE_WIDTH');
    expect(cal).toContain('<FootageIcon');
  });
  test('snapshot strip and processing blocks per technique used', () => {
    expect(method).toContain('snapshotFrames');
    expect(method).toContain('images.paths');
    expect(method).toMatch(/techniquesUsed\.includes\('lspiv'\)/);
    expect(method).toMatch(/techniquesUsed\.includes\('stiv'\)/);
    expect(method).toMatch(/techniquesUsed\.includes\('iwave'\)/);
    expect(method).toMatch(/<dt>\{t\('Processing\.grayscale'\)\}<\/dt>/);
  });
  test('colophon is one line: version, timestamp, GitHub; no DOI, authors or iWave credit in it', () => {
    const colophon = method.slice(method.indexOf('export const Colophon'));
    expect(colophon).toContain('github.com/oruscam/RIVeR');
    expect(colophon).not.toContain('10.1016/j.cageo.2017.07.009');
    expect(colophon).not.toContain('dataforwater');
  });
  test('STIV weights DOI stays in the STIV processing block', () => {
    expect(method).toContain('10.5281/zenodo.22050810');
  });
  test('raw measured values go through the 2-decimal formatter', () => {
    expect(method).toMatch(/formatNumberTo2Decimals\(fps\)/);
    expect(method).toMatch(/formatNumberTo2Decimals\(form\.clipLimit\)/);
  });
});
```

Run → FAIL.

- [ ] **Step 2: Rework `CalibrationSheet.tsx`**

- Add imports: `REPORT_FLOW` (constants), `FootageIcon` from `./FootageIcon`.
- `useFrame` sizes the frame to `frameBox(width, height, REPORT_FLOW.METHOD_IMAGE_WIDTH, REPORT_FLOW.METHOD_IMAGE_WIDTH)` (square bound, so portrait video stays small).
- In `Uav`, size the ortho image the same way (`frameBox(solution.width, solution.height, REPORT_FLOW.METHOD_IMAGE_WIDTH, REPORT_FLOW.METHOD_IMAGE_WIDTH)`).
- Each of `Uav`, `Oblique`, `Ipcam` returns a fragment ordered: `<figure className="doc-figure mc-img">` first (img + overlay svg; for UAV the rectified frame), then the `dl` / tables. `Ipcam`'s ortho view figure is dropped (the frame with points is the image; the orthorectified view does not fit a 140 px column — the user's request is fewer, smaller images).
- Each takes `measure?: boolean`; when `measure` is true, the overlay `useEffect` returns early without drawing (the `<svg>` element stays, so sizes match).
- Replace the exported `CalibrationSheet` with:

```tsx
export const CalibrationPanel = ({ measure = false }: { measure?: boolean }) => {
  const { t } = useTranslation();
  const { type } = useProjectSlice();
  const label = { uav: 'UAV', oblique: 'Oblique', ipcam: 'IP camera' }[type as 'uav' | 'oblique' | 'ipcam'] ?? '';
  return (
    <section className="mc">
      <h3 className="mc-title">
        <FootageIcon type={type as 'uav' | 'oblique' | 'ipcam' | ''} />
        {t('Report.Doc.calibration', { defaultValue: 'Calibration' })} · {label}
      </h3>
      {type === 'uav' && <Uav />}
      {type === 'oblique' && <Oblique measure={measure} />}
      {type === 'ipcam' && <Ipcam measure={measure} />}
    </section>
  );
};

/** Temporary: Report.tsx still mounts the old sheet until Task 7 replaces it. */
export const CalibrationSheet = () => <CalibrationPanel />;
```

(`Uav` has no D3 overlay, so it needs no `measure` prop.)

- [ ] **Step 3: Write `Method.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import { formatNumberTo2Decimals, formatTime } from '../../helpers';
import { useDataSlice, useProjectSlice } from '../../hooks';
import { REPORT_FLOW } from '../../constants/constants';
import { frameBox, snapshotFrames } from '../../helpers/reportLayout';
import { TECHNIQUE_LABEL, lensLabel, type ReportModel } from '../../helpers/reportModel';
import { CalibrationPanel } from './CalibrationSheet';

const stamp = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ');

const FootagePanel = ({ measure = false }: { measure?: boolean }) => {
  const { t } = useTranslation();
  const { video, firstFramePath } = useProjectSlice();
  const { name, width, height, fps, duration, creation } = video.data;
  const p = video.parameters;
  const box = frameBox(width, height, REPORT_FLOW.METHOD_IMAGE_WIDTH, REPORT_FLOW.METHOD_IMAGE_WIDTH);
  // Stabilization regions are stored in original-video pixels, so they scale straight onto the frame box.
  const sx = box.width / width;
  const sy = box.height / height;
  const lens = lensLabel(p.committedLensCorrection);
  const created = creation && !Number.isNaN(new Date(creation).getTime()) ? new Date(creation) : null;

  return (
    <section className={p.committedStabilization ? 'mc' : 'mc mc--text'}>
      <h3 className="mc-title">{t('Report.Doc.footageTitle', { defaultValue: 'Footage' })}</h3>
      {p.committedStabilization && (
        <figure className="doc-figure mc-img">
          {measure ? (
            <div style={{ width: box.width, height: box.height }} />
          ) : (
            <img src={firstFramePath} width={box.width} height={box.height} />
          )}
          {p.committedStabilizationRegions.map((r, i) => (
            <div
              key={i}
              className="doc-region"
              style={{ left: r.x * sx, top: r.y * sy, width: r.width * sx, height: r.height * sy }}
            />
          ))}
          <figcaption>
            {t('Report.Doc.stabilization', {
              count: p.committedStabilizationRegions.length,
              defaultValue_one: 'Stabilized ({{count}} region)',
              defaultValue_other: 'Stabilized ({{count}} regions)',
            })}
          </figcaption>
        </figure>
      )}
      <dl className="doc-kv">
        <dt>{t('Report.VideoInfo.name')}</dt>
        <dd>{name ?? '-'}</dd>
        <dt>{t('Report.VideoInfo.resolution')}</dt>
        <dd>
          {width} × {height} · {formatNumberTo2Decimals(fps)} fps · {formatTime(duration)}
        </dd>
        {created && (
          <>
            <dt>{t('Report.VideoInfo.creationDate')}</dt>
            <dd>{stamp(created)}</dd>
          </>
        )}
        <dt>{t('Report.ProcessedRange.title')}</dt>
        <dd>
          {formatTime(p.startTime)} → {formatTime(p.endTime)} · {t('Report.Doc.step', { defaultValue: 'Frame step' })}{' '}
          {p.step} · {((p.step / (fps || 1)) * 1000).toFixed(2)} ms
        </dd>
        <dt>{t('Report.Doc.resize', { defaultValue: 'Resize factor' })}</dt>
        <dd>{formatNumberTo2Decimals(p.committedFactor)}</dd>
        {lens && (
          <>
            <dt>{t('Report.Doc.lens', { defaultValue: 'Lens correction' })}</dt>
            <dd>{lens}</dd>
          </>
        )}
      </dl>
    </section>
  );
};

export const MethodBlock = ({ showCalibration, measure = false }: { showCalibration: boolean; measure?: boolean }) => {
  const { t } = useTranslation();
  return (
    <section className="method">
      <h2 className="method-h">{t('Report.Doc.howMeasured', { defaultValue: 'How this was measured' })}</h2>
      <div className="method-two">
        {showCalibration && <CalibrationPanel measure={measure} />}
        <FootagePanel measure={measure} />
      </div>
    </section>
  );
};

export const SnapshotStrip = () => {
  const { t } = useTranslation();
  const { video } = useProjectSlice();
  const { images } = useDataSlice();
  const snapshots = snapshotFrames(images.paths.length, video.parameters.startTime, video.parameters.endTime);
  if (snapshots.length === 0) return null;
  return (
    <section>
      <h3 className="mc-title">{t('Report.Doc.acrossRange', { defaultValue: 'Across the processed range' })}</h3>
      <figure className="doc-figure doc-strip">
        {snapshots.map((s) => (
          <div key={s.index}>
            <img src={images.paths[s.index]} alt="" />
            <figcaption>{formatTime(s.time)}</figcaption>
          </div>
        ))}
      </figure>
    </section>
  );
};

export const ProcessingBlock = ({ model }: { model: ReportModel }) => {
  const { t } = useTranslation();
  const { processing } = useDataSlice();
  const form = processing.form;
  const { techniquesUsed } = model;
  const yes = t('Commons.yes');
  const notRecorded = t('Report.Doc.notRecorded', { defaultValue: 'Further parameters are not recorded in this version.' });
  return (
    <section>
      <h3 className="mc-title">{t('Report.Doc.processing', { defaultValue: 'Processing' })}</h3>
      <div className="method-three">
        {techniquesUsed.includes('lspiv') && (
          <dl className="doc-kv">
            <dt className="doc-kv-head">
              <span className="doc-tech doc-tech--lspiv">{TECHNIQUE_LABEL.lspiv}</span>
            </dt>
            {/* Unconditional: the GUI never passes --no-filter-grayscale, so the CLI always converts to grayscale. */}
            <dt>{t('Processing.grayscale')}</dt>
            <dd>{yes}</dd>
            {form.clahe && (
              <>
                <dt>{t('Processing.clahe')}</dt>
                <dd>
                  {t('Processing.clipLimit')} {formatNumberTo2Decimals(form.clipLimit)}
                </dd>
              </>
            )}
            {form.removeBackground && (
              <>
                <dt>{t('Processing.removeBackground')}</dt>
                <dd>{yes}</dd>
              </>
            )}
            <dt>{t('Processing.windowSizes')}</dt>
            <dd>
              {form.step1} | {form.step1 / 2} px
            </dd>
            {form.stdFiltering && (
              <>
                <dt>{t('Processing.stdFiltering')}</dt>
                <dd>
                  {t('Processing.threshold')} {formatNumberTo2Decimals(form.stdThreshold)}
                </dd>
              </>
            )}
            {form.medianTestFiltering && (
              <>
                <dt>{t('Processing.medianTestFiltering')}</dt>
                <dd>
                  ε {formatNumberTo2Decimals(form.medianTestEpsilon)} · {t('Processing.threshold')}{' '}
                  {formatNumberTo2Decimals(form.medianTestThreshold)}
                </dd>
              </>
            )}
            {form.artificialSeeding && (
              <>
                <dt>{t('Processing.artificialSeeding')}</dt>
                <dd>{yes}</dd>
              </>
            )}
          </dl>
        )}
        {techniquesUsed.includes('stiv') && (
          <dl className="doc-kv">
            <dt className="doc-kv-head">
              <span className="doc-tech doc-tech--stiv">{TECHNIQUE_LABEL.stiv}</span>
            </dt>
            <dt>{t('Report.Doc.stivModel', { defaultValue: 'CNN model, weights' })}</dt>
            <dd>doi:10.5281/zenodo.22050810</dd>
            <dd className="doc-kv-note">{notRecorded}</dd>
          </dl>
        )}
        {techniquesUsed.includes('iwave') && (
          <dl className="doc-kv">
            <dt className="doc-kv-head">
              <span className="doc-tech doc-tech--iwave">{TECHNIQUE_LABEL.iwave}</span>
            </dt>
            <dd className="doc-kv-note">{notRecorded}</dd>
          </dl>
        )}
      </div>
    </section>
  );
};

export const Colophon = ({ version }: { version: string }) => {
  const { t } = useTranslation();
  return (
    <p className="doc-colophon">
      {t('Report.Doc.generatedWith', { version, defaultValue: 'Generated with RIVeR {{version}}' })} ·{' '}
      {stamp(new Date())} · github.com/oruscam/RIVeR
    </p>
  );
};
```

If `formatNumberTo2Decimals` returns something other than a string with at most 2 decimals for integers (read `src/helpers/adapterNumbers.ts`), keep it anyway: it is the project's display formatter.

- [ ] **Step 4: Append CSS** to `report.css`:

```css
/* Method blocks (spec §8). */
.method {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.method-h {
  margin: 4px 0 0;
  padding-bottom: 3px;
  border-bottom: 2px solid var(--doc-ink);
  font-size: 14px;
  font-weight: 650;
}
.method-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}
.method-three {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  align-items: start;
}
.mc {
  display: grid;
  grid-template-columns: 140px 1fr;
  grid-auto-flow: row dense;
  gap: 4px 10px;
  align-content: start;
}
.mc--text {
  grid-template-columns: 1fr;
}
.mc > .mc-title {
  grid-column: 1 / -1;
}
.mc > .mc-img {
  grid-column: 1;
  grid-row: 2 / span 4;
  align-self: start;
}
.mc:not(.mc--text) > :not(.mc-title):not(.mc-img) {
  grid-column: 2;
}
.mc-title {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0 0 3px;
  padding-bottom: 2px;
  border-bottom: 1px solid var(--doc-ink);
  font-size: 11px;
  font-weight: 650;
}
.mc-title .doc-ficon {
  width: 13px;
  height: 13px;
}
.doc-kv-head {
  grid-column: 1 / -1;
}
.doc-kv-note {
  grid-column: 1 / -1;
  color: var(--doc-muted);
}
```

and change `.doc-strip` to `grid-template-columns: repeat(5, 112px); justify-content: space-between;`, `.doc-strip img` to `width: 112px; height: auto;`, `.doc-colophon` to `margin: 0; color: var(--doc-muted); font-size: 9px;`. Remove the `.doc-ortho` rule (no longer used).

- [ ] **Step 5: Keys** — add to `Report.Doc`: `"howMeasured": "How this was measured"`, `"footageTitle": "Footage"`, `"acrossRange": "Across the processed range"`, `"processing": "Processing"`. Keep the existing `stivModel`, `notRecorded`, `generatedWith`.

- [ ] **Step 6: Run** — `npx jest src/helpers/reportDocument.test.ts` → the new block passes. The old `Calibration sheet` guards still pass; the old `Footage sheet` guards still read `FootageSheet.tsx` (unchanged, deleted in Task 7). `npx jest src/helpers` → PASS; `npx tsc --noEmit -p .` → no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/Report/CalibrationSheet.tsx src/components/Report/Method.tsx src/components/Report/report.css src/helpers/reportDocument.test.ts src/translations/en/global.json
git commit -m "Report method blocks: calibration beside footage with small images, snapshot strip, processing in three columns, one-line colophon"
```

---

### Task 7: Assemble the flow, page footer and robust export

**Files:**
- Modify: `src/pages/Report.tsx`
- Modify: `src/components/Report/Sheet.tsx`, `src/components/Report/index.ts`, `src/components/Report/CalibrationSheet.tsx` (remove the temporary wrapper)
- Delete: `src/components/Report/Cover.tsx`, `src/components/Report/SectionSheet.tsx`, `src/components/Report/FootageSheet.tsx`
- Modify: `src/helpers/reportLayout.ts`, `src/helpers/reportLayout.test.ts`, `src/constants/constants.ts`
- Modify: `src/components/Report/report.css`
- Modify: `src/helpers/reportDocument.test.ts`

**Interfaces:**
- Consumes: everything above; `paginate`, `stationChunks`, `REPORT_FLOW` (Task 1).
- Produces:
  ```tsx
  export const Sheet: React.FC<{ page: number; pages: number; title: string; date: string; children: React.ReactNode }>;
  ```

- [ ] **Step 1: Update the guards** in `src/helpers/reportDocument.test.ts`

Delete the `describe` blocks `Cover`, `Section sheet`, `Calibration sheet`, `Footage sheet`, `Footage sheet LSPIV block (fix round 1)` (their files are deleted or replaced; the compact blocks added in Tasks 4-6 cover the same requirements; move the single assertion `expect(read('src/components/Report/CalibrationSheet.tsx')).toContain('ipcamPointErrors(')` into the `Method blocks (compact)` describe). In `Sheet`, replace the test with:

```ts
describe('Sheet', () => {
  const src = read('src/components/Report/Sheet.tsx');
  test('footer: discreet logo, title and date, page n / N', () => {
    expect(src).toContain('sheet-footer');
    expect(src).toMatch(/import logo from '\.\.\/\.\.\/assets\/logo_footer\.png'/);
    expect(src).toMatch(/\{page\}\s*\/\s*\{pages\}/);
    expect(src).toContain('{date}');
  });
});
```

Append:

```ts
describe('Report page flow (compact)', () => {
  const page = read('src/pages/Report.tsx');
  const css = read('src/components/Report/report.css');
  test('blocks are measured, then paginated', () => {
    expect(page).toContain('paginate(');
    expect(page).toContain('stationChunks(');
    expect(page).toMatch(/querySelectorAll<HTMLElement>\('\[data-block\]'\)/);
    expect(page).toContain('offsetHeight');
    expect(page).toContain('useLayoutEffect');
  });
  test('the measuring column is outside the exported container and draws no overlays', () => {
    expect(page).toContain('report-measure');
    expect(page).toContain('render(true)');
    expect(page).toMatch(/className="report-doc report-measure"(?![^>]*data-theme-scope)/);
    expect(css).toMatch(/\.report-measure\s*\{[^}]*visibility:\s*hidden/);
  });
  test('page count is the number of pages', () => {
    expect(page).toMatch(/pages=\{pages\.length\}/);
  });
  test('the export never leaves the spinner on, and one bad image does not abort it', () => {
    expect(page).toMatch(/finally\s*\{[\s\S]*onSetAnalizing\(false\)/);
    expect(page).toMatch(/catch\(\(\)\s*=>\s*img\.src\)/);
  });
  test('the export rewrites a clone, not the live preview', () => {
    expect(page).toContain('cloneNode(true)');
  });
  test('the report font reaches the text despite the app-wide font rule', () => {
    expect(css).toMatch(/\.report-doc \*\s*\{[^}]*font-family:\s*inherit/);
  });
  test('old sheet-per-part layout is gone', () => {
    expect(page).not.toMatch(/buildSheets|<Cover|<SectionSheet|<FootageSheet|<CalibrationSheet/);
  });
});
```

and in `Report page export`, keep all tests as they are.

Run: `npx jest src/helpers/reportDocument.test.ts` → FAIL (new flow guards).

- [ ] **Step 2: Rewrite `Sheet.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import logo from '../../assets/logo_footer.png';
import './report.css';

interface SheetProps {
  page: number;
  pages: number;
  /** "River @ Site" */
  title: string;
  /** Measurement date as entered. */
  date: string;
  children: React.ReactNode;
}

/** One printed A4 page. Report.tsx decides which blocks fit; the body never grows past the page. */
export const Sheet = ({ page, pages, title, date, children }: SheetProps) => {
  const { t } = useTranslation();
  return (
    <section className="sheet">
      <div className="sheet-body">{children}</div>
      <footer className="sheet-footer">
        <span className="sheet-who">
          <img className="sheet-logo" src={logo} alt="RIVeR" />
          <span>
            {title} · {date}
          </span>
        </span>
        <span>
          {t('Report.Doc.page', { defaultValue: 'page' })} {page} / {pages}
        </span>
      </footer>
    </section>
  );
};
```

If TypeScript rejects the `.png` import, check how `src/pages/HomePage.tsx` imports `logo.png` and the existing `vite-env.d.ts` declarations; follow the same pattern.

- [ ] **Step 3: Rewrite the render in `src/pages/Report.tsx`**

Imports: replace the `../components/Report` import with `{ Sheet, ReportHeader, SectionBlock, TableContinuation, MethodBlock, SnapshotStrip, ProcessingBlock, Colophon, hasCalibration }`; replace `buildSheets, frameBox, frameFactor` with `frameBox, frameFactor` from `reportLayout` plus `paginate, stationChunks` from `../helpers/reportFlow`; constants `REPORT_FLOW, REPORT_SHEET`; `useLayoutEffect, useRef, useState` from react.

Inside the component, replace the `sheets` / `frame` / `factor` lines with:

```tsx
  const showCalibration = hasCalibration(type, cameraSolution !== null);
  const title = `${projectDetails.riverName} @ ${projectDetails.site}`;
  const date = projectDetails.meditionDate ?? '';

  const { width: videoWidth, height: videoHeight } = video.data;
  const frame = frameBox(videoWidth, videoHeight, REPORT_FLOW.FRAME_WIDTH, REPORT_FLOW.FRAME_MAX_HEIGHT);
  const factor = frameFactor(videoWidth, videoHeight, video.parameters.factor, frame);

  type Block = { id: string; render: (measure: boolean) => React.ReactNode };
  const blocks: Block[] = [
    {
      id: 'header',
      render: () => (
        <ReportHeader model={model} summary={summary} applied={applied} footage={type} version={version} />
      ),
    },
  ];
  model.sections.forEach((result) => {
    const [first, ...rest] = stationChunks(result.numStations);
    blocks.push({
      id: `section-${result.index}`,
      render: (measure) => (
        <SectionBlock result={result} rowEnd={first[1]} frame={frame} factor={factor} measure={measure} />
      ),
    });
    rest.forEach(([start, end]) =>
      blocks.push({
        id: `section-${result.index}-${start}`,
        render: () => <TableContinuation result={result} rowStart={start} rowEnd={end} />,
      })
    );
  });
  blocks.push(
    { id: 'method', render: (measure) => <MethodBlock showCalibration={showCalibration} measure={measure} /> },
    { id: 'snapshots', render: () => <SnapshotStrip /> },
    { id: 'processing', render: () => <ProcessingBlock model={model} /> },
    { id: 'colophon', render: () => <Colophon version={version} /> }
  );

  // Heights are measured in a hidden column of the page body's width, so translated labels that wrap
  // push a block to the next page instead of overflowing it.
  const measureRef = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState<Record<string, number>>({});
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const next: Record<string, number> = {};
    el.querySelectorAll<HTMLElement>('[data-block]').forEach((b) => {
      next[b.dataset.block as string] = b.offsetHeight;
    });
    setHeights((prev) => {
      const keys = Object.keys(next);
      const same = keys.length === Object.keys(prev).length && keys.every((k) => prev[k] === next[k]);
      return same ? prev : next;
    });
  });
  const pages = paginate(
    blocks.map((b) => ({ id: b.id, height: heights[b.id] ?? REPORT_FLOW.FALLBACK_BLOCK_HEIGHT })),
    REPORT_FLOW.BODY_HEIGHT,
    REPORT_FLOW.GAP
  );
  const byId = new Map(blocks.map((b) => [b.id, b]));
```

Replace the JSX inside `.media-container` with:

```tsx
        <div id="report-html-page">
          <div id="report-html-container" className="report-doc" data-theme="light" data-theme-scope>
            {pages.map((ids, i) => (
              <Sheet key={i} page={i + 1} pages={pages.length} title={title} date={date}>
                {ids.map((id) => (
                  <div key={id} className="sheet-block">
                    {byId.get(id)!.render(false)}
                  </div>
                ))}
              </Sheet>
            ))}
          </div>
          <div ref={measureRef} className="report-doc report-measure" data-theme="light" aria-hidden="true">
            {blocks.map((b) => (
              <div key={b.id} data-block={b.id} className="sheet-block">
                {b.render(true)}
              </div>
            ))}
          </div>
        </div>
```

(The measuring column carries `data-theme="light"` but **not** `data-theme-scope`, so `getCSSVar` keeps resolving against the visible report root.)

- [ ] **Step 4: Make the export robust** — replace the body of `generateHTML` with:

```tsx
  const generateHTML = async () => {
    onSetAnalizing(true);
    try {
      onSaveProjectDetails();
      const live = document.getElementById('report-html-container');
      if (!live) return;
      // Rewrite a copy so the on-screen preview keeps its file:// sources and stays in sync with React.
      const input = live.cloneNode(true) as HTMLElement;
      const images = Array.from(input.getElementsByTagName('img'));
      const imageDataURIs = await Promise.all(
        images.map((img) =>
          // One unreadable image must not abort the export: keep its original source.
          convertImageToDataURI(img.src, REPORT_SHEET.IMAGE_QUALITY, REPORT_SHEET.IMAGE_MAX_WIDTH).catch(() => img.src)
        )
      );
      images.forEach((img, index) => {
        img.src = imageDataURIs[index] as string;
      });

      const styles = Array.from(document.styleSheets)
        .map((styleSheet) => {
          try {
            return Array.from(styleSheet.cssRules)
              .map((rule) => rule.cssText)
              .join('');
          } catch (e) {
            console.error(e);
            return '';
          }
        })
        .join('');

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(title)} · ${escapeHtml(date)}</title>
  <style>${styles}</style>
</head>
<body style="margin:0">
  ${input.outerHTML}
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const arrayBuffer = await blob.arrayBuffer();
      // Only a real write counts: cancelling the Save dialog resolves with no path.
      const result = (await window.ipcRenderer.invoke('save-report-html', { arrayBuffer })) as
        | { filePath: string | null }
        | undefined;
      setSavedPath(result?.filePath ?? null);
    } finally {
      onSetAnalizing(false);
    }
  };
```

Keep `setSavedPath(result?.filePath ?? null)` verbatim (`summaryPanel.test.ts` pins it).

Note: `cloneNode` copies the D3-drawn SVG overlays as they are in the DOM, which is what the export needs.

- [ ] **Step 5: CSS** — in `report.css`:

- `.sheet { padding: 11mm 12mm 0; }` (was 15mm 15mm 0).
- `.sheet-body { gap: 10px; }` (was 14px) — must equal `REPORT_FLOW.GAP`.
- Add:

```css
.report-doc * {
  /* index.css sets the app font on every element; the report keeps its own stack. */
  font-family: inherit;
}
.report-measure {
  position: absolute;
  top: 0;
  left: -10000px;
  width: 186mm;
  padding: 0;
  visibility: hidden;
  pointer-events: none;
}
.sheet-block {
  flex: none;
}
.sheet-footer {
  align-items: center;
  padding: 5px 0 8mm;
}
.sheet-who {
  display: flex;
  align-items: center;
  gap: 10px;
}
.sheet-logo {
  display: block;
  width: auto;
  height: 12px;
  opacity: 0.85;
}
```

- Remove the now-unused rules: `.doc-kicker`, `.doc-q--section`, `.doc-h2` (if nothing uses it any more — grep first), `.doc-figure figcaption` stays.

`.report-measure` is outside `#report-html-container`, so it is never exported; `.media-container` must be `position: relative` or the measure column positions against the page — either is fine because it is off-screen and hidden.

- [ ] **Step 6: Remove the old pieces**

- `git rm src/components/Report/Cover.tsx src/components/Report/SectionSheet.tsx src/components/Report/FootageSheet.tsx`.
- In `CalibrationSheet.tsx`, delete the temporary `CalibrationSheet` wrapper.
- `src/components/Report/index.ts`:

```ts
import { Sheet } from './Sheet';
import { ReportHeader } from './ReportHeader';
import { SectionBlock } from './SectionBlock';
import { TableContinuation } from './TableContinuation';
import { hasCalibration } from './CalibrationSheet';
import { Colophon, MethodBlock, ProcessingBlock, SnapshotStrip } from './Method';

export {
  Colophon,
  hasCalibration,
  MethodBlock,
  ProcessingBlock,
  ReportHeader,
  SectionBlock,
  Sheet,
  SnapshotStrip,
  TableContinuation,
};
```

- In `reportLayout.ts` delete `ReportSheet`, `buildSheets`, `splitColumns` and the `REPORT_SHEET` import if unused; in `reportLayout.test.ts` delete their `describe` blocks (`frameBox / frameFactor` and `snapshotFrames` stay).
- In `constants.ts`, reduce `REPORT_SHEET` to `{ IMAGE_QUALITY: 0.8, IMAGE_MAX_WIDTH: 1600 }` (grep `REPORT_SHEET.` first; nothing else should use the other keys) and delete the dead `REPORT_IMAGES` constant if `grep -rn REPORT_IMAGES src` finds only its definition.
- `grep -rn "Cover\|SectionSheet\|FootageSheet\|buildSheets\|splitColumns\|doc-kicker" src` → only test-file mentions in negative assertions remain.

- [ ] **Step 7: Run everything**

Run: `npx jest` → all PASS.
Run: `npx tsc --noEmit -p .` → only TS6305 noise.
Run: `npm run lint` → no more than the 47-problem baseline.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Report.tsx src/components/Report src/helpers/reportLayout.ts src/helpers/reportLayout.test.ts src/constants/constants.ts src/helpers/reportDocument.test.ts
git commit -m "Report: measure blocks and pack them onto as few A4 pages as fit, logo footer, export that never hangs"
```

---

### Task 8: Check in the app (human)

**Files:** none.

- [ ] **Step 1:** The user runs the app (`npm run dev` in `gui/`), opens the Report step for a single-section UAV project and a multi-section project (ideally one oblique or IP-camera, one with STIV or iWave computed), in dark, light and dracula.
- [ ] **Step 2:** Check: single-section report fits one page; sections flow two to three per page; nothing is clipped at a page bottom; page n / N matches Chrome's print preview (A4, margins none, background graphics on); the plot is light in every theme; the footer logo is crisp; the exported file opens standalone.
- [ ] **Step 3:** If a page bottom clips, lower `REPORT_FLOW.BODY_HEIGHT` by the overflow and re-run `npx jest src/helpers/reportFlow.test.ts`.
