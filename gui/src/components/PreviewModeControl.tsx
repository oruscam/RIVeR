import { useTranslation } from 'react-i18next';
import type { PreviewMode } from '../store/ui/types';

interface PreviewModeControlProps {
  previewMode: PreviewMode;
  onSetPreviewMode: (mode: PreviewMode) => void;
  /** STI images exist to look at (STIV has been run at least once). */
  canToggleSti: boolean;
  /** iWave spectra exist to look at. */
  canToggleIwave: boolean;
  /** STIV model weights are present on disk at all. Distinct from
   *  canToggleSti: weights can be missing even before a user has tried to
   *  run STIV, and that's a different reason to disable the segment. */
  stivAvailable: boolean;
}

/**
 * The canvas's own view switch (spec §4/6d, amendment A4): decides what
 * Processing's canvas shows, decoupled from the technique rows' switches,
 * which decide what runs. Sits on .seg-float (the translucent-dark-blur
 * variant of .seg) since it floats directly over video footage.
 */
export const PreviewModeControl = ({
  previewMode,
  onSetPreviewMode,
  canToggleSti,
  canToggleIwave,
  stivAvailable,
}: PreviewModeControlProps) => {
  const { t } = useTranslation();

  const stiDisabledReason = !stivAvailable
    ? t('Processing.stivWeightsMissing')
    : t('Processing.noStisYet', { defaultValue: 'Run STIV to see space-time images' });
  const spectrumDisabledReason = t('Processing.noSpectraYet', { defaultValue: 'Run iWave to see spectra' });

  return (
    <div
      className="seg-float"
      role="tablist"
      aria-label={t('Processing.previewTablistLabel', { defaultValue: 'Preview' })}
    >
      <button
        type="button"
        role="tab"
        aria-selected={previewMode === 'frames'}
        onClick={() => {
          if (previewMode === 'frames') return;
          onSetPreviewMode('frames');
        }}
      >
        {t('Processing.previewFrames', { defaultValue: 'Frames' })}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={previewMode === 'sti'}
        aria-disabled={!canToggleSti}
        title={canToggleSti ? undefined : stiDisabledReason}
        onClick={() => {
          if (!canToggleSti) return;
          if (previewMode === 'sti') return;
          onSetPreviewMode('sti');
        }}
      >
        {t('Processing.previewSpaceTime', { defaultValue: 'Space-time' })}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={previewMode === 'iwave'}
        aria-disabled={!canToggleIwave}
        title={canToggleIwave ? undefined : spectrumDisabledReason}
        onClick={() => {
          if (!canToggleIwave) return;
          if (previewMode === 'iwave') return;
          onSetPreviewMode('iwave');
        }}
      >
        {t('Processing.previewSpectrum', { defaultValue: 'Spectrum' })}
      </button>
    </div>
  );
};
