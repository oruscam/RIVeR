import { clearCrossSections } from './clearCrossSections';

const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
jest.mock('fs', () => ({
  promises: {
    readFile: (...args: any[]) => mockReadFile(...args),
    writeFile: (...args: any[]) => mockWriteFile(...args),
  },
}));

describe('clearCrossSections', () => {
  beforeEach(() => {
    mockReadFile.mockReset();
    mockWriteFile.mockReset();
  });

  it('strips computed results down to the basic geometry keys', async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        CS_default_1: { bath: 'a.csv', rw_length: 1, level: 2, extra_computed_field: 3 },
        summary: { mean: {} },
      })
    );

    await clearCrossSections('/fake/xsections.json');

    const written = JSON.parse(mockWriteFile.mock.calls[0][1]);
    expect(written).toEqual({
      CS_default_1: {
        bath: 'a.csv',
        rw_length: 1,
        level: 2,
        left_station: undefined,
        east_l: undefined,
        east_r: undefined,
        north_l: undefined,
        north_r: undefined,
        xl: undefined,
        yl: undefined,
        xr: undefined,
        yr: undefined,
        dir_east_l: undefined,
        dir_north_l: undefined,
        dir_east_r: undefined,
        dir_north_r: undefined,
        dir_xl: undefined,
        dir_yl: undefined,
        dir_xr: undefined,
        dir_yr: undefined,
        num_stations: undefined,
        alpha: undefined,
      },
    });
  });

  // Regression test: after a full Analize run, analyze-all repopulates xsections.json
  // with computed results that can include literal NaN tokens (e.g. displacement_x/y
  // at the edge stations) — valid for Python's json.dumps but not for JSON.parse.
  // Re-running Analize (e.g. after visiting Results and going Back to Processing)
  // reads this same file again, and must not crash on those NaN tokens.
  it('does not throw when the file contains literal NaN tokens from a previous analysis', async () => {
    mockReadFile.mockResolvedValue(
      '{"CS_default_1": {"bath": "a.csv", "rw_length": 1, "displacement_x": [NaN, 0.1, NaN]}, "summary": {}}'
    );

    await expect(clearCrossSections('/fake/xsections.json')).resolves.not.toThrow();

    const written = JSON.parse(mockWriteFile.mock.calls[0][1]);
    expect(written.CS_default_1.bath).toBe('a.csv');
    expect(written.summary).toBeUndefined();
  });
});
