import { useTranslation } from 'react-i18next';
import { useGlobalSlice, useIpcamSlice, useUiSlice } from '../../hooks';
import { PointsMap } from '../Graphs';
import { IpcamGrid } from '../index';
import { useState } from 'react';
import { DropHereText } from './DropHereText';

export const FormRectification3D = () => {
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
  const { onSetErrorMessage } = useUiSlice();
  const { t } = useTranslation();

  const handleOnClickImport = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const id = (event.target as HTMLButtonElement).id;
    if (id === 'import-points') {
      onGetPoints().catch((error) => onSetErrorMessage(error.message));
    } else {
      onGetImages(undefined).catch((error) => onSetErrorMessage(error.message));
    }
  };

  const handleOnClickAction = (event: React.MouseEvent<HTMLButtonElement>) => {
    const id = (event.target as HTMLButtonElement).id;
    setMode(id);
    onGetCameraSolution(id)
      .catch((error) => {
        onSetErrorMessage(error.message);
      })
      .finally(() => {
        setMode('');
      });
  };

  return (
    <>
      <h1 className="form-title"> {t('ControlPoints.title')} </h1>
      <form id="form-control-points" className={`form-scroll ${isBackendWorking ? 'disabled' : ''}`}>
        <div className="form-base-2">
          <div className="input-container-2">
            <button
              className={`wizard-button me-1 button-rectification ${points !== null ? 'wizard-button-active' : ''}`}
              id="import-points"
              type="button"
              onClick={handleOnClickImport}
            >
              {' '}
              {t('ControlPoints3d.importPoints')}{' '}
            </button>
            <button
              className={`wizard-button button-rectification ${imagesPath !== null ? 'wizard-button-active' : ''}`}
              id="import-images"
              type="button"
              onClick={handleOnClickImport}
            >
              {' '}
              {t('ControlPoints3d.importImages')}{' '}
            </button>
          </div>

          <DropHereText text={t('Commons.dropHereText')} show={pointsPath === null} />

          <IpcamGrid />

          <PointsMap />

          <div className="input-container-2 mt-1">
            <button
              className={`wizard-button me-1 button-rectification ${cameraSolution === null ? 'mb-2' : ''} ${cameraSolution?.mode === 'direct-solve' || mode === 'direct-solve' ? 'wizard-button-active' : ''}`}
              id="direct-solve"
              type="button"
              onClick={handleOnClickAction}
              disabled={points === null || selectedCounter < 6}
            >
              {t('ControlPoints3d.directSolve')}
            </button>
            <button
              className={`wizard-button button-rectification ${cameraSolution === null ? 'mb-2' : ''} ${cameraSolution?.mode === 'optimize-solution' || mode === 'optimize-solution' ? 'wizard-button-active' : ''}`}
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
            <div className="form-video-extra-info mt-1 mb-2">
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
                <p> {cameraSolution.cameraPosition[2].toFixed(2)} </p>
              </div>
            </div>
          )}
        </div>
      </form>
    </>
  );
};
