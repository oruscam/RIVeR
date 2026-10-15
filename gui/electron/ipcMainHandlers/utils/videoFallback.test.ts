import { framesVideoBlock } from '../../../commons/framesSource';
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
      duration: 21.5215,
      creation: '',
      name: 'DJI_0083.MP4',
      path: '/Users/a/Dropbox/Video_4/DJI_0083.MP4',
      source: 'video',
      frameCount: 0,
      intervalMs: 30,
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

describe('videoMetadataFromSettings for a frames project', () => {
  it('reports the source, the frame count and the typed interval', () => {
    const block = framesVideoBlock({
      folder: '/data/gauging',
      name: 'gauging',
      count: 240,
      width: 1920,
      height: 1080,
      intervalMs: 33.33,
    });

    expect(videoMetadataFromSettings(block)).toEqual({
      width: 1920,
      height: 1080,
      fps: 1000 / 33.33,
      duration: 7.9992,
      creation: '',
      name: 'gauging',
      path: '/data/gauging',
      source: 'frames',
      frameCount: 240,
      intervalMs: 33.33,
    });
  });

  it('reports an old project as a video', () => {
    const metadata = videoMetadataFromSettings({ filepath: '/v/a.mp4', fps: 30 });

    expect(metadata.source).toBe('video');
    expect(metadata.frameCount).toBe(0);
  });
});
