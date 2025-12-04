/**
 * This file contains utility functions for generating color maps and vector operations.
 * It is used in Renderer and Main process.
 * @module commons/vectors
*/

import { transformPixelToRealWorld } from "./coordinates.js";

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
const createColorMap = () => {
  const colors = [
    [108, 212, 255], // Light Blue - Lowest
    [98, 198, 85], // Green - Low-mid
    [245, 191, 97], // Orange-Yellow - Mid-high
    [237, 107, 87], // Red-Orange - Highest
  ];

  const nBins = 256;
  const colorPositions = linespace(0, 1, colors.length);

  const R = zeros(nBins);
  const G = zeros(nBins);
  const B = zeros(nBins);

  const linspaceBins = linespace(0, 1, nBins);

  for (let i = 0; i < colors.length - 1; i++) {
    const mask = linspaceBins.map((value) => value >= colorPositions[i] && value <= colorPositions[i + 1]);
    const segmentPositions = linespace(0, 1, mask.filter(Boolean).length);

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

  return R.map((_, i) => `rgb(${R[i]}, ${G[i]}, ${B[i]})`);
};

/**
 * Generates a sequence of equally spaced numbers over a specified range.
 *
 * @param {number} start
 * @param {number} end
 * @param {number} n
 * @returns {number[]}
 */
const linespace = (start, end, n) => {
  const step = (end - start) / (n - 1);
  return Array.from({ length: n }, (_, i) => start + step * i);
};

/**
 * Generates an array of zeros with the specified length.
 *
 * @param {number} length
 * @returns {number[]}
 */
const zeros = (length) => {
  return Array.from({ length }, () => 0);
};

/**
 * Interpolates a value within a range.
 *
 * @param {number} x
 * @param {number} x0
 * @param {number} x1
 * @param {number} y0
 * @param {number} y1
 * @returns {number}
 */
const interpolate = (x, x0, x1, y0, y1) => {
  return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
};

/**
 * Class representing a normalization utility.
 */
class Normalize {
  constructor(vmin, vmax) {
    this.vmin = vmin;
    this.vmax = vmax;
  }

  /**
   * Normalize a given value within the specified range.
   * @param {number} value
   * @returns {number}
   */
  normalize(value) {
    return (value - this.vmin) / (this.vmax - this.vmin);
  }
}

/**
 * Safely extracts a component value from arrays/medians.
 *
 * @param {number[]|number[][]|null|undefined} arr
 * @param {number[]|null|undefined} median
 * @param {boolean} showMedian
 * @param {number} activeImage
 * @param {number} index
 * @returns {number|null}
 */
const getComponent = (arr, median, showMedian, activeImage, index) => {
  if (showMedian) return median ? median[index] : null;

  if (Array.isArray(arr)) {
    return Array.isArray(arr[0])
      ? (arr[activeImage] && arr[activeImage][index] !== undefined ? arr[activeImage][index] : null)
      : (arr[index] !== undefined ? arr[index] : null);
  }

  return null;
};

/**
 * Computes quiver values and colors based on velocity.
 *
 * @param {object} quiver
 * @param {boolean} showMedian
 * @param {number} activeImage
 * @param {number} step
 * @param {number} fps
 * @param {number[][]} transformationMatrix
 * @returns {{ data: Array<{x:number,y:number,u:number,v:number,velocity:number,color:string}>, min:number, max:number }}
 */
const getQuiverValues = (quiver, showMedian, activeImage, step, fps, transformationMatrix) => {
  const { x, y: yArray, u: uArray, v: vArray, u_median, v_median } = quiver;

  let data = x
    .map((d, i) => {
      const u = getComponent(uArray, u_median, showMedian, activeImage, i);
      const v = getComponent(vArray, v_median, showMedian, activeImage, i);

      const xVal = d ?? 0;
      const yVal = yArray[i] ?? 0;

      const [x0, y0] = transformPixelToRealWorld(xVal, yVal, transformationMatrix);
      const [x1, y1] = transformPixelToRealWorld(xVal + (u ?? 0), yVal + (v ?? 0), transformationMatrix);

      const dx = x1 - x0;
      const dy = y1 - y0;

      if (u !== null && !isNaN(u) && v !== null && !isNaN(v)) {
        const velocity = Math.sqrt(dx ** 2 + dy ** 2) / (step / fps);
        return {
          x: xVal,
          y: yVal,
          u,
          v,
          velocity,
          color: "transparent",
        };
      }
      return null;
    })
    .filter((d) => d !== null);

  const velocities = data.map((d) => d.velocity);
  const minVelocity = velocities.length ? Math.min(...velocities) : 0;
  const maxVelocity = velocities.length ? Math.max(...velocities) : 1;

  const norm = new Normalize(minVelocity, maxVelocity);
  const colorMap = createColorMap();

  data = data.map((d) => {
    const normalizedValue = norm.normalize(d.velocity);
    const colorIndex = Math.min(Math.floor(normalizedValue * (colorMap.length - 1)), colorMap.length - 1);
    return { ...d, color: colorMap[colorIndex] };
  });

  return {
    data,
    min: minVelocity,
    max: maxVelocity,
  };
};

export { createColorMap, Normalize, interpolate, getQuiverValues };