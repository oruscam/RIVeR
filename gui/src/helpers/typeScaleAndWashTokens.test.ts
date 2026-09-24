import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Phase 6a's tokens. The six --text-* sizes are theme-invariant and live in the
 * bare :root scale block next to other scale tokens; --wash-2 is a
 * colour, so it is declared once per [data-theme] block instead.
 */
const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');

/** The body of a top-level block, e.g. ':root' or '[data-theme="dark"]'. */
const blockBody = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return '';
  const end = css.indexOf('\n}', start);
  return end === -1 ? '' : css.slice(start, end);
};

const TYPE_SCALE: [string, string][] = [
  ['--text-display', '40px'],
  ['--text-title', '24px'],
  ['--text-section', '16px'],
  ['--text-body', '14px'],
  ['--text-meta', '13px'],
  ['--text-caption', '12px'],
];

const WASH: [string, string][] = [
  ['[data-theme="dark"]', '#0B2D52'],
  ['[data-theme="light"]', '#DDEBF7'],
  ['[data-theme="dracula"]', '#33294F'],
];

describe('Phase 6a type scale', () => {
  it.each(TYPE_SCALE)('declares %s as %s in the bare :root block', (token, value) => {
    expect(blockBody(':root')).toMatch(new RegExp(`${token}:\\s*${value};`));
  });

  it('does not redeclare any type-scale token per theme — sizes are theme-invariant', () => {
    const offenders = WASH.flatMap(([selector]) =>
      TYPE_SCALE.filter(([token]) => blockBody(selector).includes(`${token}:`)).map(
        ([token]) => `${selector} redeclares ${token}`
      )
    );
    expect(offenders).toEqual([]);
  });
});

describe('Phase 6a theme wash', () => {
  it.each(WASH)('declares --wash-2 in %s as %s', (selector, value) => {
    expect(blockBody(selector)).toMatch(new RegExp(`--wash-2:\\s*${value};`));
  });

  it('does not declare --wash-2 in the bare :root block — it is theme-specific', () => {
    expect(blockBody(':root')).not.toMatch(/--wash-2:/);
  });
});
