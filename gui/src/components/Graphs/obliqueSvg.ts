import { factor, Point } from '../../types';
import * as d3 from 'd3';
import { getDistanceColors } from '../../helpers/getCSSVar';
import { drawPin } from './drawPin';
import { drawOverlayLine, OVERLAY_STYLE } from './overlayStyle';

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
}

/** The report's oblique calibration frame: the 6 distances and the 4 control points, at report size. */
export const obliqueSvg = ({ factor, coordinates, svgElement, width, height }: obliqueSvgProps) => {
  const svg = d3.select(svgElement);
  svg.attr('width', width).attr('height', height).style('background-color', 'transparent');
  const layer = svg as unknown as d3.Selection<SVGGElement, unknown, null, undefined>;

  // getCSSVar reads the report root's light theme while the report is mounted.
  const DC = getDistanceColors();
  const at = (p: Point) => ({ x: p.x / factor.x, y: p.y / factor.y });
  const pairs: [number, number, string][] = [
    [0, 1, DC.D12],
    [1, 2, DC.D23],
    [2, 3, DC.D34],
    [3, 0, DC.D14],
    [0, 2, DC.D13],
    [1, 3, DC.D24],
  ];
  pairs.forEach(([a, b, color]) => {
    if (!coordinates[a] || !coordinates[b]) return;
    drawOverlayLine({ layer, from: at(coordinates[a]), to: at(coordinates[b]), color, size: 'report' });
  });

  // Point 1 is upstream left: the red "left" pin, as on the Oblique canvas.
  coordinates.forEach((point, i) => {
    drawPin({
      layer,
      tip: at(point),
      kind: i === 0 ? 'left' : 'point',
      label: `${i + 1}`,
      divisor: OVERLAY_STYLE.report.PIN_DIVISOR,
      bounds: { x: 0, y: 0, width, height },
    });
  });
};
