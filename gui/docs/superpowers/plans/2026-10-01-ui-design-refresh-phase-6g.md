# Phase 6g — Type, Radius & Motion Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every `font-size` and `border-radius` in `src/**/*.css` onto the scale tokens or a documented exception. Put Outfit 700 on every title- and display-sized rule. Make the whole app honour `prefers-reduced-motion`.

**Architecture:** A pure, comment- and string-aware CSS scanner (`src/helpers/cssScanner.ts`) parses each stylesheet the way a browser does and classifies every governed declaration against the scale. One whole-tree test (`typeAndRadiusScale.test.ts`) acts as a **ratchet**. It holds an exact per-file count of offenders still owed, and each sweep task deletes its files' entries until the object is gone. Exceptions are listed by name in the same test, so adding one is a reviewable diff. The motion work is one global `@media (prefers-reduced-motion: reduce)` block plus a `scrollBehavior()` helper for the 19 JS smooth scrolls, both guarded by tests.

**Tech Stack:** Electron, React 18.3.1, TypeScript, plain CSS (no preprocessor), Jest 29 + ts-jest (`testEnvironment: "node"`, **no DOM**).

**Spec:** `docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md`, §4/6g, plus amendment **A15**, which Task 2 writes into §9 from the decisions below. Read §4/6a's "Token collapse facts" too. This phase adds no colour states, but the habit carries over.

---

## Product-owner decisions taken while planning (2026-10-01)

