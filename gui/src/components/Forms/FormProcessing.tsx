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
  const { step1, heightRoi, grayscale, removeBackground, clahe, clipLimit, stdFiltering, stdThreshold, medianTestThreshold, medianTestEpsilon, medianTestFiltering } = processing.form
  
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
  }})
  const { register, handleSubmit, reset } = methods

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

  interface HandleTabEvent extends React.KeyboardEvent<HTMLFormElement> {}

  const handleTab = ( event: HandleTabEvent ) => {
    if ( event.key === 'Tab' && isBackendWorking ){
      event.preventDefault()
    }
  }

  interface HandleButtonTestTabEvent extends React.KeyboardEvent<HTMLButtonElement> {}

  const handleButtonTestTab = (event: HandleButtonTestTabEvent) => {
    if ( event.key === 'Tab' && extraFields === false) {
      event.preventDefault()
    }
  }

  return (
    <>
      <h1 className="form-title"> {t('Processing.title')} </h1>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className={`form-scroll mt-1 ${isBackendWorking ? 'disabled' : ''}`} id="form-processing" style={{overflowY: `${!extraFields ? "hidden" : "auto"}`}} onKeyDown={handleTab}>
            <span id="processing-header"></span>
            <div className="form-base-2">
              
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
              </div>
              <div className="input-container-2 mt-1">
                  <label className="read-only me-1" htmlFor="processing-STEP_2"> {t('Processing.step2')} </label>
                  <input className="input-field-read-only" id="processing-STEP_2" readOnly {...register('step_2')}></input>
              </div>

              <div className="input-container-2 mt-2">
                <button className={`button-with-loader form-button me-1 ${isBackendWorking? "button-with-loader-active" : ""}`} onClick={handleOnClickTest} onKeyDown={handleButtonTestTab}>
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
      <ButtonLock localSetExtraFields={setExtraFields} localExtraFields={extraFields} footerElementID="processing-footer" headerElementID="processing-header" disabled={isBackendWorking}></ButtonLock>
    </>
  )
}
