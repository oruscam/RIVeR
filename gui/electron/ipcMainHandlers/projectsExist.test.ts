import * as path from 'path';

const mockHandlers: Record<string, (...args: any[]) => any> = {};

jest.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (...args: any[]) => any) => {
      mockHandlers[channel] = fn;
    },
  },
}));

const mockExists = jest.fn();
jest.mock('fs', () => ({
  existsSync: (p: string) => mockExists(p),
}));

import { existingProjectDirectories, projectsExist } from './projectsExist';

describe('existingProjectDirectories', () => {
  it('keeps directories whose settings.json exists, in input order', () => {
    const present = new Set([path.join('/b', 'settings.json'), path.join('/a', 'settings.json')]);
    expect(existingProjectDirectories(['/a', '/gone', '/b'], (p) => present.has(p))).toEqual(['/a', '/b']);
  });

  it('returns [] for a non-array argument and skips non-strings', () => {
    const yes = () => true;
    expect(existingProjectDirectories(undefined, yes)).toEqual([]);
    expect(existingProjectDirectories('/a', yes)).toEqual([]);
    expect(existingProjectDirectories(['/a', 3, null, ''], yes)).toEqual(['/a']);
  });

  it('treats an exists() that throws as missing', () => {
    expect(
      existingProjectDirectories(['/a'], () => {
        throw new Error('EACCES');
      })
    ).toEqual([]);
  });
});

describe('projects-exist handler', () => {
  beforeAll(() => projectsExist());

  it('registers the channel and checks settings.json through fs.existsSync', async () => {
    mockExists.mockImplementation((p: string) => p === path.join('/keep', 'settings.json'));
    await expect(mockHandlers['projects-exist']({}, ['/keep', '/drop'])).resolves.toEqual(['/keep']);
  });
});
