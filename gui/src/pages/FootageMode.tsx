import { WizardButtons } from '../components/WizzardButtons.js';
import { useTranslation } from 'react-i18next';
import { useForm, FieldValues } from 'react-hook-form';
import { useWizard } from 'react-use-wizard';
import { useProjectSlice } from '../hooks/index.js';
import { Icon } from '../components/Icon.js';
import { useState } from 'react';
import { OperationCanceledError, UserSelectionError } from '../errors/errors.js';
import { drone, ipcam, oblique } from '../assets/icons/icons';
import './pages.css';

type Video = {
    name: string;
    path: string;
    type: string;
}

export const FootageMode = () => {
    const { handleSubmit } = useForm();
    const { onInitProject, onGetVideo } = useProjectSlice();
    const { nextStep, previousStep } = useWizard();
    const formId = 'form-step-2';
    const { t } = useTranslation();
    const [ error, setError ] = useState<string>('');

    const [ video, setVideo ] = useState<Video>();

    const onSubmit = async (_data: FieldValues) => {
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

    const onClickItem = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const type = event.currentTarget.id;
        if (type !== 'uav' && type !== 'oblique' && type !== 'ipcam') return;
        try {
            const { path, name } = await onGetVideo();
            setVideo({ name, path, type });
        } catch (error) {
            if ( error instanceof UserSelectionError ){
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
                <button className='button-transparent' onClick={onClickItem} id='uav'>
                    <Icon path={drone}/>
                </button>
                <button className='button-transparent' id='oblique' onClick={onClickItem}>
                    <Icon path={oblique}/>
                </button>
                <button className='button-transparent' id='ipcam' onClick={onClickItem}>
                    <Icon path={ipcam}/>
                </button>
            </form>
            { video && <p className='file-name mt-2'>{video.name}</p> }
            { error && <p className='file-name mt-2'>{error}</p> }
            <WizardButtons canFollow={true} formId={formId}></WizardButtons>
        </div>
    );
}
