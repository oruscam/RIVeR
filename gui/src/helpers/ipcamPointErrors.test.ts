import { ipcamPointErrors } from './ipcamPointErrors';

// a, c, d and e are placed on the image; b has no image position (x = y = 0) so the CLI never sees it.
const pt = (label: string, x: number, y: number, selected = true) => ({ label, x, y, selected });
const points = [pt('a', 10, 20), pt('b', 0, 0), pt('c', 30, 40, false), pt('d', 50, 60), pt('e', 70, 80)];

test('direct solve: errors follow the placed points in order; used = selected', () => {
  const rows = ipcamPointErrors(points, { reprojectionErrors: [1, 2, 3, 4] });
  expect(rows.map((r) => [r.index, r.error, r.used])).toEqual([
    [0, 1, true],
    [2, 2, false],
    [3, 3, true],
    [4, 4, true],
  ]);
});

test('optimized solve: errors still follow the placed points; pointIndices index the placed subset', () => {
  // The optimizer kept placed points #1 and #3 (c and e), not points[1] and points[3].
  const rows = ipcamPointErrors(points, { reprojectionErrors: [1, 2, 3, 4], pointIndices: [1, 3] });
  expect(rows.map((r) => [r.label, r.error, r.used])).toEqual([
    ['a', 1, false],
    ['c', 2, true],
    ['d', 3, false],
    ['e', 4, true],
  ]);
});

test('errors are withheld when they no longer line up with the placed points', () => {
  const rows = ipcamPointErrors(points, { reprojectionErrors: [1, 2, 3] });
  expect(rows).toHaveLength(4);
  expect(rows.every((r) => r.error === null)).toBe(true);
});
