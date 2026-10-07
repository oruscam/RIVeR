import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { prepareProject } from './prepareProject';

let root: string;
let oldFolder: string;
let project: string;
let outside: string;

const write = (file: string, content: string) => fs.writeFileSync(file, content);

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'river-prepare-'));
  oldFolder = path.join(root, 'river', 'DJI_0083', '20261006T1837'); // never created: the project was moved
  project = path.join(root, 'cases', 'DJI_0083', '20261006T1837');
  outside = path.join(root, 'videos');
  fs.mkdirSync(project, { recursive: true });
  fs.mkdirSync(outside);

  write(path.join(outside, 'DJI_0083.MP4'), 'video');
  write(path.join(outside, 'bathy.csv'), 'station,stage\n0,1');
  write(
    path.join(project, 'xsections.json'),
    `{"CS_default_1": {"bath": ${JSON.stringify(path.join(outside, 'bathy.csv'))}, "q": NaN}}`
  );
  write(
    path.join(project, 'settings.json'),
    JSON.stringify(
      {
        video: { filepath: path.join(outside, 'DJI_0083.MP4'), name: 'DJI_0083.MP4', fps: 30 },
        xsections: path.join(oldFolder, 'xsections.json'),
        piv_results: path.join(oldFolder, 'piv_results.json'),
      },
      null,
      4
    )
  );
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

const settingsOnDisk = () => JSON.parse(fs.readFileSync(path.join(project, 'settings.json'), 'utf-8'));
const logOnDisk = () =>
  fs.existsSync(path.join(project, 'river.log')) ? fs.readFileSync(path.join(project, 'river.log'), 'utf-8') : '';

describe('prepareProject', () => {
  it('fixes a moved project, copies its bathymetry and logs it once', async () => {
    const result = await prepareProject(project);

    expect(result.settings.xsections).toBe(path.join(project, 'xsections.json'));
    expect(settingsOnDisk().xsections).toBe(path.join(project, 'xsections.json'));
    expect(fs.existsSync(path.join(project, 'bathy.csv'))).toBe(true);
    const xs = fs.readFileSync(path.join(project, 'xsections.json'), 'utf-8');
    expect(xs).toContain(JSON.stringify(path.join(project, 'bathy.csv')));
    expect(xs).toContain('"q": NaN');
    expect(result.videoMissing).toBe(false);
    expect(result.missingInputs).toEqual([]);
    expect(logOnDisk()).toContain(`project moved from ${oldFolder} to ${project}`);
  });

  it('writes, copies and logs nothing the second time', async () => {
    await prepareProject(project);
    const settingsBefore = fs.readFileSync(path.join(project, 'settings.json'), 'utf-8');
    const logBefore = logOnDisk();

    await prepareProject(project);

    expect(fs.readFileSync(path.join(project, 'settings.json'), 'utf-8')).toBe(settingsBefore);
    expect(logOnDisk()).toBe(logBefore);
    expect(fs.readdirSync(project).filter((f) => f.startsWith('bathy'))).toEqual(['bathy.csv']);
  });

  it('reports a missing video, bathymetry and image folder without failing', async () => {
    fs.rmSync(path.join(outside, 'DJI_0083.MP4'));
    fs.rmSync(path.join(outside, 'bathy.csv'));
    const settings = settingsOnDisk();
    settings.rectification_3d_images = path.join(root, 'gone-images');
    write(path.join(project, 'settings.json'), JSON.stringify(settings, null, 4));

    const result = await prepareProject(project);

    expect(result.videoMissing).toBe(true);
    expect(result.missingInputs).toEqual([
      { kind: 'bathymetry', section: 'CS_default_1', path: path.join(outside, 'bathy.csv') },
      { kind: 'ipcamImages', path: path.join(root, 'gone-images') },
    ]);
  });

  it('leaves settings.json untouched and writes no log for a project that never moved', async () => {
    const settings = settingsOnDisk();
    settings.xsections = path.join(project, 'xsections.json');
    settings.piv_results = path.join(project, 'piv_results.json');
    write(path.join(project, 'settings.json'), JSON.stringify(settings, null, 4));
    write(path.join(project, 'bathy.csv'), 'station,stage\n0,1');
    write(
      path.join(project, 'xsections.json'),
      `{"CS_default_1": {"bath": ${JSON.stringify(path.join(project, 'bathy.csv'))}}}`
    );
    const before = fs.readFileSync(path.join(project, 'settings.json'), 'utf-8');

    await prepareProject(project);

    expect(fs.readFileSync(path.join(project, 'settings.json'), 'utf-8')).toBe(before);
    expect(logOnDisk()).toBe('');
  });

  it('treats paths stored through another name for the same folder as unchanged', async () => {
    // The user's projects store /Users/antoine/River/... while the folder is river/
    // (case-insensitive disk); a symlink gives the same situation on any disk.
    const alias = path.join(root, 'alias');
    fs.symlinkSync(project, alias, 'dir');
    const settings = settingsOnDisk();
    settings.xsections = path.join(alias, 'xsections.json');
    settings.piv_results = path.join(alias, 'piv_results.json');
    write(path.join(project, 'settings.json'), JSON.stringify(settings, null, 4));
    write(path.join(project, 'bathy.csv'), 'station,stage\n0,1');
    write(
      path.join(project, 'xsections.json'),
      `{"CS_default_1": {"bath": ${JSON.stringify(path.join(alias, 'bathy.csv'))}}}`
    );
    const settingsBefore = fs.readFileSync(path.join(project, 'settings.json'), 'utf-8');
    const xsBefore = fs.readFileSync(path.join(project, 'xsections.json'), 'utf-8');

    const result = await prepareProject(project);

    expect(result.missingInputs).toEqual([]);
    expect(fs.readFileSync(path.join(project, 'settings.json'), 'utf-8')).toBe(settingsBefore);
    expect(fs.readFileSync(path.join(project, 'xsections.json'), 'utf-8')).toBe(xsBefore);
    expect(fs.readdirSync(project).filter((f) => f.startsWith('bathy'))).toEqual(['bathy.csv']);
    expect(logOnDisk()).toBe('');
  });
});
