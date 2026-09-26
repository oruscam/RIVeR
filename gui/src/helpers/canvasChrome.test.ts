import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Spec rule (docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md:32-34,134):
 * no inline-positioned CONTROL floats over any image canvas except the
 * mode-hint pill and per-shape toolbars. The operative word is "control" -
 * interactive chrome, not the drawing surface itself and not a passive marker.
 *
 * This sweep is deliberately scoped to the specific files this phase touched
 * or that are verified (by direct grep, see the Task 9 report) to render
 * inside a `.media-container` subtree: the three pages that carry the
 * `media-container` class directly (CrossSections, Processing, VideoRange),
 * plus the components rendered inside them that this phase's own diff touches
 * or that are known to float (VideoPlayer, StabilizationCanvas, Carousel,
 * ImageProcessing, FloatingPlot). CameraCalibration.tsx is out of scope: it
 * has zero `media-container` occurrences today (grep -c), so it isn't
 * rebuilt onto the standard workspace until a later phase (6e) - it is not
 * special-cased here, it simply never matches these 8 files.
 *
 * General cross-file "is this JSX node's ancestor chain a media-container"
 * tracing is a much harder, speculative problem (component composition can
 * put anything anywhere) that this task does not attempt to solve for
 * arbitrary future files. If a later phase adds a NEW file that floats a
 * control over a canvas, it needs a deliberate addition to FILES below, not
 * an automatic catch - the tradeoff is documented, not hidden.
 *
 * Two names in the spec's allow list never appear in this sweep's output at
 * all, and that is expected, not a bug to "fix":
 *  - `.mode-hint`'s positioning is CSS-class-based (messages.css:4), and
 *    `ModeHint.tsx` never sets an inline `position` - class-based rules are
 *    structurally invisible to an inline-style sweep by construction.
 *  - `.mask-toolbar`'s positioning is likewise CSS-class-based
 *    (components.css:1306); `MaskToolbar.tsx`'s call site only ever passes a
 *    className, never an inline `position`.
 * Both are named here so a reader looking for "where is the mode pill /
 * mask toolbar allow-listed" finds the answer instead of a silent gap.
 */
const SRC = join(__dirname, '..');

const FILES = [
  'pages/CrossSections.tsx',
  'pages/Processing.tsx',
  'pages/VideoRange.tsx',
  'components/VideoPlayer/VideoPlayer.tsx',
  'components/VideoPlayer/StabilizationCanvas.tsx',
  'components/Carousel.tsx',
  'components/ImageProcessing.tsx',
  'components/FloatingPlot.tsx',
];

const walk = (dir: string, extensions: string[]): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full, extensions);
    return extensions.some((extension) => entry.endsWith(extension)) ? [full] : [];
  });

/** Sanity check that FILES hasn't drifted from the real tree (e.g. a rename). */
const existingFiles = new Set(walk(SRC, ['.tsx']).map((f) => f.slice(SRC.length + 1)));

/**
 * Brace-balanced value extractor, structurally identical in shape to
 * legacyButtonRetirement.test.ts's `balancedBraceValue` (duplicated rather
 * than imported so this file stays a standalone unit - see that file for the
 * canonical version and its own tests).
 */
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

interface StyleAbsoluteCandidate {
  readonly file: string;
  readonly line: number;
  readonly tagName: string;
  readonly styleValue: string;
  /** A bounded window of JSX following the opening tag, used only to check
   *  for a nested `<ShapeToolbar` - see the exclusion rule below. Bounded
   *  rather than closing-tag-balanced: sufficient for this file's finite,
   *  known cases, not a general JSX-subtree walker. */
  readonly contextAfter: string;
}

const CONTEXT_WINDOW = 600;

/**
 * Extracts every `style={{ ... }}` (or `style={ ... }`) attribute value from
 * a TSX file that contains an inline `position: 'absolute'`/`position:
 * "absolute"`, structurally: from the `style=` to the matching closing brace
 * (brace-depth counted), exactly the way `classNameUses` in
 * legacyButtonRetirement.test.ts extracts `className=` values. This is what
 * makes the sweep immune to reformatting (a multi-line object literal, or a
 * `//` comment on the line ABOVE the attribute, as StabilizationCanvas.tsx
 * has) in a way a per-physical-line regex is not: the value is isolated by
 * brace structure before any pattern is tested against it, so a comment that
 * merely precedes the attribute is never even part of the extracted text.
 */
