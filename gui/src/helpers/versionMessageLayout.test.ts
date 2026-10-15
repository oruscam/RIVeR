import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * VersionMessage now owns the whole version-status line (number + dot +
 * latest/update text), so HomePage can render it unconditionally instead of
 * gating on isLatestVersion !== undefined. See Phase 5a.
 */
const tsx = readFileSync(join(__dirname, '..', 'components', 'VersionMessage.tsx'), 'utf8');
const css = readFileSync(join(__dirname, '..', 'components', 'components.css'), 'utf8');

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ruleBody = (selector: string): string => {
  const match = css.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : '';
};

describe('VersionMessage single-line layout', () => {
  it('renders the version number inside #version-message, not as a standalone element', () => {
    expect(tsx).toMatch(/<span id="version-number">\{import\.meta\.env\.VITE_APP_VERSION\}<\/span>/);
  });

  it('renders a status dot only once the version check has resolved', () => {
    expect(tsx).toMatch(/isLatestVersion !== undefined/);
    expect(tsx).toMatch(/id="version-dot"/);
    expect(tsx).toMatch(/data-status=\{isLatestVersion \? 'ok' : 'update'\}/);
  });

  it('keeps the AGPL source-code link reachable', () => {
    expect(tsx).toMatch(/id="source-offer"/);
    expect(tsx).toMatch(/MainPage\.Version\.source/);
  });

  it('#version-message lays version number, dot and text out on one row', () => {
    expect(ruleBody('#version-message')).toMatch(/display:\s*flex/);
  });

  it('colours the status dot by data-status', () => {
    expect(ruleBody('#version-dot')).toMatch(/background:\s*var\(--status-good\)/);
    expect(ruleBody('#version-dot[data-status="update"]')).toMatch(/background:\s*var\(--status-bad\)/);
  });
});
