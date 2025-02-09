import { importedPoint } from "../store/matrix/types";
import { cameraSolution } from "../types";

/**
 * Appends camera solution data to imported points.
 * 
 * @param importedPoints - Array of imported points.
 * @param cameraSolution - Camera solution containing uncertainty ellipses and projected points.
 * @returns Array of imported points with appended camera solution data.
 */
function appendSolutionToImportedPoints(importedPoints: importedPoint[], cameraSolution: cameraSolution): importedPoint[] {
    let counter: number = 0; 
    
    const newImportedPoints = importedPoints.map((point, index) => {
        if (point.selected === false) {
            counter = counter + 1;
            return {
                ...point,
                ellipse: undefined,
                projectedPoint: undefined,
            };
        } else {
            return {
                ...point,
                ellipse: cameraSolution.uncertaintyEllipses ? cameraSolution.uncertaintyEllipses[index - counter] : undefined,
                projectedPoint: cameraSolution.projectedPoints ? cameraSolution.projectedPoints[index - counter] as unknown as [number, number] : undefined
            };
        }
    });

    return newImportedPoints;
}

export { appendSolutionToImportedPoints}