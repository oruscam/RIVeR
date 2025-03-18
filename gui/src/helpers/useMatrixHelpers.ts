import { FieldValues } from "react-hook-form";
import { Point } from "../types";
import { getDistanceBetweenPoints } from "./coordinates";

/**
 * Creates a square given two diagonal points.
 * The limits of the square are set to avoid infinite squares.
 *
 * @param point1 - The first point of the diagonal.
 * @param point2 - The second point of the diagonal.
 * @returns An array of four points representing the vertices of the square.
 */

function createSquare(
  point1: Point,
  point2: Point,
  imageWidth: number,
  imageHeight: number,
): Point[] {
  // Calculate the vector of the line connecting the two points
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;

  // Calculate the length of the line
  const length = Math.sqrt(dx * dx + dy * dy);

  // Calculate the perpendicular vector to the line
  const perpDx = -dy;
  const perpDy = dx;

  // Normalize the perpendicular vector
  const perpLength = Math.sqrt(perpDx * perpDx + perpDy * perpDy);
  const unitPerpDx = perpDx / perpLength;
  const unitPerpDy = perpDy / perpLength;

  // Set coordinates limits (to avoid infinite squares)
  const topLimit = 60;
  const leftLimit = 40;
  const rightLimit = imageWidth - 40;
  const bottomLimit = imageHeight - 15;

  // Calculate the coordinates of the other two vertices of the square
  const point3: Point = {
    x: Math.max(
      leftLimit,
      Math.min(point2.x - unitPerpDx * length, rightLimit),
    ),
    y: Math.max(
      topLimit,
      Math.min(point2.y - unitPerpDy * length, bottomLimit),
    ),
  };

  const point4: Point = {
    x: Math.max(
      leftLimit,
      Math.min(point1.x - unitPerpDx * length, rightLimit),
    ),
    y: Math.max(
      topLimit,
      Math.min(point1.y - unitPerpDy * length, bottomLimit),
    ),
  };

  // Return the four points that form the square
  return [point1, point2, point3, point4];
}

function getObliquePointsDistances(coordinates: Point[]) {
  const d12 = getDistanceBetweenPoints([coordinates[0], coordinates[1]]);
  const d23 = getDistanceBetweenPoints([coordinates[1], coordinates[2]]);
  const d24 = getDistanceBetweenPoints([coordinates[1], coordinates[3]]);
  const d41 = getDistanceBetweenPoints([coordinates[0], coordinates[3]]);
  const d13 = getDistanceBetweenPoints([coordinates[0], coordinates[2]]);
  const d34 = getDistanceBetweenPoints([coordinates[2], coordinates[3]]);

  return {
    d12,
    d13,
    d41,
    d23,
    d24,
    d34,
  };
}

function adapterObliquePointsDistances(distances: FieldValues) {
  return {
    d12: parseFloat(distances.distance_12),
    d23: parseFloat(distances.distance_23),
    d34: parseFloat(distances.distance_34),
    d41: parseFloat(distances.distance_41),
    d13: parseFloat(distances.distance_13),
    d24: parseFloat(distances.distance_24),
  };
}

export {
  createSquare,
  getObliquePointsDistances,
  adapterObliquePointsDistances,
};
