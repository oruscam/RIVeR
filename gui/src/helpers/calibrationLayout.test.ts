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

describe('CalibrationCanvas', () => {
  const canvas = read('components/Calibration/CalibrationCanvas.tsx');

  it('owns the corrected view and its corner overlay', () => {
    expect(canvas).toMatch(/const UndistortedOverlay\b/);
    expect(canvas).toMatch(/className=["']cal-corner-overlay["']/);
    expect(canvas).toMatch(/import \{ toCalFileUrl \} from ['"]\.\.\/\.\.\/helpers\/calFileUrl['"]/);
  });

  it('positions nothing inline, so the canvas-chrome sweep has nothing to allow-list', () => {
    expect(canvas).not.toMatch(/position:\s*['"]absolute['"]/);
  });
});

describe('CalibrationStrip', () => {
  const strip = read('components/Calibration/CalibrationStrip.tsx');
  // .video-button lives in index.css, the rest in components.css.
  const sharedCss = read('components/components.css') + read('index.css');
  const pagesCss = read('pages/pages.css');

  // The strip deliberately copies the shared Carousel's look instead of using
  // the component (spec A12). These are the classes that make it look the
  // same; each must exist in the shared stylesheet AND be used here, so a
  // rename on either side fails this test instead of silently diverging.
  const SHARED = [
    'carousel-container',
    'carousel-resize-handle',
    'carousel-info',
    'carousel',
    'video-button',
    'img-carousel-container',
    'img-carousel',
    'img-carousel-active',
    'img-water-mark',
  ];

  it('uses every shared carousel class that gives the wizard strip its look', () => {
    for (const name of SHARED) {
      expect(sharedCss).toMatch(new RegExp(`\\.${name}[\\s{:,.]`));
      expect(strip).toMatch(new RegExp(`(?<![\\w-])${name}(?![\\w-])`));
    }
  });

  it('dims an unused photo with a selector that out-specifies the shared resting dim', () => {
    // Shared: .img-carousel:not(.img-carousel-active):not(.img-carousel-second) = (0,3,0).
    expect(pagesCss).toContain('.cal-strip .img-carousel.cal-strip-unused:not(.img-carousel-active) {');
    expect(strip).toMatch(/cal-strip-unused/);
  });

  it('keeps the strip height the user already saved', () => {
    expect(strip).toMatch(/storageKey:\s*['"]river-cal-carousel-height['"]/);
  });
});

describe('FormCalibration', () => {
  const form = read('components/Forms/FormCalibration.tsx');

  it('opens with the standard FormHeader, without the wizard stepper or section chips', () => {
    expect(form).toMatch(/<FormHeader[^>]*showProgress=\{false\}[^>]*showSections=\{false\}/s);
  });

  it('puts Back and the single Solve/Save action in the standard footer', () => {
    expect(form).toMatch(/className=["']footer["']/);
    expect(form).toMatch(/className=["']wizard-container["']/);
    expect(form).toMatch(/footerAction\(\{/);
    expect(form).toMatch(/aria-disabled=\{action\.blocker !== null\}/);
    expect(form).toMatch(/if \(action\.blocker !== null\) return;/);
  });

  it('renders ratings as .badge through badgeGrade, never as coloured text', () => {
    expect(form).toMatch(/badgeGrade\(/);
    expect(form).toMatch(/`badge badge-\$\{/);
    expect(form).not.toMatch(/cal-metric-|cal-grade-pill/);
  });

  it('merges the recommendations into one titled warning alert', () => {
    expect((form.match(/className=["']step-alert-title["']/g) ?? []).length).toBe(1);
    expect(form).toMatch(/stepAlertClassName\(['"]warning['"]\)/);
  });

  it('keeps the histogram in the panel and off every canvas-side component', () => {
    expect(form).toMatch(/<CalibrationHistogram\b/);
    for (const file of ['CalibrationCanvas', 'CalibrationStrip', 'CalibrationViewControl']) {
      expect(read(`components/Calibration/${file}.tsx`)).not.toMatch(/Histogram/);
    }
  });
});
