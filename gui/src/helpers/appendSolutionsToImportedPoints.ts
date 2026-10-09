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

  // The backend answers for the points placed on the image only (the handler drops x = y = 0), in
  // points order: its arrays, and point_indices, address that placed subset, not the points array.
  let placedCount = 0;
  const placedOrder = points.map((point) => (point.x === 0 && point.y === 0 ? null : placedCount++));
  const ellipseOf = (k: number | null) =>
    k !== null && cameraSolution.uncertaintyEllipses ? (cameraSolution.uncertaintyEllipses[k] ?? null) : null;
  const projectedOf = (k: number | null) =>
    k !== null && cameraSolution.projectedPoints
      ? ((cameraSolution.projectedPoints[k] as unknown as [number, number]) ?? null)
      : null;

  if (directSolve === true) {
    newPoints = points.map((point, index) => {
      const k = placedOrder[index];
      if (point.selected === true && k !== null) {
        numPoints = numPoints + 1;
      }
      return { ...point, ellipse: ellipseOf(k), projectedPoint: projectedOf(k) };
    });
  } else {
    numPoints = cameraSolution.numPoints ? cameraSolution.numPoints : 0;
    const { pointIndices } = cameraSolution;
    newPoints = points.map((point, index) => {
      const k = placedOrder[index];
      if (k !== null && pointIndices?.includes(k)) {
        return { ...point, ellipse: ellipseOf(k), projectedPoint: projectedOf(k), selected: true };
      }
      return { ...point, ellipse: null, projectedPoint: null, selected: false };
    });
  }

  return {
    newPoints: newPoints,
    numPoints: numPoints,
  };
}

export { appendSolutionToIpcamPoints };
