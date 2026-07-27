// getBathimetry.ts pulls in electron/xlsx/PROJECT_CONFIG at module load time
// purely for the IPC handler; these tests only exercise the pure helper
// functions, so those side-effecting imports are mocked out (same approach
// as distances.test.ts).
jest.mock('electron', () => {
  let registeredHandler: (event: any, args: any) => any;
  return {
    ipcMain: {
      handle: jest.fn((channel: string, handler: (event: any, args: any) => any) => {
        if (channel === 'get-bathimetry') registeredHandler = handler;
      }),
      _triggerGetBathimetry: async (event: any, args: any) => registeredHandler(event, args),
    },
    dialog: { showOpenDialog: jest.fn().mockResolvedValue({ filePaths: [] }) },
  };
});

jest.mock('xlsx', () => ({
  readFile: jest.fn(() => ({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } })),
  utils: { sheet_to_json: jest.fn() },
  set_fs: jest.fn(),
  writeFile: jest.fn(),
}));

jest.mock('fs', () => ({
  promises: { writeFile: jest.fn() },
  readFileSync: jest.fn(),
}));

jest.mock('./utils/validateFile', () => ({
  validateFile: jest.fn(),
  EXTENSIONS: ['xlsx', 'csv'],
}));

jest.mock('../main', () => ({
  PROJECT_CONFIG: { defaultFilesPath: '/default/path', projectDirectory: '/default/path' },
}));

import { analyzeLine, transformLine, getBathimetry } from './getBathimetry';
import { ipcMain } from 'electron';
import { utils } from 'xlsx';
import * as fs from 'fs';
import { validateFile } from './utils/validateFile';

describe('analyzeLine / transformLine — depth vs elevation classification', () => {
  it('classifies as depth a channel whose deepest point sits near one bank (reported bug)', () => {
    // Real-world repro: banks at 0, deepest point (1.31) at index 9 of 11
    // (i.e. length - 2), which the old position-based heuristic treated as
    // an "edge" and misclassified as an elevation profile.
    const line = [
      { x: 0, y: 0 },
      { x: 5, y: 0.45 },
      { x: 7.5, y: 0.62 },
      { x: 10, y: 0.72 },
      { x: 12.5, y: 0.9 },
      { x: 15, y: 1.05 },
      { x: 17.5, y: 1.1 },
      { x: 20, y: 1.2 },
      { x: 22.5, y: 1.3 },
      { x: 24, y: 1.31 },
      { x: 27, y: 0 },
    ];
    const maxYIndex = 9;

    const { isDecreced, isDepth } = analyzeLine(line, maxYIndex);
    expect(isDecreced).toBe(false);
    expect(isDepth).toBe(true);

    const { newLine, changed } = transformLine(line, isDecreced, isDepth, 1.31);
    expect(changed).toBe(true);
    // Deepest point (1.31) must become the lowest value (bed), banks stay at the max.
    expect(newLine[9].y).toBeCloseTo(0, 5);
    expect(newLine[0].y).toBeCloseTo(1.31, 5);
  });

  it('classifies a symmetric hill-shaped depth profile as depth (regression)', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 5, y: 1 },
      { x: 10, y: 2 },
      { x: 15, y: 1 },
      { x: 20, y: 0 },
    ];
    const { isDecreced, isDepth } = analyzeLine(line, 2);
    expect(isDepth).toBe(true);

    const { newLine } = transformLine(line, isDecreced, isDepth, 2);
    expect(newLine[2].y).toBeCloseTo(0, 5); // the deepest point becomes the bed
  });

  it('leaves an already-correct valley-shaped elevation profile unchanged', () => {
    const line = [
      { x: 0, y: 10 },
      { x: 5, y: 4 },
      { x: 10, y: 1 },
      { x: 15, y: 4 },
      { x: 20, y: 10 },
    ];
    const { isDecreced, isDepth } = analyzeLine(line, 0);
    expect(isDepth).toBe(false);

    const { newLine, changed } = transformLine(line, isDecreced, isDepth, 10);
    expect(changed).toBe(false);
    expect(newLine).toEqual(line);
  });

  it('handles an asymmetric elevation profile (banks at different heights) without misclassifying it as depth', () => {
    const line = [
      { x: 0, y: 8 },
      { x: 5, y: 3 },
      { x: 10, y: 1 },
      { x: 15, y: 5 },
      { x: 20, y: 12 },
    ];
    const { isDepth } = analyzeLine(line, 4);
    expect(isDepth).toBe(false);
  });

  it('reorders and inverts a depth profile given with descending stations', () => {
    const line = [
      { x: 20, y: 0 },
      { x: 15, y: 1 },
      { x: 10, y: 2 },
      { x: 5, y: 1 },
      { x: 0, y: 0 },
    ];
    const { isDecreced, isDepth } = analyzeLine(line, 2);
    expect(isDecreced).toBe(true);
    expect(isDepth).toBe(true);

    const { newLine } = transformLine(line, isDecreced, isDepth, 2);
    // Ascending order now, deepest point (originally 2) becomes the bed (0).
    expect(newLine[0].x).toBe(0);
    expect(newLine[newLine.length - 1].x).toBe(20);
    expect(newLine[2].y).toBeCloseTo(0, 5);
  });
});

