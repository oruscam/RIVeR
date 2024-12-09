import './form.css'
import { useDataSlice } from '../../hooks'
import { useTranslation } from 'react-i18next'
import { Loading } from '../Loading'
import React from 'react'

export const FormAnalizing = () => {
    const { onSetQuiverAll, isBackendWorking, onKillBackend } = useDataSlice()
    const { t } = useTranslation()

    const [ percentage, setPercentage ] = React.useState<string>('');
    const [ time, setTime ] = React.useState<string>('');

    const handleAnalize = () => {
        if (isBackendWorking) return;
        setPercentage('');
        setTime('');
        onSetQuiverAll();
    }

    const handleStop = async() => {
        setPercentage('');
        setTime('');
        await onKillBackend();
    }

    window.ipcRenderer.on('river-cli-message', (_event, text) => {
        // Expresión regular para extraer el porcentaje
        const percentageMatch = text.match(/(\d+%)\|/);
        const newPercentage = percentageMatch ? percentageMatch[1] : '';

        // Expresión regular para extraer el tiempo
        const timeMatch = text.match(/\[(\d{2}:\d{2})<(\d{2}:\d{2})/);
        const time = timeMatch ? timeMatch[2] : '';

        if ( newPercentage !== percentage ){
            setPercentage(newPercentage);
        }
        setTime('Remaining time: ' + time);
    });


  return (
    <>
        <h1 className="form-title"> {t('Analizing.title')} </h1>
        <div className="form-base-2 mt-4" id='form-analizing'>
            <div className='input-container-2' id='analize-div'>
                <button className={`wizard-button form-button ${isBackendWorking ? 'wizard-button-active' : ''}`}
                onClick={handleAnalize}>
                    {t('Analizing.analize')}
                </button>
            </div>
            <div className='analizing-output'>
                {
                    percentage !== '' && isBackendWorking && <Loading percentage={percentage} time={time} size={'big'} isComplete={ percentage === '100%'}/>
                }
            </div>
            <button id='stop-analize' className={`danger-button  'danger-button-active' : ''}`} onClick={handleStop} disabled={!isBackendWorking}> {t('Analizing.stop')} </button>
        </div>
    </>
  )
}
