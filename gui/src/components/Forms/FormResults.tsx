import { Bathimetry, Discharge, Velocity } from "../Graphs"
import { AllInOne } from "../Graphs/AllInOne"
import { Grid } from "../index"

export const FormResults = () => {
  return (
    <div className="form-result">
      <div id="result-info">
        <p id="result-number">39.3</p>
        <div>
          <p id="result-measured"> 97% Measured</p>
          <p> 3% Interpolated</p>
        </div>
      </div>

      <div className="input-container mt-2">
        <label className="read-only me-1" htmlFor="result-STEP_1"> Alpha </label>
        <input className="input-field"
          id="result-STEP_1"
          type="number"
          defaultValue={0.85}
        ></input>
      </div>

      {/* <Discharge></Discharge> */}
      {/* <Velocity></Velocity> */}
      {/* <Bathimetry></Bathimetry> */}
      <AllInOne></AllInOne>


      <span className="mt-1"></span>

      <div className="switch-container-2 mt-5">
        <h3 className="field-title me-2 mt-3"> Station Number</h3>
        <input className="input-field-little mt-3" defaultValue={15}></input>
      </div>

      <div className="switch-container-2 mt-1 ">
        <h3 className="field-title"> Show Vel.std </h3>
        <label className="switch">
          <input type="checkbox" defaultChecked />
          <span className="slider"></span>
        </label>
      </div>
      <div className="switch-container-2 mt-1 ">
        <h3 className="field-title"> Interpolate profile </h3>
        <label className="switch">
          <input type="checkbox" defaultChecked />
          <span className="slider"></span>
        </label>
      </div>

      <Grid></Grid>
      <span className="space3 mt-5"></span>
      <span className="space3 mt-5"></span>
      <span className="space3 mt-5"></span>


    </div>
  )
}
