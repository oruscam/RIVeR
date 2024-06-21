import { useEffect, useState } from "react"
import { useForm, useFormContext } from "react-hook-form"
import { ButtonLock } from "../ButtonLock"
import { useUiSlice } from "../../hooks"
import { ChartCrossSection } from "../ChartCrossSection"

export const FormCrossSections = ({display, onSubmit, name}) => {
  const {register, watch} = useFormContext()
  const [extraFields, setExtraFields] = useState(false)
  const {onSetDrawLine, sections, activeSection, onSetBathimetry} = useUiSlice()
  const {drawLine, bathimetry} = sections[activeSection]
  const bathWatch = watch(`${name}-CS_BATHIMETRY`)
  const levelWatch = watch(`${name}-LEVEL`)

  const handleButtonDrawLine = () => {
    onSetDrawLine()
  }

  useEffect(() => {
    if(bathWatch){
      if(bathWatch.length == 1 && levelWatch){
        console.log(bathWatch)
        onSetBathimetry(bathWatch[0], parseFloat(levelWatch)
        )
      }
      else {
        onSetBathimetry(false, 0)
      }
    } 
    
  }, [bathWatch, levelWatch])


  return (
    <>
        <form className="form-cross-sections" style={{display: `${display ? "" : "none"}`, overflowY: `${!extraFields ? "hidden" : "auto"}`}} onSubmit={onSubmit} id="cross-section">
          <span id={`${name}-HEADER`}></span>
          <div className="simple-mode">
            <button className={`wizard-button form-button ${drawLine ? "wizard-button-active" : ""}`} type="button" id={`${name}-DRAW_LINE`} onClick={handleButtonDrawLine}> Draw Line </button>
            <span className="ghost"></span>
            <label className="read-only" htmlFor="CS_LENGTH"> CS Length</label>
            <input type="number" className="input-field" {...register(`${name}-CS_LENGTH`)} defaultValue={0} id="CS_LENGTH"></input>
            
            
            <input type="file" id={`${name}-bathimetry`} className="hidden-file-input" accept=".csv"
            {...register(`${name}-CS_BATHIMETRY`)}
            ></input>
            <label 
              className={`wizard-button form-button bathimetry-button mt-2 ${ bathimetry.bathimetryFile ? "wizard-button-active" : ""}`} 
              htmlFor={`${name}-bathimetry`}>
               <p> Import Bath</p>
            </label>
            <label className="read-only bg-transparent mt-2"> {bathWatch ? bathWatch[0]?.name : ""} </label>

            <label className="read-only" htmlFor="LEVEL"> Level</label>
            <input type="number" className="input-field" {...register(`${name}-LEVEL`)} defaultValue={0} id="LEVEL"></input>
            
            <div className="bathimetry mt-1">
              <ChartCrossSection></ChartCrossSection>
            </div>
          
          </div>
          
          <ButtonLock setExtraFields={setExtraFields} extraFields={extraFields} footerElementID={`${name}-HARD_MODE`} headerElementID={`${name}-HEADER`}></ButtonLock>


          <div className="hard-mode" id={`${name}-HARD_MODE`}>
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
          </div>
        </form>
    </>
  )
}
