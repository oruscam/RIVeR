import { Technique } from '../store/section/types';

/**
 * One marker shape per technique — LSPIV a circle, STIV a square, iWave a
 * triangle — matching the swatch classes in graphs.css/form.css
 * (.technique-swatch-lspiv/stiv/iwave). Colour alone doesn't distinguish
 * techniques for colour-blind users, so every technique also gets its own
 * shape, in the legend, the swatches and the chart markers.
 */
export const TECHNIQUE_MARKER_SHAPE: Record<Technique, 'circle' | 'square' | 'triangle'> = {
  lspiv: 'circle',
  stiv: 'square',
  iwave: 'triangle',
};
