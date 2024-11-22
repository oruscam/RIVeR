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
        const stderrPercentage = document.getElementById('stderr-output-percentage');
        const stderrStats = document.getElementById('stderr-output-stats');

        if ( stderrPercentage && stderrStats ) {
            stderrPercentage.textContent = '';
            stderrStats.textContent = '';
        }

        await onKillBackend();
    }

    window.ipcRenderer.on('python-stderr', (_event, data) => {
        const stderrPercentage = document.getElementById('stderr-output-percentage');
        const stderrStats = document.getElementById('stderr-output-stats');
        const stderrRemaining = document.getElementById('stderr-output-remaining');

        if (stderrPercentage && stderrStats && stderrRemaining) {
            const parts = data.split(/(%|(?<=30) |(?=\[))/);
            stderrPercentage.textContent = parts[0] + parts[1]; // "Processing chunks: 100%"
            stderrStats.textContent = parts[2] + parts[3]; // "|██████████| 30/30 "
            stderrRemaining.textContent = parts[4] + parts[5];
        }
    });

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
            <div id='stderr-output' className='analizing-output'>
                <p id='stderr-output-percentage'/>
                <p id='stderr-output-stats'/>
                <p id='stderr-output-remaining'/>
            </div>
            <button id='stop-analize' className={`danger-button  'danger-button-active' : ''}`} onClick={handleStop} disabled={!isBackendWorking}> {t('Analizing.stop')} </button>
        </div>
    </>
  )
}
