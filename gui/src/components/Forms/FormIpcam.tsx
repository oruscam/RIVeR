import { useTranslation } from 'react-i18next';
import { useAutoShrinkFont, useGlobalSlice, useIpcamSlice, useProjectSlice, useUiSlice } from '../../hooks';
import { UNIT_CONVERSIONS } from '../../constants/constants';
import { PointsMap } from '../Graphs';
import { IpcamGrid } from '../index';
import { useState } from 'react';
import { DropHereText } from './Components/DropHereText';

export const FormIpcam = () => {
  const [mode, setMode] = useState('');
  const {
    onGetPoints,
    onGetImages,
    onGetCameraSolution,
    cameraSolution,
    selectedCounter,
    points,
    imagesPath,
    pointsPath,
  } = useIpcamSlice();
  const { isBackendWorking } = useGlobalSlice();
  const { onAddStepAlert, onClearStepAlert } = useUiSlice();
  const { projectDetails } = useProjectSlice();
  const { t } = useTranslation();

  const importPointsButtonRef = useAutoShrinkFont<HTMLButtonElement>([t]);
  const importImagesButtonRef = useAutoShrinkFont<HTMLButtonElement>([t]);
  const directSolveButtonRef = useAutoShrinkFont<HTMLButtonElement>([t]);
  const optimizeSolutionButtonRef = useAutoShrinkFont<HTMLButtonElement>([t]);

  const isImperial = projectDetails.unitSistem === 'imperial';
  const heightFactor = isImperial ? UNIT_CONVERSIONS.M_TO_FT : 1;

  const handleOnClickImport = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const id = (event.target as HTMLButtonElement).id;
    if (id === 'import-points') {
      onClearStepAlert('ipcam-import-points');
      onGetPoints().catch((error) => onAddStepAlert('ipcam-import-points', 'error', error.message));
    } else {
      onClearStepAlert('ipcam-import-images');
      onGetImages(undefined).catch((error) => onAddStepAlert('ipcam-import-images', 'error', error.message));
    }
  };

  const handleOnClickAction = (event: React.MouseEvent<HTMLButtonElement>) => {
    const id = (event.target as HTMLButtonElement).id;
    setMode(id);
    onClearStepAlert('ipcam-camera-solution');
    onGetCameraSolution(id)
      .catch((error) => {
        onAddStepAlert('ipcam-camera-solution', 'error', error.message);
      })
      .finally(() => {
        setMode('');
      });
  };

  return (
    <div className="body">
      <div className="wrapper">
        <form id="form-control-points" className={`${isBackendWorking ? 'disabled' : ''}`}>
          <div className="input-container-2">
            <button
              ref={importPointsButtonRef}
              className="btn btn-lg btn-secondary form-button me-1"
              data-complete={points !== null}
              id="import-points"
              type="button"
              onClick={handleOnClickImport}
            >
              {' '}
              {t('ControlPoints3d.importPoints')}{' '}
            </button>
            <span className="read-only bg-transparent" />
          </div>
          <div className="input-container-2 mt-1">
            <button
              ref={importImagesButtonRef}
              className="btn btn-lg btn-secondary form-button me-1"
              data-complete={imagesPath !== null}
              id="import-images"
              type="button"
              onClick={handleOnClickImport}
            >
              {' '}
              {t('ControlPoints3d.importImages')}{' '}
            </button>
            <span className="read-only bg-transparent" />
          </div>

          <DropHereText text={t('Commons.dropHereText')} show={pointsPath === null} />

          <IpcamGrid />

          <PointsMap />

          <div className="input-container-2 mt-1">
            <button
              ref={directSolveButtonRef}
              className={`btn btn-lg btn-secondary me-1 button-rectification ${cameraSolution === null ? 'mb-2' : ''}`}
              aria-pressed={cameraSolution?.mode === 'direct-solve' || mode === 'direct-solve'}
              id="direct-solve"
              type="button"
              onClick={handleOnClickAction}
              disabled={points === null || selectedCounter < 6}
            >
              {t('ControlPoints3d.directSolve')}
            </button>
            <button
              ref={optimizeSolutionButtonRef}
              className={`btn btn-lg btn-secondary button-rectification ${cameraSolution === null ? 'mb-2' : ''}`}
              aria-pressed={cameraSolution?.mode === 'optimize-solution' || mode === 'optimize-solution'}
              id="optimize-solution"
              type="button"
              onClick={handleOnClickAction}
              disabled={points === null || selectedCounter < 7}
            >
              {' '}
              {t('ControlPoints3d.optimize')}{' '}
            </button>
          </div>

          {cameraSolution && (
            <div className="form-video-extra-info mt-3 mb-2">
              <div className="form-video-extra-info-row">
                <p> {t('ControlPoints3d.reprojectionErrors')} </p>
                <p> {cameraSolution.meanError.toFixed(2)}px</p>
              </div>
              <div className="form-video-extra-info-row">
                <p> {t('ControlPoints3d.numberOfPoints')} </p>
                <p> {cameraSolution.numPoints} </p>
              </div>
              <div className="form-video-extra-info-row mb-2">
                <p> {t('ControlPoints3d.cameraHeight')} </p>
                <p> {(cameraSolution.cameraPosition[2] * heightFactor).toFixed(2)} </p>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
