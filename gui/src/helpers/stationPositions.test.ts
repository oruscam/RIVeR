import {
  computeStationPixelPositions,
  computeStationSearchLines,
  computeSearchLinesFromCenters,
} from './stationPositions';
import { transformRealWorldToPixel } from '../../commons/coordinates';

// Identity homography: pixel coords equal real-world coords.
const IDENTITY = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

describe('computeStationPixelPositions', () => {
  it('spreads stations evenly from the first to the last endpoint', () => {
    const result = computeStationPixelPositions({ x: 0, y: 0 }, { x: 10, y: 0 }, 5, IDENTITY);

    expect(result).toHaveLength(5);
    expect(result[0].x).toBeCloseTo(0, 6);
    expect(result[4].x).toBeCloseTo(10, 6);
    // Evenly spaced: 0, 2.5, 5, 7.5, 10
    expect(result[1].x).toBeCloseTo(2.5, 6);
    expect(result[2].x).toBeCloseTo(5, 6);
    expect(result[3].x).toBeCloseTo(7.5, 6);
  });

  it('includes both endpoints exactly', () => {
    const result = computeStationPixelPositions({ x: 3, y: 7 }, { x: 13, y: 27 }, 3, IDENTITY);

    expect(result[0]).toEqual({ x: expect.closeTo(3, 6), y: expect.closeTo(7, 6) });
    expect(result[2]).toEqual({ x: expect.closeTo(13, 6), y: expect.closeTo(27, 6) });
    expect(result[1]).toEqual({ x: expect.closeTo(8, 6), y: expect.closeTo(17, 6) });
  });

  it('interpolates in real-world space, not pixel space, under a perspective matrix', () => {
    // A homography with a non-zero bottom row: pixel spacing is NOT linear in
    // real-world distance. Equal real-world steps must produce UNEQUAL pixel steps.
    const PERSPECTIVE = [
      [1, 0, 0],
      [0, 1, 0],
      [0.05, 0, 1],
    ];

    const result = computeStationPixelPositions({ x: 0, y: 0 }, { x: 10, y: 0 }, 3, PERSPECTIVE);

    const gapA = result[1].x - result[0].x;
    const gapB = result[2].x - result[1].x;

    // If the implementation wrongly lerped in pixel space, these would be equal.
    expect(Math.abs(gapA - gapB)).toBeGreaterThan(1e-6);
  });

  it('returns an empty array when fewer than 2 stations are requested', () => {
    expect(computeStationPixelPositions({ x: 0, y: 0 }, { x: 10, y: 0 }, 1, IDENTITY)).toEqual([]);
    expect(computeStationPixelPositions({ x: 0, y: 0 }, { x: 10, y: 0 }, 0, IDENTITY)).toEqual([]);
  });
});

describe('computeStationSearchLines', () => {
  it('centres each line on its station, with the requested real-world length', () => {
    // Cross-section along +x, so its normal is along y. Length 6 → ±3 about each station.
    const lines = computeStationSearchLines({ x: 0, y: 0 }, { x: 10, y: 0 }, 3, 6, IDENTITY);

    expect(lines).toHaveLength(3);
    // Middle station sits at x=5; its line spans y=-3..+3 through that point.
    const mid = lines[1];
    expect((mid.a.x + mid.b.x) / 2).toBeCloseTo(5, 6);
    expect((mid.a.y + mid.b.y) / 2).toBeCloseTo(0, 6);
    expect(Math.hypot(mid.b.x - mid.a.x, mid.b.y - mid.a.y)).toBeCloseTo(6, 6);
  });

  it('orients lines perpendicular to the cross-section', () => {
    const lines = computeStationSearchLines({ x: 0, y: 0 }, { x: 10, y: 0 }, 2, 6, IDENTITY);

    // Cross-section runs along x, so each line must run along y (no x extent).
    for (const line of lines) {
      expect(line.b.x - line.a.x).toBeCloseTo(0, 6);
      expect(Math.abs(line.b.y - line.a.y)).toBeCloseTo(6, 6);
    }
  });

  it('numbers stations from 1', () => {
    const lines = computeStationSearchLines({ x: 0, y: 0 }, { x: 10, y: 0 }, 4, 6, IDENTITY);
    expect(lines.map((l) => l.station)).toEqual([1, 2, 3, 4]);
  });

  it('projects each endpoint individually under a perspective matrix', () => {
    // With a non-zero bottom row, pixel spacing is not linear in real-world distance,
    // so the two endpoints must NOT come out symmetric about the projected station.
    // A buggy implementation that projected the station and then offset in pixel space
    // would produce a perfectly symmetric pair here.
    const PERSPECTIVE = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0.05, 1],
    ];

    const lines = computeStationSearchLines({ x: 0, y: 0 }, { x: 10, y: 0 }, 3, 6, PERSPECTIVE);
    const [stationPx] = computeStationPixelPositions({ x: 0, y: 0 }, { x: 10, y: 0 }, 3, PERSPECTIVE);

    const line = lines[0];
    const distA = Math.hypot(line.a.x - stationPx.x, line.a.y - stationPx.y);
    const distB = Math.hypot(line.b.x - stationPx.x, line.b.y - stationPx.y);

    expect(Math.abs(distA - distB)).toBeGreaterThan(1e-6);
  });

  it('returns an empty array for fewer than 2 stations or a non-positive length', () => {
    expect(computeStationSearchLines({ x: 0, y: 0 }, { x: 10, y: 0 }, 1, 6, IDENTITY)).toEqual([]);
    expect(computeStationSearchLines({ x: 0, y: 0 }, { x: 10, y: 0 }, 3, 0, IDENTITY)).toEqual([]);
  });
});

