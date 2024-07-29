import { VideoPlayer } from '../components/VideoPlayer/VideoPlayer'
import { FormVideo } from '../components/Forms/FormVideo'
import { WizardButtons } from '../components/WizzardButtons'
import { Error } from '../components/Error'
import { FormVideoExtra } from '../components/Forms/FormVideoExtra'
import { useState } from 'react'
import { useDataSlice } from '../hooks'
import { Progress } from '../components'

export const Step3 = () => {
  const [formStep, setFormStep] = useState(1)
  const { video } = useDataSlice()
  const { path }= video.data
  console.log(path)
  return (
    <div className='regular-page'>
        <div className='media-container'>
          {path && <VideoPlayer fileURL={'/@fs' + path}></VideoPlayer>}
          <Error></Error>
        </div>
        <div className='form-container'>
          <Progress></Progress>
          <FormVideo setStep={setFormStep}></FormVideo>
          <FormVideoExtra step={formStep}></FormVideoExtra>
          <WizardButtons formId='form-video' canFollow={true}></WizardButtons>
        </div>
    </div>
  )
}
