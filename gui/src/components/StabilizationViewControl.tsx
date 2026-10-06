import { useTranslation } from 'react-i18next';

interface StabilizationViewControlProps {
  showStabilization: boolean;
  onSetShowStabilization: (value: boolean) => void;
}

/**
 * The Pixel Size canvas's view switch (UAV and Oblique): Frames |
 * Stabilization check on .seg-float, the same canvas-chrome segmented
 * control as Processing's Frames / Space-time / Spectrum and Calibration's
 * Original / Corrected / Heatmap. It replaced a button in the carousel
 * header. The caller renders it only when stabilization was applied.
 */
export const StabilizationViewControl = ({
  showStabilization,
  onSetShowStabilization,
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
        {t('Processing.previewFrames', { defaultValue: 'Frames' })}
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
