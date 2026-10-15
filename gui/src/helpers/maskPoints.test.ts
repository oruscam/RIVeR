// src/helpers/maskPoints.test.ts
import { popLastMaskPoint } from './maskPoints';

describe('popLastMaskPoint', () => {
  it('removes the last point in the array', () => {
    const points = [
      { id: 0, x: 1, y: 1 },
      { id: 1, x: 2, y: 2 },
      { id: 2, x: 3, y: 3 },
    ];
    expect(popLastMaskPoint(points)).toEqual([
      { id: 0, x: 1, y: 1 },
      { id: 1, x: 2, y: 2 },
    ]);
  });

  it('does not mutate the input array', () => {
    const points = [{ id: 0, x: 1, y: 1 }];
    const result = popLastMaskPoint(points);
    expect(points).toHaveLength(1);
    expect(result).toEqual([]);
  });

  it('returns an empty array unchanged', () => {
    expect(popLastMaskPoint([])).toEqual([]);
  });
});
