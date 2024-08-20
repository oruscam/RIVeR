import { FieldValues, FormProvider, useForm } from 'react-hook-form'
import { useWizard } from 'react-use-wizard'
import { FormPixelSize } from '../components/Forms/index'
import { WizardButtons, Error, ImageWithMarks, Progress } from '../components/index'
import { getNewImageResolution } from '../helpers/index.js'
import { useSectionSlice, useProjectSlice, useUiSlice } from '../hooks/index'


import './pages.css'
import { useEffect, useState } from 'react'
import { ButtonLock } from '../components/ButtonLock.js'

export const Step4 = () => {
  const [extraFields, setExtraFields] = useState(false)
  const { video } = useProjectSlice();
  const { onSetPixelSize, sections } = useSectionSlice()
  const { points, realWorld, pixelSize } = sections[0]
  
  // * Estado inicial del formulario
  const methods = useForm({
    defaultValues: {
      pixel_size_LINE_LENGTH: pixelSize.rw_length,
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
        <ImageWithMarks height={height} width={width} factor={factor}></ImageWithMarks>
        <Error/>
      </div>
      <div className='form-container'>
        <Progress/>
        <FormProvider {...methods}>
          <FormPixelSize 
            onSubmit={methods.handleSubmit(onSubmit, onError)}
            onError={onError}
            factor={factor}
            extraFields={extraFields}
          />
        </FormProvider>
        <ButtonLock footerElementID='span-footer' headerElementID='pixel_size-HEADER' extraFields={extraFields} setExtraFields={setExtraFields} disabled={sections[0].points.length === 0}
        ></ButtonLock>
        <WizardButtons canFollow={sections[0].points.length === 2} formId='form-pixel-size'/>
      </div>
    </div>
  )
}
