import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('report stylesheet', () => {
  const css = read('src/components/Report/report.css');

  test('keeps the scale exemption header', () => {
    expect(css.startsWith('/* scale-exempt-file:')).toBe(true);
  });

  test('prints on A4, one sheet per page', () => {
    expect(css).toMatch(/@page\s*\{[^}]*size:\s*A4 portrait/);
    expect(css).toMatch(/\.sheet\s*\{[^}]*break-after:\s*page/);
  });

  test('no gradients and no dark page ground', () => {
    expect(css).not.toMatch(/gradient\(/);
    expect(css).not.toMatch(/#262626/);
  });

  test('the report scope paints its own white paper for charts', () => {
    expect(css).toMatch(/\.report-doc(\[data-theme-scope\])?\s*\{[^}]*--background-color:\s*#ffffff/i);
  });
});

describe('Sheet', () => {
  test('footer carries title and page n / N', () => {
    const src = read('src/components/Report/Sheet.tsx');
    expect(src).toContain('sheet-footer');
    expect(src).toMatch(/\{page\}\s*\/\s*\{pages\}/);
  });
});

describe('Cover', () => {
  const src = read('src/components/Report/Cover.tsx');
  test('leads with the total, reads the model, never data.total_Q', () => {
    expect(src).toContain('doc-q');
    expect(src).toContain('model.totalQ');
    expect(src).not.toContain('total_Q');
  });
  test('states the version, footage type and skipped sections', () => {
    expect(src).toContain('version');
    expect(src).toContain('model.skipped');
    expect(src).toMatch(/Report\.Doc\.footage\./);
  });
  test('applied strip only lists what was applied', () => {
    expect(src).toMatch(/applied\.lensCorrection\s*&&/);
    expect(src).toMatch(/applied\.stabilizationRegions\s*!==\s*null\s*&&/);
  });
  test('summary table across sections, only when the model provides rows, LSPIV rows labelled', () => {
    expect(src).toMatch(/summary\s*&&/);
    expect(src).toContain('row.lspivOnly');
    expect(src).toContain('Report.Summary.mean');
    expect(src).toContain('Report.Summary.cov');
  });
});

describe('Section sheet', () => {
  const sheet = read('src/components/Report/SectionSheet.tsx');
  const table = read('src/components/Report/StationTable.tsx');
  test('header shows technique by label and colour, seeded tag, Q', () => {
    expect(sheet).toContain('TECHNIQUE_LABEL[result.technique]');
    expect(sheet).toContain('doc-tech--');
    expect(sheet).toContain('result.seeded');
  });
  test('continuation sheets show only the table', () => {
    expect(sheet).toMatch(/!continued\s*&&/);
  });
  test('comparison strip only when more than one technique was computed', () => {
    expect(sheet).toMatch(/result\.comparison\.length\s*>\s*1/);
  });
  test('table velocity and Q come from the active technique, not the LSPIV arrays', () => {
    expect(table).toContain('getEffectiveTechniqueData');
    expect(table).not.toContain('streamwise_velocity_magnitude');
    expect(table).toContain('splitColumns');
  });
});

describe('Calibration sheet', () => {
  const src = read('src/components/Report/CalibrationSheet.tsx');
  test('one block per footage type', () => {
    expect(src).toMatch(/type === 'uav'/);
    expect(src).toMatch(/type === 'oblique'/);
    expect(src).toMatch(/type === 'ipcam'/);
  });
  test('oblique shows real-world coordinates and residuals', () => {
    expect(src).toContain('rwCoordinates');
    expect(src).toContain('obliqueResiduals');
  });
  test('ip camera shows X/Y/Z, per-point error and camera position', () => {
    expect(src).toContain('reprojectionErrors');
    expect(src).toContain('cameraPosition');
    expect(src).toMatch(/\.Z\b/);
  });
});

describe('Footage sheet', () => {
  const src = read('src/components/Report/FootageSheet.tsx');
  test('snapshot strip across the processed range, with times', () => {
    expect(src).toContain('snapshotFrames');
    expect(src).toContain('doc-strip');
    expect(src).toContain('images.paths');
  });
  test('video creation date is reported', () => {
    expect(src).toContain('creation');
  });
  test('reports committed corrections and draws stabilization regions', () => {
    expect(src).toContain('committedStabilizationRegions');
    expect(src).toContain('doc-region');
  });
  test('parameter blocks per technique used; LSPIV block shows seeding', () => {
    expect(src).toMatch(/techniquesUsed\.includes\('lspiv'\)/);
    expect(src).toMatch(/techniquesUsed\.includes\('stiv'\)/);
    expect(src).toMatch(/techniquesUsed\.includes\('iwave'\)/);
    expect(src).toContain('artificialSeeding');
  });
  test('colophon: version, citation DOIs, IWaVE credit', () => {
    expect(src).toContain('10.1016/j.cageo.2017.07.009');
    expect(src).toContain('10.5281/zenodo.22050810');
    expect(src).toContain('dataforwater');
  });
});

describe('Footage sheet LSPIV block (fix round 1)', () => {
  test('grayscale is always reported: the CLI applies it on every GUI run', () => {
    const src = read('src/components/Report/FootageSheet.tsx');
    expect(src).toMatch(/<dt>\{t\('Processing\.grayscale'\)\}<\/dt>/);
    expect(src).not.toMatch(/form\.grayscale/);
  });
  test('ip camera errors go through the pinned mapping helper', () => {
    expect(read('src/components/Report/CalibrationSheet.tsx')).toContain('ipcamPointErrors(');
  });
});

describe('Report page export', () => {
  const page = read('src/pages/Report.tsx');
  test('the document root is a fixed light scope', () => {
    expect(page).toMatch(/className="report-doc"[^>]*data-theme="light"/s);
    expect(page).toContain('data-theme-scope');
  });
  test('the exported body does not carry the app theme', () => {
    expect(page).not.toMatch(/<body data-theme="\$\{theme\}"/);
  });
  test('images export at print quality', () => {
    expect(page).toContain('REPORT_SHEET.IMAGE_QUALITY');
    expect(page).not.toMatch(/convertImageToDataURI\(img\.src, 0\.1\)/);
  });
  test('the old blocks are gone', () => {
    [
      'Header',
      'VideoInfo',
      'ProcessedRange',
      'ReportSection',
      'Summary',
      'PixelTransformation',
      'ProcessingParameters',
      'Footer',
    ].forEach((n) => expect(page).not.toMatch(new RegExp(`<${n}[\\s/>]`)));
  });
  test('the title of the exported file names the measurement', () => {
    expect(page).toMatch(/<title>\$\{/);
  });
});

describe('Report stylesheet reaches the export (Task 9 rulings)', () => {
  test('a surviving report component imports report.css, so generateHTML can inline it', () => {
    expect(read('src/components/Report/Sheet.tsx')).toMatch(/^import '\.\/report\.css';$/m);
  });
  test('the paper tokens outrank [data-theme="light"] whatever the bundle order', () => {
    const css = read('src/components/Report/report.css');
    // Two attribute/class parts beat the single [data-theme="light"] selector on specificity.
    expect(css).toMatch(/\.report-doc\[data-theme-scope\]\s*\{[^}]*--background-color:\s*#ffffff/i);
  });
});

describe('Profile plot', () => {
  const src = read('src/components/Report/ProfilePlot.tsx');
  const css = read('src/components/Report/report.css');
  test('colours come from CSS classes in the light scope, not from the app theme at render time', () => {
    expect(src).not.toMatch(/getCSSVar|getTechniqueColors|getPinColors/);
    expect(src).toContain('rp-line--');
    expect(css).toMatch(/\.rp-line--lspiv\s*\{[^}]*stroke:\s*var\(--tech-lspiv\)/);
    expect(css).toMatch(/\.rp-bank--left\s*\{[^}]*fill:\s*var\(--pin-left\)/);
  });
  test('distinct markers per technique; interpolated stations hollow', () => {
    expect(src).toMatch(/lspiv[\s\S]*circle/);
    expect(src).toContain('rp-marker--hollow');
  });
  test('does not reuse the app AllInOne plot', () => {
    expect(src).not.toContain('AllInOne');
  });
});
