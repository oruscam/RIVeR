import { useWizard } from "react-use-wizard";
import {useDataSlice } from "../hooks"
import { WindowSizes } from "./WindowSizes";
import { Quiver } from "./Quiver";
import { PROCESSING_STEP_NUMBER } from "../constants/constants";


export const ImageWithData = ({ width, height, factor }: {width: number, height: number, factor: {x: number, y: number}}) => {
  const { processing, images } = useDataSlice();
  const { activeStep } = useWizard();
  const { paths, active } = images 


  console.log(activeStep)

  return (
    <div className="image-with-data-container" style={{width: width, height: height}}>
      <img src={paths[active]} className="simple-image"></img>
      
      <img src={processing.maskPath} className="mask"></img>

      {
        activeStep === PROCESSING_STEP_NUMBER && <WindowSizes width={width} height={height}></WindowSizes>
      }

      <Quiver width={width} height={height} factor={factor} activeStep={activeStep} />
    </div>

  )
}
