import { useEffect, useRef } from 'react';
import { calibrationHistogramSvg } from './calibrationHistogramSvg';
import { useUiSlice } from '../../hooks';

interface CalibrationHistogramProps {
  rows: { bin_center_px: number; count: number }[];
}

export const CalibrationHistogram = ({ rows }: CalibrationHistogramProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { theme } = useUiSlice();

  useEffect(() => {
    if (svgRef.current && rows.length > 0) {
      calibrationHistogramSvg({ svgElement: svgRef.current, rows });
    }
  }, [rows, theme]);

  return <svg ref={svgRef} width={260} height={140} className="cal-histogram-svg" />;
};
