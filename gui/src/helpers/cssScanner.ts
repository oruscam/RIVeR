/**
 * Comment- and string-aware CSS scanner behind Phase 6g's type and radius
 * sweep (spec §4/6g, amendment A15). Pure: takes a stylesheet's text, returns
 * its rules and declarations. No DOM, no file access.
 *
 * Why not a regex over raw text: 6b shipped five guards that failed green,
 * two because a regex read across a comment or lost a rule prettier had
 * wrapped. This walks the text once, blanks comments without moving any
 * character (so offsets and line numbers survive), never treats a `/*`
 * inside a quoted string as a comment opener, and ends a comment at the
 * first `*\/` exactly as a browser does, so it sees the stylesheet the
 * browser sees, including a rule a stray `*\/` has silently broken.
 */

export interface CssRule {
  /** Text before the rule's `{`, whitespace-collapsed, e.g. `.btn:hover` or `@media (x)`. */
  prelude: string;
  /** 1-based line of the prelude's first character. */
  line: number;
  /** Ordinal of this rule within the stylesheet, counted from 0 in source order. */
  index: number;
}

export interface CssDeclaration {
  /** The innermost enclosing rule's prelude. */
  selector: string;
  /** `CssRule.index` of the innermost enclosing rule. */
  rule: number;
  /** Lower-cased property name, e.g. `font-size`. */
  property: string;
  /** Trimmed value with comments removed; keeps any `!important`. */
  value: string;
  /** 1-based line of the property name. */
  line: number;
  /** Text of a `scale-exception:` comment on the line where the declaration starts, or null. */
  exception: string | null;
}

/**
 * Replaces every block comment with spaces, keeping newlines, so the result
 * has the input's length and line structure. A quote opens a string that
 * ends at the matching quote or at a newline. The newline bound limits a
 * stray quote's damage to one line, and the failure it causes is a comment
 * left in place (a loud false positive), never a real rule blanked.
 */
export const blankComments = (text: string): string => {
  let out = '';
  let index = 0;
  let quote: string | null = null;
  while (index < text.length) {
    const character = text[index];
    if (quote !== null) {
      if (character === '\\') {
        out += character + (text[index + 1] ?? '');
        index += 2;
        continue;
      }
      if (character === quote || character === '\n') quote = null;
      out += character;
      index += 1;
      continue;
    }
    if (character === '/' && text[index + 1] === '*') {
      let end = index + 2;
      while (end < text.length && !(text[end] === '*' && text[end + 1] === '/')) end += 1;
      end = Math.min(end + 2, text.length);
      for (let cursor = index; cursor < end; cursor += 1) out += text[cursor] === '\n' ? '\n' : ' ';
      index = end;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    out += character;
    index += 1;
  }
  return out;
};

const lineAt = (text: string, offset: number): number => text.slice(0, offset).split('\n').length;

const EXCEPTION = /\/\*\s*scale-exception:\s*([\s\S]*?)\s*\*\//;

export const scanCss = (source: string): { rules: CssRule[]; declarations: CssDeclaration[] } => {
  const text = blankComments(source);
  const rules: CssRule[] = [];
  const declarations: CssDeclaration[] = [];
  const open: CssRule[] = [];
  let segmentStart = 0;
  let quote: string | null = null;
  let parens = 0;

  const flushDeclaration = (end: number) => {
    const segment = text.slice(segmentStart, end);
    const match = segment.match(/^(\s*)(-{0,2}[a-zA-Z][a-zA-Z0-9-]*)\s*:([\s\S]*)$/);
    if (!match || open.length === 0) return;
    const propertyOffset = segmentStart + match[1].length;
    const lineEnd = source.indexOf('\n', propertyOffset);
    const restOfLine = source.slice(propertyOffset, lineEnd === -1 ? source.length : lineEnd);
    const exception = restOfLine.match(EXCEPTION);
    const enclosing = open[open.length - 1];
    declarations.push({
      selector: enclosing.prelude,
      rule: enclosing.index,
      property: match[2].toLowerCase(),
      value: match[3].trim(),
      line: lineAt(source, propertyOffset),
      exception: exception ? exception[1] : null,
    });
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quote !== null) {
      if (character === '\\') index += 1;
      else if (character === quote || character === '\n') quote = null;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === '(') parens += 1;
    else if (character === ')') parens = Math.max(0, parens - 1);
    else if (parens > 0) continue;
    else if (character === '{') {
      const raw = text.slice(segmentStart, index);
      const lead = raw.length - raw.trimStart().length;
      const rule: CssRule = {
        prelude: raw.trim().replace(/\s+/g, ' '),
        line: lineAt(source, segmentStart + lead),
        index: rules.length,
      };
      rules.push(rule);
      open.push(rule);
      segmentStart = index + 1;
    } else if (character === ';') {
      // At top level a browser ends only an @-statement (`@import …;`) at a
      // semicolon; inside a qualified rule's prelude it is just more prelude.
      // Splitting there would hide exactly the broken rule brokenPreludes exists to find.
      if (open.length === 0 && !text.slice(segmentStart, index).trimStart().startsWith('@')) continue;
      flushDeclaration(index);
      segmentStart = index + 1;
    } else if (character === '}') {
      flushDeclaration(index);
      open.pop();
      segmentStart = index + 1;
    }
  }
  return { rules, declarations };
};

