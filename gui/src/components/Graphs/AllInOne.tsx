import { useEffect, useRef } from 'react';
import './graphs.css';
import * as d3 from 'd3';
import { useProjectSlice, useSectionSlice, useUiSlice } from '../../hooks';
import { createDischargeChart } from './dischargeSvg';
import { createVelocityChart, VelocitySeries } from './velocitySvg';
import { bathimetrySvg } from './bathimetrySvg';
import { GRAPHS, UNIT_CONVERSIONS } from '../../constants/constants';
import { getTechniqueColors } from '../../helpers/getCSSVar';
import { adapterBathimetry, getEffectiveTechniqueData } from '../../helpers';
import { generateXAxisTicks } from '../../helpers/graphsHelpers';
import { Technique } from '../../store/section/types';

/**
 * * Version 0.0.1
 * *
 * @returns
 */

const TECHNIQUE_ORDER: Technique[] = ['lspiv', 'stiv', 'iwave'];
const TECHNIQUE_LABEL: Record<Technique, string> = { lspiv: 'LSPIV', stiv: 'STIV', iwave: 'iWave' };

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
  const { screenSizes, theme, language, hoveredStation, onSetHoveredStation, onPinStation } = useUiSlice();
  const { projectDetails, video } = useProjectSlice();
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
      const techOptions = {
        interpolated,
        artificialSeeding,
        alpha,
        step: video.parameters.step,
        fps: video.data.fps,
      };

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

      const technique = getTechniqueColors();

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
            tuned: effective.tunedFlags[i],
            rejectedV: effective.lowQualityFlags[i] ? effective.profile[i] : null,
          }));

          const s: VelocitySeries = {
            key,
            label: TECHNIQUE_LABEL[key],
            color: technique[key],
            isActive,
            points,
          };

          if (key === 'lspiv') {
            if (data.showVelocityStd) s.stdBand = { minus: data.minus_std, plus: data.plus_std };
            if (data.showPercentile) s.percentileBand = { minus: data.percentile_5th, plus: data.percentile_95th };
          }
          if (key === 'stiv' && data.showStivStd) {
            // Sigma comes pre-nulled for tuned stations (mergedSigmaProfile), and the
            // band is built off the merged velocity so a tuned station's band (if any)
            // matches the line actually drawn rather than the pre-override profile.
            const sigma = effective.sigma;
            s.stdBand = {
              minus: effective.resolved.map((v, i) => (v === null || sigma[i] === null ? null : v - sigma[i]!)),
              plus: effective.resolved.map((v, i) => (v === null || sigma[i] === null ? null : v + sigma[i]!)),
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
        hoveredStation,
        stationDistances: shiftedDistance,
        stationStage: shiftedDistance.map((_, i) => (level ?? 0) - data.depth[i]),
      });

      // ---- Unified hover: one overlay spanning all three panels, driving
      // uiSlice.hoveredStation/pinnedStation. The readout itself (Q + every
      // visible velocity + stage) is rendered by the docked StationTag, not here. ----
      if (!isReport) {
        const findNearestStation = (event: MouseEvent): number => {
          const [mx] = d3.pointer(event, svg.node());
          const x0 = xScale.invert(mx);
          let idx = 0;
          let best = Infinity;
          shiftedDistance.forEach((d, i) => {
            const diff = Math.abs(d - x0);
            if (diff < best) {
              best = diff;
              idx = i;
            }
          });
          return idx;
        };

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
            onSetHoveredStation(findNearestStation(event));
          })
          .on('mouseleave', () => {
            onSetHoveredStation(null);
          })
          .on('click', function (event) {
            onPinStation(findNearestStation(event));
          });
      }
    }
    // onSetHoveredStation/onPinStation are recreated every render by useUiSlice but only ever
    // change together with the state they close over (already tracked); adding them directly
    // would redraw this chart on every unrelated re-render
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
    video,
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
