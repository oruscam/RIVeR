import { isPixelHidden, isSegmentMasked, isWindowMasked, MaskRaster } from './maskCoverage';

// 10×10 raster, left half masked.
const raster: MaskRaster = {
  width: 10,
  height: 10,
  alpha: Uint8Array.from({ length: 100 }, (_, i) => (i % 10 < 5 ? 111 : 0)),
};
const identity = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

describe('maskCoverage', () => {
  it('treats masked and off-image pixels as hidden', () => {
    expect(isPixelHidden(raster, 2, 2)).toBe(true);
    expect(isPixelHidden(raster, 7, 2)).toBe(false);
    expect(isPixelHidden(raster, -1, 2)).toBe(true);
    expect(isPixelHidden(raster, 2, 10)).toBe(true);
  });

  it('flags a segment only when every sample is hidden', () => {
    expect(isSegmentMasked(raster, { x: 1, y: 0 }, { x: 1, y: 9 })).toBe(true);
    expect(isSegmentMasked(raster, { x: 1, y: 5 }, { x: 8, y: 5 })).toBe(false);
  });

  it('flags a window only when every sample is hidden', () => {
    expect(isWindowMasked(raster, { x: 2, y: 5 }, 3, identity)).toBe(true);
    expect(isWindowMasked(raster, { x: 5, y: 5 }, 4, identity)).toBe(false);
  });

  it('never masks without a raster or a window', () => {
    expect(isSegmentMasked(null, { x: 1, y: 0 }, { x: 1, y: 9 })).toBe(false);
    expect(isWindowMasked(null, { x: 2, y: 5 }, 3, identity)).toBe(false);
    expect(isWindowMasked(raster, { x: 2, y: 5 }, 0, identity)).toBe(false);
  });

  it('masks nothing when the matrix is singular', () => {
    const zeros = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    expect(isWindowMasked(raster, { x: 2, y: 5 }, 3, zeros)).toBe(false);
  });
});
