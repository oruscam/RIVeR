import { useState } from "react"
import { Carousel, Error, ImageWithData, Progress, WizardButtons } from "../components"
import { FormAnalizing } from "../components/Forms/FormAnalizing"
import { useDataSlice, useUiSlice } from "../hooks"
import { useWizard } from "react-use-wizard"

export const Analize = () => {
    const { screenSizes } = useUiSlice()
    const { imageWidth: width, imageHeight: height, factor } = screenSizes
    const { nextStep } = useWizard();
    const { onGetResultData, quiver } = useDataSlice()

    const [showMedian, setShowMedian] = useState(false)

    const handleNext = async () => {
        await onGetResultData('all')
        nextStep()
    }

    if ( !width || !height || !factor ) return null


  return (
    <div className="regular-page">
        <div className="media-container">
            <ImageWithData showMedian={showMedian}></ImageWithData>
            <Carousel showMedian={showMedian} setShowMedian={setShowMedian}></Carousel>
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
