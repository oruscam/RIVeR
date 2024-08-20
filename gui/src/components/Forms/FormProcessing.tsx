import { useState } from "react"
import { ButtonLock } from "../ButtonLock"
import { HardModeProcessing } from "./HardModeProcessing"
import { FieldValues, FormProvider, useForm } from "react-hook-form"
import { useDataSlice, useUiSlice } from "../../hooks"
import { useWizard } from "react-use-wizard"

export const FormProcessing = () => {
  const [extraFields, setExtraFields] = useState(false)
  const { nextStep } = useWizard()
  
  const { onSetErrorMessage } = useUiSlice()
  const { processing, onUpdateProccesing, onSetQuiverTest, onSetQuiverAll } = useDataSlice()
  const { artificialSeeding, step1, heightRoi, grayscale, removeBackground, clahe, clipLimit, stdFiltering, stdThreshold, medianTestThreshold, medianTestEpsilon, medianTestFiltering } = processing.form
  
  const [buttonTest, _setButtonTest] = useState(false)

  const methods = useForm({defaultValues: {
    "step_1": step1,
    "step_2": step1 / 2,
    "roi_height": heightRoi,
    "grayscale": grayscale,
    "remove_background": removeBackground,
    "clahe": clahe,
    "clip_limit": clipLimit,
    "std_filtering": stdFiltering,
    "std_threshold": stdThreshold,
    "median_test": medianTestFiltering,
    "median_epsilon": medianTestEpsilon,
    "median_threshold": medianTestThreshold,
    "artificial_seeding": artificialSeeding
  }})
  const { register, handleSubmit, reset } = methods


  const handleInputStep = ( event: React.KeyboardEvent<HTMLInputElement> |  React.FocusEvent<HTMLInputElement> ) => {
    if((event as React.KeyboardEvent<HTMLInputElement>).key === "Enter" || event.type === "blur"){
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
    event.preventDefault()
    onSetQuiverTest()
  }

  const onSubmit = (data: FieldValues) => {
    console.log(data)
    nextStep()
  }


  return (
    <>
      <h1 className="form-title"> Processing </h1>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="form-scroll mt-1" id="form-processing" style={{overflowY: `${!extraFields ? "hidden" : "auto"}`}}>
            <span id="processing-HEADER"></span>
            <div className="form-base-2">
              
              <div className="switch-container-2 mt-2">
                <h3 className="field-title">Artificial Seeding </h3>
                <label className="switch">
                    <input type="checkbox" {...register('artificial_seeding')}/>
                    <span className="slider"></span>
                </label>
              </div>

              
              <h2 className="form-subtitle mt-2"> Window sizes </h2>

              <div className="input-container-2 mt-2">
                  <label className="read-only me-1" htmlFor="processing-STEP_1"> Step 1 </label>
                  <input  className="input-field"
                          id="processing-STEP_1" 
                          type="number" 
                          {...register('step_1')}
                          onKeyDown={handleInputStep}
                          onBlur={handleInputStep}
                          ></input>
              </div>
              <div className="input-container-2 mt-1">
                  <label className="read-only me-1" htmlFor="processing-STEP_2"> Step 2 </label>
                  <input className="input-field-read-only" id="processing-STEP_2" readOnly {...register('step_2')}></input>
              </div>

              <div className="input-container-2 mt-2">
                <button className={`button-with-loader ${processing.test? "button-with-loader-active" : ""}`} onClick={handleOnClickTest}>
                  <p className='button-name'> Test </p>
                  {
                      processing.test && <span className='loader-little'></span>
                  }
                </button>
                <span className="read-only bg-transparent"></span>
              </div>
            </div>
            
            <HardModeProcessing></HardModeProcessing>
        </form>
      </FormProvider>
      <ButtonLock setExtraFields={setExtraFields} extraFields={extraFields} footerElementID="processing-HARD_MODE" headerElementID="processing-HEADER" disabled={false}></ButtonLock>
    </>
  )
}
