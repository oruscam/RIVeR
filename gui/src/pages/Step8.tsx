import { Progress, Results, WizardButtons } from "../components"
import { VelocityVector } from "../components/Graphs"
import { getNewImageResolution } from "../helpers"
import { useUiSlice } from "../hooks"

export const Step8 = () => {
  const { screenSizes } = useUiSlice()
  const { width: windowWidth, height: windowHeight } = screenSizes
  const { height, width, factor } = getNewImageResolution(windowWidth, windowHeight, 1920, 1080)



  return (
    <div className='regular-page'>
        <div className='media-container'>
          <VelocityVector width={width} height={height} factor={factor}></VelocityVector>
        </div>
        <div className='form-container'>
            <Progress></Progress>
            <Results></Results>
            <WizardButtons formId="form-result"></WizardButtons> 
        </div>
    </div>
  )
}
