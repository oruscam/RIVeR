import { useWizard } from 'react-use-wizard';
import { useDataSlice, useProjectSlice, useSectionSlice, useUiSlice } from '../hooks';
import { WindowSizes } from './WindowSizes';
import { Quiver } from './Quiver';
import { MODULE_NUMBER } from '../constants/constants';
import { DrawSections } from './DrawSections';
import { Layer, Stage } from 'react-konva';
import { useMemo, useRef } from 'react';
import { ColorBar } from './ColorBar';
import { QuiverData } from '../../commons/types';
import { getQuiverValues, createColorMap, Normalize } from '../../commons/vectors';

export const ImageWithData = ({ showMedian }: { showMedian?: boolean }) => {
  const { screenSizes } = useUiSlice();
  const {
    imageWidth: width,
    imageHeight: height,
    factor,
    heightReduced,
    widthReduced,
    factorReduced,
    vertical,
  } = screenSizes;
  const { processing, images, quiver, colorbarLimits } = useDataSlice();
  const { activeStep } = useWizard();
  const { video } = useProjectSlice();
  const { paths, active } = images;
  const { data: videoData, parameters } = video;

  // Define the type for QuiverData (import or declare if not already)
  // import { QuiverData } from '../types/QuiverData'; // Uncomment if you have a type file

  type PrevRefType = {
    activeImage: typeof images.active;
    data: QuiverData[];
    min: number;
    max: number;
  };

  const prevRef = useRef<PrevRefType>({ activeImage: images.active, data: [], min: 0, max: 0 });

  const { transformationMatrix } = useSectionSlice();

  if (!width || !height || !factor) return null;

  const realWidth = vertical ? widthReduced : width;
  const realHeight = vertical ? heightReduced : height;
  const realFactor = vertical ? factorReduced : factor;

  const { data, min, max } = useMemo(() => {

    if (quiver === null) {
      prevRef.current = { activeImage: images.active, data: [], min: 0, max: 0 };
      return { data: [], min: 0, max: 0 };
    }
    if (prevRef.current.activeImage !== images.active && activeStep === MODULE_NUMBER.PROCESSING) {
      prevRef.current.activeImage = images.active;
      return { data: [], min: 0, max: 0 };
    }

    const { data, min, max } = getQuiverValues(quiver, showMedian as boolean, images.active, parameters.step, videoData.fps, transformationMatrix);
    prevRef.current = { activeImage: images.active, data, min, max };

    if (colorbarLimits.default === false) {
      const manualMin = colorbarLimits.min!;
      const manualMax = colorbarLimits.max!;
      const norm = new Normalize(manualMin, manualMax);
      const colorMap = createColorMap();
      const recoloredData = data.map((d) => {
        const clamped = Math.max(manualMin, Math.min(manualMax, d.velocity));
        const normalizedValue = norm.normalize(clamped);
        const colorIndex = Math.max(0, Math.min(Math.floor(normalizedValue * (colorMap.length - 1)), colorMap.length - 1));
        return { ...d, color: colorMap[colorIndex] };
      });
      return { data: recoloredData, min: manualMin, max: manualMax };
    }

    return { data, min, max };

  }, [quiver, images.active, showMedian, colorbarLimits.default, colorbarLimits.min, colorbarLimits.max]);

  return (
    <div className="image-with-data-container" style={{ width: realWidth, height: realHeight }}>
      <img src={paths[active]} className="simple-image" />
      <img src={processing.maskPath} className="mask" />

      {data.length !== 0 && <ColorBar min={min} max={max} />}

      <Stage
        width={vertical ? widthReduced : width}
        height={vertical ? heightReduced : height}
        className="konva-data-container"
      >
        <Layer>
          <DrawSections factor={realFactor!} draggable={false} />

          {activeStep === MODULE_NUMBER.PROCESSING && <WindowSizes width={realWidth!} height={realHeight!} />}
        </Layer>
      </Stage>
      <Quiver width={realWidth!} height={realHeight!} factor={realFactor!} data={data} showMedian={showMedian} />
    </div>
  );
};
