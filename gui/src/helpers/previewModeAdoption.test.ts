import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const read = (relPath: string) => readFileSync(join(SRC, relPath), 'utf8');

describe('--canvas-chrome token', () => {
  it('is declared exactly once, in index.css, at the agreed 0.84 alpha', () => {
    const indexCss = read('index.css');
    const declarations = indexCss.match(/--canvas-chrome:\s*rgba\([^)]*\)/g) ?? [];
    expect(declarations).toEqual(['--canvas-chrome: rgba(10, 12, 14, 0.84)']);
  });

  it('.mode-hint consumes --canvas-chrome instead of its own literal', () => {
    const messagesCss = read('components/Messages/messages.css');
    expect(messagesCss).toMatch(/\.mode-hint\s*{[^}]*background:\s*var\(--canvas-chrome\)/s);
    expect(messagesCss).not.toMatch(/\.mode-hint\s*{[^}]*rgba\(10,\s*12,\s*14/s);
  });

  it('.mask-toolbar consumes --canvas-chrome instead of its own literal', () => {
    const componentsCss = read('components/components.css');
    expect(componentsCss).toMatch(/\.mask-toolbar\s*{[^}]*background:\s*var\(--canvas-chrome\)/s);
    expect(componentsCss).not.toMatch(/\.mask-toolbar\s*{[^}]*rgba\(10,\s*12,\s*14/s);
  });
});

describe('.seg-float', () => {
  const indexCss = read('index.css');

  it('exists as a canvas-chrome consumer, not a --surface-field one', () => {
    expect(indexCss).toMatch(/\.seg-float\s*{[^}]*background:\s*var\(--canvas-chrome\)/s);
  });

  it('stacks above the image it floats over (every other canvas-chrome element sets a z-index)', () => {
    const body = indexCss.match(/\.seg-float\s*{([^}]*)}/s)?.[1] ?? '';
    const z = Number(body.match(/z-index:\s*(\d+)/)?.[1]);
    expect(z).toBeGreaterThanOrEqual(5);
    expect(z).toBeLessThan(1001); // FloatingPlot draggable stays above
  });

  it('segment buttons carry a selected state and a disabled-with-tooltip state', () => {
    expect(indexCss).toMatch(/\.seg-float button\[aria-selected=['"]true['"]\]/);
    expect(indexCss).toMatch(/\.seg-float button\[aria-disabled=['"]true['"]\]/);
  });
});

describe('PreviewModeControl', () => {
  const component = read('components/PreviewModeControl.tsx');

  it('is a tablist of three segments using role/aria-selected, not aria-pressed', () => {
    expect(component).toMatch(/role=["']tablist["']/);
    expect((component.match(/role=["']tab["']/g) ?? []).length).toBe(3);
    expect(component).toMatch(/aria-selected=/);
  });

  it('gates Space-time and iWave with aria-disabled plus a matching early-return guard', () => {
    // legacyButtonRetirement.test.ts sweeps every .tsx for guard pairing; this
    // pins that the file uses the aria-disabled idiom at all, so a rewrite to
    // native `disabled` (which silently kills the tooltip) is caught here.
    expect((component.match(/aria-disabled=\{/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('renders on .seg-float, not the panel .seg', () => {
    expect(component).toMatch(/className=["']seg-float["']/);
  });
});

describe('FormProcessing technique names are no longer clickable', () => {
  const formProcessing = read('components/Forms/FormProcessing.tsx');

  it('the three technique-name elements are spans, not buttons', () => {
    const rowStarts = [...formProcessing.matchAll(/<TechniqueRow\b/g)].map((m) => m.index!);
    expect(rowStarts).toHaveLength(3);
    for (const start of rowStarts) {
      const window = formProcessing.slice(start, start + 700);
      expect(window).toMatch(/<span\s+className=["']field-title["']/);
      expect(window).not.toMatch(/<button[^>]*className=["']field-title["']/);
    }
  });

  it('setPreviewMode is never called from this file', () => {
    expect(formProcessing).not.toMatch(/setPreviewMode\(/);
  });
});
