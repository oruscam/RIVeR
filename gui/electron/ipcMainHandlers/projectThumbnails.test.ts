const mockHandlers: Record<string, (...args: any[]) => any> = {};

jest.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (...args: any[]) => any) => {
      mockHandlers[channel] = fn;
    },
  },
  nativeImage: {
    createFromPath: (p: string) => ({
      isEmpty: () => p.includes('broken'),
      resize: () => ({ toJPEG: () => Buffer.from('jpg') }),
    }),
  },
}));

const mockReaddir = jest.fn();
jest.mock('fs', () => ({
  promises: { readdir: (p: string) => mockReaddir(p) },
}));

import { pickFirstFrame, projectThumbnails } from './projectThumbnails';

describe('pickFirstFrame', () => {
  it('returns the lowest-sorted image, ignoring the stabilization background and non-images', () => {
    expect(pickFirstFrame(['0000000002.jpg', 'background.jpg', '.DS_Store', '0000000001.jpg'])).toBe('0000000001.jpg');
  });

  it('returns an empty string when frames/ holds no image', () => {
    expect(pickFirstFrame([])).toBe('');
    expect(pickFirstFrame(['background.jpg', 'notes.txt'])).toBe('');
  });
});

describe('project-thumbnails handler', () => {
  beforeAll(() => projectThumbnails());

  it('answers one entry per directory, in order, with "" for missing or unreadable frames', async () => {
    mockReaddir.mockImplementation(async (p: string) => {
      if (p.includes('gone')) throw new Error('ENOENT');
      if (p.includes('empty')) return [];
      return ['0000000000.jpg'];
    });
    const result = await mockHandlers['project-thumbnails']({}, ['/ok', '/gone', '/empty', '/broken', 7]);
    expect(result).toEqual([`data:image/jpeg;base64,${Buffer.from('jpg').toString('base64')}`, '', '', '', '']);
  });

  it('returns [] for a non-array argument', async () => {
    await expect(mockHandlers['project-thumbnails']({}, '/ok')).resolves.toEqual([]);
  });
});
