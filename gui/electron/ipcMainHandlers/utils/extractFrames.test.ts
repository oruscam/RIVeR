import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { extractFrames } from './extractFrames';

let project: string;
let settingsPath: string;
let framesPath: string;

const baseArgs = {
  start_frame: 0,
  end_frame: 4,
  step: 2,
  factor: 0.5,
  lensCorrection: false as const,
  stabilization: false,
  stabilizationRegions: [],
};

const videoSettings = {
  footage: 'uav',
  video: { filepath: '/data/DJI_0083.MP4', fps: 30, resolution: { width: 1920, height: 1080 } },
  video_range: { start: 0, end: 90, step: 1, factor: 1 },
};

const framesSettings = {
  footage: 'uav',
  video: {
    source: 'frames',
    filepath: '/data/gauging',
    name: 'gauging',
    frame_count: 240,
    total_length: 9.6,
    time_between_frames: 0.04,
    fps: 25,
    resolution: { width: 1920, height: 1080 },
  },
  video_range: { start: 0, end: 240, step: 1, factor: 1 },
};

/** A backend that writes the given frames into the folder it is asked to fill. */
const writingCli = (names: string[]) =>
  jest.fn(async (options: (string | number)[]) => {
    const target = String(options[2]);
    fs.mkdirSync(target, { recursive: true });
    names.forEach((name) => fs.writeFileSync(path.join(target, name), `new ${name}`));
    return { data: { initial_frame: path.join(target, names[0]) }, error: {} };
  });

const context = (sourcePath: string, riverCli: jest.Mock) => ({
  projectDirectory: project,
  framesPath,
  sourcePath,
  settingsPath,
  logsPath: path.join(project, 'river.log'),
  riverCli: riverCli as any,
});

const writeSettings = (settings: object) => fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
const settings = () => JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
const entries = () => fs.readdirSync(project).sort();

/** The frames of an earlier import, which a failed one must not cost the project. */
const seedPreviousFrames = () => {
  fs.mkdirSync(framesPath);
  fs.writeFileSync(path.join(framesPath, '0000000000.jpg'), 'old 0');
  fs.writeFileSync(path.join(framesPath, '0000000001.jpg'), 'old 1');
};
const previousFrames = () =>
  fs.readdirSync(framesPath).map((name) => fs.readFileSync(path.join(framesPath, name), 'utf-8'));

beforeEach(() => {
  project = fs.mkdtempSync(path.join(os.tmpdir(), 'river-extract-frames-'));
  settingsPath = path.join(project, 'settings.json');
  framesPath = project + '/frames';
});

afterEach(() => fs.rmSync(project, { recursive: true, force: true }));

describe('extractFrames: the command', () => {
  it('extracts a video with video-to-frames into a folder beside frames', async () => {
    writeSettings(videoSettings);
    const riverCli = writingCli(['0000000000.jpg', '0000000002.jpg']);

    await extractFrames(context('/data/DJI_0083.MP4', riverCli), baseArgs);

    expect(riverCli).toHaveBeenCalledTimes(1);
    expect(riverCli.mock.calls[0]).toEqual([
      [
        'video-to-frames',
        '/data/DJI_0083.MP4',
        framesPath + '_importing',
        '--start-frame',
        0,
        '--end-frame',
        4,
        '--every',
        2,
        '--resize-factor',
        0.5,
        '--overwrite',
      ],
      'json',
      true,
      path.join(project, 'river.log'),
    ]);
  });

  it('imports a frames project with frames-to-frames', async () => {
    writeSettings(framesSettings);
    const riverCli = writingCli(['0000000000.jpg', '0000000002.jpg']);

    await extractFrames(context('/data/gauging', riverCli), { ...baseArgs, intervalMs: 40 });

    expect(riverCli.mock.calls[0][0].slice(0, 3)).toEqual([
      'frames-to-frames',
      '/data/gauging',
      framesPath + '_importing',
    ]);
  });

  it('passes the lens profile and the stabilization regions', async () => {
    writeSettings(videoSettings);
    const riverCli = writingCli(['0000000000.jpg']);

    await extractFrames(context('/data/DJI_0083.MP4', riverCli), {
      ...baseArgs,
      lensCorrection: '/profiles/mavic.json',
      stabilization: true,
      stabilizationRegions: [
        { x: 10, y: 20, width: 100, height: 50 },
        { x: 300, y: 400, width: 100, height: 50 },
      ],
    });

    const options = riverCli.mock.calls[0][0];
    expect(options.slice(12, 15)).toEqual(['--undistort', '--profile-path', '/profiles/mavic.json']);
    expect(options[15]).toBe('--stabilize');
    expect(options[16]).toBe('--stabilization-regions');
    expect(options[18]).toBe('--replace');
  });
});

