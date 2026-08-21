import { getStiColorScale, STI_FALLBACK_COLOR } from './stiColorScale';

const AUTO = { min: null, max: null, default: true };
const MANUAL = { min: 0, max: 10, default: false };

describe('getStiColorScale', () => {
  it('uses the profile own min/max when limits are automatic', () => {
    const { min, max } = getStiColorScale([1, 2, 3], AUTO);
    expect(min).toBe(1);
    expect(max).toBe(3);
  });

  it('uses the manual limits when they are locked, ignoring the profile range', () => {
    const { min, max } = getStiColorScale([1, 2, 3], MANUAL);
    expect(min).toBe(0);
    expect(max).toBe(10);
  });

  it('returns one colour per station, index-aligned with the profile', () => {
    const { colors } = getStiColorScale([1, 2, 3], AUTO);
    expect(colors).toHaveLength(3);
    colors.forEach((c) => expect(c).toMatch(/^rgb/));
  });

  it('maps the extremes of the scale to different colours', () => {
    const { colors } = getStiColorScale([1, 3], AUTO);
    expect(colors[0]).not.toBe(colors[1]);
  });

  it('clamps values outside manual limits to the end colours', () => {
    // -5 is below the manual min and 99 above its max; both must still resolve to a
    // real colour rather than indexing off either end of the colour map.
    const { colors } = getStiColorScale([-5, 5, 99], MANUAL);
    const inRange = getStiColorScale([0, 5, 10], MANUAL);
    expect(colors[0]).toBe(inRange.colors[0]);
    expect(colors[2]).toBe(inRange.colors[2]);
  });

  it('maps a null station to transparent', () => {
    const { colors } = getStiColorScale([1, null, 3], AUTO);
    expect(colors[1]).toBe('transparent');
    expect(colors).toHaveLength(3);
  });

  it('handles a uniform profile without producing an undefined colour', () => {
    // Normalize divides by (vmax - vmin); an all-equal profile would make that a
    // division by zero and index the colour map with NaN.
    const { min, max, colors } = getStiColorScale([2, 2, 2], AUTO);
    expect(min).toBe(2);
    expect(max).toBe(2);
    colors.forEach((c) => expect(c).toMatch(/^rgb/));
  });

  it('returns an empty scale for an undefined, empty, or all-null profile', () => {
    expect(getStiColorScale(undefined, AUTO)).toEqual({ min: null, max: null, colors: [] });
    expect(getStiColorScale([], AUTO)).toEqual({ min: null, max: null, colors: [] });
    expect(getStiColorScale([null, null], AUTO)).toEqual({ min: null, max: null, colors: [] });
  });

  it('falls back to automatic bounds when limits are unlocked but carry stale values', () => {
    const { min, max } = getStiColorScale([1, 2, 3], { min: 0, max: 10, default: true });
    expect(min).toBe(1);
    expect(max).toBe(3);
  });

  it('exposes a non-transparent fallback colour for stations without a value', () => {
    expect(STI_FALLBACK_COLOR).toBe('var(--accent-color)');
  });
});
