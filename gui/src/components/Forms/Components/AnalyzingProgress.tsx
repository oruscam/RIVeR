import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataSlice } from '../../../hooks';
import { Loading } from '../../Loading';
import { parseAnalyzeStage, StageKey } from '../../../helpers/parseAnalyzeStage';

const STAGE_ORDER: StageKey[] = ['lspiv', 'stiv', 'iwave'];

// LSPIV/STIV/iWave are proper nouns/acronyms that are never translated in this app (see e.g.
// TECHNIQUE_COLORS keys and the technique row labels in FormProcessing.tsx, which use these
// bare names directly rather than translation keys). The breadcrumb's short per-item label
// uses this fixed map instead of deriving it from the translated headline string, which would
// break once any locale gets a real (non-placeholder) translation for Analizing.stage.*.
const STAGE_LABEL: Record<StageKey, string> = { lspiv: 'LSPIV', stiv: 'STIV', iwave: 'iWave' };

interface StageState {
  stage: StageKey;
  percentage: number | null;
  station: [number, number] | null;
  remaining: string | null;
  note: string | null;
}

const initialState = (): StageState => ({
  stage: 'lspiv',
  percentage: null,
  station: null,
  remaining: null,
  note: null,
});

export const AnalyzingProgress = ({ resetProgress }: { resetProgress: boolean }) => {
  const { t } = useTranslation();
  const { isBackendWorking, quiver, processing } = useDataSlice();
  const { stiv, iwave } = processing.form;
  const [state, setState] = useState<StageState>(initialState());

  // Known synchronously on mount (before any backend output arrives), so the breadcrumb can
  // show the full run plan immediately.
  const enabledStages = useMemo<StageKey[]>(
    () => STAGE_ORDER.filter((s) => s === 'lspiv' || (s === 'stiv' && stiv) || (s === 'iwave' && iwave)),
    [stiv, iwave]
  );

  useEffect(() => {
    const handleRiverCliMessage = (_event: unknown, text: string) => {
      const update = parseAnalyzeStage(text);
      if (update.stage === null) return;

      setState((prev) => {
        // A line naming a different stage than the current one switches to it, with fresh
        // fields from that line. A line naming the same stage merges its fields onto the
        // existing state, keeping whatever the new line didn't carry.
        if (update.stage !== prev.stage) {
          return {
            stage: update.stage as StageKey,
            percentage: update.percentage,
            station: update.station,
            remaining: update.remaining,
            note: update.note,
          };
        }
        return {
          stage: prev.stage,
          percentage: update.percentage ?? prev.percentage,
          station: update.station ?? prev.station,
          remaining: update.remaining ?? prev.remaining,
          note: update.note ?? prev.note,
        };
      });
    };

    window.ipcRenderer.on('river-cli-message', handleRiverCliMessage);
    return () => {
      window.ipcRenderer.removeListener('river-cli-message', handleRiverCliMessage);
    };
  }, []);

  useEffect(() => {
    if (resetProgress) {
      setState(initialState());
    }
  }, [resetProgress]);

  useEffect(() => {
    if (isBackendWorking === false && quiver !== null) {
      setState((prev) => ({ ...prev, percentage: 100, remaining: '00:00', note: null }));
    }
  }, [isBackendWorking, quiver]);

  const percentageStr = state.percentage !== null ? `${state.percentage}%` : '';
  const remainingStr = state.remaining ? `${t('Analizing.remainingTime')}${state.remaining}` : '';

  return (
    <div className="analize-output mt-2">
      <p className="analize-stage-breadcrumb">
        {enabledStages.map((s, i) => (
          <span key={s} className={s === state.stage ? 'analize-stage-breadcrumb-active' : ''}>
            {i > 0 ? '  →  ' : ''}
            {STAGE_LABEL[s]}
          </span>
        ))}
      </p>
      {percentageStr !== '' && (
        <Loading percentage={percentageStr} size={'big'} isComplete={state.percentage === 100} />
      )}
      <p style={{ textAlign: 'center', fontWeight: 600, marginTop: '10px', marginBottom: '2px' }}>
        {t(`Analizing.stage.${state.stage}`)}
      </p>
      {state.station ? (
        <p style={{ textAlign: 'center' }}>
          {state.station[0]} / {state.station[1]}
        </p>
      ) : (
        state.note && <p style={{ textAlign: 'center' }}>{state.note}</p>
      )}
      {percentageStr !== '' && (
        <p className="loader-remaining-time" style={{ textAlign: 'center' }}>
          {remainingStr || t('Analizing.estimating')}
        </p>
      )}
    </div>
  );
};
