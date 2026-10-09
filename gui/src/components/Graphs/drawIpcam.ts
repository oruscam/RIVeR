import * as d3 from 'd3';
import { getOverlayColors, getPinColors, getResidualColors } from '../../helpers/getCSSVar';
import { ipcamErrorGrade } from '../../helpers/ipcamErrorGrade';
import { ipcamPointErrors } from '../../helpers/ipcamPointErrors';
import { IpcamPoint, SetPointPixelCoordinatesProps } from '../../store/ipcam/types';
import { drawPin, PinKind, updatePinLean } from './drawPin';
import { drawOverlayEllipse, drawOverlayLine, OVERLAY_STYLE } from './overlayStyle';
import { Bounds, visibleImageBounds } from './pinLean';
import { showMagnifier, hideMagnifier, NOT_MAGNIFIER } from './drawMagnifier';

interface drawIpcamProps {
  layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  uiLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  localPoints: IpcamPoint[] | null;
  factor: number;
  scale: number;
  position: { x: number; y: number };
  width: number;
  height: number;
  activePoint: number | null;
  setMousePressed: (value: boolean) => void;
  onSetPointInStore: (props: SetPointPixelCoordinatesProps) => void;
  onSetActivePoint: (index: number) => void;
  cameraSolution: any | null;
  imageSrc: string;
}

/** A point left out of the solve keeps a smaller pin. */
const MUTED_PIN_SCALE = 0.7;

const drawIpcam = ({
  layer,
  uiLayer,
  localPoints,
  factor,
  scale,
  position,
  width,
  height,
  activePoint,
  setMousePressed,
  onSetPointInStore,
  onSetActivePoint,
  cameraSolution,
  imageSrc,
}: drawIpcamProps) => {
  layer.selectAll(NOT_MAGNIFIER).remove();
  d3.selectAll(uiLayer.selectAll('*')).remove();

  // Draw each point
  if (localPoints === null) return;
  const bounds = visibleImageBounds({ width, height, position, scale }, 'image');

  const dragPoint = d3
    .drag<SVGGElement, { index: number }, { x: number; y: number }>()
    .subject((event) => ({ x: event.x, y: event.y }))
    .on('start', function (_event, d) {
      onSetActivePoint(d.index);
      d3.select(this.ownerSVGElement).style('cursor', 'default');
    })
    .on('drag', function (event, d) {
      if (activePoint !== d.index) return;
      setMousePressed(true);

      const x = Math.max(0, Math.min(width, event.x));
      const y = Math.max(0, Math.min(height, event.y));
      // Where this pin was actually drawn (this render's localPoints) — see
      // the equivalent note in drawOblique.ts's migration (Task 7).
      const origin = localPoints![d.index];

      d3.select<SVGGElement, { index: number }>(this).attr(
        'transform',
        `translate(${x - origin.x}, ${y - origin.y})`
      );
      updatePinLean(d3.select<SVGGElement, unknown>(this), { x, y }, scale, bounds);
      showMagnifier({
        layer,
        point: { x, y },
        imageSrc,
        imageWidth: width,
        imageHeight: height,
        coordinateFactor: factor,
        divisor: scale,
      });
    })
    .on('end', function (event, d) {
      if (activePoint !== d.index) return;

      setMousePressed(false);
      hideMagnifier(layer);
      d3.select(this.ownerSVGElement).style('cursor', null);

      const x = Math.max(0, Math.min(width, event.x));
      const y = Math.max(0, Math.min(height, event.y));

      onSetPointInStore({ index: d.index, point: { x: x * factor, y: y * factor } });
    });

  // No label — matches today's behaviour (ipcam control points have never
  // shown a number/letter). "active" (currently selected for editing) no
  // longer gets its own pin colour — see this plan's scoping decisions —
  // and instead gains an accent ring via drawPin's `active` flag.
  const getPinKind = (index: number, selected: boolean): PinKind => {
    if (activePoint === index) return 'point';
    return selected ? 'point' : 'muted';
  };

  const errors =
    cameraSolution === null
      ? new Map<number, number | null>()
      : new Map(ipcamPointErrors(localPoints, cameraSolution).map((e) => [e.index, e.error]));

  localPoints.forEach((point, index) => {
    if (cameraSolution === null && point.selected === false) return;
    if (point.wasEstablished === false && activePoint !== index) return;

    const error = errors.get(index) ?? null;
    if (cameraSolution !== null && point.selected) {
      drawEllipse(point, layer, factor, scale);
      drawResidual(point, error, layer, factor, scale);
    }

    const muted = !point.selected && activePoint !== index;
    const g = drawPin({
      layer,
      tip: point,
      kind: getPinKind(index, point.selected),
      divisor: muted ? scale / MUTED_PIN_SCALE : scale,
      bounds,
      active: activePoint === index,
    });
    g.attr('cursor', 'default')
      .datum({ index })
      .call(dragPoint as any);

    if (activePoint === index) {
      drawPointChip({ layer, pin: g, point, error: cameraSolution === null ? undefined : error, scale, bounds });
    }
  });
};

