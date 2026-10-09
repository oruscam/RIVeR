import { useTranslation } from 'react-i18next';
import { useAutoShrinkFont, useGlobalSlice, useIpcamSlice, useProjectSlice, useUiSlice } from '../../hooks';
import { UNIT_CONVERSIONS, UNITS } from '../../constants/constants';
import { PointsMap } from '../Graphs';
import { IpcamGrid } from '../index';
import { DropHereText } from './Components/DropHereText';
import { ipcamErrorGrade } from '../../helpers/ipcamErrorGrade';
import { canSolve, SOLVE_MIN_POINTS, SolveMethod } from '../../helpers/ipcamSolve';

const METHODS: { id: SolveMethod; labelKey: string }[] = [
  { id: 'direct-solve', labelKey: 'ControlPoints3d.allPoints' },
  { id: 'optimize-solution', labelKey: 'ControlPoints3d.optimized' },
];

export const FormIpcam = ({
  method,
  onMethodChange,
}: {
  method: SolveMethod;
  onMethodChange: (method: SolveMethod) => void;
}) => {
  const { onGetPoints, onGetImages, cameraSolution, selectedCounter, points, imagesPath, pointsPath } =
    useIpcamSlice();
  const { isBackendWorking } = useGlobalSlice();
  const { onAddStepAlert, onClearStepAlert } = useUiSlice();
  const { projectDetails } = useProjectSlice();
  const { t } = useTranslation();

  const importPointsButtonRef = useAutoShrinkFont<HTMLButtonElement>([t]);
  const importImagesButtonRef = useAutoShrinkFont<HTMLButtonElement>([t]);

  const isImperial = projectDetails.unitSistem === 'imperial';
  const heightFactor = isImperial ? UNIT_CONVERSIONS.M_TO_FT : 1;
  const lengthUnit = isImperial ? UNITS.IMPERIAL.LONGITUDE : UNITS.SI.LONGITUDE;

  const handleOnClickImport = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const id = event.currentTarget.id;
    if (id === 'import-points') {
      onClearStepAlert('ipcam-import-points');
      onGetPoints().catch((error) => onAddStepAlert('ipcam-import-points', 'error', error.message));
    } else {
      onClearStepAlert('ipcam-import-images');
      onGetImages(undefined).catch((error) => onAddStepAlert('ipcam-import-images', 'error', error.message));
    }
  };

  const placed = points === null ? 0 : points.filter((p) => !(p.x === 0 && p.y === 0)).length;
  const grade = cameraSolution ? ipcamErrorGrade(cameraSolution.meanError) : null;
  const tooFew = points !== null && !canSolve(method, selectedCounter);

  return (
    <div className="body processing-body">
      <div className="wrapper">
        <form id="form-control-points" className={`${isBackendWorking ? 'disabled' : ''}`}>
          <div className="panel-section">
            <div className="panel-actions">
              <button
                ref={importPointsButtonRef}
                className="btn btn-secondary panel-action"
                data-complete={points !== null}
                id="import-points"
                type="button"
                onClick={handleOnClickImport}
              >
                {t('ControlPoints3d.importPoints')}
              </button>
              <button
                ref={importImagesButtonRef}
                className="btn btn-secondary panel-action"
                data-complete={imagesPath !== null}
                id="import-images"
                type="button"
                onClick={handleOnClickImport}
              >
                {t('ControlPoints3d.importImages')}
              </button>
            </div>

            <DropHereText text={t('Commons.dropHereText')} show={pointsPath === null} />

            <div className="field-row field-row-top">
              <span className="field-row-label" id="ipcam-method-label">
                {t('ControlPoints3d.method')}
              </span>
              <span className="seg" role="group" aria-labelledby="ipcam-method-label">
                {METHODS.map(({ id, labelKey }) => {
                  // A method that cannot run yet says why on hover; the one already chosen stays chosen.
                  const needsPoints = points !== null && !canSolve(id, selectedCounter);
                  const blocked = needsPoints && method !== id;
                  return (
                    <button
                      key={id}
                      type="button"
                      id={`ipcam-method-${id}`}
                      aria-pressed={method === id}
                      aria-disabled={blocked ? true : undefined}
                      title={
                        needsPoints
                          ? t('ControlPoints3d.optimizedNeedsPoints', { count: SOLVE_MIN_POINTS[id] })
                          : undefined
                      }
                      onClick={() => {
                        if (blocked) return;
                        onMethodChange(id);
                      }}
                    >
                      {t(labelKey)}
                    </button>
                  );
                })}
              </span>
            </div>

            {tooFew && (
              <p className="cp-hint" role="status">
                {t('ControlPoints3d.hintMinPoints', { count: SOLVE_MIN_POINTS[method] })}
              </p>
            )}

            {cameraSolution && (
              <div className="cp-result">
                <div className="field-row cp-headline">
                  <span className="field-row-label">{t('ControlPoints3d.meanReprojectionError')}</span>
                  <span className="cp-value">
                    {cameraSolution.meanError.toFixed(2)} <small>px</small>
                    {grade && <span className={`badge badge-${grade}`}>{t(`Calibration.grade.${grade}`)}</span>}
                  </span>
                </div>
                <div className="field-row">
                  <span className="field-row-label">{t('ControlPoints3d.pointsUsed')}</span>
                  <span className="cp-value">
                    {cameraSolution.numPoints ?? selectedCounter}{' '}
                    <small>{t('ControlPoints3d.pointsUsedOf', { total: placed })}</small>
                  </span>
                </div>
                <div className="field-row">
                  <span className="field-row-label">{t('ControlPoints3d.cameraHeight')}</span>
                  <span className="cp-value">
                    {(cameraSolution.cameraPosition[2] * heightFactor).toFixed(2)} <small>{lengthUnit}</small>
                  </span>
                </div>
                {!tooFew && (grade === 'fair' || grade === 'bad') && (
                  <p className="cp-hint">{t('ControlPoints3d.hintUntick')}</p>
                )}
              </div>
            )}

            <IpcamGrid />

            <PointsMap />
          </div>
        </form>
      </div>
    </div>
  );
};
