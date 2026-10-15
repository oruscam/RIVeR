import {
  clampIndex,
  frameUrl,
  indexFromProgress,
  playableFrames,
  playbackDelay,
  progressFromIndex,
} from './framePlayback';

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

describe('frameUrl', () => {
  it('leaves an ordinary path as prefix + path', () => {
    expect(frameUrl('/@fs', '/data/run 1/frame_2.jpg')).toBe('/@fs/data/run 1/frame_2.jpg');
    expect(frameUrl('', 'C:\\data\\f_1.jpg')).toBe('C:\\data\\f_1.jpg');
  });

  it('escapes the characters that would cut the URL short', () => {
    expect(frameUrl('', '/data/frame #1.jpg')).toBe('/data/frame %231.jpg');
    expect(frameUrl('', '/data/50%/a?b.png')).toBe('/data/50%25/a%3Fb.png');
  });
});

describe('playableFrames', () => {
  const files = ['/data/run/f_1.jpg', '/data/run/f #2.jpg'];

  it('gives the source images as URLs when the folder still holds the project frames', () => {
    expect(playableFrames({ files }, 2, '/@fs')).toEqual(['/@fs/data/run/f_1.jpg', '/@fs/data/run/f %232.jpg']);
  });

  it('gives nothing when the folder could not be read', () => {
    expect(playableFrames({ error: 'unreadableFolder' }, 2, '')).toEqual([]);
    expect(playableFrames({ error: 'noFrames' }, 2, '')).toEqual([]);
  });

  it('gives nothing when the folder no longer has the frame count the project was made from', () => {
    expect(playableFrames({ files }, 240, '')).toEqual([]);
    expect(playableFrames({ files: [...files, '/data/run/f_3.jpg'] }, 2, '')).toEqual([]);
  });
});
