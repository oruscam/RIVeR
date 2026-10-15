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
  ['VideoRange.Errors.frameUnreadable', ['file']],
  ['VideoRange.Errors.frameSizeDiffers', ['file']],
  ['VideoRange.Errors.noFramesSelected', []],
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

  // The button opens the video dialog; the folder dialog is the link under it.
  describe('the Browse button names the video, not a folder', () => {
    const FOLDER_LABELS: Record<string, string> = {
      ar: 'فتح المجلدات',
      de: 'Ordner öffnen',
      en: 'Open Folders',
      es: 'Abrir Carpeta',
      fr: 'Ouvrir le dossier',
      hi: 'फ़ोल्डर खोलें',
      it: 'Apri cartella',
      ja: 'フォルダを開く',
      ko: '폴더 열기',
      pt: 'Abrir pasta',
      ru: 'Открыть папки',
      zh: '打开文件夹',
    };

    it('reads "Browse video" in English', () => {
      expect(read(load('en'), 'Step-2.openFolders')).toBe('Browse video');
    });

    it.each(LANGUAGES)('%s no longer says "open folder"', (language) => {
      const value = read(load(language), 'Step-2.openFolders');
      expect(value.trim()).not.toBe('');
      expect(value).not.toBe(FOLDER_LABELS[language]);
    });
  });
});
