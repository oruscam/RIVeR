import './form.css'
import { useDataSlice } from '../../hooks'
import { useState } from 'react'

export const FormAnalizing = () => {
    const { onSetQuiverAll, processing, onKillBackend } = useDataSlice()
    const [ showMessage, setShowMessage ] = useState(false)

    const handleAnalize = () => {
        onSetQuiverAll();
    }

    const handleStop = async() => {
        const state = await onKillBackend();
        if(state){
            setShowMessage(true)
            setTimeout(() => {
                setShowMessage(false)
            }, 3000)
        }
    }

  return (
    <>
        <h1 className="form-title"> Analizing </h1>
        <div className="form-base-2 mt-2">
            <div className='input-container-2'>
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
            { showMessage && <h4 id='analize-message' className='mt-3'> piv analysis was successfully canceled</h4>}
            <button id='stop-analize' className={`danger-button  'danger-button-active' : ''}`} onClick={handleStop}> Stop</button>
        </div>
    </>
  )
}
