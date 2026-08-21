import * as d3 from 'd3';
import { GRAPHS, UNIT_CONVERSIONS, UNITS } from '../../constants/constants';
import { generateYAxisTicks } from '../../helpers';
import { getCSSVar } from '../../helpers/getCSSVar';
import { Technique } from '../../store/section/types';
import './graphs.css';
import { t } from 'i18next';

export interface VelocitySeriesPoint {
  x: number;
  v: number | null;
  interp: boolean;
  i: number;
  quality: number | null;
  /** STIV only: was this station's velocity derived from a user-set angle
   *  rather than the automatic fit. Always false for LSPIV/iWave. */
  tuned: boolean;
}

export interface VelocityBand {
  minus: (number | null)[];
  plus: (number | null)[];
}

export interface VelocitySeries {
  key: Technique;
  label: string;
  color: string;
  isActive: boolean;
  points: VelocitySeriesPoint[];
  stdBand?: VelocityBand;
  percentileBand?: VelocityBand;
  showQuality?: boolean;
}

interface CreateVelocityChartProps {
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
  xScale: d3.ScaleLinear<number, number>;
  series: VelocitySeries[];
  isReport?: boolean;
  unitSistem?: string;
  hoveredStation?: number | null;
}

/**
 * Unified velocity-profile panel: every visible technique renders with the same line
 * weight/marker geometry, differentiated only by color — the active technique in the theme
 * foreground color at full opacity, inactive ones in their own identity color at reduced
 * opacity. Uncertainty bands and iWave's quality shading are opt-in (goal 4) and controlled
 * from TechniqueLegend, not from clickable swatches in the chart itself.
 *
 * Hover/tooltip is NOT handled here — AllInOne.tsx owns one combined overlay + tooltip
 * spanning all three stacked panels (Q, velocity, stage), so there's a single hover
 * experience for the whole chart instead of a tooltip per panel.
 */
