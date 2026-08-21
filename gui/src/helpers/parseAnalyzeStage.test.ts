import { parseAnalyzeStage } from './parseAnalyzeStage';

const NO_MATCH = { stage: null, percentage: null, station: null, remaining: null, note: null };

describe('parseAnalyzeStage', () => {
  it('parses the PIV field tqdm line (first tick, unknown remaining)', () => {
    const line = 'Processing image pairs:   0%|          | 0/20 [00:00<?, ?it/s]';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'lspiv',
      percentage: 0,
      station: null,
      remaining: null,
      note: null,
    });
  });

  it('parses the PIV field tqdm line mid-run, with a real remaining estimate', () => {
    const line = 'Processing image pairs:  45%|████████████            | 9/20 [00:12<00:15,  1.29it/s]';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'lspiv',
      percentage: 45,
      station: null,
      remaining: '00:15',
      note: null,
    });
  });

  it('maps the "LSPIV profiles" tqdm desc to lspiv too', () => {
    const line = 'LSPIV profiles: 100%|██████████| 1/1 [00:00<00:00, 43.48it/s]';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'lspiv',
      percentage: 100,
      station: null,
      remaining: '00:00',
      note: null,
    });
  });

  it('parses a STIV tqdm line with station counts', () => {
    const line = 'STIV:  27%|##7       | 4/15 [00:12<00:33,  3.05s/it]';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'stiv',
      percentage: 27,
      station: [4, 15],
      remaining: '00:33',
      note: null,
    });
  });

  it('parses an iWave tqdm line with station counts', () => {
    const line = 'iWave:  40%|####      | 6/15 [00:20<00:24,  2.50s/it]';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'iwave',
      percentage: 40,
      station: [6, 15],
      remaining: '00:24',
      note: null,
    });
  });

  it('returns remaining: null for the first STIV tick (unknown remaining)', () => {
    const line = 'STIV:   0%|          | 0/15 [00:00<?, ?it/s]';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'stiv',
      percentage: 0,
      station: [0, 15],
      remaining: null,
      note: null,
    });
  });

  it('parses a remaining value with an hour component (tqdm H:MM:SS format)', () => {
    const line = 'STIV:  85%|########5 | 13/15 [1:02:11<00:14:30,  4.90s/it]';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'stiv',
      percentage: 85,
      station: [13, 15],
      remaining: '00:14:30',
      note: null,
    });
  });

  it('parses an elapsed value with an hour component when remaining is still under an hour', () => {
    const line = 'iWave:  90%|######### | 13/15 [1:23:45<00:05:12,  4.90s/it]';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'iwave',
      percentage: 90,
      station: [13, 15],
      remaining: '00:05:12',
      note: null,
    });
  });

  it('parses the "PIV: computing" marker without setting a user-facing note', () => {
    expect(parseAnalyzeStage('PIV: computing displacement field')).toEqual({
      stage: 'lspiv',
      percentage: null,
      station: null,
      remaining: null,
      note: null,
    });
  });

  it('parses the "PIV: parameters unchanged" marker without setting a user-facing note', () => {
    const line = 'PIV: parameters unchanged, reusing existing piv_results.json';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'lspiv',
      percentage: null,
      station: null,
      remaining: null,
      note: null,
    });
  });

  it('parses the "STIV: loading models" marker as a stiv note', () => {
    expect(parseAnalyzeStage('STIV: loading models')).toEqual({
      stage: 'stiv',
      percentage: null,
      station: null,
      remaining: null,
      note: 'STIV: loading models',
    });
  });

  it('parses the "iWave: warping frames" marker as an iwave note', () => {
    const line = 'iWave: warping frames onto ortho grid';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'iwave',
      percentage: null,
      station: null,
      remaining: null,
      note: line,
    });
  });

  it('parses a "STIV failed, continuing" line as a stiv note', () => {
    const line = 'STIV failed, continuing without it: boom';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'stiv',
      percentage: null,
      station: null,
      remaining: null,
      note: line,
    });
  });

  it('parses an "iWave failed, continuing" line as an iwave note', () => {
    const line = 'iWave failed, continuing without it: boom';
    expect(parseAnalyzeStage(line)).toEqual({
      stage: 'iwave',
      percentage: null,
      station: null,
      remaining: null,
      note: line,
    });
  });

  it('ignores an unrelated stderr line', () => {
    const line = 'UserWarning: resource_tracker: There appear to be 1 leaked semaphore objects';
    expect(parseAnalyzeStage(line)).toEqual(NO_MATCH);
  });

  it('ignores an empty/whitespace-only line', () => {
    expect(parseAnalyzeStage('   ')).toEqual(NO_MATCH);
    expect(parseAnalyzeStage('')).toEqual(NO_MATCH);
  });
});
