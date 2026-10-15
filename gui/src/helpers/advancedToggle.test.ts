import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { scanCss } from './cssScanner';

const SRC = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

describe('AdvancedToggle (rule 7: no lock)', () => {
  const toggle = read('components/AdvancedToggle.tsx');

  it('replaces LockBtn', () => {
    expect(existsSync(join(SRC, 'components', 'CustomIcons', 'LockBtn.tsx'))).toBe(false);
    for (const page of ['Processing', 'VideoRange', 'Uav', 'Oblique', 'CrossSections']) {
      const src = read(`pages/${page}.tsx`);
      expect(src).toMatch(/<AdvancedToggle\b/);
      expect(src).not.toMatch(/LockBtn/);
    }
  });

  it('draws no lock icon', () => {
    expect(toggle).not.toMatch(/Icons\.Lock/);
  });

  it('is a panel row with the compact switch', () => {
    expect(toggle).toMatch(/className="field-row advanced-mode-toggle"/);
    expect(toggle).toMatch(/className="switch switch-sm"/);
  });

  it('labels its checkbox, so the whole label toggles it', () => {
    expect(toggle).toMatch(/htmlFor="advanced-toggle"/);
    expect(toggle).toMatch(/id="advanced-toggle"/);
  });

  it('does not scroll on Processing: settings reveal in place', () => {
    const processingCase = toggle.slice(toggle.indexOf('case MODULE_NUMBER.PROCESSING'));
    const body = processingCase.slice(0, processingCase.indexOf('break;'));
    expect(body).not.toMatch(/scrollIntoView/);
  });
});

describe('AdvancedToggle CSS', () => {
  const { rules, declarations } = scanCss(read('components/Forms/form.css'));
  const decl = (selector: string, property: string) => {
    const rule = rules.filter((r) => r.prelude === selector).pop();
    return rule && declarations.filter((d) => d.rule === rule.index && d.property === property).pop()?.value;
  };

  it('canary: the scanner still sees .form-container', () => {
    expect(decl('.form-container', 'display')).toBe('flex');
  });

  it('spans the footer at the panel gutter', () => {
    expect(decl('.field-row.advanced-mode-toggle', 'align-self')).toBe('stretch');
  });

  it('reads muted while off and primary while on', () => {
    expect(decl('.advanced-mode-label', 'color')).toBe('var(--text-subdued)');
    expect(decl('.advanced-mode-toggle:has(input:checked) .advanced-mode-label', 'color')).toBe(
      'var(--text-primary)'
    );
  });
});
