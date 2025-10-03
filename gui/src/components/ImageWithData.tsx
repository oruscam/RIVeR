import { useWizard } from "react-use-wizard";
import { useDataSlice, useUiSlice } from "../hooks";
import { WindowSizes } from "./WindowSizes";
import { Quiver } from "./Quiver";
import { MODULE_NUMBER } from "../constants/constants";
import { DrawSections } from "./DrawSections";
import { Layer, Stage } from "react-konva";

export const ImageWithData = ({ showMedian }: { showMedian?: boolean }) => {
  const { screenSizes } = useUiSlice();
  const { imageWidth: width, imageHeight: height, factor, heightReduced, widthReduced, factorReduced, vertical } = screenSizes;
  const { processing, images } = useDataSlice();
  const { activeStep } = useWizard();
  const { paths, active } = images;

  if (!width || !height || !factor) return null;

  const realWidth = vertical ? widthReduced : width;
  const realHeight = vertical ? heightReduced : height;
  const realFactor = vertical ? factorReduced : factor;

  return (
    <div
      className="image-with-data-container"
      style={{ width: realWidth, height: realHeight }}
    >
      <img src={paths[active]} className="simple-image"/>
      <img src={processing.maskPath} className="mask"/>

      <Quiver
        width={realWidth!}
        height={realHeight!}
        factor={realFactor!}
        showMedian={showMedian}
      />

      <Stage width={vertical ? widthReduced : width} height={vertical ? heightReduced : height} className="konva-data-container">
        <Layer>
          <DrawSections factor={realFactor!} draggable={false} />

          {activeStep === MODULE_NUMBER.PROCESSING && (
            <WindowSizes width={realWidth!} height={realHeight!}/>
          )}
        </Layer>
      </Stage>
    </div>
  );
};
