import { WizardButtons, ImageWithMarks, Error, Progress } from "../components"
import { useDataSlice, useUiSlice } from "../hooks"
import { getNewImageResolution } from "../helpers/getNewImageResolution"
import { CrossSections } from "../components/CrossSections/index"

export const Step5 = () => {
  const { screenSizes } = useUiSlice()
  const { video, sections } = useDataSlice()
  
  const {width: windowWidth} = screenSizes
  const { data } = video
  

  const values = getNewImageResolution(windowWidth, data.width, data.height)
  
  console.log(sections)

  return (
    <div className="regular-page">
        <div className="media-container">
          <ImageWithMarks width={values.width} height={values.height} factor={values.factor}></ImageWithMarks>
          <Error></Error>
        </div>
        <div className="form-container">
            <Progress/>
            <CrossSections></CrossSections>
            <WizardButtons formId="cross-section"></WizardButtons>
        </div>
    </div>
  )
}
