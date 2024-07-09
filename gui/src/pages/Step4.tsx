import { FieldValues, FormProvider, useForm } from 'react-hook-form'
import { useWizard } from 'react-use-wizard'
import { FormPixelSize } from '../components/Forms/index'
import { WizardButtons, Error, ImageWithMarks, Progress } from '../components/index'
import { getNewImageResolution } from '../helpers/index.js'
import { useDataSlice, useUiSlice } from '../hooks/index'


import './pages.css'
import { useEffect } from 'react'

export const Step4 = () => {
  const { video, onSetPixelSize, sections } = useDataSlice()
  const { points, realWorld, pixelSize } = sections[0]
  
  // * Estado inicial del formulario
  const methods = useForm({
    defaultValues: {
      pixel_size_LINE_LENGTH: pixelSize.rw_lenght,
      pixel_size_PIXEL_SIZE: pixelSize.size,
      pixel_size_EAST_point_1: realWorld[0].x,
      pixel_size_EAST_point_2: realWorld[1].x,
      pixel_size_NORTH_point_1: realWorld[0].y,
      pixel_size_NORTH_point_2: realWorld[1].y,
      pixel_size_X_point_1: points.length === 0 ? 0 : points[0].x,
      pixel_size_Y_point_1: points.length === 0 ? 0 : points[0].y,
      pixel_size_X_point_2: points.length === 0 ? 0 : points[1].x,
      pixel_size_Y_point_2: points.length === 0 ? 0 : points[1].y 
    }
  })

  const { nextStep  } = useWizard()
  const { onSetErrorMessage, screenSizes } = useUiSlice()
  
  const { width: windowWidth } = screenSizes
  const { data } = video 

  const values = getNewImageResolution(windowWidth, data.width, data.height)


  const onSubmit = (data: FieldValues) => {
    onSetPixelSize(data)
    nextStep()
  }
  
  const onError = (error: FieldValues) => {
    onSetErrorMessage(error)
  }


  useEffect(() => {
    methods.reset({
      pixel_size_LINE_LENGTH: pixelSize.rw_lenght,
      pixel_size_PIXEL_SIZE: pixelSize.size,
      pixel_size_EAST_point_1: realWorld[0].x,
      pixel_size_EAST_point_2: realWorld[1].x,
      pixel_size_NORTH_point_1: realWorld[0].y,
      pixel_size_NORTH_point_2: realWorld[1].y,
      pixel_size_X_point_1: points.length === 0 ? 0 : points[0].x,
      pixel_size_Y_point_1: points.length === 0 ? 0 : points[0].y,
      pixel_size_X_point_2: points.length === 0 ? 0 : points[1].x,
      pixel_size_Y_point_2: points.length === 0 ? 0 : points[1].y 
    })
  }, [points, realWorld])


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
