import { Progress, WizardButtons } from "../components"
import { Sections } from "../components/CrossSections"
import { EyeBall } from "../components/CrossSections/EyeBall"
import { FormResults } from "../components/Forms"
import { VelocityVector } from "../components/Graphs"
import { getNewImageResolution } from "../helpers"
import { useProjectSlice, useSectionSlice, useUiSlice } from "../hooks"

export const Step8 = () => {
  const { screenSizes } = useUiSlice()
  const { video } = useProjectSlice()
  const { width: windowWidth, height: windowHeight } = screenSizes
  const { height, width, factor } = getNewImageResolution(windowWidth, windowHeight, 1920, 1080)
  const { sections, activeSection } = useSectionSlice();


  return (
    <div className='regular-page'>
        <div className='media-container'>
          <VelocityVector width={width} height={height} factor={factor}></VelocityVector>
        </div>
        <div className='form-container'>
            <Progress></Progress>
            <div className="sections-header">        
                <EyeBall></EyeBall>              
                <h1 className="sections-title">  Results </h1>
                <span></span>
            </div>
            <Sections canEdit={false}></Sections>
            {
              sections.map((section, index: number) => {
                if( activeSection === index && index >= 1 ){
                  return (
                    <FormResults key={section.name}></FormResults>
                  )
                }
              })
            }
            <WizardButtons></WizardButtons> 
        </div>
    </div>
  )
}
