import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { replaceBathPath, resolveBathymetryPaths, sectionBath } from './resolveBathymetry';

let root: string;
let project: string;
let outside: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'river-bath-'));
  project = path.join(root, 'project');
  outside = path.join(root, 'outside');
  fs.mkdirSync(project);
  fs.mkdirSync(outside);
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

// Python's json.dump writes bare NaN; the rewrite must keep it.
const xsections = (bathA: string, bathB: string) => `{
    "CS_default_1": {
        "bath": ${JSON.stringify(bathA)},
        "level": 1.5,
        "displacement": [NaN, 0.2]
    },
    "CS_default_2": {
        "bath": ${JSON.stringify(bathB)},
        "level": 2.0
    },
    "summary": { "total_q": NaN }
}`;

describe('replaceBathPath', () => {
  it('rewrites every section that pointed at the old file and keeps NaN tokens', () => {
    const raw = xsections('/old/bathy.csv', '/old/bathy.csv');
    const out = replaceBathPath(raw, '/old/bathy.csv', '/new/bathy.csv');
    expect(out).not.toContain('/old/bathy.csv');
    expect(out.match(/\/new\/bathy\.csv/g)).toHaveLength(2);
    expect(out).toContain('[NaN, 0.2]');
    expect(out).toContain('"total_q": NaN');
  });

  it('handles paths with escaped characters', () => {
    const raw = xsections('C:\\data\\bathy "v2".csv', '/other.csv');
    const out = replaceBathPath(raw, 'C:\\data\\bathy "v2".csv', '/new/b.csv');
    expect(sectionBath(out, 'CS_default_1')).toBe('/new/b.csv');
    expect(sectionBath(out, 'CS_default_2')).toBe('/other.csv');
  });
});

describe('resolveBathymetryPaths', () => {
  it('copies an outside CSV once, even when two sections share it', async () => {
    const shared = path.join(outside, 'bathy.csv');
    fs.writeFileSync(shared, 'station,stage\n0,1');
    const { raw, missing, copied } = await resolveBathymetryPaths(project, xsections(shared, shared));
    expect(missing).toEqual([]);
    expect(copied).toEqual([path.join(project, 'bathy.csv')]);
    expect(sectionBath(raw, 'CS_default_1')).toBe(path.join(project, 'bathy.csv'));
    expect(sectionBath(raw, 'CS_default_2')).toBe(path.join(project, 'bathy.csv'));
    expect(fs.readdirSync(project)).toEqual(['bathy.csv']);
  });

  it('uses the project copy of a moved project without copying', async () => {
    fs.writeFileSync(path.join(project, 'bathy_modified.csv'), 'x');
    const { raw, copied } = await resolveBathymetryPaths(
      project,
      xsections('/gone/old-project/bathy_modified.csv', '/gone/old-project/bathy_modified.csv')
    );
    expect(copied).toEqual([]);
    expect(sectionBath(raw, 'CS_default_1')).toBe(path.join(project, 'bathy_modified.csv'));
  });

  it('reports each section whose bathymetry is nowhere, and leaves its path alone', async () => {
    const gone = '/gone/bathy.csv';
    const original = xsections(gone, gone);
    const { raw, missing } = await resolveBathymetryPaths(project, original);
    expect(missing).toEqual([
      { kind: 'bathymetry', section: 'CS_default_1', path: gone },
      { kind: 'bathymetry', section: 'CS_default_2', path: gone },
    ]);
    expect(raw).toBe(original);
  });

  it('returns the text unchanged when nothing needs fixing', async () => {
    const inside = path.join(project, 'bathy.csv');
    fs.writeFileSync(inside, 'x');
    const original = xsections(inside, inside);
    expect((await resolveBathymetryPaths(project, original)).raw).toBe(original);
  });
});
