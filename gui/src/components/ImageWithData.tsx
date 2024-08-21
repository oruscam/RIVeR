import { useWizard } from "react-use-wizard";
import {useDataSlice } from "../hooks"
import { WindowSizes } from "./WindowSizes";
import { Quiver } from "./Quiver";
import { PROCESSING_STEP_NUMBER } from "../constants/constants";
import { DrawSections } from "./DrawSections";
import { Layer, Stage } from "react-konva";


export const ImageWithData = ({ width, height, factor, showMedian }: {width: number, height: number, factor: {x: number, y: number}, showMedian?: boolean}) => {
  const { processing, images } = useDataSlice();
  const { activeStep } = useWizard();
  const { paths, active } = images 


  return (
    <div className="image-with-data-container" style={{width: width, height: height}}>
      <img src={paths[active]} className="simple-image"></img>
      <img src={processing.maskPath} className="mask"></img>

      <Quiver width={width} height={height} factor={factor} activeStep={activeStep} showMedian={showMedian}/>

      <Stage width={width} height={height} className="konva-data-container">
        <Layer>
          <DrawSections factor={factor} draggable={false} />  

          {
            activeStep === PROCESSING_STEP_NUMBER && <WindowSizes width={width} height={height}></WindowSizes>
          }
        </Layer>

      </Stage>
      
    </div>
  )
}
