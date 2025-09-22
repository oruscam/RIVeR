import { BackendCameraSolution, IpcamPoint } from '../store/ipcam/types';


/**
 * Appends camera solution data to imported points.
 *
 * @param importedPoints - Array of imported points.
 * @param cameraSolution - Camera solution containing uncertainty ellipses and projected points.
 * @param directSolve - Boolean indicating if the points were directly solved.
 * @returns Array of imported points with appended camera solution data.
 */

function appendSolutionToIpcamPoints(
  points: IpcamPoint[],
  cameraSolution: BackendCameraSolution,
  directSolve: boolean
): { newPoints: IpcamPoint[]; numPoints: number } {
  let newPoints: IpcamPoint[] = [];
  let numPoints: number = 0;

  if (directSolve === true) {
    newPoints = points.map((point, index) => {
      if (point.selected === true) {
        numPoints = numPoints + 1;
      }
      return {
        ...point,
        ellipse: cameraSolution.uncertaintyEllipses ? cameraSolution.uncertaintyEllipses[index] : null,
        projectedPoint: cameraSolution.projectedPoints
          ? (cameraSolution.projectedPoints[index] as unknown as [number, number])
          : null,
      };
    });
  } else {
    numPoints = cameraSolution.numPoints ? cameraSolution.numPoints : 0;
    const { pointIndices } = cameraSolution;
    newPoints = points.map((point, index) => {
      if (pointIndices?.includes(index)) {
        return {
          ...point,
          ellipse: cameraSolution.uncertaintyEllipses ? cameraSolution.uncertaintyEllipses[index] : null,
          projectedPoint: cameraSolution.projectedPoints
            ? (cameraSolution.projectedPoints[index] as unknown as [number, number])
            : null,
          selected: true,
        };
      } else {
        return {
          ...point,
          ellipse: null,
          projectedPoint: null,
          selected: false,
        };
      }
    });
  }

  return {
    newPoints: newPoints,
    numPoints: numPoints,
  };
}

export { appendSolutionToIpcamPoints };