| # | Decision |
|---|---|
| G1 | **20px radius gets its own token, `--radius-xl: 20px`.** It is the most common radius in the codebase (25 sites: panels, input fields, media container, drop areas). Mirrors A2's `--text-subtitle`, so the sweep is mechanical and causes no visible change. Scale becomes 4 / 8 / 12 / 20 / 999. |
| G2 | **`report.css` is exempt as a whole.** It styles a printable document with its own em-based scale, and `Report.tsx` inlines every stylesheet into the exported `report.html`. One file-level `scale-exempt-file:` comment, so the report's **own** rules don't change. **Correction found after the decision:** the report also embeds three shared app widgets, `SuccessBanner`, `ImageResults` (with its colour bar) and the `AllInOne` graphs. Their swept values reach exported reports exactly as they appear in the app (e.g. the colour-bar box radius 15 → 12px, its input 18 → 16px, the success-banner title 22.4 → 24px in Outfit). The plan treats that as intended, since it is the same widget, and Task 11's walkthrough compares an exported report so the product owner sees it. |
| G3 | **The app-wide `prefers-reduced-motion` sweep (A8's debt) is in 6g**, as its own task. |
| G4 | **Snap rule: a value goes to the nearest scale step, and exact ties go down.** So 18px → 16, 13.5 → 13, 12.5 → 12, 15 → 14, 10px radius → 8, 6px → 4, 16px (1rem) radius → 12. One deliberate deviation is recorded in Task 5, and the Outfit/weight changes are recorded in Task 8. |

Two things were found while planning. They are fixed here because the sweep cannot be verified without them:

- **A live CSS bug: the `.technique-row` rule has been dropped by the browser since `fe40b46` (2026-09-18).** The comment above it, at `components.css:1235`, contains `.technique-row-body*/`. That `*/` closes the comment early, the rest of the comment becomes the rule's selector, and the selector is invalid. So Results' technique legend rows have had no flex, gap, padding, radius or hover transition for two weeks. `techniqueRowCss.test.ts` still passes, because it regex-matches the raw text: **a guard failing green**, the 6b lesson again. Task 1 fixes it and adds a whole-tree check that catches the class.
- **Duplicate and dead rules carrying off-scale values.** `components.css:295-428` duplicates `index.css`'s loader and info-icon rules. Their computed values are identical; the only differences are dead duplicate declarations inside a rule. Twelve more rules have no consumer anywhere in `src/` or `electron/`. Tokenizing dead code is waste, so Task 3 deletes them.

---

## Global Constraints

Every task's requirements implicitly include this section.

- Git author must be `antoine.patalano@gmail.com`. Never commit to `main` or `river-labs`. The branch `ui/design-refresh` stays unmerged.
- All work happens in the worktree `/Users/antoine/river_compil/.worktrees/ui-design-refresh/gui`. **Never `cd` to the original repository root.**
- **Never edit `src/translations/*/global.json`.** This phase adds no copy.
- **Never use bare `git stash` / `git stash pop`.** The stash stack is shared with other worktrees. Prefer a temporary WIP commit.
- **Never run `git checkout -- <file>`** to undo an experiment. Undo with an editor.
- Contrast floors in `src/helpers/themeStateContrast.test.ts` **may never be lowered**, and no existing assertion may be weakened or deleted. *Replacing* a pinned literal with the token this phase moves it to (e.g. `font-size:\s*24px` → `font-size:\s*var\(--text-title\)`) is **not** weakening, and each task that does so names the test. Anything else is.
- The lint command is **`npm run lint`** exactly.
- **Baseline at the start of 6g** (measured 2026-10-01 against `cb9bfbe`): **74 suites / 823 tests passing**, `npx tsc --noEmit 2>&1 | grep -c "error TS"` → **68**, `npm run lint` → **20 problems (17 errors, 3 warnings)**. tsc was 64 at 6f's start. All four extra errors are `TS6305` "output file … has not been built from source" noise for 6f's new `electron/` files, not type errors, so 68 is the baseline. None may regress. Each task states its expected counts.
- **Commit trailers:** follow the project owner's standing rule, which is no `Co-Authored-By` line (`.claude/skills/river-git`). If the executing session's system prompt explicitly overrides that rule, follow the session and say so in the task report. Never copy a model name from this plan.
- This sandbox's `grep` is a `-G`-forced ugrep: no PCRE lookaheads, and `--include` behaves unlike GNU grep. Write verification searches as Node one-liners or use the scanner.
- **No `font-size` or `border-radius` value may change except as this plan's tables say.** If you find a site the tables don't cover, stop and report it. Don't pick a value yourself.

### Carried-over contracts from 6a–6f. Read before starting

1. **A guard can fail green.** Every sweep this plan adds has a canary asserting it still sees something known to be present, and every new guard is mutation-tested: read the real file, build the mutant as an in-memory string, run the logic against both. No disk writes and no restore step.
2. **No DOM in Jest.** Cascade, layout and media queries are invisible to the suite. Task 11's manual walkthrough is where visible changes are checked.
3. **A media query adds no specificity.** A rule inside `@media (prefers-reduced-motion: reduce)` has to win on its own selector or on `!important`. Task 10 uses `!important` on `*` and exempts spinners with class selectors that also carry `!important`.
4. **Stylesheet order.** `main.tsx` imports `App` (which pulls in `components.css`, `form.css`, `pages.css` …) *before* `./index.css`. At equal specificity, **`index.css` wins**. This is why `.tech-row`'s grid (index.css) beats the restored `.technique-row`'s flex (components.css) on Processing's rows. Do not reorder imports.

---

## Review Focus

These are the failure modes the spec implies but Jest cannot observe. Each one is pinned to the task that owns it, as a test or as an explicit walkthrough line in Task 11.

1. **A long discharge readout overflowing the Results panel.** `#result-number` grows 35.2px → 40px (`--text-display`). With Q = `12345.678 m³/s` at the 1150×700 minimum window, the number must stay on one line inside the panel, or wrap cleanly. It must not clip. → Task 11 walkthrough, step 3.
2. **Spinners that stop under reduced motion read as a hang.** Every `infinite` animation in `src/**/*.css` must be either exempted, so it keeps turning, or explicitly listed as decorative. → Task 10's `infinite animations are classified` test, plus a mutation test.
3. **Results' technique legend after `.technique-row` is restored.** The rows regain padding, gap and radius, which changes the legend's height and alignment. Processing's rows must **not** change, because `.tech-row` wins there. → Task 1 adds a test that pins the cascade order the protection depends on. Task 11 walkthrough, step 2.
4. **Longer locales at the larger title sizes.** `.step-2-title` grows 35 → 40px and `.browse-video-header p:first-child` 22.4 → 24px. In German and Russian these must not overflow or push the tiles below the 700px fold. → Task 11 walkthrough, step 4.
5. **The exported report changes in places nobody chose.** `report.css` is exempt, but `Report.tsx` inlines **every** stylesheet into `report.html`. The only intended changes are the three shared widgets named in G2. → Task 7 adds a test that the report's own components (`src/components/Report/*.tsx`) use no swept class directly. Task 11 walkthrough, step 5, exports a report and compares it with one from `cb9bfbe`. The only differences allowed are in the success banner, the colour bar and the graphs.

---

## File map

| File | Change |
|---|---|
| `src/helpers/cssScanner.ts` | **Create.** Pure scanner and scale classifiers (Task 1). |
| `src/helpers/cssScanner.test.ts` | **Create.** Unit tests for the scanner (Task 1). |
| `src/helpers/cssPreludes.test.ts` | **Create.** Whole-tree "no broken rule prelude" guard (Task 1). |
| `src/helpers/typeAndRadiusScale.test.ts` | **Create** (Task 2). The ratchet and exception registry, edited by Tasks 3–7. Task 8 adds the Outfit guard. |
| `src/helpers/inlineStyleScale.test.ts` | **Create** (Task 9). |
| `src/helpers/motion.ts`, `motion.test.ts`, `reducedMotion.test.ts` | **Create** (Task 10). |
| `src/index.css` | `--radius-xl` (Task 2), dead rules (Task 3), sweep (Task 4), Outfit (Task 8), motion block (Task 10). |
| `src/components/components.css` | Comment fix (Task 1), dead/duplicate rules (Task 3), sweep (Task 6), Outfit (Task 8). |
| `src/components/Forms/form.css`, `Messages/messages.css`, `CrossSections/crossSections.css` | Dead rules (Task 3), sweep (Task 5). |
| `src/components/Graphs/graphs.css`, `CustomIcons/piv-icons.css` | Dead rule (Task 3), sweep (Task 6). |
| `src/pages/pages.css` | Sweep (Task 7), Outfit (Task 8). |
| `src/components/Report/report.css` | Exemption header only (Task 7). |
| 7 `.tsx` files with inline sizes | Task 9. |
| 6 `.tsx` files + `VelocityVector.tsx` with smooth scroll / motion checks | Task 10. |
| `src/helpers/techniqueRowCss.test.ts`, `formTitleTypeScale.test.ts`, `scaleTokens.test.ts` | Pinned literals updated to tokens (Tasks 1, 2, 5, 6). |
| `docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md` | Amendment A15 (Task 2); outcome note (Task 11). |

---

### Task 1: CSS scanner, broken-prelude guard, and the `.technique-row` fix

**Files:**
- Create: `src/helpers/cssScanner.ts`
- Create: `src/helpers/cssScanner.test.ts`
- Create: `src/helpers/cssPreludes.test.ts`
- Modify: `src/components/components.css:1233-1238` (the comment only)
- Modify: `src/helpers/techniqueRowCss.test.ts`

**Interfaces:**
- Produces, for every later task:
  - `interface CssRule { prelude: string; line: number; index: number }`
  - `interface CssDeclaration { selector: string; rule: number; property: string; value: string; line: number; exception: string | null }`
  - `blankComments(text: string): string`
  - `scanCss(source: string): { rules: CssRule[]; declarations: CssDeclaration[] }`
  - `brokenPreludes(rules: CssRule[]): CssRule[]`
  - `isScaleFontSize(value: string): boolean`, `isScaleRadius(value: string): boolean`, `isScaleFontShorthand(value: string): boolean`
  - `isScaleProperty(property: string): boolean`, `isOnScale(d: CssDeclaration): boolean`, `hasValidException(d: CssDeclaration): boolean`, `scaleOffenders(ds: CssDeclaration[]): CssDeclaration[]`

- [ ] **Step 1: Write the scanner's unit tests**

Create `src/helpers/cssScanner.test.ts`:

```ts
import {
  blankComments,
  brokenPreludes,
  hasValidException,
  isScaleFontShorthand,
  isScaleFontSize,
  isScaleRadius,
  scaleOffenders,
  scanCss,
} from './cssScanner';

describe('blankComments', () => {
  it('blanks a comment without moving any character', () => {
    const source = 'a { color: red; } /* gone\nstill gone */ b { color: blue; }';
    const out = blankComments(source);
    expect(out.length).toBe(source.length);
    expect(out.split('\n').length).toBe(source.split('\n').length);
    expect(out).not.toContain('gone');
    expect(out).toContain('b { color: blue; }');
  });

  it('does not open a comment on /* inside a quoted string', () => {
    const out = blankComments('a { content: "/*"; } b { color: blue; }');
    expect(out).toContain('b { color: blue; }');
  });

  it('ends a comment at the first */, as a browser does', () => {
    expect(blankComments('/* x */ y */ .z {}')).toContain('y */ .z {}');
  });
});

describe('scanCss', () => {
  it('reads declarations with their selector, property, value and line', () => {
    const { declarations } = scanCss('.a {\n  font-size: 12px;\n  border-radius: 4px\n}');
    expect(declarations).toEqual([
      { selector: '.a', rule: 0, property: 'font-size', value: '12px', line: 2, exception: null },
      { selector: '.a', rule: 0, property: 'border-radius', value: '4px', line: 3, exception: null },
    ]);
  });

  it('collapses a selector list prettier wrapped over several lines', () => {
    const { declarations } = scanCss('.a,\n.b:hover\n{ font-size: 1px; }');
    expect(declarations[0].selector).toBe('.a, .b:hover');
  });

  it('gives a declaration inside @media its innermost rule', () => {
    const { rules, declarations } = scanCss('@media (x) {\n  .a { font-size: 1px; }\n}');
    expect(rules.map((r) => r.prelude)).toEqual(['@media (x)', '.a']);
    expect(declarations[0]).toMatchObject({ selector: '.a', rule: 1, line: 2 });
  });

  it('does not split a value on a ; inside parentheses', () => {
    const { declarations } = scanCss('.a { background: url(data:image/png;base64,AA); font-size: 1px; }');
    expect(declarations.map((d) => d.property)).toEqual(['background', 'font-size']);
  });

  it('captures a scale-exception comment on the declaration line', () => {
    const { declarations } = scanCss('.a {\n  font-size: 11px; /* scale-exception: chart axis text sized to the plot */\n}');
    expect(declarations[0].exception).toBe('chart axis text sized to the plot');
  });

  it('ignores a scale-exception comment on a different line', () => {
    const { declarations } = scanCss('.a {\n  /* scale-exception: three word reason */\n  font-size: 11px;\n}');
    expect(declarations[0].exception).toBeNull();
  });

  it('ignores a top-level @import statement', () => {
    const { rules, declarations } = scanCss("@import url('x.css');\n.a { font-size: 1px; }");
    expect(rules.map((r) => r.prelude)).toEqual(['.a']);
    expect(declarations).toHaveLength(1);
  });
});

describe('brokenPreludes', () => {
  it('finds a rule whose comment closed early and spilled into its selector', () => {
    // The exact shape of the components.css:1235 bug this task fixes.
    const source = '/* Results: .x/.technique-row-body*/.technique-eye-btn in\n   graphs.css; Processing: .y\n   ===== */\n.technique-row {\n  padding: 8px;\n}';
    const { rules } = scanCss(source);
    expect(brokenPreludes(rules).map((r) => r.line)).toEqual([1]);
  });

  it('passes ordinary selectors and at-rules', () => {
    const { rules } = scanCss('.a:not(.b) > c::after { x: y; }\n@media (max-width: 9px) { .d { x: y; } }');
    expect(brokenPreludes(rules)).toEqual([]);
  });
});

describe('scale classifiers', () => {
  it.each([
    ['var(--text-body)', true],
    ['var(--text-subtitle) !important', true],
    ['inherit', true],
    ['clamp(var(--text-meta), 1.5vw, var(--text-subtitle))', true],
    ['14px', false],
    ['1.2em', false],
    ['clamp(13px, 1.5vw, 20px)', false],
    ['var(--text-huge)', false],
  ])('font-size %s → %s', (value, expected) => {
    expect(isScaleFontSize(value)).toBe(expected);
  });

  it.each([
    ['var(--radius-xl)', true],
    ['50%', true],
    ['0', true],
    ['0 0 var(--radius-lg) var(--radius-lg)', true],
    ['inherit', true],
    ['20px', false],
    ['var(--border-radius)', false],
    ['0 0 13px 13px', false],
  ])('border-radius %s → %s', (value, expected) => {
    expect(isScaleRadius(value)).toBe(expected);
  });

  it.each([
    ['inherit', true],
    ['700 var(--text-section) / 1.2 var(--font-display)', true],
    ['700 18px/1.2 var(--font-display)', false],
    ['bold 1.2em Inter', false],
  ])('font %s → %s', (value, expected) => {
    expect(isScaleFontShorthand(value)).toBe(expected);
  });

  it('requires an exception reason of at least three words', () => {
    const [short] = scanCss('.a { font-size: 11px; /* scale-exception: chart */ }').declarations;
    const [long] = scanCss('.a { font-size: 11px; /* scale-exception: chart axis text */ }').declarations;
    expect(hasValidException(short)).toBe(false);
    expect(hasValidException(long)).toBe(true);
  });

  it('scaleOffenders returns only governed, off-scale, unexcused declarations', () => {
    const { declarations } = scanCss(
      [
        '.ok { font-size: var(--text-body); border-radius: var(--radius-md); color: red; }',
        '.bad { font-size: 15px; border-top-left-radius: 3px; }',
        '.excused { font-size: 11px; /* scale-exception: chart axis text */ }',
      ].join('\n'),
    );
    expect(scaleOffenders(declarations).map((d) => `${d.selector} ${d.property}`)).toEqual([
      '.bad font-size',
      '.bad border-top-left-radius',
    ]);
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx jest src/helpers/cssScanner.test.ts`
Expected: FAIL, `Cannot find module './cssScanner'`.

- [ ] **Step 3: Write the scanner**

Create `src/helpers/cssScanner.ts`:

```ts
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
```

- [ ] **Step 4: Run the unit tests**

Run: `npx jest src/helpers/cssScanner.test.ts`
Expected: PASS, 34 tests.

- [ ] **Step 5: Write the whole-tree prelude guard and watch it catch the live bug**

Create `src/helpers/cssPreludes.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { brokenPreludes, scanCss } from './cssScanner';

/**
 * No rule in any stylesheet may have comment text spilled into its selector.
 * Found in Phase 6g's planning: a `*\/` inside a comment's prose closed it
 * early at components.css:1235, and the browser dropped `.technique-row` for
 * two weeks while techniqueRowCss.test.ts, which regex-matched the raw text,
 * stayed green.
 */
const SRC = join(__dirname, '..');
const cssFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return cssFiles(full);
    return name.endsWith('.css') ? [full] : [];
  });
const files = cssFiles(SRC);

describe('CSS rule preludes', () => {
  it('sees every stylesheet and its rules (canary)', () => {
    expect(files.length).toBeGreaterThanOrEqual(9);
    const total = files.reduce((sum, file) => sum + scanCss(readFileSync(file, 'utf8')).rules.length, 0);
    expect(total).toBeGreaterThan(600);
  });

  it('has no rule whose selector swallowed comment text', () => {
    const broken = files.flatMap((file) =>
      brokenPreludes(scanCss(readFileSync(file, 'utf8')).rules).map((rule) => `${relative(SRC, file)}:${rule.line}`),
    );
    expect(broken).toEqual([]);
  });

  it('would catch the components.css bug if it came back (mutation)', () => {
    const real = readFileSync(join(SRC, 'components', 'components.css'), 'utf8');
    const mutant = real.replace('.media-container {', '/* a/.b*/.c in d.css; e */\n.media-container {');
    expect(mutant).not.toBe(real);
    // Relative to the real file, so this holds both before and after the fix below.
    expect(brokenPreludes(scanCss(mutant).rules).length).toBe(brokenPreludes(scanCss(real).rules).length + 1);
  });
});
```

Run: `npx jest src/helpers/cssPreludes.test.ts`
Expected: **FAIL** on `has no rule whose selector swallowed comment text`, with `["components/components.css:1235"]`. That failure is the live bug. Do not adjust the test.

- [ ] **Step 6: Fix the comment**

In `src/components/components.css`, the comment opening `TECHNIQUE ROW (shared shell …`. Replace the line

```
   .technique-disclosure-btn/.technique-row-body*/.technique-eye-btn in
```

with

```
   .technique-disclosure-btn, the .technique-row-body family, .technique-eye-btn in
```

Change nothing else in the file.

- [ ] **Step 7: Pin the rule as the browser sees it, and pin the cascade order Processing relies on**

In `src/helpers/techniqueRowCss.test.ts`, add `import { scanCss } from './cssScanner';` after the existing imports, then add these two tests inside the `describe('shared TechniqueRow CSS', …)` block, after the first `it`:

```ts
  it('.technique-row is a real rule the browser parses, not a regex match on raw text', () => {
    // The first test above stayed green while a stray */ in the preceding
    // comment made the browser drop this rule (Phase 6g, Task 1).
    const { rules } = scanCss(css);
    expect(rules.some((rule) => rule.prelude === '.technique-row')).toBe(true);
  });

  it("Processing's .tech-row grid outranks .technique-row's flex by stylesheet order", () => {
    // Equal specificity (0,1,0), so the later stylesheet wins. main.tsx imports
    // App (which pulls in components.css) before ./index.css, so index.css's
    // .tech-row { display: grid } wins on Processing's rows. Reordering those
    // imports would silently turn the 6c grid into a flex row.
    const main = readFileSync(join(__dirname, '..', 'main.tsx'), 'utf8');
    expect(main.indexOf("from './App'")).toBeGreaterThan(-1);
    expect(main.indexOf("from './App'")).toBeLessThan(main.indexOf("import './index.css'"));
    const index = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');
    expect(index).toMatch(/\.tech-row\s*\{[^}]*display:\s*grid/);
  });
```

- [ ] **Step 8: Run all three files, then the suite**

Run: `npx jest src/helpers/cssScanner.test.ts src/helpers/cssPreludes.test.ts src/helpers/techniqueRowCss.test.ts`
Expected: PASS.

Run: `npx jest 2>&1 | tail -4` → **76 suites / 862 tests** (823 + 34 + 3 + 2). `npx tsc --noEmit 2>&1 | grep -c "error TS"` → 68. `npm run lint` → 20 problems.

- [ ] **Step 9: Commit**

```bash
git add src/helpers/cssScanner.ts src/helpers/cssScanner.test.ts src/helpers/cssPreludes.test.ts src/helpers/techniqueRowCss.test.ts src/components/components.css
git commit -m "Task 1: Add the CSS scanner and restore the .technique-row rule a stray */ was dropping"
```

---

### Task 2: `--radius-xl`, the sweep ratchet, and spec amendment A15

**Files:**
- Modify: `src/index.css:8-12` (radius tokens)
- Modify: `src/helpers/scaleTokens.test.ts`
- Create: `src/helpers/typeAndRadiusScale.test.ts`
- Modify: `docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md` (§4/6g and §9)

**Interfaces:**
- Consumes: `scanCss`, `scaleOffenders`, `isScaleProperty`, `isOnScale`, `hasValidException` from Task 1.
- Produces: the `PENDING` and `EXCEPTIONS` constants in `typeAndRadiusScale.test.ts`, which Tasks 3–7 edit. The token `--radius-xl`.

- [ ] **Step 1: Add the token test first**

In `src/helpers/scaleTokens.test.ts`, inside the `describe.each([...])` table, add a row after `['--radius-lg', '12px'],`:

```ts
    ['--radius-xl', '20px'],
```

Run: `npx jest src/helpers/scaleTokens.test.ts`
Expected: FAIL on `--radius-xl is 20px` (received `undefined`).

- [ ] **Step 2: Add the token**

In `src/index.css`, in the bare `:root` block's `/* Radius */` group, change

```css
  --radius-lg:   12px;
  --radius-full: 999px;
```

to

```css
  --radius-lg:   12px;
  /* Phase 6g (spec A15, decision G1): this codebase's single most common
     radius, on panels, input fields, the media container and the drop areas.
     A step of its own keeps the sweep a token substitution, as --text-subtitle
     did for 20px type (A2). */
  --radius-xl:   20px;
  --radius-full: 999px;
```

Run: `npx jest src/helpers/scaleTokens.test.ts` → PASS.

- [ ] **Step 3: Write the ratchet test**

Create `src/helpers/typeAndRadiusScale.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { CssDeclaration, hasValidException, isOnScale, isScaleProperty, scaleOffenders, scanCss } from './cssScanner';

/**
 * Phase 6g (spec §4/6g, A15): every font-size, font shorthand and border
 * radius in src/**\/*.css is a scale token or a documented exception.
 *
 * PENDING is the ratchet. It holds the exact offender count each file still
 * owes. Each sweep task deletes its files' entries, and the last one deletes
 * the object. Counts are exact, not maximums, so a stale entry fails as loudly
 * as a new offender.
 *
 * EXCEPTIONS is the registry. A value that stays off-scale carries an inline
 * `/* scale-exception: <why, 3+ words> *\/` comment on its line *and* an entry
 * here, so every exception shows up in review as a diff to this file.
 */
const SRC = join(__dirname, '..');
const cssFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return cssFiles(full);
    return name.endsWith('.css') ? [full] : [];
  });
