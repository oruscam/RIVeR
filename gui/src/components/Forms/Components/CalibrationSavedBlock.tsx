import { useTranslation } from 'react-i18next';
import { LuCheck } from 'react-icons/lu';
import { profileDisplayPath } from '../../../helpers/calibrationView';

/**
 * What the calibration panel shows once a profile is really on disk: the
 * report's saved block (accent check, what was saved, two real buttons).
 */
export const CalibrationSavedBlock = ({
  filePath,
  camera,
  lens,
  onShowInFolder,
  onCalibrateAnother,
}: {
  filePath: string;
  camera: string;
  lens: string;
  onShowInFolder: () => void;
  onCalibrateAnother: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="summary-saved" role="status">
      <p className="summary-saved-head">
        <span className="summary-saved-check">
          <LuCheck size={13} strokeWidth={3} aria-hidden="true" />
        </span>
        {t('Calibration.saved.title')}
      </p>
      <p className="cal-saved-names">
        {camera} · {lens}
        <small title={filePath}>{profileDisplayPath(filePath)}</small>
      </p>
      <div className="panel-actions">
        <button type="button" className="btn btn-secondary panel-action" onClick={onShowInFolder}>
          {t('Calibration.saved.showInFolder')}
        </button>
        <button type="button" className="btn btn-secondary panel-action" onClick={onCalibrateAnother}>
          {t('Calibration.saved.calibrateAnother')}
        </button>
      </div>
    </div>
  );
};
