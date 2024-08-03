import { useState } from "react"
import { ButtonLock } from "../ButtonLock"
import { HardModeProcessing } from "./HardModeProcessing"
import { FieldValues, FormProvider, useForm } from "react-hook-form"
import { useDataSlice, useUiSlice } from "../../hooks"
import { useWizard } from "react-use-wizard"
import { Loading } from "../Loading"

export const FormProcessing = () => {
  const [extraFields, setExtraFields] = useState(false)
  const { nextStep } = useWizard()
  
  const { onSetErrorMessage } = useUiSlice()
  const { processing, onUpdateProccesing, onTest } = useDataSlice();
  const { artificialSeeding, step1, heightRoi, grayscale, removeBackground, clahe, clipLimit, stdFiltering, threshold1, medianTest, epsilon, threshold2, test  } = processing
  
  const [buttonTest, setButtonTest] = useState(false)

  const methods = useForm({defaultValues: {
    "step_1": step1,
    "step_2": step1 / 2,
    "roi_height": heightRoi,
    "grayscale": grayscale,
    "remove_background": removeBackground,
    "clahe": clahe,
    "clip_limit": clipLimit,
    "std_filtering": stdFiltering,
    "threshold_1": threshold1,
    "median_test": medianTest,
    "epsilon": epsilon,
    "threshold_2": threshold2,
    "artificial_seeding": artificialSeeding
  }})
  const { register, handleSubmit, reset } = methods


  const handleInputStep = ( event: React.KeyboardEvent<HTMLInputElement> |  React.FocusEvent<HTMLInputElement> ) => {
    if(event.key === "Enter" || event.type === "blur"){
        event.preventDefault()
        const value = parseInt((event.target as HTMLInputElement).value)
        if( value >= 64 && value <= 512 && (value & (value -1 )) === 0 ){
            onUpdateProccesing({step1: value})
            reset({step_1: value, step_2: value / 2})
        } else{
            reset({step_1: step1})
            onSetErrorMessage({message: "Processing step must be a power of 2 between 64 and 512"})
        }
    } 
  }
  // * Simulacion de llamada a onTest
  const handleOnClickTest = ( event ) => {
    onTest()
    if( !buttonTest && !test ){
      setButtonTest(true)
    }
    if(buttonTest && test){
      setButtonTest(false)
    }
  }

  const onSubmit = (data: FieldValues) => {
    console.log(data)
    nextStep()
  }


  return (
    <>
    <h1 className="form-title"> Processing </h1>
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4" id="form-processing" style={{overflowY: `${!extraFields ? "hidden" : "auto"}`}}>
          <span id="processing-HEADER"></span>
          <div className="simple-mode-container">
              <div className="simple-mode simple-mode-processing">
                  <div className="switch-container seeding">
                    <h3 className="field-title">Artificial Seeding </h3>
                    <label className="switch">
                        <input type="checkbox" {...register('artificial_seeding')}/>
                        <span className="slider"></span>
                    </label>

                  </div>
                  
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
                      <input className="input-field-read-only" id="processing-STEP_2" readOnly {...register('step_2')}></input>
                  </div>

                  <div className="test-container">
                    <button className={`wizard-button form-button ${buttonTest ? "wizard-button-active" : ""}`} onClick={handleOnClickTest}> Test </button>
                    { buttonTest && !test && <div className="loader-little"></div> }
                  </div>
              </div>
              <span className="space2"></span>
              <ButtonLock setExtraFields={setExtraFields} extraFields={extraFields} footerElementID="processing-HARD_MODE" headerElementID="processing-HEADER" disabled={false}></ButtonLock>
          </div>
          <div>
              <HardModeProcessing></HardModeProcessing>
          </div>
      </form>
    </FormProvider>
    </>
  )
}
