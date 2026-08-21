import {
  flowDirection,
  chevronCount,
  formatSignedVelocity,
  PITCH_FRACTION,
  MAX_CHEVRON_COUNT,
} from './chevronGlyph';

// A straight section running east, so its real-world perpendicular is +north.
const east = [0, 1, 2, 3, 4];
const north = [0, 0, 0, 0, 0];

describe('flowDirection', () => {
  it('uses the stored streamwise vector when present, normalised', () => {
    const d = flowDirection(2, 1.0, east, north, [0, 0, 3, 0, 0], [0, 0, 4, 0, 0]);
    expect(d.x).toBeCloseTo(0.6, 6);
    expect(d.y).toBeCloseTo(0.8, 6);
  });

  it('flips 180 degrees for a negative velocity (reverse flow)', () => {
    const d = flowDirection(2, -1.0, east, north, [0, 0, 3, 0, 0], [0, 0, 4, 0, 0]);
    expect(d.x).toBeCloseTo(-0.6, 6);
    expect(d.y).toBeCloseTo(-0.8, 6);
  });

  it('falls back to the section perpendicular when no streamwise vector is given', () => {
    const d = flowDirection(2, 1.0, east, north);
    expect(Math.abs(d.x)).toBeCloseTo(0, 6);
    expect(Math.abs(d.y)).toBeCloseTo(1, 6);
  });

  it('falls back when the streamwise vector is present but zero-length', () => {
    const d = flowDirection(2, 1.0, east, north, [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]);
    expect(Math.abs(d.y)).toBeCloseTo(1, 6);
  });

  it('returns a unit vector', () => {
    const d = flowDirection(1, 2.5, east, north, [0, 7, 0, 0, 0], [0, 7, 0, 0, 0]);
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1, 6);
  });
});

describe('chevronCount', () => {
  // Width W and pitch W*PITCH_FRACTION; the longest arrow is 2*spacing where W is
  // 0.5*spacing, i.e. L/W = 4 ⇒ 4/0.8 = 5 chevrons.
  it('gives 5 at the longest arrow, matching the chosen look', () => {
    expect(chevronCount(4, 1)).toBe(5);
  });

  it('scales down with arrow length so the pitch stays constant', () => {
    expect(chevronCount(2, 1)).toBe(Math.round(2 / PITCH_FRACTION));
    expect(chevronCount(0.8, 1)).toBe(1);
  });

  it('never returns less than 1', () => {
    expect(chevronCount(0.01, 1)).toBe(1);
    expect(chevronCount(0, 1)).toBe(1);
  });

  it('clamps at the maximum', () => {
    expect(chevronCount(1000, 1)).toBe(MAX_CHEVRON_COUNT);
  });

  it('is safe when width is zero', () => {
    expect(chevronCount(3, 0)).toBe(1);
  });
});

describe('formatSignedVelocity', () => {
  it('shows an explicit plus for forward flow', () => {
    expect(formatSignedVelocity(1.9193, false)).toBe('+1.92 m/s');
  });

  it('uses a true minus sign (U+2212) for reverse flow', () => {
    expect(formatSignedVelocity(-1.2496, false)).toBe('−1.25 m/s');
  });

  it('shows zero with a plus', () => {
    expect(formatSignedVelocity(0, false)).toBe('+0.00 m/s');
  });

  it('converts to imperial', () => {
    expect(formatSignedVelocity(1, true)).toBe('+3.28 ft/s');
  });
});
