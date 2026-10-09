/**
 * Reads a CSS custom property (variable) from the document root at runtime.
 * Use this in D3/canvas drawing code so colors adapt to the active theme.
 *
 * @param name - CSS variable name including the leading dashes, e.g. '--d12'
 * @param fallback - Value returned if the property is not set
 */
export const getCSSVar = (name: string, fallback = ''): string => {
  // Test environments in this repo run without jsdom, so document is
  // undefined — return the fallback rather than dereferencing it.
  if (typeof document === 'undefined') return fallback;
  // The exported report is a fixed light document: while it is mounted its
  // root carries data-theme-scope (and data-theme="light"), and every chart
  // drawn on that page must take its ink from there, not from the app theme.
  // Otherwise data-theme is on the app root div, not on <html>.
  const themedEl =
    (document.querySelector('[data-theme-scope]') as HTMLElement | null) ??
    (document.querySelector('[data-theme]') as HTMLElement | null) ??
    document.documentElement;
  return getComputedStyle(themedEl).getPropertyValue(name).trim() || fallback;
};

/**
 * Returns all six distance-pair colors from the current theme's CSS variables.
 * Used by D3 drawing functions so oblique lines match the form-box borders.
 */
export const getDistanceColors = () => ({
  D12: getCSSVar('--d12', '#6CD4FF'),
  D13: getCSSVar('--d13', '#CC4BC2'),
  D14: getCSSVar('--d14', '#F5BF61'),
  D23: getCSSVar('--d23', '#62C655'),
  D24: getCSSVar('--d24', '#7765E3'),
  D34: getCSSVar('--d34', '#ED6B57'),
});

/**
 * Returns the three per-technique identity colors (LSPIV/STIV/iWave) from
 * the current theme's CSS variables. Never the accent color; STIV may share
 * the "fair" orange — see index.css's --tech-* tokens. Fallbacks are the
 * dark theme's values.
 */
export const getTechniqueColors = () => ({
  lspiv: getCSSVar('--tech-lspiv', '#5CB8FF'),
  stiv: getCSSVar('--tech-stiv', '#FF9F43'),
  iwave: getCSSVar('--tech-iwave', '#F07CD3'),
});

/**
 * Returns the Pin component's colours from the current theme's CSS
 * variables. `left`/`right` are the cross-section L/R pins (RIVeR's
 * historical red-left/green-right convention); `point` is the plain pin
 * used everywhere else (UAV pixel size, Oblique corners, ipcam control
 * points); `muted` is an unselected/inactive point (ipcam only); `ink` is
 * the label colour drawn inside every pin's head, the same in all themes.
 * Note: in test environments without document/DOM, getCSSVar returns each
 * fallback below directly (the dark theme's values).
 */
export const getPinColors = () => ({
  left: getCSSVar('--pin-left', '#ED6B57'),
  right: getCSSVar('--pin-right', '#62C655'),
  point: getCSSVar('--pin-point', '#6CD4FF'),
  muted: getCSSVar('--pin-muted', '#808080'),
  ink: getCSSVar('--pin-ink', '#0B0D10'),
});

/**
 * Returns the reprojection residual colours by error grade. Theme-invariant
 * (bare :root block, like the pins); `none` is the overlay line colour, for a
 * point whose error is unknown.
 */
export const getResidualColors = () => ({
  good: getCSSVar('--residual-good', '#62C655'),
  fair: getCSSVar('--residual-fair', '#F5BF61'),
  bad: getCSSVar('--residual-bad', '#ED6B57'),
  none: getCSSVar('--overlay-line', '#FFFFFF'),
});

/**
 * Returns the mask/region overlay drawing colours from the current theme's
 * CSS variables. Both are theme-invariant (declared once in the bare
 * :root block, like --pin-ink) — see index.css.
 */
export const getOverlayColors = () => ({
  line: getCSSVar('--overlay-line', '#FFFFFF'),
  dim: getCSSVar('--overlay-dim', 'rgba(0, 0, 0, 0.4)'),
});

/**
 * Returns the iWave spectrum's colour ramp from the current theme's CSS
 * variables, lowest energy first: the plot's ground, a mid blue, and the ink
 * strong energy is drawn in. Kept as hex strings for the caller to parse;
 * fallbacks are the dark theme's values.
 */
export const getSpectrumRamp = (): string[] => [
  getCSSVar('--spectrum-0', '#0A0D12'),
  getCSSVar('--spectrum-1', '#2E7DD6'),
  getCSSVar('--spectrum-2', '#A9DCFF'),
];
