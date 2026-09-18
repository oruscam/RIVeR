// src/helpers/maskPoints.ts

/**
 * Removes the most-recently-added point from a mask's local point list — the
 * "Undo point" toolbar action. Points are appended (never reordered) as the
 * user clicks/drags, so "most recent" is simply the array's last entry.
 * Pure so it's testable without DrawMask.tsx's D3/effect machinery.
 */
export const popLastMaskPoint = <T>(points: T[]): T[] => points.slice(0, -1);
