import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The four icon buttons 6c places inside .list-row. Each must be on the .ibtn
 * primitive and must accept size="sm", because .ibtn is 32px and a 32px row
 * would be filled edge to edge — which is why 6a built .ibtn-sm at 24px.
 *
 * Source-text assertions: this project's Jest runs with testEnvironment
 * "node" and has no DOM, so a rendered-output test is not available here.
 */
const COMPONENTS = ['TrashBtn', 'EyeBtn', 'EditMaskBtn', 'MaskBtn'] as const;

const source = (name: string): string =>
  readFileSync(join(__dirname, '..', 'components', 'CustomIcons', `${name}.tsx`), 'utf8');

describe.each(COMPONENTS)('%s', (name) => {
  const src = source(name);

  it('uses the .ibtn primitive and no longer uses the legacy .ib', () => {
    expect(src).toContain('ibtn');
    // A standalone `ib` class token, i.e. not the `ibtn`/`ibtn-sm` prefix.
    expect(src).not.toMatch(/\bib\b(?!tn)/);
  });

  it('accepts a size prop and maps "sm" to .ibtn-sm', () => {
    expect(src).toMatch(/size\??:\s*'md'\s*\|\s*'sm'/);
    expect(src).toContain('ibtn-sm');
  });
});

describe('TrashBtn danger affordance', () => {
  it('carries .ibtn-danger and drives the armed fill from data-armed', () => {
    const src = source('TrashBtn');
    expect(src).toContain('ibtn-danger');
    expect(src).toContain('data-armed');
    // The old `.is-armed` class is replaced by the data attribute.
    expect(src).not.toContain('is-armed');
  });
});
