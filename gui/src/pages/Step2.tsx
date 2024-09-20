import { WizardButtons } from '../components/WizzardButtons.js';
import { useTranslation } from 'react-i18next';
import { useForm, FieldValues } from 'react-hook-form';
import { useWizard } from 'react-use-wizard';
import { useProjectSlice } from '../hooks/index.js';
import { Icon } from '../components/Icon.js';
import { drone, ipcam } from '../assets/icons/icons.js';
import './pages.css';
import { useState } from 'react';
import { OperationCanceledError, UserSelectionError } from '../errors/errors.js';
import { setTime } from 'react-datepicker/dist/date_utils.js';

type Video = {
    name: string;
    path: string;
    type: string;
}

export const Step2 = () => {
    const { handleSubmit } = useForm();
    const { onInitProject, onGetVideo } = useProjectSlice();
    const { nextStep, previousStep } = useWizard();
    const formId = 'form-step-2';
    const { t } = useTranslation();
    const [ error, setError ] = useState<string>('');

    const [ video, setVideo ] = useState<Video>();

    const onSubmit = async (data: FieldValues) => {
        if (video) {
            try {
                await onInitProject(video);
                nextStep();
            } catch (error){
                if (error instanceof OperationCanceledError){
                    previousStep();
                }
            }
        }
    };

    const onClickDrone = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        try {
            const { path, name } = await onGetVideo();
            setVideo({name, path, type: 'uav'});
            
        } catch (error) {
            console.log(error instanceof UserSelectionError )
            if ( error instanceof UserSelectionError ){
                console.log('if')
                setError(error.message);
                setTimeout(() => {
                    setError('');
                }, 3000);
            }
        }
    }

    return (
        <div className='App'>
            <h2 className='step-2-title'> {t("Step-2.title")} </h2>
            <form className='file-upload-container' onSubmit={handleSubmit(onSubmit)} id={formId}>
                <button className='button-transparent' onClick={onClickDrone}>
                    <Icon path={drone}></Icon>
                </button>
                <Icon path={ipcam}></Icon>
            </form>
            {
                video !== undefined ? <p className='file-name'> {video.name} </p> : null
            }
            {
                error !== '' ? <p className='file-name'> {error} </p> : null
            }
            {/* <WizardButtons canFollow={watchDrone?.length !== 0 && undefined !== watchDrone?.length} formId={formId}></WizardButtons> */}
            <WizardButtons canFollow={true} formId={formId}></WizardButtons>
        </div>
    );
}
