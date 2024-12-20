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

export { calculateMidpointAndAngle };