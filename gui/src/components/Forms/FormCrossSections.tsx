import { act, useEffect, useState } from "react"
import { useFormContext } from "react-hook-form"
import { ButtonLock } from "../ButtonLock"
import { useSectionSlice } from "../../hooks"
import { RealWorldCoordinates } from "./RealWorldCoordinates"
import { PixelCoordinates } from "./PixelCoordinates"
import { Bathimetry } from "../Graphs"

interface FormCrossSectionsProps {
  onSubmit: (data: React.SyntheticEvent<HTMLFormElement, Event>) => void,
  name: string,
  index: number,
}

export const FormCrossSections = ({ onSubmit, name, index }: FormCrossSectionsProps) => {

  const [bathimetryLimits, setBathimetryLimits] = useState({ min: 0, max: 0 })

  const { sections, activeSection, onUpdateSection } = useSectionSlice()
  const { drawLine, bathimetry, extraFields } = sections[activeSection]
  const { register, setValue } = useFormContext()



  const handleKeyDownBathLevel = (event: React.KeyboardEvent<HTMLInputElement>, nextFieldId: string) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      document.getElementById(nextFieldId)?.focus()
      const value = parseFloat((event.target as HTMLInputElement).value)
      if (value === bathimetry.level) return ;
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

  const onFileBathChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if(file){
      onUpdateSection({ file })
    }
  }

  const handleLeftBankInput = ( event: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement> ) => { 
    if ( (event as React.KeyboardEvent<HTMLInputElement>).key  === 'Enter' || event.type === 'blur' ) {
      event.preventDefault()

      const value = parseFloat((event.target as HTMLInputElement).value);
      
      if( !isNaN(value) ) {
        document.getElementById('wizard-next')?.focus()
        onUpdateSection({leftBank: value})
      } else {
        setValue(`${name}_LEFT_BANK`, bathimetry.leftBank)
      }

    }
  }

  useEffect(() => {
    if (bathimetryLimits.max !== 0 && bathimetry.level === 0) {
      onUpdateSection({ level: bathimetryLimits.max })
    }
  }, [bathimetryLimits])


  return (
    <div id="form-section-div" className={activeSection !== index ? "hidden" : ""}>
      <form className="form-scroll" onSubmit={onSubmit} id="form-cross-section">
        <span id={`${name}-HEADER`}/>
        <div className="form-base-2 mt-2">
            
            <div className="input-container-2">
              <button className={`wizard-button form-button me-1 ${drawLine ? "wizard-button-active" : ""}`}
                type="button" id={`${name}-DRAW_LINE`}
                onClick={() => onUpdateSection({ drawLine: true })}
              > Draw Line </button>
              <span className="read-only bg-transparent"></span>
            </div>
            
            <div className="input-container-2 mt-1">
              <label className="read-only me-1" htmlFor="CS_LENGTH"> CS Length </label>
              <input type="number"
                className="input-field-read-only"
                {...register(`${name}_CS_LENGTH`, {
                  validate: value => value != 0 || `The value of CS Length can not be 0 in ${name}`
                })}
                id="CS_LENGTH" readOnly={true}
              />
            </div>

            <div className="input-container-2 mt-1"> 
              <input type="file" id={`${name}_CS_BATHIMETRY`}
                className="hidden-file-input"
                accept=".csv"
                {...register(`${name}_CS_BATHIMETRY`, { 
                  validate: value => {
                    if (sections[index].bathimetry.path === "" && value.length === 0) {
                      return `Bathimetry is required in ${name}`
                    }
                    return true
                  },
                  onChange: onFileBathChange
                })}
              />
              <label
                className={`wizard-button form-button bathimetry-button mt-1 me-1 ${bathimetry.blob ? "wizard-button-active" : ""}`}
                htmlFor={`${name}_CS_BATHIMETRY`}>
                <p> Import Bath </p>
              </label>
              <label className="read-only bg-transparent mt-1"> {bathimetry.name !== "" ? bathimetry.name : ''} </label>
            </div>
            
            <div className="input-container-2 mt-1 mb-1">
              <label className="read-only me-1" htmlFor="LEVEL"> Level</label>
              <input  type="number" 
                      step='any' 
                      className="input-field" 
                      {...register(`${name}_LEVEL`, { 
                        validate: () => {
                          if( bathimetry.level !== 0) return true;
                        }
                       })} 
                      defaultValue={bathimetryLimits.max} 
                      id="LEVEL" onKeyDown={(event) => handleKeyDownBathLevel(event, 'wizard-next')}
                      />
            </div>

          <Bathimetry setBathimetryLimits={setBathimetryLimits} lineColor="#ffffff" leftBank={bathimetry.leftBank} showLeftBank={true}/>

          <div className="input-container-2 mt-1 mb-4" id="left-bank-station-container">
            <label className="read-only me-1" htmlFor="left-bank-station-input" id="left-bank-station-label"> Left bank station </label>
            <input type="number" className="input-field" step='any' id="left-bank-station-input" {...register(`${name}_LEFT_BANK`)} onKeyDown={handleLeftBankInput} onBlur={handleLeftBankInput}/>
          </div>
          
          <div className={extraFields ? '' : 'hidden'}>
            <RealWorldCoordinates modeName={name} />
            <PixelCoordinates modeName={name} />
            <span id={`span-footer-${name}`}></span>
          </div>
        </div>
      </form>
      {
        activeSection === index && <ButtonLock disabled={sections[activeSection].points.length === 0} footerElementID={`span-footer-${name}`} headerElementID={`${name}-HEADER`}></ButtonLock>
      }                 
    </div>
  )
}
