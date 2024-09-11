import { WizardButtons } from '../components/WizzardButtons.js';
import { useTranslation } from 'react-i18next';
import { useForm, FieldValues } from 'react-hook-form';
import { useWizard } from 'react-use-wizard';
import { useProjectSlice } from '../hooks/index.js';
import { Icon } from '../components/Icon.js';
import { drone, ipcam } from '../assets/icons/icons.js';
import './pages.css';
import { useState } from 'react';

type Video = {
    name: string;
    path: string;
    type: string;
}

export const Step2 = () => {
    const { handleSubmit, register, watch } = useForm();
    const { onInitProject, onGetVideo } = useProjectSlice();
    const { nextStep } = useWizard();
    const formId = 'form-step-2';
    const { t } = useTranslation();

    const [ video, setVideo ] = useState<Video>();

    const onSubmit = async (data: FieldValues) => {
        if (video) {
            try {
                await onInitProject(video);
                nextStep();
            } catch (error){
                console.log("intentalo de nuevo")
            }
        }
    };

    const onClickDrone = async () => {
        const { path, name } = await onGetVideo();
        setVideo({name, path, type: 'uav'});
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
            {/* <WizardButtons canFollow={watchDrone?.length !== 0 && undefined !== watchDrone?.length} formId={formId}></WizardButtons> */}
            <WizardButtons canFollow={true} formId={formId}></WizardButtons>
        </div>
    );
}
