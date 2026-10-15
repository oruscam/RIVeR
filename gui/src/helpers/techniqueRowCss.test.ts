import { readFileSync } from 'fs';
import { join } from 'path';
import { scanCss } from './cssScanner';

/**
 * The shared TechniqueRow container + swatch rules, consumed by both
 * Results (TechniqueLegend) and Processing (FormProcessing) via the
 * TechniqueRow component. Lives in components.css — the one shared
 * stylesheet every top-level src/components/*.tsx file already uses;
 * this project has no per-component CSS file anywhere.
 */
const css = readFileSync(join(__dirname, '..', 'components', 'components.css'), 'utf8');

const ruleBody = (selector: string): string => {
  const pattern = new RegExp(`${selector.replace(/[.:]/g, '\\$&')}\\s*\\{([^}]*)\\}`);
  const match = css.match(pattern);
  return match ? match[1] : '';
};

describe('shared TechniqueRow CSS', () => {
  it('.technique-row is the shared flex row box', () => {
    const body = ruleBody('.technique-row');
    expect(body).toMatch(/display:\s*flex/);
    expect(body).toMatch(/gap:\s*10px/);
    expect(body).toMatch(/padding:\s*8px 12px/);
    expect(body).toMatch(/border-radius:\s*var\(--radius-md\)/);
  });

  it('.technique-row is a real rule the browser parses, not a regex match on raw text', () => {
    // The first test above stayed green while a stray */ in the preceding
    // comment made the browser drop this rule (Phase 6g, Task 1).
    const { rules } = scanCss(css);
    expect(rules.some((rule) => rule.prelude === '.technique-row')).toBe(true);
  });

  it("Processing's .tech-row grid outranks .technique-row's flex by stylesheet order", () => {
    // Equal specificity (0,1,0), so the later stylesheet wins. main.tsx imports
    // App (which pulls in components.css) before ./index.css, so index.css's
    // .tech-row { display: grid } wins on Processing's rows. Reordering those
    // imports would silently turn the 6c grid into a flex row.
    const main = readFileSync(join(__dirname, '..', 'main.tsx'), 'utf8');
    expect(main.indexOf("from './App'")).toBeGreaterThan(-1);
    expect(main.indexOf("from './App'")).toBeLessThan(main.indexOf("import './index.css'"));
    const index = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');
    expect(index).toMatch(/\.tech-row\s*\{[^}]*display:\s*grid/);
  });

  it('.technique-row:hover uses --on-hover', () => {
    expect(ruleBody('.technique-row:hover')).toMatch(/background-color:\s*var\(--on-hover\)/);
  });

  it('.technique-row.technique-row-active uses --surface-field', () => {
    expect(ruleBody('.technique-row.technique-row-active')).toMatch(/background-color:\s*var\(--surface-field\)/);
  });

  it('.technique-row-hidden fades the row', () => {
    expect(ruleBody('.technique-row-hidden')).toMatch(/opacity:\s*0\.4/);
  });

  it('.technique-swatch is a 9px marker, shaped per technique', () => {
    const body = ruleBody('.technique-swatch');
    expect(body).toMatch(/width:\s*9px/);
    expect(body).toMatch(/height:\s*9px/);
    expect(ruleBody('.technique-swatch.technique-swatch-lspiv')).toMatch(/border-radius:\s*50%/);
    expect(ruleBody('.technique-swatch.technique-swatch-stiv')).toMatch(/border-radius:\s*2px/);
    expect(ruleBody('.technique-swatch.technique-swatch-iwave')).toMatch(
      /clip-path:\s*polygon\(50% 0, 100% 100%, 0 100%\)/
    );
  });
});
