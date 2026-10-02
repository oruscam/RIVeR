import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The three footage-type icons (drone/oblique/ipcam) were filled glyphs
 * (fill:#fff, stroke-width:0) — the only icons in the app not drawn as
 * currentColor line icons. See Phase 5b.
 */
const ASSETS = join(__dirname, '..', 'assets', 'icons');
const drone = readFileSync(join(ASSETS, 'drone.svg'), 'utf8');
const oblique = readFileSync(join(ASSETS, 'oblique.svg'), 'utf8');
const ipcam = readFileSync(join(ASSETS, 'ipcam.svg'), 'utf8');

describe('footage-type icons are line icons, not filled glyphs', () => {
  it.each([
    ['drone.svg', drone],
    ['oblique.svg', oblique],
    ['ipcam.svg', ipcam],
  ])('%s uses a currentColor stroke with no fill', (_name, svg) => {
    expect(svg).toMatch(/stroke="currentColor"/);
    expect(svg).toMatch(/fill="none"/);
    expect(svg).not.toMatch(/fill:\s*#(fff|000)/i);
    expect(svg).not.toMatch(/<style>/);
  });

  it("all three keep a 0 0 24 24 viewBox, matching the rest of the app's line icons", () => {
    for (const svg of [drone, oblique, ipcam]) {
      expect(svg).toMatch(/viewBox="0 0 24 24"/);
    }
  });
});
