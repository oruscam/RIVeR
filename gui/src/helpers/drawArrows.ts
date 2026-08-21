import { transformRealWorldToPixel } from '../../commons/coordinates';
import { createColorMap, interpolate, Normalize } from '../../commons/vectors';

/**
 * Calculates the width of an arrow based on the differences between consecutive distances.
 *
 * @param {number[]} distances - An array of distances.
 * @returns {void} This function does not return a value. It logs the calculated arrow width to the console.
 *
 * The function works by:
 * 1. Calculating the differences between consecutive distances.
 * 2. Computing the mean of these differences.
 * 3. Multiplying the mean difference by 0.8 to get the arrow width.
 * 4. Return the arrow width.
 */
const calculateArrowWidth = (distances: number[]): number => {
  let differences = [];
  for (let i = 1; i < distances.length; i++) {
    differences.push(distances[i] - distances[i - 1]);
  }

  let meanDifference = differences.reduce((acc, val) => acc + val, 0) / differences.length;

  let arrow_width = 0.8 * meanDifference;

  return arrow_width;
};

/**
 * Calculates the coordinates of the corners of an arrow pointing from one point to another.
 *
 * @param east_c - The east coordinate of the current point.
 * @param north_c - The north coordinate of the current point.
 * @param east_next - The east coordinate of the next point.
 * @param north_next - The north coordinate of the next point.
 * @param height - The height of the arrow.
 * @param width - The width of the arrow. Defaults to 0.5.
 * @returns An array of arrays:  containing two arrays: the first array contains the east coordinates of the arrow's corners,
 *          and the second array contains the north coordinates of the arrow's corners.
 *
 * The function calculates the direction vector from the current point to the next point, normalizes it,
 * and then computes an orthogonal vector to determine the arrow's width. It then calculates the coordinates
 * of the arrow's corners, including the arrow tip, and returns them.
 */
const calculateArrow = (
  east_c: number,
  north_c: number,
  east_next: number,
  north_next: number,
  height: number,
  width = 0.5
) => {
  //  Vector to next point

  let dx = east_next - east_c;
  let dy = north_next - north_c;
  const length = Math.sqrt(dx ** 2 + dy ** 2);
  dx = dx / length;
  dy = dy / length;

  // Orthogonal vector

  let ox = -dy;
  let oy = dx;

  let tip_extension = 1.2 * (width ** 2 - (width / 2) ** 2) ** 0.5;
  let total_height = height + Math.sign(height) * tip_extension;

  const corners_east = [
    east_c - (width / 2) * dx, // base left
    east_c - (width / 2) * dx + height * ox, // top left
    east_c + total_height * ox, // arrow tip
    east_c + (width / 2) * dx + height * ox, // top right
    east_c + (width / 2) * dx, // base right
    east_c - (width / 2) * dx, // back to start
  ];

  const corners_north = [
    north_c - (width / 2) * dy, // base left
    north_c - (width / 2) * dy + height * oy, // top left
    north_c + total_height * oy, // arrow tip
    north_c + (width / 2) * dy + height * oy, // top right
    north_c + (width / 2) * dy, // base right
    north_c - (width / 2) * dy, // back to start
  ];

  return [corners_east, corners_north];
};

/**
 * Calculates and transforms multiple arrows based on the given parameters.
 *
 * @param {number[]} east - Array of east coordinates.
 * @param {number[]} north - Array of north coordinates.
 * @param {number[]} magnitudes - Array of magnitudes for each vector.
 * @param {number[][]} transformationMatrix - Matrix used to transform real-world coordinates to pixel coordinates.
 * @param {number} videoWidth - Height of the video/image to scale the arrows appropriately.
 * @param {number} [arrowWidth=0.5] - Width of the arrows (optional, default is 0.5).
 * @returns {Array} An array of arrow objects, each containing transformed points and color.
 *
 * The function performs the following steps:
 * 1. Filters out invalid magnitudes (null or NaN) and stores the indices of valid entries.
 * 2. If no valid magnitudes are found, returns an empty array and a default point.
 * 3. Creates a custom color map for coloring the arrows.
 * 4. Filters the east, north, and magnitudes arrays based on valid indices.
 * 5. Calculates the next east and north coordinates for each valid index.
 * 6. Determines the maximum length of the transformed arrows to scale them appropriately.
 * 7. Scales the arrows based on the target maximum length and the transformed maximum length.
 * 8. Normalizes the magnitudes for color mapping.
 * 9. Calculates the arrow points and transforms them to pixel coordinates.
 * 10. Assigns a color to each arrow based on the normalized magnitude.
 * 11. Returns an array of arrow objects, each containing the transformed points and color.
 */
