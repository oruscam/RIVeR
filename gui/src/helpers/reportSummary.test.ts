import { summarizeReport } from './reportSummary';

const sec = (data: Record<string, unknown> | undefined) => ({ data }) as never;

describe('summarizeReport', () => {
  test('averages total_Q across sections, as the report header does', () => {
    const r = summarizeReport([sec({ total_Q: 10 }), sec({ total_Q: 20 })], 'si');
    expect(r.totalQ).toBe(15);
    expect(r.sectionCount).toBe(2);
  });
  test('ignores sections without a number and converts to imperial', () => {
    const r = summarizeReport([sec({ total_Q: 1 }), sec(undefined), sec({ total_Q: NaN })], 'imperial');
    expect(r.totalQ).toBeCloseTo(35.3147, 3);
    expect(r.sectionCount).toBe(3);
  });
  test('counts the techniques that have results in any section; LSPIV always', () => {
    expect(summarizeReport([sec({ total_Q: 1 })], 'si').techniqueCount).toBe(1);
    expect(
      summarizeReport(
        [sec({ total_Q: 1, stiv_velocity_profile: [1] }), sec({ iwave_velocity_profile: [1] })],
        'si'
      ).techniqueCount
    ).toBe(3);
  });
  test('no valid discharge gives 0, never NaN', () => {
    expect(summarizeReport([sec(undefined)], 'si').totalQ).toBe(0);
  });
});
