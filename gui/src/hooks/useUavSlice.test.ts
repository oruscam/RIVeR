import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, 'useUavSlice.ts'), 'utf8');

describe('UAV pixel size typed before any line is drawn', () => {
  // The branch that places a default line from a typed pixel size.
  const autoLineBranch = src.slice(
    src.indexOf('getLinesCoordinates(value.imageWidth!'),
    src.indexOf('} else {', src.indexOf('getLinesCoordinates(value.imageWidth!'))
  );

  it('places the line without entering drawing-line mode', () => {
    expect(autoLineBranch).toMatch(/updatedPixelSize\.dirPoints = newDirPoints/);
    expect(autoLineBranch).toMatch(/updatedPixelSize\.drawLine = false/);
    expect(autoLineBranch).not.toMatch(/updatedPixelSize\.drawLine = true/);
  });
});