const rel = (file: string): string => relative(SRC, file).split('\\').join('/');

/** Whole files outside the sweep. Each must open with a `scale-exempt-file:` comment saying why. */
const EXEMPT_FILES = ['components/Report/report.css'];

const PENDING: Record<string, { font: number; radius: number }> = {
  'components/CrossSections/crossSections.css': { font: 1, radius: 0 },
  'components/CustomIcons/piv-icons.css': { font: 2, radius: 5 },
  'components/Forms/form.css': { font: 19, radius: 6 },
  'components/Graphs/graphs.css': { font: 7, radius: 5 },
  'components/Messages/messages.css': { font: 6, radius: 0 },
  'components/components.css': { font: 31, radius: 22 },
  'index.css': { font: 19, radius: 10 },
  'pages/pages.css': { font: 13, radius: 5 },
};

/** `file|selector|property: value` for every documented exception. */
const EXCEPTIONS: string[] = [];

const key = (file: string, d: CssDeclaration): string => `${file}|${d.selector}|${d.property}: ${d.value}`;

const scanned = cssFiles(SRC)
  .map((file) => ({ file: rel(file), source: readFileSync(file, 'utf8') }))
  .filter(({ file }) => !EXEMPT_FILES.includes(file))
  .map(({ file, source }) => ({ file, ...scanCss(source) }));

const tally = (offenders: CssDeclaration[]) => ({
  font: offenders.filter((d) => d.property.startsWith('font')).length,
  radius: offenders.filter((d) => !d.property.startsWith('font')).length,
});

