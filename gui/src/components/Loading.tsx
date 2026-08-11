import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUiSlice } from '../hooks';

interface LoadingProps {
  time?: string;
  percentage?: string;
  size?: string;
  isComplete?: boolean;
}

export const Loading = ({ time, percentage, size = 'mid', isComplete }: LoadingProps) => {
  const { message, onSetMessage } = useUiSlice();
  const { t } = useTranslation();
  const [progressText, setProgressText] = useState('');

  useEffect(() => {
    setProgressText('');

    const handler = (_event: any, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const frameMatch = trimmed.match(/frame\s+(\d+)\/(\d+)/);
      if (frameMatch) {
        const current = parseInt(frameMatch[1]);
        const total = parseInt(frameMatch[2]);
        const pct = Math.min(100, Math.round((current / total) * 100));
        setProgressText(`${current} / ${total} (${pct}%)`);
      } else if (trimmed.startsWith('Extracting') || trimmed.startsWith('Stabilizing')) {
        setProgressText(trimmed);
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

  return (
    <div className={`loader-container-${size}`}>
      <div className={`loader-wrapper-${size}`}>
        <div className={`loader-${size} ${isComplete ? `loader-complete-${size}` : ''}`}></div>
        {percentage && <div className={`loader-percentage-${size}`}>{percentage}</div>}
      </div>
      {message && <p>{message}</p>}
      {progressText && <p>{progressText}</p>}
      {time && <p className="loader-remaining-time">{time}</p>}
    </div>
  );
};
