const mockHandlers: Record<string, (...args: any[]) => any> = {};
const mockGetVideoMetadata = jest.fn();
const mockCreateFolderStructure = jest.fn();

jest.mock('electron', () => ({
  ipcMain: { handle: (channel: string, fn: (...args: any[]) => any) => (mockHandlers[channel] = fn) },
}));
jest.mock('./utils/getVideoMetadata', () => ({ getVideoMetadata: (p: string) => mockGetVideoMetadata(p) }));
jest.mock('./createFolderStructure', () => ({
  createFolderStructure: (...args: any[]) => mockCreateFolderStructure(...args),
}));

const mockConfig: Record<string, string> = { mainDirectory: '/River' };
jest.mock('../main', () => ({ PROJECT_CONFIG: mockConfig }));

import * as path from 'path';
import { initProject } from './initProject';

beforeAll(() => initProject());
beforeEach(() => {
  mockGetVideoMetadata.mockReset();
  mockCreateFolderStructure.mockReset().mockResolvedValue('/River/case/20261008T1200');
});

describe('init-project from a frames folder', () => {
  const args = {
    path: '/data/gauging.2026_03',
    name: 'gauging.2026_03',
    type: 'uav',
    language: 'en',
    unitSistem: 'si',
    frames: { count: 240, width: 1920, height: 1080, intervalMs: 40 },
  };

  it('never probes the folder as a video', async () => {
    await mockHandlers['init-project']({}, args);

    expect(mockGetVideoMetadata).not.toHaveBeenCalled();
  });

  it('names the project after the whole folder name and passes the frames facts on', async () => {
    await mockHandlers['init-project']({}, args);

    const call = mockCreateFolderStructure.mock.calls[0];
    expect(call[0]).toBe(path.join('/River', 'gauging.2026_03'));
    expect(call[3]).toBe('/data/gauging.2026_03');
    expect(call[4]).toBe('gauging.2026_03');
    expect(call[5]).toEqual({ width: 1920, height: 1080, fps: 25, duration: 9.6 });
    expect(call[7]).toEqual({ count: 240, intervalMs: 40 });
  });

  it('returns video-shaped metadata marked as frames', async () => {
    const { result } = await mockHandlers['init-project']({}, args);

    expect(result).toEqual({
      width: 1920,
      height: 1080,
      fps: 25,
      duration: 9.6,
      creation: '',
      name: 'gauging.2026_03',
      path: '/data/gauging.2026_03',
      source: 'frames',
      frameCount: 240,
      intervalMs: 40,
      directory: '/River/case/20261008T1200',
    });
    expect(mockConfig.videoPath).toBe('/data/gauging.2026_03');
    expect(mockConfig.defaultFilesPath).toBe('/data');
  });
});

describe('init-project from a video', () => {
  it('still probes the file and passes no frames argument', async () => {
    mockGetVideoMetadata.mockResolvedValue({
      width: 4096,
      height: 2160,
      fps: 30,
      duration: 21.5,
      creation: '',
      name: 'DJI_0083.MP4',
      path: '/v/DJI_0083.MP4',
    });

    const { result } = await mockHandlers['init-project'](
      {},
      { path: '/v/DJI_0083.MP4', name: 'DJI_0083.MP4', type: 'uav', language: 'en', unitSistem: 'si' }
    );

    expect(mockCreateFolderStructure.mock.calls[0][0]).toBe(path.join('/River', 'DJI_0083'));
    expect(mockCreateFolderStructure.mock.calls[0][7]).toBeUndefined();
    expect(result.source).toBeUndefined();
  });
});
