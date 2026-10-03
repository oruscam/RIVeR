import { readFileSync } from 'fs';
import { join } from 'path';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

describe('drawSections uses the shared overlay style', () => {
  const src = read('src/components/CrossSections/drawSections.ts');
  test('lines go through drawOverlayLine; no own stroke widths or resize factor', () => {
    expect(src).toContain('drawOverlayLine(');
    expect(src).not.toMatch(/\.attr\('stroke-width'/);
    expect(src).not.toContain('resizeFactor');
  });
  test('L/R pins: x-sections and report always, results only for the active section', () => {
    expect(src).toMatch(/module === 'x-sections' \|\| module === 'report' \|\| \(module === 'results' && isActive\)/);
  });
  test('the "see all off" early return for inactive results sections stays ahead of the pins', () => {
    expect(src.indexOf("seeAll === false && !isActive && module === 'results'")).toBeLessThan(src.indexOf('showBankPins'));
  });
  test('every pin gets bounds, and dragged pins re-lean', () => {
    expect(src).toContain("visibleImageBounds(");
    expect(src.match(/updatePinLean\(/g)?.length).toBe(2);
  });
});
