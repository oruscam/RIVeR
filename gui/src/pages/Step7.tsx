import { useState } from "react"
import { Carousel, Error, ImageWithData, Progress, WizardButtons } from "../components"
import { FormAnalizing } from "../components/Forms/FormAnalizing"
import { getNewImageResolution } from "../helpers"
import { useDataSlice, useProjectSlice, useUiSlice } from "../hooks"
import { useWizard } from "react-use-wizard"

export const Step7 = () => {
    const { screenSizes } = useUiSlice()
    const { width: windowWidth, height: windowHeight } = screenSizes
    const { video } = useProjectSlice();
    const { data } = video 
    const { nextStep } = useWizard();
    const { onGetResultData } = useDataSlice()

    const [showMedian, setShowMedian] = useState(false)

    const { height, width, factor } = getNewImageResolution(windowWidth, windowHeight, data.width, data.height)

    const handleNext = async () => {
        await onGetResultData('all')
        nextStep()
    }

  return (
    <div className="regular-page">
        <div className="media-container">
            <ImageWithData height={height} width={width} factor={factor} showMedian={showMedian}></ImageWithData>
            <Carousel showMedian={showMedian} setShowMedian={setShowMedian}></Carousel>
            <Error></Error>
        </div>
        <div className="form-container">
            <Progress/>
            <FormAnalizing/>
            <WizardButtons onClickNext={handleNext}></WizardButtons>
        </div>
    </div>
  )
}
