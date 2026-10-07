import * as d3 from 'd3';
import { GRAPHS, UNIT_CONVERSIONS, UNITS } from '../../constants/constants';
import { generateYAxisTicks } from '../../helpers';
import { TECHNIQUE_MARKER_SHAPE } from '../../helpers/techniqueMarkers';
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
  /** iWave only: raw velocity of a station excluded as low quality, drawn as a faded dashed
   *  ring so it stays visible but reads as rejected. null otherwise. */
  rejectedV: number | null;
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

const VELOCITY_LINE = {
  ACTIVE_WIDTH: 2.75,
  INACTIVE_WIDTH: 1.75,
  INACTIVE_OPACITY: 0.85,
  ACTIVE_RADIUS: 3.5,
  INACTIVE_RADIUS: 2.5,
  OUTLINE_WIDTH: 1.25,
  INTERP_DASH: '7 5',
};

/**
 * Unified velocity-profile panel: every visible technique keeps its own identity colour
 * and marker shape; the active one is drawn heavier and on top, the others lighter and
 * translucent. Interpolated stretches are dashed in the same colour, never recoloured, and
 * a key above the plot explains the marks. Uncertainty bands and iWave's quality shading are opt-in (goal 4) and controlled
 * from TechniqueLegend, not from clickable swatches in the chart itself.
 *
 * Hover is driven by AllInOne.tsx's shared overlay (and, as of Phase 4c, the canvas
 * and Grid too, via uiSlice.hoveredStation) — this module only draws its own segment
 * of the crosshair and its own series markers; discharge and stage each draw their own
 * matching segment (dischargeSvg.ts/bathimetrySvg.ts) instead of relying on one line
 * bleeding across a shared SVG.
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
  // Rejected iWave stations are drawn at their raw velocity, so they must fit the axis too.
  const rejectedValues = series.flatMap((s) =>
    s.points.map((p) => p.rejectedV).filter((v): v is number => v !== null)
  );
  const domainValues = [...allValues, ...bandValues, ...rejectedValues].map((v) => v * velocityFactor);
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

  // ---- iWave quality → marker size only (same hue), stretched across the actual data
  // range so real, if narrow, differences read clearly ----
  const qualitySeries = series.find((s) => s.key === 'iwave' && s.showQuality);
  let qualityRadiusScale: ((q: number) => number) | null = null;
  if (qualitySeries) {
    const qVals = qualitySeries.points.map((p) => p.quality).filter((q): q is number => q !== null);
    if (qVals.length) {
      const qDomain: [number, number] = [Math.min(...qVals), Math.max(...qVals)];
      const range: [number, number] = qualitySeries.isActive ? [3, 6.5] : [2.5, 5.5];
      qualityRadiusScale = d3.scaleLinear().domain(qDomain).range(range).clamp(true) as (q: number) => number;
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
        .attr('y1', graphHeight)
        .attr('y2', graphHeight * 2)
        .attr('stroke', 'var(--accent-color)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3');
    }
  }

  // ---- Lines + markers, one pass per visible technique, active one drawn last ----
  // One rule for the whole panel: a technique's hue and marker shape say which technique,
  // line style says measured or interpolated, and nothing else recolours a series. A
  // segment is solid only between two measured stations; any segment touching an
  // interpolated station is dashed, and interpolated stations carry no marker.
  const markerKnockout = 'var(--secondary-background-color)';
  const drawOrder = [...series.filter((s) => !s.isActive), ...series.filter((s) => s.isActive)];
  let hasInterpolated = false;
  let hasRejected = false;
  let hasTuned = false;

  drawOrder.forEach((s) => {
    const isActive = s.isActive;
    const strokeColor = s.color;
    const lineWidth = isActive ? VELOCITY_LINE.ACTIVE_WIDTH : VELOCITY_LINE.INACTIVE_WIDTH;
    const baseRadius = isActive ? VELOCITY_LINE.ACTIVE_RADIUS : VELOCITY_LINE.INACTIVE_RADIUS;
    const group = svg
      .append('g')
      .attr('class', `velocity-series velocity-series-${s.key}`)
      .attr('opacity', isActive ? 1 : VELOCITY_LINE.INACTIVE_OPACITY);
    const y = (v: number) => yScale(v * velocityFactor);

    for (let k = 0; k < s.points.length - 1; k++) {
      const a = s.points[k];
      const b = s.points[k + 1];
      if (a.v === null || b.v === null) continue;
      if (a.interp || b.interp) hasInterpolated = true;
      group
        .append('path')
        .attr('d', `M${xScale(a.x)},${y(a.v)}L${xScale(b.x)},${y(b.v)}`)
        .attr('fill', 'none')
        .attr('stroke', strokeColor)
        .attr('stroke-width', lineWidth)
        .attr('stroke-linecap', 'round')
        .attr('stroke-dasharray', a.interp || b.interp ? VELOCITY_LINE.INTERP_DASH : null);
    }

    const showQuality = s.key === 'iwave' && s.showQuality && qualityRadiusScale;
    const markerRadius = (d: VelocitySeriesPoint): number =>
      showQuality && d.quality !== null ? qualityRadiusScale!(d.quality) : baseRadius;

    const shape = TECHNIQUE_MARKER_SHAPE[s.key];

    // One marker shape per technique (circle/square/triangle), matching the
    // swatch in TechniqueLegend/FormProcessing — colour is never the only signal.
    const drawMarkers = (
      className: string,
      points: VelocitySeriesPoint[],
      velocity: (d: VelocitySeriesPoint) => number,
      radius: (d: VelocitySeriesPoint) => number
    ) => {
      const cy = (d: VelocitySeriesPoint) => y(velocity(d));
      const selection = group.selectAll(`.${className}`).data(points).enter();
      if (shape === 'square') {
        return selection
          .append('rect')
          .attr('class', className)
          .attr('x', (d) => xScale(d.x) - radius(d))
          .attr('y', (d) => cy(d) - radius(d))
          .attr('width', (d) => radius(d) * 2)
          .attr('height', (d) => radius(d) * 2);
      }
      if (shape === 'triangle') {
        return selection
          .append('polygon')
          .attr('class', className)
          .attr('points', (d) => {
            const cx = xScale(d.x);
            const yy = cy(d);
            const r = radius(d) * 1.25;
            return `${cx},${yy - r * 1.05} ${cx + r},${yy + r * 0.7} ${cx - r},${yy + r * 0.7}`;
          });
      }
      return selection
        .append('circle')
        .attr('class', className)
        .attr('cx', (d) => xScale(d.x))
        .attr('cy', cy)
        .attr('r', radius);
    };

    // iWave stations excluded as low quality: a hollow marker at their raw velocity,
    // not joined to the line, so they stay visible but read as not used.
    const rejected = s.points.filter((p) => p.rejectedV !== null);
    if (rejected.length) hasRejected = true;
    drawMarkers(
      `marker-rejected-${s.key}`,
      rejected,
      (d) => d.rejectedV as number,
      () => baseRadius
    )
      .attr('fill', markerKnockout)
      .attr('stroke', strokeColor)
      .attr('stroke-width', VELOCITY_LINE.OUTLINE_WIDTH);

    // STIV: only a hand-tuned station is marked, with a thin outer ring; automatic
    // stations are the plain case.
    const tuned = s.key === 'stiv' ? s.points.filter((p) => p.v !== null && !p.interp && p.tuned) : [];
    if (tuned.length) hasTuned = true;
    drawMarkers(
      `marker-tuned-${s.key}`,
      tuned,
      (d) => d.v as number,
      (d) => markerRadius(d) + 3
    )
      .attr('fill', 'none')
      .attr('stroke', strokeColor)
      .attr('stroke-width', VELOCITY_LINE.OUTLINE_WIDTH);

    drawMarkers(
      `marker-${s.key}`,
      s.points.filter((p) => p.v !== null && !p.interp),
      (d) => d.v as number,
      markerRadius
    )
      .attr('fill', strokeColor)
      .attr('stroke', markerKnockout)
      .attr('stroke-width', 1.5);
  });

  // ---- Key: explains the marks, not the techniques (the technique rows above already
  // do that), in neutral ink, listing only what is on screen. ----
  if (series.length) {
    const ink = 'var(--secondary-text-color)';
    const items: { label: string; glyph: (g: d3.Selection<SVGGElement, unknown, null, undefined>) => void }[] = [
      {
        label: t('Results.measured'),
        glyph: (g) => {
          g.append('path').attr('d', 'M0,0H22').attr('stroke', ink).attr('stroke-width', 2);
          g.append('circle').attr('cx', 11).attr('r', 3).attr('fill', ink);
        },
      },
    ];
    if (hasInterpolated) {
      items.push({
        label: t('Results.interpolated'),
        glyph: (g) =>
          g
            .append('path')
            .attr('d', 'M0,0H22')
            .attr('stroke', ink)
            .attr('stroke-width', 2)
            .attr('stroke-linecap', 'round')
            .attr('stroke-dasharray', VELOCITY_LINE.INTERP_DASH),
      });
    }
    if (hasRejected) {
      items.push({
        label: t('Results.keyRejected'),
        glyph: (g) =>
          g
            .append('circle')
            .attr('cx', 4)
            .attr('r', 3.5)
            .attr('fill', 'none')
            .attr('stroke', ink)
            .attr('stroke-width', VELOCITY_LINE.OUTLINE_WIDTH),
      });
    }
    if (hasTuned) {
      items.push({
        label: t('Results.keyTuned'),
        glyph: (g) => {
          g.append('circle')
            .attr('cx', 6)
            .attr('r', 6)
            .attr('fill', 'none')
            .attr('stroke', ink)
            .attr('stroke-width', 1.25);
          g.append('circle').attr('cx', 6).attr('r', 3).attr('fill', ink);
        },
      });
    }

    const key = svg.append('g').attr('class', 'velocity-key');
    const keyY = yScale.range()[1] - 14;
    let cursor = 0;
    items.forEach((item) => {
      const glyph = key.append('g').attr('transform', `translate(${cursor},0)`);
      item.glyph(glyph);
      const glyphWidth = (glyph.node() as SVGGElement).getBBox().width;
      const text = key
        .append('text')
        .attr('class', 'graph-text velocity-key-label')
        .attr('x', cursor + glyphWidth + 6)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .attr('fill', ink)
        .style('font-size', '12px')
        .text(item.label);
      cursor += glyphWidth + 6 + (text.node() as SVGTextElement).getComputedTextLength() + 16;
    });
    const plotRight = margin.left + GRAPHS.GRID_Y_OFFSET_ALL_IN_ONE + width - margin.left - margin.right * 2;
    key.attr('transform', `translate(${plotRight - (cursor - 16)},${keyY})`);
  }

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
