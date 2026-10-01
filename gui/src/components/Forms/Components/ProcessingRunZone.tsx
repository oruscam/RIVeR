import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * The Processing panel's run zone: fixed above the footer, outside the
 * scrolling settings, so the button never moves with what is open above it.
 * One button, two states (rule 5): Analyze, or Stop while a run is going,
 * with the readout under it.
 */
export const ProcessingRunZone = ({
  running,
  testing,
  onAnalyze,
  onStop,
  children,
}: {
  running: boolean;
  testing: boolean;
  onAnalyze: () => void;
  onStop: () => void;
  children?: ReactNode;
}) => {
  const { t } = useTranslation();
  const waitLabel = t('Processing.waitForTest', { defaultValue: 'Wait for Test PIV to finish' });

  return (
    <div className="processing-run">
      {running ? (
        <button id="stop-button" type="button" className="btn btn-lg btn-danger" onClick={onStop}>
          {t('Processing.stop')}
        </button>
      ) : (
        <button
          id="analize-button"
          type="button"
          className="btn btn-lg btn-primary"
          aria-disabled={testing || undefined}
          title={testing ? waitLabel : undefined}
          onClick={() => {
            if (testing) return;
            onAnalyze();
          }}
        >
          {t('Processing.analize')}
        </button>
      )}
      {running && children}
    </div>
  );
};
