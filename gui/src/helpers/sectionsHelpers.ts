import { CanvasPoint, FormPoint, Point } from "../types";

const getNewCanvasPositions = ( canvasPoints: CanvasPoint, flag1: boolean, flag2: boolean ) => {


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

    if( index === null){
        flag1 = true,
        flag2 = true
    } else if ( index === 0){
        flag1 = true
    } else { 
        flag2 = true
    }

    newPoints = points.map((point: Point) => {
        return {
            x: parseFloat((point.x * factor).toFixed(1)),
            y: parseFloat((point.y * factor).toFixed(1))
        }
    })

    return { points: newPoints, firstFlag: flag1, secondFlag: flag2 }
}

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
const setChangesByForm = ( formPoint: FormPoint, dirPoints: Point[], flag1, flag2 ) => {
    const { point, position } = formPoint;
    
    let newPoints;

    if ( position === 'x1' && point !== dirPoints[0].x){
        newPoints = [{x: parseFloat(point as string), y: dirPoints[0].y}, {x: dirPoints[1].x, y: dirPoints[1].y}]
        flag1 = true
    } else if ( position === 'y1' && point !== dirPoints[0].y){
        newPoints = [{x: dirPoints[0].x, y: parseFloat(point as string)}, {x: dirPoints[1].x, y: dirPoints[1].y}]
        flag1 = true
    } else if ( position === 'x2' && point !== dirPoints[1].x){
        newPoints = [{x: dirPoints[0].x, y: dirPoints[0].y}, {x: parseFloat(point as string), y: dirPoints[1].y}]
        flag2 = true
    } else if ( position === 'y2' && point !== dirPoints[1].y){
        newPoints = [{x: dirPoints[0].x, y: dirPoints[0].y}, {x: dirPoints[1].x, y: parseFloat(point as string)}]
        flag2 = true
    } else {
        newPoints = dirPoints
    }

    return { points: newPoints, firstFlag: flag1, secondFlag: flag2 }
}



export { getNewCanvasPositions, setChangesByForm }