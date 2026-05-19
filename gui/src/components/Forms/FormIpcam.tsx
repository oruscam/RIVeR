import { useTranslation } from 'react-i18next';
import { useGlobalSlice, useIpcamSlice, useProjectSlice, useUiSlice } from '../../hooks';
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
  const { onSetErrorMessage } = useUiSlice();
  const { projectDetails } = useProjectSlice();
  const { t } = useTranslation();
  const isImperial = projectDetails.unitSistem === 'imperial';
  const heightFactor = isImperial ? UNIT_CONVERSIONS.M_TO_FT : 1;

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
    <div className='body'>
      <div className='wrapper'>

        <form id="form-control-points" className={`${isBackendWorking ? 'disabled' : ''}`}>
            <div className="input-container-2">
              <button
                className={`wizard-button form-button me-1 ${points !== null ? 'wizard-button-active' : ''}`}
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
                className={`wizard-button form-button me-1 ${imagesPath !== null ? 'wizard-button-active' : ''}`}
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
