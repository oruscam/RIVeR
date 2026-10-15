import {
  applyLocatedBathymetry,
  hasBathymetryProfile,
  hasMissingBathymetry,
  loadedBathymetry,
  locatedBathymetryUpdates,
} from './locatedBathymetry';
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
    const result = applyLocatedBathymetry(
      { ...previous, level: 50 },
      { path: '/p/b.csv', name: 'b.csv', line: valley }
    );
    expect(result).toEqual({ error: { message: 'bathimetryNotValid', value: 50 } });
  });
});

describe('hasMissingBathymetry', () => {
  it('is true only when a bathymetry is missing', () => {
    expect(
      hasMissingBathymetry({ videoMissing: true, missingInputs: [{ kind: 'ipcamImages', path: '/x' }] })
    ).toBe(false);
    expect(
      hasMissingBathymetry({
        videoMissing: false,
        missingInputs: [{ kind: 'bathymetry', section: 'CS_default_1', path: '/x' }],
      })
    ).toBe(true);
  });
});

describe('locatedBathymetryUpdates', () => {
  const missing = (section: string, path: string) => ({ kind: 'bathymetry' as const, section, path });
  const sections = [
    {
      name: 'CS_default_1',
      bathimetry: { path: '/gone/bathy.csv', name: 'bathy.csv', level: 6, leftBank: 2.5, line: [] },
    },
    {
      name: 'CS_default_2',
      bathimetry: { path: '/gone/bathy.csv', name: 'bathy.csv', level: 50, leftBank: 1, line: [] },
    },
    { name: 'CS_default_3', bathimetry: { path: '/gone/other.csv', name: 'other.csv', level: 6, line: [] } },
  ];
  const located = { path: '/p/new.csv', name: 'new.csv', line: valley, replaced: '/gone/bathy.csv' };

  it('points every section that used the missing file at the located one, even when its level does not cross', () => {
    const { updates, error } = locatedBathymetryUpdates(
      sections,
      [
        missing('CS_default_1', '/gone/bathy.csv'),
        missing('CS_default_2', '/gone/bathy.csv'),
        missing('CS_default_3', '/gone/other.csv'),
      ],
      located
    );

    expect(updates.map((u) => u.index)).toEqual([0, 1]);
    expect(updates[0].bathimetry.width).toBeGreaterThan(0);
    // The level-error section still mirrors disk: new path, name and line; level and left bank kept.
    expect(updates[1].bathimetry).toMatchObject({
      path: '/p/new.csv',
      name: 'new.csv',
      line: valley,
      level: 50,
      leftBank: 1,
    });
    expect(error).toEqual({ message: 'bathimetryNotValid', value: 50 });
  });

  it('skips an issue whose section is no longer in the store', () => {
    const { updates, error } = locatedBathymetryUpdates(
      sections,
      [missing('CS_gone', '/gone/bathy.csv')],
      located
    );
    expect(updates).toEqual([]);
    expect(error).toBeUndefined();
  });
});

describe('hasBathymetryProfile', () => {
  it('is false for a missing or empty profile and for a single point', () => {
    expect(hasBathymetryProfile(undefined)).toBe(false);
    expect(hasBathymetryProfile({ line: [] } as any)).toBe(false);
    expect(hasBathymetryProfile({ line: undefined } as any)).toBe(false);
    expect(hasBathymetryProfile({ line: [{ x: 0, y: 1 }] } as any)).toBe(false);
  });

  it('is true from two points on', () => {
    expect(
      hasBathymetryProfile({
        line: [
          { x: 0, y: 1 },
          { x: 1, y: 2 },
        ],
      } as any)
    ).toBe(true);
  });
});
