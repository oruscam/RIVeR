import { useEffect, useRef } from 'react';
import './graphs.css';
import * as d3 from 'd3';
import { useProjectSlice, useSectionSlice, useUiSlice } from '../../hooks';
import { createDischargeChart } from './dischargeSvg';
import { createVelocityChart, VelocitySeries } from './velocitySvg';
import { bathimetrySvg } from './bathimetrySvg';
import { GRAPHS, TECHNIQUE_COLORS, UNIT_CONVERSIONS, UNITS } from '../../constants/constants';
import { adapterBathimetry, getEffectiveTechniqueData } from '../../helpers';
import { generateXAxisTicks } from '../../helpers/graphsHelpers';
import { Technique } from '../../store/section/types';
import { t } from 'i18next';
import { getThemedHost } from '../../helpers/themedHost';

/**
 * * Version 0.0.1
 * *
 * @returns
 */

const TECHNIQUE_ORDER: Technique[] = ['lspiv', 'stiv', 'iwave'];
const TECHNIQUE_LABEL: Record<Technique, string> = { lspiv: 'LSPIV', stiv: 'STIV', iwave: 'iWave' };

function getOrCreateTooltip(): d3.Selection<HTMLDivElement, unknown, HTMLElement, any> {
  let el = d3.select<HTMLDivElement, unknown>('.combined-chart-tooltip');
  if (el.empty()) {
    // Appended to the themed host, not <body>: the app's CSS custom properties
    // are declared on [data-theme] (a div inside body), so a tooltip parented to
    // body falls outside that scope and its var()-driven background and border
    // resolve to nothing. See helpers/themedHost.ts.
    el = d3
      .select(getThemedHost())
      .append('div')
      .attr('class', 'velocity-tooltip graph-tooltip-text combined-chart-tooltip') as any;
  }
  return el;
}

