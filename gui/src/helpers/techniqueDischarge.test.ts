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
