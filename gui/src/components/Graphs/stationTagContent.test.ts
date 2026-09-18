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

  it('does not flag a STIV station as low confidence when it has been manually tuned', () => {
    // station 1: v = 0.05, sigma = 0.5 — otherwise low confidence, but tuned here
    const content = buildStationTagContent({
      data: baseData({ stiv_angle_manual_profile: [null, 42, null] }),
      stationIndex: 1,
      ...opts,
    });
    const stivRow = content?.rows.find((r) => r.key === 'stiv');
    expect(stivRow?.qualityText).toBe('—');
    expect(stivRow?.qualityWarn).toBe(false);
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