describe('extractFrames: success', () => {
  it('replaces the previous frames and reports the new ones in order', async () => {
    writeSettings(videoSettings);
    seedPreviousFrames();

    const result = await extractFrames(
      context('/data/DJI_0083.MP4', writingCli(['0000000002.jpg', '0000000000.jpg'])),
      baseArgs
    );

    expect(result).toEqual({ fileNames: ['0000000000.jpg', '0000000002.jpg'] });
    expect(previousFrames()).toEqual(['new 0000000000.jpg', 'new 0000000002.jpg']);
    expect(entries()).toEqual(['frames', 'settings.json']);
  });

  it('writes the range to settings and leaves a video block alone', async () => {
    writeSettings(videoSettings);

    await extractFrames(context('/data/DJI_0083.MP4', writingCli(['0000000000.jpg'])), baseArgs);

    expect(settings()).toEqual({
      ...videoSettings,
      video_range: { start: 0, end: 4, step: 2, factor: 0.5 },
      lens_correction: null,
      stabilization: null,
      stabilization_regions_path: null,
    });
  });

  it('writes settings only once the frames are in place', async () => {
    writeSettings(videoSettings);
    const riverCli = jest.fn(async (options: (string | number)[]) => {
      fs.mkdirSync(String(options[2]));
      fs.writeFileSync(path.join(String(options[2]), '0000000000.jpg'), 'new');
      expect(settings()).toEqual(videoSettings);
      return { data: {}, error: {} };
    });

    await extractFrames(context('/data/DJI_0083.MP4', riverCli), baseArgs);

    expect(settings().video_range.end).toBe(4);
  });

  it('rewrites the interval, fps and length of a frames project', async () => {
    writeSettings(framesSettings);

    await extractFrames(context('/data/gauging', writingCli(['0000000000.jpg'])), {
      ...baseArgs,
      intervalMs: 16.6667,
    });

    expect(settings().video).toEqual({
      ...framesSettings.video,
      fps: 1000 / 16.6667,
      time_between_frames: 0.0166667,
      total_length: 4.000008,
    });
  });

  it('ignores an interval sent for a video project', async () => {
    writeSettings(videoSettings);

    await extractFrames(context('/data/DJI_0083.MP4', writingCli(['0000000000.jpg'])), {
      ...baseArgs,
      intervalMs: 40,
    });

    expect(settings().video).toEqual(videoSettings.video);
  });

  it('records stabilization and keeps the regions in stabilization_regions.json', async () => {
    writeSettings(videoSettings);
    const regionsPath = path.join(project, 'stabilization_regions.json');

    await extractFrames(context('/data/DJI_0083.MP4', writingCli(['0000000000.jpg'])), {
      ...baseArgs,
      stabilization: true,
      stabilizationRegions: [
        { x: 10, y: 20, width: 100, height: 50 },
        { x: 300, y: 400, width: 100, height: 50 },
      ],
    });

    expect(settings().stabilization).toBe(true);
    expect(settings().stabilization_regions_path).toBe(regionsPath);
    expect(JSON.parse(fs.readFileSync(regionsPath, 'utf-8'))).toEqual({
      regions: [
        { center: [60, 45], win_size: [100, 50] },
        { center: [350, 425], win_size: [100, 50] },
      ],
    });
    expect(entries()).toEqual(['frames', 'settings.json', 'stabilization_regions.json']);
  });

  it('removes what a crashed run left behind before starting', async () => {
    writeSettings(videoSettings);
    fs.mkdirSync(framesPath + '_importing');
    fs.writeFileSync(path.join(framesPath + '_importing', '0000000099.jpg'), 'stale');
    fs.mkdirSync(framesPath + '_importing_stabilized');

    const result = await extractFrames(context('/data/DJI_0083.MP4', writingCli(['0000000000.jpg'])), baseArgs);

    expect(result).toEqual({ fileNames: ['0000000000.jpg'] });
    expect(entries()).toEqual(['frames', 'settings.json']);
  });
});

