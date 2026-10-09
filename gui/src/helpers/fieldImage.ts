import { getRampColor } from './spectrumGeometry';
import type { RgbColor } from './spectrumGeometry';

/** How far apart a pixel's channels may sit and still count as grey: a decoder
 *  may nudge them by a level or two, while a burnt-in colour map is far off. */
const GREY_TOLERANCE = 4;

/** The ramp sampled at each of the 256 grey levels, three bytes per level. */
export const buildRampLut = (stops: RgbColor[]): Uint8ClampedArray => {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let level = 0; level < 256; level++) {
    lut.set(getRampColor(level / 255, stops), level * 3);
  }
  return lut;
};

/**
 * Whether every pixel of an RGBA buffer is grey. The backend writes the
 * stabilization check and the calibration heatmap single-channel; a project
 * from an older RIVeR holds them with a colour map already burnt in, and those
 * must be shown as they are.
 */
export const isGreyImage = (rgba: Uint8ClampedArray): boolean => {
  for (let i = 0; i < rgba.length; i += 4) {
    const red = rgba[i];
    if (Math.abs(red - rgba[i + 1]) > GREY_TOLERANCE || Math.abs(red - rgba[i + 2]) > GREY_TOLERANCE) return false;
  }
  return true;
};

/** Replaces, in place, each grey pixel by the ramp's colour for its level. Alpha is kept. */
export const recolourGreyPixels = (rgba: Uint8ClampedArray, lut: Uint8ClampedArray): void => {
  for (let i = 0; i < rgba.length; i += 4) {
    const entry = rgba[i] * 3;
    rgba[i] = lut[entry];
    rgba[i + 1] = lut[entry + 1];
    rgba[i + 2] = lut[entry + 2];
  }
};