describe('type and radius scale (Phase 6g)', () => {
  it('sees the stylesheets and the declarations it governs (canary)', () => {
    expect(scanned.length).toBeGreaterThanOrEqual(8);
    const governed = scanned.flatMap((s) => s.declarations.filter((d) => isScaleProperty(d.property)));
    expect(governed.length).toBeGreaterThan(150);
    const index = scanned.find((s) => s.file === 'index.css');
    expect(index?.declarations.some((d) => d.selector === '.btn' && d.property === 'font-size')).toBe(true);
    expect(index?.declarations.some((d) => d.selector === '.ibtn' && d.property === 'border-radius' && d.value === '50%')).toBe(true);
  });

  it.each(scanned.map((s) => [s.file, s] as const))('%s owes exactly its pending count', (file, s) => {
    const offenders = scaleOffenders(s.declarations);
    if (PENDING[file]) expect(tally(offenders)).toEqual(PENDING[file]);
    else expect(offenders.map((d) => `${d.line} ${d.selector} ${d.property}: ${d.value}`)).toEqual([]);
  });

  it('has no PENDING entry for a file it does not scan', () => {
    const files = scanned.map((s) => s.file);
    expect(Object.keys(PENDING).filter((file) => !files.includes(file))).toEqual([]);
  });

  it('lists every documented exception in EXCEPTIONS, and nothing else', () => {
    const found = scanned.flatMap((s) =>
      s.declarations.filter((d) => isScaleProperty(d.property) && !isOnScale(d) && hasValidException(d)).map((d) => key(s.file, d)),
    );
    expect([...found].sort()).toEqual([...EXCEPTIONS].sort());
  });

  it('has no stale exception comment on an on-scale value', () => {
    const stale = scanned.flatMap((s) =>
      s.declarations.filter((d) => d.exception !== null && (!isScaleProperty(d.property) || isOnScale(d))).map((d) => key(s.file, d)),
    );
    expect(stale).toEqual([]);
  });

  it.each(EXEMPT_FILES)('%s opens with a scale-exempt-file comment giving a reason', (file) => {
    const head = readFileSync(join(SRC, file), 'utf8').slice(0, 600);
    expect(head).toMatch(/\/\*[\s\S]*?scale-exempt-file:\s*\S+(\s+\S+){2,}[\s\S]*?\*\//);
  });

  describe('mutation: the sweep notices regressions in a real file', () => {
    const real = readFileSync(join(SRC, 'index.css'), 'utf8');
    const offendersIn = (source: string) => scaleOffenders(scanCss(source).declarations).map((d) => d.selector);

    it('a new raw font-size', () => {
      expect(offendersIn(`${real}\n.mutant-6g { font-size: 15px; }\n`)).toContain('.mutant-6g');
    });

    it('a raw radius on a selector list prettier wrapped', () => {
      expect(offendersIn(`${real}\n.mutant-a,\n.mutant-b {\n  border-radius: 10px;\n}\n`)).toContain('.mutant-a, .mutant-b');
    });

    it('a raw size hidden in a font shorthand', () => {
      expect(offendersIn(`${real}\n.mutant-6g { font: 700 18px/1.2 var(--font-display); }\n`)).toContain('.mutant-6g');
    });

    it('an exception whose reason is too short to explain anything', () => {
      expect(offendersIn(`${real}\n.mutant-6g { font-size: 11px; /* scale-exception: tiny */ }\n`)).toContain('.mutant-6g');
    });

    it('a rule a stray comment closer swallowed is still scanned, not skipped', () => {
      const mutant = `${real}\n/* a*/.b; c */\n.mutant-6g { font-size: 15px; }\n`;
      expect(scaleOffenders(scanCss(mutant).declarations).some((d) => d.selector.includes('.mutant-6g'))).toBe(true);
    });
  });
});
```

- [ ] **Step 4: Run it**

Run: `npx jest src/helpers/typeAndRadiusScale.test.ts`
Expected: **FAIL** on one test only: `components/Report/report.css opens with a scale-exempt-file comment` (Task 7 adds that header). Everything else passes, including all eight per-file counts.

**If any per-file count differs from `PENDING`, stop.** It means the tree changed since planning (2026-10-01, `cb9bfbe`) or the scanner disagrees with this plan's inventory. Report the actual numbers. Do not paste them in.

To keep the suite green until Task 7, mark only that one test as pending, with a comment pointing at its owner:

```ts
  // Task 7 adds report.css's exemption header; un-skip there.
  it.skip.each(EXEMPT_FILES)('%s opens with a scale-exempt-file comment giving a reason', (file) => {
```

Task 7 must remove `.skip`. Task 11's final check verifies there is no `.skip` left in this file.

- [ ] **Step 5: Record amendment A15 in the spec**

In `docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md`:

(a) At the end of §4/6g (after its **Done means** paragraph), add:

```markdown
> **Amended 2026-10-01 (A15)** — decided with the product owner while planning 6g. Read §9's A15 entry before the plan.
```

(b) At the very end of §9, append:

```markdown
### 2026-10-01 — 6g planning

Measured at `cb9bfbe` before planning: 44 distinct `font-size` values (98 off-scale declarations outside the report) and 26 distinct radii (53 off-scale), plus 27 in `report.css`. Four decisions were taken with the product owner, and two defects found while measuring are fixed inside 6g.

| # | Amendment | Evidence that prompted it |
|---|---|---|
| **A15** | (1) **`--radius-xl: 20px`** joins the radius scale (4/8/12/**20**/999), mirroring A2. (2) **`report.css` is exempt as a whole** under a `scale-exempt-file:` header. It is a printable document with its own em scale, and `Report.tsx` inlines every stylesheet into the exported `report.html`. (3) **The app-wide `prefers-reduced-motion` sweep A8 carried as debt is in 6g**: one global reduce block, with spinners exempted so they keep turning, plus a `scrollBehavior()` helper for the 19 JS smooth scrolls. (4) **Snap rule:** nearest step, exact ties go down (18→16, 13.5→13, 12.5→12, 15→14; radius 10→8, 6→4, 16→12). (5) Sizes below `--text-caption` grow to 12px, except chart, colour-bar and canvas-overlay text, which keep their size under a documented exception. (6) **Title- and display-sized rules use Outfit 700.** Outfit is bundled only at 700, so a lighter weight would silently render bold anyway. (7) **Two defects fixed in 6g:** the `.technique-row` rule, dropped by the browser since `fe40b46` because a `*/` inside its preceding comment closed the comment early; and a duplicate copy of the loader and info-icon rules in `components.css`, deleted along with 12 dead rules that carried off-scale values. | 20px was the single most common radius (25 sites) with no token, so collapsing it would have restyled every panel and input. The motion debt had no other owner left in Phase 6. The `.technique-row` bug was invisible to `techniqueRowCss.test.ts`, which regex-matched the raw text. A scanner that parses as the browser does found it on its first run. |
```

- [ ] **Step 6: Run the suite and commit**

`npx jest 2>&1 | tail -4` → **77 suites / 880 tests passed, 1 skipped** (862 + 1 token row + 17 new, plus the 1 skipped). tsc 68. lint 20. Verified at planning time: run against the untouched tree, the new file reports exactly the expected per-file counts and fails only on the report header.

```bash
git add src/index.css src/helpers/scaleTokens.test.ts src/helpers/typeAndRadiusScale.test.ts docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md
git commit -m "Task 2: Add --radius-xl, the type and radius ratchet, and spec amendment A15"
```

---

### Task 3: Delete dead and duplicate rules that carry off-scale values

Every rule below has **no consumer** in `src/` or `electron/`. This was verified at planning time by a substring search of every `.ts`/`.tsx`/`.html` file, which also catches template-literal class names such as `` `loader-${size}` ``. Re-verify each before deleting it.

**Files:**
- Modify: `src/components/CrossSections/crossSections.css`, `src/components/Forms/form.css`, `src/components/components.css`, `src/index.css`, `src/components/CustomIcons/piv-icons.css`
- Modify: `src/helpers/typeAndRadiusScale.test.ts` (`PENDING`)

- [ ] **Step 1: Re-verify the dead classes**

Run:

```bash
node -e '
const fs=require("fs"),p=require("path");
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p.join(d,e.name)):/\.(tsx?|html|js)$/.test(e.name)&&!e.name.includes(".test.")?[p.join(d,e.name)]:[]);
const files=[...walk("src"),...walk("electron"),"index.html"].filter(fs.existsSync);
for(const n of ["input-section","read-only-oblique","apply-changes","technique-always","theme-toggle","carousel-input","img-water-mark-ipcam","colorbar-label","input-field-little-read-only","theme-segment","className=\"card"]){
  const hits=files.filter(f=>fs.readFileSync(f,"utf8").includes(n));
  console.log(n.padEnd(30), hits.length ? hits.join(" ") : "none");
}'
```

Expected: every line ends in `none`. `colorbar-label` covers both `#colorbar-label` and `.colorbar-labels`, and `theme-segment` covers the whole family. **If any line shows a hit, stop and report it.** That rule is live, and this plan's counts are wrong.

- [ ] **Step 2: Delete the rules**

Delete each rule completely, from its selector through its closing `}` and the blank line after it. Where a selector sits inside a selector *list*, remove only that selector and its trailing comma.

| File | Delete |
|---|---|
| `crossSections.css` | `.input-section{ … }` (line 1) |
| `form.css` | `.read-only-oblique { … }` · `#apply-changes { … }` and `#apply-changes:hover { … }` · `.technique-always { … }` |
| `components.css` | `.theme-toggle { … }` (line 1) · `.carousel-input { … }` · `.img-water-mark-ipcam { … }` · `#colorbar-label { … }` · `.colorbar-labels { … }` |
| `components.css` | **The duplicate loader/info block**: everything from `.loader-container-mid {` (line ~295) through the end of `.info-gif { … }` (line ~428). That covers `.loader-container-mid`, `.loader-wrapper-mid`, `.loader-mid`, `.loader-percentage-mid`, both `@keyframes spin` copies, the four `-big` loader rules, `.loader-complete-big`, `.loader-remaining-time`, the `/* * PROVISIONAL */` comment, `.info-icon`, `.info-icon:hover`, `.info-animation`, `.info-gif`. Stop before `.carousel-resize-handle {`. |
| `index.css` | `.input-field-little-read-only { … }` · `.input-field-little-read-only:focus { … }` · the selector `.input-field-little-read-only:focus-visible` from the `:focus-visible` list (remove the comma on the line above it, so `.input-field-read-only:focus-visible {` ends the list) · the whole `THEME SEGMENTED CONTROL` section: its banner comment, `.theme-segmented-control`, `.theme-segment-btn`, `.theme-segment-btn + .theme-segment-btn`, `.theme-segment-btn:hover`, `.theme-segment-btn--active`, `.theme-segment-btn--active:hover`, `.theme-segment-icon`, `.theme-segment-label` |
| `piv-icons.css` | `.card { … }` |

Before deleting the duplicate block, confirm it really is a duplicate. Diff it against `index.css`'s `LOADERS` section and its `.info-icon … .info-gif` rules. The only differences allowed are the dead duplicate declarations: `.loader-complete-big`'s first `border:` line, `.info-icon:hover`'s `scaleX` line, and `.info-animation`'s `position: relative` line. **If any other value differs, stop and report it.** Copy nothing across.

Leave `.btn-lock*` in `form.css` alone. It is also dead, but it carries no off-scale value, so it is outside this sweep.

- [ ] **Step 3: Update the ratchet**

In `typeAndRadiusScale.test.ts`, delete the `crossSections.css` line from `PENDING` and change four entries:

```ts
  'components/CustomIcons/piv-icons.css': { font: 2, radius: 4 },
  'components/Forms/form.css': { font: 15, radius: 5 },
  'components/components.css': { font: 22, radius: 21 },
  'index.css': { font: 16, radius: 8 },
```

- [ ] **Step 4: Verify and commit**

Run: `npx jest src/helpers/typeAndRadiusScale.test.ts src/helpers/cssRules.test.ts src/helpers/cssPreludes.test.ts` → PASS. `cssRules.test.ts` checks that every input class which drops its `:focus` outline still has a `:focus-visible` ring. Deleting both halves for `.input-field-little-read-only` keeps it satisfied.

`npx jest 2>&1 | tail -4` → 77 suites / 880 passed, 1 skipped. tsc 68. lint 20.

```bash
git add -A src/
git commit -m "Task 3: Delete dead and duplicate rules that carried off-scale sizes"
```

---

### Task 4: Sweep `index.css`

**Files:**
- Modify: `src/index.css`
- Modify: `src/helpers/typeAndRadiusScale.test.ts` (`PENDING`, `EXCEPTIONS`)

Apply exactly this table. "Was" is the current value; find each by selector.

| Selector | Property | Was | Becomes |
|---|---|---|---|
| `html` | font-size | 16px | `16px; /* scale-exception: root size that every rem in the app resolves against */` |
| `.btn` | font-size | 14px | `var(--text-body)` |
| `.btn-lg` | font-size | 16px | `var(--text-section)` |
| `.btn-sm` | font-size | 13px | `var(--text-meta)` |
| `.input-field` | font-size / radius | 20px / 20px | `var(--text-subtitle)` / `var(--radius-xl)` |
| `.input-field-oblique` | font-size / radius | 20px / 20px | `var(--text-subtitle)` / `var(--radius-xl)` |
| `.input-field-little` | font-size / radius | 20px / 15px | `var(--text-subtitle)` / `var(--radius-lg)` |
| `.input-field-read-only` | font-size / radius | 20px / 20px | `var(--text-subtitle)` / `var(--radius-xl)` |
| `.field-row > span:first-child` | font-size | 14px | `var(--text-body)` |
| `.field` | font-size | 14px | `var(--text-body)` |
| `.slider` | radius | 28px | `var(--radius-full)` (it is 28px tall, so already a pill) |
| `.loader-percentage-mid` | font-size | 1.2em (19.2px) | `var(--text-subtitle)` |
| `.loader-percentage-big` | font-size | 1.8em (28.8px) | `var(--text-title)` |
| `.loader-remaining-time` | font-size | 1.6em !important (25.6px) | `var(--text-title) !important` (keep `!important`; it beats the generic `p` styling the loader's text uses) |
| `.analize-stage-breadcrumb` | font-size | 0.85em (13.6px) | `var(--text-body)` |
| `.stepper-caption` | font-size | 12px | `var(--text-caption)` |
| `::-webkit-scrollbar-thumb` | radius | 8px | `var(--radius-md)` |
| `.info-icon` | font-size | 30px | `30px; /* scale-exception: a "?" glyph sized as an icon, not as text */` |
| `.info-gif` | radius | 5px | `var(--radius-sm)` |
| `.velocity-readout` | radius | 5px | `var(--radius-sm)` |

The em values were resolved against a 16px parent. No ancestor of the loader or the breadcrumb sets a font-size, and `html` is 16px.

The exception comment goes on the **same line** as the declaration, after the `;`. The scanner only reads that line.

- [ ] **Step 1: Apply the table.**
- [ ] **Step 2: Update the ratchet.** Delete `'index.css'` from `PENDING`. Set `EXCEPTIONS` to:

```ts
const EXCEPTIONS: string[] = [
  'index.css|html|font-size: 16px',
  'index.css|.info-icon|font-size: 30px',
];
```

- [ ] **Step 3: Verify.** `npx jest src/helpers/typeAndRadiusScale.test.ts src/helpers/buttonAndFieldTokens.test.ts src/helpers/chipSegPrimitives.test.ts src/helpers/scaleTokens.test.ts` → PASS. Then `npx jest 2>&1 | tail -4` → 77 suites / 880 passed, 1 skipped. tsc 68. lint 20.
- [ ] **Step 4: Commit.**

```bash
git add src/index.css src/helpers/typeAndRadiusScale.test.ts
git commit -m "Task 4: Put index.css's sizes and radii on the scale"
```

---

### Task 5: Sweep `form.css` and `messages.css`

**Files:**
- Modify: `src/components/Forms/form.css`, `src/components/Messages/messages.css`
- Modify: `src/helpers/formTitleTypeScale.test.ts`, `src/helpers/typeAndRadiusScale.test.ts`

**`form.css`**

| Selector | Property | Was | Becomes |
|---|---|---|---|
| `.form-title` | font-size | 24px | `var(--text-title)` |
| `.form-container` | radius | 1rem (16px, a tie) | `var(--radius-lg)` |
| `.read-only` | radius | 20px | `var(--radius-xl)` |
| `.read-only` | font-size | clamp(13px, 1.5vw, 20px) | `clamp(var(--text-meta), 1.5vw, var(--text-subtitle))` (same bounds) |
| `.form-video-extra-info-row` | font-size | clamp(0.85rem, 2.5vw, 1.2rem) | `clamp(var(--text-body), 2.5vw, var(--text-subtitle))` (13.6→14, 19.2→20) |
| `#result-info #result-number` | font-size | 2.2rem (35.2px) | `var(--text-display)` (see Review Focus 1) |
| `.switch-container` | radius | 20px | `var(--radius-xl)` |
| `.advanced-mode-label` | font-size | 13px | `var(--text-meta)` |
| `.btn-step` | font-size | 16px | `var(--text-section)` |
| `.simple-input-container label` | font-size | 20px | `var(--text-subtitle)` |
| `.simple-input-container input` | font-size / radius | 1.1em (17.6px) / 20px | `var(--text-section)` / `var(--radius-xl)` |
| `.last-settings-form-field-radio label` | font-size | 18px | `var(--text-section)` |
| `.analizing-output p` | font-size | 1.2rem (19.2px) | `var(--text-subtitle)` |
| `.drop-here-text` | font-size | 1.15rem (18.4px) | `var(--text-subtitle)` |
| `.zone-title` | font-size | 13px | `var(--text-meta)` |
| `.pill-alpha-label` | font-size | 18px | `var(--text-section)` |
| `.technique-row-processing .field-title` | font-size | 1.17em (18.7px) | `var(--text-section)`. **The one deliberate deviation from G4**, which would give 20px. This is a control label in the same `TechniqueRow` shell whose Results counterpart, `.technique-name`, is 16px. Update the rule's existing comment: replace its last sentence ("The explicit font-size replaces the 1.17em an <h3> got for free.") with "The explicit font-size replaces the 1.17em an <h3> got for free, at --text-section to match .technique-name in the same row shell on Results (Phase 6g)." |
| `.technique-seed-flag` | font-size / radius | 11px / 8px | `var(--text-caption)` (grows to 12) / `var(--radius-md)` |

**`messages.css`**

| Selector | Property | Was | Becomes |
|---|---|---|---|
| `.mode-hint` | font-size | 13px | `var(--text-meta)` |
| `.field-error` | font-size | 12.5px (tie) | `var(--text-caption)` |
| `.step-alert` | font-size | 13.5px (tie) | `var(--text-meta)` |
| `.toast` | font-size | 13.5px (tie) | `var(--text-meta)` |
| `.dialog b` | font-size | 16px | `var(--text-section)` |
| `.dialog p` | font-size | 13px | `var(--text-meta)` |

- [ ] **Step 1: Update the pinned literal first.** In `src/helpers/formTitleTypeScale.test.ts`, rename the test `'.form-title uses the display font at 24px/700'` to `'.form-title uses the display font at --text-title/700'`, and change `expect(match![1]).toMatch(/font-size:\s*24px/);` to `expect(match![1]).toMatch(/font-size:\s*var\(--text-title\)/);`. Run `npx jest src/helpers/formTitleTypeScale.test.ts` → FAIL (still 24px).
- [ ] **Step 2: Apply both tables.**
- [ ] **Step 3: Update the ratchet.** Delete the `form.css` and `messages.css` entries from `PENDING`.
- [ ] **Step 4: Verify.** `npx jest src/helpers/typeAndRadiusScale.test.ts src/helpers/formTitleTypeScale.test.ts src/helpers/canvasChrome.test.ts` → PASS. Then `npx jest 2>&1 | tail -4` → 77 suites / 880 passed, 1 skipped. tsc 68. lint 20.
- [ ] **Step 5: Commit.**

```bash
git add src/components/Forms/form.css src/components/Messages/messages.css src/helpers/formTitleTypeScale.test.ts src/helpers/typeAndRadiusScale.test.ts
git commit -m "Task 5: Put form and message sizes and radii on the scale"
```

---

### Task 6: Sweep `components.css`, `graphs.css` and `piv-icons.css`

**Files:**
- Modify: `src/components/components.css`, `src/components/Graphs/graphs.css`, `src/components/CustomIcons/piv-icons.css`
- Modify: `src/helpers/techniqueRowCss.test.ts`, `src/helpers/typeAndRadiusScale.test.ts`

**`components.css`**

| Selector | Property | Was | Becomes |
|---|---|---|---|
| `#version-message` | font-size | 13px | `var(--text-meta)` |
| `#source-offer` | font-size | 12px | `var(--text-caption)` |
| `.language-selector-select` | font-size | 18px | `var(--text-section)` |
| `.media-container` | radius | 20px | `var(--radius-xl)` |
| `.video-player-time` | font-size | 20px | `var(--text-subtitle)` |
| `#background-track`, `#buffered-track`, `#progress-track` | radius | var(--border-radius) (2px) | `var(--radius-sm)`, then **delete** the `--border-radius: 2px;` declaration (line ~165), which has no other reader |
| `#time` | font-size / radius | 18px / 5px | `var(--text-section)` / `var(--radius-sm)` |
| `.carousel-resize-handle::after` | radius | 2px | `var(--radius-full)` (a 3px-tall grip, so already fully round) |
| `.carousel-info input` | font-size / radius | 1.5rem (24px) / 20px | `var(--text-title)` / `var(--radius-xl)` |
| `.carousel-info p` | font-size | 1.5rem | `var(--text-title)` |
| `.img-carousel` | radius | 20px | `var(--radius-xl)` |
| `.img-water-mark` | font-size | 11px | `11px; /* scale-exception: frame badge over a thumbnail, kept small so it does not cover the frame */` (`carouselFrameBadge.test.ts` pins 11px; leave it) |
| `.img-water-mark` | radius | 999px | `var(--radius-full)` |
| `.colorbar-container` | radius | 15px | `var(--radius-lg)` |
| `.colorbar-container button` | font-size / radius | 20px / 8px | `var(--text-subtitle)` / `var(--radius-md)` |
| `.colorbar` | radius | 10px (tie) | `var(--radius-md)` |
| `.colorbar-marker span` | font-size | 10.5px | `10.5px; /* scale-exception: colour-bar tick label drawn against the bar, not panel text */` |
| `.colorbar-marker span` | radius | 4px | `var(--radius-sm)` |
| `.colorbar-input` | radius / font-size | 8px / 18px | `var(--radius-md)` / `var(--text-section)` |
| `.colorbar-unit-label` | font-size | 12px | `var(--text-caption)` |
| `.colorbar-manual-badge` | font-size | 10.5px | `10.5px; /* scale-exception: colour-bar badge sized to sit inside the bar */` |
| `.colorbar-manual-badge` | radius | 4px | `var(--radius-sm)` |
| `.grid-container` | radius | 10px (tie) | `var(--radius-md)` |
| `.centered-cell` | font-size | 0.85rem (13.6px) | `var(--text-body)` |
| `.header-subtech` | font-size | 0.65rem (10.4px) | `var(--text-caption)` (grows to 12) |
| `.grid .rdg-header-row` | font-size | 0.8rem (12.8px) | `var(--text-meta)` (`rdg-header-row` is react-data-grid's own class, so it is live) |
| `.success-banner` | radius | 20px | `var(--radius-xl)` |
| `.success-banner-title` | font-size | 1.4rem (22.4px) | `var(--text-title)` |
| `.sti-frame` | radius | 6px (tie) | `var(--radius-sm)` |
| `.sti-empty` | font-size | 13px | `var(--text-meta)` |
| `.sti-angle-reset` | radius / font-size | 3px / 12px | `var(--radius-sm)` / `var(--text-caption)` |
| `.iwave-axis` | font-size | 11px | `11px; /* scale-exception: chart axis text sized to the spectrum plot */` |
| `.iwave-legend` | font-size | 11px | `11px; /* scale-exception: chart legend text sized to the spectrum plot */` |
| `.technique-row` | radius | 9px | `var(--radius-md)` |
| `.technique-swatch.technique-swatch-stiv` | radius | 2px | `2px; /* scale-exception: swatch shape is the technique marker, circle versus rounded square versus square */` |
| `.carousel-frame-pair-caption` | font-size | 12px | `var(--text-caption)` |

**`graphs.css`**

| Selector | Property | Was | Becomes |
|---|---|---|---|
| `.technique-name` | font-size | 16px | `var(--text-section)` |
| `.technique-name:focus-visible` | radius | 4px | `var(--radius-sm)` |
| `.technique-row-total` | font-size | 13px | `var(--text-meta)` |
| `.technique-disclosure-btn` | radius | 8px | `var(--radius-md)` |
| `.technique-row-body-toggle` | font-size / radius | 12px / 8px | `var(--text-caption)` / `var(--radius-md)` |
| `.technique-eye-btn` | radius | 8px | `var(--radius-md)` |
| `.station-tag` | radius / font-size | 12px / 12px | `var(--radius-lg)` / `var(--text-caption)` |
| `.station-tag-header b` | font-size | 13.5px (tie) | `var(--text-meta)` |
| `.station-tag-row span` | font-size | 11px | `11px; /* scale-exception: dense readout in a tag over the canvas, growing it covers the vectors */` |
| `.station-tag-hint` | font-size | 10.5px | `10.5px; /* scale-exception: dense hint in a tag over the canvas, growing it covers the vectors */` |

**`piv-icons.css`**

| Selector | Property | Was | Becomes |
|---|---|---|---|
| `.progbar` | radius | 0 0 13px 13px | `0 0 var(--radius-lg) var(--radius-lg)` |
| `.ldrop` | radius | 13px | `var(--radius-lg)` |
| `.litem` | radius / font-size | 9px / 13px | `var(--radius-md)` / `var(--text-meta)` |
| `.pill` | font-size / radius | 10px / 20px | `var(--text-caption)` (grows to 12) / `var(--radius-full)` (about 18px tall, so already a pill) |

- [ ] **Step 1: Update the pinned literal first.** In `src/helpers/techniqueRowCss.test.ts`, change `expect(body).toMatch(/border-radius:\s*9px/);` to `expect(body).toMatch(/border-radius:\s*var\(--radius-md\)/);`. Leave the swatch's `2px` and `50%` assertions as they are. Run it → FAIL.
- [ ] **Step 2: Apply all three tables.**
- [ ] **Step 3: Update the ratchet.** Delete the `components.css`, `graphs.css` and `piv-icons.css` entries from `PENDING`. Append to `EXCEPTIONS`:

```ts
  'components/components.css|.img-water-mark|font-size: 11px',
  'components/components.css|.colorbar-marker span|font-size: 10.5px',
  'components/components.css|.colorbar-manual-badge|font-size: 10.5px',
  'components/components.css|.iwave-axis|font-size: 11px',
  'components/components.css|.iwave-legend|font-size: 11px',
  'components/components.css|.technique-swatch.technique-swatch-stiv|border-radius: 2px',
  'components/Graphs/graphs.css|.station-tag-row span|font-size: 11px',
  'components/Graphs/graphs.css|.station-tag-hint|font-size: 10.5px',
```

- [ ] **Step 4: Verify.** `npx jest src/helpers/typeAndRadiusScale.test.ts src/helpers/techniqueRowCss.test.ts src/helpers/carouselFrameBadge.test.ts src/helpers/carouselFramePairCaption.test.ts src/helpers/rowIconButtons.test.ts src/helpers/listPrimitiveAdoption.test.ts` → PASS. Then `npx jest 2>&1 | tail -4` → 77 suites / 880 passed, 1 skipped. tsc 68. lint 20.
- [ ] **Step 5: Commit.**

```bash
git add src/components/components.css src/components/Graphs/graphs.css src/components/CustomIcons/piv-icons.css src/helpers/techniqueRowCss.test.ts src/helpers/typeAndRadiusScale.test.ts
git commit -m "Task 6: Put shared component, graph and icon sizes and radii on the scale"
```

---

### Task 7: Sweep `pages.css`, exempt `report.css`, retire the ratchet

**Files:**
- Modify: `src/pages/pages.css`, `src/components/Report/report.css` (header comment only)
- Modify: `src/helpers/typeAndRadiusScale.test.ts`

**`pages.css`**

| Selector | Property | Was | Becomes |
|---|---|---|---|
| `.step-2-title` | font-size | 35px | `var(--text-display)` (see Review Focus 4) |
| `.file-name` | font-size / radius | 1.3rem (20.8px) / 5px | `var(--text-subtitle)` / `var(--radius-sm)` |
| `.footage-button-container` | radius | 20px | `var(--radius-xl)` |
| `.footage-type-name` | font-size | 16px | `var(--text-section)` |
| `.footage-type-description` | font-size | 13px | `var(--text-meta)` |
| `.browse-video-header p:first-child` | font-size | 1.4rem (22.4px) | `var(--text-title)` |
| `.browse-video-drop-area` | radius | 20px | `var(--radius-xl)` |
| `.browse-video-drop-area p` | font-size | 1.15rem (18.4px) | `var(--text-subtitle)` |
| `.cal-canvas` | radius | 8px | `var(--radius-md)` |
| `.cal-canvas-placeholder` | font-size | 0.85rem (13.6px) | `var(--text-body)` |
| `.cal-strip-unused-tag` | font-size | 10px | `var(--text-caption)` (grows to 12; it is words, "Not used", not a number badge) |
| `.cal-section-title` | font-size | clamp(0.85rem, 2.5vw, 1.2rem) | `clamp(var(--text-body), 2.5vw, var(--text-subtitle))` |
| `.cal-combo-list` | radius | 20px | `var(--radius-xl)` |
| `.cal-combo-list li` | font-size | 15px (tie) | `var(--text-body)` |
| `.lens-row-label`, `.lens-row-trigger` | font-size | 16px | `var(--text-section)` |
| `.lens-row-chevron` | font-size | 14px | `var(--text-body)` |

**`report.css`**: add this as the file's first lines. Change nothing else.

```css
/* scale-exempt-file: the report is a printable document with its own em-based
   type scale, and Report.tsx inlines every stylesheet into the exported
   report.html, so moving these values would change every report users export.
   Exempt as a whole under Phase 6g decision G2 (spec A15). */
```

- [ ] **Step 1: Pin Review Focus 5.** The report's own components must not use any app class this phase swept. Add this `describe` to the end of `typeAndRadiusScale.test.ts`:

```ts
describe("the report's own components are insulated from the sweep (G2)", () => {
  // Report.tsx inlines every stylesheet into report.html. report.css is exempt,
  // but if a Report/*.tsx component used a swept app class, the export would
  // change anyway. The three shared widgets the report embeds (SuccessBanner,
  // ImageResults, AllInOne) follow the app on purpose (G2) and live outside
  // this directory, so they are not checked here.
  const reportDir = join(SRC, 'components', 'Report');
  const reportSources = readdirSync(reportDir)
    .filter((name) => name.endsWith('.tsx'))
    .map((name) => readFileSync(join(reportDir, name), 'utf8'))
    .join('\n');
  const sweptClasses = scanned
    .flatMap((s) => s.declarations.filter((d) => isScaleProperty(d.property)).map((d) => d.selector))
    .flatMap((selector) => [...selector.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));

  it('reads the report components (canary)', () => {
    expect(reportSources).toMatch(/className=/);
    expect(sweptClasses).toContain('btn');
  });

  it('uses no class whose size or radius this phase swept', () => {
    const used = new Set([...reportSources.matchAll(/className=["{`']([^"}`']+)/g)].flatMap((m) => m[1].split(/\s+/)));
    expect([...new Set(sweptClasses)].filter((cls) => used.has(cls)).sort()).toEqual([]);
  });
});
```

Run it → PASS. At planning time the report's components used only `report-*`, `header-title-text`, `image-border-radius`, `success-banner-link` and Bootstrap spacing classes, none of them swept. **If the second test lists classes, stop and report them.** Each one is an unintended change to exported reports.

- [ ] **Step 2: Apply the `pages.css` table and add the `report.css` header.**
- [ ] **Step 3: Retire the ratchet.** In `typeAndRadiusScale.test.ts`:
  - delete the `PENDING` object and its doc paragraph,
  - delete the test `has no PENDING entry for a file it does not scan`,
  - replace the per-file test with:

```ts
  it.each(scanned.map((s) => [s.file, s] as const))('%s has no off-scale value without a documented exception', (_file, s) => {
    expect(scaleOffenders(s.declarations).map((d) => `${d.line} ${d.selector} ${d.property}: ${d.value}`)).toEqual([]);
  });
