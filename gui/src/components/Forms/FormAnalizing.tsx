import { useState } from 'react'
import './form.css'
import { useDataSlice } from '../../hooks'

export const FormAnalizing = () => {
    const [isAnalizing, setIsAnalizing] = useState(false)
    const { onSetQuiverAll } = useDataSlice()

    const handleAnalize = () => {
        setIsAnalizing(true)
        onSetQuiverAll();
    }

  return (
    <>
        <h1 className="form-title"> Analizing </h1>
        <div className="form-base-2 mt-2">
            <div className='input-container-2'>
                <button className={`button-with-loader ${isAnalizing ? 'button-with-loader-active' : ''}`}
                onClick={handleAnalize}
                >
                    <p className='button-name'> Analize </p>
                    {
                        isAnalizing && <span className='loader-little'></span>
                    }
                </button>
                <span className='read-only bg-transparent'></span>
            </div>
            

            <button id='stop-analize' className={`danger-button  'danger-button-active' : ''}`} onClick={() => setIsAnalizing(false)}> Stop</button>
        </div>
    </>
  )
}
