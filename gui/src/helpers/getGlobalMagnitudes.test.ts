import { getGlobalMagnitudes } from './drawArrows';

/**
 * getGlobalMagnitudes builds the shared colour-scale range for the velocity
 * arrows drawn over the image in Results. It takes the already-resolved
 * per-station velocities (one array per section) rather than reading a fixed
 * LSPIV column off the sections, so the colours track whichever technique the
 * user selected — the arrows and the scale that tints them must come from the
 * same numbers.
 */
describe('getGlobalMagnitudes', () => {
  it('spans the min and max across every section', () => {
    expect(
      getGlobalMagnitudes([
        [0.5, 1.5],
        [2.5, 0.25],
      ])
    ).toEqual({ min: 0, max: 2.5 });
  });

  it('keeps negative velocities in range (STIV can report reverse flow)', () => {
    expect(getGlobalMagnitudes([[-1.25, 0.4], [2.08]])).toEqual({ min: -1.25, max: 2.08 });
  });

  it('always spans zero even when every value is on one side of it', () => {
    expect(getGlobalMagnitudes([[1.5, 2.5]])).toEqual({ min: 0, max: 2.5 });
    expect(getGlobalMagnitudes([[-1.5, -2.5]])).toEqual({ min: -2.5, max: 0 });
  });

  it('ignores null and NaN entries', () => {
    expect(getGlobalMagnitudes([[null, 1.5, NaN, 0.5]])).toEqual({ min: 0, max: 1.5 });
  });

  it('skips sections with no resolved profile', () => {
    // null = section has no data, or never ran the selected technique.
    expect(getGlobalMagnitudes([null, [1.5], null])).toEqual({ min: 0, max: 1.5 });
  });

  it('returns a zero range when there is nothing to draw', () => {
    expect(getGlobalMagnitudes([])).toEqual({ min: 0, max: 0 });
    expect(getGlobalMagnitudes([null])).toEqual({ min: 0, max: 0 });
    expect(getGlobalMagnitudes([[null, null]])).toEqual({ min: 0, max: 0 });
  });
});
