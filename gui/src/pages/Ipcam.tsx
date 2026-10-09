import { useWizard } from 'react-use-wizard';
import { FormIpcam } from '../components/Forms/FormIpcam.tsx';
import { Carousel, ModeHint, StepAlertList, Toast, FocusOverlay, WizardButtons } from '../components/index';
import { useEffect, useState } from 'react';
import { handleDragLeave, handleDragOver } from '../helpers/handleDragEvents.ts';
import { useUiSlice } from '../hooks/useUiSlice.ts';
import { useGlobalSlice, useIpcamSlice, useProjectIssues } from '../hooks/index';
import { canSolve, solveMethodOf, SolveMethod } from '../helpers/ipcamSolve';
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
    selectedCounter,
    onChangeActiveImage,
    onGetPoints,
    onGetImages,
    onGetCameraSolution,
  } = useIpcamSlice();
  const { isBackendWorking } = useGlobalSlice();
  const { onAddStepAlert, onClearStepAlert, onSetModeHint, onClearModeHint } = useUiSlice();
  const { t } = useTranslation();
  const { alerts, onAction } = useProjectIssues('ipcam');
  const { nextStep } = useWizard();

  const [dragOver, setDragOver] = useState<boolean>(false);
  const [method, setMethod] = useState<SolveMethod>(() => solveMethodOf(cameraSolution?.mode));

  const solveDisabled = points === null || isBackendWorking || !canSolve(method, selectedCounter);

  const handleOnClickSolve = () => {
    onClearStepAlert('ipcam-camera-solution');
    onGetCameraSolution(method).catch((error) => {
      onAddStepAlert('ipcam-camera-solution', 'error', error.message);
    });
  };

  const handleOnClickNext = () => {
    nextStep();
  };

  // Persistent yellow "moving CP#" status while a control point is being dragged on the canvas.
  useEffect(() => {
    if (!isDraggingPoint || activePoint === null || points === null) {
      onClearModeHint();
      return;
    }

    onSetModeHint(
      t('ControlPoints3d.movingPointWarning', {
        defaultValue: 'Moving {{label}}',
        label: points[activePoint]?.label,
      })
    );

    return () => {
      onClearModeHint();
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
        onClearStepAlert('ipcam-import-images');
        onGetImages(path).catch((error) => {
          onAddStepAlert('ipcam-import-images', 'error', error.message);
        });
      } else {
        onClearStepAlert('ipcam-import-points');
        onGetPoints(path).catch((error) => {
          onAddStepAlert('ipcam-import-points', 'error', error.message);
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
        <ModeHint />
      </div>
      <div
        className={`form-container ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => handleDragOver(e, setDragOver)}
        onDragLeave={(e) => handleDragLeave(e, setDragOver, false)}
        onDrop={handleDrop}
      >
        <FormHeader title={t('ControlPoints.title')} showSections={false} />
        <StepAlertList extra={alerts} onAction={onAction} />
        <FormIpcam method={method} onMethodChange={setMethod} />
        <div className="footer">
          <div className="processing-run">
            <button
              type="button"
              className="btn btn-lg btn-primary"
              id="solve-ipcam"
              disabled={solveDisabled}
              onClick={handleOnClickSolve}
            >
              {t('Commons.solve')}
            </button>
          </div>
          <WizardButtons canFollow={cameraSolution !== null} onClickNext={handleOnClickNext} />
        </div>
        <FocusOverlay active={isDraggingPoint} />
      </div>
      <Toast />
    </div>
  );
};
