import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Source-text guards for Phase 6f (spec §4/6f, amendment A14). Jest runs with
 * no DOM here, so the hook, component and CSS wiring are pinned by reading
 * the files. Layout and colour are verified by the approved preview and the
 * three-theme walkthrough, not by this file.
 */
const read = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');
const hook = read('hooks', 'useProjectSlice.ts');

/** Body of `const <name> = async (...) => { ... };` up to the next `const on`. */
const fnBody = (src: string, name: string): string => {
  const start = src.indexOf(`const ${name} = async`);
  if (start === -1) return '';
  const next = src.indexOf('\n  const on', start + 1);
  return src.slice(start, next === -1 ? undefined : next);
};

describe('useProjectSlice records recent projects', () => {
  it('canary: finds both functions', () => {
    expect(fnBody(hook, 'onInitProject')).toMatch(/init-project/);
    expect(fnBody(hook, 'onLoadProject')).toMatch(/load-project/);
  });

  it('imports recordRecentProject from the helper', () => {
    expect(hook).toMatch(/import \{[^}]*\brecordRecentProject\b[^}]*\} from '\.\.\/helpers\/recentProjects'/);
  });

  it('records a created project with its directory and footage type', () => {
    expect(fnBody(hook, 'onInitProject')).toMatch(
      /recordRecentProject\(localStorage, result\.directory, videoInput\.type, Date\.now\(\)\)/
    );
  });

  it('records a loaded project with its directory and footage type', () => {
    expect(fnBody(hook, 'onLoadProject')).toMatch(
      /recordRecentProject\(localStorage, projectDirectory, settings\.footage, Date\.now\(\)\)/
    );
  });

  it('onLoadProject takes an optional directory and passes it to load-project', () => {
    const body = fnBody(hook, 'onLoadProject');
    expect(body).toMatch(/const onLoadProject = async \(directory\?: string\)/);
    expect(body).toMatch(/invoke\('load-project', directory \? \{ directory \} : undefined\)/);
  });
});

const comp = read('components', 'RecentProjects.tsx');
const pagesCss = read('pages', 'pages.css');

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Body of the first rule whose selector list is exactly `selector`. */
const ruleBody = (css: string, selector: string): string => {
  // The selector must follow the start of file, a closing brace or a closing
  // comment, so `.a` never matches inside `.b .a` or `.a:hover`.
  const m = css.match(new RegExp(`(?:^|\\}|\\*\\/)\\s*${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`));
  return m ? m[1] : '';
};

describe('RecentProjects component', () => {
  it('canary: the component file renders the tile class', () => {
    expect(comp).toMatch(/className="recent-tile"/);
  });

  it('validates through projects-exist and writes back only on success', () => {
    expect(comp).toMatch(/invoke\(\s*'projects-exist',\s*stored\.map\(\(r\) => r\.directory\)\s*\)/);
    const thenIdx = comp.indexOf('.then(');
    const catchIdx = comp.indexOf('.catch(');
    expect(thenIdx).toBeGreaterThan(-1);
    expect(catchIdx).toBeGreaterThan(thenIdx);
    expect(comp.slice(thenIdx, catchIdx)).toMatch(/writeRecentProjects\(localStorage, kept\)/);
    expect(comp.slice(catchIdx)).not.toMatch(/writeRecentProjects/);
  });

  it('skips IPC when nothing is stored, and ignores a late result after unmount', () => {
    expect(comp).toMatch(/if \(stored\.length === 0\) return;/);
    expect(comp).toMatch(/let cancelled = false;/);
    expect(comp).toMatch(/return \(\) => \{\s*cancelled = true;\s*\};/);
  });

  it('renders nothing when there are no recents', () => {
    expect(comp).toMatch(/if \(recents\.length === 0\) return null;/);
  });

  it('labels the section, and gives each tile its full path as tooltip', () => {
    expect(comp).toMatch(/<section className="recents" aria-labelledby="recent-projects-title">/);
    expect(comp).toMatch(/t\('MainPage\.recentProjects', \{ defaultValue: 'Recent projects' \}\)/);
    expect(comp).toMatch(/title=\{r\.directory\}/);
    expect(comp).toMatch(/t\('Step-2\.footageType\.' \+ r\.type, \{ defaultValue: FOOTAGE_LABELS\[r\.type\] \}\)/);
  });

  it('is exported from the components barrel', () => {
    const barrel = read('components', 'index.ts');
    expect(barrel).toMatch(/import \{ RecentProjects \} from '\.\/RecentProjects';/);
    expect(barrel).toMatch(/^\s*RecentProjects,$/m);
  });
});

