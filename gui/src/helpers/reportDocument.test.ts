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
    expect(css).toMatch(/\.report-doc\s*\{[^}]*--background-color:\s*#ffffff/i);
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