describe('computeSearchLinesFromCenters', () => {
  it('centres each line on its given centre, not an interpolated position', () => {
    // Cross-section from x=0 to x=10, but the given centres (1, 7, 9) are NOT evenly
    // spaced — unlike computeStationSearchLines's interpolated preview, these must be
    // honored as-is.
    const centers = [{ x: 1, y: 0 }, { x: 7, y: 0 }, { x: 9, y: 0 }];
    const lines = computeSearchLinesFromCenters(centers, { x: 0, y: 0 }, { x: 10, y: 0 }, 6, IDENTITY);

    expect(lines).toHaveLength(3);
    centers.forEach((center, i) => {
      const line = lines[i];
      expect((line.a.x + line.b.x) / 2).toBeCloseTo(center.x, 6);
      expect((line.a.y + line.b.y) / 2).toBeCloseTo(center.y, 6);
      expect(Math.hypot(line.b.x - line.a.x, line.b.y - line.a.y)).toBeCloseTo(6, 6);
    });
  });

  it('orients lines perpendicular to the cross-section tangent', () => {
    const centers = [{ x: 2, y: 0 }, { x: 8, y: 0 }];
    const lines = computeSearchLinesFromCenters(centers, { x: 0, y: 0 }, { x: 10, y: 0 }, 6, IDENTITY);

    // Cross-section runs along x, so each line must run along y (no x extent).
    for (const line of lines) {
      expect(line.b.x - line.a.x).toBeCloseTo(0, 6);
      expect(Math.abs(line.b.y - line.a.y)).toBeCloseTo(6, 6);
    }
  });

  it('numbers stations from 1', () => {
    const centers = [{ x: 1, y: 0 }, { x: 4, y: 0 }, { x: 6, y: 0 }, { x: 9, y: 0 }];
    const lines = computeSearchLinesFromCenters(centers, { x: 0, y: 0 }, { x: 10, y: 0 }, 6, IDENTITY);
    expect(lines.map((l) => l.station)).toEqual([1, 2, 3, 4]);
  });

  it('returns an empty array for fewer than 2 centres or a non-positive length', () => {
    expect(
      computeSearchLinesFromCenters([{ x: 1, y: 0 }], { x: 0, y: 0 }, { x: 10, y: 0 }, 6, IDENTITY)
    ).toEqual([]);
    expect(
      computeSearchLinesFromCenters(
        [{ x: 1, y: 0 }, { x: 9, y: 0 }],
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        0,
        IDENTITY
      )
    ).toEqual([]);
  });

  it('projects each endpoint individually under a perspective matrix', () => {
    // A centre that is NOT the interpolated midpoint. With a non-zero bottom row,
    // pixel spacing is not linear in real-world distance, so the two endpoints must
    // NOT come out symmetric about the projected centre. A buggy implementation that
    // projected the centre and then offset in pixel space would produce a perfectly
    // symmetric pair here.
    const PERSPECTIVE = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0.05, 1],
    ];

    const centers = [{ x: 3, y: 0 }, { x: 8, y: 0 }];
    const lines = computeSearchLinesFromCenters(centers, { x: 0, y: 0 }, { x: 10, y: 0 }, 6, PERSPECTIVE);
    const [px, py] = transformRealWorldToPixel(centers[0].x, centers[0].y, PERSPECTIVE);
    const centerPx = { x: px, y: py };

    const line = lines[0];
    const distA = Math.hypot(line.a.x - centerPx.x, line.a.y - centerPx.y);
    const distB = Math.hypot(line.b.x - centerPx.x, line.b.y - centerPx.y);

    expect(Math.abs(distA - distB)).toBeGreaterThan(1e-6);
  });
});
