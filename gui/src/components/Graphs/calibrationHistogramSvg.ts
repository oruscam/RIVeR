import * as d3 from 'd3';
import { t } from 'i18next';

interface CalibrationHistogramRow {
  bin_center_px: number;
  count: number;
}

interface CalibrationHistogramSvgProps {
  svgElement: SVGSVGElement;
  rows: CalibrationHistogramRow[];
}

export const calibrationHistogramSvg = ({ svgElement, rows }: CalibrationHistogramSvgProps) => {
  const svg = d3.select(svgElement);
  svg.selectAll('*').remove();

  if (rows.length === 0) return;

  const width = +svg.attr('width');
  const height = +svg.attr('height');
  const margin = { top: 10, right: 14, bottom: 54, left: 50 };

  const xMin = d3.min(rows, (d) => d.bin_center_px)!;
  const xMax = d3.max(rows, (d) => d.bin_center_px)!;
  const yMax = d3.max(rows, (d) => d.count) ?? 1;

  const xScale = d3
    .scaleLinear()
    .domain([xMin, xMax])
    .range([margin.left, width - margin.right]);

  const yScale = d3
    .scaleLinear()
    .domain([0, yMax || 1])
    .range([height - margin.bottom, margin.top]);

  // Y gridlines
  svg
    .append('g')
    .attr('class', 'grid graph-grid')
    .attr('transform', `translate(${margin.left},0)`)
    .call(
      d3
        .axisLeft(yScale)
        .ticks(4)
        .tickSize(-(width - margin.left - margin.right))
        .tickFormat(() => '')
    )
    .attr('stroke-width', 0.5);

  // Bars
  const bandwidth = Math.max(1, (width - margin.left - margin.right) / rows.length - 2);

  svg
    .selectAll('.cal-hist-bar')
    .data(rows)
    .enter()
    .append('rect')
    .attr('class', 'cal-hist-bar bar-stroke-themed')
    .attr('x', (d) => xScale(d.bin_center_px) - bandwidth / 2)
    .attr('y', (d) => yScale(d.count))
    .attr('width', bandwidth)
    .attr('height', (d) => yScale(0) - yScale(d.count))
    .attr('fill', 'var(--primary-text-color)')
    .attr('fill-opacity', 0.75)
    .attr('stroke-width', 0.5);

  // X axis
  svg
    .append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(
      d3
        .axisBottom(xScale)
        .ticks(6)
        .tickFormat(d3.format('.2f') as (v: d3.NumberValue) => string)
    )
    .selectAll('.tick text')
    .style('font-size', '14px');

  // Y axis
  svg
    .append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(
      d3
        .axisLeft(yScale)
        .ticks(4)
        .tickFormat(d3.format('d') as (v: d3.NumberValue) => string)
    )
    .selectAll('.tick text')
    .style('font-size', '14px');

  // X axis label — position matches the app's other charts' axis-title convention
  // (bathimetrySvg.ts's stationLabel: centered on the plot area, sitting just above
  // the bottom edge). Shrinks itself if the rendered string would overflow this
  // chart's (responsive, sometimes narrow) width — the chart's canvas is far
  // smaller than the full-size Cross Sections/Report charts this convention was
  // designed for, so a fixed 22px can't be guaranteed to fit every container width.
  const xLabel = svg
    .append('text')
    .attr('class', 'x-axis-label graph-text')
    .attr('text-anchor', 'middle')
    .attr('x', width / 2 - margin.right)
    .attr('y', height - 5)
    .attr('font-size', '22px')
    .text(t('Calibration.histogramX'));

  // getBBox may fail if the element isn't yet attached to the DOM — same defensive
  // pattern as drawSections.ts's text-measurement code.
  try {
    const xLabelWidth = xLabel.node()?.getBBox().width ?? 0;
    const xAvailableWidth = width - 8;
    if (xLabelWidth > xAvailableWidth) {
      xLabel.attr('font-size', `${Math.max(12, Math.floor((22 * xAvailableWidth) / xLabelWidth))}px`);
    }
  } catch (_) {
    // getBBox unavailable — leave the label at its default font-size.
  }

  // Y axis label ("Count" — kept as a literal string, matching the pre-existing
  // unlocalized "Count" label this replaces; not introducing new i18n scope here).
  // Position/anchor copied from bathimetrySvg.ts's standalone-chart y-axis-label
  // convention (text-anchor: end, offset from center by margin.bottom, rotated).
  svg
    .append('text')
    .attr('class', 'y-axis-label graph-text')
    .attr('text-anchor', 'end')
    .attr('x', -height / 2 + margin.bottom)
    .attr('dy', '.75em')
    .attr('transform', 'rotate(-90)')
    .attr('font-size', '22px')
    .text('Count');
};
