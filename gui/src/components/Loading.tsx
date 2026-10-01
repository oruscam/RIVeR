import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUiSlice } from '../hooks';
import { FrameProgress, parseFrameProgress } from '../helpers/parseFrameProgress';

/**
 * Shown in place of a step while a module loads. A bar along the top edge
 * sweeps while the wait is open-ended and fills once the frame extractor
 * reports a counter. The whole block fades in late (see .module-loader), so
 * quick module switches never flash it.
 */
export const Loading = () => {
  const { message, onSetMessage } = useUiSlice();
  const { t } = useTranslation();
  const [frames, setFrames] = useState<FrameProgress | null>(null);
  const [phaseText, setPhaseText] = useState('');

  useEffect(() => {
    const handler = (_event: unknown, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const counter = parseFrameProgress(trimmed);
      if (counter) {
        setFrames(counter);
      } else if (trimmed.startsWith('Extracting') || trimmed.startsWith('Stabilizing')) {
        setFrames(null);
        setPhaseText(trimmed);
        // The header message is set once before the backend call starts and
        // never updates on its own — switch it here once the backend reports
        // it has moved from extraction into the stabilization phase.
        if (trimmed.startsWith('Stabilizing')) {
          onSetMessage(t('Loader.stabilizingFrames'));
        }
      }
      // All other messages (PIV tqdm output, etc.) are ignored here
    };

    window.ipcRenderer.on('river-cli-message', handler);
    return () => {
      window.ipcRenderer.removeListener('river-cli-message', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detail = frames
    ? `${frames.current} / ${frames.total} (${Math.min(100, Math.round((frames.current / frames.total) * 100))}%)`
    : phaseText;

  return (
    <div className="module-loader" role="status" aria-live="polite">
      <div className="module-loader-bar">
        {frames ? (
          <span
            className="module-loader-fill"
            style={{ transform: `scaleX(${Math.min(1, frames.current / frames.total)})` }}
          />
        ) : (
          <span className="module-loader-sweep" />
        )}
      </div>
      {message && <p className="module-loader-message">{message}</p>}
      <p className="module-loader-detail">{detail}</p>
    </div>
  );
};
