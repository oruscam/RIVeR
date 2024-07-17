import { Progress, SimpleImage, WizardButtons } from "../components"
import { Carousel } from "../components/index"
import { FormProcessing } from "../components/Forms"
import { getNewImageResolution } from "../helpers"
import { useDataSlice, useUiSlice } from "../hooks"

export const Step6 = () => {
  const {screenSizes} = useUiSlice()
  const { video } = useDataSlice()
  const {width: windowWidth, height: windowHeight} = screenSizes
  const { data } = video

  const { height, width, factor } = getNewImageResolution(windowWidth, windowHeight, data.width, data.height)

  return (
    <div className="regular-page">
        <div className="media-container">
            <SimpleImage height={height} width={width} factor={factor}></SimpleImage>
            <Carousel></Carousel>
        </div>
        <div className="form-container">
            <Progress/>
            <FormProcessing />
            <WizardButtons></WizardButtons>
        </div>
    </div>
  )
}
