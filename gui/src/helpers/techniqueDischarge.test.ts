import { getEffectiveTechniqueData } from './techniqueDischarge';
import type { SectionData } from '../store/section/types';

const STEP = 1;
const FPS = 30;

/** Three stations, flat 1 m depth, 10 m apart. Angles chosen so tan is exact-ish. */
const baseData = (over?: (number | null)[]): SectionData =>
  ({
    distance: [0, 10, 20],
    depth: [1, 1, 1],
    check: [true, true, true],
    activeCheck: [true, true, true],
    stiv_angle_profile: [45, 45, 45],
    stiv_velocity_profile: [0.6, 0.6, 0.6],
    stiv_sigma_profile: [0.05, 2.94, 0.05],
    stiv_angle_manual_profile: over,
  }) as unknown as SectionData;

const opts = { interpolated: false, artificialSeeding: false, alpha: 1, step: STEP, fps: FPS };

describe('getEffectiveTechniqueData with a manual STIV angle', () => {
  it('matches the automatic profile when nothing is tuned', () => {
    // toBeCloseTo, not toEqual: the resolved profile is always rebuilt from
    // stiv_angle_profile via tan(), and Math.tan(45deg) is 0.9999999999999999
    // in IEEE-754, not exactly 1 — see the same tolerance on the identical
    // computation in the next test.
    const r = getEffectiveTechniqueData(baseData(), 'stiv', opts)!;
    r.resolved.forEach((v) => expect(v).toBeCloseTo(0.6, 5));
  });

  it('gives the override priority in the resolved profile', () => {
    const r = getEffectiveTechniqueData(baseData([null, 60, null]), 'stiv', opts)!;
    expect(r.resolved[0]).toBeCloseTo(0.6, 5);
    expect(r.resolved[1]).toBeCloseTo(Math.tan(Math.PI / 3) * 0.6, 5);
  });

  it('changes total discharge when a station is tuned', () => {
    const auto = getEffectiveTechniqueData(baseData(), 'stiv', opts)!;
    const tuned = getEffectiveTechniqueData(baseData([null, 60, null]), 'stiv', opts)!;
    expect(tuned.total_Q).toBeGreaterThan(auto.total_Q);
  });

  it('restores the automatic discharge exactly when the override is cleared', () => {
    const auto = getEffectiveTechniqueData(baseData(), 'stiv', opts)!;
    const cleared = getEffectiveTechniqueData(baseData([null, null, null]), 'stiv', opts)!;
    expect(cleared.total_Q).toBeCloseTo(auto.total_Q, 10);
  });

  it('drops sigma for the tuned station only', () => {
    const r = getEffectiveTechniqueData(baseData([null, 60, null]), 'stiv', opts)!;
    expect(r.sigma).toEqual([0.05, null, 0.05]);
  });

  it('exposes which stations are tuned', () => {
    const r = getEffectiveTechniqueData(baseData([null, 60, null]), 'stiv', opts)!;
    expect(r.tunedFlags).toEqual([false, true, false]);
  });

  it('leaves LSPIV untouched by a STIV override', () => {
    const data = {
      ...baseData([null, 60, null]),
      streamwise_velocity_magnitude: [1, 1, 1],
    } as unknown as SectionData;
    const r = getEffectiveTechniqueData(data, 'lspiv', opts)!;
    expect(r.resolved).toEqual([1, 1, 1]);
    expect(r.tunedFlags).toEqual([false, false, false]);
  });
});

const iwaveData = (valid?: (boolean | null)[], include?: boolean): SectionData =>
  ({
    distance: [0, 10, 20],
    depth: [1, 1, 1],
    check: [true, true, true],
    activeCheck: [true, true, true],
    streamwise_velocity_magnitude: [1, 1, 1],
    iwave_velocity_profile: [1, 2, 1],
    iwave_valid_profile: valid,
    includeIwaveLowQuality: include,
  }) as unknown as SectionData;

describe('getEffectiveTechniqueData with the iWave quality flag', () => {
  it('excludes low-quality iWave stations from discharge', () => {
    const r = getEffectiveTechniqueData(iwaveData([true, false, true]), 'iwave', opts)!;
    expect(r.resolved).toEqual([1, null, 1]);
    expect(r.lowQualityFlags).toEqual([false, true, false]);
    expect(r.hasGaps).toBe(true);
    const all = getEffectiveTechniqueData(iwaveData([true, true, true]), 'iwave', opts)!;
    expect(r.total_Q).toBeLessThan(all.total_Q);
  });

  it('keeps the raw value in profile for display', () => {
    const r = getEffectiveTechniqueData(iwaveData([true, false, true]), 'iwave', opts)!;
    expect(r.profile[1]).toBe(2);
  });

  it('fills an excluded station like any gap when interpolation is on', () => {
    const r = getEffectiveTechniqueData(iwaveData([true, false, true]), 'iwave', { ...opts, interpolated: true })!;
    expect(r.resolved[1]).not.toBeNull();
    expect(r.resolved[1]).not.toBe(2); // filled from neighbours, not the rejected value
    expect(r.interpFlags[1]).toBe(true);
  });

  it('counts low-quality stations again when the user includes them', () => {
    const r = getEffectiveTechniqueData(iwaveData([true, false, true], true), 'iwave', opts)!;
    expect(r.resolved).toEqual([1, 2, 1]);
    expect(r.lowQualityFlags).toEqual([false, false, false]);
  });

  it('ignores null flags and projects without the flag array', () => {
    expect(getEffectiveTechniqueData(iwaveData([null, null, null]), 'iwave', opts)!.resolved).toEqual([1, 2, 1]);
    expect(getEffectiveTechniqueData(iwaveData(undefined), 'iwave', opts)!.resolved).toEqual([1, 2, 1]);
  });

  it('never affects LSPIV', () => {
    const r = getEffectiveTechniqueData(iwaveData([false, false, false]), 'lspiv', opts)!;
    expect(r.resolved).toEqual([1, 1, 1]);
    expect(r.lowQualityFlags).toEqual([false, false, false]);
  });
});
