import { paginate, splitInto, stationChunks } from './reportFlow';

describe('paginate', () => {
  const b = (id: string, height: number) => ({ id, height });

  test('packs blocks in order, adding the gap between blocks on the same page', () => {
    // 400 + 10 + 400 = 810 fits; + 10 + 300 = 1120 does not.
    expect(paginate([b('a', 400), b('b', 400), b('c', 300)], 1000, 10)).toEqual([['a', 'b'], ['c']]);
  });

  test('a block that exactly fills the remaining space stays on the page', () => {
    expect(paginate([b('a', 490), b('b', 500)], 1000, 10)).toEqual([['a', 'b']]);
  });

  test('a block taller than a page gets its own page and does not loop', () => {
    expect(paginate([b('a', 100), b('huge', 1500), b('c', 100)], 1000, 10)).toEqual([['a'], ['huge'], ['c']]);
  });

  test('no blocks: one empty page, so the report still has a page to show', () => {
    expect(paginate([], 1000, 10)).toEqual([[]]);
  });
});

describe('stationChunks', () => {
  test('a short section is one chunk', () => {
    expect(stationChunks(15)).toEqual([[0, 15]]);
  });
  test('exactly 48 stations makes no empty continuation', () => {
    expect(stationChunks(48)).toEqual([[0, 48]]);
  });
  test('250 stations: 48 in the section block, then 180, then the rest', () => {
    expect(stationChunks(250)).toEqual([
      [0, 48],
      [48, 228],
      [228, 250],
    ]);
  });
  test('no stations: one empty chunk', () => {
    expect(stationChunks(0)).toEqual([[0, 0]]);
  });
});

describe('splitInto', () => {
  test('15 rows in three columns of 5', () => {
    expect(splitInto(0, 15, 3)).toEqual([
      [0, 5],
      [5, 10],
      [10, 15],
    ]);
  });
  test('uneven counts: earlier columns are longer by at most one', () => {
    expect(splitInto(0, 16, 3)).toEqual([
      [0, 6],
      [6, 11],
      [11, 16],
    ]);
  });
  test('fewer rows than columns: no empty columns', () => {
    expect(splitInto(10, 12, 3)).toEqual([
      [10, 11],
      [11, 12],
    ]);
  });
  test('empty range: no columns', () => {
    expect(splitInto(0, 0, 3)).toEqual([]);
  });
});
