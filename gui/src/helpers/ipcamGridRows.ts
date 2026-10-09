import { IpcamPoint } from '../store/ipcam/types';
import { ErrorGrade, ipcamErrorGrade } from './ipcamErrorGrade';
import { ipcamPointErrors } from './ipcamPointErrors';

export type ErrorSort = 'none' | 'worst' | 'best';

export interface IpcamGridRow {
  /** Index into the store's points array. Sorting never changes it. */
  id: number;
  label: string;
  X: number;
  Y: number;
  Z: number;
  selected: boolean;
  /** Reprojection error in px; null before a solve, for an unplaced point, or when stale. */
  error: number | null;
  grade: ErrorGrade | null;
}

export const nextErrorSort = (sort: ErrorSort): ErrorSort =>
  sort === 'none' ? 'worst' : sort === 'worst' ? 'best' : 'none';

const round2 = (value: number) => parseFloat(value.toFixed(2));

export const ipcamGridRows = (
  points: IpcamPoint[],
  solution: { reprojectionErrors: number[]; pointIndices?: number[] } | null,
  coordFactor: number,
  sort: ErrorSort
): IpcamGridRow[] => {
  const errors = solution
    ? new Map(ipcamPointErrors(points, solution).map((e) => [e.index, e.error]))
    : new Map<number, number | null>();

  const rows = points.map((p, id) => {
    const error = errors.get(id) ?? null;
    return {
      id,
      label: p.label,
      X: round2(p.X * coordFactor),
      Y: round2(p.Y * coordFactor),
      Z: round2(p.Z * coordFactor),
      selected: p.selected,
      error,
      grade: ipcamErrorGrade(error),
    };
  });

  if (sort === 'none') return rows;
  const sign = sort === 'worst' ? -1 : 1;
  // Array.prototype.sort is stable, so equal errors keep file order.
  return [...rows].sort((a, b) => {
    if (a.error === null && b.error === null) return 0;
    if (a.error === null) return 1;
    if (b.error === null) return -1;
    return sign * (a.error - b.error);
  });
};