describe('getBathimetry — header row handling (integration)', () => {
  beforeAll(() => {
    getBathimetry();
  });

  beforeEach(() => {
    (validateFile as jest.Mock).mockReturnValue(true);
  });

  const trigger = async (args: any) => {
    // @ts-expect-error — test-only helper added to the electron mock
    return await ipcMain._triggerGetBathimetry({}, args);
  };

  // Same reported repro case (deepest point near a bank), with and without
  // a header row, to confirm header stripping doesn't affect classification.
  const dataRows = [
    [0, 0],
    [5, 0.45],
    [7.5, 0.62],
    [10, 0.72],
    [12.5, 0.9],
    [15, 1.05],
    [17.5, 1.1],
    [20, 1.2],
    [22.5, 1.3],
    [24, 1.31],
    [27, 0],
  ];

  it('inverts the depth profile correctly when the file has a header row', async () => {
    (utils.sheet_to_json as jest.Mock).mockReturnValue([['Station', 'Depth'], ...dataRows]);
    const response = await trigger({ path: 'valid.xlsx', unitSistem: 'metric' });

    expect(response.error).toBeUndefined();
    expect(response.changed).toBe(true);
    expect(response.line[0].y).toBeCloseTo(1.31, 5);
    expect(response.line[9].y).toBeCloseTo(0, 5);
  });

  it('inverts the depth profile correctly when the file has no header row', async () => {
    (utils.sheet_to_json as jest.Mock).mockReturnValue(dataRows);
    const response = await trigger({ path: 'valid.xlsx', unitSistem: 'metric' });

    expect(response.error).toBeUndefined();
    expect(response.changed).toBe(true);
    expect(response.line[0].y).toBeCloseTo(1.31, 5);
    expect(response.line[9].y).toBeCloseTo(0, 5);
  });
});

describe('getBathimetry — depth profiles are rejected in 3D (IPCam) mode', () => {
  beforeAll(() => {
    getBathimetry();
  });

  beforeEach(() => {
    (validateFile as jest.Mock).mockReturnValue(true);
  });

  const trigger = async (args: any) => {
    // @ts-expect-error — test-only helper added to the electron mock
    return await ipcMain._triggerGetBathimetry({}, args);
  };

  // Same hill-shaped depth profile used in the classification tests above.
  const depthRows = [
    [0, 0],
    [5, 0.45],
    [7.5, 0.62],
    [10, 0.72],
    [12.5, 0.9],
    [15, 1.05],
    [17.5, 1.1],
    [20, 1.2],
    [22.5, 1.3],
    [24, 1.31],
    [27, 0],
  ];

  const elevationRows = [
    [0, 10],
    [5, 4],
    [10, 1],
    [15, 4],
    [20, 10],
  ];

  it('rejects a depth profile when zLimits is present (3D/IPCam)', async () => {
    (utils.sheet_to_json as jest.Mock).mockReturnValue(depthRows);
    const response = await trigger({
      path: 'valid.xlsx',
      unitSistem: 'metric',
      zLimits: { min: 0, max: 0 },
    });

    expect(response.error?.message).toBe('invalidBathimetryDepthNotAllowed');
    expect(response.line).toBeUndefined();
  });

  it('accepts the same depth profile when zLimits is absent (UAV/Oblique)', async () => {
    (utils.sheet_to_json as jest.Mock).mockReturnValue(depthRows);
    const response = await trigger({ path: 'valid.xlsx', unitSistem: 'metric' });

    expect(response.error).toBeUndefined();
    expect(response.changed).toBe(true);
  });

  it('accepts an already-elevation profile even when zLimits is present (3D/IPCam)', async () => {
    (utils.sheet_to_json as jest.Mock).mockReturnValue(elevationRows);
    const response = await trigger({
      path: 'valid.xlsx',
      unitSistem: 'metric',
      zLimits: { min: 0, max: 0 },
    });

    expect(response.error).toBeUndefined();
    expect(response.changed).toBe(false);
  });
});

describe('getBathimetry — non-CSV source is always rewritten as CSV', () => {
  beforeAll(() => {
    getBathimetry();
  });

  beforeEach(() => {
    (validateFile as jest.Mock).mockReturnValue(true);
    (fs.promises.writeFile as jest.Mock).mockClear();
  });

  const trigger = async (args: any) => {
    // @ts-expect-error — test-only helper added to the electron mock
    return await ipcMain._triggerGetBathimetry({}, args);
  };

  it('writes a normalized CSV even when the profile needs no inversion (reported LibreOffice/ODS case)', async () => {
    // Valley-shaped profile (already elevation, changed === false), same
    // shape as the real .ods file that reproduced the bug: previously this
    // meant nothing got rewritten and the original .ods — with its
    // locale-formatted, comma-decimal display text — was handed straight to
    // the Python backend, which failed to parse it as a float.
    const valleyProfile = [
      [0, 0.542],
      [0.45, 0.374],
      [1.45, 0.265],
      [7.45, 0],
      [14.45, 0.397],
      [15.85, 0.542],
    ];
    (utils.sheet_to_json as jest.Mock).mockReturnValue(valleyProfile);
    const response = await trigger({ path: 'valid.ods', unitSistem: 'metric' });

    expect(response.error).toBeUndefined();
    expect(response.changed).toBe(false); // no depth inversion needed
    expect(response.path).not.toBe('valid.ods'); // but still rewritten
    expect(response.path.endsWith('_modified.csv')).toBe(true);
    expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
  });

  it('does not rewrite an already-clean CSV that needs no changes', async () => {
    (fs.readFileSync as jest.Mock).mockReturnValue('0,10\n5,4\n10,1\n15,4\n20,10');

    const response = await trigger({ path: 'valid.csv', unitSistem: 'metric' });

    expect(response.error).toBeUndefined();
    expect(response.changed).toBe(false);
    expect(response.path).toBe('valid.csv');
    expect(fs.promises.writeFile).not.toHaveBeenCalled();
  });
});