```

  - remove `.skip` from the `EXEMPT_FILES` test and delete the `// Task 7 adds …` comment above it.

- [ ] **Step 4: Verify.** `npx jest src/helpers/typeAndRadiusScale.test.ts src/helpers/footageTileContent.test.ts src/helpers/calibrationLayout.test.ts src/helpers/homeRecentsLayout.test.ts src/helpers/reportTitleTypeScale.test.ts` → PASS. `npx jest 2>&1 | tail -4` → **77 suites / 882 tests**, none skipped (880 − 1 deleted test + 1 un-skipped + 2 report tests). tsc 68. lint 20.
- [ ] **Step 5: Commit.**

```bash
git add src/pages/pages.css src/components/Report/report.css src/helpers/typeAndRadiusScale.test.ts
git commit -m "Task 7: Put page sizes and radii on the scale and exempt the report stylesheet"
```

---

### Task 8: Outfit 700 on every title- and display-sized rule (D3)

**Files:**
- Modify: `src/index.css`, `src/components/components.css`, `src/pages/pages.css`
- Modify: `src/helpers/typeAndRadiusScale.test.ts`

**Interfaces:**
- Consumes: `CssDeclaration.rule` from Task 1, to group declarations by the rule they share.

Outfit is bundled only at weight 700 (`main.tsx` imports `@fontsource/outfit/700.css`). Asking for Outfit at 500 or 600 silently renders the 700 face. So the guard requires weight 700 explicitly, and each change below is a deliberate, visible weight change.

