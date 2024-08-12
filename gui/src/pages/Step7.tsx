import { Carousel, ImageWithData, Progress, WizardButtons } from "../components"
import { getNewImageResolution } from "../helpers"
import { useProjectSlice, useUiSlice } from "../hooks"

export const Step7 = () => {
    const { screenSizes } = useUiSlice()
    const { width: windowWidth, height: windowHeight } = screenSizes
    const { video } = useProjectSlice();
    const { data } = video 

    const { height, width, factor } = getNewImageResolution(windowWidth, windowHeight, data.width, data.height)


  return (
    <div className="regular-page">
        <div className="media-container">
            <ImageWithData height={height} width={width} factor={factor}></ImageWithData>
            <Carousel></Carousel>
        </div>
        <div className="form-container">
            <Progress/>
            <h1 className="form-title">Analizing</h1>
            <WizardButtons></WizardButtons>
        </div>
    </div>
  )
}