describe('recent tile CSS', () => {
  it('canary: the Phase 6f block exists', () => {
    expect(pagesCss).toMatch(/HOME — RECENT PROJECTS & HALO \(Phase 6f\)/);
  });

  it('lays out three equal columns', () => {
    expect(ruleBody(pagesCss, '.recents-grid')).toMatch(/grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  });

  it('builds tile states from color-mix, never from a surface token', () => {
    const rest = ruleBody(pagesCss, '.recent-tile');
    const hover = ruleBody(pagesCss, '.recent-tile:hover');
    expect(rest).toMatch(/background:\s*color-mix\(in srgb, var\(--primary-text-color\) 7%, transparent\)/);
    expect(hover).toMatch(/background:\s*color-mix\(in srgb, var\(--primary-text-color\) 13%, transparent\)/);
    const block = pagesCss.slice(pagesCss.indexOf('HOME — RECENT PROJECTS & HALO (Phase 6f)'));
    expect(block).not.toMatch(/--surface-raised|--card-surface|--surface-field|--input-background/);
  });

  it('has a visible keyboard focus ring', () => {
    expect(ruleBody(pagesCss, '.recent-tile:focus-visible')).toMatch(/outline:\s*2px solid var\(--accent-color\)/);
  });

  it('truncates long names instead of wrapping', () => {
    const name = ruleBody(pagesCss, '.recent-tile-name');
    expect(name).toMatch(/text-overflow:\s*ellipsis/);
    expect(name).toMatch(/white-space:\s*nowrap/);
  });
});

const home = read('pages', 'HomePage.tsx');

describe('Home wiring', () => {
  it('canary: HomePage still renders its toolbar', () => {
    expect(home).toMatch(/<div className="home-toolbar">/);
  });

  it('puts the halo modifier on Home only', () => {
    expect(home).toMatch(/<div className="default-app-container home-halo">/);
    expect(read('pages', 'FootageMode.tsx')).not.toMatch(/home-halo/);
    expect(read('App.tsx')).not.toMatch(/home-halo/);
  });

  it('opens recents and the Load button through one function', () => {
    expect(home).toMatch(/const openProject = async \(directory\?: string\)/);
    expect(home).toMatch(/await onLoadProject\(directory\)/);
    expect(home).toMatch(/<RecentProjects onOpen=\{openProject\} \/>/);
    expect(home).toMatch(/onClick=\{\(\) => openProject\(\)\}/);
  });

  it('renders recents after the buttons and before the alerts', () => {
    const buttons = home.indexOf('className="home-page-buttons"');
    const recents = home.indexOf('<RecentProjects');
    const alerts = home.indexOf('<StepAlertList />');
    expect(buttons).toBeGreaterThan(-1);
    expect(recents).toBeGreaterThan(buttons);
    expect(alerts).toBeGreaterThan(recents);
  });
});

describe('Home halo and layout CSS', () => {
  it('ends the halo on the page background, not a panel (A14.5)', () => {
    expect(ruleBody(pagesCss, '.default-app-container.home-halo')).toMatch(
      /background:\s*radial-gradient\(120% 70% at 50% 0%, var\(--wash-2\) 0%, var\(--background-color\) 60%\)/
    );
  });

  it('shrinks the logo and drops the dead left offset (A14.6)', () => {
    const logo = ruleBody(pagesCss, '.home-page-image');
    expect(logo).toMatch(/width:\s*420px/);
    expect(logo).toMatch(/margin-top:\s*15vh/);
    expect(logo).not.toMatch(/left:/);
  });

  it('puts the start buttons in a row (A14.6)', () => {
    const btns = ruleBody(pagesCss, '.home-page-buttons');
    expect(btns).toMatch(/flex-direction:\s*row/);
    expect(btns).toMatch(/gap:\s*12px/);
    expect(btns).not.toMatch(/min-height/);
  });
});

describe('Summary panel wash', () => {
  const formCss = read('components', 'Forms', 'form.css');

  it('canary: form.css still has .form-container', () => {
    expect(ruleBody(formCss, '.form-container')).toMatch(
      /background-color:\s*var\(--secondary-background-color\)/
    );
  });

  it('adds the linear wash as a modifier', () => {
    expect(ruleBody(formCss, '.form-container.results-wash')).toMatch(
      /background:\s*linear-gradient\(180deg, var\(--wash-2\) 0%, var\(--surface-panel\) 26%\)/
    );
  });

  it('applies it on the Report Summary panel only', () => {
    expect(read('pages', 'Report.tsx')).toMatch(/<div className="form-container results-wash">/);
    for (const page of [
      'Results.tsx',
      'Processing.tsx',
      'CrossSections.tsx',
      'VideoRange.tsx',
      'CameraCalibration.tsx',
    ]) {
      expect(read('pages', page)).not.toMatch(/results-wash/);
    }
  });
});
