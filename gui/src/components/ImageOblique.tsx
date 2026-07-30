import { useImageZoomPan, useObliqueSlice, useProjectSlice, useUiSlice } from '../hooks';
import { DrawOblique } from './DrawOblique';
import { OverlaySvg } from './OverlaySvg';

export const ImageOblique = () => {
  const { firstFramePath } = useProjectSlice();
  const { screenSizes } = useUiSlice();
  const { imageWidth, imageHeight, factor } = screenSizes;
  const { isDefaultCoordinates } = useObliqueSlice();

  const { scale, position, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, handleDragStart } =
    useImageZoomPan({
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
        position: 'relative',
        overflow: 'hidden',
      }}
      onWheel={isDefaultCoordinates ? undefined : handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
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
          <DrawOblique
            width={imageWidth!}
            height={imageHeight!}
            factor={factor!}
            scale={scale}
            position={position}
            layers={layers}
          />
        )}
      </OverlaySvg>
    </div>
  );
};
