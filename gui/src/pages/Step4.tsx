import { FieldValues, FormProvider, useForm } from 'react-hook-form'
import { useWizard } from 'react-use-wizard'
import { FormPixelSize } from '../components/Forms/index'
import { WizardButtons, Error, ImageWithMarks, Progress } from '../components/index'
import { getNewImageResolution } from '../helpers/index.js'
import { useSectionSlice, useProjectSlice, useUiSlice } from '../hooks/index'

import './pages.css'
import { useEffect } from 'react'
import { ButtonLock } from '../components/ButtonLock.js'

export const Step4 = () => {
  const { video } = useProjectSlice();
  const { onSetPixelSize, sections } = useSectionSlice()
  const { dirPoints, rwPoints, pixelSize } = sections[0]
  
  // * Estado inicial del formulario
  const methods = useForm({
    defaultValues: {
      pixel_size_LINE_LENGTH: pixelSize.rw_length,
      pixel_size_PIXEL_SIZE: pixelSize.size,
      pixel_size_EAST_point_1: rwPoints[0].x,
      pixel_size_EAST_point_2: rwPoints[1].x,
      pixel_size_NORTH_point_1: rwPoints[0].y,
      pixel_size_NORTH_point_2: rwPoints[1].y,
      pixel_size_X_point_1: dirPoints.length === 0 ? 0 : dirPoints[0].x,
      pixel_size_Y_point_1: dirPoints.length === 0 ? 0 : dirPoints[0].y,
      pixel_size_X_point_2: dirPoints.length === 0 ? 0 : dirPoints[1].x,
      pixel_size_Y_point_2: dirPoints.length === 0 ? 0 : dirPoints[1].y 
    }
  })

  const { nextStep  } = useWizard()
  const { onSetErrorMessage, screenSizes } = useUiSlice()
  
  const { width: windowWidth, height: windowHeight } = screenSizes
  const { data } = video 

  const { height, width, factor } = getNewImageResolution(windowWidth, windowHeight, data.width, data.height)


  const onSubmit = (data: FieldValues) => {
    onSetPixelSize(data)
    nextStep()
  }
  
  const onError = (error: FieldValues) => {
    onSetErrorMessage(error)
  }


  useEffect(() => {
    methods.reset({
      pixel_size_LINE_LENGTH: pixelSize.rw_length,
      pixel_size_PIXEL_SIZE: pixelSize.size,
      pixel_size_EAST_point_1: rwPoints[0].x,
      pixel_size_EAST_point_2: rwPoints[1].x,
      pixel_size_NORTH_point_1: rwPoints[0].y,
      pixel_size_NORTH_point_2: rwPoints[1].y,
      pixel_size_X_point_1: dirPoints.length === 0 ? 0 : dirPoints[0].x,
      pixel_size_Y_point_1: dirPoints.length === 0 ? 0 : dirPoints[0].y,
      pixel_size_X_point_2: dirPoints.length === 0 ? 0 : dirPoints[1].x,
      pixel_size_Y_point_2: dirPoints.length === 0 ? 0 : dirPoints[1].y 
    })
  }, [dirPoints, rwPoints, sections[0]])


  return (
    <div className='regular-page'>
      <div className='media-container'>
        <ImageWithMarks height={height} width={width} factor={factor}></ImageWithMarks>
        <Error/>
      </div>
      <div className='form-container'>
        <Progress/>
        <FormProvider {...methods}>
          <FormPixelSize 
            onSubmit={methods.handleSubmit(onSubmit, onError)}
            onError={onError}
            
          />
        </FormProvider>
        <ButtonLock footerElementID='span-footer' headerElementID='pixel_size-HEADER' disabled={sections[0].dirPoints.length === 0}
        ></ButtonLock>
        <WizardButtons canFollow={sections[0].dirPoints.length === 2} formId='form-pixel-size'/>
      </div>
    </div>
  )
}
