import { Point } from "../types";

// * Calculate and return the Euclidean distance between two points.

const getDistanceBetweenPoints = (points: Point[]): number => {
    if (points.length === 2) {
        return Number(Math.sqrt(Math.pow(points[1].x - points[0].x, 2) + Math.pow(points[1].y - points[0].y, 2)).toFixed(2));
    }
    return 0;
}

// * Compute the pixel size based on the real world coordinates and the pixel coordinates.
// * Return the size of a pixel in the real world units and the length of the line in the real world units.

const computePixelSize = (pixelPoints: Point[], rwPoints: Point[]): { size: number, rw_length: number } => {
    const pixelDistance = getDistanceBetweenPoints(pixelPoints);
    const rwDistance = getDistanceBetweenPoints(rwPoints);

    const pixelSize = rwDistance / pixelDistance
    const lineLength = rwDistance

    return { size: pixelSize, rw_length: lineLength };
}

/**
 * Transform pixel coordinates to real-world coordinates.
 *
 * @param {number} x_pix - X coordinate in pixels.
 * @param {number} y_pix - Y coordinate in pixels.
 * @param {number[][]} transformationMatrix - The transformation matrix.
 * @returns {number[]} An array containing the real-world coordinates [x, y].
 */
 
function transformPixelToRealWorld(x_pix: number, y_pix: number, transformationMatrix: number[][]): number[] {
    // Create the pixel coordinate vector in homogeneous coordinates
    const pixelVector = [x_pix, y_pix, 1];

    // Calculate the real-world coordinates in homogeneous coordinates
    const realWorldVector = transformationMatrix.map(row => 
        row.reduce((sum, value, index) => sum + value * pixelVector[index], 0)
    );

    // Normalize the real-world coordinates
    const normalizedVector = realWorldVector.map(value => value / realWorldVector[2]);

    // Return the x and y real-world coordinates
    return normalizedVector.slice(0, 2);
}


/**
 * Transform real-world coordinates to pixel coordinates.
 *
 * @param {number} x_rw - X coordinate in real-world units.
 * @param {number} y_rw - Y coordinate in real-world units.
 * @param {number[][]} transformationMatrix - The transformation matrix.
 * @returns {number[]} An array containing the pixel coordinates [x, y].
 */

function transformRealWorldToPixel(x_rw: number, y_rw: number, transformationMatrix: number[][]): number[] {
    // Invert the transformation matrix to map from pixel to real-world coordinates
    const invTransformationMatrix = invertMatrix(transformationMatrix);


    // Create the real-world coordinate vector in homogeneous coordinates
    const realWorldVector = [x_rw, y_rw, 1];

    // Calculate the pixel coordinates in homogeneous coordinates
    const pixelVector = invTransformationMatrix.map(row => 
        row.reduce((sum, value, index) => sum + value * realWorldVector[index], 0)
    );

    // Normalize the pixel coordinates
    const normalizedVector = pixelVector.map(value => value / pixelVector[2]);

    // Return the x and y pixel coordinates
    return normalizedVector.slice(0, 2);
}

/**
 * Invert a 3x3 matrix.
 *
 * @param {number[][]} matrix - The 3x3 matrix to invert.
 * @returns {number[][]} The inverted matrix.
 */

function invertMatrix(matrix: number[][]): number[][] {
    const det = matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
                matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
                matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);

    if (det === 0) {
        throw new Error("Matrix is not invertible");
    }

    const invDet = 1 / det;

    return [
        [
            (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) * invDet,
            (matrix[0][2] * matrix[2][1] - matrix[0][1] * matrix[2][2]) * invDet,
            (matrix[0][1] * matrix[1][2] - matrix[0][2] * matrix[1][1]) * invDet
        ],
        [
            (matrix[1][2] * matrix[2][0] - matrix[1][0] * matrix[2][2]) * invDet,
            (matrix[0][0] * matrix[2][2] - matrix[0][2] * matrix[2][0]) * invDet,
            (matrix[0][2] * matrix[1][0] - matrix[0][0] * matrix[1][2]) * invDet
        ],
        [
            (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]) * invDet,
            (matrix[0][1] * matrix[2][0] - matrix[0][0] * matrix[2][1]) * invDet,
            (matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]) * invDet
        ]
    ];
}


/**
 * Convert a camera matrix P to a homography matrix H for points lying on plane Z=z_level.
 *
 * @param {number[][]} P - 3x4 camera matrix
 * @param {number} z_level - Z coordinate of the plane
 * @returns {number[][]} - 3x3 transformation matrix
 */
function getTransformationFromCameraMatrix(cameraMatrix: number[][], z_level: number) : number[][] {
    // The cameraMatrix can be written as [M|p4] where M is 3x3 and p4 is 3x1
    const M = cameraMatrix.map(row => row.slice(0, 3)); // First three columns
    const p4 = cameraMatrix.map(row => row[3]); // Last column

    // For points on plane Z=z_level, the homography is:
    // H = M[:, [0,1]] + z_level * M[:, [2]] + p4
    const H = [
        [M[0][0], M[0][1], z_level * M[0][2] + p4[0]],
        [M[1][0], M[1][1], z_level * M[1][2] + p4[1]],
        [M[2][0], M[2][1], z_level * M[2][2] + p4[2]]
    ];

    // Calculate the inverse of H
    const transformationMatrix = invertMatrix(H);
    
    return transformationMatrix;
}



export {
    computePixelSize,
    getDistanceBetweenPoints,
    transformPixelToRealWorld,
    transformRealWorldToPixel,
    getTransformationFromCameraMatrix
}