| Rule (file) | Add / change |
|---|---|
| `.loader-percentage-big` (index.css) | add `font-family: var(--font-display);`. Change `font-weight: bold` → `font-weight: 700` |
| `.loader-remaining-time` (index.css) | add `font-family: var(--font-display);`. **`font-weight: 500` → `700`** (visible) |
| `.carousel-info input`, `.carousel-info p` (components.css) | add `font-family: var(--font-display); font-weight: 700;` (**visible**: the frame counter turns bold) |
| `.success-banner-title` (components.css) | add `font-family: var(--font-display);`. Set `font-weight: 700` (replace any existing weight) |
| `.step-2-title` (pages.css) | add `font-family: var(--font-display); font-weight: 700;` |
| `.browse-video-header p:first-child` (pages.css) | add `font-family: var(--font-display);`. **`font-weight: 600` → `700`** (visible) |

`.form-title` and `#result-info #result-number` already comply.

- [ ] **Step 1: Write the guard.** Append to `typeAndRadiusScale.test.ts`:

```ts
describe('title and display sizes use Outfit 700 (D3)', () => {
  const LARGE = /var\(--text-(title|display)\)/;
  const largeSizes = (declarations: CssDeclaration[]) =>
    declarations.filter((d) => d.property === 'font-size' && LARGE.test(d.value));
  /** Title/display-sized rules missing the display font or weight 700, as `file|selector`. */
  const titleOffenders = (file: string, declarations: CssDeclaration[]): string[] =>
    largeSizes(declarations)
      .filter((size) => {
        const body = declarations.filter((d) => d.rule === size.rule);
        const hasFont = body.some((d) => d.property === 'font-family' && d.value === 'var(--font-display)');
        const hasWeight = body.some((d) => d.property === 'font-weight' && d.value === '700');
        return !hasFont || !hasWeight;
      })
      .map((d) => `${file}|${d.selector}`);

  it('finds the title-sized rules (canary)', () => {
    const selectors = scanned.flatMap((s) => largeSizes(s.declarations).map((d) => d.selector));
    expect(selectors).toEqual(expect.arrayContaining(['.form-title', '#result-info #result-number']));
  });

  it('every one declares the display font at weight 700', () => {
    expect(scanned.flatMap((s) => titleOffenders(s.file, s.declarations))).toEqual([]);
  });

  it.each([
    ['left on Inter', '.mutant-6g { font-size: var(--text-title); font-weight: 700; }'],
    ['in Outfit at a weight that is not bundled', '.mutant-6g { font-size: var(--text-display); font-family: var(--font-display); font-weight: 600; }'],
  ])('would catch a title-sized rule %s (mutation)', (_label, rule) => {
    const real = readFileSync(join(SRC, 'index.css'), 'utf8');
    expect(titleOffenders('index.css', scanCss(`${real}\n${rule}\n`).declarations)).toContain('index.css|.mutant-6g');
  });
});
```

