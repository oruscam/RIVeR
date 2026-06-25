import { useRef, useState, useCallback } from 'react';
import { StabilizationRegion } from '../../store/project/types';
import { ConfirmMaskBtn } from '../CustomIcons/ConfirmMaskBtn';

const MASK_COLOR = '#ED6B57';
const HANDLE_RADIUS = 8;

type Handle = 'tl' | 'tr' | 'bl' | 'br' | 'body';

interface DragState {
  handle: Handle;
  startMouseX: number;
  startMouseY: number;
  startRegion: StabilizationRegion;
  regionIndex: number;
}

interface Props {
  videoWidth: number;
  videoHeight: number;
  regions: StabilizationRegion[];
  activeRegionIndex: number | null;
  onUpdateRegion: (index: number, region: StabilizationRegion) => void;
  onConfirm: () => void;
}

export const StabilizationCanvas = ({
  videoWidth,
  videoHeight,
  regions,
  activeRegionIndex,
  onUpdateRegion,
  onConfirm,
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const svgCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = videoWidth / rect.width;
      const scaleY = videoHeight / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    [videoWidth, videoHeight]
  );

  const clampRegion = (r: StabilizationRegion): StabilizationRegion => {
    const x = Math.max(0, Math.min(r.x, videoWidth - 10));
    const y = Math.max(0, Math.min(r.y, videoHeight - 10));
    const width = Math.max(10, Math.min(r.width, videoWidth - x));
    const height = Math.max(10, Math.min(r.height, videoHeight - y));
    return { x, y, width, height };
  };

  const handleMouseDown = (e: React.MouseEvent, index: number, handle: Handle) => {
    if (index !== activeRegionIndex) return;
    e.preventDefault();
    e.stopPropagation();
    const pos = svgCoords(e.clientX, e.clientY);
    setDrag({
      handle,
      startMouseX: pos.x,
      startMouseY: pos.y,
      startRegion: { ...regions[index] },
      regionIndex: index,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drag) return;
    e.preventDefault();
    const pos = svgCoords(e.clientX, e.clientY);
    const dx = pos.x - drag.startMouseX;
    const dy = pos.y - drag.startMouseY;
    const { x, y, width, height } = drag.startRegion;

    let next: StabilizationRegion;

    switch (drag.handle) {
      case 'body':
        next = { x: x + dx, y: y + dy, width, height };
        break;
      case 'tl':
        next = { x: x + dx, y: y + dy, width: width - dx, height: height - dy };
        break;
      case 'tr':
        next = { x, y: y + dy, width: width + dx, height: height - dy };
        break;
      case 'bl':
        next = { x: x + dx, y, width: width - dx, height: height + dy };
        break;
      case 'br':
        next = { x, y, width: width + dx, height: height + dy };
        break;
    }

    onUpdateRegion(drag.regionIndex, clampRegion(next));
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!drag) return;
    e.preventDefault();
    setDrag(null);
  };

  if (videoWidth === 0 || videoHeight === 0) return null;

  const activeRegion = activeRegionIndex !== null ? regions[activeRegionIndex] : null;
  const confirmBtnLeft = activeRegion ? `${((activeRegion.x + activeRegion.width) / videoWidth) * 100}%` : '0';
  const confirmBtnTop = activeRegion
    ? `${((activeRegion.y + activeRegion.height / 2) / videoHeight) * 100}%`
    : '0';

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${videoWidth} ${videoHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          cursor: drag ? 'grabbing' : 'default',
          overflow: 'visible',
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <pattern id="stab-dashFill" patternUnits="userSpaceOnUse" width={10} height={10}>
            <path d="M0 10 L10 0" stroke={MASK_COLOR} strokeWidth={1} />
          </pattern>
        </defs>

        {regions.map((region, index) => {
          const isActive = index === activeRegionIndex;
          const { x, y, width, height } = region;

          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill="url(#stab-dashFill)"
                stroke={MASK_COLOR}
                strokeWidth={isActive ? 2.5 : 1.5}
                strokeDasharray="6 4"
                style={{ cursor: isActive ? 'grab' : 'default' }}
                onMouseDown={(e) => handleMouseDown(e, index, 'body')}
              />
              <text
                x={x + 6}
                y={y + 18}
                fill={MASK_COLOR}
                fontSize={14}
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                {index + 1}
              </text>

              {isActive && (
                <>
                  <circle
                    cx={x}
                    cy={y}
                    r={HANDLE_RADIUS}
                    fill={MASK_COLOR}
                    style={{ cursor: 'nw-resize' }}
                    onMouseDown={(e) => handleMouseDown(e, index, 'tl')}
                  />
                  <circle
                    cx={x + width}
                    cy={y}
                    r={HANDLE_RADIUS}
                    fill={MASK_COLOR}
                    style={{ cursor: 'ne-resize' }}
                    onMouseDown={(e) => handleMouseDown(e, index, 'tr')}
                  />
                  <circle
                    cx={x}
                    cy={y + height}
                    r={HANDLE_RADIUS}
                    fill={MASK_COLOR}
                    style={{ cursor: 'sw-resize' }}
                    onMouseDown={(e) => handleMouseDown(e, index, 'bl')}
                  />
                  <circle
                    cx={x + width}
                    cy={y + height}
                    r={HANDLE_RADIUS}
                    fill={MASK_COLOR}
                    style={{ cursor: 'se-resize' }}
                    onMouseDown={(e) => handleMouseDown(e, index, 'br')}
                  />
                </>
              )}
            </g>
          );
        })}
      </svg>

      {activeRegion && (
        <div
          style={{
            position: 'absolute',
            left: confirmBtnLeft,
            top: confirmBtnTop,
            transform: 'translate(8px, -50%)',
            zIndex: 10,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <ConfirmMaskBtn onClick={onConfirm} title="Confirm region" />
        </div>
      )}
    </>
  );
};
