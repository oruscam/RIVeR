import { isLowConfidence } from './lowConfidence';

describe('isLowConfidence', () => {
  it('is true when sigma exceeds the velocity magnitude', () => {
    expect(isLowConfidence(0.3, 0.5)).toBe(true);
    expect(isLowConfidence(-0.3, 0.5)).toBe(true);
  });

  it('is false when sigma is below the velocity magnitude', () => {
    expect(isLowConfidence(1.1, 0.2)).toBe(false);
  });

  it('is false for a dry-bank station (v === 0) even if sigma sits at its floor', () => {
    expect(isLowConfidence(0, 0.05)).toBe(false);
  });

  it('is false when either value is null or undefined', () => {
    expect(isLowConfidence(null, 0.5)).toBe(false);
    expect(isLowConfidence(0.3, null)).toBe(false);
    expect(isLowConfidence(undefined, undefined)).toBe(false);
  });
});
