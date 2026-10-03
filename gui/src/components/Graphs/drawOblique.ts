import * as d3 from 'd3';
import { getDistanceColors } from '../../helpers/getCSSVar';
import { drawPin, updatePinLean } from './drawPin';
import { drawOverlayLine } from './overlayStyle';
import { visibleImageBounds } from './pinLean';
import { showMagnifier, hideMagnifier, NOT_MAGNIFIER } from './drawMagnifier';

interface drawObliqueProps {
  layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  uiLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  localPoints: { x: number; y: number }[];
  setLocalPoints?: (points: { x: number; y: number }[]) => void;
  factor: number;
  setMousePressed: (value: boolean) => void;
  setPointsInStore: (
    payload: { points: { x: number; y: number }[]; factor: number; index: number },
    event: any
  ) => void;
  scale: number;
  position: { x: number; y: number };
  isDefaultCoordinates: boolean;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
}

export const drawOblique = ({
  layer,
  uiLayer,
  localPoints,
  setLocalPoints,
  factor,
  setMousePressed,
  setPointsInStore,
  scale,
  position,
  isDefaultCoordinates,
  imageSrc,
  imageWidth,
  imageHeight,
}: drawObliqueProps) => {
  // Pins live in the zoomed layer, so their bounds are the visible image in image space.
  const bounds = visibleImageBounds({ width: imageWidth, height: imageHeight, position, scale }, 'image');

  const dragPoint = d3
    .drag<SVGGElement, { index: number }, { x: number; y: number }>()
    .subject((event, d) => {
      const p = localPoints[d.index];
      return { x: p.x, y: p.y };
    })
    .on('start', function () {
      setMousePressed(true);
      d3.select<SVGGElement, { index: number }>(this).raise();
    })
    .on('drag', function (event, d) {
      const x = event.x;
      const y = event.y;
      // Where this pin was actually drawn (this render's localPoints) — the
      // transform below is relative to that fixed point, so the existing
      // <g> can just be moved instead of torn down and repainted every tick
      // (drawPin returns several children with coordinates baked in, unlike
      // the old single <image>'s x/y attrs).
      const origin = localPoints[d.index];

      const next = [...localPoints];
      next[d.index] = { x, y };
      setLocalPoints?.(next);

      d3.select<SVGGElement, { index: number }>(this).attr(
        'transform',
        `translate(${x - origin.x}, ${y - origin.y})`
      );
      updatePinLean(d3.select<SVGGElement, unknown>(this), { x, y }, scale, bounds);
      showMagnifier({
        layer,
        point: { x, y },
        imageSrc,
        imageWidth,
        imageHeight,
        coordinateFactor: factor,
        divisor: scale,
      });
    })
    .on('end', function (event, d) {
      setMousePressed(false);
      hideMagnifier(layer);

      const x = event.x;
      const y = event.y;
      const next = [...localPoints];
      next[d.index] = { x, y };

      setPointsInStore({ points: next, factor, index: d.index }, null);
    });

  layer.selectAll(NOT_MAGNIFIER).remove();
  uiLayer.selectAll('*').remove();

  // Dibuja líneas y pins — colors read from current theme's CSS variables
  const DC = getDistanceColors();

  localPoints.forEach((point, i) => {
    if (isDefaultCoordinates && i !== 0) return;
    // Líneas de los lados
    const sideColors = [DC.D12, DC.D23, DC.D34, DC.D14];
    drawOverlayLine({
      layer,
      from: point,
      to: localPoints[(i + 1) % localPoints.length],
      color: sideColors[i] ?? DC.D12,
      size: 'app',
      zoom: scale,
      className: 'oblique-distance',
    });

    // Diagonales: 1→3 and 2→4 once each (i = 0, 1), so their halo weighs the same as the sides'.
    if (isDefaultCoordinates || i > 1) return;
    drawOverlayLine({
      layer,
      from: point,
      to: localPoints[(i + 2) % localPoints.length],
      color: i === 0 ? DC.D13 : DC.D24,
      size: 'app',
      zoom: scale,
      className: 'oblique-distance',
    });
  });

  // Point 1 is upstream left, so it is the red "left" pin, the same red the
  // right-hand canvas gives it; the other corners are the plain "point" pin.
  localPoints.forEach((point, i) => {
    if (isDefaultCoordinates && i !== 0) return;

    const g = drawPin({
      layer,
      tip: point,
      kind: i === 0 ? 'left' : 'point',
      label: `${i + 1}`,
      divisor: scale,
      bounds,
    });
    g.attr('cursor', 'move')
      .datum({ index: i })
      .call(dragPoint as any);
  });
};
