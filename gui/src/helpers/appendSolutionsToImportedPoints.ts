import { importedPoint } from "../store/matrix/types";
import { cameraSolution } from "../types";

/**
 * Appends camera solution data to imported points.
 * 
 * @param importedPoints - Array of imported points.
 * @param cameraSolution - Camera solution containing uncertainty ellipses and projected points.
 * @param directSolve - Boolean indicating if the points were directly solved.
 * @returns Array of imported points with appended camera solution data.
 */

function appendSolutionToImportedPoints(importedPoints: importedPoint[], cameraSolution: cameraSolution, directSolve: boolean): { newImportedPoints: importedPoint[], numPoints: number } {
    let counter: number = 0; 
    let newImportedPoints: importedPoint[] = [];
    let numPoints: number = 0

    if ( directSolve === true ) {
        newImportedPoints = importedPoints.map((point, index) => {
            if ( point.selected === false ) {
                counter = counter + 1;
                return {
                    ...point,
                    ellipse: undefined,
                    projectedPoint: undefined,
                };
            } else {
                numPoints = numPoints + 1;
                return {
                    ...point,
                    ellipse: cameraSolution.uncertaintyEllipses ? cameraSolution.uncertaintyEllipses[index - counter] : undefined,
                    projectedPoint: cameraSolution.projectedPoints ? cameraSolution.projectedPoints[index - counter] as unknown as [number, number] : undefined
                };
            }
        });
    } else {
        numPoints = cameraSolution.numPoints ? cameraSolution.numPoints : 0;
        const { pointIndices } = cameraSolution;
        newImportedPoints = importedPoints.map((point, index) => {
            if ( pointIndices?.includes(index) ) {
                return {
                    ...point,
                    ellipse: cameraSolution.uncertaintyEllipses ? cameraSolution.uncertaintyEllipses[index] : undefined,
                    projectedPoint: cameraSolution.projectedPoints ? cameraSolution.projectedPoints[index] as unknown as [number, number] : undefined,
                    selected: true
                };
            } else {
                return {
                    ...point,
                    ellipse: undefined,
                    projectedPoint: undefined,
                    selected: false
                }
            }
        })
    }

    return {
        newImportedPoints: newImportedPoints,
        numPoints: numPoints
    };
}

export { appendSolutionToImportedPoints}