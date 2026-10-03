import { factor, Point } from '../../types';
import * as d3 from 'd3';
import { COLORS } from '../../constants/constants';
import { getDistanceColors } from '../../helpers/getCSSVar';
import { drawPin } from './drawPin';

interface obliqueSvgProps {
  factor: factor;
  coordinates: Point[];
  distances: {
    d12: number;
    d23: number;
    d34: number;
    d41: number;
    d13: number;
    d24: number;
  };
  svgElement: SVGSVGElement;
  width: number;
  height: number;
  /** Pin size divisor; larger draws smaller pins and thinner lines (the report's small frame). */
  pinDivisor?: number;
}

export const obliqueSvg = ({
  factor,
  coordinates,
  svgElement,
  width,
  height,
  pinDivisor = 1.2,
}: obliqueSvgProps) => {
  const svg = d3.select(svgElement);

  svg.attr('width', width).attr('height', height).style('background-color', 'transparent');

  const DC = getDistanceColors();

  // Add lines between points
  for (let i = 0; i < coordinates.length - 1; i++) {
    svg
      .append('line')
      .attr('x1', coordinates[i].x / factor.x)
      .attr('y1', coordinates[i].y / factor.y)
      .attr('x2', coordinates[i + 1].x / factor.x)
      .attr('y2', coordinates[i + 1].y / factor.y)
      .attr('stroke', () => {
        switch (i) {
          case 0:
            return DC.D12;
            break;

          case 1:
            return DC.D23;
            break;

          case 2:
            return DC.D34;
            break;

          default:
            return COLORS.BLACK;
        }
      })
      .attr('stroke-width', 2.4 / pinDivisor);
  }

  if (coordinates.length > 1) {
    svg
      .append('line')
      .attr('x1', coordinates[coordinates.length - 1].x / factor.x)
      .attr('y1', coordinates[coordinates.length - 1].y / factor.y)
      .attr('x2', coordinates[0].x / factor.x)
      .attr('y2', coordinates[0].y / factor.y)
      .attr('stroke', DC.D14)
      .attr('stroke-width', 2.4 / pinDivisor);

    svg
      .append('line')
      .attr('x1', coordinates[0].x / factor.x)
      .attr('y1', coordinates[0].y / factor.y)
      .attr('x2', coordinates[2].x / factor.x)
      .attr('y2', coordinates[2].y / factor.y)
      .attr('stroke', DC.D13)
      .attr('stroke-width', 2.4 / pinDivisor);

    svg
      .append('line')
      .attr('x1', coordinates[1].x / factor.x)
      .attr('y1', coordinates[1].y / factor.y)
      .attr('x2', coordinates[3].x / factor.x)
      .attr('y2', coordinates[3].y / factor.y)
      .attr('stroke', DC.D24)
      .attr('stroke-width', 2.4 / pinDivisor);
  }

  // Every corner is the plain blue "point" pin, at the report's fixed
  // resizeFactor of 1.2 — matches drawOblique.ts's own migration (point 0
  // no longer gets its own red accent).
  coordinates.forEach((point, i) => {
    drawPin({
      layer: svg as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      tip: { x: point.x / factor.x, y: point.y / factor.y },
      kind: 'point',
      label: `${i + 1}`,
      divisor: pinDivisor,
    });
  });
};
