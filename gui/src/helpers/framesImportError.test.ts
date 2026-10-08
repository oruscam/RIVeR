import { framesImportError } from './framesImportError';

// Stands in for i18next: the key, then its interpolation values.
const t = (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key);

describe('framesImportError', () => {
  it('names the file the backend could not read', () => {
    expect(framesImportError('unreadable:frame_6.jpg', t)).toBe(
      'VideoRange.Errors.frameUnreadable {"file":"frame_6.jpg"}'
    );
  });

  it('names the file whose size differs', () => {
    expect(framesImportError('mixedSizes:frame_6.jpg', t)).toBe(
      'VideoRange.Errors.frameSizeDiffers {"file":"frame_6.jpg"}'
    );
  });

  it('keeps a colon that belongs to the file name', () => {
    expect(framesImportError('unreadable:a:b.png', t)).toBe(
      'VideoRange.Errors.frameUnreadable {"file":"a:b.png"}'
    );
  });

  it('explains a range and step that select no frame', () => {
    expect(framesImportError('emptySelection', t)).toBe('VideoRange.Errors.noFramesSelected');
  });

  it('reuses the footage step copy for the folder-level codes', () => {
    expect(framesImportError('noFrames', t)).toBe('Step-2.Errors.noFrames');
    expect(framesImportError('mixedSizes', t)).toBe('Step-2.Errors.mixedSizes');
  });

  it('passes any other message through unchanged', () => {
    expect(framesImportError('The profile resolution (1×1) does not match the frames.', t)).toBe(
      'The profile resolution (1×1) does not match the frames.'
    );
  });
});
