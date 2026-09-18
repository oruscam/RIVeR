import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useDataSlice, useSectionSlice, useUiSlice } from '../hooks';
import {
  computeStationSearchLines,
  computeSearchLinesFromCenters,
  getStiColorScale,
  isStationTuned,
} from '../helpers';
import { getSearchLineVisual } from './Graphs/searchLineState';
import { transformPixelToRealWorld } from '../../commons/coordinates';
import { STIV_DEFAULT_HEIGHT_ROI_M } from '../constants/constants';
import { getCSSVar, getOverlayColors } from '../helpers/getCSSVar';
import { OverlayLayers } from './OverlaySvg';

interface StationSearchLinesProps {
  factor: number;
  layers: OverlayLayers;
}

/** Mirrors Carousel.tsx's lowConfidence check exactly: a dry-bank station has
 *  v = 0 and sigma at its floor, which would otherwise satisfy sigma > |v|
 *  while meaning nothing. */
const isLowConfidence = (v: number | null | undefined, sigma: number | null | undefined): boolean =>
  v !== null && v !== undefined && v !== 0 && sigma !== null && sigma !== undefined && sigma > Math.abs(v);

/**
 * Draws the line along which each station's STI will be sampled, previewing the
 * geometry live as the user adjusts the station count or ROI Height — before any
 * backend run.
 *
 * The endpoints come from `sectionPoints` (pixel space, always populated whenever a
 * section is drawn) converted to real-world, rather than from `sectionPointsRW`:
 * that field is only assigned as a side effect of a code path that early-returns when
 * nothing has changed, so on a loaded, unedited project it is never set at all.
 */
