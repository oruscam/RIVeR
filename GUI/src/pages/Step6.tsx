import { Progress, WizardButtons } from "../components"
import { Carousel } from "../components/Carousel"
import { FormProcessing } from "../components/Forms"

export const Step6 = () => {

  
  return (
    <div className="regular-page">
        <div className="media-container">
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
