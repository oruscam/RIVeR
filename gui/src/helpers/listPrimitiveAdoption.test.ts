import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Tasks 3-5 (phase 6c) replaced the mask list's bespoke row markup with
 * MaskList.tsx's `.list-row`, the region list's with RegionList.tsx's own
 * `.list-row`, and the cross-section tab strip's `.section`/`.section-*`
 * button family with Sections.tsx's `.chip`. This sweeps for both halves of
 * that migration: the retired classes gone, the new primitive actually used.
 *
 * The plan's File Structure section has a stale one-line summary naming three
 * OTHER classes (`.technique-seed-flag`, `.technique-eye-btn`,
 * `.technique-disclosure-btn`) as also-deleted. That line is aspirational
 * shorthand Task 7's own detailed steps never actually instructed - Task 7 is
 * already committed and reviewed against a narrower, correct scope:
 *  - `.technique-seed-flag` still has a live, correct consumer
 *    (FormProcessing.tsx's Median button - Task 7's own binding ruling kept
 *    Median out of scope for replacement);
 *  - `.technique-eye-btn`/`.technique-disclosure-btn` still have live,
 *    correct consumers (TechniqueLegend.tsx - Task 7's Files list only asked
 *    for an aria-disabled fix there, never a class replacement).
 * Asserting those three "appear nowhere" would assert something false about
 * already-shipped, correct code, so they are deliberately absent below.
 *
 * `.switch-container` and `.field-title` are also deliberately absent: both
 * are shared utility classes still used extensively elsewhere in the app
 * (FormProcessing.tsx, StabilizationRegions.tsx, LensCorrection.tsx,
 * LspivSettings.tsx, TechniqueRow.tsx, FramesResolution.tsx), unrelated
 * to the mask/region/section migration. Sweeping them would be a false
 * positive against legitimate, unrelated code, not a guard.
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
 * className extractor, structurally identical in shape to
 * legacyButtonRetirement.test.ts's `classNameUses`/`balancedBraceValue`
 * (duplicated rather than imported so this file stays a standalone unit -
 * see that file for the canonical version and its own tests against it).
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

/**
 * Exact whitespace-delimited token match, NOT the `\bname\b(?!-)` substring
 * match legacyButtonRetirement.test.ts uses for its (longer, more
 * distinctive) retired button names. That matters here specifically:
 * `.section` is a short, common suffix that appears as part of many
 * unrelated, live, legitimate compound class names in this codebase -
 * `lens-correction-section`, `summary-last-section` - and `\bsection\b` matches inside every one of
 * them (`\b` only requires a word/non-word transition, and `-` counts as
 * non-word, so it matches immediately after any hyphen). A first draft of
 * this sweep using that pattern reported those as false-positive
 * offenders against code this task never touched. Splitting the class-list
 * string on whitespace and comparing each token for exact equality avoids
 * that: `lens-correction-section` is one token, not two, and it is not equal
 * to `section`.
 */
const hasClassToken = (value: string, name: string): boolean => value.split(/\s+/).some((token) => token === name);

/**
 * Word-boundary substring match, used only for the POSITIVE ("has a live
 * consumer") checks below - never for the RETIRED sweep, where the exact-
 * token rule above is what matters. `.list-row`/`.chip` are plain string
 * literals everywhere they're used, but `.technique-seed-flag` and
 * `.technique-disclosure-btn` are the FIRST class in a template literal
 * whose interpolated suffix is glued on with no space
 * (`` `technique-seed-flag${showMedian ? ... }` ``), so `hasClassToken`'s
 * whitespace split would see one token
 * (`technique-seed-flag${showMedian`) that equals neither name and report a
 * false absence. `\bname\b` still stops at the `$` (not a `\w` character),
 * so it correctly finds the literal prefix without caring what follows it -
 * exactly the shape legacyButtonRetirement.test.ts's own positive floor
 * tests (`.btn`/`.ibtn` adoption counts) already use.
 */
const hasClassSubstring = (value: string, name: string): boolean => new RegExp(`\\b${name}\\b`).test(value);

const classTokenOffenders = (name: string): string[] =>
  walk(SRC, ['.tsx'])
    .filter((file) => !file.endsWith('.test.tsx') && !file.endsWith('.test.ts'))
    .flatMap((file) =>
      classNameUses(readFileSync(file, 'utf8'))
        .filter((use) => hasClassToken(use.value, name))
        .map((use) => `${relative(file)}:${use.line}`)
    );

