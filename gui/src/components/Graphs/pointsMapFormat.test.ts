import { coordTick, scaleBarLabel } from './pointsMapFormat';

describe('map formatting', () => {
  test('a coordinate tick is a plain integer', () => {
    expect(coordTick(6524050)).toBe('6524050');
    expect(coordTick(4388450.4)).toBe('4388450');
    expect(coordTick(-120.6)).toBe('-121');
  });
  test('the scale bar label drops false decimals', () => {
    expect(scaleBarLabel(30, 'm')).toBe('30 m');
    expect(scaleBarLabel(98.4252, 'ft')).toBe('98.43 ft');
    expect(scaleBarLabel(0.5, 'm')).toBe('0.5 m');
  });
});
