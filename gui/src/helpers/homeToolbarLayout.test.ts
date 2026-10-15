import { readFileSync } from 'fs';
import { join } from 'path';

const tsx = readFileSync(join(__dirname, '..', 'pages', 'HomePage.tsx'), 'utf8');
const css = readFileSync(join(__dirname, '..', 'pages', 'pages.css'), 'utf8');

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ruleBody = (selector: string): string => {
  const match = css.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : '';
};

describe('Home screen bottom toolbar', () => {
  it('groups the calibration button, version status and settings into one row', () => {
    expect(tsx).toMatch(/<div className="home-toolbar">/);
  });

  it('labels the calibration button instead of using a bare icon', () => {
    expect(tsx).toMatch(/className="btn btn-tertiary"[\s\S]{0,120}onClick=\{\(\) => setShowCalibration\(true\)\}/);
    expect(tsx).toMatch(/\{t\('Calibration\.title'\)\}/);
  });

  it('groups Folder, Units, Language and Theme with a divider before the settings trio', () => {
    expect(tsx).toMatch(
      /<div className="home-toolbar-group">\s*<FolderBtn \/>\s*<span className="home-toolbar-divider" \/>\s*<UnitBtn \/>\s*<LangBtn \/>\s*<ThemeToggle \/>/
    );
  });

  it('no longer positions the calibration button and settings row as separate absolute corners', () => {
    expect(tsx).not.toMatch(/bottom: '30px', right: '50px'/);
    expect(tsx).not.toMatch(/bottom: '30px', left: '50px'/);
  });

  it('drops the now-unused isLatestVersion destructure', () => {
    expect(tsx).not.toMatch(/isLatestVersion/);
  });

  it('.home-toolbar spans the bottom of the screen as one row', () => {
    const body = ruleBody('.home-toolbar');
    expect(body).toMatch(/position:\s*absolute/);
    expect(body).toMatch(/display:\s*flex/);
    expect(body).toMatch(/justify-content:\s*space-between/);
  });

  it('.home-toolbar-divider is a thin vertical rule', () => {
    const body = ruleBody('.home-toolbar-divider');
    expect(body).toMatch(/width:\s*1px/);
    expect(body).toMatch(/background:\s*var\(--border-color\)/);
  });
});
