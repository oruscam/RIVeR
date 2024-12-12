import { useEffect, useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useUiSlice } from '../../hooks/useUiSlice';
import { useWizard } from 'react-use-wizard';
import { getValidationRules } from '../../helpers/validationRules'
import { useProjectSlice } from '../../hooks';
import './form.css'
import { formatTime } from '../../helpers';

export const FormVideo = () => {
  const { onSetVideoParameters, video: videoData } = useProjectSlice()
  const { startTime, endTime, step } = videoData.parameters

  const { handleSubmit, register, setValue, getValues, watch } = useForm({
    defaultValues: {
      start: formatTime(startTime, 'mm:ss'),
      end: formatTime(endTime, 'mm:ss'),
      step: step
    }
  })
  
  const [ video, setVideo ] = useState<HTMLVideoElement | null>(null)
  const { t } = useTranslation()
  const { nextStep } = useWizard()
  const { onSetErrorMessage } = useUiSlice()

  const watchStep = watch('step')
  const { duration } = videoData.data

  const validationRules = getValidationRules(t, getValues, duration)
  
  const timeBetweenFrames = (((1 / (videoData.data.fps || 0)) * watchStep) * 1000).toFixed(2)


  const handleClick = ( event: React.MouseEvent<HTMLButtonElement> ) => {
    if(video !== null){

      const number = video.currentTime
      
      const id = (event.target as HTMLButtonElement).id
      if( id === "start"){
        setValue('start', formatTime(number, 'mm:ss'), { shouldValidate: true} )
        } else {
          setValue('end', formatTime(number, 'mm:ss'), { shouldValidate: true} )
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
  }, [watchStep])


  return (
    <>
      <h1 className='form-title'>{t("VideoRange.title")}</h1>
      <form onSubmit={handleSubmit(onSubmit, onError)} id='form-video' className='form-base-2 mt-2'>
          
          <div className='input-container-2 mt-2'>
            <button type='button' onClick={handleClick} className='wizard-button form-button me-1' id='start'> {t("VideoRange.start")}</button>
            <input
              className='input-field'
              defaultValue='00:00'
              id='start'
              type='text'
              { ...register("start", validationRules.start) }
              />
          </div>
          <div className='input-container-2 mt-1'>
            <button type='button' className='wizard-button form-button me-1' onClick={handleClick} id='end'> {t("VideoRange.end")} </button>
            <input
              type='text'
              className='input-field'
              defaultValue='00:00'
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
          <div className='form-video-extra-info-row mt-1' id='time-between-frames'>
                <p>{t("VideoRange.ExtraInfo.timeBetweenFrame")}</p>
                <p>{ timeBetweenFrames }ms</p>
          </div>
      </form>
    </>
  )
}
