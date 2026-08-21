import { Point } from '../types';
import { transformRealWorldToPixel } from '../../commons/coordinates';

/**
 * Distribute `numStations` points evenly along a cross-section and return their
 * pixel positions.
 *
 * Mirrors the backend's `divide_segment_to_dict` (river/core/compute_section.py):
 * interpolation happens in REAL-WORLD space, and only then is each point projected
 * to pixels. Interpolating directly between the two pixel endpoints would be wrong
 * under an oblique/perspective homography, where equal real-world spacing does not
 * map to equal pixel spacing.
 *
 * Note this is a *preview*: the backend derives its endpoints from water-level
 * crossings and excludes dry segments (islands), whereas this spans the given
 * endpoints uniformly. The two agree for a single wet segment — the common case —
 * and the authoritative positions replace this preview once an analysis has run.
 */
export const computeStationPixelPositions = (
  rwStart: Point,
  rwEnd: Point,
  numStations: number,
  matrix: number[][]
): Point[] => {
  if (numStations < 2) return [];

  const positions: Point[] = [];
  for (let i = 0; i < numStations; i++) {
    const t = i / (numStations - 1);
    const east = rwStart.x + t * (rwEnd.x - rwStart.x);
    const north = rwStart.y + t * (rwEnd.y - rwStart.y);
    const [px, py] = transformRealWorldToPixel(east, north, matrix);
    positions.push({ x: px, y: py });
  }
  return positions;
};

export interface SearchLine {
  /** Pixel-space endpoint of the sampled segment. */
  a: Point;
  /** The opposite pixel-space endpoint. */
  b: Point;
  /** 1-based station number, matching the backend's `id` field. */
  station: number;
}

/**
 * Offset each centre ±half along the real-world normal (nx, ny) and project both
 * endpoints individually to pixel space.
 *
 * Both endpoints are projected individually. Projecting the centre and then offsetting
 * in pixel space would be wrong under an oblique/perspective homography, for the same
 * reason station positions must be interpolated in real-world space.
 */
const centersToSearchLines = (
  centers: Point[],
  nx: number,
  ny: number,
  half: number,
  matrix: number[][]
): SearchLine[] =>
  centers.map((center, i) => {
    const [ax, ay] = transformRealWorldToPixel(center.x - half * nx, center.y - half * ny, matrix);
    const [bx, by] = transformRealWorldToPixel(center.x + half * nx, center.y + half * ny, matrix);
    return { a: { x: ax, y: ay }, b: { x: bx, y: by }, station: i + 1 };
  });

/**
 * Compute the line along which each station's STI is sampled, in pixel space.
 *
 * Mirrors `build_stis_for_cross_section` (river/core/stiv_pipeline.py): the sampled
 * segment is CENTRED on the station and extends ±lengthM/2 along the cross-section's
 * real-world normal.
 *
 * The normal's sign is deliberately not resolved here. The backend picks an
 * upstream/downstream orientation to decide which end becomes row 0 of the STI, but
 * because the segment is symmetric about the station, the drawn line is identical
 * either way — so replicating that determination would add complexity with no visual
 * effect.
 *
 * Station centres are interpolated evenly between the two drawn cross-section
 * endpoints — a preview. Once a matching-count analysis has run, prefer
 * `computeSearchLinesFromCenters` with the backend's authoritative per-station
 * positions instead, since the backend spreads stations across the wetted width,
 * which can differ from the drawn line.
 */
export const computeStationSearchLines = (
  rwStart: Point,
  rwEnd: Point,
  numStations: number,
  lengthM: number,
  matrix: number[][]
): SearchLine[] => {
  if (numStations < 2 || lengthM <= 0) return [];

  const dx = rwEnd.x - rwStart.x;
  const dy = rwEnd.y - rwStart.y;
  const span = Math.hypot(dx, dy);
  if (span === 0) return [];

  // Real-world unit normal to the cross-section.
  const nx = -dy / span;
  const ny = dx / span;
  const half = lengthM / 2;

  const centers: Point[] = [];
  for (let i = 0; i < numStations; i++) {
    const t = i / (numStations - 1);
    centers.push({ x: rwStart.x + t * dx, y: rwStart.y + t * dy });
  }
  return centersToSearchLines(centers, nx, ny, half, matrix);
};

/**
 * Same geometry as `computeStationSearchLines`, but for authoritative per-station
 * real-world centres from a completed analysis (`section.data.east`/`north`) rather
 * than interpolating between the two drawn cross-section endpoints. The backend
 * spreads stations across the wetted width, which can differ from the drawn line, so
 * once real per-station positions exist they take precedence over the interpolated
 * preview. The normal direction still comes from the drawn cross-section tangent.
 */
export const computeSearchLinesFromCenters = (
  centers: Point[],
  rwStart: Point,
  rwEnd: Point,
  lengthM: number,
  matrix: number[][]
): SearchLine[] => {
  if (centers.length < 2 || lengthM <= 0) return [];

  const dx = rwEnd.x - rwStart.x;
  const dy = rwEnd.y - rwStart.y;
  const span = Math.hypot(dx, dy);
  if (span === 0) return [];

  const nx = -dy / span;
  const ny = dx / span;
  const half = lengthM / 2;

  return centersToSearchLines(centers, nx, ny, half, matrix);
};