describe('the private classes Tasks 3-5 stopped using stay retired', () => {
  // Verified via direct grep (zero remaining .tsx consumers) before writing
  // this sweep - see the Task 9 report for the grep transcript.
  const RETIRED = [
    'mask-actions',
    'section',
    'section-button1',
    'section-button2',
    'section-add',
    'sections-layer',
  ];

  it.each(RETIRED)('.%s appears nowhere in a .tsx className', (name) => {
    expect(classTokenOffenders(name)).toEqual([]);
  });
});

describe('the mask, region and section lists actually adopted .list-row/.chip', () => {
  const fileClassTokens = (relativePath: string, name: string): ClassNameUse[] => {
    const content = readFileSync(join(SRC, relativePath), 'utf8');
    return classNameUses(content).filter((use) => hasClassSubstring(use.value, name));
  };

  it('MaskList.tsx uses .list-row for its rows', () => {
    expect(fileClassTokens('components/Forms/Components/MaskList.tsx', 'list-row').length).toBeGreaterThanOrEqual(
      1
    );
  });

  it('RegionList.tsx uses .list-row for its rows', () => {
    expect(
      fileClassTokens('components/Forms/Components/RegionList.tsx', 'list-row').length
    ).toBeGreaterThanOrEqual(1);
  });

  it('Sections.tsx uses .chip for its section tabs', () => {
    // A floor, not an exact count: one chip per rendered section tab plus the
    // "add section" chip, so >=1 rather than a specific number that would
    // fail the moment a section is added/removed in a future edit.
    expect(fileClassTokens('components/CrossSections/Sections.tsx', 'chip').length).toBeGreaterThanOrEqual(1);
  });

  // The counter-test: the RETIRED sweep above passes trivially on an empty
  // tree, so this asserts the migration's positive outcome is non-trivial
  // too, across the whole app, not just the three files named above.
  it('the app-wide .list-row/.chip floor is non-trivial', () => {
    const listRowCount = walk(SRC, ['.tsx'])
      .filter((file) => !file.endsWith('.test.tsx'))
      .flatMap((file) => classNameUses(readFileSync(file, 'utf8')))
      .filter((use) => hasClassSubstring(use.value, 'list-row')).length;
    const chipCount = walk(SRC, ['.tsx'])
      .filter((file) => !file.endsWith('.test.tsx'))
      .flatMap((file) => classNameUses(readFileSync(file, 'utf8')))
      .filter((use) => hasClassSubstring(use.value, 'chip')).length;
    expect(listRowCount).toBeGreaterThanOrEqual(2);
    expect(chipCount).toBeGreaterThanOrEqual(2);
  });
});

describe('the three technique-legend classes are deliberately NOT swept here', () => {
  // Documented, not just absent: a reader diffing this file against the
  // plan's stale File Structure line should find the explanation here rather
  // than wondering if the omission was accidental. This also mutation-tests
  // the controller's claim itself, not just the plan text: if either consumer
  // were ever actually removed without updating this test, that is a
  // silent regression this describe block would no longer be true about -
  // acceptable, because these three are explicitly out of THIS task's scope,
  // not a guard this task owns.
  it('technique-seed-flag has a live consumer (FormProcessing.tsx, the Median button)', () => {
    expect(fileHasClassToken('components/Forms/FormProcessing.tsx', 'technique-seed-flag')).toBe(true);
  });

  it('technique-eye-btn has a live consumer (TechniqueLegend.tsx)', () => {
    expect(fileHasClassToken('components/Graphs/TechniqueLegend.tsx', 'technique-eye-btn')).toBe(true);
  });

  it('the Results layer chips are inline: no disclosure chevron any more', () => {
    expect(fileHasClassToken('components/Graphs/TechniqueLegend.tsx', 'technique-layer-chip')).toBe(true);
    expect(fileHasClassToken('components/Graphs/TechniqueLegend.tsx', 'technique-disclosure-btn')).toBe(false);
  });
});

function fileHasClassToken(relativePath: string, name: string): boolean {
  const content = readFileSync(join(SRC, relativePath), 'utf8');
  return classNameUses(content).some((use) => hasClassSubstring(use.value, name));
}
