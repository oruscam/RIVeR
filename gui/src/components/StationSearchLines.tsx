import { useEffect } from 'react';
import * as d3 from 'd3';
import { useDataSlice, useSectionSlice } from '../hooks';
import { computeStationSearchLines, computeSearchLinesFromCenters } from '../helpers';
import { transformPixelToRealWorld } from '../../commons/coordinates';
import { STIV_DEFAULT_HEIGHT_ROI_M } from '../constants/constants';
import { OverlayLayers } from './OverlaySvg';

interface StationSearchLinesProps {
  factor: number;
  layers: OverlayLayers;
}

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
  const { processing } = useDataSlice();
  const { stationLayerRef } = layers;

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

    const [sx, sy] = transformPixelToRealWorld(
      sectionPoints[0].x,
      sectionPoints[0].y,
      transformationMatrix
    );
    const [ex, ey] = transformPixelToRealWorld(
      sectionPoints[1].x,
      sectionPoints[1].y,
      transformationMatrix
    );

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
      : computeStationSearchLines(
          { x: sx, y: sy },
          { x: ex, y: ey },
          numStations,
          lengthM,
          transformationMatrix
        );
    if (lines.length === 0) return;

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
      .attr('stroke', 'var(--accent-color)')
      .attr('stroke-width', 1.5);

    layer
      .selectAll('circle.station-search-dot')
      .data(lines)
      .enter()
      .append('circle')
      .attr('class', 'station-search-dot')
      .attr('cx', (d) => d.a.x / factor)
      .attr('cy', (d) => d.a.y / factor)
      .attr('r', 3)
      .attr('fill', 'var(--accent-color)');

    layer
      .selectAll('text.station-search-label')
      .data(lines)
      .enter()
      .append('text')
      .attr('class', 'station-search-label')
      .attr('x', (d) => d.b.x / factor + 6)
      .attr('y', (d) => d.b.y / factor + 4)
      .attr('fill', 'var(--accent-color)')
      .attr('font-size', '11px')
      .text((d) => d.station);
  }, [
    numStations,
    sectionPoints,
    data,
    heightRoi,
    transformationMatrix,
    factor,
    stationLayerRef,
  ]);

  return null;
};
