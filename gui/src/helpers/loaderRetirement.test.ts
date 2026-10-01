import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { scanCss } from './cssScanner';

/**
 * The thick border-ring loaders are retired. Processing and calibration show a
 * ProgressReadout (number + hairline); module waits show a top-edge bar; busy
 * buttons show a sweep along their bottom edge.
 */
const SRC = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(tsx?|jsx|css)$/.test(name) && !name.includes('.test.') ? [full] : [];
  });

const index = read('index.css');
const { declarations } = scanCss(index);
const decl = (selector: string, property: string) =>
  declarations.filter((d) => d.selector === selector && d.property === property).map((d) => d.value);

describe('ring loaders are retired', () => {
  const RETIRED = /\bloader-(little|mid|big|wrapper|container|percentage|complete)\b/;

  it('no source file uses a ring loader class', () => {
    const offenders = walk(SRC).filter((f) => RETIRED.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('removes the dead FormAnalizing form, which only existed to host the old loader', () => {
    expect(existsSync(join(SRC, 'components', 'Forms', 'FormAnalizing.tsx'))).toBe(false);
  });

  it('processing and calibration use ProgressReadout instead of Loading', () => {
    for (const file of ['components/Forms/Components/AnalyzingProgress.tsx', 'components/Forms/FormCalibration.tsx']) {
      const src = read(file);
      expect(src).toMatch(/<ProgressReadout\b/);
      expect(src).not.toMatch(/<Loading\b/);
    }
  });
});

describe('module loader is a top-edge bar', () => {
  it('sweeps with transform, not layout properties', () => {
    const sweep = index.match(/@keyframes\s+loader-sweep\s*\{([\s\S]*?)\}\s*\}/);
    expect(sweep).not.toBeNull();
    expect(sweep![1]).toMatch(/transform:\s*translateX/);
    expect(sweep![1]).not.toMatch(/\b(left|width|margin)\s*:/);
  });

  it('waits before appearing, so quick module switches never flash it', () => {
    const [animation] = decl('.module-loader', 'animation');
    expect(animation).toMatch(/\b(2[5-9]\d|[3-9]\d\d)ms\b/);
  });

  it('fills with transform when frame progress is known', () => {
    expect(decl('.module-loader-fill', 'transform-origin')).toEqual(['left']);
    expect(read('components/Loading.tsx')).toMatch(/scaleX\(/);
  });
});

describe('busy buttons sweep along their bottom edge', () => {
  it('the Test button shows the sweep while testing', () => {
    expect(read('components/Forms/Components/HardModeProcessing.tsx')).toMatch(
      /isBackendWorking && isTesting && <span className="btn-progress-sweep"/
    );
  });

  it('the sweep is pinned to the bottom of the button', () => {
    expect(decl('.btn-progress-sweep', 'bottom')).toEqual(['0']);
    expect(decl('.button-with-loader', 'position')).toEqual(['relative']);
    expect(decl('.button-with-loader', 'overflow')).toEqual(['hidden']);
  });
});
