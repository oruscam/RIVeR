import { formatStationRanges } from './stationRanges';

describe('formatStationRanges', () => {
  it('collapses runs into ranges', () => {
    expect(formatStationRanges([6, 7, 8, 9, 12])).toBe('6–9, 12');
    expect(formatStationRanges([3])).toBe('3');
    expect(formatStationRanges([4, 5])).toBe('4–5');
    expect(formatStationRanges([9, 1, 2])).toBe('1–2, 9');
    expect(formatStationRanges([])).toBe('');
  });
});
