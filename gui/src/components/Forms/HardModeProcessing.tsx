import { useState } from "react"
import { useFormContext } from "react-hook-form"

export const HardModeProcessing = () => {
  const { register } = useFormContext()
  const [claheDisabled, setClaheDisabled] = useState(false)
  const [stdDisabled, setStdDisabled] = useState(false)
  const [medianDisabled, setMedianDisabled] = useState(false)

  return (
    <div className="hard-mode-processing mt-5" id="processing-HARD_MODE">
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
        
        <div className="switch-container mt-1">
          <h3 className="field-title"> Remove background </h3>
          <label className="switch">
              <input type="checkbox" {...register('remove_background')}/>
              <span className="slider"></span>
          </label>
        </div>
        <div className="switch-container mt-1">
          <h3 className="field-title"> CLAHE </h3>
          <label className="switch">
              <input 
                type="checkbox" 
                {...register('clahe')}
                onChange={() => setClaheDisabled(!claheDisabled)}
                />
              <span className="slider"></span>
          </label>
        </div>
        <div className="switch-container mt-1">
          <h3 className="field-title"> Clip Limit </h3>
          <input className="input-field-little" {...register('clip_limit')} disabled={claheDisabled}></input>
        </div>

        <h2 className="field-title mt-2"> Post-processing filtering </h2>
        
        <div className="switch-container mt-1">
          <h3 className="field-title"> Std filtering </h3>
          <label className="switch">
              <input 
                type="checkbox" 
                {...register('std_filtering')}
                onChange={() => setStdDisabled(!stdDisabled)}/>
              <span className="slider"></span>
          </label>
        </div>
        <div className="switch-container mt-1">
          <h3 className="field-title"> Threshold </h3>
          <input className="input-field-little" {...register('std_threshold')} disabled={stdDisabled}></input>
        </div>
        <div className="switch-container mt-1">
          <h3 className="field-title"> Median test filtering </h3>
          <label className="switch">
              <input 
                type="checkbox" 
                {...register('median_test')}
                onChange={() => setMedianDisabled(!medianDisabled)}
                />
              <span className="slider"></span>
          </label>
        </div>
        <div className="switch-container mt-1">
          <h3 className="field-title"> Epsilon </h3>
          <input className="input-field-little" {...register('median_epsilon')} disabled={medianDisabled}></input>
        </div>
        <div className="switch-container mt-1">
          <h3 className="field-title"> Threshold </h3>
          <input className="input-field-little" {...register('median_threshold')} disabled={medianDisabled}></input>
        </div>
    </div>
  )
}
