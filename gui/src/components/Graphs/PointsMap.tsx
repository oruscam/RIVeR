import { useEffect, useRef } from 'react';
import { useIpcamSlice, useUiSlice } from '../../hooks';
import { GRAPHS } from '../../constants/constants';
import * as d3 from 'd3';
import { pointsMapSvg } from './pointsMapSvg';

export const PointsMap = () => {
  const svgRef = useRef(null);
  const { screenSizes } = useUiSlice();
  const { points, activePoint, cameraSolution } = useIpcamSlice();

  const cameraPosition = cameraSolution?.cameraPosition;
  const orthoExtent = cameraSolution?.orthoExtent;
  const orthoImagePath = cameraSolution?.orthoImagePath;

  const { width: screenWidth } = screenSizes;

  const graphWidth =
    screenWidth * GRAPHS.IPCAM_GRID_PROPORTION > GRAPHS.MIN_WIDTH
      ? screenWidth * GRAPHS.IPCAM_GRID_PROPORTION
      : GRAPHS.MIN_WIDTH;

  useEffect(() => {
    d3.select(svgRef.current).selectAll('*').remove();
    if (points && svgRef.current) {
      pointsMapSvg({
        svgElement: svgRef.current,
        points,
        activePoint,
        orthoImagePath,
        cameraPosition,
        orthoExtent,
      });
    }
  }, [points, graphWidth, cameraPosition]);

  return (
    <div>
      {points && (
        <svg
          ref={svgRef}
          width={graphWidth}
          height={graphWidth}
          style={{
            backgroundColor: 'transparent',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
};
