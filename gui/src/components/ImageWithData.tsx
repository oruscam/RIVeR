import { useWizard } from 'react-use-wizard';
import { useDataSlice, useProjectSlice, useUiSlice } from '../hooks';
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

  if (!width || !height || !factor) return null;

  const realWidth = vertical ? widthReduced : width;
  const realHeight = vertical ? heightReduced : height;
  const realFactor = vertical ? factorReduced : factor;

  const data = useMemo(() => {
    if (quiver === null ) return [];
    return getQuiverValues(quiver, showMedian as boolean, images.active, parameters.step, videoData.fps);
  }, [quiver, images.active, showMedian]);

  return (
    <div className="image-with-data-container" style={{ width: realWidth, height: realHeight }}>
      <img src={paths[active]} className="simple-image" />
      <img src={processing.maskPath} className="mask" />

      <Quiver width={realWidth!} height={realHeight!} factor={realFactor!} data={data} />

      { quiver !== null && <ColorBar data={data} /> }

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
    </div>
  );
};
