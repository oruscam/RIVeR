import { readFileSync } from 'fs';
import { join } from 'path';
import { scanCss } from './cssScanner';

const SRC = join(__dirname, '..');
const form = readFileSync(join(SRC, 'components', 'Forms', 'FormProcessing.tsx'), 'utf8');

const cssDecl = (file: string) => {
  const { rules, declarations } = scanCss(readFileSync(join(SRC, file), 'utf8'));
  return (selector: string, property: string) => {
    const rule = rules.filter((r) => r.prelude === selector).pop();
    return rule && declarations.filter((d) => d.rule === rule.index && d.property === property).pop()?.value;
  };
};

describe('Processing panel order (preview, all three states)', () => {
  const order = [
    'id="stations-number"',
    '<RoiHeightRow',
    'className="panel-rule"',
    'technique="lspiv"',
    '<LspivSettings',
    'technique="stiv"',
    'technique="iwave"',
    '<ProcessingRunZone',
  ];
  it('reads top to bottom as Station number, ROI height, rule, LSPIV + its settings, STIV, iWave, run zone', () => {
    const at = order.map((needle) => form.indexOf(needle));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('ROI height and LSPIV settings exist only in Advanced', () => {
    expect(form).toMatch(/\{extraFields && <RoiHeightRow \/>\}/);
    expect(form).toMatch(/\{extraFields && lspivOpen && \(/);
  });

  it('the run zone sits outside the scrolling body', () => {
    expect(form.indexOf('<ProcessingRunZone')).toBeGreaterThan(form.indexOf('</FormProvider>'));
    expect(form).toMatch(/className=\{`body processing-body/);
  });

  it('has one Analyze and one Stop, both inside the run zone', () => {
    expect(form).not.toMatch(/id="analize-button"|id="stop-button"/);
  });

  it('no legacy dividers or titles in the panel', () => {
    expect(form).not.toMatch(/divider-line|switch-container|input-field-little|processing-header/);
  });
});

describe('LSPIV disclosure (rule 7, D5)', () => {
  it('is a labelled icon button that names what it controls', () => {
    expect(form).toMatch(/aria-expanded=\{lspivOpen\}/);
    expect(form).toMatch(/aria-controls="lspiv-settings"/);
    expect(form).toMatch(/useState<boolean>\(true\)/);
  });
  it('only exists in Advanced', () => {
    expect(form).toMatch(/\{extraFields && \(\s*<span className="tech-cell tech-disclose">/);
  });
});

describe('per-row run status replaces the breadcrumb', () => {
  it('each row asks techniqueRunStatus about itself', () => {
    for (const technique of ['lspiv', 'stiv', 'iwave']) {
      expect(form).toContain(`<RunStatus status={statusOf('${technique}')} />`);
    }
  });
});

describe('Processing panel CSS', () => {
  const formCss = cssDecl('components/Forms/form.css');
  const indexCss = cssDecl('index.css');

  it('canary', () => expect(formCss('.form-container', 'display')).toBe('flex'));

  it('the settings scroll and the run zone does not', () => {
    expect(formCss('.form-container .body.processing-body', 'flex')).toBe('1 1 auto');
    expect(formCss('.form-container .body.processing-body', 'min-height')).toBe('0');
  });

  it('technique rows are 40px (D7) and gain a disclosure column in Advanced (D3)', () => {
    expect(indexCss('.tech-row', 'min-height')).toBe('40px');
    expect(formCss('.processing-form.is-advanced .tech-row', 'grid-template-columns')).toBe(
      '12px 1fr 28px 78px 28px 28px'
    );
  });

  it('LSPIV settings line up with the technique name and hang on a thread in its colour', () => {
    expect(formCss('.tech-params', 'padding-left')).toBe('calc(var(--space-2) + 12px + var(--space-2))');
    expect(formCss('.tech-params::before', 'background')).toBe('color-mix(in srgb, var(--tech) 55%, transparent)');
  });

  it('the chevron turns when open', () => {
    expect(formCss(".tech-disclose [aria-expanded='true'] svg", 'transform')).toBe('rotate(180deg)');
  });

  it('a running row reads in primary text, the others muted', () => {
    expect(formCss('.tech-status', 'color')).toBe('var(--text-subdued)');
    expect(formCss('.tech-status.tech-status-running', 'color')).toBe('var(--text-primary)');
  });
});
