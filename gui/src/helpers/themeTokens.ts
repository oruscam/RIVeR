/**
 * Resolves this project's theme custom properties to literal colours, per
 * theme, and computes WCAG contrast between them.
 *
 * It exists because the semantic aliases in `src/index.css` collapse onto each
 * other — the field surface is exactly the input background, the raised
 * surface resolves to exactly the panel, and dracula paints its border, hover
 * and input surfaces the same value. So "use a different token" is not
 * reliably a visible change, and five interaction states shipped invisible in
 * at least one theme before a reviewer resolved the chain by hand. Tests use
 * this module so that the resolution happens every run instead of whenever
 * someone remembers to check.
 *
 * Test support: nothing in the app imports it, and it stays free of `fs` so it
 * remains a pure function of the stylesheet text its caller reads.
 */

export type ThemeName = 'dark' | 'light' | 'dracula';

export type Rgb = readonly [number, number, number];

export type ThemeTokens = Readonly<Record<string, string>>;

const THEME_NAMES: readonly ThemeName[] = ['dark', 'light', 'dracula'];

const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Slices one declaration block by its exact selector. The theme blocks and the
 * bare `:root` block contain no nested braces, so the first closing brace ends
 * the block. Comments are stripped first so that a commented-out declaration
 * cannot be read as a live one, and so that prose is never scanned for
 * `--token: value` pairs.
 */
const blockBody = (css: string, selector: string): string => {
  const opener = `${selector} {`;
  const first = css.indexOf(opener);
  if (first < 0) {
    throw new Error(`No "${opener}" block in the stylesheet`);
  }
  if (css.indexOf(opener, first + 1) >= 0) {
    throw new Error(`"${opener}" appears more than once; parseThemeTokens assumes one block per selector`);
  }
  const start = first + opener.length;
  const end = css.indexOf('}', start);
  if (end < 0) {
    throw new Error(`Unterminated "${opener}" block`);
  }
  return css.slice(start, end);
};

const declarations = (body: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[match[1]] = match[2].trim();
  }
  return out;
};

/**
 * Reads the bare `:root` block and the three `[data-theme]` blocks, returning
 * one flat token map per theme with the shared scale tokens merged in. A theme
 * declaration wins over the shared one, matching the cascade.
 */
export const parseThemeTokens = (css: string): Record<ThemeName, ThemeTokens> => {
  const bare = stripComments(css);
  const shared = declarations(blockBody(bare, ':root'));
  const result = {} as Record<ThemeName, ThemeTokens>;
  for (const name of THEME_NAMES) {
    result[name] = {
      ...shared,
      ...declarations(blockBody(bare, `[data-theme="${name}"]`)),
    };
  }
  return result;
};

/**
 * Follows `var(--x)` aliases until a literal value is reached. Throws rather
 * than returning `undefined`, so a typo in a test surfaces as a named token
 * instead of as a downstream NaN.
 */
export const resolveToken = (tokens: ThemeTokens, name: string): string => {
  const seen = new Set<string>();
  let current = name;
  for (;;) {
    if (seen.has(current)) {
      throw new Error(`Circular custom-property chain: ${[...seen, current].join(' -> ')}`);
    }
    seen.add(current);
    const value = tokens[current];
    if (value === undefined) {
      throw new Error(`Custom property ${current} is not declared in this theme`);
    }
    const alias = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);
    if (!alias) {
      // Only a bare var(--token) is an alias this resolver follows. Anything
      // else containing var() — a fallback like var(--x, #ff0000), or a
      // composed value — would otherwise be returned as though it were a
      // literal colour, and parseHex would then reject it with a confusing
      // message or, worse, a caller would compare it as a string and pass.
      if (value.includes('var(')) {
        throw new Error(
          `${current} is "${value}", a var() form this resolver does not handle. ` +
            'Extend resolveToken deliberately rather than letting it be treated as a literal.'
        );
      }
      return value;
    }
    current = alias[1];
  }
};

/** Parses `#rrggbb`. Deliberately narrow: every colour token in this project
 * is six-digit hex, and a silent parse of some other notation would produce a
 * plausible-looking wrong ratio. */
export const parseHex = (color: string): Rgb => {
  const match = color.trim().match(/^#([0-9a-fA-F]{6})$/);
  if (!match) {
    throw new Error(`Expected a #rrggbb colour, got "${color}"`);
  }
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
};

/** Resolves a token to its literal colour in one step, the common case. */
export const resolveRgb = (tokens: ThemeTokens, name: string): Rgb => parseHex(resolveToken(tokens, name));

const channelLuminance = (channel: number): number => {
  const scaled = channel / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
};

export const relativeLuminance = ([r, g, b]: Rgb): number =>
  0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);

export const contrastRatio = (a: Rgb, b: Rgb): number => {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * The composite of `color-mix(in srgb, <color> <fraction>%, transparent)` — or
 * equivalently of `opacity: <fraction>` — drawn over a known backdrop. Phase 6
 * builds its faint states this way precisely because it cannot rely on a
 * second surface token being a different colour.
 */
export const mixOverBackdrop = (color: Rgb, fraction: number, backdrop: Rgb): Rgb => {
  if (fraction < 0 || fraction > 1) {
    throw new Error(`fraction must be between 0 and 1, got ${fraction}`);
  }
  return [
    fraction * color[0] + (1 - fraction) * backdrop[0],
    fraction * color[1] + (1 - fraction) * backdrop[1],
    fraction * color[2] + (1 - fraction) * backdrop[2],
  ];
};
