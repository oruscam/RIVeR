import { WizardButtons, ImageWithMarks, Error, Progress } from "../components"
import { useDataSlice, useUiSlice } from "../hooks"
import { getNewImageResolution } from "../helpers/resolution"
import { CrossSections } from "../components/CrossSections/index"

export const Step5 = () => {
  const { screenSizes } = useUiSlice()
  const { video } = useDataSlice()
  
  const {width: windowWidth} = screenSizes
  const { data } = video
  

  const values = getNewImageResolution(windowWidth, data.width, data.height)
  

  return (
    <div className="regular-page">
        <div className="media-container">
          <ImageWithMarks width={values.width} height={values.height} factor={values.factor}></ImageWithMarks>
          <Error></Error>
        </div>
        <div className="form-container">
            <Progress/>
            <CrossSections factor={values.factor}></CrossSections>
            <WizardButtons formId="cross-section"></WizardButtons>
        </div>
    </div>
  )
}
