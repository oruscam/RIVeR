import { Point } from "../types";

/**
 * This function is used to calculate the midpoint of one section line and the angle between two points.
 * With this result, we can place the text in the middle of the section line and rotate it to match the angle of the section line.
 * @param point1 - The first point of the section line {x, y}
 * @param point2 - The second point of the section line {x, y}
 * @returns object with the midpoint and angle
 */

function calculateMidpointAndAngle(point1: Point, point2: Point) {
    // Calculate the midpoint between point1 and point2
    const midpoint: Point = {
      x: (point1.x + point2.x - 80) / 2, // Adjust x-coordinate and divide by 2
      y: (point1.y + point2.y) / 2 // Divide y-coordinate by 2
    };
  
    // Calculate the differences in x and y coordinates
    const deltaX = point2.x - point1.x;
    const deltaY = point2.y - point1.y;
    
    // Calculate the angle between the two points in radians
    let angle = Math.atan2(deltaY, deltaX); // atan2 returns the angle in radians
    angle = angle * (180 / Math.PI); // Convert the angle to degrees

    return { midpoint, angle };
}

/**
 * Determines the left and right points based on their x-coordinates.
 *
 * @param point1 - The first point.
 * @param point2 - The second point.
 * @returns An object containing the left point and the right point.
 */
const getLeftAndRightPoints = (point1: Point, point2: Point): { leftPoint: Point; rightPoint: Point } => {
  return point1.x < point2.x ? { leftPoint: point1, rightPoint: point2 } : { leftPoint: point2, rightPoint: point1 };
};

/**
 * Determines the lower and upper points from a given set of points based on their y-coordinates.
 *
 * @param {...Point[]} points - An array of points to evaluate. At least two points are required.
 * @returns {Object} An object containing the lower and upper points.
 * @throws {Error} If less than two points are provided.
 *
 */
const getLowerAndUpperPoints = (...points: Point[]): { lowerPoint: Point; upperPoint: Point } => {
  if (points.length < 2) throw new Error("At least two points are required");

  let lowerPoint = points[0];
  let upperPoint = points[0];

  points.forEach(point => {
    if (point.y < lowerPoint.y) lowerPoint = point;
    if (point.y > upperPoint.y) upperPoint = point;
  });

  return { lowerPoint, upperPoint };
}

/**
 * Calculates the position and rotation angle for a section of text based on two points.
 *
 * @param point1 - The first point.
 * @param point2 - The second point.
 * @returns An object containing the calculated point and rotation angle.
 *
 * The function determines the appropriate point and rotation angle based on the angle between the two points.
 * - If the angle is between 0 and -90 degrees, the right point is selected.
 * - If the angle is between -90 and -180 degrees, the upper point is selected and the rotation is adjusted by 180 degrees.
 * - If the angle is between 90 and 180 degrees, the right point is selected and the rotation is adjusted by 180 degrees.
 * - Otherwise, the upper point is selected.
 */
const getPositionSectionText = (point1: Point, point2: Point) => {
  const { angle } = calculateMidpointAndAngle(point1, point2);
  const { leftPoint, rightPoint } = getLeftAndRightPoints(point1, point2);
  const { upperPoint } = getLowerAndUpperPoints(point1, point2);

  let rotation = angle;
  let point = leftPoint;

  if (angle < 0 && angle > -90) {
    point = rightPoint;
  } else if (angle < -90 && angle > -180) {
    point = upperPoint;
    rotation += 180;
  } else if (angle > 90 && angle < 180) {
    point = rightPoint;
    rotation += 180;
  } else {
    point = upperPoint;
  }

  return { point, rotation };
}

export { calculateMidpointAndAngle, getLeftAndRightPoints, getLowerAndUpperPoints, getPositionSectionText };