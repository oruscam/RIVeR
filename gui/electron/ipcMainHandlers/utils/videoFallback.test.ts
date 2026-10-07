import { settingsVideoSpec, videoMetadataFromSettings, videoMismatch } from './videoFallback';

const settingsVideo = {
  filepath: '/Users/a/Dropbox/Video_4/DJI_0083.MP4',
  name: 'DJI_0083.MP4',
  total_length: 21.5215,
  time_between_frames: 0.03,
  fps: 30,
  resolution: { width: 4096, height: 2160 },
};

describe('videoMetadataFromSettings', () => {
  it('builds the same shape getVideoMetadata returns, from settings.video', () => {
    expect(videoMetadataFromSettings(settingsVideo)).toEqual({
      width: 4096,
      height: 2160,
      fps: 30,
      duration: '21.5215',
      creation: '',
      name: 'DJI_0083.MP4',
      path: '/Users/a/Dropbox/Video_4/DJI_0083.MP4',
    });
  });
});

describe('videoMismatch', () => {
  const expected = settingsVideoSpec(settingsVideo);

  it('accepts the same resolution and fps', () => {
    expect(videoMismatch(expected, { width: 4096, height: 2160, fps: 30 })).toBe(false);
  });

  it('compares fps after rounding (29.97 vs 30)', () => {
    expect(videoMismatch({ width: 1920, height: 1080, fps: 29.97 }, { width: 1920, height: 1080, fps: 30 })).toBe(
      false
    );
  });

  it('refuses another resolution', () => {
    expect(videoMismatch(expected, { width: 1920, height: 1080, fps: 30 })).toBe(true);
  });

  it('refuses another fps', () => {
    expect(videoMismatch(expected, { width: 4096, height: 2160, fps: 25 })).toBe(true);
  });
});
