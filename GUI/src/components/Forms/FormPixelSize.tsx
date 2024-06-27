import './form.css'
import { useTranslation } from 'react-i18next'
import { FieldValues, useFormContext } from 'react-hook-form'
import { useEffect, useState } from 'react'
import { useDataSlice } from '../../hooks'
import { ButtonLock } from '../ButtonLock'
import { getDistanceBetweenPoints } from '../../helpers/resolution'
import { HardMode } from './HardMode'

interface FormPixelSizeProps {
  onSubmit: (data: FieldValues) => void,
  onError: (data: React.SyntheticEvent<HTMLFormElement, Event>) => void,
  factor: {
    x: number,
    y: number
  }
}

export const FormPixelSize = ({onSubmit, onError, factor}: FormPixelSizeProps ) => {
    const { t } = useTranslation()
    const { watch, register } = useFormContext()
    const [pixelSize, setPixelSize] = useState(0)
    const lineLengthWatch = watch('pixel-size-LINE_LENGTH')
    const {onSetDrawLine, sections}= useDataSlice()
    const [extraFields, setExtraFields] = useState(false)
    

    const distanceBetweenPoints = getDistanceBetweenPoints(sections[0].points)
    const onClickDrawLine = () => {
      onSetDrawLine()
    }

    useEffect(() => {
      if(lineLengthWatch !== undefined && lineLengthWatch !== "" && distanceBetweenPoints !== 0){
          const number = parseFloat((lineLengthWatch / distanceBetweenPoints).toFixed(4))
          setPixelSize(number)
      }
        
        
        }, [lineLengthWatch, distanceBetweenPoints])

    // * Para manejar los cambios en los campos de coordenadas
        
    


  return (
    <>
      <h2 className='form-title'>{t("Step4.title")}</h2>
      <form onSubmit={onSubmit} onError={onError} className='mt-2 test' id='form-pixel-size' style={{overflowY: `${!extraFields ? "hidden" : "auto"}`}}>
        <span id='pixel-size-HEADER'></span>
        <div className='container-test'>
          <div className='simple-mode'>
            <button className={`wizard-button form-button ${sections[0].drawLine ? "wizard-button-active" : ""}`} onClick={onClickDrawLine} type='button'>{t("Step4.drawLine")}</button>
            <span className='ghost'></span>
            <label className='read-only'>{t("Step4.lineLength")}</label>
            <input className='input-field' 
              defaultValue={0} 
              disabled={sections[0].points.length === 0}
              type='number' 
              id='pixel-size-LINE_LENGTH'
              {...register('pixel-size-LINE_LENGTH', {
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
            <input className='input-field'
                  {...register('pixel-size-PIXEL_SIZE')} 
                  type='number' value={pixelSize}  
                  id='pixel-size-PIXEL_SIZE'
                  disabled={sections[0].points.length === 0}
                  />
          </div>
          <span className='space'/>
          <ButtonLock setExtraFields={setExtraFields} extraFields={extraFields} footerElementID='pixel-size-HARD_MODE' headerElementID='pixel-size-HEADER' disabled={sections[0].points.length === 0}/>
        </div>
        
        <HardMode modeName={'pixel_size'} factor={factor}></HardMode>
      </form>
    </>
  )
}
