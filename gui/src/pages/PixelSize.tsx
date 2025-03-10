import { FieldValues, FormProvider, useForm } from 'react-hook-form'
import { useWizard } from 'react-use-wizard'
import { FormPixelSize } from '../components/Forms/index'
import { WizardButtons, Error, ImageWithMarks, Progress } from '../components/index'
import { useSectionSlice, useUiSlice } from '../hooks/index'

import './pages.css'
import { useEffect } from 'react'
import { ButtonLock } from '../components/ButtonLock.js'
import { formatNumberTo2Decimals, formatNumberToPrecision4 } from '../helpers/adapterNumbers.js'


export const PixelSize = () => {
  const { onSetPixelSize, sections, pixelSolution, onSetActiveSection } = useSectionSlice()
  const { dirPoints, rwPoints, pixelSize } = sections[0]

  // * Estado inicial del formulario
  const methods = useForm({
    defaultValues: {
      pixel_size_LINE_LENGTH: formatNumberTo2Decimals(pixelSize.rwLength),
      pixel_size_PIXEL_SIZE: formatNumberToPrecision4(pixelSize.size),
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

  const { nextStep } = useWizard()
  const { onSetErrorMessage } = useUiSlice()
  

  const onSubmit = (data: FieldValues, event: React.FormEvent<HTMLFormElement>) => {
    const id = (event.nativeEvent as SubmitEvent).submitter?.id

    if ( id === 'solve-pixelsize' ){
      event.preventDefault()
      onSetPixelSize(data)
      return
    }
    onSetActiveSection(1)
    nextStep()
  }
  
  const onError = (error: FieldValues, event: React.FormEvent<HTMLFormElement>) => {
    if ( event === undefined ) return;
  
  
    onSetErrorMessage(error);
  }

  useEffect(() => {
    methods.reset({
      pixel_size_LINE_LENGTH: formatNumberTo2Decimals(pixelSize.rwLength),
      pixel_size_PIXEL_SIZE: formatNumberToPrecision4(pixelSize.size),
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
        <ImageWithMarks/>
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
        <ButtonLock footerElementID='span-footer' headerElementID='pixel_size-HEADER' disabled={sections[0].dirPoints.length === 0}/>
        <WizardButtons canFollow={pixelSolution?.image !== undefined} formId='form-pixel-size'/>
      </div>
    </div>
  )
}
