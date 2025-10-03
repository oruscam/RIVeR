import { useWizard } from 'react-use-wizard';
import { useDataSlice, useProjectSlice, useSectionSlice, useUiSlice } from '../hooks';
import { WindowSizes } from './WindowSizes';
import { Quiver } from './Quiver';
import { MODULE_NUMBER } from '../constants/constants';
import { DrawSections } from './DrawSections';
import { Layer, Stage } from 'react-konva';
import { getQuiverValues } from '../helpers/drawVectorsFunctions';
import { useMemo } from 'react';
import { ColorBar } from './ColorBar';

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
  const { processing, images, quiver } = useDataSlice();
  const { activeStep } = useWizard();
  const { video } = useProjectSlice();
  const { paths, active } = images;
  const { data: videoData, parameters } = video;

  const { transformationMatrix } = useSectionSlice();

  if (!width || !height || !factor) return null;

  const realWidth = vertical ? widthReduced : width;
  const realHeight = vertical ? heightReduced : height;
  const realFactor = vertical ? factorReduced : factor;

  const { data, min, max} = useMemo(() => {
    if (quiver === null ) return [];
    return getQuiverValues(quiver, showMedian as boolean, images.active, parameters.step, videoData.fps, transformationMatrix);
  }, [quiver, images.active, showMedian]);

  return (
    <div className="image-with-data-container" style={{ width: realWidth, height: realHeight }}>
      <img src={paths[active]} className="simple-image" />
      <img src={processing.maskPath} className="mask" />


      <div className='values-info'> 
        <span>Step: {parameters.step}- </span>
        <span>FPS: {videoData.fps}</span>
      </div>
      { quiver !== null && <ColorBar min={min} max={max} /> }

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
      <Quiver width={realWidth!} height={realHeight!} factor={realFactor!} data={data} />
    </div>
  );
};
