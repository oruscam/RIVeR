import { detectPhaseTransition } from './detectPhaseTransition';

describe('detectPhaseTransition', () => {
  it('flags the first tqdm line of a new stage and updates desc', () => {
    const line = 'Processing image pairs:   0%|          | 0/20 [00:00<?, ?it/s]';
    expect(detectPhaseTransition(line, '')).toEqual({ phaseLines: [line], desc: 'Processing image pairs' });
  });

  it('does not flag a tqdm line whose desc matches the running desc', () => {
    const line = 'Processing image pairs:  45%|████      | 9/20 [00:12<00:15,  1.29it/s]';
    expect(detectPhaseTransition(line, 'Processing image pairs')).toEqual({
      phaseLines: [],
      desc: 'Processing image pairs',
    });
  });

  it('flags a tqdm line whose desc differs from the running desc, and updates desc', () => {
    const line = 'STIV:   0%|          | 0/15 [00:00<?, ?it/s]';
    expect(detectPhaseTransition(line, 'Processing image pairs')).toEqual({ phaseLines: [line], desc: 'STIV' });
  });

  it('flags a plain STIV/iWave/PIV marker line without changing desc', () => {
    expect(detectPhaseTransition('STIV: loading models', 'Processing image pairs')).toEqual({
      phaseLines: ['STIV: loading models'],
      desc: 'Processing image pairs',
    });
    expect(detectPhaseTransition('iWave: warping frames onto ortho grid', 'STIV')).toEqual({
      phaseLines: ['iWave: warping frames onto ortho grid'],
      desc: 'STIV',
    });
  });

  it('still flags the existing Extracting/Stabilizing markers', () => {
    expect(detectPhaseTransition('Extracting frame 120/500', '')).toEqual({
      phaseLines: ['Extracting frame 120/500'],
      desc: '',
    });
    expect(detectPhaseTransition('Stabilizing frame 12/500', '')).toEqual({
      phaseLines: ['Stabilizing frame 12/500'],
      desc: '',
    });
  });

  it('ignores unrelated stderr text', () => {
    const line = 'UserWarning: resource_tracker: There appear to be 1 leaked semaphore objects';
    expect(detectPhaseTransition(line, 'STIV')).toEqual({ phaseLines: [], desc: 'STIV' });
  });

  it('finds the transition inside a multi-line chunk and keeps scanning past a same-desc line', () => {
    const chunk = [
      'Processing image pairs: 100%|██████████| 20/20 [00:20<00:00,  1.00it/s]',
      'STIV:   0%|          | 0/15 [00:00<?, ?it/s]',
    ].join('\n');
    expect(detectPhaseTransition(chunk, 'Processing image pairs')).toEqual({
      phaseLines: ['STIV:   0%|          | 0/15 [00:00<?, ?it/s]'],
      desc: 'STIV',
    });
  });

  it('collects every matching transition from a chunk that packs a completed tqdm bar (via \\r updates) together with a following plain marker', () => {
    // Equivalent to real tqdm output where the LSPIV-profiles bar's 0% and 100% ticks are
    // glued by carriage returns and immediately followed by the "STIV: loading models"
    // marker in the same stderr chunk. The 100% line is the first (and only) "LSPIV profiles"
    // line in this chunk, so it is itself the new-desc transition line.
    const chunk =
      '\rLSPIV profiles: 100%|██████████| 1/1 [00:00<00:00, 49932.19it/s]' + '\nSTIV: loading models\n';
    expect(detectPhaseTransition(chunk, 'Processing image pairs')).toEqual({
      phaseLines: ['LSPIV profiles: 100%|██████████| 1/1 [00:00<00:00, 49932.19it/s]', 'STIV: loading models'],
      desc: 'LSPIV profiles',
    });
  });

  it('does not treat a same-desc tqdm line as a transition (guards the marker-vs-tqdm ordering bug)', () => {
    expect(detectPhaseTransition('STIV:  27%|##7       | 4/15 [00:12<00:33,  3.05s/it]', 'STIV')).toEqual({
      phaseLines: [],
      desc: 'STIV',
    });
  });
});
