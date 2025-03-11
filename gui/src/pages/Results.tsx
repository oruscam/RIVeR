import { Error, Progress, Results as ResultsComponent, WizardButtons } from "../components"
import { VelocityVector } from "../components/Graphs"
import { useProjectSlice, useUiSlice } from "../hooks"

export const Results = () => {
  const { screenSizes, seeAll } = useUiSlice()
  const { imageWidth: width, imageHeight: height, factor } = screenSizes
  const { firstFramePath } = useProjectSlice()

  if ( !width || !height || !factor ) return null
  return (
    <div className='regular-page'>
        <div className='media-container'>
        <div className="image-and-svg-container">
            <img src={firstFramePath} width={width} height={height}/>
            <VelocityVector height={height} width={width} factor={factor} seeAll={seeAll}/>
        </div>
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