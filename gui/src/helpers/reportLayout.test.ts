import { frameBox, frameFactor, snapshotFrames } from './reportLayout';

describe('frameBox / frameFactor', () => {
  test('landscape video fills the width', () => {
    expect(frameBox(1920, 1080, 680, 300)).toEqual({ width: 533.33, height: 300 });
    expect(frameBox(1920, 1080, 680, 420)).toEqual({ width: 680, height: 382.5 });
  });
  test('portrait video is limited by height', () => {
    expect(frameBox(1080, 1920, 680, 300)).toEqual({ width: 168.75, height: 300 });
  });
  test('factor maps resized-frame pixels to the box', () => {
    expect(frameFactor(1920, 1080, 0.5, { width: 480, height: 270 })).toEqual({ x: 2, y: 2 });
  });
});

describe('snapshotFrames', () => {
  test('five frames, first and last included, times offset by the range start', () => {
    // The old report labelled the middle frames from 0 instead of startTime; this pins the fix.
    expect(snapshotFrames(101, 10, 30)).toEqual([
      { index: 0, time: 10 },
      { index: 25, time: 15 },
      { index: 50, time: 20 },
      { index: 75, time: 25 },
      { index: 100, time: 30 },
    ]);
  });
  test('fewer than five frames: each frame once', () => {
    expect(snapshotFrames(3, 0, 2).map((f) => f.index)).toEqual([0, 1, 2]);
  });
  test('no frames: empty strip', () => {
    expect(snapshotFrames(0, 0, 10)).toEqual([]);
  });
});
