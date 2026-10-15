import { readFileSync } from 'fs';
import { join } from 'path';
import { TECHNIQUE_MARKER_SHAPE } from './techniqueMarkers';

describe('technique marker shapes', () => {
  it('assigns one shape per technique, matching the legend/processing swatch classes', () => {
    expect(TECHNIQUE_MARKER_SHAPE).toEqual({
      lspiv: 'circle',
      stiv: 'square',
      iwave: 'triangle',
    });
  });

  it('velocitySvg.ts branches its marker element on TECHNIQUE_MARKER_SHAPE', () => {
    const source = readFileSync(join(__dirname, '..', 'components', 'Graphs', 'velocitySvg.ts'), 'utf8');
    expect(source).toMatch(/TECHNIQUE_MARKER_SHAPE/);
    expect(source).toMatch(/append\('rect'\)/);
    expect(source).toMatch(/append\('polygon'\)/);
  });
});
