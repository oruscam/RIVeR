import { factor, Point } from '../../types';
import * as d3 from 'd3';
import { COLORS } from '../../constants/constants';
import { drawPin } from './drawPin';
import { drawOverlayLine, OVERLAY_STYLE } from './overlayStyle';

interface uavSvgProps {
  factor: factor;
  dirPoints: Point[];
  svgElement: SVGSVGElement;
  width: number;
  height: number;
}

/** The report's UAV calibration frame: the reference-length line and its 2 pins, at report size. */
export const uavSvg = ({ factor, dirPoints, svgElement, width, height }: uavSvgProps) => {
  const svg = d3.select(svgElement);
  svg.attr('width', width).attr('height', height).style('background-color', 'transparent');
  const layer = svg as unknown as d3.Selection<SVGGElement, unknown, null, undefined>;
  if (dirPoints.length < 2) return;

  const at = (p: Point) => ({ x: p.x / factor.x, y: p.y / factor.y });
  // Same line colour and pin kind as the UAV canvas (drawSections' 'uav' module).
  drawOverlayLine({
    layer,
    from: at(dirPoints[0]),
    to: at(dirPoints[1]),
    color: COLORS.LIGHT_BLUE,
    size: 'report',
  });

  dirPoints.slice(0, 2).forEach((point, i) => {
    drawPin({
      layer,
      tip: at(point),
      kind: 'point',
      label: `${i + 1}`,
      divisor: OVERLAY_STYLE.report.PIN_DIVISOR,
      bounds: { x: 0, y: 0, width, height },
    });
  });
};
