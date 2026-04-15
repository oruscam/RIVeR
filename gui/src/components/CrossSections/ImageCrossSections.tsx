import { useCallback, useState } from "react";
import { useDataSlice, useImageZoomPan, useProjectSlice, useUiSlice } from "../../hooks";
import { OverlaySvg } from "../OverlaySvg";
import { DrawSectionsD3 } from "./DrawSectionsD3";
import { DrawMask } from "../DrawMask";
import { ConfirmMaskBtn } from "../CustomIcons/ConfirmMaskBtn";

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


  // Compute screen-space position of the active mask centroid.
  // Prefer livePoints (updated every frame during drag) over Redux state (updated on mouseup).
  const confirmBtnPos = (() => {
    if (activeMaskIndex === null) return null;
    const pts = livePoints.length > 0 ? livePoints : masks[activeMaskIndex];
    if (!pts || pts.length === 0) return null;
    const cx = imageWidth! / 2;
    const cy = imageHeight! / 2;
    // Centroid X and Y — button sits at the center of the polygon
    const sumX = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const sumY = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const vpX = sumX / factor!;
    const vpY = sumY / factor!;
    return {
      x: position.x + cx + (vpX - cx) * scale,
      y: position.y + cy + (vpY - cy) * scale,
    };
  })();

  return (
    <div
      className="image-with-data-container"
      style={{
        width: imageWidth,
        height: imageHeight,
        position: "relative",
        overflow: "hidden",
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
          transformOrigin: "50% 50%",
          willChange: "transform",
        }}
      >
        <img
          src={firstFramePath}
          className="simple-image"
          draggable={false}
          onDragStart={handleDragStart}
          style={{ display: "block", userSelect: "none", pointerEvents: "none" }}
        />
      </div>

      <OverlaySvg width={imageWidth!} height={imageHeight!} scale={scale} position={position}>
        {(layers) => (
          <>
            <DrawMask
              factor={factor!}
              layers={layers}
              scale={scale}
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
        <ConfirmMaskBtn
          onClick={() => onUpdateActiveMask(activeMaskIndex!)}
          title="Confirm mask"
          style={{
            position: 'absolute',
            left: confirmBtnPos.x,
            top: confirmBtnPos.y,
            zIndex: 10,
            pointerEvents: 'auto',
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}
    </div>
  );
};