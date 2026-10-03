import * as d3 from 'd3';
import { factor } from '../../types';
import { IpcamPoint } from '../../store/ipcam/types';
import { COLORS } from '../../constants/constants';
import { drawPin } from './drawPin';

interface ipcamSvgProps {
  factor: factor;
  points: IpcamPoint[];
  svgElement: SVGSVGElement;
  width: number;
  height: number;
  /** Pin size divisor; larger draws smaller pins (the report's small frame). */
  pinDivisor?: number;
}

export const ipcamSvg = ({ factor, points, svgElement, width, height, pinDivisor = 1.2 }: ipcamSvgProps) => {
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
        clippedGroup
          .append('line')
          .attr('x1', x / factor.x)
          .attr('y1', y / factor.y)
          .attr('x2', projectedPoint[0] / factor.x)
          .attr('y2', projectedPoint[1] / factor.y)
          .attr('stroke', COLORS.RED)
          .attr('stroke-width', 1);
      }
    }

    if (x && y) {
      drawPin({
        layer: clippedGroup, // already a Selection<SVGGElement, ...> — no cast needed
        tip: { x: x / factor.x, y: y / factor.y },
        kind: selected ? 'point' : 'muted',
        divisor: pinDivisor,
      });
    }
  }
};
