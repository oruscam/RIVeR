import { useCallback, useState } from 'react';
import { useDataSlice, useImageZoomPan, useProjectSlice, useUiSlice } from '../../hooks';
import { OverlaySvg } from '../OverlaySvg';
import { DrawSectionsD3 } from './DrawSectionsD3';
import { DrawMask } from '../DrawMask';
import { ConfirmMaskBtn } from '../CustomIcons/ConfirmMaskBtn';

const CONFIRM_BTN_MARGIN_PX = 32;
const CONFIRM_BTN_HALF_SIZE = 20;

function computeConfirmButtonPos(
  pts: { x: number; y: number }[],
  factor: number,
  position: { x: number; y: number },
  scale: number,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number } | null {
  if (pts.length < 2) return null;

  const vp = pts.map((p) => ({ x: p.x / factor, y: p.y / factor }));
  const n = vp.length;
  const centX = vp.reduce((s, p) => s + p.x, 0) / n;
  const centY = vp.reduce((s, p) => s + p.y, 0) / n;
  const cx = imageWidth / 2;
  const cy = imageHeight / 2;
  const toScreen = (vx: number, vy: number) => ({
    x: position.x + cx + (vx - cx) * scale,
    y: position.y + cy + (vy - cy) * scale,
  });

  const candidates: { x: number; y: number }[] = [];

  for (let i = 0; i < n; i++) {
    const v = vp[i];
    const next = vp[(i + 1) % n];

    // Midpoint of edge (intermediate node position)
    const midX = (v.x + next.x) / 2;
    const midY = (v.y + next.y) / 2;

    // Quarter point: centered between vertex and intermediate node
    const qX = (v.x + midX) / 2;
    const qY = (v.y + midY) / 2;

    const edgeDx = next.x - v.x;
    const edgeDy = next.y - v.y;
    const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
    if (edgeLen < 1e-10) continue;

    // Perpendicular normal candidate
    const nx = -edgeDy / edgeLen;
    const ny = edgeDx / edgeLen;

    // Outward = away from centroid
    const dot = (centX - qX) * nx + (centY - qY) * ny;
    const outNx = dot > 0 ? -nx : nx;
    const outNy = dot > 0 ? -ny : ny;

    const marginVP = CONFIRM_BTN_MARGIN_PX / scale;
    candidates.push(toScreen(qX + outNx * marginVP, qY + outNy * marginVP));
  }

  const inBounds = (c: { x: number; y: number }) =>
    c.x - CONFIRM_BTN_HALF_SIZE >= 0 &&
    c.x + CONFIRM_BTN_HALF_SIZE <= imageWidth &&
    c.y - CONFIRM_BTN_HALF_SIZE >= 0 &&
    c.y + CONFIRM_BTN_HALF_SIZE <= imageHeight;

  const valid = candidates.find(inBounds);
  if (valid) return valid;

  // Fallback: candidate closest to image center
  let best: { x: number; y: number } | null = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const dist = (c.x - cx) ** 2 + (c.y - cy) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}

export const ImageCrossSections = () => {
  const { screenSizes } = useUiSlice();
  const { imageWidth, imageHeight, factor } = screenSizes;
  const { firstFramePath } = useProjectSlice();
  const { processing, onUpdateActiveMask } = useDataSlice();
  const { masks, activeMaskIndex } = processing;

  // Live points streamed from DrawMask during drag — enables real-time button tracking
  const [livePoints, setLivePoints] = useState<{ x: number; y: number }[]>([]);
  const handleLivePoints = useCallback((pts: { x: number; y: number }[]) => {
    setLivePoints(pts);
  }, []);

  const {
    scale,
    position,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    handleDragStart,
  } = useImageZoomPan({
    containerWidth: imageWidth!,
    containerHeight: imageHeight!,
    minScale: 1,
    maxScale: 10,
    zoomSpeed: 0.0005,
    enableKeyboardNav: true,
    keyboardStep: 25,
  });

  // Prefer livePoints (updated every frame during drag) over Redux state (updated on mouseup).
  const confirmBtnPos = (() => {
    if (activeMaskIndex === null) return null;
    const pts = livePoints.length > 0 ? livePoints : masks[activeMaskIndex];
    if (!pts || pts.length === 0) return null;
    return computeConfirmButtonPos(pts, factor!, position, scale, imageWidth!, imageHeight!);
  })();

  return (
    <div
      className="image-with-data-container"
      style={{
        width: imageWidth,
        height: imageHeight,
        position: 'relative',
        overflow: 'hidden',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onDragStart={handleDragStart}
    >
      <div
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: '50% 50%',
          willChange: 'transform',
        }}
      >
        <img
          src={firstFramePath}
          className="simple-image"
          draggable={false}
          onDragStart={handleDragStart}
          style={{ display: 'block', userSelect: 'none', pointerEvents: 'none' }}
        />
      </div>

      <OverlaySvg width={imageWidth!} height={imageHeight!} scale={scale} position={position}>
        {(layers) => (
          <>
            <DrawMask
              factor={factor!}
              layers={layers}
              scale={scale}
              imageWidth={imageWidth!}
              imageHeight={imageHeight!}
              onLivePoints={handleLivePoints}
            />

            <DrawSectionsD3
              width={imageWidth!}
              height={imageHeight!}
              factor={factor!}
              module="x-sections"
              scale={scale}
              position={position}
              layers={layers}
            />
          </>
        )}
      </OverlaySvg>

      {/* Floating confirm button — follows the active mask centroid */}
      {confirmBtnPos && (
        <div
          style={{
            position: 'absolute',
            left: confirmBtnPos.x,
            top: confirmBtnPos.y,
            zIndex: 10,
            transform: 'translate(-50%, -50%)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <ConfirmMaskBtn onClick={() => onUpdateActiveMask(activeMaskIndex!)} title="Confirm mask" />
        </div>
      )}
    </div>
  );
};
