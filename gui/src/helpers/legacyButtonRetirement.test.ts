import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Phase 6b retired four legacy button families and the legacy .ib icon button.
 * This is a sweep, not an enumeration: it walks the tree so a file added by a
 * later sub-plan is covered without anyone remembering to list it. 6a shipped
 * an enumerated guard that missed two rules for exactly that reason.
 *
 * If a later phase deliberately reintroduces one of these names, delete its
 * entry here in the same commit and say why - do not weaken the sweep.
 */
const SRC = join(__dirname, '..');

const walk = (dir: string, extensions: string[]): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full, extensions);
    return extensions.some((extension) => entry.endsWith(extension)) ? [full] : [];
  });

const relative = (path: string): string => path.slice(SRC.length + 1);

/**
 * Blanks out block comments while preserving every newline, so line numbers
 * in the offenders() report stay accurate. Without this, src/index.css's own
 * prose explaining what replaced `.button-1`/`.wizard-button`/`.danger-button`
 * (it names them so a reader can find the new rule) trips the sweep - the
 * brief this test was written from did not strip comments and failed on the
 * committed, correct tree for exactly that reason. Only block comments
 * (`/* ... *\/`) are handled; this project's `.ts`/`.tsx` files do not rely on
 * `//` line comments to explain retired class names anywhere today, and
 * stripping `//` safely would require distinguishing it from string/URL
 * content, which a source-text sweep cannot do reliably.
 */
const stripBlockComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));

const offenders = (extensions: string[], pattern: RegExp): string[] =>
  walk(SRC, extensions)
    .filter((file) => !file.endsWith('legacyButtonRetirement.test.ts'))
    .flatMap((file) => {
      const lines = stripBlockComments(readFileSync(file, 'utf8')).split('\n');
      return lines.flatMap((line, index) => (pattern.test(line) ? [`${relative(file)}:${index + 1}`] : []));
    });

/**
 * Extracts every `className=` attribute's value from a TSX file, structurally:
 * from the `=` to the matching closing quote (`"`/`'`) or the matching closing
 * `}` (brace-depth counted), never assuming the value sits on one physical
 * line. A plain per-line regex that requires `className=` and the class token
 * on the same line (as the original draft of the .btn/.ibtn floor tests did)
 * would stop matching the moment a long `clsx(...)` call or template literal
 * wrapped across lines - the JSX-attribute counterpart of the CSS-selector
 * wrap bug that silently dropped `.ibtn-danger:hover` coverage earlier in this
 * phase. No call site wraps like that today, but the sweep should not depend
 * on that staying true.
 */
interface ClassNameUse {
  readonly value: string;
  readonly line: number;
}

const balancedBraceValue = (content: string, openBraceIndex: number): { value: string; end: number } => {
  let depth = 0;
  let index = openBraceIndex;
  for (; index < content.length; index += 1) {
    if (content[index] === '{') depth += 1;
    else if (content[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        index += 1;
        break;
      }
    }
  }
  return { value: content.slice(openBraceIndex + 1, index - 1), end: index };
};

const classNameUses = (content: string): ClassNameUse[] => {
  const uses: ClassNameUse[] = [];
  const pattern = /className=/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content))) {
    const start = match.index + match[0].length;
    const opener = content[start];
    let value: string;
    let nextIndex: number;
    if (opener === '"' || opener === "'") {
      const close = content.indexOf(opener, start + 1);
      if (close === -1) continue;
      value = content.slice(start + 1, close);
      nextIndex = close + 1;
    } else if (opener === '{') {
      const result = balancedBraceValue(content, start);
      value = result.value;
      nextIndex = result.end;
    } else {
      continue;
    }
    uses.push({ value, line: content.slice(0, match.index).split('\n').length });
    pattern.lastIndex = nextIndex;
  }
  return uses;
};

const classNameOffenders = (pattern: RegExp): string[] =>
  walk(SRC, ['.tsx'])
    .filter((file) => !file.endsWith('legacyButtonRetirement.test.ts'))
    .flatMap((file) =>
      classNameUses(readFileSync(file, 'utf8'))
        .filter((use) => pattern.test(use.value))
        .map((use) => `${relative(file)}:${use.line}`)
    );

