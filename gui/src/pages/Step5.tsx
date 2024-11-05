import { WizardButtons, ImageWithMarks, Error, Progress } from "../components"
import { useProjectSlice, useUiSlice } from "../hooks"
import { getNewImageResolution } from "../helpers/getNewImageResolution"
import { CrossSections } from "../components/CrossSections/index"

export const Step5 = () => {
  const { screenSizes } = useUiSlice()
  const { video } = useProjectSlice()

  const {width: windowWidth, height: windowHeight} = screenSizes
  const { data } = video
  

  const { width, height, factor } = getNewImageResolution(windowWidth, windowHeight, data.width, data.height)
  
  return (
    <div className="regular-page">
        <div className="media-container">
          <ImageWithMarks width={width} height={height} factor={factor}></ImageWithMarks>
          <Error></Error>
        </div>
        <div className="form-container">
            <Progress/>
            <CrossSections></CrossSections>
            <WizardButtons formId="form-cross-section"></WizardButtons>
        </div>
    </div>
  )
}
