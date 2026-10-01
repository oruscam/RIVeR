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
