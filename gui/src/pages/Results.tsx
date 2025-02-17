import { Error, Progress, Results as ResultsComponent, WizardButtons } from "../components"
import { VelocityVector } from "../components/Graphs"
import { useProjectSlice, useSectionSlice, useUiSlice } from "../hooks"

export const Results = () => {
  const { screenSizes, seeAll } = useUiSlice()
  const { sections, activeSection, transformationMatrix } = useSectionSlice() 
  const { imageWidth: width, imageHeight: height, factor } = screenSizes
  const { firstFramePath } = useProjectSlice()

  if ( !width || !height || !factor ) return null
  return (
    <div className='regular-page'>
        <div className='media-container'>
        <div className="image-and-svg-container">
          <img src={firstFramePath} width={width} height={height}/>
          {
            sections.map((section, index) => {
              if (index === 0) return null;
              if ( seeAll && activeSection !== index ) return null;
              return (
                <VelocityVector section={section} sectionIndex={index} transformationMatrix={transformationMatrix} height={height} width={width} factor={factor} index={index} key={index}/>
              )
            })
          }
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