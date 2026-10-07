const mockHandlers: Record<string, (...args: any[]) => any> = {};
const mockShowOpenDialog = jest.fn();
const mockGetVideoMetadata = jest.fn();

jest.mock('electron', () => ({
  ipcMain: { handle: (channel: string, fn: (...args: any[]) => any) => (mockHandlers[channel] = fn) },
  dialog: { showOpenDialog: (...args: any[]) => mockShowOpenDialog(...args) },
}));
jest.mock('./utils/getVideoMetadata', () => ({ getVideoMetadata: (p: string) => mockGetVideoMetadata(p) }));

const mockConfig = { settingsPath: '', videoPath: '', defaultFilesPath: '' };
jest.mock('../main', () => ({ PROJECT_CONFIG: mockConfig }));

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { locateVideo } from './locateVideo';

let project: string;

beforeAll(() => locateVideo());

beforeEach(() => {
  project = fs.mkdtempSync(path.join(os.tmpdir(), 'river-locate-video-'));
  mockConfig.settingsPath = path.join(project, 'settings.json');
  mockConfig.videoPath = '/gone/DJI_0083.MP4';
  fs.writeFileSync(
    mockConfig.settingsPath,
    JSON.stringify({ video: { filepath: '/gone/DJI_0083.MP4', fps: 30, resolution: { width: 4096, height: 2160 } } })
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
