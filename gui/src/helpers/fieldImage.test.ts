import { buildRampLut, isGreyImage, recolourGreyPixels } from './fieldImage';
import type { RgbColor } from './spectrumGeometry';

const RAMP: RgbColor[] = [
  [10, 13, 18],
  [46, 125, 214],
  [169, 220, 255],
];

describe('buildRampLut', () => {
  it('starts on the first stop and ends on the last', () => {
    const lut = buildRampLut(RAMP);
    expect(Array.from(lut.slice(0, 3))).toEqual(RAMP[0]);
    expect(Array.from(lut.slice(255 * 3))).toEqual(RAMP[2]);
  });

  it('holds one colour per grey level', () => {
    expect(buildRampLut(RAMP)).toHaveLength(256 * 3);
  });
});

describe('isGreyImage', () => {
  it('accepts pixels whose channels match, give or take a decoder nudge', () => {
    expect(isGreyImage(new Uint8ClampedArray([0, 0, 0, 255, 120, 121, 119, 255, 255, 255, 255, 255]))).toBe(true);
  });

  it('rejects an image with a colour map burnt in', () => {
    // Inferno's mid orange among otherwise grey pixels.
    expect(isGreyImage(new Uint8ClampedArray([0, 0, 0, 255, 237, 105, 37, 255]))).toBe(false);
  });
});

describe('recolourGreyPixels', () => {
  it('maps each grey level through the ramp and keeps alpha', () => {
    const pixels = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 128]);
    recolourGreyPixels(pixels, buildRampLut(RAMP));
    expect(Array.from(pixels)).toEqual([...RAMP[0], 255, ...RAMP[2], 128]);
  });
});
