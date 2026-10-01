import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * "Draw Points" is a canvas action, like Cross Section's "Draw Direction": it reads as
 * pressed (filled) only while a drawing session is active. `drawPoints` alone stays true
 * after the square is placed, which left the button filled for good and made it look like
 * a completed file import, so the pressed state also requires isDefaultCoordinates.
 */
const source = readFileSync(join(__dirname, '..', 'components', 'Forms', 'FormOblique.tsx'), 'utf8');

describe('Control Points: Draw Points button state', () => {
  it('is pressed only during an active drawing session', () => {
    const button = source.match(/<button[^>]*id="draw-coordinates"[^>]*>/s)?.[0] ?? '';
    expect(button).toContain('aria-pressed={drawPoints && isDefaultCoordinates}');
  });

  it('keeps Import Distances as a file-import button that fills when loaded', () => {
    const button = source.match(/<button[^>]*id="import-distances"[^>]*>/s)?.[0] ?? '';
    expect(button).toContain('data-complete={isDistancesLoaded}');
    expect(button).not.toContain('aria-pressed');
  });
});
