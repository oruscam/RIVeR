import * as path from 'path';

const mockHandlers: Record<string, (...args: any[]) => any> = {};

jest.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (...args: any[]) => any) => {
      mockHandlers[channel] = fn;
    },
  },
}));

jest.mock('../main', () => ({
  PROJECT_CONFIG: { projectDirectory: '/fake/project' },
}));

const mockReaddir = jest.fn();
jest.mock('fs/promises', () => ({
  readdir: (...args: any[]) => mockReaddir(...args),
}));

import { getStis } from './getStis';

const trigger = async (args: any) => mockHandlers['get-stis']({}, args);

describe('get-stis', () => {
  beforeAll(() => {
    getStis();
  });

  beforeEach(() => {
    mockReaddir.mockReset();
  });

  it('returns station ids and paths, sorted numerically', async () => {
    // Deliberately out of order, and lexicographically misleading (10 < 2 as strings).
    mockReaddir.mockResolvedValue(['sti_10.png', 'sti_2.png', 'sti_1.png']);

    const result = await trigger({ sectionName: 'CS_default_1' });

    expect(result.stations).toEqual([1, 2, 10]);
    expect(result.paths).toHaveLength(3);
    expect(result.paths[0]).toContain(path.join('stis', 'CS_default_1', 'sti_1.png'));
    expect(result.paths[2]).toContain(path.join('stis', 'CS_default_1', 'sti_10.png'));
  });

  it('ignores files that are not sti_<n>.png', async () => {
    mockReaddir.mockResolvedValue(['sti_1.png', 'notes.txt', 'sti_scene.png', 'sti_3.png']);

    const result = await trigger({ sectionName: 'CS_default_1' });

    expect(result.stations).toEqual([1, 3]);
  });

  it('returns an empty result when the folder does not exist', async () => {
    mockReaddir.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    const result = await trigger({ sectionName: 'CS_default_1' });

    expect(result).toEqual({ stations: [], paths: [] });
  });
});
