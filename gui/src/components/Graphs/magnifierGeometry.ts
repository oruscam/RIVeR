import { Point } from '../../types';

export interface MagnifierGeometry {
  center: Point;
  radius: number;
  image: { x: number; y: number; width: number; height: number };
}

/**
 * Where to put the lens: offset up, and toward the image's horizontal
 * centre from the point (so it tends to land over less-important footage
 * and stay clear of the pin being dragged), clamped so the whole circle
 * stays inside the image bounds. Same "prefer the side closer to centre,
 * then clamp" idea as drawSections.ts's drawSectionLabel.
 */
export const getMagnifierLensCenter = (
  point: Point,
  imageWidth: number,
  imageHeight: number,
  radius: number,
  distance: number
): Point => {
  const towardCenterX = point.x > imageWidth / 2 ? -1 : 1;
  const raw = { x: point.x + towardCenterX * distance * 0.6, y: point.y - distance };
  return {
    x: Math.max(radius, Math.min(imageWidth - radius, raw.x)),
    y: Math.max(radius, Math.min(imageHeight - radius, raw.y)),
  };
};

/**
 * Builds the lens's centre and the crop rect for its zoomed `<image>`. The
 * `<image>` is the same frame image rendered at `zoom`× its normal size and
 * offset so `point` lands exactly at `center` — clipped to a circle of
 * `radius` by the caller (drawMagnifier.ts owns the clip-path element).
 * `zoom` is the lens's own magnification, independent of any canvas
 * pan/zoom the caller may also be applying.
 */
export const getMagnifierGeometry = ({
  point,
  imageWidth,
  imageHeight,
  radius = 60,
  zoom = 4,
  distance = 90,
}: {
  point: Point;
  imageWidth: number;
  imageHeight: number;
  radius?: number;
  zoom?: number;
  distance?: number;
}): MagnifierGeometry => {
  const center = getMagnifierLensCenter(point, imageWidth, imageHeight, radius, distance);
  return {
    center,
    radius,
    image: {
      x: center.x - point.x * zoom,
      y: center.y - point.y * zoom,
      width: imageWidth * zoom,
      height: imageHeight * zoom,
    },
  };
};

/** "x {X} · y {Y} px" in the original image's pixel space (point is in
 *  resized/zoom space; factor undoes the resize), one decimal place each. */
export const formatPinCoordinates = (point: Point, factor: number): string =>
  `x ${(point.x * factor).toFixed(1)} · y ${(point.y * factor).toFixed(1)} px`;
