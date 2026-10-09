import {
  curveToPath,
  describeSpectrumPoint,
  fromPixel,
  getCellExtent,
  getNearestIndex,
  getRampColor,
  getSpectrumPixels,
  getTicks,
  parseColor,
  RgbColor,
  SpectrumAxis,
  toPixel,
} from './spectrumGeometry';

const K_AXIS: SpectrumAxis = { min: -1, max: 1, start: 0, end: 200 };
// Frequency grows upward, so its pixels run from the bottom (100) to the top (0).
const OMEGA_AXIS: SpectrumAxis = { min: 0, max: 4, start: 100, end: 0 };

describe('getCellExtent', () => {
  it('extends half a cell beyond the first and last centre', () => {
    expect(getCellExtent([-1, 0, 1])).toEqual({ min: -1.5, max: 1.5 });
  });

  it('handles a descending axis', () => {
    expect(getCellExtent([4, 2, 0])).toEqual({ min: -1, max: 5 });
  });

  it('gives a single cell a unit width and an empty axis a fallback', () => {
    expect(getCellExtent([3])).toEqual({ min: 2.5, max: 3.5 });
    expect(getCellExtent([])).toEqual({ min: 0, max: 1 });
  });
});

describe('toPixel / fromPixel', () => {
  it('maps the ends of the axis to the ends of the pixel range', () => {
    expect(toPixel(-1, K_AXIS)).toBe(0);
    expect(toPixel(1, K_AXIS)).toBe(200);
  });

  it('puts the highest frequency at the top', () => {
    expect(toPixel(4, OMEGA_AXIS)).toBe(0);
    expect(toPixel(0, OMEGA_AXIS)).toBe(100);
  });

  it('round-trips', () => {
    expect(fromPixel(toPixel(0.37, K_AXIS), K_AXIS)).toBeCloseTo(0.37);
    expect(fromPixel(toPixel(2.9, OMEGA_AXIS), OMEGA_AXIS)).toBeCloseTo(2.9);
  });

  it('does not divide by zero on a degenerate axis', () => {
    expect(Number.isFinite(toPixel(1, { min: 1, max: 1, start: 0, end: 10 }))).toBe(true);
    expect(Number.isFinite(fromPixel(1, { min: 0, max: 1, start: 5, end: 5 }))).toBe(true);
  });
});

describe('curveToPath', () => {
  it('draws a curve from the bottom-left to the top-right of the plot', () => {
    expect(
      curveToPath(
        [
          [-1, 0],
          [1, 4],
        ],
        K_AXIS,
        OMEGA_AXIS
      )
    ).toBe('M0,100 L200,0');
  });

  it('returns an empty string for an empty curve', () => {
    expect(curveToPath([], K_AXIS, OMEGA_AXIS)).toBe('');
  });
});

describe('getTicks', () => {
  it('picks round values inside the range', () => {
    expect(getTicks(-36.2, 36.2, 4)).toEqual([-20, 0, 20]);
    expect(getTicks(0, 77.3, 5)).toEqual([0, 20, 40, 60]);
  });

  it('keeps decimals exact', () => {
    expect(getTicks(0, 0.5, 5)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5]);
  });

  it('returns nothing for an empty range', () => {
    expect(getTicks(3, 3)).toEqual([]);
  });
});

describe('getNearestIndex', () => {
  it('finds the cell a value falls in', () => {
    expect(getNearestIndex([-2, 0, 2], 0.9)).toBe(1);
    expect(getNearestIndex([-2, 0, 2], 1.1)).toBe(2);
  });

  it('accepts the outer half of the edge cells and rejects anything beyond', () => {
    expect(getNearestIndex([-2, 0, 2], -2.9)).toBe(0);
    expect(getNearestIndex([-2, 0, 2], -3.1)).toBe(-1);
    expect(getNearestIndex([], 0)).toBe(-1);
  });
});

describe('describeSpectrumPoint', () => {
  it('gives the wavelength and the signed phase speed', () => {
    const point = describeSpectrumPoint(-2 * Math.PI, 3 * Math.PI);

    expect(point.wavelength).toBeCloseTo(1);
    expect(point.phaseSpeed).toBeCloseTo(-1.5);
  });

  it('has no wavelength or speed at k = 0', () => {
    expect(describeSpectrumPoint(0, 5)).toEqual({ wavelength: null, phaseSpeed: null });
  });
});

describe('parseColor', () => {
  it('reads the forms the theme tokens are written in', () => {
    expect(parseColor('#0E2F6B')).toEqual([14, 47, 107]);
    expect(parseColor(' #fff ')).toEqual([255, 255, 255]);
    expect(parseColor('rgb(10, 20, 30)')).toEqual([10, 20, 30]);
    expect(parseColor('rgba(10 20 30 / 0.5)')).toEqual([10, 20, 30]);
  });

  it('returns null for anything else', () => {
    expect(parseColor('')).toBeNull();
    expect(parseColor('var(--x)')).toBeNull();
  });
});

const STOPS: RgbColor[] = [
  [0, 0, 0],
  [100, 100, 100],
  [200, 0, 0],
];

describe('getRampColor', () => {
  it('returns the stops at their positions', () => {
    expect(getRampColor(0, STOPS)).toEqual([0, 0, 0]);
    expect(getRampColor(0.5, STOPS)).toEqual([100, 100, 100]);
    expect(getRampColor(1, STOPS)).toEqual([200, 0, 0]);
  });

  it('interpolates between neighbouring stops', () => {
    expect(getRampColor(0.75, STOPS)).toEqual([150, 50, 50]);
  });

  it('clamps out-of-range and non-finite positions', () => {
    expect(getRampColor(7, STOPS)).toEqual([200, 0, 0]);
    expect(getRampColor(-1, STOPS)).toEqual([0, 0, 0]);
    expect(getRampColor(NaN, STOPS)).toEqual([0, 0, 0]);
  });
});

describe('getSpectrumPixels', () => {
  it('puts the highest frequency row first and clips at the maximum', () => {
    // rows arrive lowest frequency first
    const pixels = getSpectrumPixels(
      [
        [0, 0],
        [1, 50],
      ],
      2,
      STOPS
    );

    // image row 0 = the input's last row: 1/2 -> middle stop, 50/2 -> clipped
    expect(Array.from(pixels.slice(0, 8))).toEqual([100, 100, 100, 255, 200, 0, 0, 255]);
    // image row 1 = the input's first row, all zero
    expect(Array.from(pixels.slice(8, 16))).toEqual([0, 0, 0, 255, 0, 0, 0, 255]);
  });

  it('paints the ground colour when there is no maximum', () => {
    expect(Array.from(getSpectrumPixels([[5]], 0, STOPS))).toEqual([0, 0, 0, 255]);
  });

  it('returns no pixels for an empty plane', () => {
    expect(getSpectrumPixels([], 1, STOPS)).toHaveLength(0);
  });
});
