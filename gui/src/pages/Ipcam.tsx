import { useWizard } from 'react-use-wizard';
import { FormIpcam } from '../components/Forms/FormIpcam.tsx';
import { Carousel, Error, ImageIpcam, Progress, WizardButtons } from '../components/index';
import { useState } from 'react';
import { handleDragLeave, handleDragOver } from '../helpers/handleDragEvents.ts';
import { useUiSlice } from '../hooks/useUiSlice.ts';
import { useIpcamSlice } from '../hooks/index';

export const Ipcam = () => {
  const { importedImages, cameraSolution, activeImage, onChangeActiveImage, onGetPoints, onGetImages } =
    useIpcamSlice();
  const { onSetErrorMessage } = useUiSlice();
  const { nextStep } = useWizard();

  const [dragOver, setDragOver] = useState<boolean>(false);

  const handleOnClickNext = () => {
    nextStep();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);

    const files = event.dataTransfer.files;

    if (files.length > 0) {
      const file = files[0];
      const path = window.webUtils.getPathForFile(file);

      if (!file.type) {
        onGetImages(path).catch((error) => {
          onSetErrorMessage(error.message);
        });
      } else {
        onGetPoints(path).catch((error) => {
          onSetErrorMessage(error.message);
        });
      }
    }
  };

  return (
    <div className="regular-page">
      <div className="media-container">
        <ImageIpcam />
        {importedImages !== null && (
          <Carousel
            images={importedImages}
            active={activeImage!}
            setActiveImage={onChangeActiveImage}
            mode="ipcam"
          />
        )}
        <Error />
      </div>
      <div
        className={`form-container ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => handleDragOver(e, setDragOver)}
        onDragLeave={(e) => handleDragLeave(e, setDragOver, false)}
        onDrop={handleDrop}
      >
        <Progress />
        <FormIpcam />
        <WizardButtons canFollow={cameraSolution !== null} onClickNext={handleOnClickNext} />
      </div>
    </div>
  );
};
