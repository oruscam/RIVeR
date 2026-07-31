import { useRef, useState, useCallback, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StabilizationRegion } from '../../store/project/types';
import { ConfirmMaskBtn } from '../CustomIcons/ConfirmMaskBtn';

const MASK_COLOR = 'var(--d12)';
const HANDLE_RADIUS = 7;
const HANDLE_HOVER_RADIUS = 11;
const LABEL_OFFSET = 14;
const CONFIRM_BTN_MARGIN_PX = 32;
const CONFIRM_BTN_HALF_SIZE_PX = 20;

type Handle = 'tl' | 'tr' | 'bl' | 'br' | 'body';

// Picks a spot for the confirm button around the region (right/left/bottom/top,
// in that order of preference) that keeps it fully inside the visible video
// frame, same approach used for the mask confirm button in ImageCrossSections.
function computeRegionConfirmBtnPos(
  region: StabilizationRegion,
  videoWidth: number,
  videoHeight: number,
  scaleX: number,
  scaleY: number
): { x: number; y: number } {
  const marginX = CONFIRM_BTN_MARGIN_PX * scaleX;
  const marginY = CONFIRM_BTN_MARGIN_PX * scaleY;
  const halfW = CONFIRM_BTN_HALF_SIZE_PX * scaleX;
  const halfH = CONFIRM_BTN_HALF_SIZE_PX * scaleY;

  const centerX = region.x + region.width / 2;
  const centerY = region.y + region.height / 2;

  const candidates = [
    { x: region.x + region.width + marginX, y: centerY }, // right
    { x: region.x - marginX, y: centerY }, // left
    { x: centerX, y: region.y + region.height + marginY }, // bottom
    { x: centerX, y: region.y - marginY }, // top
  ];

  const inBounds = (c: { x: number; y: number }) =>
    c.x - halfW >= 0 && c.x + halfW <= videoWidth && c.y - halfH >= 0 && c.y + halfH <= videoHeight;

  const valid = candidates.find(inBounds);
  if (valid) return valid;

  // Fallback: clamp the preferred (right) candidate directly into bounds
  const fallback = candidates[0];
  return {
    x: Math.min(Math.max(fallback.x, halfW), videoWidth - halfW),
    y: Math.min(Math.max(fallback.y, halfH), videoHeight - halfH),
  };
}

// Small floating badge above each region, same look as the pin labels
// used elsewhere in the app (dark rounded chip, auto-sized to the text).
const RegionLabel = ({
  x,
  y,
  text,
  size,
  videoWidth,
  videoHeight,
}: {
  x: number;
  y: number;
  text: string;
  /** Converts a desired constant on-screen pixel size into viewBox units — same
   *  helper used for the corner handles, so the label matches the mask label size. */
  size: (px: number) => number;
  /** Bounds the label's background box must stay fully inside — same
   *  "never leave the visible screen" rule as the region confirm button. */
  videoWidth: number;
  videoHeight: number;
}) => {
  const textRef = useRef<SVGTextElement>(null);
  const [box, setBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    if (textRef.current) {
      setBox(textRef.current.getBBox());
    }
  }, [text, x, y, size]);

  const padX = size(6);
  const padY = size(3);

  let dx = 0;
  let dy = 0;
  if (box) {
    const left = box.x - padX;
    const right = box.x + box.width + padX;
    const top = box.y - padY;
    const bottom = box.y + box.height + padY;

    if (left < 0) dx = -left;
    else if (right > videoWidth) dx = videoWidth - right;
    if (top < 0) dy = -top;
    else if (bottom > videoHeight) dy = videoHeight - bottom;
  }

  return (
    <g style={{ pointerEvents: 'none' }} transform={`translate(${dx}, ${dy})`}>
      {box && (
        <rect
          x={box.x - padX}
          y={box.y - padY}
          width={box.width + padX * 2}
          height={box.height + padY * 2}
          rx={3}
          ry={3}
          fill="rgba(50, 50, 50, 0.85)"
        />
      )}
      <text
        ref={textRef}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size(13)}
        fontWeight={600}
        fill={MASK_COLOR}
      >
        {text}
      </text>
    </g>
  );
};

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
  /** Current video zoom scale — used to counter-scale the confirm button so
   *  it keeps a constant on-screen size, same as the mask confirm button. */
  zoomScale: number;
}

