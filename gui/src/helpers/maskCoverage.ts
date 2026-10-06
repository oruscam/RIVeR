import { invertMatrix } from '../../commons/coordinates';
import type { Point } from '../types';

/** The Processing mask overlay, one byte per pixel: > 0 is masked (the PNG's alpha). */
export interface MaskRaster {
  width: number;
  height: number;
  alpha: Uint8Array;
}

/** Off-image counts as hidden, matching the backend's are_all_points_hidden. */
export const isPixelHidden = (raster: MaskRaster, x: number, y: number): boolean => {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= raster.width || yi >= raster.height) return true;
  return raster.alpha[yi * raster.width + xi] > 0;
};

/** Whether every pixel along a → b (one sample per pixel of length) is hidden. */
export const isSegmentMasked = (raster: MaskRaster | null, a: Point, b: Point): boolean => {
  if (!raster) return false;
  const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)) + 1);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    if (!isPixelHidden(raster, a.x + t * (b.x - a.x), a.y + t * (b.y - a.y))) return false;
  }
  return true;
};

/**
 * Whether an iWave window (a real-world square aligned with east/north, like the
 * backend's ortho grid) is hidden at every sample. A preview only: the backend
 * decides with the exact crop.
 */
export const isWindowMasked = (
  raster: MaskRaster | null,
  center: Point,
  windowM: number,
  matrix: number[][],
  samples = 16
): boolean => {
  if (!raster || !(windowM > 0) || matrix.length !== 3) return false;
  let inv: number[][];
  try {
    inv = invertMatrix(matrix);
  } catch {
    return false; // singular matrix: nothing can be mapped, so nothing is masked
  }
  const half = windowM / 2;
  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < samples; j++) {
      const e = center.x - half + (windowM * i) / (samples - 1);
      const n = center.y - half + (windowM * j) / (samples - 1);
      const w = inv[2][0] * e + inv[2][1] * n + inv[2][2] || 1;
      const x = (inv[0][0] * e + inv[0][1] * n + inv[0][2]) / w;
      const y = (inv[1][0] * e + inv[1][1] * n + inv[1][2]) / w;
      if (!isPixelHidden(raster, x, y)) return false;
    }
  }
  return true;
};
