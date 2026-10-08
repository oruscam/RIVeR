import * as fs from 'fs';
import * as path from 'path';

const LANGUAGES = ['ar', 'de', 'en', 'es', 'fr', 'hi', 'it', 'ja', 'ko', 'pt', 'ru', 'zh'];

/** Every string the frames import added, with the placeholders it must keep. */
const KEYS: Array<[string, string[]]> = [
  ['Step-2.dragAndDrop', []],
  ['Step-2.chooseFramesFolder', []],
  ['Step-2.readingFolder', []],
  ['Step-2.framesSummary', ['count', 'width', 'height']],
  ['Step-2.timeBetweenFrames', []],
  ['Step-2.Errors.noFrames', []],
  ['Step-2.Errors.mixedSizes', []],
  ['Step-2.Errors.dropFolder', []],
  ['Step-2.Errors.unreadableFolder', []],
  ['VideoRange.sourceFrames', []],
  ['VideoRange.Errors.frameRange', ['count']],
  ['VideoRange.Errors.interval', []],
  ['VideoRange.ExtraInfo.folderName', []],
  ['VideoRange.ExtraInfo.frameCount', []],
  ['Report.Doc.sourceLabel', []],
  ['Report.Doc.imageSequence', ['count', 'ms']],
  ['Loader.importingFrames', []],
  ['ProjectIssues.framesMissing', ['name']],
  ['ProjectIssues.framesMismatch', ['foundCount', 'foundWidth', 'foundHeight', 'count', 'width', 'height']],
  ['ProjectIssues.framesLocked', []],
];

const load = (language: string) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'translations', language, 'global.json'), 'utf-8'));

const read = (bundle: any, key: string) => key.split('.').reduce((node, part) => node?.[part], bundle);

describe('frames import copy', () => {
  it('reads every language file (canary: this sweep sees real content)', () => {
    expect(read(load('en'), 'Step-2.title')).toBe('Select the kind of footage');
  });

  describe.each(LANGUAGES)('%s', (language) => {
    const bundle = load(language);

    it.each(KEYS)('has %s with its placeholders', (key, placeholders) => {
      const value = read(bundle, key);
      expect(typeof value).toBe('string');
      expect(value.trim()).not.toBe('');
      for (const placeholder of placeholders) {
        expect(value).toContain(`{{${placeholder}}}`);
      }
    });
  });
});
