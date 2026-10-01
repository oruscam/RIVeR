import type { AnalyzeStageUpdate, StageKey } from './parseAnalyzeStage';

/**
 * The run-stage state behind the Processing panel's readout and its per-row
 * status (Done / Running / Queued), lifted out of AnalyzingProgress so the
 * technique rows can read it too. Pure: no React, no IPC.
 */
export interface AnalyzeRunState {
  stage: StageKey;
  percentage: number | null;
  station: [number, number] | null;
  remaining: string | null;
  note: string | null;
}

const STAGE_ORDER: StageKey[] = ['lspiv', 'stiv', 'iwave'];

// Proper nouns, never translated anywhere in this app.
export const STAGE_LABEL: Record<StageKey, string> = { lspiv: 'LSPIV', stiv: 'STIV', iwave: 'iWave' };

export const initialAnalyzeRunState = (): AnalyzeRunState => ({
  stage: 'lspiv',
  percentage: null,
  station: null,
  remaining: null,
  note: null,
});

/** A line naming a new stage starts from that line's fields; the same stage merges onto what it had. */
export const reduceAnalyzeStage = (prev: AnalyzeRunState, update: AnalyzeStageUpdate): AnalyzeRunState => {
  if (update.stage === null) return prev;
  if (update.stage !== prev.stage) {
    return {
      stage: update.stage,
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
};

export const enabledStages = (stiv: boolean, iwave: boolean): StageKey[] =>
  STAGE_ORDER.filter((s) => s === 'lspiv' || (s === 'stiv' && stiv) || (s === 'iwave' && iwave));

export type TechniqueRunStatus = 'done' | 'running' | 'queued';

export const techniqueRunStatus = (
  technique: StageKey,
  enabled: StageKey[],
  current: StageKey
): TechniqueRunStatus | null => {
  const at = enabled.indexOf(technique);
  if (at === -1) return null;
  const now = enabled.indexOf(current);
  if (at < now) return 'done';
  return at === now ? 'running' : 'queued';
};

export type Translate = (key: string, options: Record<string, unknown>) => string;

const DEFAULT_HEADLINE: Record<StageKey, string> = {
  lspiv: 'Computing LSPIV velocity field',
  stiv: 'Computing STIV velocities',
  iwave: 'Computing iWave velocities',
};

export const readoutFoot = (state: AnalyzeRunState, t: Translate): { label: string; time: string } => {
  const technique = STAGE_LABEL[state.stage];
  const label = state.station
    ? t('Analizing.stationOf', {
        defaultValue: '{{technique}} · station {{n}} of {{total}}',
        technique,
        n: state.station[0],
        total: state.station[1],
      })
    : state.note
      ? `${technique} · ${state.note}`
      : t(`Analizing.stage.${state.stage}`, { defaultValue: DEFAULT_HEADLINE[state.stage] });
  const time = state.remaining
    ? t('Analizing.timeLeft', { defaultValue: '{{time}} left', time: state.remaining })
    : t('Analizing.estimating', { defaultValue: 'Estimating…' });
  return { label, time };
};
