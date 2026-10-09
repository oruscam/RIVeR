import * as d3 from 'd3';
import { getOverlayColors, getPinColors } from '../../helpers/getCSSVar';
import cam_marker from '../../assets/cam_marker.svg';
import { scaleBar } from './scaleBar';
import { OVERLAY_HALO_COLOR } from './overlayStyle';
import { coordTick } from './pointsMapFormat';

interface PointsMapSvgProps {
  svgElement: SVGSVGElement;
  points: {
    X: number;
    Y: number;
    selected: boolean;
  }[];
  activePoint: number | undefined;
  orthoImagePath: string | undefined;
  cameraPosition: number[] | undefined;
  orthoExtent: number[] | undefined;
  unitSistem?: string;
}

export const pointsMapSvg = ({
  svgElement,
  points,
  activePoint,
  orthoImagePath,
  cameraPosition,
  orthoExtent,
  unitSistem,
}: PointsMapSvgProps) => {
  const svg = d3.select(svgElement);

  const width = +svg.attr('width');
  const height = +svg.attr('height');

  const margin = {
    left: 10,
    top: 10,
    right: 10,
    bottom: 10,
  };

  // We need to unify all the points in one array.
  let xPoints = [
    ...points.map((d) => d.X),
    // cameraPosition?.[0] ?? 0,
    orthoExtent?.[0] ?? 0,
    orthoExtent?.[1] ?? 0,
  ].filter((d) => d !== 0 && d !== undefined);

  let yPoints = [
    ...points.map((d) => d.Y),
    // cameraPosition?.[1] ?? 0,
    orthoExtent?.[2] ?? 0,
    orthoExtent?.[3] ?? 0,
  ].filter((d) => d !== 0 && d !== undefined);

  let xScale = d3
    .scaleLinear()
    .domain([d3.min(xPoints), d3.max(xPoints)])
    .range([margin.left, width - margin.right]);

  let yScale = d3
    .scaleLinear()
    .domain([d3.min(yPoints), d3.max(yPoints)])
    .range([height - margin.bottom, margin.top]);

  if (cameraPosition && orthoExtent && orthoImagePath && 1 === 1) {
    drawAnalizeResult(
      points,
      activePoint,
      cameraPosition,
      orthoImagePath,
      orthoExtent,
      margin,
      width,
      height,
      svg,
      xScale,
      yScale,
      unitSistem
    );
    return;
  } else {
    // Ticks on all edges
    const numTicks = 4;
    const tickLength = 15;

    svg
      .selectAll('line.x-tick-top')
      .data(xScale.ticks(numTicks))
      .enter()
      .append('line')
      .attr('class', 'x-tick-top')
      .attr('x1', (d) => xScale(d))
      .attr('y1', 0)
      .attr('x2', (d) => xScale(d))
      .attr('y2', tickLength)
      .classed('points-map-frame', true);

    svg
      .selectAll('line.x-tick-bottom')
      .data(xScale.ticks(numTicks))
      .enter()
      .append('line')
      .attr('class', 'x-tick-bottom')
      .attr('x1', (d) => xScale(d))
      .attr('y1', height - tickLength)
      .attr('x2', (d) => xScale(d))
      .attr('y2', height)
      .classed('points-map-frame', true);

    svg
      .selectAll('line.y-tick-left')
      .data(yScale.ticks(numTicks))
      .enter()
      .append('line')
      .attr('class', 'y-tick-left')
      .attr('x1', 0)
      .attr('y1', (d) => yScale(d))
      .attr('x2', tickLength)
      .attr('y2', (d) => yScale(d))
      .classed('points-map-frame', true);

    svg
      .selectAll('line.y-tick-right')
      .data(yScale.ticks(numTicks))
      .enter()
      .append('line')
      .attr('class', 'y-tick-right')
      .attr('x1', width - tickLength)
      .attr('y1', (d) => yScale(d))
      .attr('x2', width)
      .attr('y2', (d) => yScale(d))
      .classed('points-map-frame', true);

    // Add white border
    svg
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .classed('points-map-frame', true)
      .attr('stroke-width', 2);
  }

  drawPoints(points, activePoint, margin, svg, xScale, yScale);
};

