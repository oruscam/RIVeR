/** A linear axis: data `min..max` mapped onto pixels `start..end`. */
export interface SpectrumAxis {
  min: number;
  max: number;
  start: number;
  end: number;
}

export type RgbColor = [number, number, number];

/**
 * The data range a row of cells covers, edge to edge.
 *
 * The axis values are cell CENTRES, so the image of n cells spans half a cell
 * beyond the first and last value. Mapping curves through this range (rather
 * than first..last) is what keeps them on the cells they describe.
 */
export const getCellExtent = (centres: number[]): { min: number; max: number } => {
  if (centres.length === 0) return { min: 0, max: 1 };
  const first = centres[0];
  const last = centres[centres.length - 1];
  if (centres.length === 1) return { min: first - 0.5, max: first + 0.5 };
  const half = Math.abs(last - first) / (centres.length - 1) / 2;
  return { min: Math.min(first, last) - half, max: Math.max(first, last) + half };
};

/** Data value to pixel. */
export const toPixel = (value: number, axis: SpectrumAxis): number => {
  const span = axis.max - axis.min || 1;
  return axis.start + ((value - axis.min) / span) * (axis.end - axis.start);
};

/** Pixel to data value, the inverse of toPixel. */
export const fromPixel = (pixel: number, axis: SpectrumAxis): number => {
  const span = axis.end - axis.start || 1;
  return axis.min + ((pixel - axis.start) / span) * (axis.max - axis.min);
};

/**
 * A dispersion curve as an SVG path.
 *
 * The frequency axis is passed with its pixels already inverted (start at the
 * bottom, end at the top), since SVG's y grows downward while frequency grows
 * upward — without that the curve would be mirrored against the ridge it
 * traces.
 */
export const curveToPath = (curve: [number, number][], kAxis: SpectrumAxis, omegaAxis: SpectrumAxis): string =>
  curve
    .map(([k, omega], i) => {
      const x = Number(toPixel(k, kAxis).toFixed(2));
      const y = Number(toPixel(omega, omegaAxis).toFixed(2));
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');

/**
 * Round tick values inside [min, max], about `target` of them, on a 1/2/5
 * step. Kept local (rather than d3's ticks) so it stays a pure function the
 * node test environment can run.
 */
export const getTicks = (min: number, max: number, target = 5): number[] => {
  const span = max - min;
  if (!(span > 0) || target < 1) return [];
  const rough = span / target;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const step = (residual >= 5 ? 10 : residual >= 2.5 ? 5 : residual >= 1.5 ? 2 : 1) * magnitude;
  const ticks: number[] = [];
  for (let i = Math.ceil(min / step - 1e-9); i * step <= max + step * 1e-9; i++) {
    // Rounded so 0.1 * 3 reads 0.3, and -0 reads 0.
    ticks.push(Number((i * step).toPrecision(12)) || 0);
  }
  return ticks;
};

/** Index of the cell whose centre is nearest to `value`, or -1 off the axis. */
export const getNearestIndex = (centres: number[], value: number): number => {
  if (centres.length === 0) return -1;
  const { min, max } = getCellExtent(centres);
  if (value < min || value > max) return -1;
  let best = 0;
  for (let i = 1; i < centres.length; i++) {
    if (Math.abs(centres[i] - value) < Math.abs(centres[best] - value)) best = i;
  }
  return best;
};

export interface SpectrumPoint {
  /** Wavelength 2π/|k| in metres; null at k = 0, where it is undefined. */
  wavelength: number | null;
  /** Phase speed ω/k in m/s, signed like k; null at k = 0. */
  phaseSpeed: number | null;
}

/**
 * What a point of the wavenumber-frequency plane means physically: a wave of
 * length 2π/|k| travelling along this plane's axis at ω/k. A point on the
 * advected line therefore reads the surface velocity directly.
 */
export const describeSpectrumPoint = (k: number, omega: number): SpectrumPoint => {
  if (Math.abs(k) < 1e-9) return { wavelength: null, phaseSpeed: null };
  return { wavelength: (2 * Math.PI) / Math.abs(k), phaseSpeed: omega / k };
};

/** Parse `#rgb`, `#rrggbb` or `rgb(r, g, b)`; null for anything else. */
export const parseColor = (value: string): RgbColor | null => {
  const text = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
  if (hex) {
    const digits = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
    return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16)) as RgbColor;
  }
  const rgb = /^rgba?\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)/i.exec(text);
  return rgb ? ([Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] as RgbColor) : null;
};

/**
 * Colour at position t (0..1) of a ramp of evenly spaced stops, clamped at
 * both ends.
 */
export const getRampColor = (t: number, stops: RgbColor[]): RgbColor => {
  if (stops.length === 0) return [0, 0, 0];
  if (stops.length === 1) return stops[0];
  const clamped = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  const position = clamped * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(position));
  const local = position - index;
  const from = stops[index];
  const to = stops[index + 1];
  return [0, 1, 2].map((c) => Math.round(from[c] + (to[c] - from[c]) * local)) as RgbColor;
};

/**
 * RGBA bytes for a plane of spectrum values, one pixel per cell, with the
 * HIGHEST frequency in the first row (the image's top edge). `rows` come from
 * the sidecar lowest frequency first, hence the reversal.
 *
 * Values at or above `clipMax` take the ramp's last colour; a clip of 0 or
 * less paints everything with the first.
 */
export const getSpectrumPixels = (rows: number[][], clipMax: number, stops: RgbColor[]): Uint8ClampedArray => {
  const height = rows.length;
  const width = height > 0 ? rows[0].length : 0;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let r = 0; r < height; r++) {
    const row = rows[height - 1 - r];
    for (let c = 0; c < width; c++) {
      const [red, green, blue] = getRampColor(clipMax > 0 ? row[c] / clipMax : 0, stops);
      const offset = (r * width + c) * 4;
      pixels[offset] = red;
      pixels[offset + 1] = green;
      pixels[offset + 2] = blue;
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
};
