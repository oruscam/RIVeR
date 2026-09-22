import { readFileSync } from 'fs';
import { join } from 'path';

const css = readFileSync(join(__dirname, '..', 'components', 'Report', 'report.css'), 'utf8');

describe("The exported report's title/discharge banner uses the display font", () => {
  it('.header-title-text uses the display font at weight 700, without touching its font-size', () => {
    const match = css.match(/\.header-title-text\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/font-family:\s*var\(--font-display\)/);
    expect(match![1]).toMatch(/font-weight:\s*700/);
    expect(match![1]).not.toMatch(/font-size/);
  });
});
