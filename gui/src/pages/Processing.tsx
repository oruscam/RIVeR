import { Error, Progress, ImageWithData, WizardButtons } from "../components"
import { Carousel } from "../components/index"
import { FormProcessing } from "../components/Forms"

export const Processing = () => {
  return (
    <div className="regular-page">
        <div className="media-container">
            <ImageWithData/>
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
