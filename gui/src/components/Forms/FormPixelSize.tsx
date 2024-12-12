import './form.css'
import { useTranslation } from 'react-i18next'
import { FieldValues, useFormContext } from 'react-hook-form'
import { useSectionSlice, useUiSlice } from '../../hooks'
import { PixelCoordinates, RealWorldCoordinates } from './index'
import { BaseSyntheticEvent } from 'react'

interface FormPixelSizeProps {
  onSubmit: (e?: BaseSyntheticEvent<object, any, any> | undefined) => Promise<void>,
  onError: (error: FieldValues) => void,
}

export const FormPixelSize = ({ onSubmit, onError }: FormPixelSizeProps ) => {
    const { t } = useTranslation()
    const { sections, onUpdateSection } = useSectionSlice()
    const { extraFields } = sections[0]
  
    const { register} = useFormContext()

    const { onSetErrorMessage } = useUiSlice()

    const handleLineLengthInput = ( event: React.KeyboardEvent<HTMLInputElement> |  React.FocusEvent<HTMLInputElement>  ) => {
      if( ((event as React.KeyboardEvent<HTMLInputElement>).key  === 'Enter' || event.type === 'blur')){
        event.preventDefault()
        const value = parseFloat(event.currentTarget.value)
        if ( value > 0) {
          onUpdateSection({lineLength: value})
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

    //* Desactiva la opcion de adelantar campos con el tabulador, cuando extraFields es false. 
    //* Porque sino se puede adelantar a los campos de la siguiente seccion
    const handleTab = ( event: React.KeyboardEvent<HTMLInputElement> ) => {
      if( event.key === 'Tab' && !extraFields){
        event.preventDefault()
      }
    }
  
  return (
    <>
      <h1 className='form-title'> {t('PixelSize.title')}</h1>
      <form onSubmit={onSubmit} onError={onError} className='mt-5 form-scroll' id='form-pixel-size' >
        <span id='pixel_size-HEADER'></span>
        <div className='form-base-2'>

            <div className='input-container-2'>
              <button className={`wizard-button form-button me-1 ${sections[0].drawLine ? "wizard-button-active" : ""}`} onClick={() => onUpdateSection({drawLine: true})} type='button'>{t("PixelSize.drawLine")}</button>
              <span className='read-only bg-transparent'></span>
            </div>
            
              <div className='input-container-2 mt-2'>
                <label className='read-only me-1'>{t("PixelSize.lineLength")}</label>
                <input className='input-field' 
                  disabled={sections[0].dirPoints.length === 0}
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
                      readOnly={true}
                      id='pixel_size-PIXEL_SIZE'
                      disabled={sections[0].dirPoints.length === 0}
                      step="any"
                      onKeyDown={handleTab}
                      />
              </div>

          <div className={extraFields ? '' : 'hidden'}>
            <RealWorldCoordinates modeName='pixel_size'/>
            <PixelCoordinates modeName='pixel_size'/> 
            <span id='span-footer'></span>
          </div>
          
          </div>
      </form>
    </>
  )
  }
  
