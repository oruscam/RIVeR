import './form.css'
import { useTranslation } from 'react-i18next'
import { FieldValues, useFormContext } from 'react-hook-form'
import { useEffect, useState } from 'react'
import { useUiSlice } from '../../hooks'

interface FormPixelSizeProps {
  distanceBetweenPoints: number,
  onSubmit: (data: FieldValues) => void,
  onError: (data: FieldValues) => void

}

export const FormPixelSize = ({distanceBetweenPoints, onSubmit, onError}: FormPixelSizeProps ) => {
    const { t } = useTranslation()
    const { watch, register } = useFormContext()
    const [pixelSize, setPixelSize] = useState(0)
    const lineLengthWatch = watch('input-line-length')
    const { onSetDrawLine, sections } = useUiSlice()
        
    const onClickDrawLine = () => {
      onSetDrawLine()
    }

    useEffect(() => {
      if(distanceBetweenPoints){
        const number = parseFloat((lineLengthWatch / distanceBetweenPoints).toFixed(4))
        setPixelSize(number)
      }
    }, [lineLengthWatch, distanceBetweenPoints])

  return (
    <>
      <h2 className='form-title'>{t("Step4.title")}</h2>
      <form onSubmit={onSubmit} onError={onError} className='form-base' id='form-pixel-size'>
        <button className={`wizard-button form-button ${sections[0].drawLine ? "wizard-button-active" : ""}`} onClick={onClickDrawLine} type='button'>{t("Step4.drawLine")}</button>
        <span className='ghost'></span>
        <label className='read-only'>{t("Step4.lineLength")}</label>
        <input className='input-field' 
          defaultValue={0} 
          type='number' 
          id='input-line-length'
          {...register('input-line-length', {
            required: t("Step4.Errors.required"),
            validate: (value: string) => {
              if ( parseFloat(value) <= 0){
                return t("Step4.Errors.lineLength")
              } 
              return true
            }
          })}
          ></input>
        <label className='read-only'>{t("Step4.pixelSize")}</label>
        <input className='input-field' {...register('input-pixel-size')} type='number' value={pixelSize}  id='input-pixel-size'></input>
      </form>
    </>
  )
}
