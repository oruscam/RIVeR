import { clampIndex, indexFromProgress, playbackDelay, progressFromIndex } from './framePlayback';

describe('clampIndex', () => {
  it('keeps an index inside the sequence', () => {
    expect(clampIndex(-3, 10)).toBe(0);
    expect(clampIndex(4, 10)).toBe(4);
    expect(clampIndex(25, 10)).toBe(9);
    expect(clampIndex(2.6, 10)).toBe(3);
  });

  it('is 0 for an empty sequence', () => {
    expect(clampIndex(5, 0)).toBe(0);
  });
});

describe('indexFromProgress / progressFromIndex', () => {
  it('maps the two ends of the bar to the first and last frame', () => {
    expect(indexFromProgress(0, 240)).toBe(0);
    expect(indexFromProgress(1, 240)).toBe(239);
    expect(progressFromIndex(0, 240)).toBe(0);
    expect(progressFromIndex(239, 240)).toBe(100);
  });

  it('round-trips every frame of a short sequence', () => {
    for (let i = 0; i < 7; i++) {
      expect(indexFromProgress(progressFromIndex(i, 7) / 100, 7)).toBe(i);
    }
  });

  it('does not divide by zero on a single frame', () => {
    expect(progressFromIndex(0, 1)).toBe(0);
    expect(indexFromProgress(0.5, 1)).toBe(0);
  });
});

describe('playbackDelay', () => {
  it('plays at the real rate, capped at 25 frames per second', () => {
    expect(playbackDelay(10)).toBe(100);
    expect(playbackDelay(25)).toBe(40);
    expect(playbackDelay(120)).toBe(40);
  });

  it('falls back to the cap for an unusable rate', () => {
    expect(playbackDelay(0)).toBe(40);
    expect(playbackDelay(NaN)).toBe(40);
  });
});