const calculateMultipleArrows = (
  east: number[],
  north: number[],
  magnitudes: (number | null)[],
  transformationMatrix: number[][],
  videoWidth: number,
  arrowWidth: number = 0.5
): Array<any> => {
  let validIndices: number[] = [];

  for (let i = 0; i < magnitudes.length; i++) {
    if (magnitudes[i] !== null && !isNaN(magnitudes[i] as number)) {
      validIndices.push(i);
    }
  }

  // validIndices = validIndices.slice(0, -1);

  if (validIndices.length === 0) {
    return [[], [0, 0]];
  }

  const customColorMap = createColorMap();

  const east_filtered = east.map((value, i) => {
    if (validIndices.includes(i)) {
      return value;
    } else {
      return 0;
    }
  });
  const north_filtered = north.map((value, i) => {
    if (validIndices.includes(i)) {
      return value;
    } else {
      return 0;
    }
  });
  const magnitudes_filtered = magnitudes.map((value, i) => {
    if (validIndices.includes(i)) {
      return value;
    } else {
      return 0;
    }
  });
  const east_next = east.map((_value, i) => {
    if (validIndices.includes(i)) {
      return east[i + 1];
    } else {
      return 0;
    }
  });
  const north_next = north.map((_value, i) => {
    if (validIndices.includes(i)) {
      return north[i + 1];
    } else {
      return 0;
    }
  });

  const targetMaxLength = videoWidth / 5; // Image Width

  let transformedMaxLength = 0;

  for (let i = 0; i < magnitudes_filtered.length - 1; i++) {
    const base = transformRealWorldToPixel(east_filtered[i], north_filtered[i], transformationMatrix);

    const tip = transformRealWorldToPixel(
      east_filtered[i] + magnitudes_filtered[i] * (-north_next[i] + north_filtered[i]),
      north_filtered[i] + magnitudes_filtered[i] * (east_next[i] - east_filtered[i]),
      transformationMatrix
    );

    // Calculate the distance between the base and the tip of the arrow
    const length = Math.sqrt(Math.pow(tip[0] - base[0], 2) + Math.pow(tip[1] - base[1], 2));

    transformedMaxLength = Math.max(transformedMaxLength, length);
  }

  const scaleFactor = transformedMaxLength > 0 ? targetMaxLength / transformedMaxLength : 1.0;

  let arrows = [];
  let min_magnitude = Math.min(...magnitudes_filtered.filter((value) => value !== 0));
  let max_magnitude = Math.max(...magnitudes_filtered.filter((value) => value !== 0));
  const norm = new Normalize(min_magnitude, max_magnitude);

  for (let i = 0; i < magnitudes_filtered.length; i++) {
    if (magnitudes_filtered[i] === 0) {
      arrows.push({
        points: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ],
        color: 'transparent',
      });
      continue;
    }

    const [corners_east, corners_north] = calculateArrow(
      east_filtered[i],
      north_filtered[i],
      east_next[i],
      north_next[i],
      magnitudes_filtered[i]! * scaleFactor,
      arrowWidth
    );

    const transformedPoints = corners_east.map((e: number, index: number) =>
      transformRealWorldToPixel(e, corners_north[index], transformationMatrix)
    );

    const normalizedValue = norm.normalize(magnitudes_filtered[i]);
    let colorIndex = parseInt(normalizedValue * 255 + '');
    colorIndex = Math.min(Math.max(0, colorIndex), 255);

    const color = customColorMap[colorIndex];

    arrows.push({
      points: transformedPoints,
      color: color,
      magnitude: magnitudes_filtered[i],
    });
  }

  return arrows;
};

/**
 * Calculate the coordinates of multiple transformed and normalized arrows with adaptive scaling
 * for a single section.
 */
