import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const read = (relPath: string) => readFileSync(join(SRC, relPath), 'utf8');

describe('CalibrationViewControl', () => {
  const control = read('components/Calibration/CalibrationViewControl.tsx');

  it('is a tablist on .seg-float, the canvas-chrome variant of .seg', () => {
    expect(control).toMatch(/className=["']seg-float["']/);
    expect(control).toMatch(/role=["']tablist["']/);
  });

  it('renders one tab per mode from CALIBRATION_VIEW_MODES, selected via aria-selected', () => {
    expect(control).toMatch(/CALIBRATION_VIEW_MODES\.map\(/);
    expect(control).toMatch(/role=["']tab["']/);
    expect(control).toMatch(/aria-selected=\{viewMode === mode\}/);
  });

  it('gates an unavailable segment with aria-disabled plus a matching early-return guard', () => {
    expect(control).toMatch(/aria-disabled=\{availability\[mode\] !== null\}/);
    expect(control).toMatch(/if \(availability\[mode\] !== null\) return;/);
  });
});