const transformPointCoordinates = (points: IpcamPoint[] | null, factor: number): IpcamPoint[] | null => {
  if (points === null) return null;
  return points.map((point) => ({ ...point, x: point.x / factor, y: point.y / factor }));
};

const drawEllipse = (
  point: IpcamPoint,
  layer: d3.Selection<SVGGElement, unknown, null, undefined>,
  factor: number,
  scale: number
) => {
  const { ellipse } = point;
  if (ellipse === null || ellipse === undefined) return;
  drawOverlayEllipse({
    layer,
    cx: ellipse.center[0] / factor,
    cy: ellipse.center[1] / factor,
    width: ellipse.width / factor,
    height: ellipse.height / factor,
    angle: ellipse.angle,
    color: getOverlayColors().line,
    size: 'app',
    zoom: scale,
    className: 'ipcam-ellipse',
  });
};

const drawResidual = (
  point: IpcamPoint,
  error: number | null,
  layer: d3.Selection<SVGGElement, unknown, null, undefined>,
  factor: number,
  scale: number
) => {
  const { projectedPoint, x, y } = point;
  if (projectedPoint === null || projectedPoint === undefined) return;
  const color = getResidualColors()[ipcamErrorGrade(error) ?? 'none'];
  const to = { x: projectedPoint[0] / factor, y: projectedPoint[1] / factor };

  drawOverlayLine({
    layer,
    from: { x, y },
    to,
    color,
    size: 'app',
    width: OVERLAY_STYLE.app.RESIDUAL_WIDTH,
    zoom: scale,
    className: 'ipcam-reprojection',
  });
  layer
    .append('circle')
    .attr('class', 'ipcam-reprojection-dot')
    .attr('cx', to.x)
    .attr('cy', to.y)
    .attr('r', (OVERLAY_STYLE.app.RESIDUAL_WIDTH * 1.4) / scale)
    .attr('fill', color)
    .attr('stroke', getPinColors().ink)
    .attr('stroke-width', 1 / scale)
    .attr('pointer-events', 'none');
};

/**
 * The active point's label and, after a solve, its error, on canvas chrome
 * beside the pin head. `error` undefined means "no solve yet": label only.
 */
const drawPointChip = ({
  layer,
  pin,
  point,
  error,
  scale,
  bounds,
}: {
  layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  pin: d3.Selection<SVGGElement, unknown, null, undefined>;
  point: IpcamPoint;
  error: number | null | undefined;
  scale: number;
  bounds: Bounds;
}) => {
  const d = (n: number) => n / scale;
  const headY = Number(pin.attr('data-head-y'));
  const chip = layer.append('g').attr('class', 'ipcam-chip').attr('pointer-events', 'none');
  const rect = chip.append('rect').attr('class', 'ipcam-chip-bg').attr('rx', d(6));
  const text = chip
    .append('text')
    .attr('class', 'ipcam-chip-text')
    .attr('font-size', d(12))
    .attr('dominant-baseline', 'central');
  const label = text.append('tspan').attr('font-weight', 600).text(point.label);

  const grade = ipcamErrorGrade(error);
  // The gap between label and error, which holds the grade dot; a dx is not part of the measured text.
  const gapBeforeError = typeof error === 'number' ? (grade ? d(16) : d(8)) : 0;
  if (typeof error === 'number') {
    text
      .append('tspan')
      .attr('dx', gapBeforeError)
      .text(`${error.toFixed(2)} px`);
  }

  // Laid out from the measured text, so the chip fits any label.
  const width = (text.node()?.getComputedTextLength() ?? 0) + gapBeforeError + d(20);
  const height = d(24);
  const gap = d(22);
  const fitsRight = point.x + gap + width <= bounds.x + bounds.width;
  const left = fitsRight ? point.x + gap : point.x - gap - width;
  const top = Math.max(bounds.y, Math.min(bounds.y + bounds.height - height, headY - height / 2));

  rect.attr('x', left).attr('y', top).attr('width', width).attr('height', height);
  text.attr('x', left + d(10)).attr('y', top + height / 2);

  if (grade) {
    chip
      .append('circle')
      .attr('cx', left + d(10) + (label.node()?.getComputedTextLength() ?? 0) + d(8))
      .attr('cy', top + height / 2)
      .attr('r', d(3.5))
      .attr('fill', getResidualColors()[grade]);
  }
};

export { drawIpcam, transformPointCoordinates };
