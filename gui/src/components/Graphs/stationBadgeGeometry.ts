import { Point } from '../../types';

/** Fixed dimensions for the hovered-station badge drawn on the canvas —
 *  same visual language as StabilizationCanvas.tsx's RegionBadge (dark-filled
 *  circle, accent stroke, white number), sized a little larger since chevrons
 *  are smaller targets than region corner handles. */
export const STATION_BADGE_BASE = {
  RADIUS: 15,
  RING_WIDTH: 2,
  LABEL_Y_NUDGE: 4.5, // no dominant-baseline set, so alphabetic text needs this to look centred
};

export interface StationBadgeGeometry {
  circle: { cx: number; cy: number; r: number };
  label: Point;
}

/** Computes the badge's circle and label position from the station's exact
 *  screen point (the chevron's base — the real station location, always
 *  defined even at zero velocity, unlike the chevron tip). */
export const getStationBadgeGeometry = (center: Point): StationBadgeGeometry => ({
  circle: { cx: center.x, cy: center.y, r: STATION_BADGE_BASE.RADIUS },
  label: { x: center.x, y: center.y + STATION_BADGE_BASE.LABEL_Y_NUDGE },
});
