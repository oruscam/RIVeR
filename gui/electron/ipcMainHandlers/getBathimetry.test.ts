// getBathimetry.ts pulls in electron/xlsx/PROJECT_CONFIG at module load time
// purely for the IPC handler; these tests only exercise the pure helper
// functions, so those side-effecting imports are mocked out (same approach
// as distances.test.ts).
jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn() },
  dialog: { showOpenDialog: jest.fn() },
}));

jest.mock('xlsx', () => ({
  readFile: jest.fn(),
  utils: { sheet_to_json: jest.fn() },
  set_fs: jest.fn(),
  writeFile: jest.fn(),
}));

jest.mock('fs', () => ({
  promises: { writeFile: jest.fn() },
}));

jest.mock('./utils/validateFile', () => ({
  validateFile: jest.fn(),
  EXTENSIONS: ['xlsx', 'csv'],
}));

jest.mock('../main', () => ({
  PROJECT_CONFIG: { defaultFilesPath: '/default/path', projectDirectory: '/default/path' },
}));

import { analyzeLine, transformLine } from './getBathimetry';

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
