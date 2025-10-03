import { WizardButtons } from '../components/WizzardButtons.js';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useWizard } from 'react-use-wizard';
import { useProjectSlice } from '../hooks/index.js';
import { Icon } from '../components/Icon.js';
import { useState } from 'react';
import { OperationCanceledError, UserSelectionError } from '../errors/errors.js';
import { drone, ipcam, oblique } from '../assets/icons/icons';
import './pages.css';
import { handleDragLeave, handleDragOver } from '../helpers/index.js';

type Video = {
  name: string;
  path: string;
  type: string;
};

const footageTypes = [
  { id: 'uav', icon: drone },
  { id: 'oblique', icon: oblique },
  { id: 'ipcam', icon: ipcam },
];

export const FootageMode = () => {
  const { handleSubmit } = useForm();
  const { onInitProject, onGetVideo } = useProjectSlice();
  const { nextStep, previousStep } = useWizard();
  const formId = 'form-step-2';
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const [error, setError] = useState<string>('');
  const [video, setVideo] = useState<Video | null>(null);

  const [dragOver, setDragOver] = useState<string | null>(null);
  const [footageType, setFootageType] = useState<string | null>(null);

  const onSubmit = async () => {
    if (video) {
      try {
        await onInitProject(video, currentLanguage);
        nextStep();
      } catch (error) {
        if (error instanceof OperationCanceledError) previousStep();
      }
    }
  };

  const onClickOpenFolder = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    try {
      const { path, name } = await onGetVideo();
      setVideo({ name, path, type: footageType as string });
    } catch (error) {
      if (error instanceof UserSelectionError) {
        setVideo(null);
        setError(t('Step-2.pleaseSelectVideo', { defaultValue: 'Commons.randomError' }));
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleDrop = (type: string) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(null);
    const files = event.dataTransfer.files;

    setFootageType(type);

    if (files.length > 0) {
      const file = files[0];

      if (file.type.includes('video')) {
        const path = window.webUtils.getPathForFile(file);
        setVideo({ name: file.name, path, type });
      } else {
        setVideo(null);
        setError(t('Step-2.invalidFileType', { defaultValue: 'Commons.randomError' }));
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const onChangeType = () => {
    setVideo(null);
    setFootageType(null);
  };

  return (
    <div className="default-app-container">
      <h2 className="step-2-title">{t('Step-2.title')}</h2>
      <form className="file-upload-container" onSubmit={handleSubmit(onSubmit)} id={formId}>
        <div className="type-footage-container">
          {footageTypes.map(({ id, icon }) => (
            <div
              key={id}
              className={`footage-button-container ${dragOver === id ? `drag-over-${id}` : ''} ${footageType === id ? 'selected-footage-type' : ''}`}
              onDragOver={(event) => handleDragOver(event, setDragOver, id)}
              onDragLeave={(event) => handleDragLeave(event, setDragOver, true)}
              onDrop={handleDrop(id)}
              onClick={() => setFootageType(id)}
              id={id}
            >
              <Icon path={icon} />
            </div>
          ))}
        </div>
        <div className={`browse-video-container${footageType || video ? ' visible' : ''}`}>
          <div className="browse-video-header">
            {
              footageType !== null 
              ? 
                <>
                  <p>{ footageType && video === null ? t(`Step-2.addYourFootage`) : '' }</p>
                  <p onClick={() => onChangeType()}>{ footageType ? t(`Step-2.changeType`): undefined} </p>
                </>
              :
              <></>
            }
          </div>
          <div
            className={`browse-video-drop-area${dragOver === 'drop-area' ? ' drag-over' : ''}`}
            onDragOver={(event) => handleDragOver(event, setDragOver, 'drop-area')}
            onDragLeave={(event) => handleDragLeave(event, setDragOver, true)}
            onDrop={handleDrop(footageType as string)}
            id="drop-area"
          >
            {video === null && <p> {t('Step-2.dragAndDrop')}</p>}
            {video && <p>{video.name}</p>}

            <button
              className={`button-1 ${video ? 'wizard-button-active' : ''}`}
              onClick={onClickOpenFolder}
              type="button"
            >
              {' '}
              {t('Step-2.openFolders')}{' '}
            </button>
          </div>
        </div>
      </form>
      {error && <p className="file-name mt-2">{error}</p>}
      <WizardButtons canFollow={true} formId={formId} />
    </div>
  );
};
