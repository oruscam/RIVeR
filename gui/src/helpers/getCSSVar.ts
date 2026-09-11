/**
 * Reads a CSS custom property (variable) from the document root at runtime.
 * Use this in D3/canvas drawing code so colors adapt to the active theme.
 *
 * @param name - CSS variable name including the leading dashes, e.g. '--d12'
 * @param fallback - Value returned if the property is not set
 */
export const getCSSVar = (name: string, fallback = ''): string => {
  // data-theme is set on the app root div, not on <html>, so we must read
  // computed styles from that element to get the correct theme variables.
  const themedEl = (document.querySelector('[data-theme]') as HTMLElement | null) ?? document.documentElement;
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
 * the current theme's CSS variables. Deliberately separate from status
 * colors (good/fair/bad) and the accent color — see index.css's --tech-*
 * tokens. Fallbacks are the dark theme's values.
 */
export const getTechniqueColors = () => ({
  lspiv: getCSSVar('--tech-lspiv', '#56B4E9'),
  stiv: getCSSVar('--tech-stiv', '#E69F00'),
  iwave: getCSSVar('--tech-iwave', '#009E73'),
});
