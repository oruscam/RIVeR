import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuCheckCircle, LuChevronDown, LuChevronRight } from 'react-icons/lu';
import { DropHereText, FormHeader } from './Components';
import { SuccessBanner } from '../index';
import { ProgressReadout } from '../ProgressReadout';
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
  const [showHistogram, setShowHistogram] = useState(false);

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
  // The slice carries the backend's "42%" string, or '' before the first report.
  const parsedPercentage = parseInt(progressPercentage);
  const solvePercentage = Number.isNaN(parsedPercentage) ? null : parsedPercentage;
  const actions = summary?.verdict?.actions ?? [];

  return (
    <>
      <FormHeader title={t('Calibration.title')} showProgress={false} showSections={false} />

      <div className="body cal-panel-body">
        <div className="input-container-2 mt-1">
          <button
            type="button"
            className="btn btn-lg btn-secondary form-button me-1"
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
            className="btn btn-lg btn-secondary form-button"
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
          <div className="form-video-extra-info cal-info">
            <div className="form-video-extra-info-row">
              <p>{t('Calibration.photos', { defaultValue: 'Photos' })}</p>
              <p>{imageCount}</p>
            </div>
          </div>
        )}

        {status === 'solving' && (
          <div className="cal-solving-loader">
            <ProgressReadout
              percentage={solvePercentage}
              label={t('Calibration.solving')}
              time={progressTime ? `${remainingTimeLabel}${progressTime}` : t('Analizing.estimating')}
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
            <div className="form-video-extra-info cal-info">
              <div className="form-video-extra-info-row">
                <p>
                  <b>{t('Calibration.overall', { defaultValue: 'Overall' })}</b>
                </p>
                <GradeBadge grade={summary.verdict?.grade_overall} />
              </div>
              {METRICS.map(([labelKey, gradeKey]) => (
                <div key={labelKey} className="form-video-extra-info-row">
                  <p>{t(labelKey)}</p>
                  <GradeBadge grade={summary.verdict?.grades?.[gradeKey]} />
                </div>
              ))}
              <div className="form-video-extra-info-row">
                <p>{t('Calibration.resolution')}</p>
                <p>{imageResolution ? `${imageResolution.width} × ${imageResolution.height} px` : '—'}</p>
              </div>
            </div>

            <div className="input-container-2 mt-2">
              <button type="button" className="btn btn-lg btn-secondary form-button" onClick={onSolve}>
                {t('Calibration.solveAgain', { defaultValue: 'Solve again' })}
              </button>
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
                <button
                  type="button"
                  className="btn btn-sm btn-tertiary cal-disclosure"
                  aria-expanded={showHistogram}
                  onClick={() => setShowHistogram((v) => !v)}
                >
                  {showHistogram ? <LuChevronDown /> : <LuChevronRight />}
                  {t('Calibration.histogram')}
                </button>
                {showHistogram && <CalibrationHistogram rows={csvRows} />}
              </>
            )}

            <span className="divider-line mt-2 mb-1" />
            <h3 className="cal-section-title">
              {t('Calibration.saveSection', { defaultValue: 'Save as camera profile' })}
            </h3>
            <div className="input-container-2 mt-1">
              <label className="read-only me-1" htmlFor="cal-camera-name">
                {t('Calibration.cameraName')}
              </label>
              <div className="input-field-container cal-combo">
                <input
                  id="cal-camera-name"
                  type="text"
                  className="input-field"
                  value={cameraName}
                  onChange={(e) => {
                    setCameraName(e.target.value);
                    setComboOpen(true);
                  }}
                  onFocus={() => setComboOpen(true)}
                  onBlur={() => setTimeout(() => setComboOpen(false), 150)}
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
            </div>
            <div className="input-container-2 mt-1">
              <label className="read-only me-1" htmlFor="cal-lens-name">
                {t('Calibration.lensName')}
              </label>
              <div className="input-field-container">
                <input
                  id="cal-lens-name"
                  type="text"
                  className="input-field"
                  value={lensName}
                  onChange={(e) => setLensName(e.target.value)}
                />
              </div>
            </div>

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
