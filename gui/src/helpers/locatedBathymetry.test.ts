import { applyLocatedBathymetry, hasMissingBathymetry, loadedBathymetry } from './locatedBathymetry';
import { getBathimetryValues } from './getBathimetryValues';

const valley = [
  { x: 0, y: 10 },
  { x: 5, y: 4 },
  { x: 10, y: 1 },
  { x: 15, y: 4 },
  { x: 20, y: 10 },
];

describe('loadedBathymetry', () => {
  it('passes a found profile through', () => {
    expect(loadedBathymetry({ line: valley, name: 'bathy.csv' }, '/p/bathy.csv')).toEqual({
      line: valley,
      name: 'bathy.csv',
    });
  });

  it('gives a missing file an empty profile and its file name, so the section still loads', () => {
    expect(loadedBathymetry({ error: new Error('ENOENT') }, '/gone/dir/bathy.csv')).toEqual({
      line: [],
      name: 'bathy.csv',
    });
    expect(loadedBathymetry(undefined, 'C:\\gone\\bathy.csv')).toEqual({ line: [], name: 'bathy.csv' });
  });

  it('does not throw when the loader computes values from an empty profile', () => {
    expect(() => getBathimetryValues([], 5)).not.toThrow();
  });
});

describe('applyLocatedBathymetry', () => {
  const previous = {
    path: '/gone/bathy.csv',
    name: 'bathy.csv',
    level: 6,
    leftBank: 2.5,
    line: [],
  };

  it("keeps the section's saved water level and left-bank station", () => {
    const result = applyLocatedBathymetry(previous, { path: '/p/bathy.csv', name: 'bathy.csv', line: valley });
    if (!('bathimetry' in result)) throw new Error('expected a bathymetry');
    expect(result.bathimetry.level).toBe(6);
    expect(result.bathimetry.leftBank).toBe(2.5);
    expect(result.bathimetry.path).toBe('/p/bathy.csv');
    expect(result.bathimetry.line).toEqual(valley);
    expect(result.bathimetry.width).toBeGreaterThan(0);
  });

  it('reports a profile that the saved level does not cross', () => {
    const result = applyLocatedBathymetry({ ...previous, level: 50 }, { path: '/p/b.csv', name: 'b.csv', line: valley });
    expect(result).toEqual({ error: { message: 'bathimetryNotValid', value: 50 } });
  });
});

describe('hasMissingBathymetry', () => {
  it('is true only when a bathymetry is missing', () => {
    expect(hasMissingBathymetry({ videoMissing: true, missingInputs: [{ kind: 'ipcamImages', path: '/x' }] })).toBe(
      false
    );
    expect(
      hasMissingBathymetry({
        videoMissing: false,
        missingInputs: [{ kind: 'bathymetry', section: 'CS_default_1', path: '/x' }],
      })
    ).toBe(true);
  });
});
