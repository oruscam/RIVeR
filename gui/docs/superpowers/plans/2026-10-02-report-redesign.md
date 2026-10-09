# Report Redesign (Section Pages) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the exported HTML report with an A4, print-first document: a cover with the verdict, one sheet per cross section, a calibration sheet that depends on the footage type, a footage and parameters sheet, and a colophon.

**Architecture:** Pure helpers compute everything the report says (`reportModel.ts`: per-section discharge for the active technique, comparison, totals, applied corrections; `reportLayout.ts`: the sheet list with station-table pagination and frame boxes; `obliqueResiduals.ts`). Thin React components render those models into fixed A4 `Sheet`s. The report root carries `data-theme="light"` and `data-theme-scope`, and `getCSSVar` prefers the scope, so every D3 plot drawn while the report is mounted uses the fixed light palette whatever the app theme is. Export stays the existing serialize-to-one-HTML path in `src/pages/Report.tsx`.

**Tech Stack:** React 18 + TypeScript, D3 (existing graph helpers), react-i18next, Jest (ts-jest, `testEnvironment: node`, no jsdom: tests are pure-function tests or source-text guards), Electron.

**Spec:** `gui/docs/superpowers/specs/2026-10-02-report-redesign-design.md`

## Global Constraints

- Work in `/Users/antoine/river_compil/.worktrees/ui-design-refresh/gui` on branch `ui/design-refresh`. Commit with the `river-git` skill conventions, author `antoine.patalano@gmail.com`, and **no Co-Authored-By line**.
- The export is one self-contained HTML file (inlined CSS, data-URI images). No external fonts, scripts or stylesheets.
- The report is a fixed light document, independent of the app theme (dark, light, dracula).
- A4 portrait. Every sheet is exactly one printed page; each section starts a new page.
- Values display with at most 2 decimals (the guard test `src/helpers/displayDecimals.test.ts` must stay green).
- SI and imperial both respected: the model holds SI values; components convert with `UNIT_CONVERSIONS` and label with `getUnit`.
- Show only what was applied: no "No" rows for corrections that were not used.
- Corrections reported are the committed ones: `video.parameters.committedLensCorrection`, `committedStabilization`, `committedStabilizationRegions`, `committedFactor`.
- Discharge per section is the active technique's live value from `getEffectiveTechniqueData` (same as the Results screen), never `data.total_Q` directly.
- σ exists only for LSPIV (`data.total_q_std`); STIV/IWaVE show Q without ±.
- Techniques are told apart by colour **and** by label text; never colour alone.
- Red = left bank, green = right bank (existing pin tokens).
- RIVeR version comes from `import.meta.env.VITE_APP_VERSION`.
- New UI strings use `t('Report.Doc.<key>', { defaultValue: '...' })` and are added to `src/translations/en/global.json` only; other locales are a known follow-up.
- `report.css` keeps its `scale-exempt-file` header comment (Phase 6g decision G2).

## Review Focus

1. **Active technique is not LSPIV.** A section whose `activeTechnique` is `'stiv'` must report the STIV total, not `data.total_Q`; the cover total must be the mean of those active totals. Pinned in Task 1.
2. **Dark or dracula app theme at export time.** Plots in the exported file must use the light palette (dark ink on white). Pinned in Task 3 (scope lookup) and Task 9 (export markup carries no app theme).
3. **A section with no data** (not processed) is skipped from the sheets and named on the cover, without crashing the totals. Pinned in Task 1.
4. **Long station tables (50+ stations)** continue onto extra sheets and the page count `n / N` stays correct. Pinned in Task 2.
5. **Pending but uncommitted video settings** (user toggled lens correction after extracting) must not appear as applied. Pinned in Task 1 (`applied` reads `committed*`).

---

## File Structure

| File | Responsibility |
|---|---|
| Create `src/helpers/reportModel.ts` | Pure: per-section results for the active technique, comparison, cover totals, skipped sections, applied corrections, techniques used. |
| Create `src/helpers/reportModel.test.ts` | Unit tests for the model. |
| Create `src/helpers/reportLayout.ts` | Pure: frame box sizing + factor, the ordered sheet list with station-table pagination. |
| Create `src/helpers/reportLayout.test.ts` | Unit tests for layout. |
| Create `src/helpers/obliqueResiduals.ts` | Pure: entered vs solved distances for the 6 oblique pairs. |
| Create `src/helpers/obliqueResiduals.test.ts` | Unit tests. |
| Modify `src/helpers/getCSSVar.ts` | Prefer `[data-theme-scope]` over the app's `[data-theme]`. |
| Create `src/helpers/getCSSVarScope.test.ts` | Unit test with a stub `document`. |
| Modify `src/helpers/reportSummary.ts` | Headline uses the model so the panel and the report agree. |
| Rewrite `src/components/Report/report.css` | Paper, sheet, type, tables, print rules. |
| Create `src/components/Report/Sheet.tsx` | One A4 page: content slot + footer "River @ Site · page n / N". |
| Create `src/components/Report/Cover.tsx` | Cover sheet content. |
| Create `src/components/Report/SectionSheet.tsx` | Section header, frame, profile plot, comparison strip, first table chunk. |
| Create `src/components/Report/StationTable.tsx` | Station rows for a [start, end) range, split into two side-by-side columns. |
| Create `src/components/Report/CalibrationSheet.tsx` | UAV / oblique / IP-camera calibration evidence. |
| Create `src/components/Report/FootageSheet.tsx` | Footage table, stabilization regions on first frame, technique parameter blocks, colophon. |
| Rewrite `src/components/Report/index.ts` | Export the new components only. |
| Delete `Header.tsx, VideoInfo.tsx, ProcessedRange.tsx, ReportSection.tsx, ReportSectionTable.tsx, Summary.tsx, PixelTransformation.tsx, ObliquePixelTransformation.tsx, IpcamPixelTransformation.tsx, ProcessingParameters.tsx, Footer.tsx` in `src/components/Report/` | Replaced. |
| Modify `src/pages/Report.tsx` | Build model + sheets, render, export with higher image quality and no app theme. |
| Modify `src/constants/constants.ts` | `REPORT_SHEET` constants. |
| Modify `src/translations/en/global.json` | `Report.Doc.*` keys. |
| Create `src/helpers/reportDocument.test.ts` | Source-text guards for the components and export. |

---

### Task 1: Report model

**Files:**
- Create: `src/helpers/reportModel.ts`
- Test: `src/helpers/reportModel.test.ts`

**Interfaces:**
- Consumes: `getEffectiveTechniqueData`, `Technique` from `src/helpers/techniqueDischarge.ts`; `Section` from `src/store/section/types.ts`.
- Produces:
  ```ts
  export interface TechniqueQ { technique: Technique; totalQ: number; active: boolean }
  export interface SectionResult {
    index: number; name: string; technique: Technique;
    totalQ: number; qStd: number | null;
    measuredPct: number; interpolatedPct: number;
    seeded: boolean; alpha: number | null; numStations: number;
    comparison: TechniqueQ[];
  }
  export interface AppliedCorrections {
    lensCorrection: string | null; stabilizationRegions: number | null;
    step: number; resizeFactor: number;
  }
  export interface ReportModel {
    sections: SectionResult[]; skipped: string[];
    totalQ: number; qStdBetween: number | null; cov: number | null;
    techniquesUsed: Technique[];
  }
  export interface ReportModelInput {
    sections: Pick<Section, 'name' | 'data' | 'activeTechnique' | 'interpolated' | 'artificialSeeding' | 'alpha'>[];
    step: number; fps: number;
  }
  export function buildReportModel(input: ReportModelInput): ReportModel;
  export function appliedCorrections(p: {
    committedLensCorrection: string | null; committedStabilization: boolean;
    committedStabilizationRegions: unknown[]; step: number; committedFactor: number;
  }): AppliedCorrections;
  export function lensLabel(path: string | null): string | null;
  export const TECHNIQUE_LABEL: Record<Technique, string>; // { lspiv: 'LSPIV', stiv: 'STIV', iwave: 'iWave' }

  export type SummaryKey = 'W' | 'A' | 'Q' | 'meanV' | 'alpha' | 'meanVs' | 'maxD' | 'meanD' | 'measured';
  export type SummaryUnit = 'longitude' | 'area' | 'flow' | 'velocity' | 'percent' | 'none';
  export interface SummaryRow {
    key: SummaryKey; unit: SummaryUnit; lspivOnly: boolean;
    mean: number | null; std: number | null; cov: number | null;
  }
  /** null with fewer than 2 sections with data. Q and % measured from the model, the rest from the backend summary. */
  export function summaryRows(summary: Summary | undefined, model: ReportModel): SummaryRow[] | null;
  ```
  All discharge values are SI (m³/s); components convert. `Summary` is the store type from `src/store/section/types.ts` (`useSectionSlice().summary`: `{ mean, std, cov }`, each a `SummaryStatistics`).

- [ ] **Step 1: Write the failing tests**

