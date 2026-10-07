import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { copyIntoProject, resolveExternalFile } from './copyIntoProject';

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
  it('prefers a file with the same name already in the project', async () => {
    fs.writeFileSync(path.join(project, 'bathy.csv'), 'in project');
    fs.writeFileSync(path.join(outside, 'bathy.csv'), 'outside');
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
});
