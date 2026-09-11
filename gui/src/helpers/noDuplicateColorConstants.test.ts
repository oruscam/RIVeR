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
});
