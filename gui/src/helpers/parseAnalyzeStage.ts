export type StageKey = 'lspiv' | 'stiv' | 'iwave';

export interface AnalyzeStageUpdate {
  stage: StageKey | null;
  percentage: number | null;
  station: [number, number] | null;
  remaining: string | null;
  note: string | null;
}

const NO_MATCH: AnalyzeStageUpdate = {
  stage: null,
  percentage: null,
  station: null,
  remaining: null,
  note: null,
};

const STAGE_BY_TQDM_DESC: Record<string, StageKey> = {
  'Processing image pairs': 'lspiv',
  'LSPIV profiles': 'lspiv',
  STIV: 'stiv',
  iWave: 'iwave',
};

// Order matters only in that longer/more-specific prefixes should be checked before shorter
// ones if they could ever collide — they don't here, all five are disjoint.
//
// `note: false` for the two PIV: markers means they must NOT surface their raw text as a
// user-facing note: LSPIV's real tqdm ticks start arriving almost immediately after either of
// these two lines, so there's no meaningful gap to name, and (unlike station data, which
// LSPIV never has) nothing else would ever clear this note — it would otherwise stay pinned
// under the headline, showing raw internal/backend text (including a filesystem path in the
// "parameters unchanged" case), for the entire LSPIV stage on every run.
const MARKER_PREFIXES: { prefix: string; stage: StageKey; note: boolean }[] = [
  { prefix: 'PIV: computing', stage: 'lspiv', note: false },
  { prefix: 'PIV: parameters unchanged', stage: 'lspiv', note: false },
  { prefix: 'STIV: loading models', stage: 'stiv', note: true },
  { prefix: 'STIV failed, continuing', stage: 'stiv', note: true },
  { prefix: 'iWave: warping frames', stage: 'iwave', note: true },
  { prefix: 'iWave failed, continuing', stage: 'iwave', note: true },
];

/**
 * Parses one river-cli stderr line from an analyze-all run into a stage update.
 * Recognizes two shapes: a tqdm progress line (desc + %|n/total [elapsed<remaining]),
 * and the plain-text _log markers orchestrator.py prints around each stage
 * (see river/core/orchestrator.py). Any other line returns an all-null "no match".
 */
export function parseAnalyzeStage(text: string): AnalyzeStageUpdate {
  const trimmed = text.trim();
  if (trimmed === '') return NO_MATCH;

  for (const marker of MARKER_PREFIXES) {
    if (trimmed.startsWith(marker.prefix)) {
      return {
        stage: marker.stage,
        percentage: null,
        station: null,
        remaining: null,
        note: marker.note ? trimmed : null,
      };
    }
  }

  const descMatch = trimmed.match(/^([^:|]+):\s*(\d+)%\|/);
  if (!descMatch) return NO_MATCH;

  const stage = STAGE_BY_TQDM_DESC[descMatch[1].trim()];
  if (!stage) return NO_MATCH;

  const percentage = parseInt(descMatch[2], 10);

  const countMatch = trimmed.match(/\|\s*(\d+)\/(\d+)\s*\[/);
  const station: [number, number] | null =
    stage !== 'lspiv' && countMatch ? [parseInt(countMatch[1], 10), parseInt(countMatch[2], 10)] : null;

  // tqdm's format_interval switches from MM:SS to H:MM:SS (no leading zero on the hour) once
  // an interval crosses 60 minutes — accept and capture an optional leading hour component on
  // both sides so long-running STIV/iWave stages don't silently fail to parse a remaining-time
  // estimate once elapsed crosses one hour. Group 1 (elapsed) is unused, same as before.
  const remainingMatch = trimmed.match(/\[((?:\d+:)?\d{2}:\d{2})<((?:\d+:)?\d{2}:\d{2})/);
  const remaining = remainingMatch ? remainingMatch[2] : null;

  return { stage, percentage, station, remaining, note: null };
}
