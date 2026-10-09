// src/helpers/reportModel.test.ts
import {
  buildReportModel,
  appliedCorrections,
  imageSequenceText,
  lensLabel,
  parseIwaveRecord,
  summaryRows,
} from './reportModel';
import en from '../translations/en/global.json';
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
      data: data({
        stiv_velocity_profile: [0.5, 0.5, 0.5, 0.5],
        iwave_velocity_profile: [0.25, 0.25, 0.25, 0.25],
      }),
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
    const s = section({
      artificialSeeding: true,
      activeTechnique: 'stiv',
      data: data({ stiv_velocity_profile: [1, 1, 1, 1] }),
    });
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
    const s2 = section({
      name: 'CS2',
      activeTechnique: 'iwave',
      data: data({ iwave_velocity_profile: [1, 1, 1, 1] }),
    });
    expect(buildReportModel(input([s2, section()])).techniquesUsed).toEqual(['lspiv', 'iwave']);
  });
});

describe('maskedStations', () => {
  test('lists masked stations per technique and section, 1-based; dry does not count', () => {
    const s = section({
      data: data({
        stiv_skip_profile: [null, 'masked', 'masked', null],
        iwave_skip_profile: ['dry', null, 'masked', null],
      }),
    });
    const model = buildReportModel(input([s, section({ name: 'CS2' })]));
    expect(model.maskedStations.stiv).toEqual([{ section: s.name, stations: [2, 3] }]);
    expect(model.maskedStations.iwave).toEqual([{ section: s.name, stations: [3] }]);
  });

  test('a section the report drops (active technique has no results) is not listed', () => {
    const dropped = section({
      name: 'CS3',
      activeTechnique: 'stiv' as const,
      data: data({ stiv_skip_profile: [null, 'masked', null, null] }),
    });
    const model = buildReportModel(input([dropped]));
    expect(model.skipped).toEqual(['CS3']);
    expect(model.maskedStations).toEqual({});
  });

  test('no skip profiles: nothing listed', () => {
    expect(buildReportModel(input([section()])).maskedStations).toEqual({});
  });
});

describe('appliedCorrections', () => {
  const base = {
    committedLensCorrection: null,
    committedStabilization: false,
    committedStabilizationRegions: [],
    step: 2,
    committedFactor: 0.5,
  };
  test('reads the committed values only', () => {
    expect(appliedCorrections(base)).toEqual({
      lensCorrection: null,
      stabilizationRegions: null,
      step: 2,
      resizeFactor: 0.5,
    });
  });
  test('stabilization reports its region count; lens reports a readable name', () => {
    const a = appliedCorrections({
      ...base,
      committedStabilization: true,
      committedStabilizationRegions: [{}, {}, {}],
      committedLensCorrection: '/x/lenses/DJI_Mavic_3.npz',
    });
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
    total_W: v,
    total_A: v,
    total_Q: v,
    mean_V: v,
    alpha: v,
    mean_Vs: v,
    max_depth: v,
    average_depth: v,
    measured_Q: v,
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
    expect(rows.map((r) => r.key)).toEqual([
      'W',
      'A',
      'Q',
      'meanV',
      'alpha',
      'meanVs',
      'maxD',
      'meanD',
      'measured',
    ]);
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

describe('imageSequenceText', () => {
  // The English sentence, filled in the way i18next fills it.
  const t = (key: string, values: Record<string, unknown>) =>
    (key === 'Report.Doc.imageSequence' ? en.Report.Doc.imageSequence : key).replace(/{{(\w+)}}/g, (_, name) =>
      String(values[name])
    );

  it('states the frame count and the interval', () => {
    expect(imageSequenceText(240, 40, t)).toBe(
      'Image sequence · 240 frames · interval entered by the operator: 40 ms'
    );
  });

  it('prints the interval as the operator entered it, not rounded', () => {
    expect(imageSequenceText(120, 16.6667, t)).toBe(
      'Image sequence · 120 frames · interval entered by the operator: 16.6667 ms'
    );
    expect(imageSequenceText(120, 33.33, t)).toContain(': 33.33 ms');
  });

  it('stands on zeros when the facts are missing', () => {
    expect(imageSequenceText(undefined, undefined, t)).toContain(
      '0 frames · interval entered by the operator: 0 ms'
    );
  });
});

describe('techniques computed but not reported', () => {
  const iwave_params = {
    mode: { smax: 'auto', window: 'auto', flow_type: 'auto', depth: 'free' },
    u_sources: ['lspiv', 'stiv'],
    smax: 3.4,
    window_m: 2.03,
    window_px: 64,
    time_size: 240,
    fps_eff: 24,
    gravity_waves: true,
  };
  const s = section({
    data: data({
      stiv_velocity_profile: [0.5, 0.5, 0.5, 0.5],
      stiv_angle_manual_profile: [null, 12, 13, null],
      iwave_velocity_profile: [0.25, 0.25, 0.25, 0.25],
      iwave_params,
    }),
  });

  test('techniquesComputed lists every technique run, techniquesUsed only the reported one', () => {
    const m = buildReportModel(input([s]));
    expect(m.techniquesUsed).toEqual(['lspiv']);
    expect(m.techniquesComputed).toEqual(['lspiv', 'stiv', 'iwave']);
  });

  test('iWave parameters come from the pipeline record of a section that was not reported with iWave', () => {
    const m = buildReportModel(input([s]));
    expect(m.iwaveParams).toEqual([
      {
        section: 'CS1',
        params: {
          manual: false,
          sources: ['lspiv', 'stiv'],
          smax: 3.4,
          windowM: 2.03,
          windowPx: 64,
          gravityWaves: true,
          timeS: 10,
        },
      },
    ]);
  });

  test('a manual run is flagged, and a malformed record is dropped', () => {
    expect(parseIwaveRecord({ ...iwave_params, mode: { smax: 'user', window: 'user' } })?.manual).toBe(true);
    expect(parseIwaveRecord({ smax: 3 })).toBeNull();
    expect(parseIwaveRecord(undefined)).toBeNull();
  });

  test('stations with an operator-set STIV angle are listed per section', () => {
    expect(buildReportModel(input([s])).stivManualAngles).toEqual([{ section: 'CS1', stations: [2, 3] }]);
  });
});
