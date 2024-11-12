import './form.css'
import { useDataSlice } from '../../hooks'
import { useTranslation } from 'react-i18next'

export const FormAnalizing = () => {
    const { onSetQuiverAll, isBackendWorking, onKillBackend } = useDataSlice()
    const { t } = useTranslation()

    const handleAnalize = () => {
        onSetQuiverAll();
    }

    const handleStop = async() => {
        await onKillBackend();
    }

  return (
    <>
        <h1 className="form-title"> {t('Analizing.title')} </h1>
        <div className="form-base-2 mt-4" id='form-analizing'>
            <div className='input-container-2' id='analize-div'>
                <button className={`button-with-loader form-button ms-2 ${isBackendWorking ? 'button-with-loader-active' : ''}`}
                onClick={handleAnalize}
                >
                    <p className='button-name'> {t('Analizing.analize')} </p>
                    {
                        isBackendWorking && <span className='loader-little'></span>
                    }
                </button>
                <span className='read-only bg-transparent'></span>
            </div>
            <button id='stop-analize' className={`danger-button  'danger-button-active' : ''}`} onClick={handleStop} disabled={!isBackendWorking}> {t('Analizing.stop')} </button>
        </div>
    </>
  )
}
