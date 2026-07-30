import { useImageZoomPan, useProjectSlice, useUiSlice } from '../hooks';
import { DrawUav } from './DrawUav';
import { OverlaySvg } from './OverlaySvg';

interface ImageUavNewProps {
  imageSrc?: string;
}

export const ImageUavNew = ({ imageSrc }: ImageUavNewProps) => {
  const { screenSizes } = useUiSlice();
  const { imageWidth, imageHeight, factor } = screenSizes;
  const { firstFramePath } = useProjectSlice();
  const src = imageSrc ?? firstFramePath;

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
      className="image-with-marks"
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
          transformOrigin: '50% 50%', // centro
          willChange: 'transform',
        }}
      >
        <img
          src={src}
          className="simple-image"
          draggable={false}
          onDragStart={handleDragStart}
          style={{ display: 'block', userSelect: 'none', pointerEvents: 'none' }}
        />
      </div>

      <OverlaySvg width={imageWidth!} height={imageHeight!} position={position} scale={scale}>
        {(layers) => (
          <>
            <DrawUav
              width={imageWidth!}
              height={imageHeight!}
              factor={factor!}
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
