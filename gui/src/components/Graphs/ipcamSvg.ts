import * as d3 from 'd3';
import { factor } from '../../types';
import { IpcamPoint } from '../../store/ipcam/types';
import { COLORS } from '../../constants/constants';
import { drawPin } from './drawPin';
import { drawOverlayLine, OVERLAY_STYLE } from './overlayStyle';

interface ipcamSvgProps {
  factor: factor;
  points: IpcamPoint[];
  svgElement: SVGSVGElement;
  width: number;
  height: number;
}

export const ipcamSvg = ({ factor, points, svgElement, width, height }: ipcamSvgProps) => {
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

  for (let i = 0; i < points.length; i++) {
    const { ellipse, projectedPoint, x, y, selected } = points[i];

    if (ellipse && selected) {
      clippedGroup
        .append('ellipse')
        .attr('cx', ellipse.center[0] / factor.x)
        .attr('cy', ellipse.center[1] / factor.y)
        .attr('rx', ellipse.width / factor.x)
        .attr('ry', ellipse.height / factor.y)
        .attr(
          'transform',
          `rotate(${ellipse.angle}, ${ellipse.center[0] / factor.x}, ${ellipse.center[1] / factor.y})`
        )
        .attr('fill', COLORS.ELLIPSE.FILL)
        .attr('stroke', COLORS.ELLIPSE.STROKE)
        .attr('stroke-width', 1);
    }

    if (projectedPoint && selected) {
      clippedGroup
        .append('circle')
        .attr('cx', projectedPoint[0] / factor.x)
        .attr('cy', projectedPoint[1] / factor.y)
        .attr('r', 2)
        .attr('fill', COLORS.RED);

      if (x && y) {
        drawOverlayLine({
          layer: clippedGroup,
          from: { x: x / factor.x, y: y / factor.y },
          to: { x: projectedPoint[0] / factor.x, y: projectedPoint[1] / factor.y },
          color: COLORS.RED,
          size: 'report',
          thin: true,
        });
      }
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
