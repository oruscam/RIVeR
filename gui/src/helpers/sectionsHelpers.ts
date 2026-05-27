import { CanvasPoint, FormPoint, Point } from '../types';

const getNewCanvasPositions = (canvasPoints: CanvasPoint, flag1: boolean, flag2: boolean) => {
  /**
   * The newPoints variable is used to store the new points after the modification
   */

  let newPoints;

  const { points, factor, index } = canvasPoints;

  /**
   * If index is null, the user is creating a new line.
   * If index is 0, the user is modifying the first point.
   * If index is 1, the user is modifying the second point.
   */

  if (index === null) {
    (flag1 = true), (flag2 = true);
  } else if (index === 0) {
    flag1 = true;
  } else {
    flag2 = true;
  }

  newPoints = points.map((point: Point) => {
    return {
      x: parseFloat((point.x * factor).toFixed(1)),
      y: parseFloat((point.y * factor).toFixed(1)),
    };
  });

  return { points: newPoints, firstFlag: flag1, secondFlag: flag2 };
};

/**
 * Updates the coordinates of points based on the given form input and position.
 *
 * @param {FormPoint} formPoint - An object containing the point value and its position ('x1', 'y1', 'x2', 'y2').
 * @param {Point[]} dirPoints - An array of two points representing the current coordinates.
 * @param {boolean} flag1 - A flag indicating if the first point has been changed.
 * @param {boolean} flag2 - A flag indicating if the second point has been changed.
 * @returns {{ points: Point[], firstFlag: boolean, secondFlag: boolean }} An object containing the updated points and flags.
 *
 * The function checks the position of the form point and updates the corresponding coordinate if it has changed.
 * It sets the appropriate flag to true if a change is detected. If no changes are detected, it returns the original points.
 */
const setChangesByForm = (formPoint: FormPoint, dirPoints: Point[]) => {
  const { value, position } = formPoint;

  let newPoints = dirPoints;

  let flag1 = false;
  let flag2 = false;
  let flag3 = false;
  let flag4 = false

  for (let i = 1; i <= dirPoints.length; i++) {
    if (position === `x${i}`) {
      if (value !== dirPoints[i - 1].x) {
        newPoints = [...dirPoints];
        newPoints[i - 1] = { x: parseFloat(value as string), y: dirPoints[i - 1].y };
        if (i === 1) flag1 = true;
        if (i === 2) flag2 = true;
        if (i === 3) flag3 = true;
        if (i === 4) flag4 = true;
      }
    } else if (position === `y${i}`) {
      if (value !== dirPoints[i - 1].y) {
        newPoints = [...dirPoints];
        newPoints[i - 1] = { x: dirPoints[i - 1].x, y: parseFloat(value as string) };
        if (i === 1) flag1 = true;
        if (i === 2) flag2 = true;
        if (i === 3) flag3 = true;
        if (i === 4) flag4 = true;
      }
    }
  }




  return { points: newPoints, firstFlag: flag1, secondFlag: flag2 };
};

export { getNewCanvasPositions, setChangesByForm };
