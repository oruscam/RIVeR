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
const mockReadFile = jest.fn();
jest.mock('fs/promises', () => ({
  readdir: (...args: any[]) => mockReaddir(...args),
  readFile: (...args: any[]) => mockReadFile(...args),
}));

import { getIwaveSpectra } from './getIwaveSpectra';

const trigger = async (args: any) => mockHandlers['get-iwave-spectra']({}, args);

const SIDECAR = {
  version: 1,
  stations: [
    {
      station: 1,
      kx_min: -1,
      kx_max: 1,
      kt_min: -4,
      kt_max: 4,
      curves: { gravity: [[0, 0]], turbulence: [[0, 0]] },
    },
  ],
};

describe('get-iwave-spectra', () => {
  beforeAll(() => {
    getIwaveSpectra();
  });

  beforeEach(() => {
    mockReaddir.mockReset();
    mockReadFile.mockReset();
  });

  it('returns station ids and paths, sorted numerically', async () => {
    // Lexicographically misleading: '10' sorts before '2' as a string.
    mockReaddir.mockResolvedValue(['spectrum_10.png', 'spectrum_2.png', 'spectrum_1.png']);
    mockReadFile.mockResolvedValue(JSON.stringify(SIDECAR));

    const result = await trigger({ sectionName: 'CS_default_1' });

    expect(result.stations).toEqual([1, 2, 10]);
    expect(result.paths).toHaveLength(3);
    expect(result.paths[0]).toContain('spectrum_1.png');
    expect(result.paths[2]).toContain('spectrum_10.png');
  });

  it('ignores files that are not spectrum images', async () => {
    mockReaddir.mockResolvedValue(['spectrum_1.png', 'spectra.json', 'notes.txt']);
    mockReadFile.mockResolvedValue(JSON.stringify(SIDECAR));

    const result = await trigger({ sectionName: 'CS_default_1' });

    expect(result.stations).toEqual([1]);
  });

  it('parses the sidecar', async () => {
    mockReaddir.mockResolvedValue(['spectrum_1.png']);
    mockReadFile.mockResolvedValue(JSON.stringify(SIDECAR));

    const result = await trigger({ sectionName: 'CS_default_1' });

    expect(result.sidecar?.stations[0].kx_max).toBe(1);
  });

  it('returns an empty result when the directory is absent', async () => {
    mockReaddir.mockRejectedValue(new Error('ENOENT'));

    const result = await trigger({ sectionName: 'CS_default_1' });

    expect(result).toEqual({ stations: [], paths: [], sidecar: null });
  });

  it('returns images with a null sidecar when the sidecar is unreadable', async () => {
    mockReaddir.mockResolvedValue(['spectrum_1.png']);
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const result = await trigger({ sectionName: 'CS_default_1' });

    expect(result.stations).toEqual([1]);
    expect(result.sidecar).toBeNull();
  });

  it('returns an empty result when no section name is given', async () => {
    const result = await trigger({});

    expect(result).toEqual({ stations: [], paths: [], sidecar: null });
  });
});
