import * as d3 from 'd3';
import { MARKS } from '../../constants/constants';
import { getDistanceColors } from '../../helpers/getCSSVar';
import { drawPin } from './drawPin';
import { showMagnifier, hideMagnifier } from './drawMagnifier';

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
  isDefaultCoordinates,
  imageSrc,
  imageWidth,
  imageHeight,
}: drawObliqueProps) => {
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

  layer.selectAll('*').remove();
  uiLayer.selectAll('*').remove();

  // Dibuja líneas y pins — colors read from current theme's CSS variables
  const DC = getDistanceColors();

  localPoints.forEach((point, i) => {
    if (isDefaultCoordinates && i !== 0) return;
    // Líneas de los lados
    layer
      .append('line')
      .attr('x1', point.x)
      .attr('y1', point.y)
      .attr('x2', localPoints[(i + 1) % localPoints.length].x)
      .attr('y2', localPoints[(i + 1) % localPoints.length].y)
      .attr('stroke', () => {
        switch (i) {
          case 0:
            return DC.D12;
          case 1:
            return DC.D23;
          case 2:
            return DC.D34;
          case 3:
            return DC.D14;
          default:
            return DC.D12;
        }
      })
      .attr('stroke-width', MARKS.STROKE_WIDTH / scale)
      .attr('pointer-events', 'none');

    if (isDefaultCoordinates) return;
    // Diagonales
    layer
      .append('line')
      .attr('x1', point.x)
      .attr('y1', point.y)
      .attr('x2', localPoints[(i + 2) % localPoints.length].x)
      .attr('y2', localPoints[(i + 2) % localPoints.length].y)
      .attr('stroke', () => {
        switch (i) {
          case 2:
            return DC.D13;
          case 3:
            return DC.D24;
          default:
            return DC.D13;
        }
      })
      .attr('stroke-width', MARKS.STROKE_WIDTH / scale)
      .attr('pointer-events', 'none');
  });

  // Every corner is the plain blue "point" pin — point 0 no longer gets its
  // own red accent (see this plan's scoping decisions).
  localPoints.forEach((point, i) => {
    if (isDefaultCoordinates && i !== 0) return;

    const g = drawPin({ layer, tip: point, kind: 'point', label: `${i + 1}`, divisor: scale });
    g.attr('cursor', 'move')
      .datum({ index: i })
      .call(dragPoint as any);
  });
};
