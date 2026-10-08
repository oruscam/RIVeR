const mockHandlers: Record<string, (...args: any[]) => any> = {};
const mockShowOpenDialog = jest.fn();

jest.mock('electron', () => ({
  ipcMain: { handle: (channel: string, fn: (...args: any[]) => any) => (mockHandlers[channel] = fn) },
  dialog: { showOpenDialog: (...args: any[]) => mockShowOpenDialog(...args) },
}));

const mockConfig = { videoPath: '/open/project/source', defaultFilesPath: '/last' };
jest.mock('../main', () => ({ PROJECT_CONFIG: mockConfig }));

import * as path from 'path';
import { framesFolder } from './framesFolder';

const info = { count: 3, width: 1920, height: 1080, files: ['f_1.jpg', 'f_2.jpg', 'f_10.jpg'] };
const riverCli = jest.fn();

beforeAll(() => framesFolder(riverCli as any));
beforeEach(() => {
  riverCli.mockReset();
  mockShowOpenDialog.mockReset();
});

describe('get-frames-folder', () => {
  it('returns the chosen folder and its name', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/data/gauging_03'] });

    expect(await mockHandlers['get-frames-folder']({})).toEqual({ path: '/data/gauging_03', name: 'gauging_03' });
    expect(mockShowOpenDialog.mock.calls[0][0].properties).toEqual(['openDirectory']);
  });

  it('returns null when the dialog is cancelled', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    expect(await mockHandlers['get-frames-folder']({})).toBeNull();
  });
});

describe('inspect-frames-folder', () => {
  it('asks the CLI, untracked, and returns absolute paths in the CLI order', async () => {
    riverCli.mockResolvedValue({ data: info, error: {} });

    const result = await mockHandlers['inspect-frames-folder']({}, { path: '/data/gauging_03' });

    expect(riverCli.mock.calls[0][0]).toEqual(['frames-info', '/data/gauging_03']);
    expect(riverCli.mock.calls[0][4]).toBe(false);
    expect(result).toEqual({
      path: '/data/gauging_03',
      name: 'gauging_03',
      count: 3,
      width: 1920,
      height: 1080,
      files: ['f_1.jpg', 'f_2.jpg', 'f_10.jpg'].map((f) => path.join('/data/gauging_03', f)),
    });
  });

  it("inspects the open project's source folder when no path is given", async () => {
    riverCli.mockResolvedValue({ data: info, error: {} });

    await mockHandlers['inspect-frames-folder']({}, undefined);

    expect(riverCli.mock.calls[0][0]).toEqual(['frames-info', '/open/project/source']);
  });

  it.each([
    ['noFrames', 'noFrames'],
    ['mixedSizes', 'mixedSizes'],
    ['unreadable:f_1.jpg', 'unreadableFolder'],
    ['Unexpected error: boom', 'unreadableFolder'],
  ])('maps the CLI error %s to %s', async (message, code) => {
    riverCli.mockResolvedValue({ data: {}, error: { message } });

    expect(await mockHandlers['inspect-frames-folder']({}, { path: '/x' })).toEqual({ error: code });
  });

  it('reports an unreadable folder when the CLI cannot run', async () => {
    riverCli.mockRejectedValue(new Error('spawn failed'));

    expect(await mockHandlers['inspect-frames-folder']({}, { path: '/x' })).toEqual({ error: 'unreadableFolder' });
  });
});
