import { useFormContext } from "react-hook-form"
import { useDataSlice } from "../../hooks"

export const HardModeProcessing = () => {
  const { register } = useFormContext() 
  const { processing, onUpdateProcessing, onReCalculateMask } = useDataSlice()
  const { medianTestFiltering, clahe, stdFiltering, heightRoi } = processing.form

  const handleHeightRoiInput = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if((event as React.KeyboardEvent<HTMLInputElement>).key === "Enter" || event.type === "blur"){
          event.preventDefault()
          const value = parseInt((event.target as HTMLInputElement).value)
          if ( value !== heightRoi){
            onReCalculateMask(value)
            onUpdateProcessing({heightRoi: value})
            document.getElementById('processing-HEADER')?.focus()
          }
          
      }  
  }

  return (
    <div className="hard-mode-processing mt-5" id="processing-HARD_MODE">
        <div className="input-container mb-2">
            <label className="read-only me-1">ROI height</label>
            <input 
              className="input-field" 
              {...register('roi_height')}
              onKeyDown={(event) => handleHeightRoiInput(event)}
              onBlur={(event) => handleHeightRoiInput(event)}
            ></input>
        </div>

        <h2 className="field-title mb-1"> Pre-Processing filtering</h2>

        <div className="switch-container">
          <h3 className="field-title"> Grayscale </h3>
          <label className="switch">
              <input type="checkbox" {...register('grayscale')} onChange={(event) => onUpdateProcessing({grayscale: event.currentTarget.checked})}/>
              <span className="slider"></span>
          </label>
        </div>
        
        <div className="switch-container mt-1">
          <h3 className="field-title"> Remove background </h3>
          <label className="switch">
              <input type="checkbox" {...register('remove_background')} onChange={(event) => onUpdateProcessing({removeBackground: event.currentTarget.checked})}/>
              <span className="slider"></span>
          </label>
        </div>
        <div className="switch-container mt-1">
          <h3 className="field-title"> CLAHE </h3>
          <label className="switch">
              <input 
                type="checkbox" 
                {...register('clahe')}
                onChange={(event) => onUpdateProcessing({clahe: event.currentTarget.checked})}
                />
              <span className="slider"></span>
          </label>
        </div>
        <div className="switch-container mt-1">
          <h3 className="field-title"> Clip Limit </h3>
          <input className="input-field-little" type="number "{...register('clip_limit')} disabled={!clahe} onChange={(event) => onUpdateProcessing({clipLimit: event.currentTarget.value})}></input>
        </div>

        <h2 className="field-title mt-2"> Post-processing filtering </h2>
        
        <div className="switch-container mt-1">
          <h3 className="field-title"> Std filtering </h3>
          <label className="switch">
              <input 
                type="checkbox" 
                {...register('std_filtering')}
                onChange={(event) => onUpdateProcessing({stdFiltering: event.currentTarget.checked})}
                />
              <span className="slider"></span>
          </label>
        </div>
        <div className="switch-container mt-1">
          <h3 className="field-title"> Threshold </h3>
          <input className="input-field-little" type="number" {...register('std_threshold')} disabled={!stdFiltering}></input>
        </div>
        <div className="switch-container mt-1">
          <h3 className="field-title"> Median test filtering </h3>
          <label className="switch">
              <input 
                type="checkbox" 
                {...register('median_test')}
                onChange={(event) => onUpdateProcessing({medianTestFiltering: event.currentTarget.checked})}
                />
              <span className="slider"></span>
          </label>
        </div>
        <div className="switch-container mt-1">
          <h3 className="field-title"> Epsilon </h3>
          <input className="input-field-little" type="number" step='0.01' {...register('median_epsilon')} disabled={!medianTestFiltering} onChange={(event) => onUpdateProcessing({medianTestEpsilon: event.currentTarget.value})}/>
        </div>
        <div className="switch-container mt-1">
          <h3 className="field-title"> Threshold </h3>
          <input className="input-field-little" type="number" {...register('median_threshold')} disabled={!medianTestFiltering} onChange={(event) => onUpdateProcessing({medianTestThreshold: event.currentTarget.value})}/>
        </div>
    </div>
  )
}
