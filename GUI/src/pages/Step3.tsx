import { VideoPlayer } from '../components/VideoPlayer/VideoPlayer'
import { useUiSlice } from '../hooks/useUiSlice'
import { FormVideo } from '../components/Forms/FormVideo'
import { WizardButtons } from '../components/WizzardButtons'
import { Error } from '../components/Error'
import { FormVideoExtra } from '../components/Forms/FormVideoExtra'
import { useState } from 'react'

export const Step3 = () => {
  const { video } = useUiSlice()
  const [formStep, setFormStep] = useState(1)
  const blob = video ? video.blob : null;


  return (
    <div className='regular-page'>
        <div className='media-container'>
          {blob && <VideoPlayer fileURL={blob}></VideoPlayer>}
          <Error></Error>
        </div>
        <div className='form-container'>
          <FormVideo setStep={setFormStep}></FormVideo>
          <FormVideoExtra step={formStep}></FormVideoExtra>
          <WizardButtons formId='form-video' canFollow={true}></WizardButtons>
        </div>
    </div>
  )
}