Run it → FAIL, listing the seven rules in the table above.

- [ ] **Step 2: Apply the table.** Run the file → PASS.
- [ ] **Step 3: Verify.** `npx jest 2>&1 | tail -4` → 77 suites / **886 tests** (882 + canary + guard + 2 mutations). tsc 68. lint 20.
- [ ] **Step 4: Commit.**

```bash
git add src/index.css src/components/components.css src/pages/pages.css src/helpers/typeAndRadiusScale.test.ts
git commit -m "Task 8: Set every title- and display-sized rule in Outfit 700"
```

---

### Task 9: Inline style sizes and radii in TSX

The spec's **Done means** covers CSS only, but seven style objects in `.tsx` carry literal sizes and radii, and leaving them would reintroduce the drift through a side door. Konva canvas text (`fontSize={…}` JSX props in `LineAndText.tsx` and `StabilizationCanvas.tsx`) is sized against image pixels and is **out of scope**. So is `useAutoShrinkFont` (it computes sizes at runtime) and `Report/Header.tsx`'s computed `titleFontSize` (report, G2).

**Files:**
- Modify: `src/components/Forms/Components/LensCorrection.tsx:105`, `src/components/CustomIcons/Info.tsx:17,23`, `src/components/Forms/Components/ExportMp4.tsx:120`, `src/components/Forms/FormResults.tsx:124`, `src/components/ThemeToggle.tsx:37,50`, `src/components/CustomIcons/LanguageSelector.tsx:83`, `src/components/FloatingPlot.tsx:84`, `src/components/CustomIcons/ConfirmMaskBtn.tsx:24`
- Create: `src/helpers/inlineStyleScale.test.ts`

| Site | Was | Becomes | Why |
|---|---|---|---|
| `LensCorrection.tsx:105` | `fontSize: '14px'` | `fontSize: 'var(--text-body)'` | |
| `Info.tsx:17`, `:23` | `fontSize: 12` | `fontSize: 'var(--text-caption)'` | |
| `ExportMp4.tsx:120` | `fontSize: '0.85em'` | `fontSize: 'var(--text-caption)'` | parent `.litem` is now 13px, so 0.85em = 11px, below the scale |
| `FormResults.tsx:124` | `fontSize: '0.45em'` | `fontSize: 'var(--text-section)'` | the unit beside the 40px Q readout; 0.45em would be 18px |
| `ThemeToggle.tsx:37`, `:50`; `LanguageSelector.tsx:83` | `fontSize: 17` | `fontSize: 'var(--text-section)'` | emoji glyphs; 17 → 16 |
| `FloatingPlot.tsx:84` | `borderRadius: '10px'` | `borderRadius: 'var(--radius-md)'` | tie → down |
| `ConfirmMaskBtn.tsx:24` | `borderRadius: '8px'` | `borderRadius: 'var(--radius-md)'` | |

`Carousel.tsx`'s `borderRadius: '50%'` (circles) stays.

- [ ] **Step 1: Write the guard.**

Create `src/helpers/inlineStyleScale.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

/**
 * Phase 6g: style objects in .tsx use the scale tokens too. Only `fontSize:` /
 * `borderRadius:` object keys are checked. Konva's `fontSize={…}` JSX props
 * size canvas text against image pixels and are out of scope.
 */
const SRC = join(__dirname, '..');
const tsxFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return tsxFiles(full);
    return name.endsWith('.tsx') && !name.includes('.test.') ? [full] : [];
  });

const LITERAL = /\b(fontSize|borderRadius):\s*(['"`]?)(-?\d[\w.%]*)\2/g;
const ALLOWED = new Set(["borderRadius: '50%'"]);

const offendersIn = (source: string): string[] =>
  [...source.matchAll(LITERAL)].map((m) => m[0]).filter((hit) => !ALLOWED.has(hit));

describe('inline style sizes and radii (Phase 6g)', () => {
  const files = tsxFiles(SRC).map((file) => ({ file: relative(SRC, file), source: readFileSync(file, 'utf8') }));

  it('scans the components and sees a known allowed literal (canary)', () => {
    expect(files.length).toBeGreaterThan(100);
    const carousel = files.find((f) => f.file.endsWith('Carousel.tsx'))!;
    expect([...carousel.source.matchAll(LITERAL)].map((m) => m[0])).toContain("borderRadius: '50%'");
  });

  it('has no literal fontSize or borderRadius in a style object', () => {
    expect(files.flatMap(({ file, source }) => offendersIn(source).map((hit) => `${file}: ${hit}`))).toEqual([]);
  });

  it.each([["fontSize: 17"], ["fontSize: '0.85em'"], ["borderRadius: '10px'"], ['fontSize: "14px"']])(
    'would catch %s (mutation)',
    (literal) => {
      expect(offendersIn(`<span style={{ ${literal} }} />`)).toEqual([literal]);
    },
  );
});
```

Run it → FAIL, listing exactly the 10 sites in the table.

- [ ] **Step 2: Apply the table.** Run → PASS.
- [ ] **Step 3: Verify.** `npx jest 2>&1 | tail -4` → **78 suites / 892 tests**. tsc 68. lint 20.
- [ ] **Step 4: Commit.**

```bash
git add src/components src/helpers/inlineStyleScale.test.ts
git commit -m "Task 9: Put inline style sizes and radii on the scale"
```

---

### Task 10: Honour `prefers-reduced-motion` app-wide (A8's debt)

**Files:**
- Create: `src/helpers/motion.ts`, `src/helpers/motion.test.ts`, `src/helpers/reducedMotion.test.ts`
- Modify: `src/index.css` (append one block at the end of the file; update the 6b comment at line ~710)
- Modify: `src/components/Forms/FormReport.tsx`, `src/components/Forms/Components/HardModeUav.tsx`, `src/components/Forms/Components/LensCorrection.tsx`, `src/components/CrossSections/Sections.tsx`, `src/components/Calibration/CalibrationStrip.tsx`, `src/components/CustomIcons/LockBtn.tsx`, `src/components/Graphs/VelocityVector.tsx`

**Interfaces:**
- Produces: `prefersReducedMotion(win?: Pick<Window, 'matchMedia'>): boolean`, `scrollBehavior(win?: Pick<Window, 'matchMedia'>): ScrollBehavior`.

The approach is one global block, not a per-rule sweep. All 148 transition/animation/transform declarations are covered at once by `*` with `!important`, and durations go to `0.01ms` rather than `0` so `transitionend`/`animationend` still fire. Nothing listens for them today, but zero would be a trap for the first thing that does. `:active` transforms stay, because with no transition they become an instant state change, not motion. **Spinners are exempt.** A frozen spinner reads as a hang, so they keep turning, slower.

CSS's `scroll-behavior` cannot override a JS `scrollIntoView({ behavior: 'smooth' })`, because the option wins. So the 19 JS call sites go through a helper.

- [ ] **Step 1: Write the helper's tests.**

Create `src/helpers/motion.test.ts`:

```ts
import { prefersReducedMotion, scrollBehavior } from './motion';

const fakeWindow = (reduce: boolean) => ({
  matchMedia: (query: string) => ({ matches: reduce && query === '(prefers-reduced-motion: reduce)' }) as MediaQueryList,
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
```

Run: `npx jest src/helpers/motion.test.ts` → FAIL (module not found).

- [ ] **Step 2: Write the helper.**

Create `src/helpers/motion.ts`:

```ts
/**
 * The OS "reduce motion" setting, for motion CSS cannot reach: a JS
 * `scrollIntoView({ behavior })` option overrides the stylesheet's
 * scroll-behavior, so those calls ask here instead (Phase 6g, spec A15).
 */
const browserWindow = (): Pick<Window, 'matchMedia'> | undefined => (typeof window === 'undefined' ? undefined : window);

export const prefersReducedMotion = (win: Pick<Window, 'matchMedia'> | undefined = browserWindow()): boolean =>
  !!win && typeof win.matchMedia === 'function' && win.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const scrollBehavior = (win: Pick<Window, 'matchMedia'> | undefined = browserWindow()): ScrollBehavior =>
  prefersReducedMotion(win) ? 'auto' : 'smooth';
```

Run → PASS (4 tests).

- [ ] **Step 3: Write the stylesheet and call-site guards.**

Create `src/helpers/reducedMotion.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { scanCss } from './cssScanner';

/**
 * Phase 6g (A8's debt, spec A15): the app honours prefers-reduced-motion.
 * One global block stops transitions and animations; spinners are exempt so
 * a long run never looks frozen; JS smooth scrolls ask scrollBehavior().
 */
const SRC = join(__dirname, '..');
const walk = (dir: string, ext: RegExp): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full, ext);
    return ext.test(name) && !name.includes('.test.') ? [full] : [];
  });

/** Spinners: keep turning under reduced motion. Must match the exemption rule in index.css exactly. */
const SPINNERS = ['.loader-little', '.loader-mid', '.loader-big', '.spin'];
/** Decorative infinite animations that may stop after one cycle. */
const DECORATIVE = ['.pulse'];

const index = readFileSync(join(SRC, 'index.css'), 'utf8');

