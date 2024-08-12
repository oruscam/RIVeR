import { Error, Progress, ImageWithData, WizardButtons } from "../components"
import { Carousel } from "../components/index"
import { FormProcessing } from "../components/Forms"
import { getNewImageResolution } from "../helpers"
import { useProjectSlice, useUiSlice } from "../hooks"

export const Step6 = () => {
  const {screenSizes} = useUiSlice()
  const { video } = useProjectSlice()
  const {width: windowWidth, height: windowHeight} = screenSizes
  const { data } = video

  const { height, width, factor } = getNewImageResolution(windowWidth, windowHeight, data.width, data.height)


  return (
    <div className="regular-page">
        <div className="media-container">
            <ImageWithData height={height} width={width} factor={factor}></ImageWithData>
            <Carousel></Carousel>
            <Error></Error>
        </div>
        <div className="form-container">
            <Progress/>
            <FormProcessing />
            <WizardButtons canFollow={true} formId="form-processing"></WizardButtons>
        </div>
    </div>
  )
}
