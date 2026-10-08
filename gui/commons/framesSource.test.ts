import {
  extractionCommand,
  fpsFromInterval,
  frameRange,
  frameRangeValid,
  framesVideoBlock,
  intervalFromSettings,
  parseInterval,
  selectedFrameCount,
  withInterval,
} from './framesSource';

describe('parseInterval', () => {
  it.each([
    ['33.33', 33.33],
    ['33,3', 33.3],
    [' 40 ', 40],
    ['1000', 1000],
  ])('reads %s', (text, expected) => {
    expect(parseInterval(text)).toBe(expected);
  });

  it.each(['', '0', '-5', 'abc', '3 3', '1.2.3', '33,3,3', 'Infinity'])('refuses %s', (text) => {
    expect(parseInterval(text)).toBeNull();
  });
});

describe('fpsFromInterval', () => {
  it('is the inverse of the interval', () => {
    expect(fpsFromInterval(40)).toBe(25);
    expect(fpsFromInterval(33.33)).toBeCloseTo(30.003, 3);
  });
});

// The same cases as tests/core/test_frames_to_frames.py::test_selected_indices.
describe('selectedFrameCount', () => {
  it.each([
    [0, 10, 1, 10],
    [4, 10, 2, 3],
    [5, 10, 2, 2],
    [0, 10, 3, 4],
    [1, 2, 5, 0],
    [0, 10, 4, 3],
  ])('start %i end %i step %i keeps %i', (start, end, step, expected) => {
    expect(selectedFrameCount(start, end, step)).toBe(expected);
  });

  it('is 0 for an unusable step or an empty range', () => {
    expect(selectedFrameCount(0, 10, 0)).toBe(0);
    expect(selectedFrameCount(0, 10, NaN)).toBe(0);
    expect(selectedFrameCount(8, 3, 1)).toBe(0);
  });
});

describe('frameRangeValid', () => {
  it('accepts whole frames inside the folder with start before end', () => {
    expect(frameRangeValid(1, 240, 240)).toBe(true);
    expect(frameRangeValid(10, 11, 240)).toBe(true);
  });

  it.each([
    [0, 10],
    [10, 10],
    [12, 10],
    [1, 241],
    [1.5, 10],
    [NaN, 10],
  ])('refuses %s → %s', (start, end) => {
    expect(frameRangeValid(start, end, 240)).toBe(false);
  });
});

describe('frameRange', () => {
  it('turns 1-based frame numbers into the backend range and its times', () => {
    expect(frameRange(1, 240, 25)).toEqual({ startFrame: 0, endFrame: 240, startTime: 0, endTime: 9.6 });
    expect(frameRange(11, 60, 25)).toEqual({ startFrame: 10, endFrame: 60, startTime: 0.4, endTime: 2.4 });
  });
});

describe('framesVideoBlock', () => {
  it('describes the folder as a video with the typed interval', () => {
    expect(
      framesVideoBlock({
        folder: '/data/gauging',
        name: 'gauging',
        count: 240,
        width: 1920,
        height: 1080,
        intervalMs: 40,
      })
    ).toEqual({
      source: 'frames',
      filepath: '/data/gauging',
      name: 'gauging',
      frame_count: 240,
      total_length: 9.6,
      time_between_frames: 0.04,
      fps: 25,
      resolution: { width: 1920, height: 1080 },
    });
  });
});

describe('withInterval', () => {
  it('rewrites the timing and keeps everything else', () => {
    const block = framesVideoBlock({ folder: '/d', name: 'd', count: 100, width: 10, height: 10, intervalMs: 40 });
    const edited = withInterval(block, 50);
    expect(edited).toEqual({ ...block, fps: 20, time_between_frames: 0.05, total_length: 5 });
  });
});

describe('intervalFromSettings', () => {
  it('returns the interval exactly as it was typed', () => {
    const block = framesVideoBlock({ folder: '/d', name: 'd', count: 2, width: 1, height: 1, intervalMs: 33.33 });
    expect(intervalFromSettings(block)).toBe(33.33);
  });

  it('keeps an interval typed with four decimals', () => {
    const block = framesVideoBlock({
      folder: '/d',
      name: 'd',
      count: 2,
      width: 1,
      height: 1,
      intervalMs: 16.6667,
    });
    expect(intervalFromSettings(block)).toBe(16.6667);
  });

  it('falls back to fps when the interval is missing', () => {
    expect(intervalFromSettings({ fps: 25 })).toBe(40);
    expect(intervalFromSettings({})).toBe(0);
  });
});

describe('extractionCommand', () => {
  it('uses the frames importer only for a frames project', () => {
    expect(extractionCommand('frames')).toBe('frames-to-frames');
    expect(extractionCommand('video')).toBe('video-to-frames');
    expect(extractionCommand(undefined)).toBe('video-to-frames');
  });
});
