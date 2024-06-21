import { FormProvider, useForm } from 'react-hook-form'
import { useWizard } from 'react-use-wizard'
import { FormPixelSize } from '../components/Forms/index'
import { WizardButtons, ImageWithMarks, Error } from '../components/index'
import { getNewImageResolution, getDistanceBetweenPoints } from '../helpers/resolution'
import { useDataSlice, useUiSlice } from '../hooks/index'
import { ImageWithMarks2 } from '../components/ImageWithMarks2'

import './pages.css'

export const Step4 = () => {
  const methods = useForm()
  const { onSetPoints, video } = useDataSlice()
  const { nextStep } = useWizard()
  const { onSetErrorMessage, screenSizes, sections, onSetDrawLine} = useUiSlice()
  const { width: windowWidth } = screenSizes

  const values = getNewImageResolution(windowWidth, 4000, 2250)
  const distanceBetweenPoints = getDistanceBetweenPoints(sections[0].points)

  const {firstFramePath} = video.parameters

  const onSubmit = (data) => {
    onSetPoints(points, values.factorX, values.factorY, imagenPath)
    nextStep()
  }
  
  const onError = ( error ) => {
    onSetErrorMessage(error)
  }

  return (
    <div className='regular-page'>
      <div className='media-container'>
        <ImageWithMarks2 imagenPath={firstFramePath} height={values.height} width={values.width} factor={values.factorX}></ImageWithMarks2>
        <Error/>
      </div>
      <div className='form-container'>
        <FormProvider {...methods}>
          <FormPixelSize 
            distanceBetweenPoints={distanceBetweenPoints}
            onSubmit={methods.handleSubmit(onSubmit, onError)}
            />
        </FormProvider>
        <WizardButtons canFollow={sections[0].points.length === 2} formId='form-pixel-size'/>
      </div>
    </div>
  )
}
