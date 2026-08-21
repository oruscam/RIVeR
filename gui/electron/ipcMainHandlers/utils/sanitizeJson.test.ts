import { sanitizeNonStandardJsonTokens } from './sanitizeJson';

describe('sanitizeNonStandardJsonTokens', () => {
  it('replaces a bare NaN in value position with null', () => {
    const raw = '{"a": [1, NaN, 2]}';
    expect(sanitizeNonStandardJsonTokens(raw)).toBe('{"a": [1, null, 2]}');
  });

  it('replaces a bare Infinity in value position with null', () => {
    const raw = '{"a": Infinity, "b": 1}';
    expect(sanitizeNonStandardJsonTokens(raw)).toBe('{"a": null, "b": 1}');
  });

  it('replaces a bare -Infinity in value position with null', () => {
    const raw = '{"a": [-Infinity, 1]}';
    expect(sanitizeNonStandardJsonTokens(raw)).toBe('{"a": [null, 1]}');
  });

  it('leaves a quoted string containing the substring "NaN" untouched', () => {
    const raw = '{"label": "NaNcy"}';
    expect(sanitizeNonStandardJsonTokens(raw)).toBe('{"label": "NaNcy"}');
  });

  it('leaves a quoted string containing the substring "Infinity" untouched', () => {
    const raw = '{"label": "ToInfinityAndBeyond"}';
    expect(sanitizeNonStandardJsonTokens(raw)).toBe('{"label": "ToInfinityAndBeyond"}');
  });

  it('produces valid JSON that JSON.parse accepts without throwing', () => {
    const raw = '{"a": [NaN, Infinity, -Infinity, 1], "label": "NaN is not a number"}';
    const sanitized = sanitizeNonStandardJsonTokens(raw);
    expect(() => JSON.parse(sanitized)).not.toThrow();
    expect(JSON.parse(sanitized)).toEqual({
      a: [null, null, null, 1],
      label: 'NaN is not a number',
    });
  });
});