const calculateMultipleArrowsAdaptative = (
  east: number[],
  north: number[],
  magnitudes: (number | null)[],
  transformationMatrix: number[][],
  imageWidth: number,
  imageHeight: number,
  width = 0.5,
  globalMin: number,
  globalMax: number,
  maxArrowSizeFraction = 0.15,
  minArrowSizeFraction = 0.02,
  boundaryMargin = 0.05
) => {
  let validIndices: number[] = [];

  for (let i = 0; i < magnitudes.length; i++) {
    if (magnitudes[i] !== null && !isNaN(magnitudes[i] as number)) {
      validIndices.push(i);
    }
  }
  if (validIndices.length === 0) {
    return [[], [0, 0]];
  }

  // validIndices = validIndices.slice(0, -1);

  const customColorMap = createColorMap();

  // Extract valid data
  const eastFiltered = east.map((value, i) => {
    if (validIndices.includes(i)) {
      return value;
    } else {
      return 0;
    }
  });
  const northFiltered = north.map((value, i) => {
    if (validIndices.includes(i)) {
      return value;
    } else {
      return 0;
    }
  });
  const magnitudesFiltered = magnitudes.map((value, i) => {
    if (validIndices.includes(i)) {
      return value;
    } else {
      return 0;
    }
  });

  const eastNext = east.map((_value, i) => {
    if (validIndices.includes(i)) {
      return east[i + 1];
    } else {
      return 0;
    }
  });
  const northNext = north.map((_value, i) => {
    if (validIndices.includes(i)) {
      return north[i + 1];
    } else {
      return 0;
    }
  });

  // Define target arrow size range based on image dimensions
  const maxTargetLength = imageWidth * maxArrowSizeFraction;
  const minTargetLength = imageWidth * minArrowSizeFraction;

  // Calculte boundary margins in pixels
  const xMargin = imageWidth * boundaryMargin;
  const yMargin = imageHeight * boundaryMargin;

  // Set up color normalization
  const minMagnitude = globalMin;
  const maxMagnitude = globalMax;

  const norm = new Normalize(minMagnitude, maxMagnitude);

  const arrows = [];
  for (let i = 0; i < magnitudesFiltered.length; i++) {
    if (magnitudesFiltered[i] === 0) {
      arrows.push({
        points: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ],
        color: 'transparent',
      });
      continue;
    }

    // Get base point in pixel coordinates
    const basePixel = transformRealWorldToPixel(eastFiltered[i], northFiltered[i], transformationMatrix);

    // Skip if base point is outside the image
    if (
      basePixel[0] < xMargin ||
      basePixel[0] > imageWidth - xMargin ||
      basePixel[1] < yMargin ||
      basePixel[1] > imageHeight - yMargin
    ) {
      continue;
    }

    // Calculate arrow direction in real-world coordinates

    let dx = eastNext[i] - eastFiltered[i];
    let dy = northNext[i] - northFiltered[i];
    const directionLength = Math.sqrt(dx ** 2 + dy ** 2);

    if (directionLength > 0) {
      dx = dx / directionLength;
      dy = dy / directionLength;
    } else {
      // Default to pointing right if direction is undefined
      dx = 1;
      dy = 0;
    }

    // Rotate 90 degrees to get perpendicular direction for streamwise velocity
    // This matches your original code which seemed to be defining arrows perpendicular to the section
    const streamwiseDx = -dy;
    const streamwiseDy = dx;

    // Create a test arrow to determine scaling
    const testMagnitude = 1;
    const testTipReal = [
      eastFiltered[i] + testMagnitude * streamwiseDx,
      northFiltered[i] + testMagnitude * streamwiseDy,
    ];

    // Transform to pixel coordinates
    const testTipPixel = transformRealWorldToPixel(testTipReal[0], testTipReal[1], transformationMatrix);

    // Calculate pixels per unit magnitude
    const pixelsPerUnit = Math.sqrt((testTipPixel[0] - basePixel[0]) ** 2 + (testTipPixel[1] - basePixel[1]) ** 2);

    // Adaptative scale factor based on position in image
    // Will be higher near image edges
    const edgeDistanceX = Math.min(basePixel[0], imageWidth - basePixel[0]) / (imageWidth / 2);
    const edgeDistanceY = Math.min(basePixel[1], imageHeight - basePixel[1]) / (imageHeight / 2);
    const edgeDistance = Math.min(edgeDistanceX, edgeDistanceY);

    // Scale inversely with distance to edge ( closer to edge = sameller arrows )
    const edgeFactor = Math.max(0.3, Math.min(edgeDistance, 1));

    // Scale based on magnitude relative to the range
    const magnitudeNormalized = (magnitudesFiltered[i]! - minMagnitude) / (maxMagnitude - minMagnitude);

    // Calculate arrow length in pixels
    let pixelLength = interpolate(magnitudeNormalized, 0, 1, minTargetLength, maxTargetLength);

    // Apply edge factor adjustment
    pixelLength *= edgeFactor;

    // Calculate arrow tip in real-world coordinates
    let scaleFactor;
    if (pixelsPerUnit > 0) {
      scaleFactor = pixelLength / (magnitudesFiltered[i]! * pixelsPerUnit);
    } else {
      scaleFactor = 1; // Fallback
    }
    // Create arrow with the calculated scale factor
    let [cornersEast, cornersNorth] = calculateArrow(
      eastFiltered[i],
      northFiltered[i],
      eastNext[i],
      northNext[i],
      magnitudesFiltered[i]! * Math.abs(scaleFactor),
      width
    );

    // Transform to pixel coordinates
    const transformedPoints = cornersEast.map((e: number, index: number) =>
      transformRealWorldToPixel(e, cornersNorth[index], transformationMatrix)
    );

    // Check if arrow extends outside image boundaries
    let pointsWithinBounds = transformedPoints.every(
      (point) => point[0] >= 0 && point[0] < imageWidth && point[1] >= 0 && point[1] < imageHeight
    );

    if (pointsWithinBounds === false) {
      const reductions = [0.75, 0.5, 0.25];
      for (const reduction of reductions) {
        // Try reducing to stay within bounds
        let [cornersEast, cornersNorth] = calculateArrow(
          eastFiltered[i],
          northFiltered[i],
          eastNext[i],
          northNext[i],
          magnitudesFiltered[i]! * Math.abs(scaleFactor) * Math.abs(reduction),
          width
        );

        // Transform to pixel coordinates
        const transformedPoints = cornersEast.map((e: number, index: number) =>
          transformRealWorldToPixel(e, cornersNorth[index], transformationMatrix)
        );

        pointsWithinBounds = transformedPoints.every(
          (point) => point[0] >= 0 && point[0] < imageWidth && point[1] >= 0 && point[1] < imageHeight
        );

        if (pointsWithinBounds === true) {
          break;
        }
      }

      if (pointsWithinBounds === false) {
        continue;
      }
    }

    // Get color based on magnitude
    const colorIndex = parseInt(norm.normalize(magnitudesFiltered[i]!) * 255 + '');
    const color = customColorMap[Math.min(Math.max(0, colorIndex), 255)];

    arrows.push({
      points: transformedPoints,
      color: color,
      magnitude: magnitudesFiltered[i],
    });
  }

  return arrows;
};

