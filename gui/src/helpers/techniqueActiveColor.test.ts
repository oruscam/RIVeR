import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A technique's identity colour (--tech-lspiv/stiv/iwave) must never be
 * swapped for --primary-text-color when that technique is active — that's
 * "the active technique turns white" bug the design audit's Rollout phase 3
 * calls out. Active state is shown by weight/background instead.
 */
const read = (...parts: string[]): string => readFileSync(join(__dirname, '..', ...parts), 'utf8');

describe('active technique keeps its own colour (no white-on-active regression)', () => {
  it('TechniqueLegend.tsx does not swap the swatch colour for --primary-text-color when active', () => {
    const source = read('components', 'Graphs', 'TechniqueLegend.tsx');
    expect(source).not.toMatch(/isActive\s*\?\s*'var\(--primary-text-color\)'/);
  });

  it('velocitySvg.ts does not swap the line/marker colour for --primary-text-color when active', () => {
    const source = read('components', 'Graphs', 'velocitySvg.ts');
    expect(source).not.toMatch(/isActive\s*\?\s*'var\(--primary-text-color\)'/);
  });

  it('AllInOne.tsx does not swap the tooltip dot colour for --primary-text-color when active', () => {
    const source = read('components', 'Graphs', 'AllInOne.tsx');
    expect(source).not.toMatch(/isActive\s*\?\s*'var\(--primary-text-color\)'/);
  });

  it('graphs.css does not recolour the active technique name to --primary-text-color', () => {
    const css = read('components', 'Graphs', 'graphs.css');
    expect(css).not.toMatch(/\.technique-name-active\s*\{[^}]*color:\s*var\(--primary-text-color\)/);
  });

  it('form.css does not recolour the active processing row label to --primary-text-color', () => {
    const css = read('components', 'Forms', 'form.css');
    expect(css).not.toMatch(
      /\.technique-row-processing-active \.field-title\s*\{[^}]*color:\s*var\(--primary-text-color\)/
    );
  });

  it('graphs.css and form.css give the active row a background instead', () => {
    expect(read('components', 'Graphs', 'graphs.css')).toMatch(
      /\.technique-row-active\s*\{[^}]*background-color:\s*var\(--surface-raised\)/
    );
    expect(read('components', 'Forms', 'form.css')).toMatch(
      /\.technique-row-processing-active\s*\{[^}]*background-color:\s*var\(--surface-raised\)/
    );
  });
});
