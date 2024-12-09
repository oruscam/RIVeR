import { useFormContext } from "react-hook-form"
import { useMatrixSlice } from "../../hooks"

export const FormControlPoints = () => {
  const { controlPoints, onSetDrawPoints, onChangeControlPoints } = useMatrixSlice()
  const { drawPoints, isNotDefaultCoordinates } = controlPoints

  const { register } = useFormContext()

  const handeInputDistance = ( event ) => {
    const { value, id } = event.target

    onChangeControlPoints(null, { distance: parseFloat(value), position: id})
  }

  return (
    <>
        <h1 className="form-title"> Control Points </h1>
        <form id="form-control-points" className="mt-5">
            <div className="form-base-2">
                <div className="input-container-2">
                    <button className={`wizard-button form-button me-1 ${drawPoints ? "wizard-button-active" : ""}`} type="button" onClick={onSetDrawPoints}> Draw Points </button>
                    <span className='read-only bg-transparent'></span>
                </div>

                <div className="input-container-2 mt-2">
                  <label className="read-only me-1" id="D12">1-2</label>
                  <input className="input-field" type="number" id="distance_12" disabled={!isNotDefaultCoordinates} {...register('distance_12')} onBlur={handeInputDistance} />
                </div>

                <div className="input-container-2 mt-1">
                  <label className="read-only me-1" id="D13">1-3</label>
                  <input className="input-field" type="number" id="distance_13" disabled={!isNotDefaultCoordinates} {...register('distance_13')} onBlur={handeInputDistance}/>
                </div>

                <div className="input-container-2 mt-1">
                  <label className="read-only me-1" id="D14">1-4</label>
                  <input className="input-field" type="number" id="distance_14" disabled={!isNotDefaultCoordinates} {...register('distance_14')} onBlur={handeInputDistance}/>
                </div>

                <div className="input-container-2 mt-1">
                  <label className="read-only me-1" id="D23">2-3</label>
                  <input className="input-field" type="number" id="distance_23" disabled={!isNotDefaultCoordinates} {...register('distance_23')} onBlur={handeInputDistance}/>
                </div>

                <div className="input-container-2 mt-1">
                  <label className="read-only me-1" id="D24">2-4</label>
                  <input className="input-field" type="number" id="distance_24" disabled={!isNotDefaultCoordinates} {...register('distance_24')} onBlur={handeInputDistance}/>
                </div>

                <div className="input-container-2 mt-1">
                  <label className="read-only me-1" id="D34">3-4</label>
                  <input className="input-field" type="number" id="distance_34" disabled={!isNotDefaultCoordinates} {...register('distance_34')} onBlur={handeInputDistance}/>
                </div>
            </div>
        </form>
    </>
  )
}
