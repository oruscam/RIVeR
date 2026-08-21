import { getVelocityLimits } from './drawArrows';

describe('getVelocityLimits', () => {
  it('spans the min and max of the resolved profile', () => {
    expect(getVelocityLimits([0.5, 1.5, 2.5])).toEqual({ min: 0, max: 2.5 });
  });

  it('keeps negative velocities in range (STIV reports reverse flow)', () => {
    expect(getVelocityLimits([-1.25, 0.4, 2.08])).toEqual({ min: -1.25, max: 2.08 });
  });

  it('always spans zero', () => {
    expect(getVelocityLimits([1.5, 2.5])).toEqual({ min: 0, max: 2.5 });
    expect(getVelocityLimits([-1.5, -2.5])).toEqual({ min: -2.5, max: 0 });
  });

  it('ignores null and NaN entries', () => {
    expect(getVelocityLimits([null, 1.5, NaN, 0.5])).toEqual({ min: 0, max: 1.5 });
  });

  it('returns a zero range when there is nothing to draw', () => {
    expect(getVelocityLimits(null)).toEqual({ min: 0, max: 0 });
    expect(getVelocityLimits([])).toEqual({ min: 0, max: 0 });
    expect(getVelocityLimits([null, null])).toEqual({ min: 0, max: 0 });
  });
});
