import { Progress, WizardButtons } from "../components"
import { FormProcessing } from "../components/Forms"

export const Step6 = () => {

  return (
    <div className="regular-page">
        <div className="media-container"></div>
        <div className="form-container">
            <Progress/>
            <FormProcessing />
            <WizardButtons></WizardButtons>
        </div>
    </div>
  )
}
