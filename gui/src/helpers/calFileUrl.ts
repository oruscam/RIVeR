// Backslash isn't a valid separator for the "cal-file" URL scheme (only special schemes
// like http/file get that WHATWG normalization), so Windows paths (C:\Users\...) must be
// converted to forward slashes with a leading "/" before the drive letter — mirrored on
// the main-process side in main.ts's cal-file protocol.handle.
export const toCalFileUrl = (p: string): string => {
  const normalized = p.replace(/\\/g, '/');
  return `cal-file://${normalized.startsWith('/') ? '' : '/'}${normalized}`;
};
