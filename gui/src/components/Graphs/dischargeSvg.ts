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
  isReport?: boolean;
  xScale: d3.ScaleLinear<number, number>;
  unitSistem?: string;
  /** Station index currently hovered anywhere in the Results panel, so the bars
   *  dim in sympathy with the velocity chart and the grid. */
  hoveredStation?: number | null;
}

export const createDischargeChart = ({
  SVGElement,
  distance,
  Q,
  sizes,
  isReport = false,
  xScale,
  unitSistem = 'si',
  hoveredStation = null,
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

  // Keep the station index: `filteredQ` drops null stations, so its array
  // position is not the station number the rest of the panel hovers by.
  const filteredQ = Q.map((d, i) => ({
    distance: distance[i],
    discharge: d,
    index: i,
  })).filter((d) => d.discharge !== null);

  // Brightness carries each station's share of the total, so the distribution
  // reads at a glance without spending colour on it — colour is reserved for
  // technique identity elsewhere in the panel. Scaled against the largest
  // contribution rather than the total, so the peak always reaches full
  // strength whatever the station count.
  const maxAbsQ = Math.max(...filteredQ.map((d) => Math.abs(d.discharge!)), 0);
  const shareOpacity = (q: number) => 0.25 + 0.75 * (maxAbsQ > 0 ? Math.abs(q) / maxAbsQ : 0);

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
    .attr('fill', 'var(--primary-text-color)')
    .attr('opacity', (d) => {
      const base = shareOpacity(d.discharge!);
      if (hoveredStation === null) return base;
      return d.index === hoveredStation ? 1 : base * 0.35;
    });

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
