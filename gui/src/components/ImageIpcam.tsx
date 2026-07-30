import { useEffect, useState } from 'react';
import { useImageZoomPan, useIpcamSlice, useProjectSlice, useUiSlice } from '../hooks';
import { OverlaySvg } from './OverlaySvg';
import { DrawIpcam } from './DrawIpcam';

export const ImageIpcam = () => {
  const { screenSizes } = useUiSlice();
  const { imageWidth, imageHeight, factor } = screenSizes;
  const { importedImages, activeImage } = useIpcamSlice();
  const { firstFramePath } = useProjectSlice();

  const [newImageSrc, setNewImageSrc] = useState<string>(
    importedImages !== null ? importedImages[activeImage!] : firstFramePath
  );

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

  useEffect(() => {
    if (importedImages === null) return;
    if (activeImage === null) return;
    const newImageSrc = importedImages[activeImage];
    setNewImageSrc(newImageSrc);
  }, [importedImages, activeImage, firstFramePath]);

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
          src={newImageSrc}
          className="simple-image"
          draggable={false}
          onDragStart={handleDragStart}
          style={{ display: 'block', userSelect: 'none', pointerEvents: 'none' }}
        />
      </div>
      <OverlaySvg width={imageWidth!} height={imageHeight!} scale={scale} position={position}>
        {(layers) => (
          <DrawIpcam
            factor={factor!}
            width={imageWidth!}
            height={imageHeight!}
            scale={scale}
            position={position}
            layers={layers}
          />
        )}
      </OverlaySvg>
    </div>
  );
};
