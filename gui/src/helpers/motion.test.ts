import { prefersReducedMotion, scrollBehavior } from './motion';

const fakeWindow = (reduce: boolean) => ({
  matchMedia: (query: string) =>
    ({ matches: reduce && query === '(prefers-reduced-motion: reduce)' }) as MediaQueryList,
});

describe('motion helpers', () => {
  it('reads the OS setting', () => {
    expect(prefersReducedMotion(fakeWindow(true))).toBe(true);
    expect(prefersReducedMotion(fakeWindow(false))).toBe(false);
  });

  it('treats a missing window or matchMedia as no preference', () => {
    expect(prefersReducedMotion(undefined)).toBe(false);
    expect(prefersReducedMotion({} as Pick<Window, 'matchMedia'>)).toBe(false);
  });

  it('scrolls instantly when motion is reduced, smoothly otherwise', () => {
    expect(scrollBehavior(fakeWindow(true))).toBe('auto');
    expect(scrollBehavior(fakeWindow(false))).toBe('smooth');
  });
});
