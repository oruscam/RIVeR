import { summarizeReport } from './reportSummary';
import { UNIT_CONVERSIONS } from '../constants/constants';

// 4 stations, 1 m apart, 1 m deep: Q = velocity * 4 (alpha 1). total_Q is deliberately wrong.
const data = (extra: Record<string, unknown> = {}) =>
  ({
    num_stations: 4,
    alpha: 1,
    id: [1, 2, 3, 4],
    distance: [0, 1, 2, 3],
    depth: [1, 1, 1, 1],
    check: [true, true, true, true],
    activeCheck: [true, true, true, true],
    streamwise_velocity_magnitude: [1, 1, 1, 1],
    total_Q: 999,
    ...extra,
  }) as never;

const sec = (d: unknown, over: Record<string, unknown> = {}) =>
  ({ name: 'CS', data: d, activeTechnique: 'lspiv', interpolated: false, artificialSeeding: false, alpha: 1, ...over }) as never;

const run = (sections: never[], unit = 'si') => summarizeReport({ sections, step: 1, fps: 30 }, unit);

describe('summarizeReport', () => {
  test('averages the active-technique totals, never data.total_Q', () => {
    const r = run([sec(data()), sec(data(), { alpha: 2 })]);
    expect(r.totalQ).toBeCloseTo(6);
    expect(r.sectionCount).toBe(2);
  });
  test('converts to imperial; unprocessed sections count but add nothing', () => {
    const r = run([sec(data()), sec(undefined)], 'imperial');
    expect(r.totalQ).toBeCloseTo(4 * UNIT_CONVERSIONS.M3_TO_FT3);
    expect(r.sectionCount).toBe(2);
  });
  test('counts distinct computed techniques, at least 1', () => {
    expect(run([sec(data())]).techniqueCount).toBe(1);
    const all = data({ stiv_velocity_profile: [1, 1, 1, 1], iwave_velocity_profile: [1, 1, 1, 1] });
    expect(run([sec(all, { activeTechnique: 'stiv' })]).techniqueCount).toBe(3);
    expect(run([sec(undefined)]).techniqueCount).toBe(1);
  });
  test('no section with data gives 0, never NaN', () => {
    expect(run([sec(undefined)]).totalQ).toBe(0);
  });
});
