import { curveToPolylinePoints, SpectrumExtent } from './spectrumGeometry';

const EXTENT: SpectrumExtent = { kxMin: -1, kxMax: 1, ktMin: -2, ktMax: 2 };

describe('curveToPolylinePoints', () => {
  it('maps the extent corners to the view corners', () => {
    // kx=-1 -> x=0; kx=1 -> x=width.
    // kt is inverted: kt=ktMax -> y=0 (top), kt=ktMin -> y=height (bottom),
    // because SVG y grows downward while frequency grows upward.
    const points = curveToPolylinePoints(
      [
        [-1, 2],
        [1, -2],
      ],
      EXTENT,
      200,
      100
    );

    expect(points).toBe('0,0 200,100');
  });

  it('maps the centre of the extent to the centre of the view', () => {
    const points = curveToPolylinePoints([[0, 0]], EXTENT, 200, 100);

    expect(points).toBe('100,50');
  });

  it('returns an empty string for an empty curve', () => {
    expect(curveToPolylinePoints([], EXTENT, 200, 100)).toBe('');
  });

  it('does not divide by zero on a degenerate extent', () => {
    const degenerate: SpectrumExtent = { kxMin: 0, kxMax: 0, ktMin: 0, ktMax: 0 };

    const points = curveToPolylinePoints([[0, 0]], degenerate, 200, 100);

    expect(points).not.toContain('NaN');
  });

  it('rounds to two decimals to keep the DOM attribute small', () => {
    const points = curveToPolylinePoints([[0.3333333, 0]], EXTENT, 300, 100);

    expect(points).toBe('200,50');
  });
});
