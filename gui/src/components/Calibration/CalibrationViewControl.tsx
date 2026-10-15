import { useTranslation } from 'react-i18next';
import { CALIBRATION_VIEW_MODES, type CalibrationViewMode, type ViewBlocker } from '../../helpers/calibrationView';

interface CalibrationViewControlProps {
  viewMode: CalibrationViewMode;
  onSetViewMode: (mode: CalibrationViewMode) => void;
  availability: Record<CalibrationViewMode, ViewBlocker>;
}

/** Existing, already-translated labels (Calibration.overlay reads "Original"). */
const LABEL_KEY: Record<CalibrationViewMode, string> = {
  original: 'Calibration.overlay',
  corrected: 'Calibration.undistorted',
  heatmap: 'Calibration.heatmap',
};

/**
 * The calibration canvas's view switch (spec amendment A12): Original |
 * Corrected | Heatmap on .seg-float, the second consumer of 6d's canvas-chrome
 * segmented control after PreviewModeControl. Same tablist + aria-disabled
 * pattern, so an unavailable view still explains itself on hover.
 */
export const CalibrationViewControl = ({ viewMode, onSetViewMode, availability }: CalibrationViewControlProps) => {
  const { t } = useTranslation();

  const reasonText = (blocker: ViewBlocker): string | undefined => {
    if (blocker === 'notSolved')
      return t('Calibration.solveFirst', { defaultValue: 'Solve the calibration first' });
    if (blocker === 'noHeatmap')
      return t('Calibration.noHeatmap', { defaultValue: 'No heatmap was produced for this calibration' });
    return undefined;
  };

  return (
    <div className="seg-float" role="tablist" aria-label={t('Calibration.viewTablist', { defaultValue: 'View' })}>
      {CALIBRATION_VIEW_MODES.map((mode) => (
        <button
          key={mode}
          type="button"
          role="tab"
          aria-selected={viewMode === mode}
          aria-disabled={availability[mode] !== null}
          title={reasonText(availability[mode])}
          onClick={() => {
            if (availability[mode] !== null) return;
            if (viewMode === mode) return;
            onSetViewMode(mode);
          }}
        >
          {t(LABEL_KEY[mode])}
        </button>
      ))}
    </div>
  );
};
