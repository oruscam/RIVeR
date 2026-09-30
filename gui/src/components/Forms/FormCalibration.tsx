import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuCheckCircle } from 'react-icons/lu';
import { DropHereText, FormHeader } from './Components';
import { Loading, SuccessBanner } from '../index';
import { CalibrationHistogram } from '../Graphs';
import { stepAlertClassName } from '../Messages/stepAlertClassName';
import { badgeGrade, footerAction, type BadgeGrade, type FooterBlocker } from '../../helpers/calibrationView';
import type { CalibrationStatus, CalibrationSummary, CsvRow } from '../../store/calibration/types';

/** Solver recommendation strings → their translation keys (moved from the page). */
const ACTION_KEY_MAP: Record<string, string> = {
  'Add frames hitting edges/corners; vary angle & distance.': 'Calibration.actions.addFrames',
  'Push board nearer sensor edges; allow some marker clipping.': 'Calibration.actions.pushBoard',
  'Increase sharpness (more light, lower ISO), reduce screen moiré (resize board).':
    'Calibration.actions.increaseSharpness',
  'Capture from varied viewpoints (tilt/pan/roll) and distances.': 'Calibration.actions.varyViewpoints',
  'Ensure corners appear across the whole sensor; avoid heavy cropping.': 'Calibration.actions.ensureCorners',
  'Re-shoot with better coverage; if persists, inspect image readout/metadata.': 'Calibration.actions.reshoot',
};

const GRADE_WORD: Record<BadgeGrade, string> = { good: 'Good', fair: 'Fair', bad: 'Bad' };

/** Existing, translated metric labels, in the order the solver has always been shown. */
const METRICS = [
  ['Calibration.metrics.medianRms', 'median_rms'],
  ['Calibration.metrics.p90Rms', 'p90_rms'],
  ['Calibration.metrics.coverage', 'coverage'],
  ['Calibration.metrics.edgeReach', 'edge_reach'],
  ['Calibration.metrics.poseSpread', 'pose_spread'],
  ['Calibration.metrics.centerOffset', 'center_offset'],
] as const;

const GradeBadge = ({ grade }: { grade: string | undefined }) => {
  const { t } = useTranslation();
  const g = badgeGrade(grade);
  // No rating from the solver: say nothing rather than claim one.
  if (g === null) return <span className="cal-grade-missing">—</span>;
  return (
    <span className={`badge badge-${g}`}>{t(`Calibration.grade.${g}`, { defaultValue: GRADE_WORD[g] })}</span>
  );
};

interface FormCalibrationProps {
  status: CalibrationStatus;
  imageCount: number;
  summary: CalibrationSummary | null;
  csvRows: CsvRow[];
  imageResolution: { width: number; height: number } | null;
  progressPercentage: string;
  progressTime: string;
  errorMsg: string;
  onOpenBoard: () => void;
  onOpenFolder: () => void;
  onSolve: () => void;
  onSaveProfile: (cameraName: string, lensName: string) => Promise<string | false>;
  onRevealPath: (path: string) => void;
  onClose: () => void;
}

/**
 * Camera calibration's panel (spec amendment A12): the children of the page's
 * .form-container — header, scrolling body, and the standard footer whose
 * right-hand button is Solve until solved and Save profile after.
 */
