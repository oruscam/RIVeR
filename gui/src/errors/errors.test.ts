import i18next from 'i18next';
import en from '../translations/en/global.json';
import { AnalysisError } from './errors';

const i18n = i18next.createInstance();
i18n.init({
  lng: 'en',
  initImmediate: false,
  interpolation: { escapeValue: false },
  resources: { en: { translation: en } },
});
const message = (raw: string) => new AnalysisError(raw, i18n.t.bind(i18n)).message;

describe('AnalysisError', () => {
  it('shows the cause the backend reported and where the details are', () => {
    expect(message('Unexpected error: index 0 is out of bounds for axis 0 with size 0')).toBe(
      'Analysis failed: index 0 is out of bounds for axis 0 with size 0. Details in river.log'
    );
  });

  it('shows only the last line when a crashed process sends its whole output', () => {
    const stderr =
      'Processing 767 frames...\r\nTraceback (most recent call last):\n  File "x.py"\nMemoryError: no memory.\n';
    expect(message(stderr)).toBe('Analysis failed: MemoryError: no memory. Details in river.log');
  });

  it('shortens a very long cause', () => {
    expect(message('x'.repeat(500))).toBe(`Analysis failed: ${'x'.repeat(200)}. Details in river.log`);
  });

  it('keeps the translated text of a known cause', () => {
    expect(message('windowsSizesError')).toBe(en.Errors.Cli.windowsSizesError);
  });
});
