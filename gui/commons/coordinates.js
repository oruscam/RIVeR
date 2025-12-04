// Calculate and return the Euclidean distance between two points.
const getDistanceBetweenPoints = (points) => {
  if (Array.isArray(points) && points.length === 2) {
    const dx = points[1].x - points[0].x;
    const dy = points[1].y - points[0].y;
    return Number(Math.sqrt(dx * dx + dy * dy).toFixed(2));
  }
  return 0;
};

// Compute the pixel size based on real-world and pixel coordinates.
// Return the size of a pixel in real-world units and the line length in real-world units.
const computePixelSize = (pixelPoints, rwPoints) => {
  const pixelDistance = getDistanceBetweenPoints(pixelPoints);
  const rwDistance = getDistanceBetweenPoints(rwPoints);

  if (pixelDistance === 0) return { size: 0, rwLength: 0 };

  const pixelSize = rwDistance / pixelDistance;
  const lineLength = rwDistance;

  return { size: pixelSize, rwLength: lineLength };
};

/**
 * Computes the real-world distance based on pixel points and pixel size.
 * @param {Array<{x:number,y:number}>} pixelPoints
 * @param {number} pixelSize
 * @returns {number}
 */
const computeRwDistance = (pixelPoints, pixelSize) => {
  const pixelDistance = getDistanceBetweenPoints(pixelPoints);
  const rwLength = pixelDistance * pixelSize;
  return parseFloat(rwLength.toFixed(2));
};

/**
 * Get the coordinates of two points that define a horizontal line in the middle of the image.
 * @param {number} imageWidth
 * @param {number} imageHeight
 * @returns {Array<{x:number,y:number}>}
 */
const getLinesCoordinates = (imageWidth, imageHeight) => {
  const lineWidth = imageWidth / 3;
  const y = imageHeight / 2;

  const point1 = { x: (imageWidth - lineWidth) / 2, y };
  const point2 = { x: (imageWidth + lineWidth) / 2, y };

  return [point1, point2];
};

/**
 * Transform pixel coordinates to real-world coordinates.
 * @param {number} x_pix
 * @param {number} y_pix
 * @param {number[][]} transformationMatrix
 * @returns {number[]}
 */
function transformPixelToRealWorld(x_pix, y_pix, transformationMatrix) {
  const pixelVector = [x_pix, y_pix, 1];

  const realWorldVector = transformationMatrix.map((row) =>
   row.reduce((sum, value, index) => sum + value * pixelVector[index], 0)
  );

  const w = realWorldVector[2] || 1;
  const normalizedVector = realWorldVector.map((value) => value / w);

  return normalizedVector.slice(0, 2);
}

/**
 * Transform real-world coordinates to pixel coordinates.
 * @param {number} x_rw
 * @param {number} y_rw
 * @param {number[][]} transformationMatrix
 * @returns {number[]}
 */
function transformRealWorldToPixel(x_rw, y_rw, transformationMatrix) {
  const invTransformationMatrix = invertMatrix(transformationMatrix);

  const realWorldVector = [x_rw, y_rw, 1];

  const pixelVector = invTransformationMatrix.map((row) =>
    row.reduce((sum, value, index) => sum + value * realWorldVector[index], 0)
  );

  const w = pixelVector[2] || 1;
  const normalizedVector = pixelVector.map((value) => value / w);

  return normalizedVector.slice(0, 2);
}

/**
 * Invert a 3x3 matrix.
 * @param {number[][]} matrix
 * @returns {number[][]}
 */
function invertMatrix(matrix) {
  const det =
    matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
    matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
    matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);

  if (det === 0) {
    throw new Error('Matrix is not invertible');
  }

  const invDet = 1 / det;

  return [
    [
      (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) * invDet,
      (matrix[0][2] * matrix[2][1] - matrix[0][1] * matrix[2][2]) * invDet,
      (matrix[0][1] * matrix[1][2] - matrix[0][2] * matrix[1][1]) * invDet,
    ],
    [
      (matrix[1][2] * matrix[2][0] - matrix[1][0] * matrix[2][2]) * invDet,
      (matrix[0][0] * matrix[2][2] - matrix[0][2] * matrix[2][0]) * invDet,
      (matrix[0][2] * matrix[1][0] - matrix[0][0] * matrix[1][2]) * invDet,
    ],
    [
      (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]) * invDet,
      (matrix[0][1] * matrix[2][0] - matrix[0][0] * matrix[2][1]) * invDet,
      (matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]) * invDet,
    ],
  ];
}

/**
 * Convert a camera matrix P to a homography matrix H for points lying on plane Z=z_level.
 * @param {number[][]} cameraMatrix - 3x4 camera matrix
 * @param {number} z_level
 * @returns {number[][]}
 */
function getTransformationFromCameraMatrix(cameraMatrix, z_level) {
  const M = cameraMatrix.map((row) => row.slice(0, 3));
  const p4 = cameraMatrix.map((row) => row[3]);

  const H = [
    [M[0][0], M[0][1], z_level * M[0][2] + p4[0]],
    [M[1][0], M[1][1], z_level * M[1][2] + p4[1]],
    [M[2][0], M[2][1], z_level * M[2][2] + p4[2]],
  ];

  const transformationMatrix = invertMatrix(H);
  return transformationMatrix;
}

export {
  computePixelSize,
  computeRwDistance,
  getDistanceBetweenPoints,
  getLinesCoordinates,
  getTransformationFromCameraMatrix,
  transformPixelToRealWorld,
  transformRealWorldToPixel,
};