const infiniteSelectors = (source: string): string[] =>
  scanCss(source)
    .declarations.filter((d) => /^animation(-iteration-count)?$/.test(d.property) && /\binfinite\b/.test(d.value))
    .map((d) => d.selector);

describe('reduced motion: stylesheet', () => {
  const { rules, declarations } = scanCss(index);
  // The global block is appended at the end of index.css, so it is the last
  // reduce-motion @media rule, and the rules it contains come after it.
  const reduceBlock = rules.filter((r) => /^@media\s*\(prefers-reduced-motion:\s*reduce\)$/.test(r.prelude)).pop();
  /** Body of the last rule with this exact prelude, provided it sits after the last reduce block opens. */
  const ruleBody = (prelude: string) => {
    const rule = rules.filter((r) => r.prelude === prelude).pop();
    if (!reduceBlock || !rule || rule.index < reduceBlock.index) return [];
    return declarations.filter((d) => d.rule === rule.index);
  };

  it('stops every transition and animation on every element', () => {
    const body = ruleBody('*, *::before, *::after');
    const value = (p: string) => body.find((d) => d.property === p)?.value;
    expect(value('animation-duration')).toBe('0.01ms !important');
    expect(value('animation-iteration-count')).toBe('1 !important');
    expect(value('transition-duration')).toBe('0.01ms !important');
    expect(value('scroll-behavior')).toBe('auto !important');
  });

  it('lets spinners keep turning, with !important so they beat the * rule', () => {
    const body = ruleBody(SPINNERS.join(', '));
    expect(body.find((d) => d.property === 'animation-iteration-count')?.value).toBe('infinite !important');
    expect(body.find((d) => d.property === 'animation-duration')?.value).toMatch(/!important$/);
  });

  it('classifies every infinite animation in the app as a spinner or decorative', () => {
    const all = walk(SRC, /\.css$/).flatMap((file) =>
      infiniteSelectors(readFileSync(file, 'utf8')).map((selector) => ({ file: relative(SRC, file), selector })),
    );
    expect(all.length).toBeGreaterThanOrEqual(4); // canary: the loaders and .spin/.pulse exist
    const unclassified = all.filter(({ selector }) => {
      if (selector === SPINNERS.join(', ')) return false; // the exemption rule itself
      return !selector.split(/\s*,\s*/).every((s) => SPINNERS.includes(s) || DECORATIVE.includes(s));
    });
    expect(unclassified).toEqual([]);
  });

  it('would catch a new infinite animation nobody classified (mutation)', () => {
    const mutant = `${index}\n.mutant-6g { animation: spin 1s linear infinite; }\n`;
    expect(infiniteSelectors(mutant)).toContain('.mutant-6g');
    expect(SPINNERS.includes('.mutant-6g') || DECORATIVE.includes('.mutant-6g')).toBe(false);
  });
});

describe('reduced motion: JS smooth scrolling', () => {
  const sources = walk(SRC, /\.tsx?$/).map((file) => ({ file: relative(SRC, file), source: readFileSync(file, 'utf8') }));
  const SMOOTH = /behavior:\s*['"]smooth['"]/;

  it('routes every scroll through scrollBehavior() (canary: the calls exist)', () => {
    const calls = sources.reduce((n, { source }) => n + (source.match(/behavior:\s*scrollBehavior\(\)/g) ?? []).length, 0);
    expect(calls).toBeGreaterThanOrEqual(19);
  });

  it("has no hard-coded behavior: 'smooth'", () => {
    expect(sources.filter(({ source }) => SMOOTH.test(source)).map((s) => s.file)).toEqual([]);
  });

  it("would catch a new hard-coded 'smooth' (mutation)", () => {
    expect(SMOOTH.test("el.scrollIntoView({ behavior: 'smooth' })")).toBe(true);
  });
});
```

Run → FAIL (no reduce block for `*`, 19 hard-coded scrolls).

- [ ] **Step 4: Add the CSS block.** Append to the **end** of `src/index.css`:

```css
/* =============================================================================
   REDUCED MOTION — Phase 6g (A8's debt, spec A15)
   One global opt-out instead of a per-rule sweep: every transition and
   animation in the app finishes at once when the OS asks for less motion.
   0.01ms, not 0, so transitionend/animationend still fire for any code that
   waits on them. :active transforms stay, since with no transition they are
   an instant state change rather than motion. A media query adds no
   specificity, so everything here is !important; the spinner exemption
   wins over `*` on specificity within !important.
   ============================================================================= */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* A frozen spinner reads as a hang. Spinners keep turning, at half speed or
     slower. .loader-complete-big's `animation: none` still wins, because only
     the duration and count are set here, never the animation's name. */
  .loader-little, .loader-mid, .loader-big, .spin {
    animation-duration: 3s !important;
    animation-iteration-count: infinite !important;
  }
}
```

Then update the 6b comment above the existing `@media (prefers-reduced-motion: reduce)` block (the one starting "The one motion opt-out in the codebase"). Replace its second paragraph ("Scoped to this animation on purpose … Recorded as branch debt.") with:

```
   The app-wide opt-out at the end of this file (Phase 6g) now covers every
   other transition and animation. This block stays because it removes the
   wiggle outright rather than shortening it to one 0.01ms cycle.
```

- [ ] **Step 5: Route the JS motion through the helper.**
  - In each of the six files with `behavior: 'smooth'` (19 occurrences: `LockBtn.tsx` ×10, `Sections.tsx` ×4, `LensCorrection.tsx` ×2, `FormReport.tsx`, `HardModeUav.tsx`, `CalibrationStrip.tsx`), replace `behavior: 'smooth'` with `behavior: scrollBehavior()`, and add the import:
    - `src/components/Forms/FormReport.tsx`, `src/components/CrossSections/Sections.tsx`, `src/components/Calibration/CalibrationStrip.tsx`, `src/components/CustomIcons/LockBtn.tsx` → `import { scrollBehavior } from '../../helpers/motion';`
    - `src/components/Forms/Components/HardModeUav.tsx`, `src/components/Forms/Components/LensCorrection.tsx` → `import { scrollBehavior } from '../../../helpers/motion';`
  - In `VelocityVector.tsx`, replace

    ```ts
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animated = !isReport && !prefersReducedMotion;
    ```

    with `const animated = !isReport && !prefersReducedMotion();` and import `prefersReducedMotion` from `'../../helpers/motion'`.

- [ ] **Step 6: Verify.** `npx jest src/helpers/motion.test.ts src/helpers/reducedMotion.test.ts src/helpers/buttonAndFieldTokens.test.ts` → PASS. `npx jest 2>&1 | tail -4` → **80 suites / 902 tests** (892 + 3 + 7). tsc 68. lint 20.
- [ ] **Step 7: Commit.**

```bash
git add src/index.css src/helpers/motion.ts src/helpers/motion.test.ts src/helpers/reducedMotion.test.ts src/components
git commit -m "Task 10: Honour prefers-reduced-motion across the app, keeping spinners turning"
```

---

### Task 11: Final verification, three-theme walkthrough, records

- [ ] **Step 1: Full suite, tsc, lint.** `npx jest 2>&1 | tail -4` → 80 suites / 902 tests, **0 skipped**. `npx tsc --noEmit 2>&1 | grep -c "error TS"` → 68. `npm run lint` → 20 problems (17 errors, 3 warnings).

- [ ] **Step 2: Confirm the guards are live, not skipped.**

```bash
node -e 'const s=require("fs").readFileSync("src/helpers/typeAndRadiusScale.test.ts","utf8"); if(/\.skip|PENDING/.test(s)) { console.error("skip or PENDING left"); process.exit(1) } console.log("ok")'
```

Expected: `ok`.

- [ ] **Step 3: Read the outcome off the guards.** No new measurement is needed. A green `typeAndRadiusScale.test.ts` *is* the measurement: 0 off-scale declarations outside `report.css`, and exactly the 10 entries in `EXCEPTIONS`. Run `npx jest src/helpers/typeAndRadiusScale.test.ts --verbose 2>&1 | grep -c "✓"` and note the number in Step 5's record, so a later reader can see the guard ran rather than just compiled.

- [ ] **Step 4: Three-theme walkthrough — by the product owner, in the Electron app.** Launch with the project's usual dev command. For **each of dark, light and dracula**, check:

  1. **Every wizard screen, start to finish.** Nothing clips, overlaps or wraps differently from before except the listed visible changes: (a) the step-2 title and the browse-video heading in Outfit 700 at 40/24px; (b) the frame counter in the carousel info row in Outfit 700; (c) the loader's percentage and remaining time in Outfit 700, the remaining time now bold; (d) the success banner title in Outfit; (e) Processing's technique names 18.7 → 16px; (f) small text grown to 12px: the Median pill, the grid's sub-technique header, the "Not used" calibration tag, `.pill` labels; (g) a dozen 13.5/12.5/18/15px texts shifted by 0.5–2px; (h) the right panel's corner radius 16 → 12px.
  2. **Results' technique legend** (Review Focus 3). Rows now have padding, a 10px gap and rounded hover. Then Processing's technique rows, which must look **exactly as before** (the grid columns of 6c's D8 still align).
  3. **Results' discharge readout** (Review Focus 1). Load or fake a result with Q ≥ 10000, at the 1150×700 minimum window. The 40px number must not clip.
  4. **German and Russian** (Review Focus 4): Footage mode (step 2) and the browse-video screen at 1150×700. The titles must not overflow, and the tiles must stay above the fold.
  5. **Export a report** (Review Focus 5) and compare it against a report exported from `cb9bfbe` for the same project. Apart from data, the only differences allowed are in the three shared widgets G2 names: the success banner title (Outfit, 24px), the colour bar (box radius 12px, input text 16px), and the graphs. Anything else is a defect.
  6. **macOS → System Settings → Accessibility → Display → Reduce motion ON.** Hovers and toggles change instantly, with no slide or fade. Section/lock-button auto-scrolls jump instead of gliding. **Every spinner still turns.** The Results velocity chevrons are static. Turn the setting off again and confirm motion returns.

  Record the outcome in the task report. If any check fails, stop and report it. Don't fix it inside this task.

- [ ] **Step 5: Record the outcome.** Append to the A15 row's section in the spec (§9, "2026-10-01 — 6g planning") a short **Outcome** paragraph covering: the commit range; final counts (off-scale declarations 151 → 0 outside the report, with 10 named exceptions); the `.technique-row` restoration; and the walkthrough result.

- [ ] **Step 6: Commit.**

```bash
git add docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md
git commit -m "Spec: Record Phase 6g's outcome"
```
