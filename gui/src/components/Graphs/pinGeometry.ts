import { Point } from '../../types';

/**
 * Every pin dimension at divisor=1, reverse-engineered from the RIVeR design
 * audit's own inline SVG mockups (Canvas overlays → "The tip is the point").
 * Needle width is the finding's explicit "1.5px needle" spec, not the
 * mockup's own illustrative 1.6px rounding.
 */
export const PIN_BASE = {
  HEAD_RADIUS: 12,
  HEAD_OFFSET_Y: 34, // vertical distance from the tip to the head's centre
  RING_RADIUS: 6.5,
  TICK_LENGTH: 3,
  TICK_GAP: 1.5, // gap between the ring's edge and where a tick starts
  NEEDLE_WIDTH: 1.5,
  NEEDLE_HALO_WIDTH: 4,
  RING_WIDTH: 1.6,
  RING_HALO_WIDTH: 4,
  TICK_WIDTH: 1.4,
  CENTER_DOT_RADIUS: 1.5,
  HEAD_HALO_WIDTH: 3,
  HEAD_BORDER_WIDTH: 1.5,
  LABEL_FONT_SIZE: 13,
  LABEL_Y_NUDGE: 4.5, // no dominant-baseline set, so alphabetic text needs this to look centred
};

export interface PinGeometry {
  head: { cx: number; cy: number; r: number };
  needle: { x: number; y1: number; y2: number };
  ring: { cx: number; cy: number; r: number };
  ticks: {
    left: { x1: number; y1: number; x2: number; y2: number };
    right: { x1: number; y1: number; x2: number; y2: number };
    bottom: { x1: number; y1: number; x2: number; y2: number };
  };
  centerDot: Point;
  label: Point;
}

/**
 * Computes every part of one pin from its exact tip (the pixel that gets
 * saved) and a size divisor. The pin is always drawn upright — the needle
 * runs straight up from the head to the tip, never rotated to a drag
 * direction, matching the teardrop pin icon this replaces.
 *
 * `divisor` shrinks every dimension while keeping the tip fixed: pass the
 * report's `resizeFactor` for the static PDF pins, or the canvas's pan/zoom
 * `scale` for pins that live inside a scale()-transformed layer (Oblique,
 * ipcam) so they stay a constant screen size. Pass 1 (the default) for pins
 * already living in screen-space (uiLayer), like cross-sections/UAV.
 */
export const getPinGeometry = (tip: Point, divisor: number = 1): PinGeometry => {
  const d = (n: number) => n / divisor;

  const headR = d(PIN_BASE.HEAD_RADIUS);
  const ringR = d(PIN_BASE.RING_RADIUS);
  const headCy = tip.y - d(PIN_BASE.HEAD_OFFSET_Y);
  const tickLen = d(PIN_BASE.TICK_LENGTH);
  const ringEdge = ringR + d(PIN_BASE.TICK_GAP);

  return {
    head: { cx: tip.x, cy: headCy, r: headR },
    needle: { x: tip.x, y1: headCy + headR, y2: tip.y - ringR },
    ring: { cx: tip.x, cy: tip.y, r: ringR },
    ticks: {
      left: { x1: tip.x - ringEdge, y1: tip.y, x2: tip.x - ringEdge - tickLen, y2: tip.y },
      right: { x1: tip.x + ringEdge, y1: tip.y, x2: tip.x + ringEdge + tickLen, y2: tip.y },
      bottom: { x1: tip.x, y1: tip.y + ringEdge, x2: tip.x, y2: tip.y + ringEdge + tickLen },
    },
    centerDot: { x: tip.x, y: tip.y },
    label: { x: tip.x, y: headCy + d(PIN_BASE.LABEL_Y_NUDGE) },
  };
};
