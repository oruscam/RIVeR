import { useFormContext } from "react-hook-form";
import { useSectionSlice } from "../../hooks";
import { Bathimetry } from "../Graphs"
import { VelocityAndDischarge } from "../Graphs/VelocityAndDischarge"
import { Grid } from "../index"

interface FormResultProps {
  onSubmit: (data: React.SyntheticEvent<HTMLFormElement, Event>) => void,
  index: number,
}

export const FormResults = ({ onSubmit, index } : FormResultProps) => {
  const { register, getValues } = useFormContext();
  const { sections, activeSection } = useSectionSlice();
  const { name, data } = sections[activeSection]
  

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
          <label className="read-only me-1" htmlFor="result-STEP_1"> Alpha </label>
          <input className="input-field"
            id="result-STEP_1"
            type="number"
            step='any'
            {...register(`${name}_ALPHA`)}
          ></input>
        </div>

        <VelocityAndDischarge></VelocityAndDischarge>
        <Bathimetry lineColor="white" showLeftBank={false} ></Bathimetry>


        <span className="mt-1"></span>

        <div className="switch-container-2 mt-2">
          <h3 className="field-title me-2 mt-3"> Station Number</h3>
            
            <input className="input-field-little mt-3" {...register(`${name}_STATIONS_NUMBER`)}></input>
        </div>

        <div className="switch-container-2 mt-1 ">
          <h3 className="field-title"> Show Vel.std </h3>
          <label className="switch">
            <input type="checkbox" {...register(`${name}_SHOW_VELOCITY_STD`)} defaultChecked={getValues(`${name}_SHOW_VELOCITY_STD`)}/>
            <span className="slider"></span>
          </label>
        </div>

        <div className="switch-container-2 mt-1 ">
          <h3 className="field-title"> Show 5% | 95% </h3>
          <label className="switch">
            <input type="checkbox" {...register(`${name}_SHOW_95_PERCENTILE`)} defaultChecked={getValues(`${name}_SHOW_95_PERCENTILE`)}/>
            <span className="slider"></span>
          </label>
        </div>

        <div className="switch-container-2 mt-1 ">
          <h3 className="field-title"> Interpolate profile </h3>
          <label className="switch">
            <input type="checkbox" {...register(`${name}_SHOW_INTERPOLATE_PROFILE`)} defaultChecked={getValues(`${name}_SHOW_INTERPOLATE_PROFILE`)}/>
            <span className="slider"></span>
          </label>
        </div>

        

        <Grid></Grid>
        <span className="space3 mt-2"></span>
      </form>
   </div>
  )
}
