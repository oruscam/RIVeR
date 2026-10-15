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
 * offset so `imagePoint` (defaulting to `point`) lands exactly at `center` —
 * clipped to a circle of `radius` by the caller (drawMagnifier.ts owns the
 * clip-path element). `zoom` is the lens's own magnification, independent of
 * any canvas pan/zoom the caller may also be applying. `point` and
 * `imagePoint` are only different when the caller draws the magnifier into a
 * layer that does NOT share the pan/zoom-transformed space the image itself
 * lives in (e.g. a constant-screen-size overlay layer) — see `imagePoint`'s
 * own doc comment below.
 */
export const getMagnifierGeometry = ({
  point,
  imagePoint,
  imageWidth,
  imageHeight,
  radius = 60,
  zoom = 4,
  distance = 90,
}: {
  /** Where to place the lens on screen (and anchor the guide line). */
  point: Point;
  /**
   * The point's position within the underlying image's own content —
   * used only for the crop offset. Defaults to `point`. Only needs to
   * differ from `point` when the caller draws the magnifier into a layer
   * that is NOT the same pan/zoom-transformed space the image itself
   * lives in (e.g. a constant-screen-size overlay layer) — in that case
   * `point` has the canvas's pan/zoom already baked in and no longer
   * matches image-content coordinates.
   */
  imagePoint?: Point;
  imageWidth: number;
  imageHeight: number;
  radius?: number;
  zoom?: number;
  distance?: number;
}): MagnifierGeometry => {
  const cropPoint = imagePoint ?? point;
  const center = getMagnifierLensCenter(point, imageWidth, imageHeight, radius, distance);
  return {
    center,
    radius,
    image: {
      x: center.x - cropPoint.x * zoom,
      y: center.y - cropPoint.y * zoom,
      width: imageWidth * zoom,
      height: imageHeight * zoom,
    },
  };
};

/** "x {X} · y {Y} px" in the original image's pixel space (point is in
 *  resized/zoom space; factor undoes the resize), one decimal place each. */
export const formatPinCoordinates = (point: Point, factor: number): string =>
  `x ${(point.x * factor).toFixed(1)} · y ${(point.y * factor).toFixed(1)} px`;
