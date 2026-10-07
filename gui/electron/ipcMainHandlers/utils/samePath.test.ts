import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isSameFile, isSameFolder } from './samePath';

let root: string;
let real: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'river-same-'));
  real = path.join(root, 'River');
  fs.mkdirSync(real);
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

// Whether this temp disk ignores case (macOS and Windows defaults do; Linux does not).
const caseInsensitive = () => fs.existsSync(path.join(root, 'river'));

describe('isSameFolder', () => {
  it('is true for equal paths, even when the folder does not exist', () => {
    expect(isSameFolder('/gone/a/', '/gone/a')).toBe(true);
  });

  it('is true for a folder reached through a symlink', () => {
    const link = path.join(root, 'link');
    fs.symlinkSync(real, link, 'dir');
    expect(isSameFolder(link, real)).toBe(true);
  });

  it('is false for two different folders, or when one is missing', () => {
    const other = path.join(root, 'other');
    fs.mkdirSync(other);
    expect(isSameFolder(real, other)).toBe(false);
    expect(isSameFolder(real, path.join(root, 'gone'))).toBe(false);
  });

  it('is true for a case-only difference on a case-insensitive disk', () => {
    if (!caseInsensitive()) return; // nothing to check on a case-sensitive disk
    expect(isSameFolder(path.join(root, 'river'), real)).toBe(true);
  });
});

describe('isSameFile', () => {
  it('compares the folder by identity and the name as written', () => {
    const link = path.join(root, 'link');
    fs.symlinkSync(real, link, 'dir');
    expect(isSameFile(path.join(link, 'xsections.json'), path.join(real, 'xsections.json'))).toBe(true);
    expect(isSameFile(path.join(link, 'xsections.json'), path.join(real, 'piv_results.json'))).toBe(false);
  });
});
