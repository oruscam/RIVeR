import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { resolvePinLabel } from './pinLabel';

const SRC = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

describe('resolvePinLabel', () => {
  const labels = { left: 'I', right: 'D' };

  it('uses the translated bank letters on cross-section pins', () => {
    expect(resolvePinLabel('x-sections', 'L', labels)).toBe('I');
    expect(resolvePinLabel('x-sections', 'R', labels)).toBe('D');
  });

  it('keeps the digits 1 and 2 on UAV pixel-size pins, whatever the language', () => {
    expect(resolvePinLabel('uav', 'L', labels)).toBe('1');
    expect(resolvePinLabel('uav', 'R', labels)).toBe('2');
  });

  it('falls back to L and R when no labels are given', () => {
    expect(resolvePinLabel('report', 'L')).toBe('L');
    expect(resolvePinLabel('report', 'R')).toBe('R');
  });
});

describe('bank letters live in every dictionary', () => {
  const locales = readdirSync(join(SRC, 'translations')).filter((f) => !f.endsWith('.js'));

  it('canary: found the dictionaries', () => expect(locales.length).toBeGreaterThanOrEqual(12));

  it.each(locales)('%s: bankLeft and bankRight are single, different characters', (locale) => {
    const { CrossSections } = JSON.parse(read(`translations/${locale}/global.json`));
    const left = [...String(CrossSections.bankLeft).trim()];
    const right = [...String(CrossSections.bankRight).trim()];
    expect(left).toHaveLength(1);
    expect(right).toHaveLength(1);
    expect(left[0]).not.toBe(right[0]);
  });
});

describe('the pins survive a language change', () => {
  const d3 = read('components/CrossSections/DrawSectionsD3.tsx');
  const draw = read('components/CrossSections/drawSections.ts');

  it('both draw calls receive the translated bank labels', () => {
    expect(d3).toMatch(/t\('CrossSections\.bankLeft'/);
    expect(d3).toMatch(/t\('CrossSections\.bankRight'/);
    expect(d3.match(/bankLabels,/g)!.length).toBeGreaterThanOrEqual(2);
  });

  it('pin labels come from the resolver, not hard-coded letters', () => {
    expect(draw).toMatch(/resolvePinLabel\(module, type, bankLabels\)/);
    expect(draw).not.toMatch(/isLeft \? 'L' : 'R'/);
  });

  it('the static redraw no longer wipes the interactive pins', () => {
    expect(d3).toMatch(/NOT_MAGNIFIER_OR_INTERACTIVE/);
    expect(d3).not.toMatch(/selectAll\(NOT_MAGNIFIER\)/);
    expect(draw).toMatch(/uiLayer\.selectAll\(`\.\$\{sectionClass\}:not\(\.\$\{interactiveUiClass\}\)`\)/);
    expect(draw).not.toMatch(/uiLayer\.selectAll\(`\.\$\{sectionClass\}`\)\.remove\(\)/);
  });

  it('the interactive layer redraws when the language changes, so its pin letters follow', () => {
    const effect = d3.slice(d3.indexOf('// Interactive drawing'), d3.indexOf('// Attach root SVG listeners'));
    expect(effect).toMatch(/\n\s+language,\n/);
    expect(effect).toMatch(/\n\s+bankLabels,\n/);
  });
});
