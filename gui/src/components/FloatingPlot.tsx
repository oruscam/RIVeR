import { useState, useRef, useEffect, useMemo } from 'react';
import { useUiSlice } from '../hooks';
import { TestPlot } from './Graphs';
import { getCSSVar } from '../helpers/getCSSVar';

const PANEL_WIDTH = 220;
const PANEL_HEIGHT = Math.round(PANEL_WIDTH * 0.8); // 144
const MARGIN = 12;

interface FloatingPlotProps {
  showMedian: boolean;
  containerWidth: number;
  containerHeight: number;
}

const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const FloatingPlot = ({ showMedian, containerWidth, containerHeight }: FloatingPlotProps) => {
  const { theme } = useUiSlice();

  const [position, setPosition] = useState({
    x: containerWidth - PANEL_WIDTH - MARGIN,
    y: containerHeight - PANEL_HEIGHT - MARGIN,
  });
  const [isDragging, setIsDragging] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Remove any lingering window listeners if the component unmounts mid-drag
  useEffect(() => {
    return () => cleanupRef.current?.();
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;

    const onMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(e.clientX - startX, containerWidth - PANEL_WIDTH));
      const newY = Math.max(0, Math.min(e.clientY - startY, containerHeight - PANEL_HEIGHT));
      setPosition({ x: newX, y: newY });
    };

    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      cleanupRef.current = null;
    };

    cleanupRef.current = onUp;
    setIsDragging(true);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Re-read CSS vars whenever theme changes. `theme` isn't used in the body — getCSSVar reads
  // straight from the DOM — but it's needed in the deps to invalidate the memo on theme change.
  const { bgColor, borderColor } = useMemo(() => {
    const cardSurface = getCSSVar('--card-surface', '#141414');
    const accentColor = getCSSVar('--accent-color', '#0678BE');
    return {
      bgColor: hexToRgba(cardSurface, 0.88),
      borderColor: `${accentColor}80`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 1001,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        padding: '4px',
      }}
    >
      <TestPlot showMedian={showMedian} width={PANEL_WIDTH} />
    </div>
  );
};
