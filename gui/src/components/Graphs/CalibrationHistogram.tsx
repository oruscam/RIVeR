import { useEffect, useRef, useState } from 'react';
import { calibrationHistogramSvg } from './calibrationHistogramSvg';
import { useUiSlice } from '../../hooks';

interface CalibrationHistogramProps {
  rows: { bin_center_px: number; count: number }[];
}

const HEIGHT = 140;

export const CalibrationHistogram = ({ rows }: CalibrationHistogramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { theme } = useUiSlice();
  const [width, setWidth] = useState(260);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.round(w));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (svgRef.current) {
      calibrationHistogramSvg({ svgElement: svgRef.current, rows });
    }
  }, [rows, theme, width]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg ref={svgRef} width={width} height={HEIGHT} className="cal-histogram-svg" />
    </div>
  );
};
