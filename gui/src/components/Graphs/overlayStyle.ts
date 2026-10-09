import type * as d3 from 'd3';

/**
 * One way to draw a line over a frame, at two sizes: the app canvases and the
 * exported report (spec 2026-10-03-overlay-style). Every overlay line is a
 * coloured stroke over a dark halo so it reads on bright water and dark grass;
 * the report size halves every width for its small printed frames.
 */
export type OverlaySize = 'app' | 'report';

type Point = { x: number; y: number };

export const OVERLAY_STYLE: Record<
  OverlaySize,
  { LINE_WIDTH: number; ELLIPSE_WIDTH: number; RESIDUAL_WIDTH: number; PIN_DIVISOR: number }
> = {
  app: { LINE_WIDTH: 3, ELLIPSE_WIDTH: 1.5, RESIDUAL_WIDTH: 2.5, PIN_DIVISOR: 1 },
  report: { LINE_WIDTH: 1.5, ELLIPSE_WIDTH: 0.75, RESIDUAL_WIDTH: 1.25, PIN_DIVISOR: 2 },
};

/** Multiples of the line width, so both sizes keep the same proportions. */
export const OVERLAY_RATIOS = { HALO: 2, DASH_ON: 2.5, DASH_OFF: 3, TICK_HALF_LENGTH: 3, TICK_WIDTH: 0.6 };

export const OVERLAY_HALO_COLOR = 'rgba(0, 0, 0, 0.5)';

export interface LinePart {
  role: 'halo' | 'stroke' | 'tick';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  width: number;
  dash: string | null;
}

export interface OverlayLineOptions {
  from: Point;
  to: Point;
  color: string;
  size: OverlaySize;
  /** Section transect dash, on halo and stroke. */
  dashed?: boolean;
  /** Perpendicular ticks at both ends (section transect). */
  ticks?: boolean;
  /** Line width before zoom, when it is not the size's LINE_WIDTH (the ipcam residual). */
  width?: number;
  /** Divides every width, dash and tick length, for layers inside a scale() transform. */
  zoom?: number;
}

export const overlayLineParts = ({
  from,
  to,
  color,
  size,
  dashed = false,
  ticks = false,
  width,
  zoom = 1,
}: OverlayLineOptions): LinePart[] => {
  const style = OVERLAY_STYLE[size];
  const w = (width ?? style.LINE_WIDTH) / zoom;
  const segment = { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
  const dash = dashed ? `${w * OVERLAY_RATIOS.DASH_ON},${w * OVERLAY_RATIOS.DASH_OFF}` : null;

  const parts: LinePart[] = [];
  parts.push({ role: 'halo', ...segment, stroke: OVERLAY_HALO_COLOR, width: w * OVERLAY_RATIOS.HALO, dash });
  parts.push({ role: 'stroke', ...segment, stroke: color, width: w, dash });

  if (ticks) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    // A zero-length segment has no direction: fall back to a vertical tick instead of NaN.
    const len = Math.hypot(dx, dy);
    const px = len === 0 ? 0 : -dy / len;
    const py = len === 0 ? 1 : dx / len;
    const half = w * OVERLAY_RATIOS.TICK_HALF_LENGTH;
    [from, to].forEach((p) =>
      parts.push({
        role: 'tick',
        x1: p.x - px * half,
        y1: p.y - py * half,
        x2: p.x + px * half,
        y2: p.y + py * half,
        stroke: color,
        width: w * OVERLAY_RATIOS.TICK_WIDTH,
        dash: null,
      })
    );
  }
  return parts;
};

/**
 * Paints `overlayLineParts` into a new <g> on `layer` and returns it.
 * `nonScaling` keeps widths in screen pixels inside a zoomed layer (the
 * cross-section layers use this instead of `zoom`).
 */
export const drawOverlayLine = ({
  layer,
  className = '',
  nonScaling = false,
  ...options
}: OverlayLineOptions & {
  layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  className?: string;
  nonScaling?: boolean;
}) => {
  const group = layer.append('g').attr('class', className).attr('pointer-events', 'none');
  overlayLineParts(options).forEach((p) => {
    group
      .append('line')
      .attr('class', `ov-${p.role}`)
      .attr('x1', p.x1)
      .attr('y1', p.y1)
      .attr('x2', p.x2)
      .attr('y2', p.y2)
      .attr('stroke', p.stroke)
      .attr('stroke-width', p.width)
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', p.dash)
      .attr('vector-effect', nonScaling ? 'non-scaling-stroke' : null);
  });
  return group;
};

export interface OverlayEllipseOptions {
  cx: number;
  cy: number;
  /** Full axis lengths in the layer's units, as the backend returns them. */
  width: number;
  height: number;
  /** Rotation in degrees. */
  angle: number;
  color: string;
  size: OverlaySize;
  zoom?: number;
}

export interface EllipsePart {
  role: 'halo' | 'stroke';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotate: string;
  stroke: string;
  width: number;
}

/** An outline ellipse: coloured stroke over the dark halo, never filled. */
export const overlayEllipseParts = ({
  cx,
  cy,
  width,
  height,
  angle,
  color,
  size,
  zoom = 1,
}: OverlayEllipseOptions): EllipsePart[] => {
  if (!(width > 0) || !(height > 0)) return [];
  const w = OVERLAY_STYLE[size].ELLIPSE_WIDTH / zoom;
  const shape = { cx, cy, rx: width / 2, ry: height / 2, rotate: `rotate(${angle}, ${cx}, ${cy})` };
  return [
    { role: 'halo', ...shape, stroke: OVERLAY_HALO_COLOR, width: w * OVERLAY_RATIOS.HALO },
    { role: 'stroke', ...shape, stroke: color, width: w },
  ];
};

export const drawOverlayEllipse = ({
  layer,
  className = '',
  ...options
}: OverlayEllipseOptions & {
  layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  className?: string;
}) => {
  const group = layer.append('g').attr('class', className).attr('pointer-events', 'none');
  overlayEllipseParts(options).forEach((p) => {
    group
      .append('ellipse')
      .attr('class', `ov-${p.role}`)
      .attr('cx', p.cx)
      .attr('cy', p.cy)
      .attr('rx', p.rx)
      .attr('ry', p.ry)
      .attr('transform', p.rotate)
      .attr('fill', 'none')
      .attr('stroke', p.stroke)
      .attr('stroke-width', p.width);
  });
  return group;
};