/**
 * Get global maximum and minimum magnitudes across all sections, for the shared
 * arrow color scale.
 *
 * Takes the already-resolved per-station velocities (one array per section, null
 * for a section with no data) rather than reading them off the sections — the
 * arrows are drawn from the active technique's resolved profile, so the colour
 * scale has to be built from those same numbers or the colours won't match the
 * arrows they tint. The range always spans 0, as it did before.
 */
const getGlobalMagnitudes = (magnitudesPerSection: ((number | null)[] | null)[]) => {
  let max = 0;
  let min = 0;

  for (const magnitudes of magnitudesPerSection) {
    if (!magnitudes) continue;

    const filteredMagnitude = magnitudes.filter((value): value is number => value !== null && !isNaN(value));
    if (filteredMagnitude.length === 0) continue;

    max = Math.max(max, ...filteredMagnitude);
    min = Math.min(min, ...filteredMagnitude);
  }

  return {
    max: max,
    min: min,
  };
};

/**
 * Velocity range for the colour bar in Results, spanning zero.
 *
 * Takes the section's already-resolved per-station velocities (the same array
 * the chevrons and the velocity chart use) rather than reading a fixed LSPIV
 * column off the section — the bar has to be labelled with the numbers that
 * actually coloured the glyphs, or it mislabels the scale whenever the user
 * selects STIV or iWave.
 */
const getVelocityLimits = (magnitudes: (number | null)[] | null): { min: number; max: number } => {
  let max = 0;
  let min = 0;
  if (!magnitudes) return { min, max };

  const filtered = magnitudes.filter((value): value is number => value !== null && !isNaN(value));
  if (filtered.length === 0) return { min, max };

  max = Math.max(max, ...filtered);
  min = Math.min(min, ...filtered);
  return { min, max };
};

export {
  calculateArrowWidth,
  calculateMultipleArrows,
  calculateMultipleArrowsAdaptative,
  getGlobalMagnitudes,
  getVelocityLimits,
};
