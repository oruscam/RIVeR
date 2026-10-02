interface PointLike {
  label: string;
  x: number;
  y: number;
  selected: boolean;
}

export interface IpcamPointError {
  /** Index into the store's points array. */
  index: number;
  label: string;
  /** Reprojection error in px, or null when the stored errors no longer line up with the points. */
  error: number | null;
  /** Whether the point took part in the camera solve. */
  used: boolean;
}

/**
 * The CLI computes reprojection errors over every point placed on the image (the calculate-3d-rectification
 * handler drops x = y = 0), in points order, in both solve modes. pointIndices (optimize mode only) index
 * that placed subset, not the points array. In direct-solve mode the solve uses the selected placed points.
 */
export function ipcamPointErrors(
  points: PointLike[],
  solution: { reprojectionErrors: number[]; pointIndices?: number[] }
): IpcamPointError[] {
  const placed = points.map((p, index) => ({ p, index })).filter(({ p }) => !(p.x === 0 && p.y === 0));
  const aligned = solution.reprojectionErrors.length === placed.length;
  const optimized = solution.pointIndices ? new Set(solution.pointIndices) : null;
  return placed.map(({ p, index }, k) => ({
    index,
    label: p.label,
    error: aligned ? solution.reprojectionErrors[k] : null,
    used: optimized ? optimized.has(k) : p.selected,
  }));
}
