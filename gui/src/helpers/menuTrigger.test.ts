import { readFileSync } from 'fs';
import { join } from 'path';
import { scanCss } from './cssScanner';

/**
 * The Home toolbar's dropdown triggers (units, language, theme) are an icon plus a chevron. They
 * were .ibtn buttons stretched to 60px: .ibtn is a 32px-tall circle with overflow: hidden and a
 * grid that stacks its children, so the chevron sat below the icon and was cropped, and the
 * 50% radius made the hover fill an oval. They now use .menu-trigger: one row, nothing clipped,
 * and no fill on hover or open (the chevron flipping already shows the open state).
 */
const SRC = join(__dirname, '..');
const read = (file: string) => readFileSync(join(SRC, file), 'utf8');
const { rules, declarations } = scanCss(read('index.css'));
const body = (prelude: string) =>
  declarations.filter((d) => d.rule === rules.find((r) => r.prelude === prelude)?.index);
const value = (prelude: string, property: string) => body(prelude).find((d) => d.property === property)?.value;

const TRIGGERS = [
  'components/ThemeToggle.tsx',
  'components/CustomIcons/UnitSelector.tsx',
  'components/CustomIcons/LanguageSelector.tsx',
];

describe('.menu-trigger dropdown triggers', () => {
  it('lays the icon and chevron out in one unclipped row', () => {
    expect(value('.menu-trigger', 'display')).toBe('inline-flex');
    expect(value('.menu-trigger', 'align-items')).toBe('center');
    expect(value('.menu-trigger', 'overflow')).toBeUndefined();
  });

  it('never paints a fill, on rest, hover or open', () => {
    const selectors = rules.filter((r) => r.prelude.includes('.menu-trigger')).map((r) => r.prelude);
    expect(selectors.length).toBeGreaterThan(0);
    for (const d of declarations.filter((d) => selectors.includes(d.selector))) {
      if (/^background/.test(d.property)) expect(d.value).toMatch(/^(transparent|none)$/);
    }
    expect(value('.menu-trigger', 'border-radius')).not.toBe('50%');
  });

  it('sets the text colour its currentColor icons resolve to, so they follow the theme', () => {
    // Moon, Sun and Dracula are drawn with stroke="currentColor". Without this the browser's black
    // button-text default applies in every theme.
    expect(value('.menu-trigger', 'color')).toBe('var(--primary-text-color)');
  });

  it('keeps a visible keyboard focus ring', () => {
    expect(value('.menu-trigger:focus-visible', 'outline')).toMatch(/2px solid var\(--accent-color\)/);
  });

  it.each(TRIGGERS)('%s uses it, with no inline sizing and no fill-contrast icon colour', (file) => {
    const source = read(file);
    expect(source).toMatch(/className="menu-trigger"/);
    expect(source).toMatch(/aria-expanded=\{open\}/);
    expect(source).not.toMatch(/width:\s*60/);
    expect(source).not.toContain('var(--secondary-background-color)');
  });
});
