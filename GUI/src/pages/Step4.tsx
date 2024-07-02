import { FieldValues, FormProvider, useForm } from 'react-hook-form'
import { useWizard } from 'react-use-wizard'
import { FormPixelSize } from '../components/Forms/index'
import { WizardButtons, Error, ImageWithMarks, Progress } from '../components/index'
import { getNewImageResolution } from '../helpers/index.js'
import { useDataSlice, useUiSlice } from '../hooks/index'

import './pages.css'

export const Step4 = () => {
  const methods = useForm()
  const { nextStep  } = useWizard()
  
  const { onSetErrorMessage, screenSizes } = useUiSlice()
  const { video, onSetPixelSize, sections } = useDataSlice()
  
  const { width: windowWidth } = screenSizes
  const { data } = video 

  const values = getNewImageResolution(windowWidth, data.width, data.height)


  const onSubmit = (data: FieldValues) => {
    onSetPixelSize(data)
    nextStep()
  }
  
  const onError = (error: FieldValues) => {
    console.log("ERROR",error)
    onSetErrorMessage(error)
  }

  return (
    <div className='regular-page'>
      <div className='media-container'>
        <ImageWithMarks height={values.height} width={values.width} factor={values.factor}></ImageWithMarks>
        <Error/>
      </div>
      <div className='form-container'>
        <Progress/>
        <FormProvider {...methods}>
          <FormPixelSize 
            onSubmit={methods.handleSubmit(onSubmit, onError)}
            onError={onError}
            factor={values.factor}
          />
        </FormProvider>
        <WizardButtons canFollow={sections[0].points.length === 2} formId='form-pixel-size'/>
      </div>
    </div>
  )
}