const drawPoints = (
  points: { X: number; Y: number; selected: boolean }[],
  activePoint: number | undefined,
  margin: { left: number; top: number; right: number; bottom: number },
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>
) => {
  // Ajustar los dominios de las escalas para incluir un margen adicional
  const xDomain = xScale.domain();
  const yDomain = yScale.domain();

  const xPadding = (xDomain[1] - xDomain[0]) * 0.05;
  const yPadding = (yDomain[1] - yDomain[0]) * 0.05;

  xScale.domain([xDomain[0] - xPadding, xDomain[1] + xPadding]);
  yScale.domain([yDomain[0] - yPadding, yDomain[1] + yPadding]);

  const overlay = getOverlayColors();
  const pins = getPinColors();
  const hidden = 'transparent';
  const crossColor = (d: { selected: boolean }, i: number) =>
    i === activePoint ? overlay.line : d.selected === false ? hidden : pins.point;
  const haloColor = (d: { selected: boolean }, i: number) =>
    i === activePoint || d.selected ? OVERLAY_HALO_COLOR : hidden;
  const crossWidth = (_d: unknown, i: number) => (i === activePoint ? 2.5 : 2);

  // One stroke of every cross; `dir` is +1 for the falling stroke, -1 for the rising one.
  const stroke = (cls: string, dir: 1 | -1, color: typeof crossColor, strokeWidth: number | typeof crossWidth) =>
    svg
      .selectAll(`line.${cls}`)
      .data(points)
      .enter()
      .append('line')
      .attr('class', cls)
      .attr('x1', (d) => margin.left + xScale(d.X) - 5)
      .attr('y1', (d) => margin.top + yScale(d.Y) - 5 * dir)
      .attr('x2', (d) => margin.left + xScale(d.X) + 5)
      .attr('y2', (d) => margin.top + yScale(d.Y) + 5 * dir)
      .attr('stroke', color)
      .attr('stroke-width', strokeWidth as any)
      .attr('stroke-linecap', 'round');

  // Halos first, so every coloured stroke sits on top of both.
  const halo1 = stroke('cross-halo-a', 1, haloColor, 4);
  const halo2 = stroke('cross-halo-b', -1, haloColor, 4);
  const line1 = stroke('cross-a', 1, crossColor, crossWidth);
  const line2 = stroke('cross-b', -1, crossColor, crossWidth);

  return { line1, line2, halo1, halo2 };
};

