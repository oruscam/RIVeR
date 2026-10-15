import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { scanCss } from './cssScanner';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: { defaultValue?: string }) => o?.defaultValue ?? key }),
}));

// Imported after the mock so the component picks it up.
import { ProcessingRunZone } from '../components/Forms/Components/ProcessingRunZone';

const render = (running: boolean, testing = false) =>
  renderToStaticMarkup(
    createElement(
      ProcessingRunZone,
      { running, testing, onAnalyze: () => {}, onStop: () => {} },
      createElement('div', { className: 'readout-stub' })
    )
  );

describe('ProcessingRunZone (rule 5)', () => {
  it('idle: one primary Analyze button and no readout', () => {
    const html = render(false);
    expect(html).toMatch(
      /id="analize-button"[^>]*class="btn btn-lg btn-primary"|class="btn btn-lg btn-primary"[^>]*id="analize-button"/
    );
    expect(html).not.toContain('stop-button');
    expect(html).not.toContain('readout-stub');
    expect(html).not.toContain('aria-disabled');
  });

  it('running: Stop takes the same place and the readout appears under it', () => {
    const html = render(true);
    expect(html).toContain('id="stop-button"');
    expect(html).toContain('btn-danger');
    expect(html).not.toContain('analize-button');
    expect(html.indexOf('stop-button')).toBeLessThan(html.indexOf('readout-stub'));
  });

  it('testing: Analyze explains itself instead of going natively disabled', () => {
    const html = render(false, true);
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toMatch(/\sdisabled=""/);
    expect(html).toContain('title="Wait for Test PIV to finish"');
  });

  it('there is exactly one button in every state', () => {
    for (const html of [render(false), render(true), render(false, true)]) {
      expect(html.match(/<button/g)).toHaveLength(1);
    }
  });
});

describe('ProcessingRunZone source', () => {
  const src = readFileSync(
    join(__dirname, '..', 'components', 'Forms', 'Components', 'ProcessingRunZone.tsx'),
    'utf8'
  );
  it('guards the click while a test runs, since aria-disabled alone leaves the button live', () => {
    expect(src).toMatch(/if \(testing\) return;/);
  });
});

describe('AnalyzingProgress', () => {
  const src = readFileSync(
    join(__dirname, '..', 'components', 'Forms', 'Components', 'AnalyzingProgress.tsx'),
    'utf8'
  );
  it('no longer draws the stage breadcrumb (rows show their own status)', () => {
    expect(src).not.toMatch(/breadcrumb/);
  });
  it('takes its state from the caller instead of listening to IPC itself', () => {
    expect(src).not.toMatch(/ipcRenderer/);
    expect(src).toMatch(/readoutFoot\(state, t\)/);
  });
});

describe('run zone CSS', () => {
  const { rules, declarations } = scanCss(
    readFileSync(join(__dirname, '..', 'components', 'Forms', 'form.css'), 'utf8')
  );
  const decl = (selector: string, property: string) => {
    const rule = rules.filter((r) => r.prelude === selector).pop();
    return rule && declarations.filter((d) => d.rule === rule.index && d.property === property).pop()?.value;
  };
  it('canary', () => expect(decl('.form-container', 'display')).toBe('flex'));
  it('never shrinks, so the button keeps its place above the footer', () => {
    expect(decl('.processing-run', 'flex-shrink')).toBe('0');
    expect(decl('.processing-run', 'border-top')).toBe('1px solid var(--border-color)');
  });
  it('the button and the readout span gutter to gutter', () => {
    expect(decl('.processing-run .btn', 'width')).toBe('100%');
    expect(decl('.processing-run .progress-readout', 'max-width')).toBe('none');
  });
});

describe('the breadcrumb CSS is gone', () => {
  it('index.css has no .analize-stage-breadcrumb rule', () => {
    const index = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');
    expect(scanCss(index).rules.some((r) => r.prelude.includes('analize-stage-breadcrumb'))).toBe(false);
  });
});
