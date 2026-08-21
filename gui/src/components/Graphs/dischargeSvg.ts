import * as d3 from 'd3';
import { GRAPHS, UNITS } from '../../constants/constants';
import { generateYAxisTicks } from '../../helpers';
import { t } from 'i18next';

interface CreateDischargeChartProps {
  sizes: {
    width: number;
    height: number;
    margin: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    graphHeight: number;
  };
  SVGElement: SVGSVGElement;
  distance: number[];
  Q: (number | null)[];
  /** Active technique's identity color — bars are colored by which technique is active,
   *  not by discharge-portion thresholds. */
  color: string;
  isReport?: boolean;
  xScale: d3.ScaleLinear<number, number>;
  unitSistem?: string;
}

export const createDischargeChart = ({
  SVGElement,
  distance,
  Q,
  color,
  sizes,
  isReport = false,
  xScale,
  unitSistem = 'si',
}: CreateDischargeChartProps) => {
  const isImperial = unitSistem === 'imperial';
  const flowUnit = isImperial ? UNITS.IMPERIAL.FLOW : UNITS.SI.FLOW;
  const svg = d3.select(SVGElement);
  const { width, margin, graphHeight } = sizes;

  const bandwidth = (width - margin.left - 40 - margin.right) / distance.length - GRAPHS.BAR_PADDING;

  const yScale = d3
    .scaleLinear()
    .domain([
      d3.min(Q.filter((d) => d !== null))! > 0 ? 0 : d3.min(Q.filter((d) => d !== null))!,
      d3.max(Q.filter((d) => d !== null))!,
    ])
    .range([graphHeight + (isReport ? -15 : -50), margin.top + (isReport ? 25 : 25)]);

  // Create and add Y ticks

  const ticks = generateYAxisTicks(Q);

  const yAxis = d3.axisLeft(yScale).tickValues(ticks);

  svg
    .append('g')
    .attr('class', 'y-axis y-axis-1')
    .attr('transform', `translate(${margin.left + GRAPHS.GRID_Y_OFFSET_ALL_IN_ONE},0)`)
    .call(yAxis)
    .selectAll('.tick text')
    .style('font-size', '14px');

  // Create and add Y gridlines

  const makeYGridlines = () => d3.axisLeft(yScale).tickValues(ticks).tickFormat(d3.format('.2f'));

  svg
    .append('g')
    .attr('class', 'grid graph-grid')
    .attr('transform', `translate(${margin.left + GRAPHS.GRID_Y_OFFSET_ALL_IN_ONE},0)`)
    .call(
      makeYGridlines()
        .tickSize(-width + margin.left + margin.right * 2)
        .tickFormat('' as any)
    )
    .attr('stroke-width', 0.5);

  const filteredQ = Q.map((d, i) => ({
    distance: distance[i],
    discharge: d,
  })).filter((d) => d.discharge !== null);

  // Append Bars — solid fill in the active technique's identity color
  svg
    .selectAll('.bar')
    .data(filteredQ)
    .enter()
    .append('rect')
    .attr('class', 'bar bar-stroke-themed')
    .attr('data-x', (d) => d.distance.toFixed(2))
    .attr('x', (d) => xScale(d.distance) - bandwidth / 2)
    .attr('y', (d) => yScale(Math.max(0, d.discharge!)))
    .attr('height', (d) => Math.abs(yScale(d.discharge!) - yScale(0)))
    .attr('width', bandwidth)
    .attr('stroke-width', 0.5)
    .attr('fill', color)
    .attr('opacity', 0.85);

  // Label
  const dischargeLabel = svg
    .append('text')
    .attr('class', 'y-axis-label graph-text')
    .attr('text-anchor', 'middle')
    .attr('x', -graphHeight + (isReport ? 75 : 115))
    .attr('y', margin.left - 30)
    .attr('transform', 'rotate(-90)')
    .attr('font-size', '22px');
  dischargeLabel.append('tspan').text(t('Graphs.discharge'));
  dischargeLabel
    .append('tspan')
    .attr('font-size', '14px')
    .attr('opacity', '0.7')
    .attr('dx', '10')
    .text(`${flowUnit}`);
};
