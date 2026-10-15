const mockHandlers: Record<string, (...args: any[]) => any> = {};
const mockShowOpenDialog = jest.fn();

jest.mock('electron', () => ({
  ipcMain: { handle: (channel: string, fn: (...args: any[]) => any) => (mockHandlers[channel] = fn) },
  dialog: { showOpenDialog: (...args: any[]) => mockShowOpenDialog(...args) },
}));

const mockImport = jest.fn();
jest.mock('./getBathimetry', () => ({ importBathymetry: (...args: any[]) => mockImport(...args) }));

jest.mock('./utils/validateFile', () => ({ EXTENSIONS: ['csv'] }));

const mockConfig = { projectDirectory: '', xsectionsPath: '' };
jest.mock('../main', () => ({ PROJECT_CONFIG: mockConfig }));

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { locateBathymetry } from './locateBathymetry';

let project: string;

beforeAll(() => locateBathymetry());

beforeEach(() => {
  project = fs.mkdtempSync(path.join(os.tmpdir(), 'river-locate-bath-'));
  mockConfig.projectDirectory = project;
  mockConfig.xsectionsPath = path.join(project, 'xsections.json');
  fs.writeFileSync(
    mockConfig.xsectionsPath,
    '{"CS_default_1": {"bath": "/gone/bathy.csv", "q": NaN}, "CS_default_2": {"bath": "/gone/bathy.csv"}}'
  );
  mockShowOpenDialog.mockReset();
  mockImport.mockReset();
});

afterEach(() => fs.rmSync(project, { recursive: true, force: true }));

const locate = (args: object) => mockHandlers['locate-bathymetry']({}, args);
const xsections = () => fs.readFileSync(mockConfig.xsectionsPath, 'utf-8');

describe('locate-bathymetry', () => {
  it('imports the picked file and points every section that shared the old one at it', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/new/place/bathy.csv'] });
    const newPath = path.join(project, 'bathy.csv');
    mockImport.mockResolvedValue({ path: newPath, name: 'bathy.csv', line: [{ x: 0, y: 1 }], changed: false });

    const result = await locate({ section: 'CS_default_1', unitSistem: 'si' });

    expect(mockImport).toHaveBeenCalledWith('/new/place/bathy.csv', { zLimits: undefined, unitSistem: 'si' });
    expect(result).toEqual({
      status: 'ok',
      path: newPath,
      name: 'bathy.csv',
      line: [{ x: 0, y: 1 }],
      replaced: '/gone/bathy.csv',
    });
    expect(xsections()).not.toContain('/gone/bathy.csv');
    expect(xsections()).toContain('"q": NaN');
  });

  it('changes nothing when the picker is canceled', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
    const before = xsections();
    expect(await locate({ section: 'CS_default_1' })).toEqual({ status: 'canceled' });
    expect(mockImport).not.toHaveBeenCalled();
    expect(xsections()).toBe(before);
  });

  it('returns the import error and changes nothing', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/bad.csv'] });
    mockImport.mockRejectedValue(new Error('invalidBathimetryFileFormat'));
    const before = xsections();
    expect(await locate({ section: 'CS_default_1' })).toEqual({
      status: 'error',
      message: 'invalidBathimetryFileFormat',
    });
    expect(xsections()).toBe(before);
  });
});
