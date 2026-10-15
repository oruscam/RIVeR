import { obliqueResiduals } from './obliqueResiduals';

const square = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];
const distances = { d12: 10, d23: 10, d34: 10, d41: 10.2, d13: 14.14, d24: 14.14 };

test('solved distance from the real-world coordinates, minus the entered one', () => {
  const r = obliqueResiduals(square, distances)!;
  expect(r.map((x) => x.label)).toEqual(['1-2', '2-3', '3-4', '4-1', '1-3', '2-4']);
  expect(r[3].solved).toBeCloseTo(10);
  expect(r[3].residual).toBeCloseTo(-0.2);
  expect(r[4].solved).toBeCloseTo(Math.SQRT2 * 10);
});

test('null until the four real-world points exist', () => {
  expect(obliqueResiduals(square.slice(0, 3), distances)).toBeNull();
});
