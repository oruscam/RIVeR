import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { copyIntoProject, placeIntoProject, resolveExternalFile } from './copyIntoProject';

let root: string;
let project: string;
let outside: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'river-copy-'));
  project = path.join(root, 'project');
  outside = path.join(root, 'outside');
  fs.mkdirSync(project);
  fs.mkdirSync(outside);
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('copyIntoProject', () => {
  it('copies a file from outside into the project', async () => {
    const src = path.join(outside, 'bathy.csv');
    fs.writeFileSync(src, 'station,stage\n0,1');
    const copied = await copyIntoProject(src, project);
    expect(copied).toBe(path.join(project, 'bathy.csv'));
    expect(fs.readFileSync(copied, 'utf-8')).toBe('station,stage\n0,1');
  });

  it('returns a file already inside the project untouched', async () => {
    const inside = path.join(project, 'bathy.csv');
    fs.writeFileSync(inside, 'x');
    expect(await copyIntoProject(inside, project)).toBe(inside);
  });

  it('reuses an identical copy instead of making a second one', async () => {
    const src = path.join(outside, 'bathy.csv');
    fs.writeFileSync(src, 'same');
    fs.writeFileSync(path.join(project, 'bathy.csv'), 'same');
    expect(await copyIntoProject(src, project)).toBe(path.join(project, 'bathy.csv'));
    expect(fs.readdirSync(project)).toEqual(['bathy.csv']);
  });

  it('adds a suffix when the name is taken by different content, never overwriting', async () => {
    const src = path.join(outside, 'bathy.csv');
    fs.writeFileSync(src, 'new');
    fs.writeFileSync(path.join(project, 'bathy.csv'), 'old');
    fs.writeFileSync(path.join(project, 'bathy_2.csv'), 'older');
    const copied = await copyIntoProject(src, project);
    expect(copied).toBe(path.join(project, 'bathy_3.csv'));
    expect(fs.readFileSync(path.join(project, 'bathy.csv'), 'utf-8')).toBe('old');
    expect(fs.readFileSync(path.join(project, 'bathy_2.csv'), 'utf-8')).toBe('older');
    expect(fs.readFileSync(copied, 'utf-8')).toBe('new');
  });
});

describe('resolveExternalFile', () => {
  it('uses the same-named project file when the stored file is gone (moved project)', async () => {
    fs.writeFileSync(path.join(project, 'bathy.csv'), 'in project');
    expect(await resolveExternalFile(path.join(outside, 'bathy.csv'), project)).toEqual({
      status: 'inProject',
      path: path.join(project, 'bathy.csv'),
    });
  });

  it('copies the stored file when the project has none', async () => {
    fs.writeFileSync(path.join(outside, 'bathy.csv'), 'outside');
    expect(await resolveExternalFile(path.join(outside, 'bathy.csv'), project)).toEqual({
      status: 'copied',
      path: path.join(project, 'bathy.csv'),
    });
  });

  it('reports missing when neither exists', async () => {
    expect(await resolveExternalFile(path.join(outside, 'gone.csv'), project)).toEqual({ status: 'missing' });
  });

  it('copies under a suffix when the stored file differs from the same-named project file', async () => {
    fs.writeFileSync(path.join(project, 'bathy.csv'), 'first');
    fs.writeFileSync(path.join(outside, 'bathy.csv'), 'second');
    expect(await resolveExternalFile(path.join(outside, 'bathy.csv'), project)).toEqual({
      status: 'copied',
      path: path.join(project, 'bathy_2.csv'),
    });
    expect(fs.readFileSync(path.join(project, 'bathy.csv'), 'utf-8')).toBe('first');
    expect(fs.readFileSync(path.join(project, 'bathy_2.csv'), 'utf-8')).toBe('second');
  });

  it('reuses an identical same-named project file without writing', async () => {
    fs.writeFileSync(path.join(project, 'bathy.csv'), 'same');
    fs.writeFileSync(path.join(outside, 'bathy.csv'), 'same');
    expect(await resolveExternalFile(path.join(outside, 'bathy.csv'), project)).toEqual({
      status: 'inProject',
      path: path.join(project, 'bathy.csv'),
    });
    expect(fs.readdirSync(project)).toEqual(['bathy.csv']);
  });
});

describe('placeIntoProject', () => {
  it('writes the content under the wanted name', async () => {
    const placed = await placeIntoProject('station,stage\n0,1', 'bathy_modified.csv', project);
    expect(placed).toBe(path.join(project, 'bathy_modified.csv'));
    expect(fs.readFileSync(placed, 'utf-8')).toBe('station,stage\n0,1');
  });

  it('reuses an identical file already there', async () => {
    fs.writeFileSync(path.join(project, 'bathy_modified.csv'), 'station,stage\n0,1');
    const placed = await placeIntoProject('station,stage\n0,1', 'bathy_modified.csv', project);
    expect(placed).toBe(path.join(project, 'bathy_modified.csv'));
    expect(fs.readdirSync(project)).toEqual(['bathy_modified.csv']);
  });

  it("never overwrites a different file with that name (another section's bathymetry)", async () => {
    fs.writeFileSync(path.join(project, 'bathy_modified.csv'), 'station,stage\n0,9');
    const placed = await placeIntoProject('station,stage\n0,1', 'bathy_modified.csv', project);
    expect(placed).toBe(path.join(project, 'bathy_modified_2.csv'));
    expect(fs.readFileSync(path.join(project, 'bathy_modified.csv'), 'utf-8')).toBe('station,stage\n0,9');
    expect(fs.readFileSync(placed, 'utf-8')).toBe('station,stage\n0,1');
  });
});
