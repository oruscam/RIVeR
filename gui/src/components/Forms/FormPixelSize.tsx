import './form.css'
import { useTranslation } from 'react-i18next'
import { useFormContext } from 'react-hook-form'
import { useMatrixSlice, useProjectSlice, useUiSlice } from '../../hooks'
import { PixelCoordinates, RealWorldCoordinates } from './index'
import { FormChild } from '../../types'
import { OrthoImage } from '../Graphs'

export const FormPixelSize = ({ onSubmit, onError }: FormChild ) => {
  const { t } = useTranslation()
  const { pixelSize, onUpdatePixelSize, onSetPixelRealWorld, onSetPixelDirection, isBackendWorking, hasChanged } = useMatrixSlice()
  const { video } = useProjectSlice()
  const { extraFields, dirPoints, drawLine, solution } = pixelSize
  const { width, height } = video.data

  const { register} = useFormContext()

  const { onSetErrorMessage } = useUiSlice()

  const handleLineLengthInput = ( event: React.KeyboardEvent<HTMLInputElement> |  React.FocusEvent<HTMLInputElement>  ) => {
    if( ((event as React.KeyboardEvent<HTMLInputElement>).key  === 'Enter' || event.type === 'blur')){
      event.preventDefault()
      const value = parseFloat(event.currentTarget.value)
      if ( value > 0) {
        onUpdatePixelSize({ length: value })
      } else {
        const error = {
          "pixel_size_LINE_LENGTH": {
            type: "required",
            message: t("PixelSize.Errors.lineLength")
          }
        }
        onSetErrorMessage(error)
      }
      (event.target as HTMLInputElement).blur()
    }
  }

  const handlePixelSizeInput = (event: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) => {
    if ((event as React.KeyboardEvent<HTMLInputElement>).key === 'Enter' || event.type === 'blur') {
    event.preventDefault()
    const value = parseFloat((event.target as HTMLInputElement).value)
    
    if (value > 0) {
      onUpdatePixelSize({ pixelSize: value, imageWidth: width, imageHeight: height })
    } else {
      const error = {
      "pixel_size_PIXEL_SIZE": {
        type: "required",
        message: t("PixelSize.Errors.pixelSize")
      }
      }
      onSetErrorMessage(error)
    }
    }
  }

  const onClickDrawLine = ( event: React.MouseEvent<HTMLButtonElement> ) => {
    event.preventDefault()
    onUpdatePixelSize({drawLine: true})
    return
  }

  console.log('pixelSize', solution)
  console.log('has changed', hasChanged)

  return (
    <>
      <h1 className='form-title'> {t('PixelSize.title')}</h1>
      <form onSubmit={onSubmit} onError={onError} className={`mt-3 form-scroll ${ isBackendWorking ? 'disabled' : ''}`} id='form-pixel-size' >
        <span id='pixel_size-HEADER'></span>
        <div className='form-base-2'>

            <div className='input-container-2'>
              <button className={`wizard-button form-button me-1 ${drawLine ? "wizard-button-active" : ""}`} type='button' onClick={onClickDrawLine} id='draw-line-pixel'>{t("PixelSize.drawLine")}</button>
              <span className='read-only bg-transparent'/>
            </div>
            
              <div className='input-container-2 mt-2'>
                <label className='read-only me-1'>{t("PixelSize.lineLength")}</label>
                <input className='input-field' 
                  disabled={dirPoints.length === 0}
                  type='number' 
                  step="any"
                  id='pixel_size-LINE_LENGTH'
                  {...register('pixel_size_LINE_LENGTH', {
                    required: t("PixelSize.Errors.required"),
                    validate: (value: string) => {
                      if ( parseFloat(value) <= 0){
                        return t("PixelSize.Errors.lineLength")
                      } 
                      return true
                    }
                  })}
                  onKeyDown={handleLineLengthInput}
                  onBlur={handleLineLengthInput}
                  ></input>
              </div>

              <div className='input-container-2 mt-1 mb-2'>
                <label className='read-only me-1'>{t("PixelSize.pixelSize")}</label>
                <input className='input-field'
                      {...register('pixel_size_PIXEL_SIZE')} 
                      type='number' 
                      id='pixel_size-PIXEL_SIZE'
                      // disabled={sections[0].dirPoints.length === 0}
                      step="any"
                      onKeyDown={handlePixelSizeInput}
                      onBlur={handlePixelSizeInput}
                      />
              </div>

              {
                solution && <OrthoImage solution={solution}/>
              }
              <button className='wizard-button form-button solver-button' id='solve-pixelsize' disabled={dirPoints.length !== 2 || pixelSize.rwLength === 0}>{t("Commons.solve")}</button>
          
            <div className={extraFields ? 'pixel-size-extra' : 'hidden'}>
              <RealWorldCoordinates modeName='pixel_size' onSetRealWorld={onSetPixelRealWorld}/>
              <PixelCoordinates modeName='pixel_size' onSetDirPoints={onSetPixelDirection}/> 
              <span id='span-footer'></span>
            </div>
          </div>
      </form>
    </>
  )
  }
  
