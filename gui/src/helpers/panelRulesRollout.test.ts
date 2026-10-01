import { readFileSync } from 'fs';
import { join } from 'path';
import { scanCss } from './cssScanner';
import { contrastRatio, parseThemeTokens, resolveRgb, ThemeName } from './themeTokens';

const SRC = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
const C = 'components/Forms/Components/';

describe('coordinate blocks (rules 2, 3)', () => {
  for (const file of ['RealWorldCoordinates.tsx', 'PixelCoordinates.tsx']) {
    const src = read(C + file);
    it(`${file}: rows, not pills`, () => {
      expect(src).toMatch(/className="field-row"/);
      expect(src).not.toMatch(/read-only|input-container-2|input-field-container|form-subtitle|only-one-item/);
    });
    it(`${file}: the title is a quiet group label that keeps its scroll id`, () => {
      expect(src).toMatch(/<p className="panel-group" id="(REAL_WORLD|pixel-coordinates)"/);
    });
    it(`${file}: the point colour is a dot beside a neutral label (D8)`, () => {
      expect(src).toMatch(/className=\{`point-dot point-dot-\$\{style\}`\}/);
      expect(src).toMatch(/className="field field-coord"/);
    });
  }

  it('the advanced wrappers drop their one-off padding for the shared gutter', () => {
    for (const file of ['HardModeOblique.tsx', 'HardModeUav.tsx', 'HardModeCrossSections.tsx']) {
      const src = read(C + file);
      expect(src).toMatch(/panel-advanced/);
      expect(src).toMatch(/<hr className="panel-rule" \/>/);
      expect(src).not.toMatch(/hard-mode-processing|paddingLeft/);
    }
  });
});

describe('point dots are findable in every theme (D8)', () => {
  const css = read('index.css');
  const themes = parseThemeTokens(css);
  // The ring, not the fill, carries the edge in light, where --d23 and --d12
  // sit at 1.77 and 1.38 against the panel. Floors just under the measured
  // ring contrast; report a failure, never lower a floor.
  it.each(['dark', 'light', 'dracula'] as ThemeName[])('%s: the ring stands off the panel', (name) => {
    const t = themes[name];
    expect(
      contrastRatio(resolveRgb(t, '--text-subdued'), resolveRgb(t, '--surface-panel'))
    ).toBeGreaterThanOrEqual(3);
  });

  const { rules, declarations } = scanCss(read('components/Forms/form.css'));
  const decl = (selector: string, property: string) => {
    const rule = rules.filter((r) => r.prelude === selector).pop();
    return rule && declarations.filter((d) => d.rule === rule.index && d.property === property).pop()?.value;
  };
  it('canary', () => expect(decl('.form-container', 'display')).toBe('flex'));
  it('the dot has a ring and the point colours', () => {
    expect(decl('.point-dot', 'box-shadow')).toBe('0 0 0 1px var(--text-subdued)');
    expect(decl('.point-dot-red', 'background')).toBe('var(--d34)');
    expect(decl('.point-dot-green', 'background')).toBe('var(--d23)');
    expect(decl('.point-dot-lightblue', 'background')).toBe('var(--d12)');
  });
});
