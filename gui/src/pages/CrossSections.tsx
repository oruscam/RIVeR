import { WizardButtons, ImageWithMarks, Error, Progress } from "../components"
import { CrossSections as CrossSectionsComponent } from "../components/CrossSections/index"

export const CrossSections = () => {
  
  return (
    <div className="regular-page">
        <div className="media-container">
          <ImageWithMarks/>
          <Error></Error>
        </div>
        <div className="form-container">
            <Progress/>
            <CrossSectionsComponent/>
            <WizardButtons formId="form-cross-section"/>
        </div>
    </div>
  )
}