describe('extractFrames: failure', () => {
  const stabilized = {
    ...baseArgs,
    stabilization: true,
    stabilizationRegions: [
      { x: 10, y: 20, width: 100, height: 50 },
      { x: 300, y: 400, width: 100, height: 50 },
    ],
  };

  /** A backend that stops on a bad frame, after writing part of the sequence. */
  const failingCli = jest.fn(async (options: (string | number)[]) => {
    const target = String(options[2]);
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, '0000000000.jpg'), 'partial');
    fs.mkdirSync(target + '_stabilized');
    return { data: {}, error: { message: 'mixedSizes:f_4.jpg' } };
  });

  it('leaves the previous frames, settings and regions byte-identical', async () => {
    writeSettings({ ...framesSettings, stabilization: true });
    seedPreviousFrames();
    const regionsPath = path.join(project, 'stabilization_regions.json');
    fs.writeFileSync(regionsPath, '{"regions":"previous"}');
    const settingsBefore = fs.readFileSync(settingsPath, 'utf-8');

    const result = await extractFrames(context('/data/gauging', failingCli), { ...stabilized, intervalMs: 20 });

    expect(result).toEqual({ error: 'mixedSizes:f_4.jpg', fileNames: [] });
    expect(fs.readFileSync(settingsPath, 'utf-8')).toBe(settingsBefore);
    expect(fs.readFileSync(regionsPath, 'utf-8')).toBe('{"regions":"previous"}');
    expect(previousFrames()).toEqual(['old 0', 'old 1']);
    expect(entries()).toEqual(['frames', 'settings.json', 'stabilization_regions.json']);
  });

  it('does the same when the backend cannot be started', async () => {
    writeSettings(videoSettings);
    seedPreviousFrames();
    const settingsBefore = fs.readFileSync(settingsPath, 'utf-8');
    const riverCli = jest.fn().mockRejectedValue(new Error('spawn python ENOENT'));

    const result = await extractFrames(context('/data/DJI_0083.MP4', riverCli), stabilized);

    expect(result).toEqual({ error: 'spawn python ENOENT', fileNames: [] });
    expect(fs.readFileSync(settingsPath, 'utf-8')).toBe(settingsBefore);
    expect(previousFrames()).toEqual(['old 0', 'old 1']);
    expect(entries()).toEqual(['frames', 'settings.json']);
  });

  it('puts back frames that a crashed run had set aside', async () => {
    writeSettings(videoSettings);
    seedPreviousFrames();
    fs.renameSync(framesPath, framesPath + '_replaced');

    await extractFrames(context('/data/DJI_0083.MP4', failingCli), baseArgs);

    expect(previousFrames()).toEqual(['old 0', 'old 1']);
    expect(entries()).toEqual(['frames', 'settings.json']);
  });

  it('leaves no frames folder behind when the project had none', async () => {
    writeSettings(framesSettings);

    await extractFrames(context('/data/gauging', failingCli), { ...baseArgs, intervalMs: 40 });

    expect(entries()).toEqual(['settings.json']);
  });

  it('keeps the previous frames when the backend writes nothing', async () => {
    writeSettings(videoSettings);
    seedPreviousFrames();
    const settingsBefore = fs.readFileSync(settingsPath, 'utf-8');
    const riverCli = jest.fn().mockResolvedValue({ data: {}, error: {} });

    const result = await extractFrames(context('/data/DJI_0083.MP4', riverCli), baseArgs);

    expect(result).toEqual({ fileNames: [] });
    expect(fs.readFileSync(settingsPath, 'utf-8')).toBe(settingsBefore);
    expect(previousFrames()).toEqual(['old 0', 'old 1']);
    expect(entries()).toEqual(['frames', 'settings.json']);
  });
});