export const AllInOne = ({
  width,
  height,
  index,
  isReport,
}: {
  width?: number;
  height?: number;
  index?: number;
  isReport: boolean;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { sections, activeSection } = useSectionSlice();
  const section = sections[index !== undefined ? index : activeSection];
  const { data, bathimetry, name, activeTechnique, interpolated, artificialSeeding, alpha } = section;
  const { level, x1Intersection, x2Intersection, width: bathWidth, wetSegments } = bathimetry;
  const { screenSizes, theme, language, hoveredStation, onSetHoveredStation } = useUiSlice();
  const { projectDetails } = useProjectSlice();
  const { unitSistem } = projectDetails;
  const { width: screenWidth } = screenSizes;

  const graphWidth =
    screenWidth * GRAPHS.WIDTH_PROPORTION > GRAPHS.MIN_WIDTH
      ? screenWidth * GRAPHS.WIDTH_PROPORTION
      : GRAPHS.MIN_WIDTH;

  useEffect(() => {
    d3.select(svgRef.current).selectAll('*').remove();
    if (svgRef.current === null) return;

    if (data) {
      const svg = d3.select(svgRef.current);
      const width = +svg.attr('width');
      const height = +svg.attr('height');
      const margin = { top: 20, right: 30, bottom: 40, left: 50 };
      const graphHeight = height / 3;
      const techOptions = { interpolated, artificialSeeding, alpha };

      const shiftedDistance = data.distance.map((d) => d + x1Intersection!);
      const bathData = adapterBathimetry(bathimetry.line!, wetSegments ?? [], level!);

      // xScale for velocity and bathimetry

      const xScale = d3
        .scaleLinear()
        .domain([x1Intersection!, x2Intersection!])
        .range([margin.left + 55, width - margin.right - 25]);

      // Common xAxis
      const ticks = generateXAxisTicks(x1Intersection!, x2Intersection!, bathWidth!);
      const displayFactor = unitSistem === 'imperial' ? UNIT_CONVERSIONS.M_TO_FT : 1;

      const xAxis = d3
        .axisBottom(xScale)
        .tickValues(ticks)
        .tickFormat((d) => ((d as number) * displayFactor).toFixed(1));

      // Append xAxis

      svg
        .append('g')
        .attr('transform', `translate(0,${height - margin.bottom - 10})`)
        .call(xAxis)
        .selectAll('.tick text')
        .style('font-size', '14px');

      svg.selectAll('.tick line').attr('stroke', 'lightgrey').attr('stroke-width', 0.2);

      // Create xGrid common for all graphs, and add it

      const makeXGridlines = () => d3.axisBottom(xScale).tickValues(ticks);

      svg
        .append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height - margin.bottom - 10})`)
        .call(
          makeXGridlines()
            .tickSize(-height + margin.top + margin.bottom)
            .tickFormat('' as any)
        )
        .attr('stroke', 'grey')
        .attr('stroke-width', 0.05);

      // ---- Discharge chart: driven by whichever technique is active, colored by that
      // technique's identity color (not Q-portion thresholds) ----
      const activeEffective = getEffectiveTechniqueData(data, activeTechnique, techOptions);
      const activeQ = activeEffective ? activeEffective.Q : data.Q;

      createDischargeChart({
        SVGElement: svgRef.current,
        xScale: xScale,
        distance: shiftedDistance,
        Q: activeQ,
        sizes: { width, height, margin, graphHeight },
        isReport,
        unitSistem,
        hoveredStation,
      });

      // ---- Velocity chart: one series per VISIBLE technique, unified styling, all
      // resolved live (check/interpolate/seeding/alpha) — no Apply Changes round trip ----
      const visibility: Record<Technique, boolean> = {
        lspiv: data.showLspiv !== false,
        stiv: data.showStiv !== false,
        iwave: data.showIwave !== false,
      };

      const series: VelocitySeries[] = TECHNIQUE_ORDER.filter((key) => visibility[key])
        .map((key): VelocitySeries | null => {
          const effective = getEffectiveTechniqueData(data, key, techOptions);
          if (!effective) return null;
          const isActive = key === activeTechnique;

          const points = shiftedDistance.map((x, i) => ({
            x,
            v: effective.resolved[i],
            interp: effective.interpFlags[i],
            i,
            quality: key === 'iwave' ? (data.iwave_quality_profile?.[i] ?? null) : null,
          }));

          const s: VelocitySeries = {
            key,
            label: TECHNIQUE_LABEL[key],
            color: TECHNIQUE_COLORS[key],
            isActive,
            points,
          };

          if (key === 'lspiv') {
            if (data.showVelocityStd) s.stdBand = { minus: data.minus_std, plus: data.plus_std };
            if (data.showPercentile) s.percentileBand = { minus: data.percentile_5th, plus: data.percentile_95th };
          }
          if (key === 'stiv' && data.showStivStd && data.stiv_sigma_profile) {
            const sigma = data.stiv_sigma_profile;
            s.stdBand = {
              minus: data.stiv_velocity_profile!.map((v, i) =>
                v === null || sigma[i] === null ? null : v - sigma[i]!
              ),
              plus: data.stiv_velocity_profile!.map((v, i) =>
                v === null || sigma[i] === null ? null : v + sigma[i]!
              ),
            };
          }
          if (key === 'iwave') {
            s.showQuality = !!data.showIwaveQuality;
          }

          return s;
        })
        .filter((s): s is VelocitySeries => s !== null);

      createVelocityChart({
        SVGElement: svgRef.current,
        xScale,
        series,
        sizes: { width, height, margin, graphHeight },
        isReport,
        unitSistem,
        hoveredStation,
      });

      bathimetrySvg({
        svgElement: svgRef.current,
        data: bathData,
        level,
        showLeftBank: false,
        sizes: { width, height, margin, graphHeight },
        xScaleAllInOne: xScale,
        isReport,
        unitSistem,
      });

      // ---- Unified hover: one overlay spanning all three panels, one combined tooltip
      // (Q + every visible velocity + stage), instead of a tooltip per chart. ----
      if (!isReport) {
        const isImperial = unitSistem === 'imperial';
        const velocityFactor = isImperial ? UNIT_CONVERSIONS.M_TO_FT : 1;
        const flowFactor = isImperial ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;
        const lengthFactor = isImperial ? UNIT_CONVERSIONS.M_TO_FT : 1;
        const unitLabel = isImperial ? UNITS.IMPERIAL.VELOCITY : UNITS.SI.VELOCITY;
        const flowUnit = isImperial ? UNITS.IMPERIAL.FLOW : UNITS.SI.FLOW;
        const lengthUnit = isImperial ? UNITS.IMPERIAL.LONGITUDE : UNITS.SI.LONGITUDE;
        const formatValue = d3.format('.3f');
        const tooltip = getOrCreateTooltip();

        const showTooltip = (i: number, clientX: number, clientY: number) => {
          const rows = series
            .map((s) => {
              const p = s.points.find((pt) => pt.i === i);
              if (!p) return '';
              const valueText = p.v === null ? '—' : `${formatValue(p.v * velocityFactor)} ${unitLabel}`;
              const dotColor = s.isActive ? 'var(--primary-text-color)' : s.color;
              return `<div class="velocity-tooltip-row${s.isActive ? ' velocity-tooltip-row-active' : ''}">
                <span class="velocity-tooltip-dot" style="background:${dotColor}"></span>
                <span class="velocity-tooltip-label" style="color:${dotColor}">${s.label}</span>
                <span class="velocity-tooltip-val">${valueText}</span>
              </div>`;
            })
            .join('');
          const qVal = activeQ[i];
          const stageVal = (level ?? 0) - data.depth[i];
          // Share of the section's total discharge, from the same resolved
          // computation the bars are drawn from.
          const qShare = activeEffective?.Q_portion?.[i];
          const qShareText =
            qShare !== null && qShare !== undefined && isFinite(qShare)
              ? `  ·  ${(qShare * 100).toFixed(1)}%`
              : '';
          const qText =
            qVal !== null && qVal !== undefined
              ? `${(qVal * flowFactor).toFixed(3)} ${flowUnit}${qShareText}`
              : '—';
          tooltip
            .html(
              `<div class="velocity-tooltip-head">${t('Graphs.station')} ${i + 1}</div>
              <div class="velocity-tooltip-row">
                <span class="velocity-tooltip-dot" style="background:var(--primary-text-color)"></span>
                <span class="velocity-tooltip-label">${t('Graphs.discharge')}</span>
                <span class="velocity-tooltip-val">${qText}</span>
              </div>
              ${rows}
              <div class="velocity-tooltip-row">
                <span class="velocity-tooltip-dot" style="background:var(--secondary-text-color)"></span>
                <span class="velocity-tooltip-label">${t('Graphs.stage')}</span>
                <span class="velocity-tooltip-val">${(stageVal * lengthFactor).toFixed(2)} ${lengthUnit}</span>
              </div>`
            )
            .style('display', 'block');

          // Place it only after the content is in and visible, so the measured
          // box is the real one. The tooltip is position:fixed, so clientX/Y and
          // window bounds are the same coordinate space. Flip to the pointer's
          // left (and clamp vertically) rather than letting it run off the
          // window edge, which hid it entirely near the right border.
          const GAP = 14;
          const EDGE = 8;
          const node = tooltip.node() as HTMLElement | null;
          const box = node?.getBoundingClientRect();
          const tw = box?.width ?? 0;
          const th = box?.height ?? 0;
          let left = clientX + GAP;
          if (left + tw > window.innerWidth - EDGE) left = clientX - tw - GAP;
          left = Math.max(EDGE, Math.min(left, window.innerWidth - tw - EDGE));
          let top = clientY - 10;
          top = Math.max(EDGE, Math.min(top, window.innerHeight - th - EDGE));
          tooltip.style('left', `${left}px`).style('top', `${top}px`);
        };
        const hideTooltip = () => tooltip.style('display', 'none');

        svg
          .append('rect')
          .attr('class', 'chart-hover-overlay')
          .attr('x', margin.left)
          .attr('y', margin.top)
          .attr('width', Math.max(0, width - margin.left - margin.right))
          .attr('height', Math.max(0, height - margin.top - margin.bottom))
          .attr('fill', 'transparent')
          .style('cursor', 'crosshair')
          .on('mousemove', function (event) {
            const [mx] = d3.pointer(event, svg.node());
            const x0 = xScale.invert(mx);
            let idx = 0,
              best = Infinity;
            shiftedDistance.forEach((d, i) => {
              const diff = Math.abs(d - x0);
              if (diff < best) {
                best = diff;
                idx = i;
              }
            });
            onSetHoveredStation(idx);
            showTooltip(idx, event.clientX, event.clientY);
          })
          .on('mouseleave', () => {
            onSetHoveredStation(null);
            hideTooltip();
          });
      }
    }
    // onChangeDataValues is recreated every render but only ever changes together with `data`
    // (already tracked); adding it directly would redraw this chart on every unrelated re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeSection,
    activeTechnique,
    interpolated,
    artificialSeeding,
    alpha,
    data,
    index,
    screenWidth,
    width,
    theme,
    unitSistem,
    language,
    isReport,
    level,
    x1Intersection,
    x2Intersection,
    bathWidth,
    bathimetry.line,
    wetSegments,
    hoveredStation,
  ]);

  return (
    <svg
      ref={svgRef}
      width={width ? width : graphWidth}
      height={height ? height : 500}
      id={`section-${name}`}
    ></svg>
  );
};
