import './form.css'
import { useDataSlice } from '../../hooks'
import { useState } from 'react'

export const FormAnalizing = () => {
    const { onSetQuiverAll, processing, onKillBackend } = useDataSlice()

    const handleAnalize = () => {
        onSetQuiverAll();
    }

    const handleStop = async() => {
        await onKillBackend();
    }

  return (
    <>
        <h1 className="form-title"> Analizing </h1>
        <div className="form-base-2 mt-4" id='form-analizing'>
            <div className='input-container-2' id='analize-div'>
                <button className={`button-with-loader ${processing.isBackendWorking ? 'button-with-loader-active' : ''}`}
                onClick={handleAnalize}
                >
                    <p className='button-name'> Analize </p>
                    {
                        processing.isBackendWorking && <span className='loader-little'></span>
                    }
                </button>
                <span className='read-only bg-transparent'></span>
            </div>
            <button id='stop-analize' className={`danger-button  'danger-button-active' : ''}`} onClick={handleStop}> Stop</button>
        </div>
    </>
  )
}
