import { useMemo, useRef } from 'react';
import { useDataSlice, useImageZoomPan, useProjectSlice, useSectionSlice, useUiSlice } from '../hooks';
import { ColorBar } from './ColorBar';
import { WindowSizesNew } from './WindowSizesNew';
import { Quiver } from './Quiver';
import { DrawSectionsD3 } from './CrossSections/DrawSectionsD3';
import { OverlaySvg } from './OverlaySvg';
import { OverlayLayersControl, OverlayLayerVisibility } from './OverlayLayersControl';
import { StationSearchLines } from './StationSearchLines';
import { getQuiverValues, createColorMap, Normalize } from '../../commons/vectors';
import { getStiColorScale } from '../helpers';
import { StiViewer } from './StiViewer';
import { IWaveViewer } from './IWaveViewer';
import type { PreviewMode } from '../store/ui/types';
import type { IwaveSpectraSidecar } from '../../electron/ipcMainHandlers/getIwaveSpectra';

export const ImageProcessing = ({
  showMedian,
  previewMode = 'frames',
  stiPaths,
  stiEmptyLabels,
  spectrumPaths,
  spectrumEmptyLabels,
  spectraSidecar,
}: {
  showMedian?: boolean;
  previewMode?: PreviewMode;
  /** One slot per station ('' where STIV wrote no STI), so `active` is the station index. */
  stiPaths?: string[];
  /** Why each station has no STI, index-aligned with stiPaths. */
  stiEmptyLabels?: string[];
  /** One slot per station ('' where iWave wrote no spectrum), so `active` is the station index. */
  spectrumPaths?: string[];
  /** Why each station has no spectrum, index-aligned with spectrumPaths. */
  spectrumEmptyLabels?: string[];
  spectraSidecar?: IwaveSpectraSidecar | null;
}) => {
  const { screenSizes, showInterrogationWindow, overlayVisibility, onSetOverlayVisible } = useUiSlice();
  const { video } = useProjectSlice();
  const { processing, images, quiver, fullQuiver, colorbarLimits } = useDataSlice();
  const { transformationMatrix, sections, activeSection } = useSectionSlice();
  const {
    imageWidth: width,
    imageHeight: height,
    factor,
    heightReduced,
    widthReduced,
    factorReduced,
    vertical,
  } = screenSizes;
  const { parameters, data: videoData } = video;
  const { paths, active } = images;

  const { activeMaskIndex } = processing;

  const containerRef = useRef<HTMLDivElement>(null);

  const realWidth = vertical ? widthReduced : width;
  const realHeight = vertical ? heightReduced : height;
  const realFactor = vertical ? factorReduced : factor;

  const { data, min, max } = useMemo(() => {
    // The "Test" result only covers the frame pair it was run on, and has no
    // median (a median is meaningless for a single pair). Show it while that
    // pair is active and median isn't requested; otherwise fall back to the
    // last full "Analize" result (if any) instead of blanking the vector map.
    const isTestFrame = quiver !== null && quiver.test === true && quiver.testFrameIndex === images.active;
    const displayQuiver = isTestFrame && !showMedian ? quiver : fullQuiver;

    if (displayQuiver === null) {
      return { data: [], min: 0, max: 0 };
    }

    const { data, min, max } = getQuiverValues(
      displayQuiver,
      showMedian as boolean,
      images.active,
      parameters.step,
      videoData.fps,
      transformationMatrix
    );
    // If the user has set custom colorbar limits, apply them
    if (colorbarLimits.default === false) {
      const manualMin = colorbarLimits.min!;
      const manualMax = colorbarLimits.max!;
      const norm = new Normalize(manualMin, manualMax);
      const colorMap = createColorMap();
      const recoloredData = data.map((d) => {
        const clamped = Math.max(manualMin, Math.min(manualMax, d.velocity));
        const normalizedValue = norm.normalize(clamped);
        const colorIndex = Math.max(
          0,
          Math.min(Math.floor(normalizedValue * (colorMap.length - 1)), colorMap.length - 1)
        );
        return { ...d, color: colorMap[colorIndex] };
      });
      return { data: recoloredData, min: manualMin, max: manualMax };
    }
    return { data, min, max };
  }, [
    quiver,
    fullQuiver,
    images.active,
    showMedian,
    colorbarLimits.default,
    colorbarLimits.min,
    colorbarLimits.max,
    parameters.step,
    videoData.fps,
    transformationMatrix,
  ]);

  const { isDragging, scale, position } = useImageZoomPan({
    containerWidth: realWidth!,
    containerHeight: realHeight!,
    minScale: 1,
    maxScale: 1,
    zoomSpeed: 0.001,
    enableKeyboardNav: false,
    keyboardStep: 25,
  });

  // Results exist, not "this frame has arrows": the Vectors chip and the STIV-lines default must not
  // come and go as the active frame changes.
  const hasVectors = fullQuiver !== null || quiver !== null;

  if (!width || !height || !factor) return null;

  if (previewMode === 'sti') {
    // Same bounds the STI's ticks, lines, and badge use, so the bar is a legend for
    // exactly what is drawn. ColorBar writes through to the shared colorbarLimits,
    // which is what makes manually locked limits apply to the PIV view too.
    const { min: stiMin, max: stiMax } = getStiColorScale(
      sections[activeSection]?.data?.stiv_velocity_profile,
      colorbarLimits
    );

    return (
      <div className="image-with-data-container" style={{ width: realWidth, height: realHeight }}>
        <StiViewer
          stiPaths={stiPaths ?? []}
          emptyLabel={stiEmptyLabels?.[active] ?? ''}
          activeStation={active}
          containerWidth={realWidth!}
          containerHeight={Math.max(0, realHeight! - 90)}
        />
        {stiMin !== null && stiMax !== null && <ColorBar min={stiMin} max={stiMax} />}
      </div>
    );
  }

  if (previewMode === 'iwave') {
    return (
      <div className="image-with-data-container" style={{ width: realWidth, height: realHeight }}>
        <IWaveViewer
          spectrumPaths={spectrumPaths ?? []}
          emptyLabel={spectrumEmptyLabels?.[active] ?? ''}
          sidecar={spectraSidecar ?? null}
          activeStation={active}
          containerWidth={realWidth!}
          containerHeight={Math.max(0, realHeight! - 90)}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="image-with-data-container"
      style={{
        width: realWidth,
        height: realHeight,
        cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default',
      }}
    >
      <div style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}>
        <img src={paths[active]} className="simple-image" draggable={false} />
        <img src={processing.maskPath} className="mask" draggable={false} />
      </div>

      {data.length === 0 && activeMaskIndex === null && showInterrogationWindow && (
        <WindowSizesNew width={realWidth!} height={realHeight!} />
      )}

      {activeMaskIndex === null && (
        <OverlayLayersControl
          visibility={overlayVisibility}
          hasStations={(sections[activeSection]?.numStations ?? 0) >= 2}
          hasVectors={hasVectors}
          onSetVisible={onSetOverlayVisible}
        />
      )}

      {activeMaskIndex === null && (
        <OverlaySvg width={realWidth!} height={realHeight!} scale={scale} position={position}>
          {(layers) => (
            <>
              <DrawSectionsD3
                width={realWidth!}
                height={realHeight!}
                factor={realFactor!}
                module="processing"
                scale={scale}
                position={position}
                layers={layers}
              />
              <StationSearchLines factor={realFactor!} layers={layers} />
              <Quiver
                width={realWidth!}
                height={realHeight!}
                factor={realFactor!}
                data={data}
                showMedian={showMedian}
                layers={layers}
              />
              <OverlayLayerVisibility layers={layers} visibility={overlayVisibility} hasVectors={hasVectors} />
            </>
          )}
        </OverlaySvg>
      )}

      {/* ColorBar out of the container with zoom */}
      {min !== undefined && max !== undefined && data.length !== 0 && activeMaskIndex === null && (
        <ColorBar min={min} max={max} />
      )}
    </div>
  );
};
