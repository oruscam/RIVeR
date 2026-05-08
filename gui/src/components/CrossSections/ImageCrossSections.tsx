import { useImageZoomPan, useProjectSlice, useUiSlice } from "../../hooks";
import { OverlaySvg } from "../OverlaySvg";
import { DrawSectionsD3 } from "./DrawSectionsD3";
import { DrawMask } from "../DrawMask";

export const ImageCrossSections = () => {
  const { screenSizes } = useUiSlice();
  const { imageWidth, imageHeight, factor } = screenSizes;
  const { firstFramePath } = useProjectSlice();

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
    </div>
  );
};