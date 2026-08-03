import { useWizard } from 'react-use-wizard';
import { FormIpcam } from '../components/Forms/FormIpcam.tsx';
import { Carousel, Error, FocusOverlay, Warning, WizardButtons } from '../components/index';
import { useEffect, useState } from 'react';
import { handleDragLeave, handleDragOver } from '../helpers/handleDragEvents.ts';
import { useUiSlice } from '../hooks/useUiSlice.ts';
import { useIpcamSlice } from '../hooks/index';
import { useTranslation } from 'react-i18next';
import { FormHeader } from '../components/Forms/Components/FormHeader.tsx';
import { ImageIpcam } from '../components/index.ts';
export const Ipcam = () => {
  const {
    importedImages,
    cameraSolution,
    activeImage,
    activePoint,
    isDraggingPoint,
    points,
    onChangeActiveImage,
    onGetPoints,
    onGetImages,
  } = useIpcamSlice();
  const { onSetErrorMessage, onSetWarningMessage, onClearWarningMessage } = useUiSlice();
  const { t } = useTranslation();
  const { nextStep } = useWizard();

  const [dragOver, setDragOver] = useState<boolean>(false);

  const handleOnClickNext = () => {
    nextStep();
  };

  // Persistent yellow "moving CP#" status while a control point is being dragged on the canvas.
  useEffect(() => {
    if (!isDraggingPoint || activePoint === null || points === null) {
      onClearWarningMessage();
      return;
    }

    onSetWarningMessage(
      t('ControlPoints3d.movingPointWarning', {
        defaultValue: 'Moving {{label}}',
        label: points[activePoint]?.label,
      })
    );

    return () => {
      onClearWarningMessage();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraggingPoint, activePoint, points]);

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
        <div className="message-stack">
          <Error />
          <Warning />
        </div>
      </div>
      <div
        className={`form-container ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => handleDragOver(e, setDragOver)}
        onDragLeave={(e) => handleDragLeave(e, setDragOver, false)}
        onDrop={handleDrop}
      >
        <FormHeader title={t('ControlPoints.title')} showSections={false} />
        <FormIpcam />
        <div className="footer">
          <WizardButtons canFollow={cameraSolution !== null} onClickNext={handleOnClickNext} />
        </div>
        <FocusOverlay active={isDraggingPoint} />
      </div>
    </div>
  );
};
