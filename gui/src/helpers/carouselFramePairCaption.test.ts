import { readFileSync } from 'fs';
import { join } from 'path';

const tsx = readFileSync(join(__dirname, '..', 'components', 'Carousel.tsx'), 'utf8');
const css = readFileSync(join(__dirname, '..', 'components', 'components.css'), 'utf8');

describe("Processing's paired-frame carousel explains the two-frame selection", () => {
  it('shows a "Frame pair" caption only in pair mode', () => {
    expect(tsx).toMatch(/isPairMode && !showMedian/);
    expect(tsx).toMatch(/className="carousel-frame-pair-caption"/);
  });

  it('interpolates the two 1-based frame numbers from the active index', () => {
    expect(tsx).toMatch(/first:\s*active \+ 1/);
    expect(tsx).toMatch(/last:\s*active \+ 2/);
  });

  it('uses a translated key with an inline defaultValue, no locale-file edit needed', () => {
    expect(tsx).toMatch(/t\('Processing\.framePairCaption',\s*\{/);
    expect(tsx).toMatch(/defaultValue:\s*'Frame pair \{\{first\}\}–\{\{last\}\}'/);
  });

  it('.carousel-frame-pair-caption is styled as a small secondary caption', () => {
    const match = css.match(/\.carousel-frame-pair-caption\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/color:\s*var\(--secondary-text-color\)/);
  });
});
