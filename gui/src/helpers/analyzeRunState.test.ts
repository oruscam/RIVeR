import { readFileSync } from 'fs';
import { join } from 'path';
import {
  enabledStages,
  initialAnalyzeRunState,
  readoutFoot,
  reduceAnalyzeStage,
  techniqueRunStatus,
  Translate,
} from './analyzeRunState';
import { AnalyzeStageUpdate } from './parseAnalyzeStage';

const update = (partial: Partial<AnalyzeStageUpdate>): AnalyzeStageUpdate => ({
  stage: null,
  percentage: null,
  station: null,
  remaining: null,
  note: null,
  ...partial,
});

/** Stands in for i18next: interpolates the defaultValue the code passes. */
const t: Translate = (key, options) =>
  String(options.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_, name) => String(options[name]));

describe('reduceAnalyzeStage', () => {
  it('ignores lines that name no stage', () => {
    const prev = initialAnalyzeRunState();
    expect(reduceAnalyzeStage(prev, update({}))).toBe(prev);
  });

  it('a new stage starts from that line alone', () => {
    const prev = { ...initialAnalyzeRunState(), percentage: 80, remaining: '00:03' };
    expect(reduceAnalyzeStage(prev, update({ stage: 'iwave', percentage: 5 }))).toEqual({
      stage: 'iwave',
      percentage: 5,
      station: null,
      remaining: null,
      note: null,
    });
  });

  it('the same stage keeps fields the new line did not carry', () => {
    const prev = { ...initialAnalyzeRunState(), percentage: 10, remaining: '00:20' };
    expect(reduceAnalyzeStage(prev, update({ stage: 'lspiv', percentage: 15 }))).toMatchObject({
      percentage: 15,
      remaining: '00:20',
    });
  });
});

describe('enabledStages', () => {
  it('always runs LSPIV, then STIV and iWave when switched on, in that order', () => {
    expect(enabledStages(false, false)).toEqual(['lspiv']);
    expect(enabledStages(true, true)).toEqual(['lspiv', 'stiv', 'iwave']);
    expect(enabledStages(false, true)).toEqual(['lspiv', 'iwave']);
  });
});

describe('techniqueRunStatus', () => {
  const all = enabledStages(true, true);
  it('marks earlier stages done, the current one running, later ones queued', () => {
    expect(techniqueRunStatus('lspiv', all, 'stiv')).toBe('done');
    expect(techniqueRunStatus('stiv', all, 'stiv')).toBe('running');
    expect(techniqueRunStatus('iwave', all, 'stiv')).toBe('queued');
  });

  it('says nothing for a technique that is not part of this run', () => {
    expect(techniqueRunStatus('stiv', ['lspiv', 'iwave'], 'iwave')).toBeNull();
  });
});

describe('readoutFoot (D4 copy)', () => {
  it('names the technique and the station', () => {
    const state = { ...initialAnalyzeRunState(), stage: 'iwave' as const, station: [2, 15] as [number, number] };
    expect(readoutFoot(state, t).label).toBe('iWave · station 2 of 15');
  });

  it('names the technique in front of a backend note', () => {
    const state = { ...initialAnalyzeRunState(), stage: 'stiv' as const, note: 'STIV: loading models' };
    expect(readoutFoot(state, t).label).toBe('STIV · STIV: loading models');
  });

  it('falls back to the stage headline', () => {
    expect(readoutFoot(initialAnalyzeRunState(), t).label).toBe('Computing LSPIV velocity field');
  });

  it('shows time left, or estimating before the first estimate', () => {
    expect(readoutFoot({ ...initialAnalyzeRunState(), remaining: '00:12' }, t).time).toBe('00:12 left');
    expect(readoutFoot(initialAnalyzeRunState(), t).time).toBe('Estimating…');
  });
});

describe('useAnalyzeStage (Review Focus 1: a second run starts clean)', () => {
  const hook = readFileSync(join(__dirname, '..', 'hooks', 'useAnalyzeStage.ts'), 'utf8');
  it('resets whenever a run starts, not once', () => {
    expect(hook).toMatch(/if \(running\) setState\(initialAnalyzeRunState\(\)\);\s*\}, \[running\]\)/);
  });
  it('feeds every backend line through the pure reducer', () => {
    expect(hook).toMatch(/reduceAnalyzeStage\(prev, parseAnalyzeStage\(text\)\)/);
  });
});
