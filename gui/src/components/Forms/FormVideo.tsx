import { useEffect, useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import './form.css'

import { useTranslation } from 'react-i18next'
import { useUiSlice } from '../../hooks/useUiSlice';
import { useWizard } from 'react-use-wizard';
import { getValidationRules } from '../../helpers/validationRules'
import { useProjectSlice } from '../../hooks';


export const FormVideo = ({ setStep }: { setStep: React.Dispatch<React.SetStateAction<number>> }) => {
  const { onSetVideoParameters, video: videoData } = useProjectSlice()
  const { startTime, endTime, step } = videoData.parameters

  const { handleSubmit, register, setValue, getValues, watch } = useForm({
    defaultValues: {
      start: startTime,
      end: endTime,
      step: step
    }
  })
  
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const { t } = useTranslation()
  const {nextStep } = useWizard()
  const { onSetErrorMessage } = useUiSlice()

  const watchStep = watch('step')
  const { duration } = videoData.data

  const validationRules = getValidationRules(t, getValues, duration)

  const handleClick = ( event: React.MouseEvent<HTMLButtonElement> ) => {
    if(video !== null){
      const number = video.currentTime
      const id = (event.target as HTMLButtonElement).id
      if( id === "start"){
        setValue('start', parseFloat(number.toFixed(4)), { shouldValidate: true} )
        }else{
          setValue('end', parseFloat(number.toFixed(4)), { shouldValidate: true} )
        }
      }
    }
          
  const onSubmit = ( data: FieldValues ) => {
    onSetVideoParameters(data)

    nextStep()
  }

  const onError = ( error: any ) => {
    console.log("On Form Video Error")
    onSetErrorMessage( error )
  }

  useEffect(() => {
    setVideo(document.getElementById("video") as HTMLVideoElement)
    setStep(watchStep)
  }, [watchStep])


  return (
    <>
      <h2 className='form-title'>{t("VideoRange.title")}</h2>
      <form onSubmit={handleSubmit(onSubmit, onError)} id='form-video' className='form-base-2 mt-2'>
          
          <div className='input-container-2 mt-2'>
            <button type='button' onClick={handleClick} className='wizard-button form-button me-1' id='start'> {t("VideoRange.start")}</button>
            <input
              className='input-field'
              defaultValue={0}
              id='start'
              type='number'
              step="0.0001"
              { ...register("start", validationRules.start) }
              />
          </div>
          <div className='input-container-2 mt-1'>
            <button type='button' className='wizard-button form-button me-1' onClick={handleClick} id='end'> {t("VideoRange.end")} </button>
            <input
              type='number'
              step="0.0001"
              className='input-field'
              defaultValue={1}
              id='end'
              { ...register('end', validationRules.end) }
              />
          </div>
          <div className='input-container-2 mt-1'>
            <label className='read-only me-1'> {t("VideoRange.step")} </label>
            <input
              type='number'
              id='input-step'
              defaultValue={1}
              className='input-field'
              { ...register('step', validationRules.step)}
              ></input>
          </div>

      </form>
    </>
  )
}
