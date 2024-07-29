import { useState } from "react"
import { ButtonLock } from "../ButtonLock"
import { HardModeProcessing } from "./HardModeProcessing"
import { useForm } from "react-hook-form"
import { useDataSlice, useUiSlice } from "../../hooks"
import { useWizard } from "react-use-wizard"

export const FormProcessing = () => {
  const [extraFields, setExtraFields] = useState(false)
  const { processing, onUpdateProccesing } = useDataSlice();
  const { step1 } = processing
  const { handleSubmit ,register, reset } = useForm({defaultValues: {
    "step_1": step1,
    "step_2": step1 / 2
  }})
  const { nextStep } = useWizard()
  const { onSetErrorMessage } = useUiSlice()

  const handleInputStep = ( event: React.KeyboardEvent<HTMLInputElement> |  React.FocusEvent<HTMLInputElement> ) => {
    if(event.key === "Enter" || event.type === "blur"){
        event.preventDefault()
        const value = parseInt((event.target as HTMLInputElement).value)
        if( value >= 64 && value <= 512 && (value & (value -1 )) === 0 ){
            onUpdateProccesing({step1: value})
            reset({step_1: value, step_2: value / 2})
        } else{
            reset({step_1: step1})
            onSetErrorMessage("Processing step must be a power of 2 between 64 and 512")
        }
    } 
  }

  const onSubmit = () => {
    nextStep()
  }


  return (
    <>
    <h1 className="form-title"> Processing </h1>
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4" id="form-processing" style={{overflowY: `${!extraFields ? "hidden" : "auto"}`}}>
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
                    <input  className="input-field"
                            id="processing-STEP_1" 
                            type="number" 
                            {...register('step_1')}
                            onKeyDown={handleInputStep}
                            onBlur={handleInputStep}
                            ></input>
                </div>
                <div className="input-container">
                    <label className="read-only me-1" htmlFor="processing-STEP_2"> Step 2 </label>
                    <input className="input-field" id="processing-STEP_2" readOnly {...register('step_2')}></input>
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
