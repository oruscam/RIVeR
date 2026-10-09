import { ipcamGridRows, nextErrorSort } from './ipcamGridRows';
import { IpcamPoint } from '../store/ipcam/types';

const point = (label: string, x: number, y: number, selected = true): IpcamPoint => ({
  label,
  X: 4388445.891,
  Y: 6524020.07,
  Z: 388.04,
  x,
  y,
  selected,
  wasEstablished: true,
  image: null,
  ellipse: null,
  projectedPoint: null,
});

// B is not placed on the image (x = y = 0), so the backend returned three errors for A, C, D.
const points = [point('A', 10, 10), point('B', 0, 0), point('C', 30, 30, false), point('D', 40, 40)];
const solution = { reprojectionErrors: [3.2, 14.05, 9.1] };

describe('ipcamGridRows', () => {
  test('file order: one row per point, id is the store index, error joined by index', () => {
    const rows = ipcamGridRows(points, solution, 1, 'none');
    expect(rows.map((r) => [r.id, r.label, r.error, r.grade])).toEqual([
      [0, 'A', 3.2, 'good'],
      [1, 'B', null, null],
      [2, 'C', 14.05, 'bad'],
      [3, 'D', 9.1, 'fair'],
    ]);
    expect(rows[2].selected).toBe(false);
  });

  test('worst first, rows without an error last, ids unchanged', () => {
    expect(ipcamGridRows(points, solution, 1, 'worst').map((r) => r.id)).toEqual([2, 3, 0, 1]);
  });

  test('best first, rows without an error still last', () => {
    expect(ipcamGridRows(points, solution, 1, 'best').map((r) => r.id)).toEqual([0, 3, 2, 1]);
  });

  test('before a solve every error is null and sorting keeps file order', () => {
    const rows = ipcamGridRows(points, null, 1, 'worst');
    expect(rows.map((r) => r.id)).toEqual([0, 1, 2, 3]);
    expect(rows.every((r) => r.error === null)).toBe(true);
  });

  test('stored errors that no longer line up give null errors, not a throw', () => {
    const rows = ipcamGridRows(points, { reprojectionErrors: [1, 2] }, 1, 'worst');
    expect(rows.every((r) => r.error === null && r.grade === null)).toBe(true);
    expect(rows.map((r) => r.id)).toEqual([0, 1, 2, 3]);
  });

  test('coordinates are converted and rounded to 2 decimals', () => {
    const [row] = ipcamGridRows(points, null, 2, 'none');
    expect(row.X).toBe(8776891.78);
    expect(row.Z).toBe(776.08);
  });

  test('equal errors keep file order (stable)', () => {
    const same = { reprojectionErrors: [5, 5, 5] };
    expect(ipcamGridRows(points, same, 1, 'worst').map((r) => r.id)).toEqual([0, 2, 3, 1]);
  });
});

describe('nextErrorSort', () => {
  test('none, worst, best, none', () => {
    expect(nextErrorSort('none')).toBe('worst');
    expect(nextErrorSort('worst')).toBe('best');
    expect(nextErrorSort('best')).toBe('none');
  });
});
