import { useEffect, useState } from "react"
import { useFormContext } from "react-hook-form"
import { ButtonLock } from "../ButtonLock"
import { useDataSlice } from "../../hooks"
import { Bathimetry } from "../Bathimetry"
import { HardModeCoordinates } from "./index"

interface FormCrossSectionsProps {
  onSubmit: (data: React.SyntheticEvent<HTMLFormElement, Event>) => void,
  name: string,
  factor: {
    x: number,
    y: number
  }

}

export const FormCrossSections = ({ onSubmit, name, factor}: FormCrossSectionsProps) => {
  const {register, watch, setValue } = useFormContext()
  const [extraFields, setExtraFields] = useState(false)
  
  const [bathimetryLimits, setBathimetryLimits] = useState({min: 0, max: 0})
  
  const {onSetDrawLine, sections, activeSection, onSetBathimetryFile, onSetBathimetryLevel} = useDataSlice()
  const {drawLine, bathimetry} = sections[activeSection]
  

  const bathWatch = watch(`${name}-CS_BATHIMETRY`)

  const handleButtonDrawLine = () => {
    onSetDrawLine()
  }
  
  const handleKeyDownBathLevel = (event, nextFieldId) => {
    if(event.key === 'Enter'){
      event.preventDefault()
      document.getElementById(nextFieldId)?.focus()
      const value = parseFloat(event.target.value)
      if(value !== bathimetryLimits.max && bathimetryLimits.min <= value && value <= bathimetryLimits.max){
        onSetBathimetryLevel(value)
      }
    }
  }
  
  useEffect(() => {
    if( bathWatch?.length === 1 ){
      if(bathimetry.path === ''){
        onSetBathimetryFile(bathWatch[0])
      } else if(bathWatch[0].path !== bathimetry.path){
        onSetBathimetryFile(bathWatch[0])
      }
    }
    if(bathimetryLimits.max !== 0){
      setValue(`${name}-LEVEL`, bathimetryLimits.max)
      onSetBathimetryLevel(bathimetryLimits.max)
    }
  }, [bathWatch, bathimetryLimits])



  return (
    <>
        <form className="form-cross-sections" style={{overflowY: `${!extraFields ? "hidden" : "auto"}`}} onSubmit={onSubmit} id="cross-section">
          <span id={`${name}-HEADER`}></span>
          <div className="simple-mode-container">
            <div className="simple-mode">
              <button className={`wizard-button form-button ${drawLine ? "wizard-button-active" : ""}`} type="button" id={`${name}-DRAW_LINE`} onClick={handleButtonDrawLine}> Draw Line </button>
              <span className="ghost"></span>
              <label className="read-only" htmlFor="CS_LENGTH"> CS Length</label>
              <input type="number" className="input-field" {...register(`${name}-CS_LENGTH`)} defaultValue={0} id="CS_LENGTH"></input>
              
              
              <input type="file" id={`${name}-CS_BATHIMETRY`} className="hidden-file-input" accept=".csv"
              {...register(`${name}-CS_BATHIMETRY`)}
              ></input>
              <label 
                className={`wizard-button form-button bathimetry-button mt-2 ${ bathimetry.blob ? "wizard-button-active" : ""}`} 
                htmlFor={`${name}-CS_BATHIMETRY`}>
                <p> Import Bath</p>
              </label>
              <label className="read-only bg-transparent mt-2"> {bathWatch?.length === 1 ? bathWatch[0].name : ''} </label>

              <label className="read-only" htmlFor="LEVEL"> Level</label>
              <input type="number" step='any' className="input-field" {...register(`${name}-LEVEL`, {max: bathimetryLimits.max, min: bathimetryLimits.min})} defaultValue={bathimetryLimits.max} id="LEVEL" onKeyDown={(event) => handleKeyDownBathLevel(event, 'wizard-next')}></input>
            </div>
            
            <Bathimetry setBathimetryLimits={setBathimetryLimits}/>
            <ButtonLock setExtraFields={setExtraFields} extraFields={extraFields} footerElementID={`${name}-HARD_MODE`} headerElementID={`${name}-HEADER`} disabled={false}></ButtonLock>
          </div>
        
        
          {/* <div className="hard-mode" id={`${name}-HARD_MODE`}>
            <h2 className="form-subtitle mt-5 mb-1" id="REAL_WORD">Real Word Coordinates</h2>

            <label className="read-only red" htmlFor="EAST_LEFT"> East Left </label>
            <input type="number" className="input-field" {...register(`${name}-EAST_LEFT`)} defaultValue={0} id="EAST_LEFT"></input>
            <label className="read-only red" htmlFor="NORTH_LEFT"> North Left </label>
            <input type="number" className="input-field" {...register(`${name}-NORTH_LEFT`)} defaultValue={0} id="NORTH_LEFT"></input>

            <label className="read-only green" htmlFor="EAST_RIGHT"> East Right </label>
            <input type="number" className="input-field" {...register(`${name}-EAST_RIGHT`)} defaultValue={0} id="EAST_RIGHT"></input>
            <label className="read-only green" htmlFor="NORTH_RIGHT"> North Right </label>
            <input type="number" className="input-field" {...register(`${name}-NORTH_RIGHT`)} defaultValue={0} id="NORTH_RIGHT"></input>

            <h2 className="form-subtitle mt-2 mb-1"> Pixel Coordinates</h2>
            <label className="read-only red" htmlFor="X_LEFT"> X Left</label>
            <input type="number" className="input-field"{...register(`${name}-X_LEFT`)} defaultValue={0} id="X_LEFT"></input>
            <label className="read-only red" htmlFor="Y_LEFT"> Y Left</label>
            <input type="number" className="input-field"{...register(`${name}-Y_LEFT`)} defaultValue={0} id="Y_LEFT"></input>

            <label className="read-only green" htmlFor="X_RIGHT"> X Right</label>
            <input type="number" className="input-field"{...register(`${name}-X_RIGHT`)} defaultValue={0} id="X_RIGHT"></input>
            <label className="read-only green" htmlFor="Y_RIGHT"> Y Right</label>
            <input type="number" className="input-field"{...register(`${name}-Y_RIGHT`)} defaultValue={0} id="Y_RIGHT"></input> 
          </div> */}
          <HardModeCoordinates modeName={name} factor={factor}></HardModeCoordinates>
        </form>
    </>
  )
}
