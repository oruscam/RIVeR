import { useEffect, useRef, useState } from 'react';
import { useIpcamSlice, useProjectSlice } from '../../hooks';
import * as d3 from 'd3';
import { pointsMapSvg } from './pointsMapSvg';

export const PointsMap = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const { points, activePoint, cameraSolution } = useIpcamSlice();
  const { projectDetails } = useProjectSlice();

  const cameraPosition = cameraSolution?.cameraPosition;
  const orthoExtent = cameraSolution?.orthoExtent;
  const orthoImagePath = cameraSolution?.orthoImagePath;

  useEffect(() => {
    if (!boxRef.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(boxRef.current);
    return () => observer.disconnect();
  }, []);

  // The orthoimage's own shape, capped at a square, so the map never pushes the table off the panel.
  const aspect =
    orthoExtent && orthoExtent[1] !== orthoExtent[0]
      ? Math.abs(orthoExtent[3] - orthoExtent[2]) / Math.abs(orthoExtent[1] - orthoExtent[0])
      : 1;
  const height = Math.round(width * Math.min(1, Math.max(0.5, aspect)));

  useEffect(() => {
    d3.select(svgRef.current).selectAll('*').remove();
    if (points && svgRef.current && width > 0) {
      pointsMapSvg({
        svgElement: svgRef.current,
        points,
        activePoint: activePoint ?? undefined,
        orthoImagePath,
        cameraPosition,
        orthoExtent,
        unitSistem: projectDetails.unitSistem,
      });
    }
  }, [points, width, height, cameraPosition, projectDetails.unitSistem, activePoint, orthoExtent, orthoImagePath]);

  return (
    <div ref={boxRef} className="points-map-box">
      {points && width > 0 && <svg ref={svgRef} width={width} height={height} className="points-map-svg" />}
    </div>
  );
};
