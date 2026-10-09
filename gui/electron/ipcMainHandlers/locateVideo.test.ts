const mockHandlers: Record<string, (...args: any[]) => any> = {};
const mockShowOpenDialog = jest.fn();
const mockGetVideoMetadata = jest.fn();

jest.mock('electron', () => ({
  ipcMain: { handle: (channel: string, fn: (...args: any[]) => any) => (mockHandlers[channel] = fn) },
  dialog: { showOpenDialog: (...args: any[]) => mockShowOpenDialog(...args) },
}));
jest.mock('./utils/getVideoMetadata', () => ({ getVideoMetadata: (p: string) => mockGetVideoMetadata(p) }));

const mockConfig = { settingsPath: '', videoPath: '', defaultFilesPath: '', logsPath: '' };
jest.mock('../main', () => ({ PROJECT_CONFIG: mockConfig }));

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { locateVideo } from './locateVideo';

let project: string;

beforeAll(() => locateVideo(jest.fn() as any));

beforeEach(() => {
  project = fs.mkdtempSync(path.join(os.tmpdir(), 'river-locate-video-'));
  mockConfig.settingsPath = path.join(project, 'settings.json');
  mockConfig.videoPath = '/gone/DJI_0083.MP4';
  fs.writeFileSync(
    mockConfig.settingsPath,
    JSON.stringify({
      video: { filepath: '/gone/DJI_0083.MP4', fps: 30, resolution: { width: 4096, height: 2160 } },
    })
  );
  mockShowOpenDialog.mockReset();
  mockGetVideoMetadata.mockReset();
});

afterEach(() => fs.rmSync(project, { recursive: true, force: true }));

const settings = () => JSON.parse(fs.readFileSync(mockConfig.settingsPath, 'utf-8'));
const meta = (width: number, height: number, fps: number) => ({
  width,
  height,
  fps,
  duration: 21.5,
  creation: '',
  name: 'DJI_0083.MP4',
  path: '/found/DJI_0083.MP4',
});

describe('locate-video', () => {
  it('accepts a video with the same resolution and fps and saves its path', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/found/DJI_0083.MP4'] });
    mockGetVideoMetadata.mockResolvedValue(meta(4096, 2160, 30));

    const result = await mockHandlers['locate-video']({});

    expect(result).toEqual({ status: 'ok', metadata: meta(4096, 2160, 30) });
    expect(settings().video.filepath).toBe('/found/DJI_0083.MP4');
    expect(mockConfig.videoPath).toBe('/found/DJI_0083.MP4');
    expect(mockConfig.defaultFilesPath).toBe('/found');
  });

  it('refuses a different video and changes nothing', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/found/other.MP4'] });
    mockGetVideoMetadata.mockResolvedValue(meta(1920, 1080, 25));

    const result = await mockHandlers['locate-video']({});

    expect(result).toEqual({
      status: 'mismatch',
      expected: { width: 4096, height: 2160, fps: 30 },
      found: { width: 1920, height: 1080, fps: 25 },
    });
    expect(settings().video.filepath).toBe('/gone/DJI_0083.MP4');
    expect(mockConfig.videoPath).toBe('/gone/DJI_0083.MP4');
  });

  it('changes nothing when the picker is canceled', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
    expect(await mockHandlers['locate-video']({})).toEqual({ status: 'canceled' });
    expect(mockGetVideoMetadata).not.toHaveBeenCalled();
  });

  it('reports an unreadable video when ffprobe fails', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/found/corrupt.MP4'] });
    mockGetVideoMetadata.mockRejectedValue(new Error('ffprobe failed'));

    const result = await mockHandlers['locate-video']({});

    expect(result).toEqual({ status: 'error', message: 'ffprobe failed' });
    expect(settings().video.filepath).toBe('/gone/DJI_0083.MP4');
    expect(mockConfig.videoPath).toBe('/gone/DJI_0083.MP4');
  });

  it('reports an unreadable video when conversion fails', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/found/invalid.avi'] });
    mockGetVideoMetadata.mockRejectedValue('No se pudo convertir el video a mp4');

    const result = await mockHandlers['locate-video']({});

    expect(result).toEqual({ status: 'error', message: 'No se pudo convertir el video a mp4' });
    expect(settings().video.filepath).toBe('/gone/DJI_0083.MP4');
    expect(mockConfig.videoPath).toBe('/gone/DJI_0083.MP4');
  });
});

