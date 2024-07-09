import { useState } from "react"
import { ButtonLock } from "../ButtonLock"
import { HardModeProcessing } from "./HardModeProcessing"

export const FormProcessing = () => {
  const [extraFields, setExtraFields] = useState(false)

  return (
    <>
    <h1 className="form-title"> Processing </h1>
    <form className="mt-4" id="form-processing" style={{overflowY: `${!extraFields ? "hidden" : "auto"}`}}>
        <span id="processing-HEADER"></span>
        <div className="simple-mode-container">
            <div className="simple-mode simple-mode-processing">
                <h2 className="field-title">Artificial Seeding</h2>

            
                <label className="switch">
                    <input type="checkbox"/>
                    <span className="slider"></span>
                </label>
                
                <h2 className="form-subtitle mt-1"> Window sizes </h2>

                <div className="input-container">
                    <label className="read-only me-1" htmlFor="processing-STEP_1"> Step 1 </label>
                    <input className="input-field" id="processing-STEP_1"></input>
                </div>
                <div className="input-container">
                    <label className="read-only me-1" htmlFor="processing-STEP_2"> Step 2 </label>
                    <input className="input-field" id="processing-STEP_2"></input>

                </div>

                <button className="wizard-button form-button mt-2"> Test </button>
            </div>
            <span className="space2"></span>
            <ButtonLock setExtraFields={setExtraFields} extraFields={extraFields} footerElementID="processing-HARD_MODE" headerElementID="processing-HEADER" disabled={false}></ButtonLock>
        </div>
        <div>
            <HardModeProcessing></HardModeProcessing>

        </div>
    </form>
    </>
  )
}
