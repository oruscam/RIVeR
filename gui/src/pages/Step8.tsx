import { WizardButtons } from "../components"
import { Sections } from "../components/CrossSections"
import { FormResults } from "../components/Forms"
import { VelocityVector } from "../components/Graphs"
import { getNewImageResolution } from "../helpers"
import { useProjectSlice, useUiSlice } from "../hooks"

export const Step8 = () => {
  const { screenSizes } = useUiSlice()
  const { video } = useProjectSlice()
  const { width: windowWidth, height: windowHeight } = screenSizes
  const { height, width, factor } = getNewImageResolution(windowWidth, windowHeight, 1920, 1080)

  return (
    <div className='regular-page'>
        {/* <div className='media-container'>
          <VelocityVector width={width} height={height} factor={factor}></VelocityVector>
        </div> */}
        <div className='form-container'>
            <h1 className='form-title'>Results</h1>
            <Sections canEdit={false}></Sections>
            <FormResults></FormResults>
            <WizardButtons></WizardButtons> 
        </div>
    </div>
  )
}