export const FormCalibration = ({
  status,
  imageCount,
  summary,
  csvRows,
  imageResolution,
  progressPercentage,
  progressTime,
  errorMsg,
  onOpenBoard,
  onOpenFolder,
  onSolve,
  onSaveProfile,
  onRevealPath,
  onClose,
}: FormCalibrationProps) => {
  const { t } = useTranslation();
  const [cameraName, setCameraName] = useState('');
  const [lensName, setLensName] = useState('');
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [existingCameras, setExistingCameras] = useState<string[]>([]);
  const [comboOpen, setComboOpen] = useState(false);

  // Existing camera names, for the Camera name suggestions.
  useEffect(() => {
    window.ipcRenderer
      .invoke('calibration-list-profiles')
      .then((result: { camera: string }[]) => {
        setExistingCameras((result ?? []).map((g) => g.camera));
      })
      .catch(() => {});
  }, []);

  // A fresh solve clears the previous save's outcome.
  useEffect(() => {
    if (status === 'solved') {
      setSavedPath(null);
      setSaveError(null);
    }
  }, [status]);

  const cameraSuggestions = useMemo(
    () =>
      cameraName.trim().length > 0
        ? existingCameras.filter((c) => c.toLowerCase().includes(cameraName.toLowerCase()) && c !== cameraName)
        : [],
    [cameraName, existingCameras]
  );

  const busy = status === 'solving';
  const action = footerAction({ status, imageCount, cameraName, lensName });

  const blockerText = (blocker: FooterBlocker | null): string | undefined => {
    switch (blocker) {
      case 'noPhotos':
        return t('Calibration.importFirst', { defaultValue: 'Import photos first' });
      case 'solving':
        return t('Calibration.solving');
      case 'nameCameraAndLens':
        return t('Calibration.nameCameraAndLens', { defaultValue: 'Name the camera and lens to save' });
      case 'nameCamera':
        return t('Calibration.nameCamera', { defaultValue: 'Name the camera to save' });
      case 'nameLens':
        return t('Calibration.nameLens', { defaultValue: 'Name the lens to save' });
      default:
        return undefined;
    }
  };

  const handleSave = async () => {
    setSaveError(null);
    const result = await onSaveProfile(cameraName, lensName);
    if (result) {
      setSavedPath(result);
      setCameraName('');
      setLensName('');
    } else {
      setSaveError(t('Calibration.errorGeneric'));
    }
  };

  const remainingTimeLabel = t('Analizing.remainingTime');
  const actions = summary?.verdict?.actions ?? [];

  return (
    <>
      <FormHeader title={t('Calibration.title')} showProgress={false} showSections={false} />

      <div className="body cal-panel-body">
        <p className="cal-sub">
          {t('Calibration.subtitle', { defaultValue: 'Import photos of the board, then solve.' })}
        </p>

        <div className="cal-top-actions">
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            aria-disabled={busy}
            title={busy ? t('Calibration.solving') : undefined}
            onClick={() => {
              if (busy) return;
              onOpenBoard();
            }}
          >
            {t('Calibration.board')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            aria-disabled={busy}
            title={busy ? t('Calibration.solving') : undefined}
            onClick={() => {
              if (busy) return;
              onOpenFolder();
            }}
          >
            {t('Calibration.import')}
          </button>
        </div>

        {imageCount === 0 && (
          <DropHereText text={`${t('Calibration.dropZone')} ${t('Calibration.dropHint')}`} show />
        )}

        {imageCount > 0 && status === 'idle' && (
          <p className="cal-count">
            {t('Calibration.photosLoaded', { defaultValue: '{{count}} photos loaded', count: imageCount })}
          </p>
        )}

        {status === 'solving' && (
          <div className="cal-solving-loader">
            <Loading
              percentage={progressPercentage}
              time={progressTime ? `${remainingTimeLabel}${progressTime}` : ''}
              size="big"
              isComplete={progressPercentage === '100%'}
            />
          </div>
        )}

        {(status === 'error' || errorMsg) && (
          <div className={stepAlertClassName('error')} role="alert">
            {errorMsg || t('Calibration.errorGeneric')}
          </div>
        )}

        {status === 'solved' && summary && (
          <>
            <div className="cal-overall">
              <b>
                {t('Calibration.overall', { defaultValue: 'Overall' })}
                <GradeBadge grade={summary.verdict?.grade_overall} />
              </b>
              <button type="button" className="btn btn-sm btn-tertiary" onClick={onSolve}>
                {t('Calibration.solveAgain', { defaultValue: 'Solve again' })}
              </button>
            </div>

            <div className="cal-metrics">
              {METRICS.map(([labelKey, gradeKey]) => (
                <span key={labelKey} className="cal-metric">
                  <span>{t(labelKey)}</span>
                  <GradeBadge grade={summary.verdict?.grades?.[gradeKey]} />
                </span>
              ))}
            </div>

            {actions.length > 0 && (
              <div className={stepAlertClassName('warning')} role="status">
                <div className="step-alert-content">
                  <span className="step-alert-title">
                    {t('Calibration.improveTitle', { defaultValue: 'How to improve this calibration' })}
                  </span>
                  <ul>
                    {actions.map((a) => (
                      <li key={a}>{t(ACTION_KEY_MAP[a] ?? a, a)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {csvRows.length > 0 && (
              <>
                <h3 className="cal-section-title">{t('Calibration.histogram')}</h3>
                <CalibrationHistogram rows={csvRows} />
              </>
            )}

            <h3 className="cal-section-title">
              {t('Calibration.saveSection', { defaultValue: 'Save as camera profile' })}
            </h3>
            <div className="cal-fields">
              <div className="simple-input-container cal-combo">
                <label>{t('Calibration.cameraName')}</label>
                <input
                  type="text"
                  value={cameraName}
                  onChange={(e) => {
                    setCameraName(e.target.value);
                    setComboOpen(true);
                  }}
                  onFocus={() => setComboOpen(true)}
                  onBlur={() => setTimeout(() => setComboOpen(false), 150)}
                  placeholder={t('Calibration.cameraName')}
                />
                {comboOpen && cameraSuggestions.length > 0 && (
                  <ul className="cal-combo-list">
                    {cameraSuggestions.map((c) => (
                      <li
                        key={c}
                        onMouseDown={() => {
                          setCameraName(c);
                          setComboOpen(false);
                        }}
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="simple-input-container">
                <label>{t('Calibration.lensName')}</label>
                <input
                  type="text"
                  value={lensName}
                  onChange={(e) => setLensName(e.target.value)}
                  placeholder={t('Calibration.lensName')}
                />
              </div>
            </div>
            <dl className="cal-kv">
              <dt>{t('Calibration.resolution')}</dt>
              <dd>{imageResolution ? `${imageResolution.width} × ${imageResolution.height} px` : '—'}</dd>
            </dl>

            {savedPath && (
              <SuccessBanner compact icon={LuCheckCircle} title={t('Calibration.savedTo')}>
                <button className="success-banner-link" onClick={() => onRevealPath(savedPath)}>
                  {savedPath}
                </button>
              </SuccessBanner>
            )}
            {saveError && (
              <div className={stepAlertClassName('error')} role="alert">
                {saveError}
              </div>
            )}
          </>
        )}
      </div>

      <div className="footer">
        <div className="wizard-container">
          <button type="button" className="btn btn-lg btn-tertiary" onClick={onClose}>
            {t('Wizard.back')}
          </button>
          <button
            type="button"
            className="btn btn-lg btn-primary"
            aria-disabled={action.blocker !== null}
            aria-busy={action.busy ? true : undefined}
            title={blockerText(action.blocker)}
            onClick={() => {
              if (action.blocker !== null) return;
              if (action.kind === 'solve') onSolve();
              else void handleSave();
            }}
          >
            {action.kind === 'solve' ? t('Calibration.solve') : t('Calibration.saveProfile')}
          </button>
        </div>
      </div>
    </>
  );
};