export const StabilizationCanvas = ({
  videoWidth,
  videoHeight,
  regions,
  activeRegionIndex,
  zoomScale,
  onUpdateRegion,
  onConfirm,
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<Handle | null>(null);
  const { t } = useTranslation();

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

  const clampRegion = (r: StabilizationRegion, handle: Handle): StabilizationRegion => {
    if (handle === 'body') {
      // Dragging the whole region must never shrink it — only its position is
      // constrained, so it stops flush against an edge instead of squashing.
      const width = Math.max(10, Math.min(r.width, videoWidth));
      const height = Math.max(10, Math.min(r.height, videoHeight));
      const x = Math.max(0, Math.min(r.x, videoWidth - width));
      const y = Math.max(0, Math.min(r.y, videoHeight - height));
      return { x, y, width, height };
    }

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

    onUpdateRegion(drag.regionIndex, clampRegion(next, drag.handle));
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!drag) return;
    e.preventDefault();
    setDrag(null);
  };

  if (videoWidth === 0 || videoHeight === 0) return null;

  const activeRegion = activeRegionIndex !== null ? regions[activeRegionIndex] : null;

  // viewBox units per on-screen pixel at the current render size/zoom level —
  // multiplying a desired constant screen-pixel size by this keeps handles the
  // same on-screen size regardless of zoom, same behavior as the mask points.
  const rect = svgRef.current?.getBoundingClientRect();
  const scaleX = rect && rect.width > 0 ? videoWidth / rect.width : 1;
  const scaleY = rect && rect.height > 0 ? videoHeight / rect.height : 1;
  const size = (px: number) => px * ((scaleX + scaleY) / 2);

  let confirmBtnLeft = '0';
  let confirmBtnTop = '0';

  if (activeRegion) {
    const btnPos = computeRegionConfirmBtnPos(activeRegion, videoWidth, videoHeight, scaleX, scaleY);
    confirmBtnLeft = `${(btnPos.x / videoWidth) * 100}%`;
    confirmBtnTop = `${(btnPos.y / videoHeight) * 100}%`;
  }

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
                fill="transparent"
                stroke={MASK_COLOR}
                strokeWidth={isActive ? 2 : 1.5}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: isActive ? 'grab' : 'default' }}
                onMouseDown={(e) => handleMouseDown(e, index, 'body')}
              />

              <RegionLabel
                x={x + width / 2}
                y={y - size(LABEL_OFFSET)}
                text={`${t('VideoRange.stabilizationRegion', { defaultValue: 'Region' })} ${index + 1}`}
                size={size}
                videoWidth={videoWidth}
                videoHeight={videoHeight}
              />

              {isActive && (
                <>
                  <circle
                    cx={x}
                    cy={y}
                    r={size(hoveredHandle === 'tl' ? HANDLE_HOVER_RADIUS : HANDLE_RADIUS)}
                    fill={MASK_COLOR}
                    style={{ cursor: 'nw-resize', transition: 'r 150ms' }}
                    onMouseEnter={() => setHoveredHandle('tl')}
                    onMouseLeave={() => setHoveredHandle(null)}
                    onMouseDown={(e) => handleMouseDown(e, index, 'tl')}
                  />
                  <circle
                    cx={x + width}
                    cy={y}
                    r={size(hoveredHandle === 'tr' ? HANDLE_HOVER_RADIUS : HANDLE_RADIUS)}
                    fill={MASK_COLOR}
                    style={{ cursor: 'ne-resize', transition: 'r 150ms' }}
                    onMouseEnter={() => setHoveredHandle('tr')}
                    onMouseLeave={() => setHoveredHandle(null)}
                    onMouseDown={(e) => handleMouseDown(e, index, 'tr')}
                  />
                  <circle
                    cx={x}
                    cy={y + height}
                    r={size(hoveredHandle === 'bl' ? HANDLE_HOVER_RADIUS : HANDLE_RADIUS)}
                    fill={MASK_COLOR}
                    style={{ cursor: 'sw-resize', transition: 'r 150ms' }}
                    onMouseEnter={() => setHoveredHandle('bl')}
                    onMouseLeave={() => setHoveredHandle(null)}
                    onMouseDown={(e) => handleMouseDown(e, index, 'bl')}
                  />
                  <circle
                    cx={x + width}
                    cy={y + height}
                    r={size(hoveredHandle === 'br' ? HANDLE_HOVER_RADIUS : HANDLE_RADIUS)}
                    fill={MASK_COLOR}
                    style={{ cursor: 'se-resize', transition: 'r 150ms' }}
                    onMouseEnter={() => setHoveredHandle('br')}
                    onMouseLeave={() => setHoveredHandle(null)}
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
            // Counteract the video's own zoom scale (applied by an ancestor)
            // so the button stays the same on-screen size at any zoom level.
            transform: `translate(-50%, -50%) scale(${1 / zoomScale})`,
            zIndex: 10,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <ConfirmMaskBtn onClick={onConfirm} title="Confirm region" style={{ background: MASK_COLOR }} />
        </div>
      )}
    </>
  );
};