export const createVelocityChart = ({
  SVGElement,
  xScale,
  series,
  sizes,
  isReport = false,
  unitSistem = 'si',
  hoveredStation = null,
}: CreateVelocityChartProps) => {
  const isImperial = unitSistem === 'imperial';
  const velocityFactor = isImperial ? UNIT_CONVERSIONS.M_TO_FT : 1;
  const unitLabel = isImperial ? UNITS.IMPERIAL.VELOCITY : UNITS.SI.VELOCITY;
  const svg = d3.select(SVGElement);
  const { margin, graphHeight, width } = sizes;

  const allValues = series.flatMap((s) => s.points.map((p) => p.v).filter((v): v is number => v !== null));
  const bandValues = series.flatMap((s) =>
    [
      ...(s.stdBand ? [...s.stdBand.minus, ...s.stdBand.plus] : []),
      ...(s.percentileBand ? [...s.percentileBand.minus, ...s.percentileBand.plus] : []),
    ].filter((v): v is number => v !== null)
  );
  const domainValues = [...allValues, ...bandValues].map((v) => v * velocityFactor);
  const minDomain = domainValues.length ? Math.min(...domainValues) : 0;
  const maxDomain = domainValues.length ? Math.max(...domainValues) : 1;

  const yScale = d3
    .scaleLinear()
    .domain([minDomain, maxDomain])
    .range([graphHeight * 2 + (isReport ? -40 : -50), graphHeight + (isReport ? 30 : -10)]);

  const ticks = generateYAxisTicks(allValues, minDomain, maxDomain);
  const yAxis = d3.axisLeft(yScale).tickValues(ticks).tickFormat(d3.format('.2f'));

  svg
    .append('g')
    .attr('class', 'y-axis y-axis-2')
    .attr('transform', `translate(${margin.left + GRAPHS.GRID_Y_OFFSET_ALL_IN_ONE},0)`)
    .call(yAxis)
    .selectAll('.tick text')
    .style('font-size', '14px');

  const makeYGridlines = () => d3.axisLeft(yScale).tickValues(ticks);
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

  // ---- Uncertainty bands (behind lines, opt-in per technique, tied to that technique's
  // own identity color rather than a fixed hue). Percentile is drawn fainter/wider than
  // std so both can be told apart when a technique shows both at once. ----
  const drawBand = (s: VelocitySeries, band: VelocityBand, opacity: number) => {
    const pts = s.points.map((p, idx) => ({ x: p.x, lo: band.minus[idx], hi: band.plus[idx] }));
    const area = d3
      .area<{ x: number; lo: number | null; hi: number | null }>()
      .defined((d) => d.lo !== null && d.hi !== null)
      .x((d) => xScale(d.x))
      .y0((d) => yScale((d.lo as number) * velocityFactor))
      .y1((d) => yScale((d.hi as number) * velocityFactor));
    svg.append('path').datum(pts).attr('fill', s.color).attr('opacity', opacity).attr('d', area);
  };
  series.forEach((s) => {
    if (s.percentileBand) drawBand(s, s.percentileBand, 0.1);
    if (s.stdBand) drawBand(s, s.stdBand, 0.22);
  });

  // ---- iWave quality → color + radius scale (green↔foreground gradient), stretched
  // across the actual data range so real, if narrow, differences read clearly ----
  const qualitySeries = series.find((s) => s.key === 'iwave' && s.showQuality);
  let qualityColorScale: ((q: number) => string) | null = null;
  let qualityRadiusScale: ((q: number) => number) | null = null;
  if (qualitySeries) {
    const qVals = qualitySeries.points.map((p) => p.quality).filter((q): q is number => q !== null);
    if (qVals.length) {
      const qDomain: [number, number] = [Math.min(...qVals), Math.max(...qVals)];
      const baseColor = qualitySeries.isActive
        ? getCSSVar('--primary-text-color', '#ffffff')
        : qualitySeries.color;
      const bg = getCSSVar('--background-color', '#000000');
      const paleBase = d3.interpolateRgb(bg, baseColor)(0.3);
      const colorInterp = d3.interpolateRgb(paleBase, baseColor);
      const qualityNorm = d3.scaleLinear().domain(qDomain).range([0, 1]).clamp(true);
      qualityColorScale = (q: number) => colorInterp(qualityNorm(q));
      qualityRadiusScale = d3.scaleLinear().domain(qDomain).range([4, 8]).clamp(true) as (q: number) => number;
    }
  }

  // ---- Shared vertical guide line, reflects hoveredStation regardless of hover origin
  // (table row or chart marker) ----
  if (hoveredStation !== null && hoveredStation !== undefined) {
    const hoveredPoint = series[0]?.points.find((p) => p.i === hoveredStation);
    if (hoveredPoint) {
      svg
        .append('line')
        .attr('class', 'hover-guide-line')
        .attr('x1', xScale(hoveredPoint.x))
        .attr('x2', xScale(hoveredPoint.x))
        .attr('y1', margin.top)
        .attr('y2', graphHeight * 3 - margin.bottom)
        .attr('stroke', 'var(--accent-color)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3');
    }
  }

  // ---- Lines + markers, one pass per visible technique ----
  series.forEach((s) => {
    const isActive = s.isActive;
    const strokeColor = isActive ? 'var(--primary-text-color)' : s.color;
    const baseOpacity = isActive ? 1 : 0.55;

    const line = d3
      .line<VelocitySeriesPoint>()
      .defined((d) => d.v !== null)
      .x((d) => xScale(d.x))
      .y((d) => yScale((d.v as number) * velocityFactor));

    svg
      .append('path')
      .datum(s.points)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', strokeColor)
      .attr('stroke-width', isActive ? 2 : 1.2)
      .attr('opacity', baseOpacity);

    // Interpolated segments render in the theme accent color rather than a fixed hue —
    // since STIV now owns RIVeR's own "clear red" as its identity color, reusing red here
    // would read as "this is STIV" rather than "this point was estimated."
    if (isActive) {
      const segments: VelocitySeriesPoint[][] = [];
      let current: VelocitySeriesPoint[] = [];
      s.points.forEach((p) => {
        if (p.interp) current.push(p);
        else if (current.length) {
          segments.push(current);
          current = [];
        }
      });
      if (current.length) segments.push(current);
      segments.forEach((seg) => {
        svg
          .append('path')
          .datum(seg)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', 'var(--accent-color)')
          .attr('stroke-width', 2);
      });
    }

    const showQuality = s.key === 'iwave' && s.showQuality && qualityColorScale && qualityRadiusScale;

    // STIV only: an automatic (untuned, non-estimated) station renders as an open
    // ring rather than the solid dot every other point uses, so a hand-tuned
    // station — which keeps the solid fill — reads as visibly different at a
    // glance rather than only on hover.
    const isStivHollow = (d: VelocitySeriesPoint) => s.key === 'stiv' && !d.interp && !d.tuned;

    svg
      .selectAll(`.marker-${s.key}`)
      .data(s.points.filter((p) => p.v !== null))
      .enter()
      .append('circle')
      .attr('class', `marker-${s.key}`)
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale((d.v as number) * velocityFactor))
      .attr('r', (d) => (showQuality && d.quality !== null ? qualityRadiusScale!(d.quality) : isActive ? 3 : 2.2))
      .attr('fill', (d) =>
        d.interp
          ? 'var(--accent-color)'
          : showQuality && d.quality !== null
            ? qualityColorScale!(d.quality)
            : isStivHollow(d)
              ? 'var(--background-color)'
              : strokeColor
      )
      .attr('stroke', (d) =>
        showQuality && d.quality !== null ? 'var(--background-color)' : isStivHollow(d) ? strokeColor : 'none'
      )
      .attr('stroke-width', (d) => (showQuality && d.quality !== null ? 0.75 : isStivHollow(d) ? 1.5 : 0))
      .attr('opacity', baseOpacity);
  });

  // label for Velocity
  const velocityLabel = svg
    .append('text')
    .attr('class', 'y-axis-label graph-text')
    .attr('text-anchor', 'middle')
    .attr('x', -(graphHeight * 2) + (isReport ? 90 : 140))
    .attr('y', margin.left - 30)
    .attr('transform', 'rotate(-90)')
    .attr('font-size', '22px');
  velocityLabel.append('tspan').text(t('Graphs.velocity'));
  velocityLabel
    .append('tspan')
    .attr('font-size', '14px')
    .attr('opacity', '0.7')
    .attr('dx', '10')
    .text(`${unitLabel}`);
};
