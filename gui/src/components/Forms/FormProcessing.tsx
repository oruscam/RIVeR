import { useState } from "react"
import { ButtonLock } from "../ButtonLock"
import { HardModeProcessing } from "./HardModeProcessing"
import { FieldValues, FormProvider, useForm } from "react-hook-form"
import { useDataSlice } from "../../hooks"
import { useWizard } from "react-use-wizard"
import { useTranslation } from "react-i18next"
import { WINDOW_SIZES } from "../../constants/constants"

export const FormProcessing = () => {
  const [extraFields, setExtraFields] = useState(false)
  const { nextStep } = useWizard()
  
  const { processing, onUpdateProcessing, onSetQuiverTest, onClearQuiver, isBackendWorking } = useDataSlice()
  const { artificialSeeding, step1, heightRoi, grayscale, removeBackground, clahe, clipLimit, stdFiltering, stdThreshold, medianTestThreshold, medianTestEpsilon, medianTestFiltering } = processing.form
  
  const [_buttonTest, _setButtonTest] = useState(false)

  const { t } = useTranslation()  

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


  // const handleInputStep = ( event: React.KeyboardEvent<HTMLInputElement> |  React.FocusEvent<HTMLInputElement> ) => {
  //   if((event as React.KeyboardEvent<HTMLInputElement>).key === "Enter" || event.type === "blur"){
  //       event.preventDefault()
  //       const value = parseInt((event.target as HTMLInputElement).value)
  //       if( value >= 64 && value <= 512 && (value & (value -1 )) === 0 ){
  //           onUpdateProcessing({step1: value})
  //           reset({step_1: value, step_2: value / 2})
  //       } else{
  //           reset({step_1: step1})
  //           onSetErrorMessage({message: "Processing step must be a power of 2 between 64 and 512"})
  //       }
  //   } 
  // }

  const handleOnChangeSelect = ( event: React.ChangeEvent<HTMLSelectElement> ) => {
    const value = parseInt(event.target.value)
    onUpdateProcessing({step1: value})
    reset({step_1: value, step_2: value / 2})
  }

  const handleOnClickTest = ( event: React.MouseEvent<HTMLButtonElement> ) => {
    event.preventDefault()
    onSetQuiverTest()
  }
 
  const onSubmit = ( data: FieldValues ) => {
    console.log(data)
    onClearQuiver()
    nextStep()
  }

  return (
    <>
      <h1 className="form-title"> {t('Processing.title')} </h1>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="form-scroll mt-1" id="form-processing" style={{overflowY: `${!extraFields ? "hidden" : "auto"}`}}>
            <span id="processing-header"></span>
            <div className="form-base-2">
              
              <div className="switch-container-2 mt-2">
                <h3 className="field-title"> {t('Processing.artificialSeeding')} </h3>
                <label className="switch">
                    <input type="checkbox" {...register('artificial_seeding')} onChange={(event) => onUpdateProcessing({artificialSeeding: event.currentTarget.checked})}/>
                    <span className="slider"></span>
                </label>
              </div>

              <h2 className="form-subtitle only-one-item mt-2"> {t('Processing.windowSizes')} </h2>

              <div className="input-container-2 mt-2">
                  <label className="read-only me-1" htmlFor="processing-STEP_1"> {t('Processing.step1')} </label>
                  <select className="input-field input-field-select"
                    id="processing-STEP_1"
                    {...register('step_1')}
                    onChange={handleOnChangeSelect}
                    >
                      <option value="512">{ WINDOW_SIZES.BIG }</option>
                      <option value="256">{ WINDOW_SIZES.MEDIUM }</option>
                      <option value="128">{ WINDOW_SIZES.SMALL }</option>
                      <option value="64">{ WINDOW_SIZES.TINY }</option>
                  </select>
                  {/* <input  className="input-field"
                          id="processing-STEP_1" 
                          type="number" 
                          {...register('step_1')}
                          onKeyDown={handleInputStep}
                          onBlur={handleInputStep}
                          ></input> */}
              </div>
              <div className="input-container-2 mt-1">
                  <label className="read-only me-1" htmlFor="processing-STEP_2"> {t('Processing.step2')} </label>
                  <input className="input-field-read-only" id="processing-STEP_2" readOnly {...register('step_2')}></input>
              </div>

              <div className="input-container-2 mt-2">
                <button className={`button-with-loader form-button me-1 ${isBackendWorking? "button-with-loader-active" : ""}`} onClick={handleOnClickTest}>
                  <p className='button-name'> {t('Processing.test')} </p>
                  {
                      isBackendWorking && <span className='loader-little'></span>
                  }
                </button>
                <span className="read-only bg-transparent"></span>
              </div>
            </div>
            
            <HardModeProcessing/>
        </form>
      </FormProvider>
      <ButtonLock localSetExtraFields={setExtraFields} localExtraFields={extraFields} footerElementID="processing-footer" headerElementID="processing-header" disabled={false}></ButtonLock>
    </>
  )
}
