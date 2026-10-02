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

describe('Video Advanced blocks (rules 2, 3, 6)', () => {
  const frames = read(C + 'FramesResolution.tsx');
  const lens = read(C + 'LensCorrection.tsx');

  it('Frames resolution: a group label over one row', () => {
    expect(frames).toMatch(/<p className="panel-group"/);
    expect(frames).toMatch(/className="field-row"/);
    expect(frames).not.toMatch(/field-title|lens-row\b|lens-row-label|lens-settings|style=\{\{/);
  });

  it('Lens correction: a compact switch, with camera and lens as its dependents', () => {
    expect(lens).toMatch(/className="switch switch-sm"/);
    expect(lens.match(/field-row field-row-child/g)!.length).toBeGreaterThanOrEqual(2);
    expect(lens).not.toMatch(/switch-container|field-title|lens-row\b|lens-row-label|lens-settings/);
  });
});

describe('Cross Sections panel (review 2026-10-01)', () => {
  const form = read('components/Forms/FormCrossSections.tsx');
  const real = read(C + 'RealWorldCoordinates.tsx');
  const maskList = read(C + 'MaskList.tsx');
  const addMask = read(C + 'AddMaskButton.tsx');
  const sections = read('components/CrossSections/Sections.tsx');
  const { rules, declarations } = scanCss(read('components/Forms/form.css'));
  const decl = (selector: string, property: string) => {
    const rule = rules.filter((r) => r.prelude === selector).pop();
    return rule && declarations.filter((d) => d.rule === rule.index && d.property === property).pop()?.value;
  };

  it('canary', () => expect(decl('.form-container', 'display')).toBe('flex'));

  it('Basic is on the row grammar, with the legacy pill and field classes gone', () => {
    expect(form).not.toMatch(/read-only|input-container-2|input-field|unit-label|divider-line|form-button/);
    expect(form.match(/className="field field-coord"/g)!.length).toBe(2); // Level, Left bank station
    expect(form).toMatch(/className="field-with-unit"/);
    expect(form).toMatch(/className="field-readonly"/); // Width is text (rule 7)
  });

  it('Width stays registered for validation, but is not a visible field', () => {
    expect(form).toMatch(/type="hidden"/);
    expect(form).toMatch(/validate: \(value\) => value != 0/);
  });

  it('masks render once, in the active section, under a group caption and a gutter rule', () => {
    expect(form).toMatch(/\{isActiveSection && \(/);
    expect(form).toMatch(/<hr className="panel-rule" \/>\s*<p className="panel-group">/);
    expect(form.match(/<MaskList \/>/g)).toHaveLength(1);
  });

  it('mask rows share the 40px/14px row size, as a modifier so other lists keep theirs', () => {
    expect(maskList).toMatch(/className="list-row list-row-field"/);
    const idx = read('index.css');
    const s = scanCss(idx);
    const rule = s.rules.filter((r) => r.prelude === '.list-row.list-row-field').pop();
    const get = (p: string) =>
      s.declarations.filter((d) => d.rule === rule?.index && d.property === p).pop()?.value;
    expect(rule).toBeDefined();
    expect(get('min-height')).toBe('40px');
    expect(get('font-size')).toBe('var(--text-body)');
  });

  it('Add mask is a quiet row action that says what the next click does', () => {
    expect(addMask).not.toMatch(/chip/);
    expect(addMask).toMatch(/btn btn-sm btn-tertiary panel-add/);
    expect(addMask).toMatch(/doneEditingMask/);
  });

  it('the unit sits inside the box: pinned right, with room reserved for it (D8 follow-up)', () => {
    expect(decl('.field-with-unit', 'position')).toBe('relative');
    expect(decl('.field-unit', 'position')).toBe('absolute');
    expect(decl('.field-unit', 'right')).toBe('var(--space-2)');
    expect(decl('.field-with-unit .field-coord', 'padding-right')).toBe('30px');
  });

  it('every real-world row shows its unit, UAV included', () => {
    expect(read(C + 'HardModeUav.tsx')).toMatch(/<RealWorldCoordinates[^>]*showUnitLabel/);
    expect(real).toMatch(/\{showUnitLabel && <span className="field-unit"/);
  });

  it('the tab row sits on the panel gutter via CSS, not inline styles', () => {
    expect(sections).not.toMatch(/overflowX|marginRight: '15px'/);
    const css = scanCss(read('components/CrossSections/crossSections.css'));
    const rule = css.rules.filter((r) => r.prelude === '.sections-row').pop();
    const pad = css.declarations.filter((d) => d.rule === rule?.index && d.property === 'padding').pop()?.value;
    expect(pad).toBe('0 var(--space-4)');
  });

  it('the button row leaves room for the hover scale, so the ring is not clipped by the scroll body', () => {
    // .btn:hover grows the button 4%; the row is the first thing in an overflow:scroll body.
    expect(decl('.panel-actions', 'padding')).toBe('var(--space-1) var(--space-2)');
  });

  it('the drop hint is quiet metadata, not a subtitle, and sits on the row inset in a panel section', () => {
    expect(decl('.drop-here-text', 'font-size')).toBe('var(--text-meta)');
    expect(decl('.panel-section .drop-here-text', 'width')).toBe('auto');
    expect(decl('.panel-section .drop-here-text', 'padding')).toBe('0 var(--space-2)');
  });
});

describe('Basic sections of Oblique, UAV and Ipcam follow Cross Sections', () => {
  const FORMS = ['FormOblique.tsx', 'FormUav.tsx', 'FormIpcam.tsx'];
  const legacy =
    /read-only|input-container-2|input-field|unit-label|divider-line|form-button|button-rectification/;

  it.each(FORMS)('%s: no legacy pill labels, fields, unit labels or button classes', (file) => {
    const src = read('components/Forms/' + file);
    expect(src).not.toMatch(legacy);
    expect(src).toMatch(/className="panel-section"/);
    expect(src).toMatch(/className="panel-actions/);
  });

  it.each(['FormOblique.tsx', 'FormUav.tsx'])('%s: value rows carry the unit inside the box', (file) => {
    const src = read('components/Forms/' + file);
    expect(src).toMatch(/className="field-with-unit"/);
    expect(src).toMatch(/className="field field-coord"/);
    expect(src).toMatch(/className="field-unit"/);
    expect(src).toMatch(/className="field-row field-row-top"/);
  });

  it('a single action fills the row instead of sitting at half width', () => {
    expect(read('components/Forms/FormUav.tsx')).toMatch(/className="panel-actions panel-actions-single"/);
    const { rules, declarations } = scanCss(read('components/Forms/form.css'));
    const rule = rules.filter((r) => r.prelude === '.panel-actions.panel-actions-single').pop();
    const v = declarations
      .filter((d) => d.rule === rule?.index && d.property === 'grid-template-columns')
      .pop()?.value;
    expect(v).toBe('1fr');
  });
});

describe('Control Points distances (Oblique): colour on a swatch, not a box', () => {
  const form = read('components/Forms/FormOblique.tsx');
  const { rules, declarations } = scanCss(read('components/Forms/form.css'));
  const decl = (selector: string, property: string) => {
    const rule = rules.filter((r) => r.prelude === selector).pop();
    return rule && declarations.filter((d) => d.rule === rule.index && d.property === property).pop()?.value;
  };

  it('canary', () => expect(decl('.form-container', 'display')).toBe('flex'));

  it('the label is neutral text with a swatch; the id-based coloured borders are gone', () => {
    expect(form).toMatch(/className=\{`dist-swatch dist-swatch-\$\{distancesID\[i\]\}`\}/);
    expect(form).not.toMatch(/id=\{'D' \+ distancesID/);
    const boxed = rules.filter((r) => /^#D(12|13|23|24|34|41)$/.test(r.prelude));
    expect(boxed).toEqual([]);
  });

  it('each swatch carries the same token the canvas line is drawn with', () => {
    const pairs: Record<string, string> = {
      '12': '--d12',
      '23': '--d23',
      '34': '--d34',
      '41': '--d14',
      '13': '--d13',
      '24': '--d24',
    };
    for (const [id, token] of Object.entries(pairs)) {
      expect(decl(`.dist-swatch-${id}`, 'background')).toBe(`var(${token})`);
    }
  });

  it('the swatch is ringed so it stays findable in light, like the point dots', () => {
    expect(decl('.dist-swatch', 'box-shadow')).toBe('0 0 0 1px var(--text-subdued)');
  });

  it('the left canvas draws point 1 as the red upstream-left pin', () => {
    const draw = read('components/Graphs/drawOblique.ts');
    expect(draw).toMatch(/kind: i === 0 \? 'left' : 'point'/);
  });
});

describe('Solve button matches Analyze', () => {
  test.each(['pages/Oblique.tsx', 'pages/Uav.tsx'])('%s puts Solve in the full-width run zone', (file) => {
    const src = read(file);
    expect(src).toMatch(/className="processing-run"/);
    expect(src).not.toMatch(/solver-button/);
    expect(src).not.toMatch(/form-button/);
  });
});

describe('Processing technique rows are minimal', () => {
  const src = read('components/Forms/FormProcessing.tsx');
  test('no check-icon buttons; STIV and iWave use the small switch, LSPIV has no control', () => {
    expect(src).not.toMatch(/Icons\.Check/);
    expect(src.match(/switch switch-sm/g)).toHaveLength(2);
  });
});
