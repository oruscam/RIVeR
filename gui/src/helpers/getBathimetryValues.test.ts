import {
  buildWetSegmentsProfile,
  findWetSegments,
  getBathimetryValues,
  getIntersectionPoints,
} from './getBathimetryValues';
import { Point } from '../types';

// Same fixtures already validated in tests/core/test_compute_section.py (Python backend).
const ISLAND_STAGES = [
  12.0, 9.5, 8.0, 7.0, 7.5, 8.5, 9.8, 10.5, 11.2, 10.3, 9.0, 8.0, 7.2, 7.0, 7.8, 8.8, 9.6, 10.2, 11.0, 11.8, 13.0,
];
const ISLAND_LINE: Point[] = ISLAND_STAGES.map((y, x) => ({ x, y }));
const ISLAND_LEVEL = 10.0;

const NO_ISLAND_STAGES = [12, 10.5, 8, 6, 5, 6, 8, 10.5, 12];
const NO_ISLAND_LINE: Point[] = NO_ISLAND_STAGES.map((y, x) => ({ x, y }));
const NO_ISLAND_LEVEL = 9.0;

const SUBMERGED_LEVEL = 11.5;

describe('getIntersectionPoints', () => {
  it('finds all 4 crossings for a bathymetry with an island, not just the first 2', () => {
    const points = getIntersectionPoints(ISLAND_LINE, ISLAND_LEVEL);

    expect(points).toHaveLength(4);
    expect(points[0].x).toBeCloseTo(0.8, 3);
    expect(points[1].x).toBeCloseTo(6.2857, 3);
    expect(points[2].x).toBeCloseTo(9.2308, 3);
    expect(points[3].x).toBeCloseTo(16.6667, 3);
  });

  it('finds only 2 crossings for a simple channel without an island', () => {
    const points = getIntersectionPoints(NO_ISLAND_LINE, NO_ISLAND_LEVEL);

    expect(points).toHaveLength(2);
  });
});

describe('findWetSegments', () => {
  it('returns 2 segments for a bathymetry with an island', () => {
    const segments = findWetSegments(ISLAND_LINE, ISLAND_LEVEL);

    expect(segments).toHaveLength(2);
    expect(segments[0].x1).toBeCloseTo(0.8, 3);
    expect(segments[0].x2).toBeCloseTo(6.2857, 3);
    expect(segments[1].x1).toBeCloseTo(9.2308, 3);
    expect(segments[1].x2).toBeCloseTo(16.6667, 3);
  });

  it('returns 1 segment for a simple channel without an island', () => {
    const segments = findWetSegments(NO_ISLAND_LINE, NO_ISLAND_LEVEL);

    expect(segments).toHaveLength(1);
    expect(segments[0].x1).toBeCloseTo(1.6, 3);
    expect(segments[0].x2).toBeCloseTo(6.4, 3);
  });

  it('returns 1 segment when the water level submerges the island entirely', () => {
    const segments = findWetSegments(ISLAND_LINE, SUBMERGED_LEVEL);

    expect(segments).toHaveLength(1);
    expect(segments[0].x1).toBeCloseTo(0.2, 3);
    expect(segments[0].x2).toBeCloseTo(18.625, 3);
  });
});

describe('getBathimetryValues', () => {
  it('computes the full span width (first to last crossing) and wetSegments for an island', () => {
    const { data } = getBathimetryValues(ISLAND_LINE, ISLAND_LEVEL);

    expect(data?.x1Intersection).toBeCloseTo(0.8, 3);
    expect(data?.x2Intersection).toBeCloseTo(16.6667, 3);
    expect(data?.width).toBeCloseTo(15.8667, 3);
    expect(data?.wetSegments).toHaveLength(2);
  });

  it('matches the previous single-segment behavior for a simple channel', () => {
    const { data } = getBathimetryValues(NO_ISLAND_LINE, NO_ISLAND_LEVEL);

    expect(data?.x1Intersection).toBeCloseTo(1.6, 3);
    expect(data?.x2Intersection).toBeCloseTo(6.4, 3);
    expect(data?.width).toBeCloseTo(4.8, 3);
    expect(data?.wetSegments).toHaveLength(1);
  });
});

describe('buildWetSegmentsProfile', () => {
  it('renders zero height (flat at level) across the island, not bridged', () => {
    const segments = findWetSegments(ISLAND_LINE, ISLAND_LEVEL);
    const profile = buildWetSegmentsProfile(ISLAND_LINE, segments, ISLAND_LEVEL);

    // The synthetic boundary points closing segment 1 and opening segment 2 must be
    // adjacent in the array (no interior island points inserted between them) and both
    // pinned exactly at the water level, so d3's area() draws a flat, invisible bridge.
    const segment1EndIndex = profile.findIndex((p) => p.x === segments[0].x2 && p.y === ISLAND_LEVEL);
    const segment2StartIndex = profile.findIndex((p) => p.x === segments[1].x1 && p.y === ISLAND_LEVEL);

    expect(segment1EndIndex).toBeGreaterThanOrEqual(0);
    expect(segment2StartIndex).toBe(segment1EndIndex + 1);

    // both wet humps are still present (points strictly below the water level)
    expect(profile.some((p) => p.x < segments[0].x2 && p.y < ISLAND_LEVEL)).toBe(true);
    expect(profile.some((p) => p.x > segments[1].x1 && p.y < ISLAND_LEVEL)).toBe(true);
  });
});
