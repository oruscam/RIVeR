import { PIN_BASE } from './pinGeometry';

type Point = { x: number; y: number };

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Gap kept between the head and the bounds' edge, at divisor 1. */
const MARGIN = 2;

const headCentre = (tip: Point, angle: number, armLength: number) => {
  const rad = (angle * Math.PI) / 180;
  return { x: tip.x + armLength * Math.sin(rad), y: tip.y - armLength * Math.cos(rad) };
};

/**
 * How far a pin leans so its head stays inside `bounds` (spec §2): 0 when the
 * upright head fits, else the smallest whole-degree turn about the tip that
 * fits (nearest-to-centre side on a tie, clockwise on an exact tie), else
 * straight at the centre. Degrees, positive = clockwise on screen, which is
 * what an SVG rotate() takes.
 */
export const pinLeanAngle = (tip: Point, divisor: number = 1, bounds?: Bounds): number => {
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return 0;
  const arm = PIN_BASE.HEAD_OFFSET_Y / divisor;
  const r = PIN_BASE.HEAD_RADIUS / divisor;
  const m = MARGIN / divisor;
  const left = bounds.x + m + r;
  const right = bounds.x + bounds.width - m - r;
  const top = bounds.y + m + r;
  const bottom = bounds.y + bounds.height - m - r;
  const fits = (angle: number) => {
    const c = headCentre(tip, angle, arm);
    return c.x >= left && c.x <= right && c.y >= top && c.y <= bottom;
  };
  if (fits(0)) return 0;

  const centre = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const distanceToCentre = (angle: number) => {
    const c = headCentre(tip, angle, arm);
    return Math.hypot(c.x - centre.x, c.y - centre.y);
  };
  for (let step = 1; step <= 180; step++) {
    const cw = fits(step);
    const ccw = fits(-step);
    if (cw && ccw) return distanceToCentre(step) <= distanceToCentre(-step) ? step : -step;
    if (cw) return step;
    if (ccw) return -step;
  }
  const dx = centre.x - tip.x;
  const dy = centre.y - tip.y;
  if (dx === 0 && dy === 0) return 0;
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
};

/**
 * The part of the image currently on screen, for a canvas whose zoom layer is
 * `translate(position) translate(c) scale(scale) translate(-c)` (OverlaySvg)
 * and whose viewport is the image's display size. `screen` gives it in the
 * viewport's pixels (pins in the UI layer); `image` gives it in the zoom
 * layer's own coordinates (pins inside the scaled layer).
 */
export const visibleImageBounds = (
  view: { width: number; height: number; position: Point; scale: number },
  space: 'screen' | 'image'
): Bounds => {
  const { width, height, position, scale } = view;
  const cx = width / 2;
  const cy = height / 2;
  if (space === 'screen') {
    const x0 = Math.max(0, position.x + cx - cx * scale);
    const x1 = Math.min(width, position.x + cx + cx * scale);
    const y0 = Math.max(0, position.y + cy - cy * scale);
    const y1 = Math.min(height, position.y + cy + cy * scale);
    return { x: x0, y: y0, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) };
  }
  const toImage = (s: number, pos: number, c: number) => c + (s - pos - c) / scale;
  const x0 = Math.max(0, toImage(0, position.x, cx));
  const x1 = Math.min(width, toImage(width, position.x, cx));
  const y0 = Math.max(0, toImage(0, position.y, cy));
  const y1 = Math.min(height, toImage(height, position.y, cy));
  return { x: x0, y: y0, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) };
};
