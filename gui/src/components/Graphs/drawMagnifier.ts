import * as d3 from 'd3';
import { Point } from '../../types';
import { getMagnifierGeometry, formatPinCoordinates } from './magnifierGeometry';

let clipCounter = 0;

/**
 * Selector excluding the magnifier's own <g> and all of its descendants
 * from a blanket `layer.selectAll('*').remove()` sweep. Any file that
 * redraws its whole layer on every state change (which several of this
 * codebase's D3 draw files do, since a redraw is cheaper to reason about
 * than incremental diffing) must use this instead of a bare `'*'`, or the
 * magnifier gets wiped almost immediately after every drag tick draws it.
 * BOTH :not() clauses are required — the magnifier's own child elements
 * (.magnifier-guide, .magnifier-border, etc.) don't carry the `magnifier`
 * class themselves, so excluding only the outer <g> leaves them exposed
 * and they get stripped anyway, leaving an empty, invisible shell.
 */
export const NOT_MAGNIFIER = '*:not(.magnifier):not(.magnifier *)';

export interface MagnifierOptions {
  /** Layer to draw into — the same space the caller's own pins live in
   *  (uiLayer for screen-space pins, or the pan/zoom layer for pins that
   *  divide their own dimensions by `scale`). */
  layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  /** Where to place the lens on screen (and anchor the guide line), in the
   *  same coordinate space as `layer`. */
  point: Point;
  /**
   * The point's position within the underlying image's own content —
   * used only for the crop offset and the coordinate readout. Defaults to
   * `point`. Only needs to differ from `point` when `layer` is NOT the
   * same pan/zoom-transformed space the image itself lives in (e.g. a
   * constant-screen-size overlay layer) — in that case `point` has the
   * canvas's pan/zoom already baked in and no longer matches image-content
   * coordinates.
   */
  imagePoint?: Point;
  /** Href of the current frame image (the same <img> the page shows behind
   *  the SVG overlay) — cropped and magnified inside the lens. Named to
   *  match every call site's local variable (each interactive file already
   *  calls its own frame-image prop `imageSrc`). */
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  /** Undoes the image's resize factor, for the coordinate readout. */
  coordinateFactor: number;
  /** Divides radius/distance so the lens stays a constant screen size
   *  inside a pan/zoom-scaled layer — same convention as pinGeometry's
   *  `divisor`. Pass 1 for screen-space layers. */
  divisor?: number;
}

/**
 * Shows (creating if needed) a circular magnifier: a dashed guide line to
 * the dragged point, a zoomed crop of the current frame clipped to a
 * circle, an inner crosshair marking the lens's own centre pixel, and a
 * coordinate readout below it. Call again on every 'drag' tick to move it;
 * call hideMagnifier on 'end'. The lens's 4× magnification means something
 * numerically different depending on the caller: for callers that draw the
 * magnifier inside a pan/zoom-transformed layer (Oblique, ipcam), 4× is
 * relative to the image's current on-screen size; for callers that draw it
 * into a constant-screen-size overlay (cross-sections/UAV, via `imagePoint`),
 * 4× is relative to the unzoomed image — both look the same at the canvas's
 * default (unzoomed) view.
 */