export const StationSearchLines = ({ factor, layers }: StationSearchLinesProps) => {
  const { sections, activeSection, transformationMatrix } = useSectionSlice();
  const { processing, colorbarLimits } = useDataSlice();
  const { hoveredStation, onSetHoveredStation } = useUiSlice();
  const { stationLayerRef } = layers;

  // Keep the dispatcher fresh without putting it in the main effect's deps —
  // its identity changes every render (useUiSlice doesn't memoize it), which
  // would otherwise tear down and rebuild the whole overlay on every render.
  const onSetHoveredStationRef = useRef(onSetHoveredStation);
  useEffect(() => {
    onSetHoveredStationRef.current = onSetHoveredStation;
  });

  const section = sections[activeSection];
  const numStations = section?.numStations;
  const sectionPoints = section?.sectionPoints;
  const data = section?.data;
  const heightRoi = processing.form.heightRoi;

  useEffect(() => {
    if (!stationLayerRef.current) return;
    const layer = d3.select(stationLayerRef.current);
    layer.selectAll('*').remove();

    if (!numStations || numStations < 2) return;
    if (!sectionPoints || sectionPoints.length < 2) return;
    if (transformationMatrix.length !== 3) return;

    const [sx, sy] = transformPixelToRealWorld(sectionPoints[0].x, sectionPoints[0].y, transformationMatrix);
    const [ex, ey] = transformPixelToRealWorld(sectionPoints[1].x, sectionPoints[1].y, transformationMatrix);

    // ROI Height is 0 until the recommendation step runs; the backend omits the flag
    // in that case and the CLI applies its own default, so mirror that here.
    const lengthM = heightRoi > 0 ? heightRoi : STIV_DEFAULT_HEIGHT_ROI_M;

    // Once a matching-count analysis has run, the backend's authoritative per-station
    // real-world coordinates take precedence over the interpolated preview: the backend
    // spreads stations across the wetted width, which can differ from the drawn line.
    const hasAuthoritativeCenters =
      data &&
      data.num_stations === numStations &&
      Array.isArray(data.east) &&
      Array.isArray(data.north) &&
      data.east.length === numStations &&
      data.north.length === numStations;

    const lines = hasAuthoritativeCenters
      ? computeSearchLinesFromCenters(
          data.east!.map((east, i) => ({ x: east, y: data.north![i] })),
          { x: sx, y: sy },
          { x: ex, y: ey },
          lengthM,
          transformationMatrix
        )
      : computeStationSearchLines({ x: sx, y: sy }, { x: ex, y: ey }, numStations, lengthM, transformationMatrix);
    if (lines.length === 0) return;

    const visualColors = {
      preview: getOverlayColors().line,
      accent: getCSSVar('--accent-color', '#0678BE'),
      muted: getCSSVar('--pin-muted', '#808080'),
      warning: getCSSVar('--status-fair', '#F5BF61'),
      badge: 'rgba(50, 50, 50, 0.85)',
    };

    const stivProfile = data?.stiv_velocity_profile;
    const stivSigma = data?.stiv_sigma_profile;
    const manualAngles = data?.stiv_angle_manual_profile;
    // Generic cross-section fields (num_stations/east/north) are populated by ANY
    // completed analysis, not specifically STIV — stiv_velocity_profile is a separate,
    // optional field. Without this guard, an LSPIV-only project would render every
    // search line in the "no data" error state instead of the plain accent colour.
    const hasStivRun = hasAuthoritativeCenters && Array.isArray(stivProfile);
    const { colors: stivColors } = hasAuthoritativeCenters
      ? getStiColorScale(stivProfile, colorbarLimits)
      : { colors: [] as string[] };

    const visuals = lines.map((line) => {
      const stationIndex = line.station - 1; // display number is 1-based; array index is 0-based
      const rawColor = stivColors[stationIndex];
      return getSearchLineVisual({
        hasRun: hasStivRun,
        velocityColor: rawColor && rawColor !== 'transparent' ? rawColor : null,
        isHovered: hoveredStation === stationIndex,
        tuned: hasStivRun ? isStationTuned(manualAngles, stationIndex) : false,
        lowConfidence: hasStivRun
          ? isLowConfidence(stivProfile?.[stationIndex], stivSigma?.[stationIndex])
          : false,
        colors: visualColors,
      });
    });

    // Dark halo behind each line so it stays legible over any video
    // background, matching the treatment used on the cross-section line.
    layer
      .selectAll('line.station-search-line-halo')
      .data(lines)
      .enter()
      .append('line')
      .attr('class', 'station-search-line-halo')
      .attr('x1', (d) => d.a.x / factor)
      .attr('y1', (d) => d.a.y / factor)
      .attr('x2', (d) => d.b.x / factor)
      .attr('y2', (d) => d.b.y / factor)
      .attr('stroke', (_d, i) => visuals[i].haloColor)
      .attr('stroke-width', (_d, i) => visuals[i].haloWidth);

    layer
      .selectAll('line.station-search-line')
      .data(lines)
      .enter()
      .append('line')
      .attr('class', 'station-search-line')
      .attr('x1', (d) => d.a.x / factor)
      .attr('y1', (d) => d.a.y / factor)
      .attr('x2', (d) => d.b.x / factor)
      .attr('y2', (d) => d.b.y / factor)
      .attr('stroke', (_d, i) => visuals[i].strokeColor)
      .attr('stroke-width', (_d, i) => visuals[i].strokeWidth)
      .attr('stroke-dasharray', (_d, i) => (visuals[i].dashed ? '5 4' : null));

    layer
      .selectAll('circle.station-search-dot')
      .data(lines)
      .enter()
      .append('circle')
      .attr('class', 'station-search-dot')
      .attr('cx', (d) => d.a.x / factor)
      .attr('cy', (d) => d.a.y / factor)
      .attr('r', 3)
      .attr('fill', (_d, i) => visuals[i].strokeColor)
      .attr('stroke', 'rgba(0, 0, 0, 0.45)')
      .attr('stroke-width', 1);

    // Station number labels — rounded dark badge behind the text, matching
    // the pin (L/R) and cross-section-name badges used elsewhere in the app,
    // instead of raw colored text floating directly on the video.
    const labelGroups = layer
      .selectAll('g.station-search-label')
      .data(lines)
      .enter()
      .append('g')
      .attr('class', 'station-search-label')
      .attr('transform', (d) => `translate(${d.b.x / factor}, ${d.b.y / factor})`);

    labelGroups
      .append('text')
      .attr('x', 10)
      .attr('y', 0)
      .attr('dominant-baseline', 'central')
      .attr('fill', '#fff')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text((d, i) => `${d.station}${visuals[i].labelSuffix}`);

    labelGroups.each(function (_d, i) {
      const g = d3.select(this);
      const textNode = g.select('text').node() as SVGTextElement;
      try {
        const bbox = textNode.getBBox();
        const padX = 4;
        const padY = 2;
        g.insert('rect', 'text')
          .attr('x', bbox.x - padX)
          .attr('y', bbox.y - padY)
          .attr('width', bbox.width + padX * 2)
          .attr('height', bbox.height + padY * 2)
          .attr('rx', 3)
          .attr('ry', 3)
          .attr('fill', visuals[i].badgeBackground);
      } catch {
        // getBBox may fail if not yet attached to the DOM — silently skip
      }
    });

    // Wide, invisible hit-line per station (the visible line is only
    // 1.5–2.5px, too thin to hover reliably) that dispatches
    // onSetHoveredStation. Appended last so it sits on top for pointer
    // events without affecting paint order visually (fill/stroke:
    // transparent never paints).
    layer
      .selectAll('line.station-search-hit')
      .data(lines)
      .enter()
      .append('line')
      .attr('class', 'station-search-hit')
      .attr('x1', (d) => d.a.x / factor)
      .attr('y1', (d) => d.a.y / factor)
      .attr('x2', (d) => d.b.x / factor)
      .attr('y2', (d) => d.b.y / factor)
      .attr('stroke', 'transparent')
      .attr('stroke-width', 14)
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => onSetHoveredStationRef.current(d.station - 1))
      .on('mouseleave', () => onSetHoveredStationRef.current(null));
  }, [
    numStations,
    sectionPoints,
    data,
    heightRoi,
    transformationMatrix,
    factor,
    stationLayerRef,
    colorbarLimits,
    hoveredStation,
  ]);

  return null;
};