```ts
// src/helpers/reportModel.test.ts
import { buildReportModel, appliedCorrections, lensLabel } from './reportModel';
import type { SectionData } from '../store/section/types';

// Minimal SectionData: 4 stations, 1 m apart, 1 m deep, all checked.
const data = (over: Partial<SectionData> = {}): SectionData =>
  ({
    num_stations: 4,
    alpha: 0.85,
    id: [1, 2, 3, 4],
    distance: [0, 1, 2, 3],
    depth: [1, 1, 1, 1],
    check: [true, true, true, true],
    activeCheck: [true, true, true, true],
    streamwise_velocity_magnitude: [1, 1, 1, 1],
    seeded_vel_profile: [2, 2, 2, 2],
    total_Q: 999, // deliberately wrong: the model must not read it
    total_q_std: 0.12,
    ...over,
  }) as unknown as SectionData;

const section = (over: Record<string, unknown> = {}) => ({
  name: 'CS1',
  data: data(),
  activeTechnique: 'lspiv' as const,
  interpolated: false,
  artificialSeeding: false,
  alpha: 1,
  ...over,
});

const input = (sections: ReturnType<typeof section>[]) => ({ sections, step: 1, fps: 30 });

describe('buildReportModel', () => {
  test('LSPIV section: Q is the live value, σ comes from total_q_std', () => {
    const m = buildReportModel(input([section()]));
    // W = [1,1,1,1], A = [1,1,1,1], v = 1, alpha 1 → Q = 4
    expect(m.sections[0].totalQ).toBeCloseTo(4);
    expect(m.sections[0].qStd).toBeCloseTo(0.12);
    expect(m.sections[0].alpha).toBe(1);
    expect(m.totalQ).toBeCloseTo(4);
  });

  test('STIV active: reports the STIV total, not data.total_Q, and no σ', () => {
    const s = section({
      activeTechnique: 'stiv',
      data: data({ stiv_velocity_profile: [0.5, 0.5, 0.5, 0.5] }),
    });
    const m = buildReportModel(input([s]));
    expect(m.sections[0].technique).toBe('stiv');
    expect(m.sections[0].totalQ).toBeCloseTo(2);
    expect(m.sections[0].qStd).toBeNull();
    expect(m.sections[0].alpha).toBeNull();
  });

  test('comparison lists every computed technique, active one flagged, in LSPIV/STIV/iWave order', () => {
    const s = section({
      activeTechnique: 'stiv',
      data: data({ stiv_velocity_profile: [0.5, 0.5, 0.5, 0.5], iwave_velocity_profile: [0.25, 0.25, 0.25, 0.25] }),
    });
    const { comparison } = buildReportModel(input([s])).sections[0];
    expect(comparison.map((c) => c.technique)).toEqual(['lspiv', 'stiv', 'iwave']);
    expect(comparison.map((c) => c.active)).toEqual([false, true, false]);
    expect(comparison[2].totalQ).toBeCloseTo(1);
  });

  test('seeded only when LSPIV is active and artificialSeeding is on; seeded profile drives Q', () => {
    const m = buildReportModel(input([section({ artificialSeeding: true })]));
    expect(m.sections[0].seeded).toBe(true);
    expect(m.sections[0].totalQ).toBeCloseTo(8);
    const s = section({ artificialSeeding: true, activeTechnique: 'stiv', data: data({ stiv_velocity_profile: [1, 1, 1, 1] }) });
    expect(buildReportModel(input([s])).sections[0].seeded).toBe(false);
  });

  test('sections without data are skipped and named; totals ignore them', () => {
    const m = buildReportModel(input([section(), section({ name: 'CS2', data: undefined })]));
    expect(m.sections).toHaveLength(1);
    expect(m.skipped).toEqual(['CS2']);
    expect(m.totalQ).toBeCloseTo(4);
    expect(m.qStdBetween).toBeNull();
    expect(m.cov).toBeNull();
  });

  test('several sections: mean, population std and COV like the backend (np.std, ddof=0)', () => {
    const m = buildReportModel(input([section(), section({ name: 'CS2', alpha: 2 })]));
    // Q = 4 and 8 → mean 6, std 2, cov 1/3
    expect(m.totalQ).toBeCloseTo(6);
    expect(m.qStdBetween).toBeCloseTo(2);
    expect(m.cov).toBeCloseTo(1 / 3);
  });

  test('no sections with data: totals are 0 / null, no throw', () => {
    const m = buildReportModel(input([section({ data: undefined })]));
    expect(m.totalQ).toBe(0);
    expect(m.sections).toEqual([]);
  });

  test('techniquesUsed is the set of active techniques, in fixed order', () => {
    const s2 = section({ name: 'CS2', activeTechnique: 'iwave', data: data({ iwave_velocity_profile: [1, 1, 1, 1] }) });
    expect(buildReportModel(input([s2, section()])).techniquesUsed).toEqual(['lspiv', 'iwave']);
  });
});

describe('appliedCorrections', () => {
  const base = { committedLensCorrection: null, committedStabilization: false, committedStabilizationRegions: [], step: 2, committedFactor: 0.5 };
  test('reads the committed values only', () => {
    expect(appliedCorrections(base)).toEqual({ lensCorrection: null, stabilizationRegions: null, step: 2, resizeFactor: 0.5 });
  });
  test('stabilization reports its region count; lens reports a readable name', () => {
    const a = appliedCorrections({ ...base, committedStabilization: true, committedStabilizationRegions: [{}, {}, {}], committedLensCorrection: '/x/lenses/DJI_Mavic_3.npz' });
    expect(a.stabilizationRegions).toBe(3);
    expect(a.lensCorrection).toBe('DJI_Mavic_3');
  });
});

describe('lensLabel', () => {
  test('basename without extension, Windows paths too, null passes through', () => {
    expect(lensLabel('C:\\cal\\GoPro Hero9.json')).toBe('GoPro Hero9');
    expect(lensLabel(null)).toBeNull();
  });
});

describe('summaryRows', () => {
  const stats = (v: number) => ({
    total_W: v, total_A: v, total_Q: v, mean_V: v, alpha: v, mean_Vs: v, max_depth: v, average_depth: v, measured_Q: v,
  });
  const backend = { mean: stats(10), std: stats(1), cov: stats(0.1) };

  test('null with a single section', () => {
    expect(summaryRows(backend, buildReportModel(input([section()])))).toBeNull();
  });

  test('null when the backend summary is missing', () => {
    const m = buildReportModel(input([section(), section({ name: 'CS2' })]));
    expect(summaryRows(undefined, m)).toBeNull();
  });

  test('rows in the old report order, LSPIV-only rows flagged', () => {
    const m = buildReportModel(input([section(), section({ name: 'CS2', alpha: 2 })]));
    const rows = summaryRows(backend, m)!;
    expect(rows.map((r) => r.key)).toEqual(['W', 'A', 'Q', 'meanV', 'alpha', 'meanVs', 'maxD', 'meanD', 'measured']);
    expect(rows.filter((r) => r.lspivOnly).map((r) => r.key)).toEqual(['meanV', 'alpha', 'meanVs']);
  });

  test('Q comes from the active techniques, not the backend total_Q', () => {
    const m = buildReportModel(input([section(), section({ name: 'CS2', alpha: 2 })]));
    const q = summaryRows(backend, m)!.find((r) => r.key === 'Q')!;
    expect(q.mean).toBeCloseTo(6);
    expect(q.std).toBeCloseTo(2);
    expect(q.cov).toBeCloseTo(1 / 3);
  });

  test('other rows pass the backend values through', () => {
    const m = buildReportModel(input([section(), section({ name: 'CS2' })]));
    const w = summaryRows(backend, m)!.find((r) => r.key === 'W')!;
    expect(w).toMatchObject({ mean: 10, std: 1, cov: 0.1, unit: 'longitude' });
  });

  test('% measured is the mean of the sections’ active-technique percentages', () => {
    const m = buildReportModel(input([section(), section({ name: 'CS2' })]));
    expect(summaryRows(backend, m)!.find((r) => r.key === 'measured')!.mean).toBeCloseTo(100);
  });
});
```

Also add `summaryRows` to the import line at the top of the test file:

```ts
import { buildReportModel, appliedCorrections, lensLabel, summaryRows } from './reportModel';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/helpers/reportModel.test.ts`
Expected: FAIL, "Cannot find module './reportModel'".

- [ ] **Step 3: Implement**

```ts
// src/helpers/reportModel.ts
import type { Section } from '../store/section/types';
import { getEffectiveTechniqueData, type Technique } from './techniqueDischarge';

export const TECHNIQUE_ORDER: Technique[] = ['lspiv', 'stiv', 'iwave'];
export const TECHNIQUE_LABEL: Record<Technique, string> = { lspiv: 'LSPIV', stiv: 'STIV', iwave: 'iWave' };

export interface TechniqueQ {
  technique: Technique;
  totalQ: number;
  active: boolean;
}

export interface SectionResult {
  index: number;
  name: string;
  technique: Technique;
  /** m³/s, the active technique's live total. */
  totalQ: number;
  /** m³/s; LSPIV only, from the backend's total_q_std. */
  qStd: number | null;
  /** 0-100 */
  measuredPct: number;
  interpolatedPct: number;
  seeded: boolean;
  /** LSPIV only: alpha does not apply to STIV or IWaVE. */
  alpha: number | null;
  numStations: number;
  comparison: TechniqueQ[];
}

export interface AppliedCorrections {
  lensCorrection: string | null;
  /** Number of regions, or null when stabilization was not applied. */
  stabilizationRegions: number | null;
  step: number;
  resizeFactor: number;
}

export interface ReportModel {
  sections: SectionResult[];
  skipped: string[];
  /** Mean of the sections' active totals, m³/s. */
  totalQ: number;
  /** Population std across sections (np.std); null with fewer than 2 sections. */
  qStdBetween: number | null;
  cov: number | null;
  techniquesUsed: Technique[];
}

export interface ReportModelInput {
  sections: Pick<Section, 'name' | 'data' | 'activeTechnique' | 'interpolated' | 'artificialSeeding' | 'alpha'>[];
  step: number;
  fps: number;
}

export function buildReportModel({ sections, step, fps }: ReportModelInput): ReportModel {
  const results: SectionResult[] = [];
  const skipped: string[] = [];

  sections.forEach((section, index) => {
    const { data, activeTechnique, interpolated, artificialSeeding, alpha } = section;
    if (!data) {
      skipped.push(section.name);
      return;
    }
    const options = { interpolated, artificialSeeding, alpha, step, fps };
    const comparison: TechniqueQ[] = [];
    let active: ReturnType<typeof getEffectiveTechniqueData> = null;
    TECHNIQUE_ORDER.forEach((technique) => {
      const effective = getEffectiveTechniqueData(data, technique, options);
      if (!effective) return;
      if (technique === activeTechnique) active = effective;
      comparison.push({ technique, totalQ: effective.total_Q, active: technique === activeTechnique });
    });
    if (!active) {
      skipped.push(section.name);
      return;
    }
    const isLspiv = activeTechnique === 'lspiv';
    const { total_Q, measured_Q, interpolated_Q } = active;
    results.push({
      index,
      name: section.name,
      technique: activeTechnique,
      totalQ: total_Q,
      qStd: isLspiv && typeof data.total_q_std === 'number' ? data.total_q_std : null,
      measuredPct: measured_Q * 100,
      interpolatedPct: interpolated_Q * 100,
      seeded: isLspiv && artificialSeeding,
      alpha: isLspiv ? alpha : null,
      numStations: data.num_stations,
      comparison,
    });
  });

  const qs = results.map((r) => r.totalQ);
  const totalQ = qs.length ? qs.reduce((a, q) => a + q, 0) / qs.length : 0;
  const qStdBetween =
    qs.length > 1 ? Math.sqrt(qs.reduce((a, q) => a + (q - totalQ) ** 2, 0) / qs.length) : null;
  const cov = qStdBetween !== null && totalQ !== 0 ? qStdBetween / totalQ : null;
  const techniquesUsed = TECHNIQUE_ORDER.filter((t) => results.some((r) => r.technique === t));

  return { sections: results, skipped, totalQ, qStdBetween, cov, techniquesUsed };
}

export function lensLabel(path: string | null): string | null {
  if (!path) return null;
  const base = path.split(/[\\/]/).pop() ?? path;
  return base.replace(/\.[^.]+$/, '');
}

export function appliedCorrections(p: {
  committedLensCorrection: string | null;
  committedStabilization: boolean;
  committedStabilizationRegions: unknown[];
  step: number;
  committedFactor: number;
}): AppliedCorrections {
  return {
    lensCorrection: lensLabel(p.committedLensCorrection),
    stabilizationRegions: p.committedStabilization ? p.committedStabilizationRegions.length : null,
    step: p.step,
    resizeFactor: p.committedFactor,
  };
}

export type SummaryKey = 'W' | 'A' | 'Q' | 'meanV' | 'alpha' | 'meanVs' | 'maxD' | 'meanD' | 'measured';
export type SummaryUnit = 'longitude' | 'area' | 'flow' | 'velocity' | 'percent' | 'none';

export interface SummaryRow {
  key: SummaryKey;
  unit: SummaryUnit;
  /** The backend computes this from LSPIV whatever technique is active. */
  lspivOnly: boolean;
  mean: number | null;
  std: number | null;
  cov: number | null;
}

/** Same as the backend's summary: np.mean, np.std (ddof=0), std / mean. */
const populationStats = (values: number[]) => {
  if (values.length === 0) return { mean: null, std: null, cov: null };
  const mean = values.reduce((a, v) => a + v, 0) / values.length;
  const std = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length);
  return { mean, std, cov: mean !== 0 ? std / mean : null };
};

const BACKEND_ROWS: { key: SummaryKey; field: keyof SummaryStatistics; unit: SummaryUnit; lspivOnly: boolean }[] = [
  { key: 'W', field: 'total_W', unit: 'longitude', lspivOnly: false },
  { key: 'A', field: 'total_A', unit: 'area', lspivOnly: false },
  { key: 'meanV', field: 'mean_V', unit: 'velocity', lspivOnly: true },
  { key: 'alpha', field: 'alpha', unit: 'none', lspivOnly: true },
  { key: 'meanVs', field: 'mean_Vs', unit: 'velocity', lspivOnly: true },
  { key: 'maxD', field: 'max_depth', unit: 'longitude', lspivOnly: false },
  { key: 'meanD', field: 'average_depth', unit: 'longitude', lspivOnly: false },
];

export function summaryRows(summary: Summary | undefined, model: ReportModel): SummaryRow[] | null {
  if (!summary || model.sections.length < 2) return null;
  const backend = (key: SummaryKey): SummaryRow => {
    const row = BACKEND_ROWS.find((r) => r.key === key)!;
    return {
      key,
      unit: row.unit,
      lspivOnly: row.lspivOnly,
      mean: summary.mean?.[row.field] ?? null,
      std: summary.std?.[row.field] ?? null,
      cov: summary.cov?.[row.field] ?? null,
    };
  };
  const q = populationStats(model.sections.map((s) => s.totalQ));
  const measured = populationStats(model.sections.map((s) => s.measuredPct));
  return [
    backend('W'),
    backend('A'),
    { key: 'Q', unit: 'flow', lspivOnly: false, ...q },
    backend('meanV'),
    backend('alpha'),
    backend('meanVs'),
    backend('maxD'),
    backend('meanD'),
    { key: 'measured', unit: 'percent', lspivOnly: false, ...measured },
  ];
}
```