export const showMagnifier = (options: MagnifierOptions): void => {
  const { layer, point, imagePoint, imageSrc, imageWidth, imageHeight, coordinateFactor, divisor = 1 } = options;
  const d = (n: number) => n / divisor;

  let g = layer.select<SVGGElement>('g.magnifier');
  let clipId: string;
  if (g.empty()) {
    clipCounter += 1;
    clipId = `magnifier-clip-${clipCounter}`;
    g = layer.append('g').attr('class', 'magnifier').attr('data-clip-id', clipId).attr('pointer-events', 'none');
    g.append('defs').append('clipPath').attr('id', clipId).append('circle');
    g.append('line').attr('class', 'magnifier-guide');
    g.append('circle').attr('class', 'magnifier-backing');
    g.append('image').attr('class', 'magnifier-image');
    g.append('line').attr('class', 'magnifier-arm-left');
    g.append('line').attr('class', 'magnifier-arm-right');
    g.append('line').attr('class', 'magnifier-arm-top');
    g.append('line').attr('class', 'magnifier-arm-bottom');
    g.append('circle').attr('class', 'magnifier-center-ring');
    g.append('circle').attr('class', 'magnifier-border');
    g.append('rect').attr('class', 'magnifier-readout-bg');
    g.append('text').attr('class', 'magnifier-readout-text');
  } else {
    clipId = g.attr('data-clip-id')!;
  }
  g.raise();

  const radius = d(60);
  const geo = getMagnifierGeometry({
    point,
    imagePoint,
    imageWidth,
    imageHeight,
    radius,
    zoom: 4,
    distance: d(90),
  });
  const { center, image } = geo;

  g.select('clipPath circle').attr('cx', center.x).attr('cy', center.y).attr('r', radius);

  g.select('.magnifier-guide')
    .attr('x1', point.x)
    .attr('y1', point.y)
    .attr('x2', center.x)
    .attr('y2', center.y)
    .attr('stroke', 'rgba(255,255,255,.5)')
    .attr('stroke-width', d(1))
    .attr('stroke-dasharray', '3,3');

  g.select('.magnifier-backing')
    .attr('cx', center.x)
    .attr('cy', center.y)
    .attr('r', radius + d(3))
    .attr('fill', 'rgba(0,0,0,.65)');

  g.select('.magnifier-image')
    .attr('href', imageSrc)
    .attr('x', image.x)
    .attr('y', image.y)
    .attr('width', image.width)
    .attr('height', image.height)
    .attr('preserveAspectRatio', 'none')
    .attr('clip-path', `url(#${clipId})`);

  // Inner crosshair, proportional to the lens radius (audit mockup: gap and
  // centre-ring radius are 7/64 and 3.2/64 of the lens radius; arms reach
  // exactly to the lens border).
  const gap = radius * (7 / 64);
  const armLen = radius - gap;
  g.select('.magnifier-arm-left')
    .attr('x1', center.x - gap)
    .attr('y1', center.y)
    .attr('x2', center.x - gap - armLen)
    .attr('y2', center.y);
  g.select('.magnifier-arm-right')
    .attr('x1', center.x + gap)
    .attr('y1', center.y)
    .attr('x2', center.x + gap + armLen)
    .attr('y2', center.y);
  g.select('.magnifier-arm-top')
    .attr('x1', center.x)
    .attr('y1', center.y - gap)
    .attr('x2', center.x)
    .attr('y2', center.y - gap - armLen);
  g.select('.magnifier-arm-bottom')
    .attr('x1', center.x)
    .attr('y1', center.y + gap)
    .attr('x2', center.x)
    .attr('y2', center.y + gap + armLen);
  g.selectAll('.magnifier-arm-left, .magnifier-arm-right, .magnifier-arm-top, .magnifier-arm-bottom')
    .attr('stroke', '#fff')
    .attr('stroke-width', d(1.3));

  g.select('.magnifier-center-ring')
    .attr('cx', center.x)
    .attr('cy', center.y)
    .attr('r', radius * (3.2 / 64))
    .attr('fill', 'none')
    .attr('stroke', '#fff')
    .attr('stroke-width', d(1.3));

  g.select('.magnifier-border')
    .attr('cx', center.x)
    .attr('cy', center.y)
    .attr('r', radius)
    .attr('fill', 'none')
    .attr('stroke', '#fff')
    .attr('stroke-width', d(2.5));

  const text = g
    .select<SVGTextElement>('.magnifier-readout-text')
    .attr('x', center.x)
    .attr('y', center.y + radius + d(14))
    .attr('text-anchor', 'middle')
    .attr('font-size', d(11))
    .attr('font-weight', 600)
    .attr('fill', '#fff')
    .text(formatPinCoordinates(imagePoint ?? point, coordinateFactor));

  try {
    const bbox = (text.node() as SVGTextElement).getBBox();
    const padX = d(6);
    const padY = d(3);
    g.select('.magnifier-readout-bg')
      .attr('x', bbox.x - padX)
      .attr('y', bbox.y - padY)
      .attr('width', bbox.width + padX * 2)
      .attr('height', bbox.height + padY * 2)
      .attr('rx', d(4))
      .attr('fill', 'rgba(10,12,14,.8)');
  } catch {
    // getBBox may fail before the text is attached to a rendered document — skip the backing rect.
  }
};

/** Removes the magnifier entirely — call on drag end. */
export const hideMagnifier = (layer: d3.Selection<SVGGElement, unknown, null, undefined>): void => {
  layer.select('g.magnifier').remove();
};
