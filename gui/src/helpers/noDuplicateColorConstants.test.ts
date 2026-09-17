import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * COLORS.CONTROL_POINTS duplicated getDistanceColors()'s live values as a
 * dark-theme-frozen constant. Once every consumer reads the live tokens
 * instead, the duplicate must not exist — this guards against it coming
 * back (e.g. a future file reaching for the "simpler" static import again).
 */
describe('no duplicate, theme-frozen colour constants', () => {
  it('constants.ts no longer exports CONTROL_POINTS', () => {
    const constants = readFileSync(join(__dirname, '..', 'constants', 'constants.ts'), 'utf8');
    expect(constants).not.toMatch(/CONTROL_POINTS/);
  });

  it('obliqueSvg.ts reads distance colours from getDistanceColors, not COLORS', () => {
    const source = readFileSync(join(__dirname, '..', 'components', 'Graphs', 'obliqueSvg.ts'), 'utf8');
    expect(source).not.toMatch(/COLORS\.CONTROL_POINTS/);
    expect(source).toMatch(/getDistanceColors/);
  });

  it('constants.ts no longer exports the static TECHNIQUE_COLORS (every consumer now reads getTechniqueColors live)', () => {
    const constants = readFileSync(join(__dirname, '..', 'constants', 'constants.ts'), 'utf8');
    expect(constants).not.toMatch(/export const TECHNIQUE_COLORS/);
  });

  it('the pin colour duplication is fixed: createPinsBase64.ts is gone, and nothing reads the old pin*.svg assets', () => {
    const iconsSource = readFileSync(join(__dirname, '..', 'assets', 'icons', 'icons.ts'), 'utf8');
    expect(iconsSource).not.toMatch(/pinRed|pinGreen|pinGrey|from '\.\/pin\.svg'/);
    expect(() =>
      readFileSync(join(__dirname, '..', 'components', 'Graphs', 'createPinsBase64.ts'), 'utf8')
    ).toThrow();
  });

  it('every migrated pin call site reads colours from getPinColors, not COLORS.RED/GREEN/LIGHT_BLUE for pins', () => {
    const files = [
      ['components', 'CrossSections', 'drawSections.ts'],
      ['components', 'Graphs', 'drawOblique.ts'],
      ['components', 'Graphs', 'drawIpcam.ts'],
      ['components', 'Graphs', 'obliqueSvg.ts'],
      ['components', 'Graphs', 'ipcamSvg.ts'],
    ];
    files.forEach((segments) => {
      const source = readFileSync(join(__dirname, '..', ...segments), 'utf8');
      expect(source).not.toMatch(/pinRed|pinGreen|pinGrey|createPinsBase64/);
    });
  });
});
