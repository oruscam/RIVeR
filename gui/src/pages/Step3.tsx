import { VideoPlayer } from '../components/VideoPlayer/VideoPlayer'
import { FormVideo } from '../components/Forms/FormVideo'
import { WizardButtons } from '../components/WizzardButtons'
import { Error } from '../components/Error'
import { FormVideoExtra } from '../components/Forms/FormVideoExtra'
import { useState } from 'react'
import { Progress } from '../components'
import { useProjectSlice } from '../hooks'


export const Step3 = () => {
  const [formStep, setFormStep] = useState(1)
  const { video } = useProjectSlice();
  const { path }= video.data
  
  return (
    <div className='regular-page'>
        <div className='media-container'>
          { path && <VideoPlayer fileURL={ path }/> }
          <Error/>
        </div>
        <div className='form-container'>
          <Progress></Progress>
          <FormVideo setStep={setFormStep}/>
          {/* EXTRA INFO */}
          <FormVideoExtra step={formStep}/>
          <WizardButtons formId='form-video' canFollow={true}/>
        </div>
    </div>
  )
}
