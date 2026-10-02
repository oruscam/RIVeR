import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('Summary panel', () => {
  const form = read('src/components/Forms/FormReport.tsx');
  const page = read('src/pages/Report.tsx');
  const css = read('src/components/Forms/form.css');

  test('the details are rows in the shared grammar, not the old floating-label inputs', () => {
    expect(form).not.toContain('simple-input-container');
    expect(form.match(/className="field-row field-row-top"/g)).toHaveLength(3);
    expect(form.match(/field field-text/g)?.length).toBeGreaterThanOrEqual(3);
    expect(form).toContain('panel-group');
  });

  test('it leads with the total discharge headline', () => {
    expect(form).toContain('summarizeReport');
    expect(form).toContain('summary-result-q');
  });

  test('the report only counts as saved when the dialog returned a path', () => {
    expect(page).toMatch(/setSavedPath\(result\?\.filePath \?\? null\)/);
    expect(page).not.toMatch(/setIsReportSaved\(true\)/);
  });

  test('the primary button says what it does', () => {
    expect(page).toContain("t('Report.Panel.saveReport'");
    expect(read('src/components/WizzardButtons.tsx')).toContain('nextLabel ??');
  });

  test('the green banner and the hard-coded Home link are gone', () => {
    expect(existsSync(join(ROOT, 'src/components/Report/SuccessfulMessage.tsx'))).toBe(false);
    expect(form).not.toContain('SuccessfulMessage');
    const block = read('src/components/Forms/Components/SavedReportBlock.tsx');
    expect(block).not.toMatch(/Inicio|Accueil/);
    expect(block).toContain('<button');
    expect(block).toContain('Report.Saved.showInFolder');
    expect(block).toContain('Report.Saved.newAnalysis');
  });

  test('editing a detail invalidates the saved file state', () => {
    expect(form.match(/setSavedPath\(null\)/g)!.length).toBeGreaterThanOrEqual(3);
  });

  test('styles: text fields fill their control, the saved block has a divider and no colour fill', () => {
    expect(css).toMatch(/\.field\.field-text \{[^}]*width: 100%/);
    expect(css).toMatch(/\.summary-saved \{[^}]*border-top/);
    expect(css).not.toMatch(/\.summary-saved \{[^}]*background/);
  });
});

describe('save-report-html handler', () => {
  const src = read('electron/ipcMainHandlers/saveReportHtml.ts');
  test('resolves a path only after writing, and null on cancel or failure', () => {
    expect(src).toMatch(/if \(canceled \|\| !filePath\) return \{ filePath: null \}/);
    expect(src).toMatch(/writeFileSync\(filePath[^)]*\)[\s\S]*return \{ filePath \}/);
    expect(src).toMatch(/catch[\s\S]*return \{ filePath: null \}/);
  });
  test('Show in folder is a real IPC', () => {
    expect(src).toContain("'show-item-in-folder'");
    expect(src).toContain('shell.showItemInFolder');
  });
});
