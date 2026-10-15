import * as d3 from 'd3';
import { Point } from '../../types';
import { getPinGeometry, PIN_BASE } from './pinGeometry';
import { getPinColors } from '../../helpers/getCSSVar';
import { pinLeanAngle, type Bounds } from './pinLean';

export type PinKind = 'left' | 'right' | 'point' | 'muted';

export interface DrawPinOptions {
  /** Group (or layer) to append the pin into. */
  layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  /** The exact pixel this pin marks — the crosshair's centre. */
  tip: Point;
  kind: PinKind;
  /** Short glyph drawn inside the head (e.g. "L", "R", "1"). Omit for no label. */
  label?: string;
  /** Divides every dimension — see pinGeometry.ts's `getPinGeometry` doc. */
  divisor?: number;
  /** Extra class(es) appended to the root <g>, e.g. for later selection/cleanup. */
  className?: string;
  /** Draws a thin accent ring around the head — ipcam's "currently selected
   *  for editing" state, which no longer gets its own pin colour. */
  active?: boolean;
  /** The visible image, in the layer's coordinates. When the upright head
   *  would cross its edge the pin leans inward (pinLean.ts). */
  bounds?: Bounds;
}

const HALO = 'rgba(0, 0, 0, 0.6)';
const WHITE = '#fff';

/** Rotates the arm about the tip it was drawn at and keeps the label upright. */
const applyLean = (pin: d3.Selection<SVGGElement, unknown, null, undefined>, angle: number) => {
  const tipX = Number(pin.attr('data-tip-x'));
  const tipY = Number(pin.attr('data-tip-y'));
  const headY = Number(pin.attr('data-head-y'));
  pin.select('.pin-arm').attr('transform', angle === 0 ? null : `rotate(${angle}, ${tipX}, ${tipY})`);
  pin.select('.pin-label').attr('transform', angle === 0 ? null : `rotate(${-angle}, ${tipX}, ${headY})`);
};

/**
 * Paints one push-pin: a crosshair at the tip whose centre is the exact pixel,
 * and an arm (needle, coloured head, optional label) that stands straight up,
 * or leans inward when `bounds` says the head would leave the image. Every
 * stroked part gets a dark halo under a white line, so the pin reads on both
 * bright water and dark shade. Returns the root <g> so the caller can attach
 * drag behaviour to it.
 */
export const drawPin = (options: DrawPinOptions): d3.Selection<SVGGElement, unknown, null, undefined> => {
  const { layer, tip, kind, label, divisor = 1, className = '', active = false, bounds } = options;
  const geo = getPinGeometry(tip, divisor);
  const colors = getPinColors();
  const fill = colors[kind];
  const d = (n: number) => n / divisor;

  const g = layer
    .append('g')
    .attr('class', `pin pin-${kind} ${className}`.trim())
    .attr('data-tip-x', tip.x)
    .attr('data-tip-y', tip.y)
    .attr('data-head-y', geo.head.cy);

  // Crosshair ring at the tip: halo then white ring.
  g.append('circle')
    .attr('cx', geo.ring.cx)
    .attr('cy', geo.ring.cy)
    .attr('r', geo.ring.r)
    .attr('fill', 'none')
    .attr('stroke', HALO)
    .attr('stroke-width', d(PIN_BASE.RING_HALO_WIDTH));
  g.append('circle')
    .attr('cx', geo.ring.cx)
    .attr('cy', geo.ring.cy)
    .attr('r', geo.ring.r)
    .attr('fill', 'none')
    .attr('stroke', WHITE)
    .attr('stroke-width', d(PIN_BASE.RING_WIDTH));

  // Three ticks (left/right/bottom — the needle stands in for the fourth, top, tick).
  ([geo.ticks.left, geo.ticks.right, geo.ticks.bottom] as const).forEach((tick) => {
    g.append('line')
      .attr('x1', tick.x1)
      .attr('y1', tick.y1)
      .attr('x2', tick.x2)
      .attr('y2', tick.y2)
      .attr('stroke', WHITE)
      .attr('stroke-width', d(PIN_BASE.TICK_WIDTH))
      .attr('stroke-linecap', 'round');
  });

  // Centre dot — the exact pixel that gets saved.
  g.append('circle')
    .attr('cx', geo.centerDot.x)
    .attr('cy', geo.centerDot.y)
    .attr('r', d(PIN_BASE.CENTER_DOT_RADIUS))
    .attr('fill', WHITE);

  // The arm leans as one piece; drawn upright, rotated by applyLean.
  const arm = g.append('g').attr('class', 'pin-arm');

  // Needle: halo then white line, from the head's bottom edge to the ring's top edge.
  arm
    .append('line')
    .attr('x1', geo.needle.x)
    .attr('x2', geo.needle.x)
    .attr('y1', geo.needle.y1)
    .attr('y2', geo.needle.y2)
    .attr('stroke', HALO)
    .attr('stroke-width', d(PIN_BASE.NEEDLE_HALO_WIDTH))
    .attr('stroke-linecap', 'round');
  arm
    .append('line')
    .attr('x1', geo.needle.x)
    .attr('x2', geo.needle.x)
    .attr('y1', geo.needle.y1)
    .attr('y2', geo.needle.y2)
    .attr('stroke', WHITE)
    .attr('stroke-width', d(PIN_BASE.NEEDLE_WIDTH))
    .attr('stroke-linecap', 'round');

  // Head: an optional accent ring for "active", halo then coloured fill with a white border, then the label.
  if (active) {
    arm
      .append('circle')
      .attr('cx', geo.head.cx)
      .attr('cy', geo.head.cy)
      .attr('r', geo.head.r + d(3))
      .attr('fill', 'none')
      .attr('stroke', 'var(--accent-color, #58B8F0)')
      .attr('stroke-width', d(2));
  }
  arm
    .append('circle')
    .attr('cx', geo.head.cx)
    .attr('cy', geo.head.cy)
    .attr('r', geo.head.r)
    .attr('fill', fill)
    .attr('stroke', HALO)
    .attr('stroke-width', d(PIN_BASE.HEAD_HALO_WIDTH));
  arm
    .append('circle')
    .attr('cx', geo.head.cx)
    .attr('cy', geo.head.cy)
    .attr('r', geo.head.r)
    .attr('fill', fill)
    .attr('stroke', WHITE)
    .attr('stroke-width', d(PIN_BASE.HEAD_BORDER_WIDTH));

  if (label) {
    arm
      .append('text')
      .attr('class', 'pin-label')
      .attr('x', geo.label.x)
      .attr('y', geo.label.y)
      .attr('text-anchor', 'middle')
      .attr('font-size', d(PIN_BASE.LABEL_FONT_SIZE))
      .attr('font-weight', 700)
      .attr('fill', colors.ink)
      .attr('pointer-events', 'none')
      .text(label);
  }

  applyLean(g, pinLeanAngle(tip, divisor, bounds));
  return g;
};

/**
 * Re-leans a pin while it is dragged. The pin's root <g> is moved with a
 * translate() by the drag handlers, so the arm still rotates about the tip it
 * was drawn at; only the angle follows the live tip.
 */
export const updatePinLean = (
  pin: d3.Selection<SVGGElement, unknown, null, undefined>,
  liveTip: Point,
  divisor: number,
  bounds: Bounds | undefined
) => applyLean(pin, pinLeanAngle(liveTip, divisor, bounds));
