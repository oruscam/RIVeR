import { useFormContext } from "react-hook-form"

export const HardModeProcessing = () => {
  const { register } = useFormContext()

  return (
    <div className="hard-mode hard-mode-processing mt-5" id="processing-HARD_MODE">
        <div className="input-container mb-2">
            <label className="read-only me-1">ROI height</label>
            <input className="input-field" {...register('roi_height')}></input>
        </div>
        <h2 className="field-title mb-1"> Pre-Processing filtering</h2>
        <div className="switch-container">
          <h3 className="field-title"> Grayscale </h3>
          <label className="switch">
              <input type="checkbox" {...register('grayscale')} />
              <span className="slider"></span>
          </label>
        </div>
        <div className="switch-container">
          <h3 className="field-title"> Remove background </h3>
          <label className="switch">
              <input type="checkbox" {...register('remove_background')}/>
              <span className="slider"></span>
          </label>
        </div>
        <div className="switch-container">
          <h3 className="field-title"> CLAHE </h3>
          <label className="switch">
              <input type="checkbox" {...register('clahe')}/>
              <span className="slider"></span>
          </label>
        </div>
        <div className="switch-container">
          <h3 className="field-title"> Clip Limit </h3>
          <input className="input-field-little" {...register('clip_limit')} disabled={false}></input>
        </div>

        <h2 className="field-title mt-2"> Post-processing filtering </h2>
        <div className="switch-container">
          <h3 className="field-title"> Std filtering </h3>
          <label className="switch">
              <input type="checkbox" {...register('std_filtering')}/>
              <span className="slider"></span>
          </label>
        </div>
        <div className="switch-container">
          <h3 className="field-title"> Threshold </h3>
          <input className="input-field-little {...register('threshold_1')}"></input>
        </div>
        <div className="switch-container">
          <h3 className="field-title"> Median test filtering </h3>
          <label className="switch">
              <input type="checkbox" {...register('median_test')}/>
              <span className="slider"></span>
          </label>
        </div>
        <div className="switch-container">
          <h3 className="field-title"> Epsilon </h3>
          <input className="input-field-little" {...register('epsilon')}></input>
        </div>
        <div className="switch-container">
          <h3 className="field-title"> Threshold </h3>
          <input className="input-field-little" {...register('threshold_1')}></input>
        </div>
        {/* <span className="space3"></span> */}


    </div>
  )
}
