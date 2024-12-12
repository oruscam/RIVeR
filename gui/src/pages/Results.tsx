import { Error, Progress, Results as ResultsComponent, WizardButtons } from "../components"
import { VelocityVector } from "../components/Graphs"
import { useUiSlice } from "../hooks"

export const Results = () => {
  const { screenSizes } = useUiSlice()
  const { imageWidth: width, imageHeight: height, factor } = screenSizes

  if ( !width || !height || !factor ) return null
  return (
    <div className='regular-page'>
        <div className='media-container'>
          <VelocityVector width={width} height={height} factor={factor}/>
          <Error/>
        </div>
        <div className='form-container'>
            <Progress/>
            <ResultsComponent/>
            <WizardButtons formId="form-result"/> 
        </div>
    </div>
  )
}