
export const HardModeProcessing = () => {
  return (
    <div className="hard-mode hard-mode-processing" id="processing-HARD_MODE">
        <div className="input-container">
            <label className="read-only me-1">ROI height</label>
            <input className="input-field"></input>

        </div>
        <h2 className="field-title"> Remove background </h2>
        <label className="switch">
            <input type="checkbox" />
            <span className="slider"></span>
        </label>

        <h2 className="field-title"> CLAHE </h2>
        <label className="switch">
            <input type="checkbox"/>
            <span className="slider"></span>
        </label>
        <span className="space3"></span>


    </div>
  )
}
