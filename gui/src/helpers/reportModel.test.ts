// src/helpers/reportModel.test.ts
import { buildReportModel, appliedCorrections, lensLabel, summaryRows } from './reportModel';
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
