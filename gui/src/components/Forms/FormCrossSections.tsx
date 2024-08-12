import { useEffect, useState } from "react"
import { useFormContext } from "react-hook-form"
import { ButtonLock } from "../ButtonLock"
import { useSectionSlice } from "../../hooks"
import { Bathimetry } from "../Bathimetry"
import { RealWorldCoordinates } from "./RealWorldCoordinates"
import { PixelCoordinates } from "./PixelCoordinates"

interface FormCrossSectionsProps {
  onSubmit: (data: React.SyntheticEvent<HTMLFormElement, Event>) => void,
  name: string,
}

export const FormCrossSections = ({ onSubmit, name }: FormCrossSectionsProps) => {
  const [extraFields, setExtraFields] = useState(false)

  const [bathimetryLimits, setBathimetryLimits] = useState({ min: 0, max: 0 })

  const { sections, activeSection, onUpdateSection } = useSectionSlice()
  const { drawLine, bathimetry } = sections[activeSection]
  const { register, watch, setValue } = useFormContext()
  const bathWatch = watch(`${name}_CS_BATHIMETRY`)


  const handleKeyDownBathLevel = (event: React.KeyboardEvent<HTMLInputElement>, nextFieldId: string) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      document.getElementById(nextFieldId)?.focus()
      const value = parseFloat((event.target as HTMLInputElement).value)
      if (bathimetryLimits.min <= value && value <= bathimetryLimits.max) {
        onUpdateSection({ level: value })
      } else{
        setValue(`${name}_LEVEL`, bathimetryLimits.max)
        onUpdateSection({ level: bathimetryLimits.max })
      }
    }
    if( event.key === 'Tab' && !extraFields){
      event.preventDefault()
    }
  }

  useEffect(() => {
    if (bathWatch?.length) {
      if (bathimetry.path === "" || bathWatch[0].path !== bathimetry.path) {
        onUpdateSection({ file: bathWatch[0] })
      }
    }
  }, [bathWatch])

  useEffect(() => {
    if (bathimetryLimits.max !== 0) {
      onUpdateSection({ level: bathimetryLimits.max })
    }
  }, [bathimetryLimits])

  return (
    <>
      <form className="form-cross-sections" style={{ overflowY: `${!extraFields ? "hidden" : "auto"}` }} onSubmit={onSubmit} id="cross-section">
        <span id={`${name}-HEADER`}/>
        <div className="simple-mode-container">
          <div className="simple-mode">
            <button className={`wizard-button form-button ${drawLine ? "wizard-button-active" : ""}`}
              type="button" id={`${name}-DRAW_LINE`}
              onClick={() => onUpdateSection({ drawLine: true })}
            > Draw Line </button>

            <span className="ghost"></span>
            <label className="read-only" htmlFor="CS_LENGTH"> CS Length </label>
            <input type="number"
              className="input-field-read-only"
              {...register(`${name}_CS_LENGTH`, {
                validate: value => value != 0 || 'El valor no puede ser 0'
              })}
              id="CS_LENGTH" readOnly={true}
            />

            <input type="file" id={`${name}_CS_BATHIMETRY`}
              className="hidden-file-input"
              accept=".csv"
              {...register(`${name}_CS_BATHIMETRY`)}
            />
            <label
              className={`wizard-button form-button bathimetry-button mt-2 ${bathimetry.blob ? "wizard-button-active" : ""}`}
              htmlFor={`${name}_CS_BATHIMETRY`}>
              <p> Import Bath </p>
            </label>
            <label className="read-only bg-transparent mt-2"> {bathimetry.name !== "" ? bathimetry.name : ''} </label>

            <label className="read-only" htmlFor="LEVEL"> Level</label>
            <input  type="number" 
                    step='any' 
                    className="input-field" 
                    {...register(`${name}_LEVEL`, { max: bathimetryLimits.max, min: bathimetryLimits.min })} 
                    defaultValue={bathimetryLimits.max} 
                    id="LEVEL" onKeyDown={(event) => handleKeyDownBathLevel(event, 'wizard-next')}
                    />
          </div>

          <Bathimetry setBathimetryLimits={setBathimetryLimits} />
          <ButtonLock setExtraFields={setExtraFields} extraFields={extraFields} footerElementID={`${name}-HARD_MODE`} headerElementID={`${name}-HEADER`} disabled={false}></ButtonLock>
        </div>

        <div className="hard-mode" id={`${name}-HARD_MODE`}>
          <RealWorldCoordinates modeName={name} />
          <PixelCoordinates modeName={name} />
        </div>
      </form>
    </>
  )
}
