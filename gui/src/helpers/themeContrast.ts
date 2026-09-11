/**
 * Reads the colour tokens declared in index.css's [data-theme="…"] blocks and
 * measures WCAG 2 contrast between them, so a theme change that makes text
 * unreadable fails a test instead of reaching users.
 */
export type ThemeTokens = Record<string, Record<string, string>>;

export const parseThemeTokens = (css: string): ThemeTokens => {
  const themes: ThemeTokens = {};
  const blockPattern = /\[data-theme="([a-z]+)"\]\s*\{([^}]*)\}/g;
  let block: RegExpExecArray | null;
  while ((block = blockPattern.exec(css)) !== null) {
    const tokens: Record<string, string> = {};
    const declarationPattern = /(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g;
    let declaration: RegExpExecArray | null;
    while ((declaration = declarationPattern.exec(block[2])) !== null) {
      tokens[declaration[1]] = declaration[2].toUpperCase();
    }
    themes[block[1]] = tokens;
  }
  return themes;
};

const linearChannel = (value: number): number => {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
};

export const relativeLuminance = (hex: string): number => {
  const rgb = parseInt(hex.slice(1), 16);
  return (
    0.2126 * linearChannel((rgb >> 16) & 255) +
    0.7152 * linearChannel((rgb >> 8) & 255) +
    0.0722 * linearChannel(rgb & 255)
  );
};

export const contrastRatio = (a: string, b: string): number => {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};
