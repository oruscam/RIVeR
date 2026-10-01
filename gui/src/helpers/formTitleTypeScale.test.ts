import { readFileSync } from 'fs';
import { join } from 'path';

const main = readFileSync(join(__dirname, '..', 'main.tsx'), 'utf8');
const index = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');
const formCss = readFileSync(join(__dirname, '..', 'components', 'Forms', 'form.css'), 'utf8');
const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'));

describe('Outfit display font powers the shared screen-title heading', () => {
  it('bundles the Outfit font instead of loading it at runtime', () => {
    expect(pkg.dependencies['@fontsource/outfit']).toBeDefined();
    expect(main).toMatch(/@fontsource\/outfit\/700\.css/);
    expect(main).not.toMatch(/fonts\.googleapis\.com/);
  });

  it('declares a --font-display token, leaving the interface font untouched', () => {
    expect(index).toMatch(/--font-display:\s*'Outfit'/);
  });

  it('.form-title uses the display font at --text-title/700', () => {
    const match = formCss.match(/\.form-title\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/font-family:\s*var\(--font-display\)/);
    expect(match![1]).toMatch(/font-size:\s*var\(--text-title\)/);
    expect(match![1]).toMatch(/font-weight:\s*700/);
  });

  it('#result-info #result-number (the Results screen discharge readout) also uses the display font', () => {
    const match = formCss.match(/#result-info #result-number\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/font-family:\s*var\(--font-display\)/);
    expect(match![1]).toMatch(/font-weight:\s*700/);
  });
});
