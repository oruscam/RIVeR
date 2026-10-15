import { readFileSync } from 'fs';
import { join } from 'path';

const css = readFileSync(join(__dirname, '..', 'components', 'components.css'), 'utf8');
const src = readFileSync(join(__dirname, '..', 'components', 'IpcamGrid.tsx'), 'utf8');

// Everything between the block's opening banner and its closing marker.
const start = css.indexOf('/* IPCAM GRID');
const block = start === -1 ? '' : css.slice(start, css.indexOf('/* END IPCAM GRID */'));

describe('control points table chrome', () => {
  test('the block exists and is closed', () => {
    expect(start).toBeGreaterThan(-1);
    expect(block.length).toBeGreaterThan(200);
  });
  test('no shadow, no uppercase header, no accent rule under the header', () => {
    expect(block).toMatch(/#ipcam-grid\s*\{[^}]*box-shadow:\s*none/);
    expect(block).toMatch(/text-transform:\s*none/);
    expect(block).not.toMatch(/border-bottom:[^;]*var\(--accent-color\)/);
  });
  test('only tokens: no colour literals', () => {
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(block).not.toMatch(/rgba?\(/);
  });
  test('numbers are tabular and right-aligned', () => {
    expect(block).toMatch(/font-variant-numeric:\s*tabular-nums/);
    expect(block).toMatch(/justify-content:\s*flex-end/);
  });
});

describe('control points table columns', () => {
  test('pixel x / y are gone, the error column is there, no placeholder rows', () => {
    expect(src).not.toMatch(/key: 'x'/);
    expect(src).not.toMatch(/key: 'y'/);
    expect(src).toContain("key: 'error'");
    expect(src).not.toContain('Array.from({ length: 10 }');
  });
  test('rows are keyed by the store index', () => {
    expect(src).toMatch(/rowKeyGetter = \(row: IpcamGridRow\): number => row\.id/);
  });
});

describe('control points table behaviour', () => {
  test('ticking a checkbox does not scroll back to the active row', () => {
    expect(src).toMatch(/\}, \[activePoint, sort\]\);/);
  });
  test('the select column is pinned to its width, or the grid clamps it to 35px', () => {
    expect(src).toMatch(/\.\.\.SelectColumn,[\s\S]{0,80}minWidth: 28,[\s\S]{0,40}maxWidth: 28/);
  });
});
