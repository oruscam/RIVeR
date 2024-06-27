import { WizardButtons } from '../components/WizzardButtons.js';
import { useTranslation } from 'react-i18next';
import { useForm, FieldValues } from 'react-hook-form';
import { useWizard } from 'react-use-wizard';
import { Icon } from '../components/Icon.js';
import { drone, ipcam } from '../assets/icons/icons.js';
import './pages.css';
import { useDataSlice } from '../hooks/useDataSlice.js';

export const Step2 = () => {
    const { handleSubmit, register, watch } = useForm();
    const { onSetVideoData } = useDataSlice();
    const { nextStep } = useWizard();
    const formId = 'form-step-2';
    const { t } = useTranslation();
    const watchDrone = watch("droneFile");

    const onSubmit = async (data: FieldValues) => {
        if (data.droneFile) {
            console.log(data.droneFile[0])
            await onSetVideoData(data.droneFile[0], 'uav');
            nextStep();
        }
    };

    return (
        <div className='App'>
            <h2 className='step-2-title'> {t("Step-2.title")} </h2>
            <form className='file-upload-container' onSubmit={handleSubmit(onSubmit)} id={formId}>
                <input
                    type="file"
                    className="hidden-file-input"
                    id='drone-input'
                    accept='video/.mp4, video/.avi, video/.mov, video/*'
                    {...register("droneFile", { required: "Se debe cargar un archivo" })}
                />
                <label htmlFor='drone-input' className='drone-upload'>
                    <Icon path={drone}></Icon>
                </label>
                <input type="file" className="hidden-file-input" id='camera-input' disabled />
                <label htmlFor='camera-input' className='camera-upload'>
                    <Icon path={ipcam}></Icon>
                </label>
            </form>
            {
                watchDrone !== undefined && watchDrone.length !== 0 ? <p className='file-name'> {watchDrone[0].name} </p> : null
            }
            <WizardButtons canFollow={watchDrone?.length !== 0 && undefined !== watchDrone?.length} formId={formId}></WizardButtons>
        </div>
    );
}
