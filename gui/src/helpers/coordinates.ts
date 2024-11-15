
// * Calculate and return the Euclidean distance between two points.

import { Point } from "../types";

export const getDistanceBetweenPoints = (points: Point[]): number => {
    if (points.length === 2) {
        return Number(Math.sqrt(Math.pow(points[1].x - points[0].x, 2) + Math.pow(points[1].y - points[0].y, 2)).toFixed(2));
    }
    return 0;
}

// * Compute the pixel size based on the real world coordinates and the pixel coordinates.
// * Return the size of a pixel in the real world units.

export const computePixelSize = (pixelPoints: Point[], rwPoints: Point[]): { size: number, rw_length: number } => {
    const pixelDistance = getDistanceBetweenPoints(pixelPoints);
    const rwDistance = getDistanceBetweenPoints(rwPoints);

    const pixelSize = rwDistance / pixelDistance
    const lineLength = rwDistance

    console.log(lineLength, pixelSize)

    return { size: pixelSize, rw_length: lineLength };
}