import { transformPixelToRealWorld } from '../../commons/coordinates';

interface Vec {
  x: number;
  y: number;
}

/**
 * Unit vector along a cross section in real-world coordinates, from its left
 * point to its right one. Null until the section and its transformation exist.
 */
export const getSectionTangent = (points: Vec[] | undefined, matrix: number[][]): Vec | null => {
  if (!points || points.length < 2 || matrix?.length !== 3) return null;
  const [eastL, northL] = transformPixelToRealWorld(points[0].x, points[0].y, matrix);
  const [eastR, northR] = transformPixelToRealWorld(points[1].x, points[1].y, matrix);
  const length = Math.hypot(eastR - eastL, northR - northL);
  if (!Number.isFinite(length) || length === 0) return null;
  return { x: (eastR - eastL) / length, y: (northR - northL) / length };
};

/**
 * Splits a real-world velocity into the two components the section defines.
 * Same convention as compute_section.py: crosswise runs along the section,
 * left to right, and streamwise is positive where the section vector crossed
 * with the velocity is (get_streamwise_magnitude_and_sign).
 */
export const getSectionComponents = (
  velocityEast: number,
  velocityNorth: number,
  tangent: Vec
): { streamwise: number; crosswise: number } => ({
  streamwise: tangent.x * velocityNorth - tangent.y * velocityEast,
  crosswise: tangent.x * velocityEast + tangent.y * velocityNorth,
});
