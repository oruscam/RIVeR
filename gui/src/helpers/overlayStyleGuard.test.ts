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

describe('oblique and ipcam canvases use the shared overlay style', () => {
  const oblique = read('src/components/Graphs/drawOblique.ts');
  const ipcam = read('src/components/Graphs/drawIpcam.ts');
  test('distance lines and the reprojection line go through drawOverlayLine', () => {
    expect(oblique.match(/drawOverlayLine\(/g)?.length).toBe(2);
    expect(oblique).not.toMatch(/\.attr\('stroke-width'/);
    expect(ipcam).toMatch(/drawOverlayLine\(\{[\s\S]*thin: true/);
    // the only literal width left in drawIpcam is the confidence ellipse (out of scope)
    expect(ipcam.match(/\.attr\('stroke-width'/g)?.length).toBe(1);
  });
  test('pins get the visible image (image space) and re-lean while dragged', () => {
    for (const src of [oblique, ipcam]) {
      expect(src).toContain("visibleImageBounds(");
      expect(src).toContain("'image'");
      expect(src).toContain('updatePinLean(');
    }
  });
  test('MARKS is gone', () => {
    expect(read('src/constants/constants.ts')).not.toMatch(/export const MARKS/);
  });
});

describe('report calibration overlays use the report size', () => {
  const oblique = read('src/components/Graphs/obliqueSvg.ts');
  const ipcam = read('src/components/Graphs/ipcamSvg.ts');
  test('lines through drawOverlayLine at report size, pins at the report divisor inside the frame', () => {
    expect(oblique).toContain("size: 'report'");
    expect(oblique).not.toMatch(/\.attr\('stroke-width'/);
    expect(ipcam).toMatch(/drawOverlayLine\(\{[\s\S]*thin: true/);
    expect(ipcam.match(/\.attr\('stroke-width'/g)?.length).toBe(1); // the ellipse
    for (const src of [oblique, ipcam]) {
      expect(src).toContain('OVERLAY_STYLE.report.PIN_DIVISOR');
      expect(src).toMatch(/bounds: \{ x: 0, y: 0, width, height \}/);
      expect(src).not.toContain('pinDivisor');
    }
  });
  test('oblique point 1 is the red left pin, as on the canvas', () => {
    expect(oblique).toMatch(/kind: i === 0 \? 'left' : 'point'/);
  });
  test('the report no longer carries its own pin divisor', () => {
    expect(read('src/components/Report/CalibrationSheet.tsx')).not.toContain('pinDivisor');
    expect(read('src/constants/constants.ts')).not.toContain('METHOD_PIN_DIVISOR');
  });
});
