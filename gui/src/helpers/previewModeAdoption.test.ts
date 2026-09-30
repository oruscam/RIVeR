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

  it('segment buttons carry a selected state and a disabled-with-tooltip state', () => {
    expect(indexCss).toMatch(/\.seg-float button\[aria-selected=['"]true['"]\]/);
    expect(indexCss).toMatch(/\.seg-float button\[aria-disabled=['"]true['"]\]/);
  });
});
