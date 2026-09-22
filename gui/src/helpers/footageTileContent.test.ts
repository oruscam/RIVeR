import { readFileSync } from 'fs';
import { join } from 'path';

const tsx = readFileSync(join(__dirname, '..', 'pages', 'FootageMode.tsx'), 'utf8');
const css = readFileSync(join(__dirname, '..', 'pages', 'pages.css'), 'utf8');

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ruleBody = (selector: string): string => {
  const match = css.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : '';
};

describe('Footage type tiles show a name and description', () => {
  it('each tile renders a visible name and description, not just an aria-label', () => {
    expect(tsx).toMatch(/className="footage-type-name"/);
    expect(tsx).toMatch(/className="footage-type-description"/);
  });

  it('reuses the existing aria-label translation call for the name, and a new sibling key for the description', () => {
    expect(tsx).toMatch(/t\('Step-2\.footageType\.' \+ id, \{ defaultValue: label \}\)/);
    expect(tsx).toMatch(/t\('Step-2\.footageType\.' \+ id \+ 'Description', \{ defaultValue: description \}\)/);
  });

  it('footageTypes carries a description for every type', () => {
    expect(tsx).toMatch(/id:\s*'uav'[^}]*description:\s*'Top-down view from above'/);
    expect(tsx).toMatch(/id:\s*'oblique'[^}]*description:\s*'Tripod or camera on the bank'/);
    expect(tsx).toMatch(/id:\s*'ipcam'[^}]*description:\s*'IP or CCTV station'/);
  });

  it('shows a check badge only on the selected tile', () => {
    expect(tsx).toMatch(/\{footageType === id && \(/);
    expect(tsx).toMatch(/className="footage-check-badge"/);
    expect(tsx).toMatch(/Icons\.Check\('var\(--on-accent\)'\)/);
  });

  it('.footage-check-badge is a filled accent-coloured circle', () => {
    const body = ruleBody('.footage-check-badge');
    expect(body).toMatch(/border-radius:\s*50%/);
    expect(body).toMatch(/background:\s*var\(--accent-color\)/);
  });

  it('unselected tile icons are dimmer than the selected one', () => {
    expect(ruleBody('.footage-button-container svg')).toMatch(/color:\s*var\(--secondary-text-color\)/);
    expect(ruleBody('.selected-footage-type svg')).toMatch(/color:\s*var\(--primary-text-color\)/);
  });
});