describe('retired button classes stay retired', () => {
  // The four legacy families. `button-with-loader` is deliberately absent:
  // spec section 4/6b keeps it as a modifier alongside .btn.
  const RETIRED = ['wizard-button', 'button-1', 'danger-button', 'button-transparent', 'label-1'];

  it.each(RETIRED)('%s appears nowhere in src', (name) => {
    // Word-boundary both sides so `button-10` or `my-button-1x` would not
    // match, and neither would a longer class that merely contains the name.
    expect(offenders(['.tsx', '.ts', '.css'], new RegExp(`\\b${name}\\b(?!-)`))).toEqual([]);
  });

  it('no TSX className applies the legacy .ib icon-button class', () => {
    // `ib` as a standalone class token, excluding the `ibtn`/`ibtn-sm` family.
    // Structural (see classNameOffenders), not `className=[^>]*` on one line.
    expect(classNameOffenders(/\bib\b(?!tn)/)).toEqual([]);
  });

  it('no stylesheet still declares an .ib rule', () => {
    expect(offenders(['.css'], /^\s*\.ib\b(?!tn)/)).toEqual([]);
  });
});

describe('the .btn and .ibtn families are actually adopted', () => {
  // The counter-test: the sweep above passes trivially on an empty tree, so
  // assert the migration's positive outcome too. Numbers are floors, not
  // equalities, so 6c-6g adding call sites does not fail this.
  it('the .btn family has the call sites 6b migrated', () => {
    const count = walk(SRC, ['.tsx'])
      .filter((file) => !file.endsWith('legacyButtonRetirement.test.ts'))
      .flatMap((file) => classNameUses(readFileSync(file, 'utf8')))
      .filter((use) => /\bbtn\b/.test(use.value)).length;
    expect(count).toBeGreaterThanOrEqual(30);
  });

  it('the .ibtn family has the call sites 6b migrated', () => {
    const count = walk(SRC, ['.tsx'])
      .filter((file) => !file.endsWith('legacyButtonRetirement.test.ts'))
      .flatMap((file) => classNameUses(readFileSync(file, 'utf8')))
      .filter((use) => /\bibtn\b/.test(use.value)).length;
    expect(count).toBeGreaterThanOrEqual(14);
  });
});

/**
 * Controller ruling from the Tasks 7-9 review (postdates the written brief):
 * FormResults.tsx's interpolate-toggle button carries `aria-disabled` instead
 * of `disabled`, because Chromium dispatches no pointer events - and
 * therefore no `title` tooltip - on a natively disabled control, and this
 * button must explain *why* it is unavailable. But `aria-disabled` is
 * advisory only: without an early return in the click handler the control is
 * fully live and merely looks dead. The guard exists
 * (`if (!hasGaps) return;` in handleInterpolateToggle) but nothing tested it,
 * and the attribute and the guard must keep reading the same expression or
 * the pair is worse than neither.
 *
 * What this sweep does:
 *  - finds every `aria-disabled={EXPR}` attribute on a JSX element that also
 *    carries an `onClick={...}` attribute, structurally (brace-balanced, not
 *    line-based, for the same reason classNameUses is structural above);
 *  - resolves the click handler, either inline (`onClick={() => ...}`, whose
 *    text IS the body to search) or by name (`onClick={handleFoo}`, looked up
 *    as `const handleFoo = (...) => { ... }` or `function handleFoo(...) {}`
 *    in the same file);
 *  - requires the handler's body to contain an `if (...) return` whose
 *    condition mentions the same base identifier as the aria-disabled
 *    expression (e.g. both mention `hasGaps`).
 *
 * What it deliberately does NOT catch (documented, not hidden):
 *  - it checks the guard's condition shares the aria-disabled expression's
 *    base identifier, not full semantic equivalence - `if (hasGaps === false)
 *    return` and `if (!hasGaps || debugForceEnabled) return` would both count
 *    as "the same expression" here even though the second is weaker;
 *  - it does not check the early return is the FIRST statement, only that one
 *    exists mentioning that identifier;
 *  - a tag is matched by scanning for the next unescaped `>` at brace-depth 0
 *    that isn't `=>`; a JSX element whose other attributes themselves contain
 *    a bare `<`/`>` (e.g. a numeric comparison inline) would be misread. No
 *    call site does that today;
 *  - if the click handler can't be resolved at all (destructured, imported,
 *    a class method, etc.) the element is skipped rather than failed, so an
 *    unusual style doesn't produce a false failure unrelated to the real
 *    invariant.
 * None of this is airtight for arbitrary code, and it doesn't need to be: the
 * bar is that removing the real guard from FormResults.tsx makes a test fail,
 * which the mutation check in the task report confirms.
 */
