import { useWizard } from "react-use-wizard";
import { useDataSlice, useUiSlice } from "../hooks"
import { WindowSizes } from "./WindowSizes";
import { Quiver } from "./Quiver";
import { MODULE_NUMBER } from "../constants/constants";
import { DrawSections } from "./DrawSections";
import { Layer, Stage } from "react-konva";


export const ImageWithData = ({ showMedian }: { showMedian?: boolean }) => {
  const { screenSizes } = useUiSlice()
  const { imageWidth: width, imageHeight: height, factor } = screenSizes
  const { processing, images } = useDataSlice();
  const { activeStep } = useWizard();
  const { paths, active } = images


  if(!width || !height || !factor) return null

  return (
    <div className="image-with-data-container" style={{ width: width, height: height }}>
      <img src={paths[active]} className="simple-image"></img>
      <img src={processing.maskPath} className="mask"></img>

      <Quiver width={width} height={height} factor={factor} showMedian={showMedian} />

      <Stage width={width} height={height} className="konva-data-container">
        <Layer>
          <DrawSections factor={factor} draggable={false} />

          {
            activeStep === MODULE_NUMBER.PROCESSING && <WindowSizes width={width} height={height}></WindowSizes>
          }
        </Layer>

      </Stage>

    </div>
  )
}