/**
 * Rules whose prelude contains a `;` or a bare `*\/`. No valid selector or
 * at-rule prelude in this codebase does. Either one means comment text has
 * spilled into the prelude because a stray `*\/` closed the comment early,
 * and the browser then drops the whole rule as an invalid selector.
 */
export const brokenPreludes = (rules: CssRule[]): CssRule[] =>
  rules.filter((rule) => rule.prelude.includes(';') || rule.prelude.includes('*/'));

const TEXT_STEP = /^var\(--text-(display|title|subtitle|section|body|meta|caption)\)$/;
const RADIUS_STEP = /^var\(--radius-(sm|md|lg|xl|full)\)$/;
const withoutImportant = (value: string): string => value.replace(/\s*!important\s*$/, '').trim();

/** A `font-size` on 6a's seven-step scale: a token, `inherit`, or a `clamp()` whose bounds are both tokens. */
export const isScaleFontSize = (raw: string): boolean => {
  const value = withoutImportant(raw);
  if (value === 'inherit' || TEXT_STEP.test(value)) return true;
  const fluid = value.match(/^clamp\(\s*(var\([^()]*\))\s*,\s*\d+(?:\.\d+)?vw\s*,\s*(var\([^()]*\))\s*\)$/);
  return fluid !== null && TEXT_STEP.test(fluid[1]) && TEXT_STEP.test(fluid[2]);
};

/** A `border-radius` built only from radius tokens, `0`, or `50%` (a circle), or `inherit` alone. */
export const isScaleRadius = (raw: string): boolean => {
  const value = withoutImportant(raw);
  if (value === 'inherit') return true;
  const parts = value.split(/\s+/);
  return parts.length <= 4 && parts.every((part) => part === '0' || part === '50%' || RADIUS_STEP.test(part));
};

/** A `font` shorthand is on the scale when it is `inherit`, or names a text token and no raw length before any `/`. */
export const isScaleFontShorthand = (raw: string): boolean => {
  const value = withoutImportant(raw);
  if (value === 'inherit') return true;
  const size = value.split('/')[0];
  return /var\(--text-[a-z]+\)/.test(size) && !/(^|\s)\d*\.?\d+(px|r?em|%|vw)(\s|$)/.test(size);
};

const RADIUS_PROPERTY = /^border(-(top|bottom)-(left|right))?-radius$/;

/** Whether a declaration is one this sweep governs: font-size, the font shorthand, or any border radius. */
export const isScaleProperty = (property: string): boolean =>
  property === 'font-size' || property === 'font' || RADIUS_PROPERTY.test(property);

/** A `scale-exception:` reason must say why, in at least three words. */
export const hasValidException = (declaration: CssDeclaration): boolean =>
  declaration.exception !== null && declaration.exception.split(/\s+/).filter(Boolean).length >= 3;

/** Whether a governed declaration's value is on its scale (ignores exceptions). */
export const isOnScale = ({ property, value }: CssDeclaration): boolean => {
  if (property === 'font-size') return isScaleFontSize(value);
  if (property === 'font') return isScaleFontShorthand(value);
  return isScaleRadius(value);
};

/** Governed declarations that are off the scale and carry no valid exception. */
export const scaleOffenders = (declarations: CssDeclaration[]): CssDeclaration[] =>
  declarations.filter((d) => isScaleProperty(d.property) && !isOnScale(d) && !hasValidException(d));
