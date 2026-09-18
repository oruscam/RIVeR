import { buildModeHintAriaLabel } from './modeHintText';

describe('buildModeHintAriaLabel', () => {
  it('returns the text alone when there is no meta', () => {
    expect(buildModeHintAriaLabel({ text: 'Drawing line' })).toBe('Drawing line');
  });

  it('appends meta after the text', () => {
    expect(buildModeHintAriaLabel({ text: 'Editing regions', meta: '1 of 2 min.' })).toBe(
      'Editing regions, 1 of 2 min.'
    );
  });

  it('returns an empty string for no hint', () => {
    expect(buildModeHintAriaLabel(null)).toBe('');
  });
});
