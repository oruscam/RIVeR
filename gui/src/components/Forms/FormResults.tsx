import { useFormContext } from "react-hook-form";
import { useDataSlice, useSectionSlice } from "../../hooks";
import { AllInOne } from "../Graphs/AllInOne"
import { Grid } from "../index"

interface FormResultProps {
  onSubmit: (data: React.SyntheticEvent<HTMLFormElement, Event>) => void,
  index: number,
}

export const FormResults = ({ onSubmit, index } : FormResultProps) => {
  const { register, setValue } = useFormContext();
  const { sections, activeSection, onChangeDataValues, onUpdateSection } = useSectionSlice();
  const { name, data, numStations, alpha } = sections[activeSection]
  const { onGetResultData } = useDataSlice();

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const id = e.target.id
    switch (id) {
      case 'show-95-percentile':
        onChangeDataValues({ type: 'show95Percentile' })
        break;
      case 'show-velocity-std':
        onChangeDataValues({ type: 'showVelocityStd' })
        break;

      case 'interpolated-profile':
        onUpdateSection({ interpolated: 'interpolated' })
        break;

      default:
        break;
    }

  }

  const handleOnChangeInput = (event: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement> ) => {
    if ( (event as React.KeyboardEvent<HTMLInputElement>).key  === 'Enter' || event.type === 'blur' ){
      event.preventDefault()
      const value = parseFloat((event.target as HTMLInputElement).value);
      const id = (event.target as HTMLInputElement).id
      
      switch (id) {
        case 'stations-number':
          if ( value !== 0 && value !== numStations && isNaN(value) === false ){
            onUpdateSection({ numStations: value })
          } else {
            setValue(`${name}_STATIONS_NUMBER`, numStations)
          }
          break;
        case 'alpha':
          if ( value !== 0 && value !== alpha && isNaN(value) === false ){
            onUpdateSection({ alpha: value })
          } else {
            setValue(`${name}_ALPHA`, alpha)
          }
          onUpdateSection({ alpha: value })
          break;
        default:
          break;
      }
    }
  }
  
  return (
    <div id="form-section-div"  className={activeSection !== index ? 'hidden' : ''}>
      <form className="form-scroll" id="form-result" onSubmit={onSubmit}>

        <div id="result-info">
          <p id="result-number">{data?.total_Q}</p>
          <div>
            <p id="result-measured"> {data?.measured_Q}% Measured</p>
            <p> {data?.interpolated_Q}% Interpolated </p>
          </div>
        </div>

        <div className="input-container mt-2">
          <label className="read-only me-1" htmlFor="alpha"> Alpha </label>
          <input className="input-field"
            id="alpha"
            type="number"
            step='any'
            {...register(`${name}_ALPHA`)}
            onKeyDown={handleOnChangeInput}
            onBlur={handleOnChangeInput}
          ></input>
        </div>
        
        <div className="mt-2 all-in-one-container" style={{ width: '100%', height: '800px'}}>
          <AllInOne isReport={false} height={700}></AllInOne>
        </div>


        <span className="mt-1"></span>

        <div className="switch-container-2 mt-2">
          <h3 className="field-title me-2 mt-3"> Station Number</h3>
          <input className="input-field-little mt-3" type="number" {...register(`${name}_STATIONS_NUMBER`)} id="stations-number"
            onKeyDown={handleOnChangeInput}
            onBlur={handleOnChangeInput}
          ></input>
        </div>

        <div className="switch-container-2 mt-1 ">
          <h3 className="field-title"> Show Vel.std </h3>
          <label className="switch">
            <input type="checkbox" {...register(`${name}_SHOW_VELOCITY_STD`)} defaultChecked={data?.showVelocityStd} onChange={handleOnChange} id="show-velocity-std"/>
            <span className="slider"></span>
          </label>
        </div>

        <div className="switch-container-2 mt-1 ">
          <h3 className="field-title"> Show 5% | 95% </h3>
          <label className="switch">
            <input type="checkbox" {...register(`${name}_SHOW_95_PERCENTILE`)} defaultChecked={data?.show95Percentile} onChange={handleOnChange} id="show-95-percentile"/>
            <span className="slider"></span>
          </label>
        </div>

        <div className="switch-container-2 mt-1 ">
          <h3 className="field-title"> Interpolate profile </h3>
          <label className="switch">
            <input type="checkbox" {...register(`${name}_INTERPOLATED_PROFILE`)} defaultChecked={data?.showInterpolateProfile} id="interpolated-profile" onChange={handleOnChange}/>
            <span className="slider"></span>
          </label>
        </div>

        <Grid></Grid>

        <button type="button" 
                className="form-button wizard-button" 
                onClick={() => onGetResultData('single')}
                id="apply-changes"
                > Aply changes</button>
        <span className="space3 mt-2"></span>
      </form>
   </div>
  )
}
