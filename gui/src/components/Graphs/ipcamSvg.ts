import * as d3 from 'd3';
import { factor } from '../../types';
import { IpcamPoint } from '../../store/ipcam/types';
import { getOverlayColors, getPinColors, getResidualColors } from '../../helpers/getCSSVar';
import { ipcamErrorGrade } from '../../helpers/ipcamErrorGrade';
import { ipcamPointErrors } from '../../helpers/ipcamPointErrors';
import { drawPin } from './drawPin';
import { drawOverlayEllipse, drawOverlayLine, OVERLAY_STYLE } from './overlayStyle';

interface ipcamSvgProps {
  factor: factor;
  points: IpcamPoint[];
  svgElement: SVGSVGElement;
  width: number;
  height: number;
  /** The stored solve, to grade each residual. Without it residuals draw in the neutral line colour. */
  solution?: { reprojectionErrors: number[]; pointIndices?: number[] };
}

export const ipcamSvg = ({ factor, points, svgElement, width, height, solution }: ipcamSvgProps) => {
  const svg = d3.select(svgElement);

  svg.attr('width', width).attr('height', height).style('background-color', 'transparent');

  // Create a clip-path
  svg
    .append('defs')
    .append('clipPath')
    .attr('id', 'clip')
    .append('rect')
    .attr('width', width)
    .attr('height', height);

  const clippedGroup = svg.append('g').attr('clip-path', 'url(#clip)');

  const errors = solution
    ? new Map(ipcamPointErrors(points, solution).map((e) => [e.index, e.error]))
    : new Map<number, number | null>();
  const residual = getResidualColors();

  for (let i = 0; i < points.length; i++) {
    const { ellipse, projectedPoint, x, y, selected } = points[i];

    if (ellipse && selected) {
      drawOverlayEllipse({
        layer: clippedGroup,
        cx: ellipse.center[0] / factor.x,
        cy: ellipse.center[1] / factor.y,
        width: ellipse.width / factor.x,
        height: ellipse.height / factor.y,
        angle: ellipse.angle,
        color: getOverlayColors().line,
        size: 'report',
      });
    }

    if (projectedPoint && selected && x && y) {
      const color = residual[ipcamErrorGrade(errors.get(i) ?? null) ?? 'none'];
      const to = { x: projectedPoint[0] / factor.x, y: projectedPoint[1] / factor.y };
      drawOverlayLine({
        layer: clippedGroup,
        from: { x: x / factor.x, y: y / factor.y },
        to,
        color,
        size: 'report',
        width: OVERLAY_STYLE.report.RESIDUAL_WIDTH,
      });
      clippedGroup
        .append('circle')
        .attr('cx', to.x)
        .attr('cy', to.y)
        .attr('r', OVERLAY_STYLE.report.RESIDUAL_WIDTH * 1.4)
        .attr('fill', color)
        .attr('stroke', getPinColors().ink)
        .attr('stroke-width', 0.5);
    }

    if (x && y) {
      drawPin({
        layer: clippedGroup, // already a Selection<SVGGElement, ...> — no cast needed
        tip: { x: x / factor.x, y: y / factor.y },
        kind: selected ? 'point' : 'muted',
        divisor: OVERLAY_STYLE.report.PIN_DIVISOR,
        bounds: { x: 0, y: 0, width, height },
      });
    }
  }
};
