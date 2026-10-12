import { useTranslation } from 'react-i18next';

interface StabilizationViewControlProps {
  showStabilization: boolean;
  onSetShowStabilization: (value: boolean) => void;
  /** What the first tab shows when it is not extracted frames (ipcam: the control images). */
  baseLabel?: string;
}

/**
 * The view switch of the Pixel Size canvas (UAV and Oblique) and of the
 * Control Points canvas (ipcam): Frames | Stabilization check on .seg-float, the same canvas-chrome segmented
 * control as Processing's Frames / Space-time / Spectrum and Calibration's
 * Original / Corrected / Heatmap. It replaced a button in the carousel
 * header. The caller renders it only when stabilization was applied.
 */
export const StabilizationViewControl = ({
  showStabilization,
  onSetShowStabilization,
  baseLabel,
}: StabilizationViewControlProps) => {
  const { t } = useTranslation();

  return (
    <div className="seg-float" role="tablist" aria-label={t('Calibration.viewTablist', { defaultValue: 'View' })}>
      <button
        type="button"
        role="tab"
        aria-selected={!showStabilization}
        onClick={() => {
          if (showStabilization) onSetShowStabilization(false);
        }}
      >
        {baseLabel ?? t('Processing.previewFrames', { defaultValue: 'Frames' })}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={showStabilization}
        onClick={() => {
          if (!showStabilization) onSetShowStabilization(true);
        }}
      >
        {t('PixelSize.carouselStabilization', { defaultValue: 'Stabilization check' })}
      </button>
    </div>
  );
};