const styleAbsoluteCandidates = (file: string, content: string): StyleAbsoluteCandidate[] => {
  const results: StyleAbsoluteCandidate[] = [];
  const pattern = /style=\{/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content))) {
    const braceStart = match.index + 'style='.length;
    const { value, end } = balancedBraceValue(content, braceStart);
    pattern.lastIndex = end;

    if (!/position\s*:\s*['"]absolute['"]/.test(value)) continue;

    const tagStart = content.lastIndexOf('<', match.index);
    if (tagStart === -1) continue;
    const tagNameMatch = content.slice(tagStart + 1).match(/^[A-Za-z][\w.]*/);
    if (!tagNameMatch) continue;

    results.push({
      file,
      line: content.slice(0, match.index).split('\n').length,
      tagName: tagNameMatch[0],
      styleValue: value,
      contextAfter: content.slice(end, end + CONTEXT_WINDOW),
    });
  }
  return results;
};

const allCandidates = (): StyleAbsoluteCandidate[] =>
  FILES.filter((file) => existingFiles.has(file)).flatMap((file) =>
    styleAbsoluteCandidates(file, readFileSync(join(SRC, file), 'utf8'))
  );

/**
 * A candidate is excluded from the "must be allow-listed" set - i.e. it was
 * never a control in the first place - when either:
 *  - it's an `<svg>`: the drawing surface (region rects live inside it), not
 *    floating chrome, structurally necessary like the video/image element;
 *  - its own style object also sets `pointerEvents: 'none'` AND it has no
 *    nested `<ShapeToolbar`. Carousel.tsx's frame-marker badge is
 *    non-interactive by definition (pointerEvents: 'none', nothing to click).
 *    StabilizationCanvas.tsx's full-canvas wrapper around `<ShapeToolbar>`
 *    ALSO sets pointerEvents: 'none' on itself, but it is not a passive
 *    marker: `.shape-toolbar` re-enables `pointer-events: auto` via CSS, so
 *    the wrapper is the positioning mechanism for a real, clickable toolbar.
 *    The nested-ShapeToolbar check is what tells these two apart generically
 *    instead of hard-coding a line number.
 */
const isExcludedNonControl = (candidate: StyleAbsoluteCandidate): boolean => {
  if (candidate.tagName === 'svg') return true;
  const hasPointerEventsNone = /pointerEvents\s*:\s*['"]none['"]/.test(candidate.styleValue);
  const hasNestedShapeToolbar = /<ShapeToolbar\b/.test(candidate.contextAfter);
  return hasPointerEventsNone && !hasNestedShapeToolbar;
};

interface AllowListEntry {
  readonly file: string;
  readonly reason: string;
  readonly matches: (candidate: StyleAbsoluteCandidate) => boolean;
}

const ALLOW_LIST: AllowListEntry[] = [
  {
    file: 'components/VideoPlayer/StabilizationCanvas.tsx',
    reason:
      'Spec-sanctioned: the per-shape toolbar. This wrapper positions <ShapeToolbar>, ' +
      'the one control cluster the spec explicitly allows over an image canvas besides ' +
      "the mode-hint pill (design spec lines 32-34, 134; ShapeToolbar.tsx's own doc comment).",
    matches: (c) =>
      c.file === 'components/VideoPlayer/StabilizationCanvas.tsx' && /<ShapeToolbar\b/.test(c.contextAfter),
  },
  {
    file: 'components/VideoPlayer/VideoPlayer.tsx',
    reason:
      'KNOWN DEBT, not spec-sanctioned - SoundBtn floats over the canvas with no prepared ' +
      "replacement; discovered in Task 6, escalated to the product owner, not this phase's to fix.",
    matches: (c) => c.file === 'components/VideoPlayer/VideoPlayer.tsx' && /SoundBtn/.test(c.contextAfter),
  },
  {
    file: 'components/FloatingPlot.tsx',
    reason:
      'KNOWN DEBT, not spec-sanctioned - the draggable floating plot panel floats over the ' +
      'canvas with no prepared replacement; discovered in Task 6, escalated to the product ' +
      "owner, not this phase's to fix.",
    matches: (c) => c.file === 'components/FloatingPlot.tsx',
  },
];

const offenders = (): StyleAbsoluteCandidate[] =>
  allCandidates()
    .filter((c) => !isExcludedNonControl(c))
    .filter((c) => !ALLOW_LIST.some((entry) => entry.matches(c)));

describe('no inline-positioned control floats over an image canvas', () => {
  it('every remaining candidate is either not a control or explicitly allow-listed', () => {
    expect(offenders().map((c) => `${c.file}:${c.line} <${c.tagName}>`)).toEqual([]);
  });

  // A sweep that finds nothing proves nothing (see legacyButtonRetirement's
  // own canary for the same reasoning). Pin down that this sweep is actually
  // exercising real code: it must still find every allow-listed exception,
  // not merely fail to find offenders because it found nothing at all.
  it('still finds all three allow-listed exceptions (the sweep is not vacuous)', () => {
    const found = allCandidates().filter((c) => !isExcludedNonControl(c));
    const matchedReasons = found.map((c) => ALLOW_LIST.find((entry) => entry.matches(c))?.reason ?? null);
    expect(matchedReasons.filter(Boolean)).toHaveLength(3);
    expect(matchedReasons.every((r) => r !== null)).toBe(true);
  });

  it('excludes the svg drawing surface and the non-interactive frame marker, not just allow-lists them', () => {
    const excluded = allCandidates().filter(isExcludedNonControl);
    expect(
      excluded.some((c) => c.file === 'components/VideoPlayer/StabilizationCanvas.tsx' && c.tagName === 'svg')
    ).toBe(true);
    expect(excluded.some((c) => c.file === 'components/Carousel.tsx')).toBe(true);
    // Neither excluded item should also appear in the allow-listed set - they're
    // disjoint by construction (excluded items are filtered out before the
    // allow-list is even consulted), but assert it so a future refactor that
    // merges the two lists can't quietly double-count.
    for (const entry of excluded) {
      expect(ALLOW_LIST.some((a) => a.matches(entry))).toBe(false);
    }
  });
});
