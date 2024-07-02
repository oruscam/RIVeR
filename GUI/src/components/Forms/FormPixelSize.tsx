import './form.css'
import { useTranslation } from 'react-i18next'
import { FieldValues, useFormContext } from 'react-hook-form'
import { useEffect, useState } from 'react'
import { useDataSlice, useUiSlice } from '../../hooks'
import { ButtonLock } from '../ButtonLock'
import { getDistanceBetweenPoints, computePixelSize } from '../../helpers/index.ts'
import { PixelCoordinates, RealWorldCoordinates } from './index'
import { InfoPixelSize } from '../InfoPixelSize'


interface FormPixelSizeProps {
  onSubmit: (data: FieldValues) => void,
  onError: (data: React.SyntheticEvent<HTMLFormElement, Event>) => void,
  factor: {
    x: number,
    y: number
  }
}

interface Point {
  x: number, y: number
}

export const FormPixelSize = ({onSubmit, onError }: FormPixelSizeProps ) => {
    const { t } = useTranslation()
    const { register, setValue } = useFormContext()
    const [extraFields, setExtraFields] = useState(false)
    const [rwCoordinates, setRwCoordinates] = useState<Point[]>([{x: 0, y: 0}, {x: 0, y: 0}])    

    const { onSetErrorMessage } = useUiSlice()
    const {onSetDrawLine, sections}= useDataSlice()

    const points = sections[0].points

    
    const handleLineLengthInput = ( event: React.KeyboardEvent<HTMLInputElement> |  React.FocusEvent<HTMLInputElement>  ) => {
      if( ((event as React.KeyboardEvent<HTMLInputElement>).key  === 'Enter' || event.type === 'blur')){
        event.preventDefault()
        const value = parseFloat(event.currentTarget.value)
        if( value > 0) {
          setRwCoordinates([{x: 0, y:0}, {x: value, y: 0}])
          setValue('pixel_size_EAST_point_1', 0)
          setValue('pixel_size_EAST_point_2', value)
          setValue('pixel_size_NORTH_point_1', 0)
          setValue('pixel_size_NORTH_point_2', 0)

        } else {
          setValue('pixel_size_EAST_point_2', 0)
          setValue('pixel_size_LINE_LENGTH', 0)
          const error = {
            "pixel_size_LINE_LENGTH": {
              type: "required",
              message: t("Step4.Errors.lineLength")
            }
          }
          onSetErrorMessage(error)
        }
        
        (event.target as HTMLInputElement).blur()
      }
    }

    useEffect(() => {
      const pSize = computePixelSize(points, rwCoordinates)
      const lineLength = getDistanceBetweenPoints(rwCoordinates)
      setValue('pixel_size_LINE_LENGTH', lineLength)
      if(pSize){
        setValue('pixel_size_PIXEL_SIZE', pSize)
      } else {
        setValue('pixel_size_PIXEL_SIZE', 0)
      }
    }, [points, rwCoordinates])
    


  return (
    <>
      <h2 className='form-title'> {t('Step4.title')}</h2>
      <form onSubmit={onSubmit} onError={onError} className='mt-5' id='form-pixel-size' style={{overflowY: `${!extraFields ? "hidden" : "auto"}`}}>
        <span id='pixel_size-HEADER'></span>
        <div className='simple-mode-container'>
          <div className='simple-mode'>
            <button className={`wizard-button form-button ${sections[0].drawLine ? "wizard-button-active" : ""}`} onClick={() => onSetDrawLine()} type='button'>{t("Step4.drawLine")}</button>
            {/* <InfoPixelSize animation={'click-drag-drop'}></InfoPixelSize> */}
            <span className='ghost'></span>


            <label className='read-only'>{t("Step4.lineLength")}</label>
            <input className='input-field' 
              defaultValue={0} 
              disabled={sections[0].points.length === 0}
              type='number' 
              step="any"
              id='pixel_size-LINE_LENGTH'
              {...register('pixel_size_LINE_LENGTH', {
                required: t("Step4.Errors.required"),
                validate: (value: string) => {
                  if ( parseFloat(value) <= 0){
                    return t("Step4.Errors.lineLength")
                  } 
                  return true
                }
              })}
              onKeyDown={handleLineLengthInput}
              onBlur={handleLineLengthInput}
              ></input>
            <label className='read-only'>{t("Step4.pixelSize")}</label>
            <input className='input-field'
                  {...register('pixel_size_PIXEL_SIZE')} 
                  type='number' 
                  readOnly={true}
                  id='pixel_size-PIXEL_SIZE'
                  disabled={sections[0].points.length === 0}
                  step="any"
                  />
          </div>
          <span className='space'/>
          <ButtonLock setExtraFields={setExtraFields} extraFields={extraFields} footerElementID='pixel_size-HARD_MODE' headerElementID='pixel_size-HEADER' disabled={sections[0].points.length === 0}/>
        </div>

        <div className='hard-mode' id='pixel_size-HARD_MODE'>
          <RealWorldCoordinates modeName='pixel_size' rwCoordinates={rwCoordinates} setRwCoordinates={setRwCoordinates}/>
          <PixelCoordinates modeName='pixel_size'/> 
        </div>
      </form>
    </>
  )
  }
  