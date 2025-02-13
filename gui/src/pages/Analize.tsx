import { useState } from "react"
import { Carousel, Error, ImageWithData, Progress, WizardButtons } from "../components"
import { FormAnalizing } from "../components/Forms/FormAnalizing"
import { useDataSlice, useUiSlice } from "../hooks"
import { useWizard } from "react-use-wizard"

export const Analize = () => {
    const { screenSizes, onSetErrorMessage } = useUiSlice()
    const { imageWidth: width, imageHeight: height, factor } = screenSizes
    const { nextStep } = useWizard();
    const { onGetResultData, quiver, images, onSetActiveImage } = useDataSlice()
    const { paths, active } = images
    const [showMedian, setShowMedian] = useState(false)

    const handleNext = async () => {
        try {
            await onGetResultData('all')
            nextStep()
            
        } catch (error) {
            onSetErrorMessage((error as Error).message)
        }
    }

    if ( !width || !height || !factor ) return null


  return (
    <div className="regular-page">
        <div className="media-container">
            <ImageWithData showMedian={showMedian}></ImageWithData>
            <Carousel images={paths} active={active} setActiveImage={onSetActiveImage} showMedian={showMedian} setShowMedian={setShowMedian} mode="analize"/>
            <Error></Error>
        </div>
        <div className="form-container">
            <Progress/>
            <FormAnalizing/>
            <WizardButtons onClickNext={handleNext} canFollow={ quiver !== undefined}></WizardButtons>
        </div>
    </div>
  )
}
