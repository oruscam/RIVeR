import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const DIR = join(__dirname, '..', 'components', 'Forms', 'Components');
const read = (name: string) => readFileSync(join(DIR, name), 'utf8');

describe('LspivSettings replaces HardModeProcessing', () => {
  it('the old block is gone', () => {
    expect(existsSync(join(DIR, 'HardModeProcessing.tsx'))).toBe(false);
  });
});

describe('LspivSettings layout (rules 2, 3, 6, 7)', () => {
  const src = read('LspivSettings.tsx');

  it('hangs under the LSPIV row, threaded in its colour', () => {
    expect(src).toMatch(/className="tech-params"/);
    expect(src).toMatch(/'--tech': 'var\(--tech-lspiv\)'/);
  });

  it('uses three quiet group labels', () => {
    expect(src.match(/className="panel-group"/g)).toHaveLength(3);
  });

  it('uses compact switches and fields, no legacy pills or field titles', () => {
    expect(src.match(/className="switch switch-sm"/g)).toHaveLength(4);
    expect(src).not.toMatch(/field-title|switch-container|input-field-little|divider-line/);
  });

  it('renders each dependent only while its switch is on (rule 6)', () => {
    expect(src).toMatch(/\{clahe && \(/);
    expect(src).toMatch(/\{stdFiltering && \(/);
    expect(src).toMatch(/\{medianTestFiltering && \(/);
    expect(src.match(/field-row field-row-child/g)!.length).toBeGreaterThanOrEqual(4);
  });

  it('shows the second pass as text, not a read-only field (rule 7)', () => {
    expect(src).toMatch(/className="field-readonly"[^>]*>\s*\{step1 \/ 2\} px/);
    expect(src).not.toMatch(/readOnly/);
  });

  it('Test PIV is an outlined secondary button that keeps its busy sweep', () => {
    expect(src).toMatch(/className="btn btn-sm btn-secondary button-with-loader"/);
    expect(src).toMatch(/isBackendWorking && isTesting && <span className="btn-progress-sweep"/);
    expect(src).toMatch(/if \(isBackendWorking\) return;/);
  });
});

describe('Review Focus 2-4: values reach the form and the store', () => {
  const src = read('LspivSettings.tsx');

  it('every field forwards to react-hook-form before updating the store', () => {
    // A field that replaces the registered onChange leaves the form's copy
    // stale, which shows the moment a dependent unmounts and remounts.
    const forwards = src.match(/\.onChange\(event\)/g) ?? [];
    expect(forwards.length).toBe(9); // 4 switches + clip, std threshold, epsilon, median threshold, window size
  });

  it('Std filtering threshold is written to the store', () => {
    expect(src).toMatch(/onUpdateProcessing\(\{ stdThreshold:/);
  });

  it('changing the window size does not reset the whole form', () => {
    expect(src).not.toMatch(/\breset\(/);
    expect(src).toMatch(/setValue\('step_1', value\)/);
  });
});

describe('RoiHeightRow (Review Focus 5)', () => {
  const src = read('RoiHeightRow.tsx');
  it('is a section-level row', () => {
    expect(src).toMatch(/className="field-row field-row-top"/);
  });
  it('never recalculates the mask from an empty or non-positive value', () => {
    expect(src).toMatch(
      /if \(Number\.isNaN\(value\) \|\| value <= 0\) \{\s*setValue\('roi_height', heightRoi\);\s*return;/
    );
  });
});
