/**
 * This file contains utility functions for generating color maps and vector operations.
 * It is used in Renderer and Main process.
 * @module commons/vectors
*/

import { transformPixelToRealWorld } from "./coordinates";
import { Quiver, QuiverData, QuiverValuesResult } from "./types";

/**
 * Generates a custom colormap with a smooth gradient transition between predefined colors.
 *
 * The colormap is created by interpolating between the following colors:
 * - Light Blue (Lowest)
 * - Green (Low-mid)
 * - Orange-Yellow (Mid-high)
 * - Red-Orange (Highest)
 *
 * The function uses 256 bins to create a smooth gradient transition.
 *
 * @returns {string[]} An array of RGB color strings representing the custom colormap.
 */
const createColorMap = (): string[] => {
  const colors = [
    [108, 212, 255], // Light Blue - Lowest
    [98, 198, 85], // Green - Low-mid
    [245, 191, 97], // Orange-Yellow - Mid-high
    [237, 107, 87], //Red-Orange - Highest
  ];

  const nBins = 256;
  const colorPositions = linespace(0, 1, colors.length);

  const R = zeros(nBins);
  const G = zeros(nBins);
  const B = zeros(nBins);

  const linspaceBins = linespace(0, 1, nBins);

  // For each color segment
  for (let i = 0; i < colors.length - 1; i++) {
    // Find indices for this segment
    const mask = linspaceBins.map((value) => value >= colorPositions[i] && value <= colorPositions[i + 1]);

    // Calculate position within segment
    const segmentPositions = linespace(0, 1, mask.filter(Boolean).length);

    // Interpolate each channel
    let segmentIndex = 0;
    for (let j = 0; j < nBins; j++) {
      if (mask[j]) {
        R[j] = interpolate(segmentPositions[segmentIndex], 0, 1, colors[i][0], colors[i + 1][0]);
        G[j] = interpolate(segmentPositions[segmentIndex], 0, 1, colors[i][1], colors[i + 1][1]);
        B[j] = interpolate(segmentPositions[segmentIndex], 0, 1, colors[i][2], colors[i + 1][2]);
        segmentIndex++;
      }
    }
  }

  // Create the colormap
  const customCmap = R.map((_, i) => `rgb(${R[i]}, ${G[i]}, ${B[i]})`);

  return customCmap;
};


/**
 * Generates a sequence of equally spaced numbers over a specified range.
 *
 * @param start - The start value of the sequence.
 * @param end - The end value of the sequence.
 * @param num - The number of values to generate.
 * @returns An array of equally spaced numbers.
 */
const linespace = (start: number, end: number, n: number) => {
  const step = (end - start) / (n - 1);
  return Array.from({ length: n }, (_, i) => start + step * i);
};

/**
 * Generates an array of zeros with the specified length.
 *
 * @param length - The length of the array.
 * @returns An array of zeros.
 */
const zeros = (length: number): number[] => {
  return Array.from({ length }, () => 0);
};

/**
 * Interpolates a value within a range.
 *
 * @param x - The value to interpolate.
 * @param x0 - The start of the range.
 * @param x1 - The end of the range.
 * @param y0 - The value at the start of the range.
 * @param y1 - The value at the end of the range.
 * @returns The interpolated value.
 */
const interpolate = (x: number, x0: number, x1: number, y0: number, y1: number): number => {
  return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
};

/**
 * Class representing a normalization utility.
 */
class Normalize {
  /**
   * The minimum value of the range.
   */
  vmin: number;

  /**
   * The maximum value of the range.
   */
  vmax: number;

  /**
   * Create a Normalize instance.
   * @param vmin - The minimum value of the range.
   * @param vmax - The maximum value of the range.
   */
  constructor(vmin: number, vmax: number) {
    this.vmin = vmin;
    this.vmax = vmax;
  }

  /**
   * Normalize a given value within the specified range.
   * @param value - The value to be normalized.
   * @returns The normalized value as a number between 0 and 1.
   */
  normalize(value: number): number {
    return (value - this.vmin) / (this.vmax - this.vmin);
  }
}
const getComponent = (
  arr: number[] | number[][] | null | undefined,
  median: number[] | null | undefined,
  showMedian: boolean,
  activeImage: number,
  index: number
) => {
  if (showMedian) return median ? median[index] : null;

  if (Array.isArray(arr)) {
    return Array.isArray(arr[0])
      ? (arr as number[][])[activeImage]?.[index] ?? null
      : (arr as number[])[index] ?? null;
  }

  return null;
};


const getQuiverValues = (
  quiver: Quiver,
  showMedian: boolean,
  activeImage: number,
  step: number,
  fps: number,
  transformationMatrix: number[][]
): QuiverValuesResult => {
  const { x, y: yArray, u: uArray, v: vArray, u_median, v_median } = quiver;

  let data = x.map((d, i: number) => {
    const u = getComponent(uArray, u_median, showMedian, activeImage, i);
    const v = getComponent(vArray, v_median, showMedian, activeImage, i);

    const x = d ?? 0;
    const y = yArray[i] ?? 0;
    
    const [x0, y0] = transformPixelToRealWorld(x, y, transformationMatrix);
    const [x1, y1] = transformPixelToRealWorld(x + (u ?? 0), y + (v ?? 0), transformationMatrix);

    const dx = x1 - x0;
    const dy = y1 - y0;

    // Only include if both u and v are valid numbers
    if (u !== null && !isNaN(u) && v !== null && !isNaN(v)) {
      const velocity = Math.sqrt(dx ** 2 + dy ** 2) / (step / fps);
      return {
        x: x,
        y: y,
        u: u,
        v: v,
        velocity: velocity,
        color: 'transparent', // Add default color property to satisfy QuiverData interface
      };
    }
    return null;
  }).filter((d): d is QuiverData => d !== null);

  const minVelocity = Math.min(...data.map(d => d.velocity ?? Infinity));
  const maxVelocity = Math.max(...data.map(d => d.velocity ?? -Infinity));

  const norm = new Normalize(minVelocity, maxVelocity);

  const colorMap = createColorMap();

  data = data.map((d) => {
    const normalizedValue = norm.normalize(d.velocity!);
    
    const colorIndex = Math.min(Math.floor(normalizedValue * (colorMap.length - 1)), colorMap.length - 1);
    return {
      ...d,
      color: colorMap[colorIndex],
    }
  })

  return {
    data: data,
    min: minVelocity,
    max: maxVelocity
  };
};

export { createColorMap, Normalize, interpolate, getQuiverValues };