const drawAnalizeResult = (
  points: { X: number; Y: number; selected: boolean }[],
  activePoint: number | undefined,
  cameraPosition: number[],
  orthoImagePath: string,
  orthoExtent: number[],
  margin: { left: number; top: number; right: number; bottom: number },
  width: number,
  height: number,
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  unitSistem?: string
) => {
  margin.left = 62;
  margin.bottom = 26;
  margin.right = 8;
  margin.top = 8;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  xScale.range([0, innerWidth]);
  yScale.range([innerHeight, 0]);

  // Clip path para no exeder los ejes
  // Este es usado por la imagen y los puntos

  svg
    .append('defs')
    .append('clipPath')
    .attr('id', 'clip')
    .append('rect')
    .attr('width', innerWidth)
    .attr('height', innerHeight)
    .attr('x', margin.left)
    .attr('y', margin.top);

  // Calcula las coordenadas y dimensiones de la imagen
  const x = orthoExtent[0];
  const y = orthoExtent[3];
  const imgWidth = orthoExtent[1] - x;
  const imgHeight = orthoExtent[2] - y;

  // Append image to the container
  const image = svg
    .append('image')
    .attr('xlink:href', orthoImagePath)
    .attr('x', margin.left + xScale(orthoExtent[0]))
    .attr('y', margin.top + yScale(orthoExtent[3]))
    .attr('width', xScale(x + imgWidth) - xScale(x))
    .attr('height', Math.abs(yScale(y + imgHeight) - yScale(y)))
    .attr('clip-path', 'url(#clip)');

  scaleBar(
    orthoExtent,
    svg.node() as SVGSVGElement,
    xScale,
    yScale,
    'clip',
    margin.left,
    margin.top,
    unitSistem,
    'panel'
  );

  // Append the camera icon
  const xOffset = -15;
  const yOffset = -15;
  const cameraCircle = svg
    .append('svg:image')
    .attr('xlink:href', cam_marker)
    .attr('width', 30)
    .attr('height', 30)
    .attr('x', margin.left + xScale(cameraPosition[0]) + xOffset)
    .attr('y', margin.top + yScale(cameraPosition[1]) + yOffset)
    .attr('clip-path', 'url(#clip)')
    .on('mouseover', function (event) {
      d3.select(this).style('cursor', 'pointer');
      const [x, y] = d3.pointer(event);
      const tooltip = svg
        .append('text')
        .attr('id', 'tooltip')
        .attr('x', x + 10)
        .attr('y', y - 10)
        .classed('points-map-tip', true);

      tooltip
        .append('tspan')
        .attr('x', x + 10)
        .attr('dy', '1.2em')
        .text(`x: ${cameraPosition[0].toFixed(2)}`);

      tooltip
        .append('tspan')
        .attr('x', x + 10)
        .attr('dy', '1.2em')
        .text(`y: ${cameraPosition[1].toFixed(2)}`);

      tooltip
        .append('tspan')
        .attr('x', x + 10)
        .attr('dy', '1.2em')
        .text(`z: ${cameraPosition[2].toFixed(2)}`);
    })
    .on('mouseout', function () {
      d3.select(this).style('cursor', 'default');
      svg.select('#tooltip').remove();
    });

  const makeXAxis = (scale: d3.ScaleLinear<number, number>) =>
    d3
      .axisBottom(scale)
      .ticks(3)
      .tickSizeOuter(0)
      .tickFormat((d) => coordTick(d as number));
  const makeYAxis = (scale: d3.ScaleLinear<number, number>) =>
    d3
      .axisLeft(scale)
      .ticks(3)
      .tickSizeOuter(0)
      .tickFormat((d) => coordTick(d as number));

  // Cross Points
  const { line1, line2, halo1, halo2 } = drawPoints(points, activePoint, margin, svg, xScale, yScale);

  // Add zoom and pan functionality
  const zoom = d3
    .zoom()
    .scaleExtent([0, 5])
    // .translateExtent([[0, 0], [width, height]])
    .translateExtent([
      [-width, -height],
      [2 * width, 2 * height],
    ])
    .on('zoom', zoomed)
    .on('start', () => svg.style('cursor', 'move'))
    .on('end', () => svg.style('cursor', 'default'));

  // Create a transparent rectangle to capture zoom events
  svg
    .append('rect')
    .attr('width', innerWidth)
    .attr('height', innerHeight)
    .attr('x', margin.left)
    .attr('y', margin.top)
    .style('fill', 'none')
    .style('pointer-events', 'all')
    .call(zoom as any);

  function zoomed(event: any) {
    const transform = event.transform;
    const newXScale = transform.rescaleX(xScale);
    const newYScale = transform.rescaleY(yScale);

    image
      .attr('xlink:href', orthoImagePath)
      .attr('x', margin.left + newXScale(orthoExtent[0]))
      .attr('y', margin.top + newYScale(orthoExtent[3]))
      .attr('width', newXScale(x + imgWidth) - newXScale(x))
      .attr('height', Math.abs(newYScale(y + imgHeight) - newYScale(y)))
      .attr('clip-path', 'url(#clip)');

    cameraCircle
      .attr('x', margin.left + newXScale(cameraPosition[0]) + xOffset)
      .attr('y', margin.top + newYScale(cameraPosition[1]) + yOffset);

    [line1, halo1].forEach((line) =>
      line
        .attr('x1', (d) => margin.left + newXScale(d.X) - 5)
        .attr('y1', (d) => margin.top + newYScale(d.Y) - 5)
        .attr('x2', (d) => margin.left + newXScale(d.X) + 5)
        .attr('y2', (d) => margin.top + newYScale(d.Y) + 5)
        .attr('clip-path', 'url(#clip)')
    );

    [line2, halo2].forEach((line) =>
      line
        .attr('x1', (d) => margin.left + newXScale(d.X) - 5)
        .attr('y1', (d) => margin.top + newYScale(d.Y) + 5)
        .attr('x2', (d) => margin.left + newXScale(d.X) + 5)
        .attr('y2', (d) => margin.top + newYScale(d.Y) - 5)
        .attr('clip-path', 'url(#clip)')
    );

    svg.select<SVGGElement>('.x-axis').call(makeXAxis(newXScale));
    svg.select<SVGGElement>('.y-axis').call(makeYAxis(newYScale));

    scaleBar(
      orthoExtent,
      svg.node() as SVGSVGElement,
      newXScale,
      newYScale,
      'clip',
      margin.left,
      margin.top,
      unitSistem,
      'panel'
    );
  }

  svg
    .append('g')
    .attr('class', 'x-axis points-map-axis')
    .attr('transform', `translate(${margin.left}, ${height - margin.bottom})`)
    .call(makeXAxis(xScale));

  svg
    .append('g')
    .attr('class', 'y-axis points-map-axis')
    .attr('transform', `translate(${margin.left}, ${margin.top})`)
    .call(makeYAxis(yScale));
};
