import { useState } from 'react';
import { useUiSlice } from '../hooks';
import { TestPlot } from './Graphs';
import { getCSSVar } from '../helpers/getCSSVar';

const PANEL_WIDTH = 180;
const PANEL_HEIGHT = 144; // PANEL_WIDTH * 0.8
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
  const { theme } = useUiSlice(); // subscribes to theme changes so getCSSVar re-reads on re-render

  const [position, setPosition] = useState({
    x: containerWidth - PANEL_WIDTH - MARGIN,
    y: containerHeight - PANEL_HEIGHT - MARGIN,
  });

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
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const cardSurface = getCSSVar('--card-surface');
  const accentColor = getCSSVar('--accent-color');
  const bgColor = hexToRgba(cardSurface, 0.88);
  const borderColor = `${accentColor}80`;

  // suppress unused-var lint warning — theme is read to trigger re-renders on theme switch
  void theme;

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
        cursor: 'grab',
        userSelect: 'none',
        padding: '4px',
      }}
    >
      <TestPlot showMedian={showMedian} width={PANEL_WIDTH} />
    </div>
  );
};
