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
    expect(css).toMatch(
      /\.report-doc(\[data-theme-scope\])?(,\s*\.report-measure)?\s*\{[^}]*--background-color:\s*#ffffff/i
    );
  });
});

describe('Sheet', () => {
  const src = read('src/components/Report/Sheet.tsx');
  test('footer: discreet logo, title and date, page n / N', () => {
    expect(src).toContain('sheet-footer');
    expect(src).toMatch(/import logo from '\.\.\/\.\.\/assets\/logo_footer\.png'/);
    expect(src).toMatch(/\{page\}\s*\/\s*\{pages\}/);
    expect(src).toContain('{date}');
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
    expect(css).toMatch(
      /\.report-doc\[data-theme-scope\](,\s*\.report-measure)?\s*\{[^}]*--background-color:\s*#ffffff/i
    );
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
  test('measured markers are solid in the technique colour; hollow wins for interpolated', () => {
    ['lspiv', 'stiv', 'iwave'].forEach((t) => {
      expect(css).toMatch(new RegExp(`\\.rp-marker--${t}\\s*\\{[^}]*fill:\\s*var\\(--tech-${t}\\)`));
    });
    expect(css).toMatch(/\.rp-marker--hollow\s*\{[^}]*fill:\s*#ffffff/);
    expect(css.indexOf('.rp-marker--hollow')).toBeGreaterThan(css.indexOf('.rp-marker--iwave'));
  });
  test('does not reuse the app AllInOne plot', () => {
    expect(src).not.toContain('AllInOne');
  });
});

describe('Section block (compact)', () => {
  const block = read('src/components/Report/SectionBlock.tsx');
  const cont = read('src/components/Report/TableContinuation.tsx');
  const table = read('src/components/Report/StationTable.tsx');
  test('one header line: technique by label and colour, seeded tag, Q, stats; comparison only with 2+ techniques', () => {
    expect(block).toContain('TECHNIQUE_LABEL[result.technique]');
    expect(block).toContain('result.seeded');
    expect(block).toMatch(/result\.comparison\.length\s*>\s*1/);
  });
  test('frame and the report plot side by side; the app AllInOne is gone', () => {
    expect(block).toContain('<ProfilePlot');
    expect(block).toContain('<ImageResults');
    expect(block).not.toContain('AllInOne');
    expect(block).toContain('sec-row');
  });
  test('measuring pass draws no D3 overlay', () => {
    expect(block).toMatch(/measure\s*\?/);
  });
  test('continuation names the section and says it continues', () => {
    expect(cont).toContain('Report.Doc.continued');
    expect(cont).toContain('<StationTable');
  });
  test('three columns; Q shows "-" where the velocity is missing, as on the Results grid', () => {
    expect(table).toContain('splitInto(');
    expect(table).toContain('REPORT_FLOW.TABLE_COLUMNS');
    expect(table).toMatch(/resolved\[i\]\s*===\s*null\s*\?\s*'-'/);
  });
  test('the interpolated-station note only appears when a row carries a star', () => {
    expect(table).toMatch(/interpFlags\.slice\(rowStart,\s*rowEnd\)\.some/);
  });
});

describe('Report header (compact)', () => {
  const src = read('src/components/Report/ReportHeader.tsx');
  const icon = read('src/components/Report/FootageIcon.tsx');
  test('leads with the total from the model, never data.total_Q', () => {
    expect(src).toContain('model.totalQ');
    expect(src).not.toContain('total_Q');
  });
  test('footage type with its icon, date, version', () => {
    expect(src).toContain('<FootageIcon');
    expect(src).toMatch(/Report\.Doc\.footage\./);
    expect(src).toContain('meditionDate');
    expect(src).toContain('version');
  });
  test('the icons are the app footage-picker drawings, inline so the export stays self-contained', () => {
    expect(icon).toContain('stroke="currentColor"');
    expect(icon).toMatch(/uav[\s\S]*oblique[\s\S]*ipcam/);
    expect(icon).not.toMatch(/import .*\.svg/);
  });
  test('applied line only lists what was applied', () => {
    expect(src).toMatch(/applied\.lensCorrection\s*&&/);
    expect(src).toMatch(/applied\.stabilizationRegions\s*!==\s*null\s*&&/);
  });
  test('section list and summary table only with 2+ sections', () => {
    expect(src).toMatch(/model\.sections\.length\s*>\s*1\s*&&/);
    expect(src).toMatch(/summary\s*&&/);
    expect(src).toContain('row.lspivOnly');
    expect(src).toContain('model.skipped');
  });
  test('no eyebrow labels', () => {
    expect(src).not.toContain('doc-kicker');
  });
});

describe('Method blocks (compact)', () => {
  const method = read('src/components/Report/Method.tsx');
  const cal = read('src/components/Report/CalibrationSheet.tsx');
  test('ip camera errors go through the pinned mapping helper', () => {
    expect(cal).toContain('ipcamPointErrors(');
  });
  test('method block: heading, calibration beside footage', () => {
    expect(method).toContain('Report.Doc.howMeasured');
    expect(method).toContain('<CalibrationPanel');
    expect(method).toContain('committedStabilizationRegions');
    expect(method).toContain('doc-region');
  });
  test('calibration panel keeps one block per footage type, with a small image beside the text', () => {
    expect(cal).toMatch(/type === 'uav'/);
    expect(cal).toMatch(/type === 'oblique'/);
    expect(cal).toMatch(/type === 'ipcam'/);
    expect(cal).toContain('REPORT_FLOW.METHOD_IMAGE_WIDTH');
    expect(cal).toContain('<FootageIcon');
  });
  test('snapshot strip and processing blocks per technique used', () => {
    expect(method).toContain('snapshotFrames');
    expect(method).toContain('images.paths');
    expect(method).toMatch(/techniquesUsed\.includes\('lspiv'\)/);
    expect(method).toMatch(/techniquesUsed\.includes\('stiv'\)/);
    expect(method).toMatch(/techniquesUsed\.includes\('iwave'\)/);
    expect(method).toMatch(/<dt>\{t\('Processing\.grayscale'\)\}<\/dt>/);
  });
  test('colophon is one line: version, timestamp, GitHub; no DOI, authors or iWave credit in it', () => {
    const colophon = method.slice(method.indexOf('export const Colophon'));
    expect(colophon).toContain('github.com/oruscam/RIVeR');
    expect(colophon).not.toContain('10.1016/j.cageo.2017.07.009');
    expect(colophon).not.toContain('dataforwater');
  });
  test('STIV weights DOI stays in the STIV processing block', () => {
    expect(method).toContain('10.5281/zenodo.22050810');
  });
  test('raw measured values go through the 2-decimal formatter', () => {
    expect(method).toMatch(/formatNumberTo2Decimals\(fps\)/);
    expect(method).toMatch(/formatNumberTo2Decimals\(form\.clipLimit\)/);
  });
});

describe('Report page flow (compact)', () => {
  const page = read('src/pages/Report.tsx');
  const css = read('src/components/Report/report.css');
  test('image conversion rejects when the canvas throws', () => {
    expect(page).toMatch(/img\.onload = \(\) => \{[\s\S]*try \{[\s\S]*\} catch \(e\) \{\s*reject\(e\)/);
  });
  test('blocks are measured, then paginated', () => {
    expect(page).toContain('paginate(');
    expect(page).toContain('stationChunks(');
    expect(page).toMatch(/querySelectorAll<HTMLElement>\('\[data-block\]'\)/);
    expect(page).toContain('offsetHeight');
    expect(page).toContain('useLayoutEffect');
  });
  test('the measuring column is outside the exported container and draws no overlays', () => {
    expect(page).toContain('report-measure');
    expect(page).toContain('render(true)');
    expect(page).toMatch(/className="report-doc report-measure"(?![^>]*data-theme-scope)/);
    expect(css).toMatch(/\.report-measure\s*\{[^}]*visibility:\s*hidden/);
  });
  test('page count is the number of pages', () => {
    expect(page).toMatch(/pages=\{pages\.length\}/);
  });
  test('the export never leaves the spinner on, and one bad image does not abort it', () => {
    expect(page).toMatch(/finally\s*\{[\s\S]*onSetAnalizing\(false\)/);
    expect(page).toMatch(/catch\(\(\)\s*=>\s*img\.src\)/);
  });
  test('the export rewrites a clone, not the live preview', () => {
    expect(page).toContain('cloneNode(true)');
  });
  test('the report font reaches the text despite the app-wide font rule', () => {
    expect(css).toMatch(/\.report-doc \*\s*\{[^}]*font-family:\s*inherit/);
  });
  test('the measuring column gets the report tokens, so it measures in the report font', () => {
    expect(css).toMatch(/\.report-doc\[data-theme-scope\],\s*\.report-measure\s*\{[^}]*--doc-font:/);
  });
  test('snapshot strip images carry explicit width and height, so measuring does not wait for them', () => {
    const method = read('src/components/Report/Method.tsx');
    expect(method).toMatch(
      /<img src=\{images\.paths\[s\.index\]\}\s+width=\{box\.width\}\s+height=\{box\.height\}/
    );
    expect(css).not.toMatch(/\.doc-strip img\s*\{[^}]*height:/);
  });
  test('old sheet-per-part layout is gone', () => {
    expect(page).not.toMatch(/buildSheets|<Cover|<SectionSheet|<FootageSheet|<CalibrationSheet/);
  });
});