describe('an aria-disabled button always pairs with an early-return guard', () => {
  const findTagEnd = (content: string, tagStart: number): number => {
    let depth = 0;
    for (let index = tagStart; index < content.length; index += 1) {
      const character = content[index];
      if (character === '{') depth += 1;
      else if (character === '}') depth -= 1;
      else if (character === '>' && depth === 0 && content[index - 1] !== '=') return index;
    }
    return -1;
  };

  const baseIdentifier = (expr: string): string | null => expr.match(/[A-Za-z_$][\w$]*/)?.[0] ?? null;

  const resolveHandlerBody = (content: string, onClickValue: string): string | null => {
    const trimmed = onClickValue.trim();
    const isBareIdentifier = /^[A-Za-z_$][\w$]*$/.test(trimmed);
    if (!isBareIdentifier) return trimmed; // inline handler: the expression IS the body

    const arrowDef = content.match(
      new RegExp(`\\bconst\\s+${trimmed}\\s*=\\s*\\([^)]*\\)\\s*(?::[^=]+)?=>\\s*\\{`)
    );
    if (arrowDef) return balancedBraceValue(content, arrowDef.index! + arrowDef[0].length - 1).value;

    const functionDef = content.match(new RegExp(`\\bfunction\\s+${trimmed}\\s*\\([^)]*\\)\\s*(?::[^{]+)?\\{`));
    if (functionDef) return balancedBraceValue(content, functionDef.index! + functionDef[0].length - 1).value;

    return null; // unresolvable with this style; skip rather than false-fail
  };

  interface Pairing {
    readonly file: string;
    readonly ariaExpr: string;
    readonly ok: boolean | null; // null = could not be verified (handler unresolved)
  }

  const pairings = (): Pairing[] =>
    walk(SRC, ['.tsx'])
      .filter((file) => !file.endsWith('legacyButtonRetirement.test.ts'))
      .flatMap((file) => {
        const content = readFileSync(file, 'utf8');
        const results: Pairing[] = [];
        const pattern = /aria-disabled=\{/g;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(content))) {
          const exprStart = match.index + 'aria-disabled='.length;
          const { value: ariaExpr, end: exprEnd } = balancedBraceValue(content, exprStart);
          pattern.lastIndex = exprEnd;

          const tagStart = content.lastIndexOf('<', match.index);
          const tagEnd = findTagEnd(content, tagStart);
          if (tagStart === -1 || tagEnd === -1) continue;
          const tagText = content.slice(tagStart, tagEnd + 1);

          const onClickIndex = tagText.indexOf('onClick={');
          if (onClickIndex === -1) continue; // no click handler on this element: nothing to guard
          const { value: onClickValue } = balancedBraceValue(tagText, onClickIndex + 'onClick='.length);

          const body = resolveHandlerBody(content, onClickValue);
          if (body === null) {
            results.push({ file: relative(file), ariaExpr, ok: null });
            continue;
          }
          const ident = baseIdentifier(ariaExpr);
          const hasGuard =
            ident !== null && new RegExp(`if\\s*\\([^)]*\\b${ident}\\b[^)]*\\)\\s*return\\b`).test(body);
          results.push({ file: relative(file), ariaExpr, ok: hasGuard });
        }
        return results;
      });

  it('every resolvable aria-disabled + onClick pairing has a matching early-return guard', () => {
    const failures = pairings().filter((pairing) => pairing.ok === false);
    expect(failures).toEqual([]);
  });

  // A sweep that finds nothing proves nothing. This pins down that the
  // FormResults.tsx case is actually being exercised, so if it is ever
  // rewritten in a style this sweep can't parse, that shows up as 0 here
  // rather than as a silently-passing, empty check.
  it('actually verified at least one aria-disabled/guard pairing', () => {
    const verified = pairings().filter((pairing) => pairing.ok !== null);
    expect(verified.length).toBeGreaterThanOrEqual(1);
  });
});