describe('locate-video for a frames project', () => {
  const riverCli = jest.fn();
  const framesSettings = {
    video: {
      source: 'frames',
      filepath: '/gone/gauging',
      name: 'gauging',
      frame_count: 240,
      total_length: 9.6,
      time_between_frames: 0.04,
      fps: 25,
      resolution: { width: 1920, height: 1080 },
    },
  };

  beforeAll(() => locateVideo(riverCli as any));
  beforeEach(() => {
    riverCli.mockReset();
    fs.writeFileSync(mockConfig.settingsPath, JSON.stringify(framesSettings));
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/found/gauging'] });
  });

  it('opens a folder dialog and never probes a video', async () => {
    riverCli.mockResolvedValue({ data: { count: 240, width: 1920, height: 1080, files: [] }, error: {} });

    await mockHandlers['locate-video']({});

    expect(mockShowOpenDialog.mock.calls[0][0].properties).toEqual(['openDirectory']);
    expect(mockGetVideoMetadata).not.toHaveBeenCalled();
    expect(riverCli.mock.calls[0][0]).toEqual(['frames-info', '/found/gauging']);
  });

  it('accepts a folder with the same resolution and frame count and saves its path', async () => {
    riverCli.mockResolvedValue({ data: { count: 240, width: 1920, height: 1080, files: [] }, error: {} });

    const result = await mockHandlers['locate-video']({});

    expect(result.status).toBe('ok');
    expect(result.metadata).toMatchObject({
      path: '/found/gauging',
      name: 'gauging',
      source: 'frames',
      frameCount: 240,
    });
    expect(settings().video.filepath).toBe('/found/gauging');
    expect(settings().video.fps).toBe(25);
    expect(mockConfig.videoPath).toBe('/found/gauging');
  });

  it('refuses a folder with another frame count and changes nothing', async () => {
    riverCli.mockResolvedValue({ data: { count: 120, width: 1920, height: 1080, files: [] }, error: {} });

    const result = await mockHandlers['locate-video']({});

    expect(result).toEqual({
      status: 'mismatch',
      expected: { width: 1920, height: 1080, fps: 25, frameCount: 240 },
      found: { width: 1920, height: 1080, fps: 25, frameCount: 120 },
    });
    expect(settings().video.filepath).toBe('/gone/gauging');
  });

  it('reports a folder that is not a frames folder', async () => {
    riverCli.mockResolvedValue({ data: {}, error: { message: 'noFrames' } });

    expect(await mockHandlers['locate-video']({})).toEqual({ status: 'error', message: 'noFrames' });
  });

  it('reports an error instead of rejecting when the backend cannot be started', async () => {
    riverCli.mockRejectedValue(new Error('spawn python ENOENT'));

    expect(await mockHandlers['locate-video']({})).toEqual({ status: 'error', message: 'spawn python ENOENT' });
    expect(settings().video.filepath).toBe('/gone/gauging');
    expect(mockConfig.videoPath).toBe('/gone/DJI_0083.MP4');
  });

  it('changes nothing when the folder picker is canceled', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    expect(await mockHandlers['locate-video']({})).toEqual({ status: 'canceled' });
    expect(riverCli).not.toHaveBeenCalled();
    expect(settings().video.filepath).toBe('/gone/gauging');
  });

  it('names the source after the located folder', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/found/gauging_renamed'] });
    riverCli.mockResolvedValue({ data: { count: 240, width: 1920, height: 1080, files: [] }, error: {} });

    const result = await mockHandlers['locate-video']({});

    expect(result.metadata.name).toBe('gauging_renamed');
    expect(settings().video.name).toBe('gauging_renamed');
  });
});
