import { appendSolutionToIpcamPoints } from './appendSolutionsToImportedPoints';
import { BackendCameraSolution, IpcamPoint } from '../store/ipcam/types';

const point = (label: string, x: number, y: number, selected = true): IpcamPoint => ({
  label,
  X: 0,
  Y: 0,
  Z: 0,
  x,
  y,
  selected,
  wasEstablished: true,
  image: null,
  ellipse: null,
  projectedPoint: null,
});

const ellipse = (id: number) => ({ center: [id, id], width: 1, height: 1, angle: 0 });

// B is not placed on the image, so the backend answers for A, C, D only, in that order.
const points = [point('A', 10, 10), point('B', 0, 0), point('C', 30, 30), point('D', 40, 40)];
const solution = {
  uncertaintyEllipses: [ellipse(0), ellipse(2), ellipse(3)],
  projectedPoints: [
    [11, 11],
    [31, 31],
    [41, 41],
  ],
} as unknown as BackendCameraSolution;

describe('appendSolutionToIpcamPoints with a point that is not placed', () => {
  test('direct solve: each placed point gets its own ellipse and projection, the unplaced one none', () => {
    const { newPoints } = appendSolutionToIpcamPoints(points, { ...solution }, true);
    expect(newPoints.map((p) => p.projectedPoint)).toEqual([[11, 11], null, [31, 31], [41, 41]]);
    expect(newPoints.map((p) => p.ellipse?.center ?? null)).toEqual([[0, 0], null, [2, 2], [3, 3]]);
  });

  test('direct solve counts the ticked points that are placed', () => {
    expect(appendSolutionToIpcamPoints(points, { ...solution }, true).numPoints).toBe(3);
  });

  test('optimized: point_indices address the placed points, so C and D are the ones kept', () => {
    const optimized = { ...solution, pointIndices: [1, 2], numPoints: 2 } as BackendCameraSolution;
    const { newPoints, numPoints } = appendSolutionToIpcamPoints(points, optimized, false);
    expect(newPoints.map((p) => p.selected)).toEqual([false, false, true, true]);
    expect(newPoints.map((p) => p.projectedPoint)).toEqual([null, null, [31, 31], [41, 41]]);
    expect(numPoints).toBe(2);
  });

  test('with every point placed nothing shifts', () => {
    const all = [point('A', 10, 10), point('C', 30, 30), point('D', 40, 40)];
    const { newPoints } = appendSolutionToIpcamPoints(all, { ...solution }, true);
    expect(newPoints.map((p) => p.projectedPoint)).toEqual([
      [11, 11],
      [31, 31],
      [41, 41],
    ]);
  });
});
