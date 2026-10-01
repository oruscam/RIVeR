/**
 * The OS "reduce motion" setting, for motion CSS cannot reach: a JS
 * `scrollIntoView({ behavior })` option overrides the stylesheet's
 * scroll-behavior, so those calls ask here instead (Phase 6g, spec A15).
 */
const browserWindow = (): Pick<Window, 'matchMedia'> | undefined =>
  typeof window === 'undefined' ? undefined : window;

export const prefersReducedMotion = (win: Pick<Window, 'matchMedia'> | undefined = browserWindow()): boolean =>
  !!win && typeof win.matchMedia === 'function' && win.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const scrollBehavior = (win: Pick<Window, 'matchMedia'> | undefined = browserWindow()): ScrollBehavior =>
  prefersReducedMotion(win) ? 'auto' : 'smooth';
