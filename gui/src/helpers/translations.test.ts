import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * User-visible wording rules that must hold in every shipped language.
 */
type Tree = { [key: string]: string | Tree };

const DIR = join(__dirname, '..', 'translations');
const languages = readdirSync(DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const load = (lang: string): Tree => JSON.parse(readFileSync(join(DIR, lang, 'global.json'), 'utf8'));
const values = (tree: Tree): string[] =>
  Object.values(tree).flatMap((value) => (typeof value === 'string' ? [value] : values(value)));
const get = (tree: Tree, path: string): string =>
  path.split('.').reduce<string | Tree>((node, key) => (node as Tree)[key], tree) as string;

// The Step field accepts any whole number of 1 or more (validationRules.ts: /^[1-9]\d*$/).
const STEP_RULE: Record<string, string> = {
  ar: 'يساوي 1 أو أكبر',
  de: 'größer oder gleich 1',
  en: 'whole number of 1 or more',
  es: 'mayor o igual que 1',
  fr: 'supérieur ou égal à 1',
  hi: '1 या उससे बड़ा',
  it: 'maggiore o uguale a 1',
  ja: '1以上の整数',
  ko: '1 이상의 정수',
  pt: 'maior ou igual a 1',
  ru: 'не меньше 1',
  zh: '大于或等于 1',
};

describe('translations', () => {
  it('ships the 12 expected languages', () => {
    expect(languages).toEqual(['ar', 'de', 'en', 'es', 'fr', 'hi', 'it', 'ja', 'ko', 'pt', 'ru', 'zh']);
  });

  it.each(languages)('%s calls the technique iWave, never IWV', (lang) => {
    expect(values(load(lang)).filter((text) => text.includes('IWV'))).toEqual([]);
  });

  it.each(Object.entries(STEP_RULE))('%s Step error allows a step of 1', (lang, phrase) => {
    expect(get(load(lang), 'VideoRange.Errors.step')).toContain(phrase);
  });

  it('fixes the English typos', () => {
    const en = load('en');
    expect(get(en, 'Processing.analize')).toBe('Analyze');
    expect(get(en, 'Analizing.analize')).toBe('Analyze');
    expect(get(en, 'Analizing.title')).toBe('Analyzing');
    expect(get(en, 'Processing.medianTestFiltering')).toBe('Median test filtering');
    expect(get(en, 'Results.showProfile')).toBe('Show 5% | 95% percentiles');
    expect(get(en, 'Report.Form.riverLocation')).toBe('Site');
  });
});
