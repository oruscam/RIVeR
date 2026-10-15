import { parseFrameProgress } from './parseFrameProgress';

describe('parseFrameProgress', () => {
  it('reads the frame counter the extractor prints', () => {
    expect(parseFrameProgress('Extracting frame 120/450')).toEqual({ current: 120, total: 450 });
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseFrameProgress('  frame 3/10\n')).toEqual({ current: 3, total: 10 });
  });

  it('returns null for lines without a frame counter', () => {
    expect(parseFrameProgress('Stabilizing frames')).toBeNull();
    expect(parseFrameProgress('42%|████ | 3/7')).toBeNull();
  });

  it('returns null for a zero total, which has no meaningful fraction', () => {
    expect(parseFrameProgress('frame 0/0')).toBeNull();
  });
});
