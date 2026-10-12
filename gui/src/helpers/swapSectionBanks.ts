import { Point } from '../types';

/** A section can trade its banks once its line is drawn: two distinct ends. */
export const canSwapBanks = (points: Point[]): boolean =>
  points.length === 2 && (points[0].x !== points[1].x || points[0].y !== points[1].y);

/** The same line with left and right exchanged; neither end moves. */
export const swapEnds = (points: Point[]): Point[] => [{ ...points[1] }, { ...points[0] }];