and change the first import of `reportModel.ts` to:

```ts
import type { Section, Summary, SummaryStatistics } from '../store/section/types';
```

If `Summary`/`SummaryStatistics` are not exported from `src/store/section/types.ts`, add them to its `export type { ... }` list.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/helpers/reportModel.test.ts`
Expected: PASS (all tests). If the STIV case fails because `getEffectiveTechniqueData` rebuilds STIV from `stiv_angle_profile`, the fixture omits that field on purpose so the raw `stiv_velocity_profile` is used; do not add it.

- [ ] **Step 5: Make the Summary panel agree with the report**

Replace the body of `summarizeReport` in `src/helpers/reportSummary.ts` so its headline uses the same totals. It needs `activeTechnique/interpolated/artificialSeeding/alpha` and step/fps, so change its signature and its one caller (`src/components/Forms/FormReport.tsx:25`):

```ts
// src/helpers/reportSummary.ts
import { UNIT_CONVERSIONS } from '../constants/constants';
import { buildReportModel, type ReportModelInput } from './reportModel';

/**
 * What the Summary panel leads with. Built from the same model as the
 * exported report, so the two always agree.
 */
export const summarizeReport = (
  input: ReportModelInput,
  unitSistem: string
): { totalQ: number; sectionCount: number; techniqueCount: number } => {
  const model = buildReportModel(input);
  const factor = unitSistem === 'imperial' ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;
  const techniques = new Set(model.sections.flatMap((s) => s.comparison.map((c) => c.technique)));
  return {
    totalQ: model.totalQ * factor,
    sectionCount: input.sections.length,
    techniqueCount: Math.max(1, techniques.size),
  };
};
```

In `FormReport.tsx` replace line 25 with:

```tsx
  const headline = summarizeReport(
    { sections, step: video.parameters.step, fps: video.data.fps },
    projectDetails.unitSistem || 'si'
  );
```

Run: `npx jest src/helpers` and fix any existing test that called `summarizeReport(sections, unit)` to pass `{ sections, step: 1, fps: 30 }`.
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/helpers/reportModel.ts src/helpers/reportModel.test.ts src/helpers/reportSummary.ts src/components/Forms/FormReport.tsx src/store/section/types.ts
git commit -m "Report model: per-section discharge from the active technique, comparison, totals, summary rows and applied corrections"
```

---

### Task 2: Sheet layout and frame boxes

**Files:**
- Create: `src/helpers/reportLayout.ts`
- Test: `src/helpers/reportLayout.test.ts`
- Modify: `src/constants/constants.ts` (append after `REPORT_IMAGES`)

**Interfaces:**
- Consumes: `ReportModel` from Task 1.
- Produces:
  ```ts
  export type ReportSheet =
    | { kind: 'cover' }
    | { kind: 'section'; sectionIndex: number; rowStart: number; rowEnd: number; continued: boolean }
    | { kind: 'calibration' }
    | { kind: 'footage' };
  export function buildSheets(model: ReportModel, hasCalibration: boolean): ReportSheet[];
  export function frameBox(videoWidth: number, videoHeight: number, maxWidth: number, maxHeight: number): { width: number; height: number };
  export function frameFactor(videoWidth: number, videoHeight: number, resizeFactor: number, box: { width: number; height: number }): { x: number; y: number };
  export function splitColumns(start: number, end: number): [number, number][];
  /** Up to 5 evenly spread frames of the processed range: index into images.paths, and time in seconds from the video start. */
  export function snapshotFrames(frameCount: number, startTime: number, endTime: number): { index: number; time: number }[];
  ```
  `REPORT_SHEET` in constants: `{ CONTENT_WIDTH: 680, SECTION_FRAME_MAX_HEIGHT: 300, CALIBRATION_FRAME_MAX_HEIGHT: 420, FOOTAGE_FRAME_MAX_HEIGHT: 300, PLOT_HEIGHT: 380, FIRST_SHEET_ROWS: 24, CONTINUATION_ROWS: 96, IMAGE_QUALITY: 0.8, IMAGE_MAX_WIDTH: 1600 }`.

- [ ] **Step 1: Add the constants**

```ts
// src/constants/constants.ts, after REPORT_IMAGES
/** Exported report: A4 portrait at 96 dpi is 794 × 1123 px; 15 mm margins leave ~680 px of width. */
export const REPORT_SHEET = {
  CONTENT_WIDTH: 680,
  SECTION_FRAME_MAX_HEIGHT: 300,
  CALIBRATION_FRAME_MAX_HEIGHT: 420,
  FOOTAGE_FRAME_MAX_HEIGHT: 300,
  PLOT_HEIGHT: 380,
  /** Station rows that fit under the plots on a section's first sheet (two columns of 12). */
  FIRST_SHEET_ROWS: 24,
  /** Rows on a continuation sheet (two columns of 48). */
  CONTINUATION_ROWS: 96,
  IMAGE_QUALITY: 0.8,
  IMAGE_MAX_WIDTH: 1600,
};
```

- [ ] **Step 2: Write the failing tests**

```ts
// src/helpers/reportLayout.test.ts
import { buildSheets, frameBox, frameFactor, splitColumns } from './reportLayout';
import type { ReportModel } from './reportModel';

const model = (stations: number[]): ReportModel =>
  ({
    sections: stations.map((n, i) => ({ index: i, numStations: n })),
    skipped: [], totalQ: 0, qStdBetween: null, cov: null, techniquesUsed: ['lspiv'],
  }) as unknown as ReportModel;

describe('buildSheets', () => {
  test('cover, one sheet per short section, calibration, footage', () => {
    expect(buildSheets(model([10, 20]), true).map((s) => s.kind)).toEqual(['cover', 'section', 'section', 'calibration', 'footage']);
  });

  test('no calibration sheet when there is no calibration evidence', () => {
    expect(buildSheets(model([10]), false).map((s) => s.kind)).toEqual(['cover', 'section', 'footage']);
  });

  test('a 130-station table continues onto two more sheets with exact row ranges', () => {
    const sections = buildSheets(model([130]), true).filter((s) => s.kind === 'section');
    expect(sections).toEqual([
      { kind: 'section', sectionIndex: 0, rowStart: 0, rowEnd: 24, continued: false },
      { kind: 'section', sectionIndex: 0, rowStart: 24, rowEnd: 120, continued: true },
      { kind: 'section', sectionIndex: 0, rowStart: 120, rowEnd: 130, continued: true },
    ]);
  });

  test('exactly FIRST_SHEET_ROWS stations makes no empty continuation sheet', () => {
    expect(buildSheets(model([24]), true).filter((s) => s.kind === 'section')).toHaveLength(1);
  });

  test('sectionIndex points into model.sections, not the store', () => {
    const m = model([5, 5]);
    m.sections[1].index = 7;
    const s = buildSheets(m, false).filter((x) => x.kind === 'section');
    expect(s.map((x) => (x as { sectionIndex: number }).sectionIndex)).toEqual([0, 1]);
  });
});

describe('frameBox / frameFactor', () => {
  test('landscape video fills the width', () => {
    expect(frameBox(1920, 1080, 680, 300)).toEqual({ width: 533.33, height: 300 });
    expect(frameBox(1920, 1080, 680, 420)).toEqual({ width: 680, height: 382.5 });
  });
  test('portrait video is limited by height', () => {
    expect(frameBox(1080, 1920, 680, 300)).toEqual({ width: 168.75, height: 300 });
  });
  test('factor maps resized-frame pixels to the box', () => {
    expect(frameFactor(1920, 1080, 0.5, { width: 480, height: 270 })).toEqual({ x: 2, y: 2 });
  });
});

describe('splitColumns', () => {
  test('two balanced columns, first one longer', () => {
    expect(splitColumns(0, 5)).toEqual([[0, 3], [3, 5]]);
    expect(splitColumns(24, 120)).toEqual([[24, 72], [72, 120]]);
  });
  test('one row stays one column', () => {
    expect(splitColumns(0, 1)).toEqual([[0, 1]]);
  });
});

describe('snapshotFrames', () => {
  test('five frames, first and last included, times offset by the range start', () => {
    // The old report labelled the middle frames from 0 instead of startTime; this pins the fix.
    expect(snapshotFrames(101, 10, 30)).toEqual([
      { index: 0, time: 10 },
      { index: 25, time: 15 },
      { index: 50, time: 20 },
      { index: 75, time: 25 },
      { index: 100, time: 30 },
    ]);
  });
  test('fewer than five frames: each frame once', () => {
    expect(snapshotFrames(3, 0, 2).map((f) => f.index)).toEqual([0, 1, 2]);
  });
  test('no frames: empty strip', () => {
    expect(snapshotFrames(0, 0, 10)).toEqual([]);
  });
});
```

and import it: `import { buildSheets, frameBox, frameFactor, snapshotFrames, splitColumns } from './reportLayout';`

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest src/helpers/reportLayout.test.ts`
Expected: FAIL, "Cannot find module './reportLayout'".

- [ ] **Step 4: Implement**

```ts
// src/helpers/reportLayout.ts
import { REPORT_SHEET } from '../constants/constants';
import type { ReportModel } from './reportModel';

export type ReportSheet =
  | { kind: 'cover' }
  | { kind: 'section'; sectionIndex: number; rowStart: number; rowEnd: number; continued: boolean }
  | { kind: 'calibration' }
  | { kind: 'footage' };

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Every sheet is one printed page, so the page count is sheets.length. */
export function buildSheets(model: ReportModel, hasCalibration: boolean): ReportSheet[] {
  const sheets: ReportSheet[] = [{ kind: 'cover' }];
  model.sections.forEach((section, sectionIndex) => {
    const n = section.numStations;
    const firstEnd = Math.min(n, REPORT_SHEET.FIRST_SHEET_ROWS);
    sheets.push({ kind: 'section', sectionIndex, rowStart: 0, rowEnd: firstEnd, continued: false });
    for (let start = firstEnd; start < n; start += REPORT_SHEET.CONTINUATION_ROWS) {
      const end = Math.min(n, start + REPORT_SHEET.CONTINUATION_ROWS);
      sheets.push({ kind: 'section', sectionIndex, rowStart: start, rowEnd: end, continued: true });
    }
  });
  if (hasCalibration) sheets.push({ kind: 'calibration' });
  sheets.push({ kind: 'footage' });
  return sheets;
}

export function frameBox(videoWidth: number, videoHeight: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / videoWidth, maxHeight / videoHeight);
  return { width: round2(videoWidth * scale), height: round2(videoHeight * scale) };
}

/** Same meaning as the old Report.tsx factor: resized-frame pixels per box pixel. */
export function frameFactor(
  videoWidth: number,
  videoHeight: number,
  resizeFactor: number,
  box: { width: number; height: number }
) {
  return { x: (videoWidth * resizeFactor) / box.width, y: (videoHeight * resizeFactor) / box.height };
}

export function splitColumns(start: number, end: number): [number, number][] {
  const count = end - start;
  if (count <= 1) return [[start, end]];
  const mid = start + Math.ceil(count / 2);
  return [
    [start, mid],
    [mid, end],
  ];
}

export function snapshotFrames(frameCount: number, startTime: number, endTime: number) {
  if (frameCount <= 0) return [];
  const count = Math.min(5, frameCount);
  if (count === 1) return [{ index: 0, time: startTime }];
  return Array.from({ length: count }, (_, k) => {
    const index = Math.round((k * (frameCount - 1)) / (count - 1));
    // Time follows the frame actually shown, so rounding never mislabels it.
    const time = startTime + (index / (frameCount - 1)) * (endTime - startTime);
    return { index, time: round2(time) };
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/helpers/reportLayout.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/helpers/reportLayout.ts src/helpers/reportLayout.test.ts src/constants/constants.ts
git commit -m "Report layout: A4 sheet list with station-table continuation and frame boxes"
```

---

### Task 3: Fixed light palette for plots drawn inside the report

**Files:**
- Modify: `src/helpers/getCSSVar.ts:8-16`
- Test: `src/helpers/getCSSVarScope.test.ts`

**Interfaces:**
- Produces: any element with the attribute `data-theme-scope` wins over the app's `[data-theme]` root for every `getCSSVar` lookup (and therefore `getTechniqueColors`, `getPinColors`, etc.). Task 9 puts `data-theme-scope data-theme="light"` on the report root.

- [ ] **Step 1: Write the failing test**

```ts
// src/helpers/getCSSVarScope.test.ts
import { getCSSVar } from './getCSSVar';

type El = { id: string };
const appRoot: El = { id: 'app' };
const reportRoot: El = { id: 'report' };

const install = (withScope: boolean) => {
  (global as any).document = {
    documentElement: { id: 'html' },
    querySelector: (sel: string) =>
      sel === '[data-theme-scope]' ? (withScope ? reportRoot : null) : sel === '[data-theme]' ? appRoot : null,
  };
  (global as any).getComputedStyle = (el: El) => ({
    getPropertyValue: () => (el.id === 'report' ? '#0072B2' : '#56B4E9'),
  });
};

afterEach(() => {
  delete (global as any).document;
  delete (global as any).getComputedStyle;
});

test('reads from the app theme root when no report is mounted', () => {
  install(false);
  expect(getCSSVar('--tech-lspiv')).toBe('#56B4E9');
});

test('a mounted report scope wins over the app theme', () => {
  install(true);
  expect(getCSSVar('--tech-lspiv')).toBe('#0072B2');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/helpers/getCSSVarScope.test.ts`
Expected: FAIL on the second test (received `#56B4E9`).

- [ ] **Step 3: Implement**

Replace the lookup in `getCSSVar`:

```ts
export const getCSSVar = (name: string, fallback = ''): string => {
  // Test environments in this repo run without jsdom, so document is
  // undefined — return the fallback rather than dereferencing it.
  if (typeof document === 'undefined') return fallback;
  // The exported report is a fixed light document: while it is mounted its
  // root carries data-theme-scope (and data-theme="light"), and every chart
  // drawn on that page must take its ink from there, not from the app theme.
  // Otherwise data-theme is on the app root div, not on <html>.
  const themedEl =
    (document.querySelector('[data-theme-scope]') as HTMLElement | null) ??
    (document.querySelector('[data-theme]') as HTMLElement | null) ??
    document.documentElement;
  return getComputedStyle(themedEl).getPropertyValue(name).trim() || fallback;
};
```

- [ ] **Step 4: Run tests**

Run: `npx jest src/helpers`
Expected: PASS (existing colour-token tests unaffected: they run without `document`).

- [ ] **Step 5: Commit**

```bash
git add src/helpers/getCSSVar.ts src/helpers/getCSSVarScope.test.ts
git commit -m "Let a mounted report scope its chart colours to the light palette"
```

---

### Task 4: Oblique residuals

**Files:**
- Create: `src/helpers/obliqueResiduals.ts`
- Test: `src/helpers/obliqueResiduals.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type PairKey = 'd12' | 'd23' | 'd34' | 'd41' | 'd13' | 'd24';
  export interface DistanceResidual { pair: PairKey; label: string; entered: number; solved: number; residual: number }
  export function obliqueResiduals(rw: { x: number; y: number }[], distances: Record<PairKey, number>): DistanceResidual[] | null;
  ```
  `label` is `'1-2'`, `'2-3'`, `'3-4'`, `'4-1'`, `'1-3'`, `'2-4'`. Returns `null` when `rw` has fewer than 4 points. `residual = solved - entered`.

- [ ] **Step 1: Write the failing test**

```ts
// src/helpers/obliqueResiduals.test.ts
import { obliqueResiduals } from './obliqueResiduals';

const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
const distances = { d12: 10, d23: 10, d34: 10, d41: 10.2, d13: 14.14, d24: 14.14 };

test('solved distance from the real-world coordinates, minus the entered one', () => {
  const r = obliqueResiduals(square, distances)!;
  expect(r.map((x) => x.label)).toEqual(['1-2', '2-3', '3-4', '4-1', '1-3', '2-4']);
  expect(r[3].solved).toBeCloseTo(10);
  expect(r[3].residual).toBeCloseTo(-0.2);
  expect(r[4].solved).toBeCloseTo(Math.SQRT2 * 10);
});

test('null until the four real-world points exist', () => {
  expect(obliqueResiduals(square.slice(0, 3), distances)).toBeNull();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/helpers/obliqueResiduals.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// src/helpers/obliqueResiduals.ts
export type PairKey = 'd12' | 'd23' | 'd34' | 'd41' | 'd13' | 'd24';

export interface DistanceResidual {
  pair: PairKey;
  label: string;
  entered: number;
  solved: number;
  /** solved - entered, in the same unit as the entered distances. */
  residual: number;
}

const PAIRS: [PairKey, number, number][] = [
  ['d12', 0, 1],
  ['d23', 1, 2],
  ['d34', 2, 3],
  ['d41', 3, 0],
  ['d13', 0, 2],
  ['d24', 1, 3],
];

export function obliqueResiduals(
  rw: { x: number; y: number }[],
  distances: Record<PairKey, number>
): DistanceResidual[] | null {
  if (rw.length < 4) return null;
  return PAIRS.map(([pair, a, b]) => {
    const solved = Math.hypot(rw[b].x - rw[a].x, rw[b].y - rw[a].y);
    const entered = distances[pair];
    return { pair, label: `${a + 1}-${b + 1}`, entered, solved, residual: solved - entered };
  });
}
```

- [ ] **Step 4: Run tests** — `npx jest src/helpers/obliqueResiduals.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/helpers/obliqueResiduals.ts src/helpers/obliqueResiduals.test.ts
git commit -m "Compute oblique control-distance residuals for the report"
```

---

### Task 5: Paper, Sheet and stylesheet

**Files:**
- Rewrite: `src/components/Report/report.css`
- Create: `src/components/Report/Sheet.tsx`
- Test: `src/helpers/reportDocument.test.ts` (created here, extended in later tasks)

**Interfaces:**
- Produces:
  ```tsx
  export const Sheet: React.FC<{ page: number; pages: number; title: string; children: React.ReactNode }>;
  ```
  `title` is "River @ Site". Class names other tasks use: `.report-doc`, `.sheet`, `.sheet-body`, `.sheet-footer`, `.doc-kicker`, `.doc-h1`, `.doc-h2`, `.doc-figure`, `.doc-q`, `.doc-q-unit`, `.doc-q-pm`, `.doc-meta`, `.doc-table`, `.doc-table--numeric`, `.doc-cols`, `.doc-tag`, `.doc-tag--seeded`, `.doc-tech`, `.doc-tech--lspiv|stiv|iwave`, `.doc-applied`, `.doc-kv`.

- [ ] **Step 1: Write the failing source-text guard**

```ts
// src/helpers/reportDocument.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('report stylesheet', () => {
  const css = read('src/components/Report/report.css');

  test('keeps the scale exemption header', () => {
    expect(css.startsWith('/* scale-exempt-file:')).toBe(true);
  });

  test('prints on A4, one sheet per page', () => {
    expect(css).toMatch(/@page\s*\{[^}]*size:\s*A4 portrait/);
    expect(css).toMatch(/\.sheet\s*\{[^}]*break-after:\s*page/);
  });

  test('no gradients and no dark page ground', () => {
    expect(css).not.toMatch(/gradient\(/);
    expect(css).not.toMatch(/#262626/);
  });

  test('the report scope paints its own white paper for charts', () => {
    expect(css).toMatch(/\.report-doc\s*\{[^}]*--background-color:\s*#ffffff/i);
  });
});

describe('Sheet', () => {
  test('footer carries title and page n / N', () => {
    const src = read('src/components/Report/Sheet.tsx');
    expect(src).toContain('sheet-footer');
    expect(src).toMatch(/\{page\}\s*\/\s*\{pages\}/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/helpers/reportDocument.test.ts`
Expected: FAIL (old css has the gradient and `#262626`; `Sheet.tsx` missing).

- [ ] **Step 3: Write `Sheet.tsx`**

```tsx
// src/components/Report/Sheet.tsx
import { useTranslation } from 'react-i18next';

interface SheetProps {
  page: number;
  pages: number;
  /** "River @ Site" */
  title: string;
  children: React.ReactNode;
}

/** One printed A4 page. The body never grows past the page; layout.ts decides what fits. */
export const Sheet = ({ page, pages, title, children }: SheetProps) => {
  const { t } = useTranslation();
  return (
    <section className="sheet">
      <div className="sheet-body">{children}</div>
      <footer className="sheet-footer">
        <span>{title}</span>
        <span>
          {t('Report.Doc.page', { defaultValue: 'page' })} {page} / {pages}
        </span>
      </footer>
    </section>
  );
};
```

- [ ] **Step 4: Rewrite `report.css`**

Replace the whole file. The visual direction: white paper, ink `#1F2A37`, one accent `#3D6D9E` (the app's light accent) used for the headline number and rules only, technique identity colours from the light theme tokens, system UI font stack for text and tabular numerals for every number.

```css
/* scale-exempt-file: the report is a printable document with its own type
   scale, and Report.tsx inlines every stylesheet into the exported
   report.html. Exempt as a whole under Phase 6g decision G2 (spec A15). */

@page {
  size: A4 portrait;
  margin: 0;
}

.report-doc {
  /* Fixed light document, whatever the app theme. data-theme="light" on the
     same element brings the light tokens; these override the ones charts
     read as their ground and ink so plots sit on white paper. */
  --background-color: #ffffff;
  --secondary-background-color: #ffffff;
  --card-surface: #ffffff;
  --primary-text-color: #1f2a37;
  --secondary-text-color: #5b6878;
  --doc-ink: #1f2a37;
  --doc-muted: #5b6878;
  --doc-rule: #d5dbe3;
  --doc-accent: #3d6d9e;
  --doc-paper: #ffffff;
  --doc-desk: #e6e9ee;
  --doc-font: -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

  background: var(--doc-desk);
  color: var(--doc-ink);
  font-family: var(--doc-font);
  font-size: 11px;
  line-height: 1.45;
  font-variant-numeric: tabular-nums;
  padding: 24px 0;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.sheet {
  box-sizing: border-box;
  width: 210mm;
  height: 297mm;
  margin: 0 auto 24px;
  padding: 15mm 15mm 0;
  background: var(--doc-paper);
  box-shadow: 0 1px 3px rgba(31, 42, 55, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  break-after: page;
  page-break-after: always;
}

.sheet:last-child {
  break-after: auto;
  page-break-after: auto;
}

.sheet-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sheet-footer {
  display: flex;
  justify-content: space-between;
  border-top: 0.5px solid var(--doc-rule);
  padding: 6px 0 10mm;
  color: var(--doc-muted);
  font-size: 9px;
}

.doc-kicker {
  margin: 0;
  color: var(--doc-muted);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.doc-h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 650;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.doc-h2 {
  margin: 0;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--doc-ink);
  font-size: 13px;
  font-weight: 650;
}

.doc-meta {
  margin: 0;
  color: var(--doc-muted);
}

.doc-q {
  margin: 0;
  color: var(--doc-accent);
  font-size: 44px;
  font-weight: 650;
  line-height: 1;
  letter-spacing: -0.01em;
}

.doc-q-unit {
  margin-left: 6px;
  font-size: 16px;
  font-weight: 500;
}

.doc-q-pm {
  margin-left: 10px;
  color: var(--doc-muted);
  font-size: 16px;
  font-weight: 500;
}

.doc-figure {
  margin: 0;
  position: relative;
  align-self: center;
}

.doc-figure img {
  display: block;
}

.doc-figure figcaption {
  margin-top: 4px;
  color: var(--doc-muted);
  font-size: 9px;
}

.doc-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

.doc-table {
  width: 100%;
  border-collapse: collapse;
}

.doc-table th {
  padding: 3px 6px;
  border-bottom: 1px solid var(--doc-ink);
  color: var(--doc-muted);
  font-size: 9px;
  font-weight: 600;
  text-align: left;
  vertical-align: bottom;
}

.doc-table td {
  padding: 2px 6px;
  border-bottom: 0.5px solid var(--doc-rule);
}

.doc-table--numeric th:not(:first-child),
.doc-table--numeric td:not(:first-child) {
  text-align: right;
}

.doc-table .doc-unit {
  display: block;
  font-weight: 400;
}

.doc-tag {
  display: inline-block;
  padding: 0 5px;
  border: 0.5px solid var(--doc-rule);
  border-radius: 3px;
  font-size: 9px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.doc-tag--seeded {
  border-color: var(--doc-ink);
}

/* Technique identity: the label is always printed; the colour bar repeats it. */
.doc-tech {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
}

.doc-tech::before {
  content: '';
  width: 3px;
  height: 11px;
  background: currentColor;
}

.doc-tech--lspiv::before { background: var(--tech-lspiv); }
.doc-tech--stiv::before { background: var(--tech-stiv); }
.doc-tech--iwave::before { background: var(--tech-iwave); }

.doc-applied {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
  margin: 0;
  padding: 8px 0;
  border-top: 0.5px solid var(--doc-rule);
  border-bottom: 0.5px solid var(--doc-rule);
  list-style: none;
}

.doc-kv {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 2px 14px;
  margin: 0;
}

.doc-kv dt {
  color: var(--doc-muted);
}

.doc-kv dd {
  margin: 0;
}

.doc-compare {
  display: flex;
  gap: 18px;
  margin: 0;
  padding: 6px 0;
  border-top: 0.5px solid var(--doc-rule);
  border-bottom: 0.5px solid var(--doc-rule);
  list-style: none;
}

.doc-compare li[data-active='true'] {
  font-weight: 650;
}

.doc-region {
  position: absolute;
  box-sizing: border-box;
  border: 1.5px dashed var(--doc-accent);
}

@media print {
  .report-doc {
    background: none;
    padding: 0;
  }
  .sheet {
    margin: 0;
    box-shadow: none;
  }
}
```

- [ ] **Step 5: Run the guard** — `npx jest src/helpers/reportDocument.test.ts` → PASS. Also run `npx jest src/helpers/displayDecimals.test.ts src/helpers/cssRules.test.ts src/helpers/cssScanner.test.ts` → PASS (if a project-wide CSS guard rejects a value, follow its message; the file is scale-exempt, colour guards may still apply).

- [ ] **Step 6: Commit**

```bash
git add src/components/Report/report.css src/components/Report/Sheet.tsx src/helpers/reportDocument.test.ts
git commit -m "Report paper: A4 sheets, print rules and a fixed light palette"
```

---

### Task 6: Cover

**Files:**
- Create: `src/components/Report/Cover.tsx`
- Modify: `src/helpers/reportDocument.test.ts` (append)
- Modify: `src/translations/en/global.json` (add `Report.Doc` keys used here)

**Interfaces:**
- Consumes: `ReportModel`, `AppliedCorrections`, `TECHNIQUE_LABEL` (Task 1).
- Produces: `export const Cover: React.FC<{ model: ReportModel; summary: SummaryRow[] | null; applied: AppliedCorrections; footage: 'uav' | 'oblique' | 'ipcam' | ''; version: string }>`

- [ ] **Step 1: Append failing guards**

```ts
describe('Cover', () => {
  const src = read('src/components/Report/Cover.tsx');
  test('leads with the total, reads the model, never data.total_Q', () => {
    expect(src).toContain('doc-q');
    expect(src).toContain('model.totalQ');
    expect(src).not.toContain('total_Q');
  });
  test('states the version, footage type and skipped sections', () => {
    expect(src).toContain('version');
    expect(src).toContain('model.skipped');
    expect(src).toMatch(/Report\.Doc\.footage\./);
  });
  test('applied strip only lists what was applied', () => {
    expect(src).toMatch(/applied\.lensCorrection\s*&&/);
    expect(src).toMatch(/applied\.stabilizationRegions\s*!==\s*null\s*&&/);
  });
  test('summary table across sections, only when the model provides rows, LSPIV rows labelled', () => {
    expect(src).toMatch(/summary\s*&&/);
    expect(src).toContain('row.lspivOnly');
    expect(src).toContain('Report.Summary.mean');
    expect(src).toContain('Report.Summary.cov');
  });
});
```

Run: `npx jest src/helpers/reportDocument.test.ts` → FAIL (file missing).

- [ ] **Step 2: Implement `Cover.tsx`**

```tsx
// src/components/Report/Cover.tsx
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

interface CoverProps {
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

export const Cover = ({ model, summary, applied, footage, version }: CoverProps) => {
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
    model.sections.length === 0
      ? 0
      : model.sections.reduce((a, s) => a + s.measuredPct, 0) / model.sections.length;

  return (
    <>
      <header>
        <p className="doc-kicker">
          {t(`Report.Doc.footage.${footage || 'none'}`, { defaultValue: FOOTAGE_DEFAULT[footage] })} · RIVeR {version}
        </p>
        <h1 className="doc-h1">
          {riverName} @ {site}
        </h1>
        <p className="doc-meta">{meditionDate}</p>
      </header>

      <div>
        <p className="doc-kicker">{t('Report.Doc.totalDischarge', { defaultValue: 'Total discharge' })}</p>
        <p className="doc-q">
          {q(model.totalQ)}
          <span className="doc-q-unit">{flow}</span>
          {model.qStdBetween !== null && (
            <span className="doc-q-pm">
              ± {q(model.qStdBetween)} {flow}
            </span>
          )}
        </p>
        <p className="doc-meta">
          {model.cov !== null && <>COV {(model.cov * 100).toFixed(2)} % · </>}
          {measuredPct.toFixed(2)} % {t('Results.measured')} ·{' '}
          {t('Report.Doc.sectionCount', {
            count: model.sections.length,
            defaultValue_one: '{{count}} section',
            defaultValue_other: '{{count}} sections',
          })}
        </p>
      </div>

      <table className="doc-table doc-table--numeric">
        <thead>
          <tr>
            <th>{t('Report.Doc.section', { defaultValue: 'Section' })}</th>
            <th>{t('Report.Doc.technique', { defaultValue: 'Technique' })}</th>
            <th>
              Q<span className="doc-unit">{flow}</span>
            </th>
            <th>
              ±σ<span className="doc-unit">{flow}</span>
            </th>
            <th>{t('Results.measured')}</th>
          </tr>
        </thead>
        <tbody>
          {model.sections.map((s) => (
            <tr key={s.index}>
              <td>
                {s.name}{' '}
                {s.seeded && (
                  <span className="doc-tag doc-tag--seeded">{t('Report.Doc.seeded', { defaultValue: 'Seeded' })}</span>
                )}
              </td>
              <td>
                <span className={`doc-tech doc-tech--${s.technique}`}>{TECHNIQUE_LABEL[s.technique]}</span>
              </td>
              <td>{q(s.totalQ)}</td>
              <td>{s.qStd !== null ? q(s.qStd) : '-'}</td>
              <td>{s.measuredPct.toFixed(2)} %</td>
            </tr>
          ))}
        </tbody>
      </table>

      {model.skipped.length > 0 && (
        <p className="doc-meta">
          {t('Report.Doc.skipped', { defaultValue: 'Not processed, left out:' })} {model.skipped.join(', ')}
        </p>
      )}

      {summary && (
        <div>
          <h2 className="doc-h2">{t('Report.Doc.acrossSections', { defaultValue: 'Across sections' })}</h2>
          <table className="doc-table doc-table--numeric">
            <thead>
              <tr>
                <th />
                <th>{t('Report.Summary.mean')}</th>
                <th>{t('Report.Summary.stdDev')}</th>
                <th>{t('Report.Summary.cov')}</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => {
                const [key, fallback] = SUMMARY_LABEL[row.key];
                // The '% Measured' label already carries its unit.
                const unit = row.unit === 'percent' || row.unit === 'none' ? '' : getUnit(unitSistem, row.unit);
                const factor = unitFactor(row.unit);
                const value = (v: number | null) => (v === null ? '-' : (v * factor).toFixed(2));
                return (
                  <tr key={row.key}>
                    <td>
                      {t(key, { defaultValue: fallback })}
                      {unit && <span className="doc-meta"> {unit}</span>}
                      {row.lspivOnly && <span className="doc-meta"> (LSPIV)</span>}
                    </td>
                    <td>{value(row.mean)}</td>
                    <td>{value(row.std)}</td>
                    <td>{row.cov === null ? '-' : (row.cov * 100).toFixed(2) + ' %'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <h2 className="doc-h2">{t('Report.Doc.applied', { defaultValue: 'Applied to the footage' })}</h2>
        <ul className="doc-applied">
          {applied.lensCorrection && (
            <li>
              {t('Report.Doc.lens', { defaultValue: 'Lens correction' })}: {applied.lensCorrection}
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
            {t('Report.Doc.step', { defaultValue: 'Frame step' })}: {applied.step}
          </li>
          <li>
            {t('Report.Doc.resize', { defaultValue: 'Resize factor' })}: {applied.resizeFactor}
          </li>
        </ul>
      </div>
    </>
  );
};
```

- [ ] **Step 3: Add the English keys**

In `src/translations/en/global.json`, inside `"Report"`, add:

```json
"Doc": {
  "page": "page",
  "footage": { "uav": "UAV (nadir)", "oblique": "Oblique", "ipcam": "IP camera", "none": "-" },
  "totalDischarge": "Total discharge",
  "sectionCount_one": "{{count}} section",
  "sectionCount_other": "{{count}} sections",
  "section": "Section",
  "technique": "Technique",
  "seeded": "Seeded",
  "skipped": "Not processed, left out:",
  "applied": "Applied to the footage",
  "lens": "Lens correction",
  "stabilization_one": "Stabilized ({{count}} region)",
  "stabilization_other": "Stabilized ({{count}} regions)",
  "step": "Frame step",
  "resize": "Resize factor",
  "acrossSections": "Across sections"
}
```

- [ ] **Step 4: Run** — `npx jest src/helpers/reportDocument.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Report/Cover.tsx src/helpers/reportDocument.test.ts src/translations/en/global.json
git commit -m "Report cover: total discharge, section list, applied corrections and version"
```

---

### Task 7: Section sheet and station table

**Files:**
- Create: `src/components/Report/StationTable.tsx`
- Create: `src/components/Report/SectionSheet.tsx`
- Modify: `src/helpers/reportDocument.test.ts` (append), `src/translations/en/global.json`

**Interfaces:**
- Consumes: `SectionResult`, `TECHNIQUE_LABEL` (Task 1); `splitColumns`, `REPORT_SHEET` (Task 2); existing `ImageResults` (`reportFactor`, `reportWidth`, `reportHeight`, `isReport`, `sectionIndex`) and `AllInOne` (`width`, `height`, `index`, `isReport`); `getEffectiveTechniqueData`.
- Produces:
  ```tsx
  export const StationTable: React.FC<{ storeIndex: number; rowStart: number; rowEnd: number }>;
  export const SectionSheet: React.FC<{ result: SectionResult; rowStart: number; rowEnd: number; continued: boolean; frame: { width: number; height: number }; factor: { x: number; y: number } }>;
  ```
  `result.index` is the store index (for `ImageResults`/`AllInOne`/`StationTable`).

- [ ] **Step 1: Append failing guards**

```ts
describe('Section sheet', () => {
  const sheet = read('src/components/Report/SectionSheet.tsx');
  const table = read('src/components/Report/StationTable.tsx');
  test('header shows technique by label and colour, seeded tag, Q', () => {
    expect(sheet).toContain('TECHNIQUE_LABEL[result.technique]');
    expect(sheet).toContain('doc-tech--');
    expect(sheet).toContain('result.seeded');
  });
  test('continuation sheets show only the table', () => {
    expect(sheet).toMatch(/!continued\s*&&/);
  });
  test('comparison strip only when more than one technique was computed', () => {
    expect(sheet).toMatch(/result\.comparison\.length\s*>\s*1/);
  });
  test('table velocity and Q come from the active technique, not the LSPIV arrays', () => {
    expect(table).toContain('getEffectiveTechniqueData');
    expect(table).not.toContain('streamwise_velocity_magnitude');
    expect(table).toContain('splitColumns');
  });
});
```

Run → FAIL (files missing).

- [ ] **Step 2: Implement `StationTable.tsx`**

```tsx
// src/components/Report/StationTable.tsx
import { getUnit } from '../../helpers';
import { getEffectiveTechniqueData } from '../../helpers/techniqueDischarge';
import { splitColumns } from '../../helpers/reportLayout';
import { useProjectSlice, useSectionSlice } from '../../hooks';
import { UNIT_CONVERSIONS } from '../../constants/constants';

interface StationTableProps {
  /** Index into the store's sections. */
  storeIndex: number;
  rowStart: number;
  rowEnd: number;
}

export const StationTable = ({ storeIndex, rowStart, rowEnd }: StationTableProps) => {
  const { sections } = useSectionSlice();
  const { projectDetails, video } = useProjectSlice();
  const section = sections[storeIndex];
  const data = section.data;
  if (!data) return null;

  const { unitSistem } = projectDetails;
  const imperial = unitSistem === 'imperial';
  const lF = imperial ? UNIT_CONVERSIONS.M_TO_FT : 1;
  const aF = lF * lF;
  const qF = imperial ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;

  const effective = getEffectiveTechniqueData(data, section.activeTechnique, {
    interpolated: section.interpolated,
    artificialSeeding: section.artificialSeeding,
    alpha: section.alpha,
    step: video.parameters.step,
    fps: video.data.fps,
  });
  if (!effective) return null;

  const fmt = (v: number | null | undefined, f: number) => (typeof v === 'number' ? (v * f).toFixed(2) : '-');

  const column = ([start, end]: [number, number]) => (
    <table className="doc-table doc-table--numeric" key={start}>
      <thead>
        <tr>
          <th>#</th>
          <th>
            x<span className="doc-unit">{getUnit(unitSistem, 'longitude')}</span>
          </th>
          <th>
            d<span className="doc-unit">{getUnit(unitSistem, 'longitude')}</span>
          </th>
          <th>
            A<span className="doc-unit">{getUnit(unitSistem, 'area')}</span>
          </th>
          <th>
            Vs<span className="doc-unit">{getUnit(unitSistem, 'velocity')}</span>
          </th>
          <th>
            Q<span className="doc-unit">{getUnit(unitSistem, 'flow')}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: end - start }, (_, k) => start + k).map((i) => (
          <tr key={i}>
            <td>
              {i + 1}
              {effective.interpFlags[i] ? '*' : ''}
            </td>
            <td>{fmt(data.distance[i], lF)}</td>
            <td>{fmt(data.depth[i], lF)}</td>
            <td>{fmt(effective.A[i], aF)}</td>
            <td>{fmt(effective.resolved[i], lF)}</td>
            <td>{fmt(effective.Q[i], qF)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return <div className="doc-cols">{splitColumns(rowStart, rowEnd).map(column)}</div>;
};
```

- [ ] **Step 3: Implement `SectionSheet.tsx`**

```tsx
// src/components/Report/SectionSheet.tsx
import { useTranslation } from 'react-i18next';
import { getUnit } from '../../helpers';
import { useProjectSlice } from '../../hooks';
import { REPORT_SHEET, UNIT_CONVERSIONS } from '../../constants/constants';
import { TECHNIQUE_LABEL, type SectionResult } from '../../helpers/reportModel';
import { AllInOne } from '../Graphs';
import { ImageResults } from '../ImageResults';
import { StationTable } from './StationTable';

interface SectionSheetProps {
  result: SectionResult;
  rowStart: number;
  rowEnd: number;
  continued: boolean;
  frame: { width: number; height: number };
  factor: { x: number; y: number };
}

export const SectionSheet = ({ result, rowStart, rowEnd, continued, frame, factor }: SectionSheetProps) => {
  const { t } = useTranslation();
  const { projectDetails } = useProjectSlice();
  const qF = projectDetails.unitSistem === 'imperial' ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;
  const flow = getUnit(projectDetails.unitSistem, 'flow');

  return (
    <>
      <header>
        <p className="doc-kicker">
          <span className={`doc-tech doc-tech--${result.technique}`}>{TECHNIQUE_LABEL[result.technique]}</span>
          {result.seeded && (
            <>
              {' '}
              <span className="doc-tag doc-tag--seeded">{t('Report.Doc.seeded', { defaultValue: 'Seeded' })}</span>
            </>
          )}
        </p>
        <h1 className="doc-h1">
          {result.name}
          {continued && <span className="doc-meta"> ({t('Report.Doc.continued', { defaultValue: 'continued' })})</span>}
        </h1>
        {!continued && (
          <p className="doc-q" style={{ fontSize: 28 }}>
            {(result.totalQ * qF).toFixed(2)}
            <span className="doc-q-unit">{flow}</span>
            {result.qStd !== null && (
              <span className="doc-q-pm">
                ± {(result.qStd * qF).toFixed(2)} {flow}
              </span>
            )}
          </p>
        )}
        {!continued && (
          <p className="doc-meta">
            {result.measuredPct.toFixed(2)} % {t('Results.measured')} · {result.interpolatedPct.toFixed(2)} %{' '}
            {t('Results.interpolated')} · {result.numStations} {t('Report.Doc.stations', { defaultValue: 'stations' })}
            {result.alpha !== null && <> · α {result.alpha.toFixed(2)}</>}
          </p>
        )}
      </header>

      {!continued && (
        <figure className="doc-figure">
          <ImageResults
            reportFactor={factor}
            reportWidth={frame.width}
            reportHeight={frame.height}
            isReport={true}
            sectionIndex={result.index}
          />
        </figure>
      )}

      {!continued && (
        <AllInOne width={REPORT_SHEET.CONTENT_WIDTH} height={REPORT_SHEET.PLOT_HEIGHT} index={result.index} isReport={true} />
      )}

      {!continued && result.comparison.length > 1 && (
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

      <StationTable storeIndex={result.index} rowStart={rowStart} rowEnd={rowEnd} />
      <p className="doc-meta">* {t('Report.Doc.interpolatedStation', { defaultValue: 'interpolated station' })}</p>
    </>
  );
};
```

Add to `Report.Doc` in `en/global.json`: `"continued": "continued"`, `"stations": "stations"`, `"reported": "reported"`, `"interpolatedStation": "interpolated station"`.

- [ ] **Step 4: Run** — `npx jest src/helpers/reportDocument.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Report/StationTable.tsx src/components/Report/SectionSheet.tsx src/helpers/reportDocument.test.ts src/translations/en/global.json
git commit -m "Report section sheet: frame, profile, technique comparison and paginated station table"
```

---

### Task 8: Calibration sheet and footage sheet

**Files:**
- Create: `src/components/Report/CalibrationSheet.tsx`
- Create: `src/components/Report/FootageSheet.tsx`
- Modify: `src/helpers/reportDocument.test.ts` (append), `src/translations/en/global.json`

**Interfaces:**
- Consumes: `obliqueResiduals` (Task 4); `frameBox`, `frameFactor`, `REPORT_SHEET` (Task 2); existing `obliqueSvg`, `ipcamSvg` from `../Graphs` (same call shapes as the deleted `ObliquePixelTransformation.tsx` / `IpcamPixelTransformation.tsx`); hooks `useUavSlice` (`size`, `rwLength`, `rwPoints`, `dirPoints`, `solution`), `useObliqueSlice` (`coordinates`, `rwCoordinates`, `distances`), `useIpcamSlice` (`points`, `cameraSolution`), `useDataSlice` (`processing.form`), `useProjectSlice` (`type`, `video`, `firstFramePath`).
- Produces:
  ```tsx
  export const CalibrationSheet: React.FC;   // renders nothing when the footage type has no solved calibration
  export function hasCalibration(type: string, ipcamSolved: boolean): boolean; // in CalibrationSheet.tsx
  export const FootageSheet: React.FC<{ model: ReportModel; version: string }>;
  ```

**Before coding:** open `src/components/Forms/Components/StabilizationRegions.tsx` and the region editor `VideoRange.tsx` passes regions to, and confirm the regions are stored in original-video pixels (the editor receives `videoWidth`/`videoHeight`). If they are stored in another space, change the scale in `FootageSheet` to match and note it in the commit message.

- [ ] **Step 1: Append failing guards**

```ts
describe('Calibration sheet', () => {
  const src = read('src/components/Report/CalibrationSheet.tsx');
  test('one block per footage type', () => {
    expect(src).toMatch(/type === 'uav'/);
    expect(src).toMatch(/type === 'oblique'/);
    expect(src).toMatch(/type === 'ipcam'/);
  });
  test('oblique shows real-world coordinates and residuals', () => {
    expect(src).toContain('rwCoordinates');
    expect(src).toContain('obliqueResiduals');
  });
  test('ip camera shows X/Y/Z, per-point error and camera position', () => {
    expect(src).toContain('reprojectionErrors');
    expect(src).toContain('cameraPosition');
    expect(src).toMatch(/\.Z\b/);
  });
});

describe('Footage sheet', () => {
  const src = read('src/components/Report/FootageSheet.tsx');
  test('snapshot strip across the processed range, with times', () => {
    expect(src).toContain('snapshotFrames');
    expect(src).toContain('doc-strip');
    expect(src).toContain('images.paths');
  });
  test('video creation date is reported', () => {
    expect(src).toContain('creation');
  });
  test('reports committed corrections and draws stabilization regions', () => {
    expect(src).toContain('committedStabilizationRegions');
    expect(src).toContain('doc-region');
  });
  test('parameter blocks per technique used; LSPIV block shows seeding', () => {
    expect(src).toMatch(/techniquesUsed\.includes\('lspiv'\)/);
    expect(src).toMatch(/techniquesUsed\.includes\('stiv'\)/);
    expect(src).toMatch(/techniquesUsed\.includes\('iwave'\)/);
    expect(src).toContain('artificialSeeding');
  });
  test('colophon: version, citation DOIs, IWaVE credit', () => {
    expect(src).toContain('10.1016/j.cageo.2017.07.009');
    expect(src).toContain('10.5281/zenodo.22050810');
    expect(src).toContain('dataforwater');
  });
});
```

Run → FAIL.

- [ ] **Step 2: Implement `CalibrationSheet.tsx`**

```tsx
// src/components/Report/CalibrationSheet.tsx
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useTranslation } from 'react-i18next';
import { getUnit } from '../../helpers';
import { useIpcamSlice, useObliqueSlice, useProjectSlice, useUavSlice } from '../../hooks';
import { REPORT_SHEET } from '../../constants/constants';
import { frameBox, frameFactor } from '../../helpers/reportLayout';
import { obliqueResiduals } from '../../helpers/obliqueResiduals';
import { ipcamSvg, obliqueSvg } from '../Graphs';

export const hasCalibration = (type: string, ipcamSolved: boolean) =>
  type === 'uav' || type === 'oblique' || (type === 'ipcam' && ipcamSolved);

const f2 = (v: number | undefined | null) => (typeof v === 'number' ? v.toFixed(2) : '-');

const useFrame = () => {
  const { video } = useProjectSlice();
  const { width, height } = video.data;
  const box = frameBox(width, height, REPORT_SHEET.CONTENT_WIDTH, REPORT_SHEET.CALIBRATION_FRAME_MAX_HEIGHT);
  return { box, factor: frameFactor(width, height, video.parameters.factor, box) };
};

const Uav = () => {
  const { t } = useTranslation();
  const { size, rwLength, rwPoints, dirPoints, solution } = useUavSlice();
  const { projectDetails } = useProjectSlice();
  const len = getUnit(projectDetails.unitSistem, 'longitude');
  return (
    <>
      <dl className="doc-kv">
        <dt>{t('Report.Doc.pixelSize', { defaultValue: 'Pixel size (GSD)' })}</dt>
        <dd>
          {f2(size)} {len}/px
        </dd>
        <dt>{t('Report.Doc.referenceLength', { defaultValue: 'Reference length' })}</dt>
        <dd>
          {f2(rwLength)} {len}
        </dd>
      </dl>
      <table className="doc-table doc-table--numeric">
        <thead>
          <tr>
            <th>{t('Report.Doc.point', { defaultValue: 'Point' })}</th>
            <th>x px</th>
            <th>y px</th>
            <th>X {len}</th>
            <th>Y {len}</th>
          </tr>
        </thead>
        <tbody>
          {dirPoints.map((p, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{f2(p.x)}</td>
              <td>{f2(p.y)}</td>
              <td>{f2(rwPoints[i]?.x)}</td>
              <td>{f2(rwPoints[i]?.y)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {solution?.image && (
        <figure className="doc-figure">
          <img src={solution.image} width={REPORT_SHEET.CONTENT_WIDTH} />
          <figcaption>{t('Report.Doc.rectified', { defaultValue: 'Rectified frame' })}</figcaption>
        </figure>
      )}
    </>
  );
};

const Oblique = () => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const { firstFramePath, projectDetails } = useProjectSlice();
  const { coordinates, rwCoordinates, distances } = useObliqueSlice();
  const { box, factor } = useFrame();
  const len = getUnit(projectDetails.unitSistem, 'longitude');
  const residuals = obliqueResiduals(rwCoordinates, distances);

  useEffect(() => {
    d3.select(svgRef.current).selectAll('*').remove();
    if (svgRef.current) {
      obliqueSvg({ factor, coordinates, distances, svgElement: svgRef.current, width: box.width, height: box.height });
    }
  }, [factor, coordinates, distances, box.width, box.height]);

  return (
    <>
      <figure className="doc-figure">
        <img src={firstFramePath} width={box.width} height={box.height} />
        <svg ref={svgRef} style={{ position: 'absolute', inset: 0 }} width={box.width} height={box.height} />
      </figure>
      <div className="doc-cols">
        <table className="doc-table doc-table--numeric">
          <thead>
            <tr>
              <th>{t('Report.Doc.point', { defaultValue: 'Point' })}</th>
              <th>x px</th>
              <th>y px</th>
              <th>X {len}</th>
              <th>Y {len}</th>
            </tr>
          </thead>
          <tbody>
            {coordinates.map((p, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{f2(p.x)}</td>
                <td>{f2(p.y)}</td>
                <td>{f2(rwCoordinates[i]?.x)}</td>
                <td>{f2(rwCoordinates[i]?.y)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {residuals && (
          <table className="doc-table doc-table--numeric">
            <thead>
              <tr>
                <th>{t('Report.Doc.pair', { defaultValue: 'Pair' })}</th>
                <th>{t('Report.Doc.entered', { defaultValue: 'Entered' })} {len}</th>
                <th>{t('Report.Doc.solved', { defaultValue: 'Solved' })} {len}</th>
                <th>{t('Report.Doc.residual', { defaultValue: 'Residual' })} {len}</th>
              </tr>
            </thead>
            <tbody>
              {residuals.map((r) => (
                <tr key={r.pair}>
                  <td>{r.label}</td>
                  <td>{f2(r.entered)}</td>
                  <td>{f2(r.solved)}</td>
                  <td>{f2(r.residual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

const Ipcam = () => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const { firstFramePath, projectDetails } = useProjectSlice();
  const { points, cameraSolution } = useIpcamSlice();
  const { box, factor } = useFrame();
  const len = getUnit(projectDetails.unitSistem, 'longitude');

  useEffect(() => {
    d3.select(svgRef.current).selectAll('*').remove();
    if (svgRef.current && points !== null) {
      ipcamSvg({ factor, points, svgElement: svgRef.current, width: box.width, height: box.height });
    }
  }, [points, factor, box.width, box.height]);

  if (!cameraSolution || !points) return null;
  const { meanError, cameraPosition, reprojectionErrors, pointIndices, orthoImagePath } = cameraSolution;
  // reprojectionErrors[k] belongs to points[pointIndices[k]]; without indices they follow the used points in order.
  const used = pointIndices ?? points.map((p, i) => (p.wasEstablished ? i : -1)).filter((i) => i >= 0);
  const errorOf = new Map(used.map((pointIndex, k) => [pointIndex, reprojectionErrors[k]]));

  return (
    <>
      <figure className="doc-figure">
        <img src={firstFramePath} width={box.width} height={box.height} />
        <svg ref={svgRef} style={{ position: 'absolute', inset: 0 }} width={box.width} height={box.height} />
      </figure>
      <dl className="doc-kv">
        <dt>{t('Report.Doc.meanError', { defaultValue: 'Mean reprojection error' })}</dt>
        <dd>{f2(meanError)} px</dd>
        <dt>{t('Report.Doc.cameraPosition', { defaultValue: 'Camera position X / Y / Z' })}</dt>
        <dd>
          {cameraPosition.map(f2).join(' / ')} {len}
        </dd>
      </dl>
      <table className="doc-table doc-table--numeric">
        <thead>
          <tr>
            <th>{t('Report.Doc.point', { defaultValue: 'Point' })}</th>
            <th>X {len}</th>
            <th>Y {len}</th>
            <th>Z {len}</th>
            <th>{t('Report.Doc.error', { defaultValue: 'Error' })} px</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) =>
            errorOf.has(i) ? (
              <tr key={p.label}>
                <td>{p.label}</td>
                <td>{f2(p.X)}</td>
                <td>{f2(p.Y)}</td>
                <td>{f2(p.Z)}</td>
                <td>{f2(errorOf.get(i))}</td>
              </tr>
            ) : null
          )}
        </tbody>
      </table>
      {orthoImagePath && (
        <figure className="doc-figure">
          <img src={orthoImagePath} width={REPORT_SHEET.CONTENT_WIDTH / 2} />
          <figcaption>{t('Report.Doc.ortho', { defaultValue: 'Orthorectified view' })}</figcaption>
        </figure>
      )}
    </>
  );
};

export const CalibrationSheet = () => {
  const { t } = useTranslation();
  const { type } = useProjectSlice();
  return (
    <>
      <h1 className="doc-h1">{t('Report.Doc.calibration', { defaultValue: 'Calibration' })}</h1>
      {type === 'uav' && <Uav />}
      {type === 'oblique' && <Oblique />}
      {type === 'ipcam' && <Ipcam />}
    </>
  );
};
```

If `useUavSlice` does not return `dirPoints`/`rwPoints`/`solution` directly, read them where `useUavSlice.ts:30` reads them (`const { dirPoints, rwPoints, size, rwLength } = uav`) and return them from the hook. If the IP-camera table is empty on a real project, check whether `reprojectionErrors` is ordered by `points` instead and simplify `errorOf` accordingly.

- [ ] **Step 3: Implement `FootageSheet.tsx`**

```tsx
// src/components/Report/FootageSheet.tsx
import { useTranslation } from 'react-i18next';
import { formatTime } from '../../helpers';
import { useDataSlice, useProjectSlice } from '../../hooks';
import { REPORT_SHEET } from '../../constants/constants';
import { frameBox, snapshotFrames } from '../../helpers/reportLayout';
import { lensLabel, type ReportModel } from '../../helpers/reportModel';

interface FootageSheetProps {
  model: ReportModel;
  version: string;
}

export const FootageSheet = ({ model, version }: FootageSheetProps) => {
  const { t } = useTranslation();
  const { video, firstFramePath } = useProjectSlice();
  const { processing, images } = useDataSlice();
  const { name, width, height, fps, duration, creation } = video.data;
  const p = video.parameters;
  const form = processing.form;
  const box = frameBox(width, height, REPORT_SHEET.CONTENT_WIDTH, REPORT_SHEET.FOOTAGE_FRAME_MAX_HEIGHT);
  const sx = box.width / width;
  const sy = box.height / height;
  const lens = lensLabel(p.committedLensCorrection);
  const { techniquesUsed } = model;
  const yes = t('Commons.yes');
  const snapshots = snapshotFrames(images.paths.length, p.startTime, p.endTime);
  const created = creation && !Number.isNaN(new Date(creation).getTime()) ? new Date(creation) : null;

  return (
    <>
      <h1 className="doc-h1">{t('Report.Doc.footageAndParameters', { defaultValue: 'Footage and parameters' })}</h1>

      <dl className="doc-kv">
        <dt>{t('Report.VideoInfo.name')}</dt>
        <dd>{name ?? '-'}</dd>
        <dt>{t('Report.VideoInfo.resolution')}</dt>
        <dd>
          {width} × {height} · {fps} fps · {formatTime(duration)}
        </dd>
        {created && (
          <>
            <dt>{t('Report.VideoInfo.creationDate')}</dt>
            <dd>{created.toISOString().slice(0, 16).replace('T', ' ')}</dd>
          </>
        )}
        <dt>{t('Report.ProcessedRange.title')}</dt>
        <dd>
          {formatTime(p.startTime)} → {formatTime(p.endTime)} · {t('Report.Doc.step', { defaultValue: 'Frame step' })}{' '}
          {p.step} · {((p.step / (fps || 1)) * 1000).toFixed(2)} ms
        </dd>
        <dt>{t('Report.Doc.resize', { defaultValue: 'Resize factor' })}</dt>
        <dd>{p.committedFactor}</dd>
        {lens && (
          <>
            <dt>{t('Report.Doc.lens', { defaultValue: 'Lens correction' })}</dt>
            <dd>{lens}</dd>
          </>
        )}
      </dl>

      {snapshots.length > 0 && (
        <figure className="doc-figure doc-strip">
          {snapshots.map((s) => (
            <div key={s.index}>
              <img src={images.paths[s.index]} alt="" />
              <figcaption>{formatTime(s.time)}</figcaption>
            </div>
          ))}
        </figure>
      )}

      {p.committedStabilization && (
        <figure className="doc-figure">
          <img src={firstFramePath} width={box.width} height={box.height} />
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

      {techniquesUsed.includes('lspiv') && (
        <div>
          <h2 className="doc-h2">LSPIV</h2>
          <dl className="doc-kv">
            {form.grayscale && (
              <>
                <dt>{t('Processing.grayscale')}</dt>
                <dd>{yes}</dd>
              </>
            )}
            {form.clahe && (
              <>
                <dt>{t('Processing.clahe')}</dt>
                <dd>
                  {t('Processing.clipLimit')} {form.clipLimit}
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
                  {t('Processing.threshold')} {form.stdThreshold}
                </dd>
              </>
            )}
            {form.medianTestFiltering && (
              <>
                <dt>{t('Processing.medianTestFiltering')}</dt>
                <dd>
                  ε {form.medianTestEpsilon} · {t('Processing.threshold')} {form.medianTestThreshold}
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
        </div>
      )}

      {techniquesUsed.includes('stiv') && (
        <div>
          <h2 className="doc-h2">STIV</h2>
          <p className="doc-meta">
            {t('Report.Doc.stivModel', { defaultValue: 'CNN model, weights' })} doi:10.5281/zenodo.22050810.{' '}
            {t('Report.Doc.notRecorded', { defaultValue: 'Further parameters are not recorded in this version.' })}
          </p>
        </div>
      )}

      {techniquesUsed.includes('iwave') && (
        <div>
          <h2 className="doc-h2">iWave</h2>
          <p className="doc-meta">
            {t('Report.Doc.notRecorded', { defaultValue: 'Further parameters are not recorded in this version.' })}
          </p>
        </div>
      )}

      <footer className="doc-meta" style={{ marginTop: 'auto' }}>
        {t('Report.generatedBy')} RIVeR {version} · {new Date().toISOString().slice(0, 16).replace('T', ' ')} ·
        github.com/oruscam/RIVeR · doi:10.1016/j.cageo.2017.07.009
        {techniquesUsed.includes('iwave') && <> · iWave: dataforwater (github.com/dataforwater/iwave)</>}
      </footer>
    </>
  );
};
```

Append to `src/components/Report/report.css` (before the `@media print` block):

```css
.doc-strip {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  align-self: stretch;
}

.doc-strip img {
  width: 100%;
  height: auto;
}

.doc-strip figcaption {
  text-align: center;
}
```

`images.paths` are the extracted frames on disk, so the export's data-URI conversion picks them up like every other `<img>`. Five extra images add to the file size; Task 10 measures it.

Note the props: `FootageSheet` takes `{ model, version }` (it needs `techniquesUsed`); use that signature in Task 9.

Add to `Report.Doc` in `en/global.json`: `"pixelSize": "Pixel size (GSD)"`, `"referenceLength": "Reference length"`, `"point": "Point"`, `"rectified": "Rectified frame"`, `"pair": "Pair"`, `"entered": "Entered"`, `"solved": "Solved"`, `"residual": "Residual"`, `"meanError": "Mean reprojection error"`, `"cameraPosition": "Camera position X / Y / Z"`, `"error": "Error"`, `"ortho": "Orthorectified view"`, `"calibration": "Calibration"`, `"footageAndParameters": "Footage and parameters"`, `"stivModel": "CNN model, weights"`, `"notRecorded": "Further parameters are not recorded in this version."`.

- [ ] **Step 4: Run** — `npx jest src/helpers/reportDocument.test.ts` → PASS. Run `npx tsc --noEmit -p .` → no errors in the new files (fix hook return types as noted above).

- [ ] **Step 5: Commit**

```bash
git add src/components/Report/CalibrationSheet.tsx src/components/Report/FootageSheet.tsx src/components/Report/report.css src/helpers/reportDocument.test.ts src/translations/en/global.json src/hooks/useUavSlice.ts
git commit -m "Report calibration sheet per footage type, footage and parameter sheet with snapshot strip, colophon"
```

---

### Task 9: Assemble the document and export it

**Files:**
- Modify: `src/pages/Report.tsx`
- Rewrite: `src/components/Report/index.ts`
- Delete: `Header.tsx`, `VideoInfo.tsx`, `ProcessedRange.tsx`, `ReportSection.tsx`, `ReportSectionTable.tsx`, `Summary.tsx`, `PixelTransformation.tsx`, `ObliquePixelTransformation.tsx`, `IpcamPixelTransformation.tsx`, `ProcessingParameters.tsx`, `Footer.tsx` in `src/components/Report/`
- Modify: `src/helpers/reportDocument.test.ts` (append), `src/helpers/summaryPanel.test.ts` only if an assertion referenced deleted code

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Append failing guards**

```ts
describe('Report page export', () => {
  const page = read('src/pages/Report.tsx');
  test('the document root is a fixed light scope', () => {
    expect(page).toMatch(/className="report-doc"[^>]*data-theme="light"/s);
    expect(page).toContain('data-theme-scope');
  });
  test('the exported body does not carry the app theme', () => {
    expect(page).not.toMatch(/<body data-theme="\$\{theme\}"/);
  });
  test('images export at print quality', () => {
    expect(page).toContain('REPORT_SHEET.IMAGE_QUALITY');
    expect(page).not.toMatch(/convertImageToDataURI\(img\.src, 0\.1\)/);
  });
  test('the old blocks are gone', () => {
    ['Header', 'VideoInfo', 'ProcessedRange', 'ReportSection', 'Summary', 'PixelTransformation', 'ProcessingParameters', 'Footer'].forEach((n) =>
      expect(page).not.toMatch(new RegExp(`<${n}[\\s/>]`))
    );
  });
  test('the title of the exported file names the measurement', () => {
    expect(page).toMatch(/<title>\$\{/);
  });
});
```

Run → FAIL.

- [ ] **Step 2: Rewrite `src/components/Report/index.ts`**

```ts
import { Sheet } from './Sheet';
import { Cover } from './Cover';
import { SectionSheet } from './SectionSheet';
import { CalibrationSheet, hasCalibration } from './CalibrationSheet';
import { FootageSheet } from './FootageSheet';

export { CalibrationSheet, Cover, FootageSheet, hasCalibration, SectionSheet, Sheet };
```

Delete the eleven old files listed above (`git rm`). Run `grep -rn "components/Report'" src` and `grep -rn "from './Report'" src/components` to make sure nothing else imports them.

- [ ] **Step 3: Rewrite the render and export in `src/pages/Report.tsx`**

Replace `convertImageToDataURI` so it caps width instead of always upscaling to 1920:

```tsx
const convertImageToDataURI = (url: string, quality: number, maxWidth: number) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/webp', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
};
```

Inside the component, replace the factor block and the JSX of `#report-html-page`:

```tsx
  const { sections, summary: backendSummary } = useSectionSlice();
  const { onSaveProjectDetails, video, projectDetails, type } = useProjectSlice();
  const { cameraSolution } = useIpcamSlice();
  const version = import.meta.env.VITE_APP_VERSION ?? '';

  const model = buildReportModel({ sections, step: video.parameters.step, fps: video.data.fps });
  const summary = summaryRows(backendSummary, model);
  const applied = appliedCorrections({ ...video.parameters });
  const sheets = buildSheets(model, hasCalibration(type, cameraSolution !== null));
  const title = `${projectDetails.riverName} @ ${projectDetails.site}`;

  const { width: videoWidth, height: videoHeight } = video.data;
  const frame = frameBox(videoWidth, videoHeight, REPORT_SHEET.CONTENT_WIDTH, REPORT_SHEET.SECTION_FRAME_MAX_HEIGHT);
  const factor = frameFactor(videoWidth, videoHeight, video.parameters.factor, frame);
```

```tsx
        <div id="report-html-page">
          <div id="report-html-container" className="report-doc" data-theme="light" data-theme-scope>
            {sheets.map((sheet, i) => (
              <Sheet key={i} page={i + 1} pages={sheets.length} title={title}>
                {sheet.kind === 'cover' && <Cover model={model} summary={summary} applied={applied} footage={type} version={version} />}
                {sheet.kind === 'section' && (
                  <SectionSheet
                    result={model.sections[sheet.sectionIndex]}
                    rowStart={sheet.rowStart}
                    rowEnd={sheet.rowEnd}
                    continued={sheet.continued}
                    frame={frame}
                    factor={factor}
                  />
                )}
                {sheet.kind === 'calibration' && <CalibrationSheet />}
                {sheet.kind === 'footage' && <FootageSheet model={model} version={version} />}
              </Sheet>
            ))}
          </div>
        </div>
```

In `generateHTML`, change the image call and the HTML skeleton:

```tsx
      const imagePromises = images.map((img) =>
        convertImageToDataURI(img.src, REPORT_SHEET.IMAGE_QUALITY, REPORT_SHEET.IMAGE_MAX_WIDTH)
      );
```

```tsx
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(title)} · ${escapeHtml(projectDetails.meditionDate ?? '')}</title>
  <style>${styles}</style>
</head>
<body style="margin:0">
  ${input.outerHTML}
</body>
</html>`;
```

with, above it, the stylesheet collection moved into `const styles = Array.from(document.styleSheets).map(...).join('')` (same body as today) and a local helper:

```tsx
const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
```

Remove the stray `<link rel="stylesheet" href="/src/components/Report/report.css">` (it never resolves in the exported file). Remove now-unused imports (`useUiSlice` if `theme`/`screenSizes` are no longer used, `REPORT_IMAGES`, `useTranslation` only if unused). Add imports: `useIpcamSlice` from `../hooks`; `buildReportModel, appliedCorrections, summaryRows` from `../helpers/reportModel`; `buildSheets, frameBox, frameFactor` from `../helpers/reportLayout`; `REPORT_SHEET` from `../constants/constants`; `Sheet, Cover, SectionSheet, CalibrationSheet, FootageSheet, hasCalibration` from `../components/Report`.

Keep `id="report-html-container"`: `generateHTML` looks it up.

- [ ] **Step 4: Run all tests and the type check**

Run: `npx jest` → all PASS.
Run: `npx tsc --noEmit -p .` → no errors.
Run: `npx eslint src/pages/Report.tsx src/components/Report src/helpers/report*.ts` → no errors.

- [ ] **Step 5: Commit**

```bash
git add -A src/pages/Report.tsx src/components/Report src/helpers/reportDocument.test.ts src/helpers/summaryPanel.test.ts
git commit -m "Assemble the Section Pages report and export it as a fixed light A4 document"
```

---

### Task 10: Verify in the running app, in print, and close the design loop

**Files:** none new (fixes go to the files above).

- [ ] **Step 1: Run the app** with the `run` skill (`npm run dev` in `gui/`). Load three real projects: one UAV, one oblique, one IP camera; at least one with two or more sections, one with a STIV- or iWave-active section, one with stabilization and lens correction applied.

- [ ] **Step 2: For each project, in each app theme (dark, light, dracula):** open the Report step, check the preview, then Save report and open the HTML in Chrome. Check:
  - cover total equals the Summary panel headline;
  - with 2+ sections the cover's summary table appears and its Q row matches the section rows; with 1 section it is absent;
  - the snapshot strip shows 5 frames with times running from the range start to the range end;
  - plots are dark ink on white in all three themes;
  - every sheet is one page in Chrome's print preview (A4, margins none, background graphics on), and `page n / N` matches the preview's page count;
  - long tables continue on extra sheets without clipping;
  - the calibration sheet matches the footage type and its numbers match the calibration screens;
  - the exported file size (note it; if over ~10 MB, lower `REPORT_SHEET.IMAGE_QUALITY` or `IMAGE_MAX_WIDTH` and say so).

  Save screenshots to `.impeccable/review/` (`report-cover.png`, `report-section.png`, `report-calibration-<type>.png`, `report-print-preview.png`).

- [ ] **Step 3: Tune the fit constants** (`FIRST_SHEET_ROWS`, `CONTINUATION_ROWS`, `PLOT_HEIGHT`, frame max heights) if any sheet overflows its page, and rerun `npx jest src/helpers/reportLayout.test.ts` (update the expected row ranges in the test to the new constants).

- [ ] **Step 4: Run the Impeccable detector once:**
  `"/Users/antoine/.claude/plugins/cache/impeccable/impeccable/4.3.1/skills/impeccable/scripts/impeccable" detect --json src/components/Report src/pages/Report.tsx`
  Fix mechanical findings.

- [ ] **Step 5: Finish review and documentation:** spawn `impeccable:impeccable-finish-reviewer` with the spec, this plan, the screenshots and the detector output; act on its disposition (max two rounds). Then record the report's visual system with `impeccable:impeccable-documenter` (DESIGN.md is owed for this surface).

- [ ] **Step 6: Commit** the fixes:

```bash
git add -A src
git commit -m "Report: fit and polish after print verification"
```
