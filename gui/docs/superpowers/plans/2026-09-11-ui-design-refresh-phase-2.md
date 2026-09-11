# UI Design Refresh — Phase 2 (design tokens) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the token vocabulary Phase 3 (components) will build on — technique-colour tokens (palette B), a spacing/radius/motion scale, and surface/text/status aliases — and fix the two places where colours are duplicated as raw hex outside the theme system instead of reading it, without introducing any new component, layout, or visual language.

**Architecture:** Three additions to `src/index.css`: a new bare `:root` block for theme-invariant scale tokens (spacing/radius/motion — CSS custom properties inherit from `<html>` into the themed subtree regardless of which theme is active, so these don't belong inside a `[data-theme]` block), three new technique-colour custom properties added to each of the three existing `[data-theme]` blocks, and a set of alias custom properties (`--surface-*`, `--text-*`, `--status-*`) in each theme block that point at tokens the theme block already declares — pure renaming, zero new values. On the TypeScript side: a new `getTechniqueColors()` helper (mirroring the existing `getDistanceColors()`) that reads the new CSS tokens live, six call sites migrated off the static `TECHNIQUE_COLORS` export (which is then deleted), and `constants.ts`'s duplicate, dark-theme-frozen `COLORS.CONTROL_POINTS` object replaced at its one remaining call site by the theme-reactive `getDistanceColors()` that already exists and is already used everywhere else this data is needed.

**Tech Stack:** Same as Phase 1 — React 18 + TypeScript, plain CSS with `[data-theme]` custom properties, Jest 29 (`testEnvironment: "node"`, no DOM/jsdom — CSS is tested by reading and parsing the stylesheet text, not by rendering it).

**Spec:** RIVeR Design Audit artifact — https://claude.ai/code/artifact/02bcbe1c-e016-4d2e-9b66-d1bc80f31dcb (sections *Tokens* and *Rollout → 2 · Tokens*). Decision already made with the product owner: technique palette **B** (Okabe–Ito), confirmed 2026-09-10. This plan implements the token layer only — no component built with these tokens yet; that is Phase 3.

## Global Constraints

- Base branch for this plan is `ui/design-refresh` itself (Phase 1's tip), not `river-labs`. Never commit to `river-labs`/`main`.
- **No new component, layout, button style, font, pin, or message pattern.** This phase adds *tokens* — CSS custom properties and one TS helper — and repoints existing rendering code at tokens that already exist (`getDistanceColors()`) or that this phase adds. It does not touch JSX structure, component files' render logic beyond swapping one colour source for another, or any `.css` selector's layout/sizing/shape properties.
- Unlike Phase 1, this phase is *not* required to be pixel-identical to `river-labs` — routing `COLORS.CONTROL_POINTS`/`TECHNIQUE_COLORS` through the live theme system is expected to visibly change colours in the **light** and **dracula** themes specifically, because those values are hard-coded to the *dark* theme's hex today and don't adapt (the same class of bug Phase 1 already fixed for other tokens). This is the intended fix, not a regression — call it out in every task's report, don't hide it.
- Every new colour token is declared in **all three** theme blocks of `src/index.css`: `[data-theme="dark"]`, `[data-theme="light"]`, `[data-theme="dracula"]`. Spacing/radius/motion tokens (not colours) go in one new bare `:root` block instead, since they don't vary by theme.
- Technique palette (exact values, chosen — do not substitute):
  | Technique | dark | light | dracula |
  |---|---|---|---|
  | LSPIV | `#56B4E9` | `#0072B2` | `#8BE9FD` |
  | STIV | `#E69F00` | `#B86E00` | `#E0954D` |
  | iWave | `#009E73` | `#00795A` | `#4DD9B0` |

  (Dracula's STIV/iWave values were corrected from the source design artifact's `#FFB86C`/`#50FA7B` during Task 2 — those collided bit-for-bit with dracula's existing `--warning-color`/`--success-color`. See this plan's ledger for the full ruling. Dark and light are unchanged from the original artifact.)
- New alias tokens must point at an **existing token in the same theme block** via `var(...)` — never a new literal hex value. This is what keeps the phase visually inert for everything these aliases touch (nothing consumes them yet, so this can't be observed either way, but it must hold for Phase 3 to inherit the correct values automatically).
- `getCSSVar`/`getDistanceColors`-style helpers live in `src/helpers/getCSSVar.ts` — this is the one file in the codebase responsible for reading live theme colours into JS/canvas/D3 code. New technique-colour reads belong there, not duplicated elsewhere.
- Commits: short imperative message. No `Co-Authored-By` line, no trailers or signatures of any kind. Author email must be `antoine.patalano@gmail.com`.
- Baseline on this plan's base commit (`caa2213`, tip of Phase 1 on `ui/design-refresh`): `npx jest` → 24 suites, 289 tests, all passing; `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"` → 64 (pre-existing, unrelated to this work); `npm run lint` → 25 problems (22 errors, 3 warnings). None of these may get worse. The TypeScript and lint counts specifically must not grow — this plan touches typed `.ts`/`.tsx` files removing an export, which is exactly the kind of change that leaves a stray unused import if done carelessly. **Run project-wide `npm run lint` (not just the files a task touched) after every task** — a scoped-only check let 8 new lint errors from Tasks 1 and 2 go undetected until Task 6's review cycle.
- All paths below are relative to `gui/` unless prefixed with `/`.

---

## File map

| File | Responsibility in this phase |
|---|---|
| `src/index.css` | New bare `:root` scale-token block; new `--tech-*` tokens and `--surface-*`/`--text-*`/`--status-*` aliases in all three `[data-theme]` blocks |
| `src/helpers/getCSSVar.ts` | New `getTechniqueColors()` function |
| `src/helpers/techniqueColors.test.ts` (create) | Parses `index.css` for the new tokens; checks exact palette values; checks each technique colour's non-text contrast (WCAG 1.4.11, ≥3:1) against its theme's panel background |
| `src/helpers/scaleTokens.test.ts` (create) | Parses `index.css`'s bare `:root` block for the spacing/radius/motion tokens and their exact values |
| `src/constants/constants.ts` | Delete `COLORS.CONTROL_POINTS` and `TECHNIQUE_COLORS` |
| `src/components/Graphs/obliqueSvg.ts` | 6 call sites: `COLORS.CONTROL_POINTS.D12/D13/D14/D23/D24/D34` → `getDistanceColors()` |
| `src/components/IWaveViewer.tsx` | Call sites: `TECHNIQUE_COLORS.iwave` → `getTechniqueColors().iwave` (5 real JSX usages — see Task 5) |
| `src/components/Forms/FormProcessing.tsx` | 3 call sites: `TECHNIQUE_COLORS.lspiv/stiv/iwave` → `getTechniqueColors()` |
| `src/components/Graphs/AllInOne.tsx` | 1 call site: `TECHNIQUE_COLORS[key]` → `getTechniqueColors()[key]` |
| `src/components/Graphs/TechniqueLegend.tsx` | 1 call site: `TECHNIQUE_COLORS[key]` → `getTechniqueColors()[key]` |

---

**Tasks 1–6 below are RECONSTRUCTED from this plan's own extracted task-brief files after the original plan document was lost from the (untracked, unprotected) working tree partway through Task 6 — Tasks 1–6 are already implemented, reviewed, and committed; this reconstruction exists so the plan document itself stays complete and available for Task 7/8 and any future reference. Each Task 1–6 section below is copied verbatim from its `task-N-brief.md` extract, which is a byte-exact copy of the original.**

### Task 1: Scale tokens (spacing, radius, motion)

**Files:**
- Create: `src/helpers/scaleTokens.test.ts`
- Modify: `src/index.css` (new content inserted before line 1's `/* ===... THEME SYSTEM` comment — i.e. at the very top of the file, before the three `[data-theme]` blocks)

**Interfaces:**
- Produces: a bare `:root { ... }` block declaring `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full`, `--space-1` through `--space-7`, `--motion-fast`, `--motion-base`, `--motion-slow`, `--motion-ease`. No later task in this plan consumes these (Phase 3 will) — this task exists purely to make them available and tested.

Background: these are the only tokens in this plan with no theme dependency at all — the same radius/spacing/easing applies whether the app is in dark, light, or dracula. Every existing custom property in `index.css` lives inside one of the three `[data-theme="…"]` blocks; declaring these three times identically (once per theme) would be pure duplication for values that never differ. A bare `:root` block is the correct CSS mechanism: `:root` matches `<html>`, its custom properties are inherited by every element in the document (including the div carrying `[data-theme]`, which sits inside `<body>`), and since none of these new property *names* collide with anything the three theme blocks already declare, adding this block changes nothing about how any existing selector resolves.

- [ ] **Step 1: Write the failing test**

Create `src/helpers/scaleTokens.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The spacing/radius/motion scale Phase 3 will build components against.
 * These are the same across all three themes, so they live in one bare
 * :root block instead of being repeated in each [data-theme] block.
 */
const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');

const rootBlock = (): string => {
  const match = css.match(/(?:^|\n):root\s*\{([^}]*)\}/);
  if (!match) throw new Error('No bare :root block found in index.css');
  return match[1];
};

const token = (name: string): string | undefined => {
  const match = rootBlock().match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  return match?.[1].trim();
};

describe('scale tokens', () => {
  it('declares a bare :root block, separate from the [data-theme] blocks', () => {
    expect(() => rootBlock()).not.toThrow();
  });

  it('does not redeclare any token a [data-theme] block already owns', () => {
    const themedTokens = [...css.matchAll(/\[data-theme="[a-z]+"\]\s*\{([^}]*)\}/g)]
      .flatMap((m) => [...m[1].matchAll(/(--[a-z0-9-]+)\s*:/g)].map((t) => t[1]));
    const rootTokens = [...rootBlock().matchAll(/(--[a-z0-9-]+)\s*:/g)].map((t) => t[1]);
    const overlap = rootTokens.filter((t) => themedTokens.includes(t));
    expect(overlap).toEqual([]);
  });

  describe.each([
    ['--radius-sm', '4px'],
    ['--radius-md', '8px'],
    ['--radius-lg', '12px'],
    ['--radius-full', '999px'],
    ['--space-1', '4px'],
    ['--space-2', '8px'],
    ['--space-3', '12px'],
    ['--space-4', '16px'],
    ['--space-5', '24px'],
    ['--space-6', '32px'],
    ['--space-7', '48px'],
    ['--motion-fast', '120ms'],
    ['--motion-base', '200ms'],
    ['--motion-slow', '320ms'],
    ['--motion-ease', 'cubic-bezier(.2,0,0,1)'],
  ])('%s', (name, expected) => {
    it(`is ${expected}`, () => {
      expect(token(name)).toBe(expected);
    });
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest src/helpers/scaleTokens.test.ts`
Expected: FAIL — the "bare :root block" test throws (`index.css` has no bare `:root` block yet), so every other test in the file fails too (the `beforeEach`-less `rootBlock()` call throws inside each `token()` call).

- [ ] **Step 3: Add the token block**

In `src/index.css`, insert this new block as the very first thing in the file, before the existing top comment (`/* ===... THEME SYSTEM ...`):

```css
/* =============================================================================
   SCALE TOKENS
   Spacing, radius and motion — identical across all three themes, so they
   live in one bare :root block instead of being repeated per [data-theme].
   Consumed starting in Phase 3; nothing reads these yet.
   ============================================================================= */
:root {
  /* Radius */
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-full: 999px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;

  /* Motion */
  --motion-fast:  120ms;
  --motion-base:  200ms;
  --motion-slow:  320ms;
  --motion-ease:  cubic-bezier(.2,0,0,1);
}

```

(Leave a blank line after the closing `}` before the existing `/* ===... THEME SYSTEM` comment begins.)

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx jest src/helpers/scaleTokens.test.ts`
Expected: PASS (17 tests: 2 structural + 15 token value checks).

- [ ] **Step 5: Run the whole suite**

Run: `npx jest 2>&1 | tail -5`
Expected: 25 suites, 306 tests passed.

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/helpers/scaleTokens.test.ts
git commit -m "Add spacing, radius and motion scale tokens"
```

---


### Task 2: Technique-colour tokens and `getTechniqueColors()`

**Files:**
- Create: `src/helpers/techniqueColors.test.ts`
- Modify: `src/index.css` (add 3 lines to each of the three `[data-theme]` blocks)
- Modify: `src/helpers/getCSSVar.ts`

**Interfaces:**
- Consumes: `parseThemeTokens`, `relativeLuminance`, `contrastRatio` from `src/helpers/themeContrast.ts` (added in Phase 1 Task 1 — already merged on this branch). Read-only import; this task does not modify `themeContrast.ts` or its existing test.
- Produces: `getTechniqueColors(): { lspiv: string; stiv: string; iwave: string }` in `src/helpers/getCSSVar.ts`, reading `--tech-lspiv`/`--tech-stiv`/`--tech-iwave` live via the existing `getCSSVar` function, with the dark-theme palette-B values as fallbacks (mirroring exactly how `getDistanceColors()` is already written in the same file). Tasks 4–7 call this.

- [ ] **Step 1: Write the failing test**

Create `src/helpers/techniqueColors.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { contrastRatio, parseThemeTokens } from './themeContrast';

/**
 * The three technique-identity colours (LSPIV/STIV/iWave), one theme-tuned
 * set per theme, chosen to be distinguishable for common colour-vision
 * deficiencies (Okabe–Ito palette) and kept separate from the status
 * (good/fair/bad) and accent colours everywhere else in the app.
 */
const themes = parseThemeTokens(readFileSync(join(__dirname, '..', 'index.css'), 'utf8'));

const PALETTE: Record<string, { lspiv: string; stiv: string; iwave: string }> = {
  dark:    { lspiv: '#56B4E9', stiv: '#E69F00', iwave: '#009E73' },
  light:   { lspiv: '#0072B2', stiv: '#B86E00', iwave: '#00795A' },
  dracula: { lspiv: '#8BE9FD', stiv: '#FFB86C', iwave: '#50FA7B' },
};

describe('technique colour tokens', () => {
  describe.each(['dark', 'light', 'dracula'])('%s theme', (theme) => {
    it.each(['lspiv', 'stiv', 'iwave'] as const)('--tech-%s matches the chosen palette', (key) => {
      expect(themes[theme][`--tech-${key}`]).toBe(PALETTE[theme][key]);
    });
  });
});

describe('technique colours vs status colours (must stay separate — Critical audit finding)', () => {
  it.each(['dark', 'light', 'dracula'])('%s: STIV is not the error colour and iWave is not the success colour', (theme) => {
    expect(themes[theme]['--tech-stiv']).not.toBe(themes[theme]['--background-error']);
    expect(themes[theme]['--tech-iwave']).not.toBe(themes[theme]['--success-color']);
  });
});

describe('technique colours: non-text contrast (WCAG 1.4.11, >=3:1 against the panel)', () => {
  describe.each(['dark', 'light', 'dracula'])('%s theme', (theme) => {
    it.each(['lspiv', 'stiv', 'iwave'] as const)('--tech-%s reads against --secondary-background-color', (key) => {
      const tokens = themes[theme];
      expect(contrastRatio(tokens[`--tech-${key}`], tokens['--secondary-background-color'])).toBeGreaterThanOrEqual(3);
    });
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest src/helpers/techniqueColors.test.ts`

Expected: FAIL on every `--tech-*` lookup (`themes[theme]['--tech-lspiv']` etc. is `undefined`, so `.toBe(...)` fails; the "not the error/success colour" tests fail with `undefined` on both sides being loosely unequal to the real hex — actually those two will spuriously PASS since `undefined !== '#ED6B57'`, which is a true statement but for the wrong reason). Focus on confirming the palette-match and contrast tests fail; that's the meaningful RED signal here.

- [ ] **Step 3: Add the tokens to all three theme blocks**

In `src/index.css`, inside `[data-theme="dark"]`, directly after the block that now reads (post-Phase-1):
```css
  /* Text drawn on top of filled accent / semantic backgrounds */
  --on-accent:  #FFFFFF;
  --on-warning: #000000;
  --on-error:   #000000;
  --on-success: #000000;
```
add:
```css

  /* Per-technique identity colour (LSPIV/STIV/iWave) — Results legend, chart
     lines/markers, Processing technique rows. Deliberately its own set,
     never the same colour as accent or the status pair above. */
  --tech-lspiv: #56B4E9;
  --tech-stiv:  #E69F00;
  --tech-iwave: #009E73;
```

In `[data-theme="light"]`, directly after the equivalent `--on-accent`/`--on-warning`/`--on-error`/`--on-success` block, add:
```css

  /* Per-technique identity colour (LSPIV/STIV/iWave) — Results legend, chart
     lines/markers, Processing technique rows. Deliberately its own set,
     never the same colour as accent or the status pair above. */
  --tech-lspiv: #0072B2;
  --tech-stiv:  #B86E00;
  --tech-iwave: #00795A;
```

In `[data-theme="dracula"]`, directly after its `--on-accent`/`--on-warning`/`--on-error`/`--on-success` block, add:
```css

  /* Per-technique identity colour (LSPIV/STIV/iWave) — Results legend, chart
     lines/markers, Processing technique rows. Deliberately its own set,
     never the same colour as accent or the status pair above. */
  --tech-lspiv: #8BE9FD;
  --tech-stiv:  #FFB86C;
  --tech-iwave: #50FA7B;
```

- [ ] **Step 4: Add `getTechniqueColors()`**

In `src/helpers/getCSSVar.ts`, add after the existing `getDistanceColors` function:

```ts

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
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `npx jest src/helpers/techniqueColors.test.ts`
Expected: PASS (9 palette-match + 3 separation + 9 contrast = 21 tests).

- [ ] **Step 6: Type check and full suite**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64
npx jest 2>&1 | tail -5                                        # 26 suites, 327 tests passed
```

- [ ] **Step 7: Commit**

```bash
git add src/index.css src/helpers/getCSSVar.ts src/helpers/techniqueColors.test.ts
git commit -m "Add technique-colour tokens and getTechniqueColors"
```

---


### Task 3: Surface, text and status alias tokens

**Files:**
- Modify: `src/helpers/techniqueColors.test.ts` (append one `describe` block — this is the natural home since it already imports `parseThemeTokens`; despite the file's name, alias-token structural checks belong beside the other "does index.css declare what this phase promised" checks rather than a third near-empty file)
- Modify: `src/index.css` (add alias declarations to all three `[data-theme]` blocks)

**Interfaces:**
- Consumes: `parseThemeTokens` from `themeContrast.ts` (same as Task 2). Note: `parseThemeTokens`'s regex only captures declarations of the literal form `--token: #hexvalue;` — a `var(...)` reference does **not** match that pattern, so the new alias tokens (whose values are `var(--existing-token)`, not literal hex) will **not** appear in `parseThemeTokens`'s output. This task's test therefore checks the *raw declaration text* for each alias (that `--surface-panel: var(--secondary-background-color);` literally appears in each theme block), not the resolved colour — resolution to an identical value is guaranteed by construction (every alias points at a token that already exists in the same block) and isn't something a text-based test can independently verify anyway (that requires a real browser).
- Produces: nothing later tasks in this plan consume — Phase 3 consumes these.

Background: the rollout description calls these "aliases of the current variables" — new names Phase 3's components will be written against, each one a `var()` reference to a token this exact theme block already declares elsewhere. No new hex values are introduced anywhere in this task. This is why the plan's Global Constraints call this phase "visually inert" for these three token families specifically (the technique-colour and duplicate-removal changes in Tasks 2/4–7 are the only parts of this phase that change what anything looks like).

- [ ] **Step 1: Write the failing test**

Append to `src/helpers/techniqueColors.test.ts` (add this `describe` block at the end of the file, after the existing three):

```ts

describe('surface/text/status alias tokens (pure aliases — no new colour values)', () => {
  const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');
  const themeBlock = (theme: string): string => {
    const match = css.match(new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`));
    if (!match) throw new Error(`No [data-theme="${theme}"] block found`);
    return match[1];
  };

  const ALIASES: [string, string][] = [
    ['--surface-frame', '--background-color'],
    ['--surface-panel', '--secondary-background-color'],
    ['--surface-raised', '--card-surface'],
    ['--surface-field', '--input-background'],
    ['--text-primary', '--primary-text-color'],
    ['--text-subdued', '--secondary-text-color'],
    ['--status-good', '--success-color'],
    ['--status-fair', '--warning-color'],
    ['--status-bad', '--background-error'],
  ];

  describe.each(['dark', 'light', 'dracula'])('%s theme', (theme) => {
    it.each(ALIASES)('%s aliases var(%s)', (alias, target) => {
      const block = themeBlock(theme);
      const pattern = new RegExp(`${alias}\\s*:\\s*var\\(\\s*${target}\\s*\\)\\s*;`);
      expect(block).toMatch(pattern);
    });
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest src/helpers/techniqueColors.test.ts -t "alias"`
Expected: FAIL — all 27 (9 aliases × 3 themes) `toMatch` assertions fail; none of these declarations exist yet.

- [ ] **Step 3: Add the aliases to all three theme blocks**

In `src/index.css`, inside `[data-theme="dark"]`, directly after the `--tech-lspiv`/`--tech-stiv`/`--tech-iwave` block Task 2 just added, add:

```css

  /* Aliases Phase 3's components are written against — each one points at
     a token this theme block already declares above. No new colour values. */
  --surface-frame:  var(--background-color);
  --surface-panel:  var(--secondary-background-color);
  --surface-raised: var(--card-surface);
  --surface-field:  var(--input-background);
  --text-primary:   var(--primary-text-color);
  --text-subdued:   var(--secondary-text-color);
  --status-good:    var(--success-color);
  --status-fair:    var(--warning-color);
  --status-bad:     var(--background-error);
```

In `[data-theme="light"]`, directly after its `--tech-*` block, add the identical nine lines (same alias names, same `var()` targets — each resolves against *that* block's own declarations, which is what makes this an alias and not a hard-coded value):

```css

  /* Aliases Phase 3's components are written against — each one points at
     a token this theme block already declares above. No new colour values. */
  --surface-frame:  var(--background-color);
  --surface-panel:  var(--secondary-background-color);
  --surface-raised: var(--card-surface);
  --surface-field:  var(--input-background);
  --text-primary:   var(--primary-text-color);
  --text-subdued:   var(--secondary-text-color);
  --status-good:    var(--success-color);
  --status-fair:    var(--warning-color);
  --status-bad:     var(--background-error);
```

In `[data-theme="dracula"]`, directly after its `--tech-*` block, add the same nine lines again:

```css

  /* Aliases Phase 3's components are written against — each one points at
     a token this theme block already declares above. No new colour values. */
  --surface-frame:  var(--background-color);
  --surface-panel:  var(--secondary-background-color);
  --surface-raised: var(--card-surface);
  --surface-field:  var(--input-background);
  --text-primary:   var(--primary-text-color);
  --text-subdued:   var(--secondary-text-color);
  --status-good:    var(--success-color);
  --status-fair:    var(--warning-color);
  --status-bad:     var(--background-error);
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx jest src/helpers/techniqueColors.test.ts`
Expected: PASS (all tests in the file, including the 27 new ones — 48 total in this file).

- [ ] **Step 5: Full suite**

Run: `npx jest 2>&1 | tail -5`
Expected: 26 suites, 354 tests passed.

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/helpers/techniqueColors.test.ts
git commit -m "Add surface, text and status alias tokens"
```

---


### Task 4: Remove the duplicate `COLORS.CONTROL_POINTS` — route `obliqueSvg.ts` through `getDistanceColors()`

**Files:**
- Modify: `src/components/Graphs/obliqueSvg.ts:1-90` (6 call sites)
- Modify: `src/constants/constants.ts:70-78` (delete `CONTROL_POINTS`)

**Interfaces:**
- Consumes: `getDistanceColors(): { D12, D13, D14, D23, D24, D34 }` from `src/helpers/getCSSVar.ts` — already exists (pre-dates this plan), already used the same way by `src/components/Graphs/OrthoImage.tsx` and `src/components/Graphs/drawOblique.ts` in the same directory.

Background: `constants.ts`'s `COLORS.CONTROL_POINTS` is a plain object hard-coded to the *dark* theme's six distance-pair colours (`D12: '#6CD4FF'` etc. — identical to `index.css`'s dark-theme `--d12` value). `obliqueSvg.ts` is the **only** remaining file reading it; every other file that needs these colours already calls `getDistanceColors()`, which reads the live `--d12`…`--d34` tokens and therefore adapts correctly to light/dracula. Because `obliqueSvg.ts` uses the frozen constant instead, its control-point markers currently render in dark-theme colours even when the app is in light or dracula mode — this task fixes that, and it is the one place in this task where the *rendered colour actually changes* in light/dracula (call this out in the report; see Global Constraints).

- [ ] **Step 1: Read the current call sites**

`src/components/Graphs/obliqueSvg.ts` is a single exported function, `obliqueSvg`, 132 lines. All 6 `COLORS.CONTROL_POINTS.*` reads live inside that one function (lines 40, 44, 48, 65, 74, 83). `COLORS.RED`, `COLORS.LIGHT_BLUE` (line 129, pin badge text colour) and `COLORS.BLACK` (line 52, a `default:` fallback stroke) also appear in this file — these are unrelated to `CONTROL_POINTS` and are **out of scope**; do not touch them or the file's `import { COLORS, MARKS } from '../../constants/constants';` line (line 3) — `COLORS` stays imported and used after this task.

- [ ] **Step 2: Write the failing regression test**

Create `src/helpers/noDuplicateColorConstants.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * COLORS.CONTROL_POINTS duplicated getDistanceColors()'s live values as a
 * dark-theme-frozen constant. Once every consumer reads the live tokens
 * instead, the duplicate must not exist — this guards against it coming
 * back (e.g. a future file reaching for the "simpler" static import again).
 */
describe('no duplicate, theme-frozen colour constants', () => {
  it('constants.ts no longer exports CONTROL_POINTS', () => {
    const constants = readFileSync(join(__dirname, '..', 'constants', 'constants.ts'), 'utf8');
    expect(constants).not.toMatch(/CONTROL_POINTS/);
  });

  it('obliqueSvg.ts reads distance colours from getDistanceColors, not COLORS', () => {
    const source = readFileSync(join(__dirname, '..', 'components', 'Graphs', 'obliqueSvg.ts'), 'utf8');
    expect(source).not.toMatch(/COLORS\.CONTROL_POINTS/);
    expect(source).toMatch(/getDistanceColors/);
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

Run: `npx jest src/helpers/noDuplicateColorConstants.test.ts`
Expected: FAIL — both assertions fail (`CONTROL_POINTS` still exists in `constants.ts`; `obliqueSvg.ts` still has `COLORS.CONTROL_POINTS` and no `getDistanceColors` import).

- [ ] **Step 4: Update `obliqueSvg.ts`**

Add a new import line directly after line 4 (`import { createPinsBase64 } from './createPinsBase64';`):

```ts
import { getDistanceColors } from '../../helpers/getCSSVar';
```

Directly after line 27 (`const { pinRedSVGBase64, pinSVGBase64 } = createPinsBase64();`), add one shared call — all 6 usages are in this one function, so call it once, matching the pattern already used in `drawOblique.ts:70` (`const DC = getDistanceColors();`):

```ts
  const DC = getDistanceColors();
```

Then replace each of the 6 usages:
- Line 40: `return COLORS.CONTROL_POINTS.D12;` → `return DC.D12;`
- Line 44: `return COLORS.CONTROL_POINTS.D23;` → `return DC.D23;`
- Line 48: `return COLORS.CONTROL_POINTS.D34;` → `return DC.D34;`
- Line 65: `.attr('stroke', COLORS.CONTROL_POINTS.D14)` → `.attr('stroke', DC.D14)`
- Line 74: `.attr('stroke', COLORS.CONTROL_POINTS.D13)` → `.attr('stroke', DC.D13)`
- Line 83: `.attr('stroke', COLORS.CONTROL_POINTS.D24)` → `.attr('stroke', DC.D24)`

Leave lines 52, 129 (`COLORS.BLACK`, `COLORS.RED`, `COLORS.LIGHT_BLUE`) and the `COLORS` import untouched (see Step 1).

- [ ] **Step 5: Delete `CONTROL_POINTS` from `constants.ts`**

In `src/constants/constants.ts`, remove this block from inside the `COLORS` object (currently lines ~70-78):
```ts
  CONTROL_POINTS: {
    D12: '#6CD4FF',
    D13: '#CC4BC2',
    D14: '#F5BF61',
    D23: '#62C655',
    D24: '#7765E3',
    D34: '#ED6B57',
  },
```
Leave every other key in `COLORS` (RED, GREEN, YELLOW, BLUE, LIGHT_BLUE, DARK_GREY, WHITE, BLACK, TRANSPARENT_WHITE, TRANSPARENT, PERCENTILE_AREA, PERCENTILE_STROKE, STD_AREA, STD_STROKE, MARK_NUMBER, MARK_L, MARK_R, ELLIPSE) untouched — they are out of scope for this plan (see the note at the bottom of this plan under "Out of scope").

- [ ] **Step 6: Run the test and confirm it passes**

Run: `npx jest src/helpers/noDuplicateColorConstants.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Type check, lint, full suite**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64 — if it's 65+, you left an unused import; find and remove it
npx eslint src/components/Graphs/obliqueSvg.ts src/constants/constants.ts   # no output
npx jest 2>&1 | tail -5                                        # 27 suites, 356 tests passed
```

- [ ] **Step 8: Check in the app**

Run `npm run dev` (or `yarn dev`). Open or start an Oblique-footage project, reach the Control Points step, switch the theme to Light and then Dracula (Home screen's theme menu, or wherever the theme toggle is reachable from mid-wizard). Confirm the control-point markers/lines on the image now show that theme's distance colours (matching the same colours already used on the CrossSections/pixel-size screens in that theme) instead of staying the fixed dark-theme cyan/pink/amber/green/purple/coral regardless of theme.

- [ ] **Step 9: Commit**

```bash
git add src/components/Graphs/obliqueSvg.ts src/constants/constants.ts src/helpers/noDuplicateColorConstants.test.ts
git commit -m "Route oblique control-point colours through the live theme instead of a dark-theme-frozen constant"
```

---


### Task 5: Migrate `IWaveViewer.tsx` off `TECHNIQUE_COLORS`

**Files:**
- Modify: `src/components/IWaveViewer.tsx` (4 call sites + import)

**Interfaces:**
- Consumes: `getTechniqueColors()` from Task 2.

- [ ] **Step 1: Update the import**

In `src/components/IWaveViewer.tsx`, replace:
```ts
import { UNIT_CONVERSIONS, UNITS, TECHNIQUE_COLORS } from '../constants/constants';
```
with:
```ts
import { UNIT_CONVERSIONS, UNITS } from '../constants/constants';
import { getTechniqueColors } from '../helpers/getCSSVar';
```

- [ ] **Step 2: Add a local colour binding**

`IWaveViewer`'s function body opens with `const { sections, activeSection } = useSectionSlice();`, `const { projectDetails } = useProjectSlice();`, then `const { t } = useTranslation();`. Add this new line directly after `const { t } = useTranslation();` and before `const [natural, setNatural] = useState...`:
```ts
  const { iwave: iwaveColor } = getTechniqueColors();
```

- [ ] **Step 3: Replace all 4 usages**

Replace every occurrence of `TECHNIQUE_COLORS.iwave` in this file with `iwaveColor`:
- The `gravityPoints` `<polyline stroke={...}>`
- The `turbulencePoints` `<polyline stroke={...}>`
- The `.sti-badge` `style={{ color: ... }}`
- The two `<line stroke={...}>` elements in the legend (both instances — re-read the file, there are two `<line>` elements using this colour, one solid and one dashed)

- [ ] **Step 4: Type check and lint**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64
npx eslint src/components/IWaveViewer.tsx   # no output
```

- [ ] **Step 5: Run the full suite**

Run: `npx jest 2>&1 | tail -5`
Expected: 27 suites, 356 tests passed (unchanged — this task has no new automated test; Task 7 adds one final regression test covering every one of Tasks 5/6/7's files at once).

- [ ] **Step 6: Commit**

```bash
git add src/components/IWaveViewer.tsx
git commit -m "Migrate IWaveViewer off the static TECHNIQUE_COLORS constant"
```

---


### Task 6: Migrate `FormProcessing.tsx` and `AllInOne.tsx` off `TECHNIQUE_COLORS`

**Files:**
- Modify: `src/components/Forms/FormProcessing.tsx` (3 call sites + import)
- Modify: `src/components/Graphs/AllInOne.tsx` (1 call site + import)

**Interfaces:**
- Consumes: `getTechniqueColors()` from Task 2.

- [ ] **Step 1: Update `FormProcessing.tsx`'s import**

Find the line:
```ts
import { TECHNIQUE_COLORS } from '../../constants/constants';
```
Replace it with:
```ts
import { getTechniqueColors } from '../../helpers/getCSSVar';
```
(If this file imports other names from `'../../constants/constants'` on a separate line, leave that line alone — only this specific import line changes.)

- [ ] **Step 2: Add a local colour binding in `FormProcessing.tsx`**

`FormProcessing`'s function body opens with `const { t } = useTranslation();` then `const { onSetErrorMessage } = useUiSlice();`. Add this new line directly after `const { t } = useTranslation();`:
```ts
  const technique = getTechniqueColors();
```

- [ ] **Step 3: Replace the 3 usages in `FormProcessing.tsx`**

- `style={{ background: TECHNIQUE_COLORS.lspiv }}` → `style={{ background: technique.lspiv }}`
- `style={{ background: TECHNIQUE_COLORS.stiv }}` → `style={{ background: technique.stiv }}`
- `style={{ background: TECHNIQUE_COLORS.iwave }}` → `style={{ background: technique.iwave }}`

- [ ] **Step 4: Update `AllInOne.tsx`'s import**

Find the line:
```ts
import { GRAPHS, TECHNIQUE_COLORS, UNIT_CONVERSIONS, UNITS } from '../../constants/constants';
```
Replace it with:
```ts
import { GRAPHS, UNIT_CONVERSIONS, UNITS } from '../../constants/constants';
import { getTechniqueColors } from '../../helpers/getCSSVar';
```

- [ ] **Step 5: Replace the 1 usage in `AllInOne.tsx`**

This file builds a `series` array inside a `.map((key) => { ... })` callback (the block containing `const s: VelocitySeries = { key, label: TECHNIQUE_LABEL[key], color: TECHNIQUE_COLORS[key], isActive, points };`). Add one line immediately before the `.map(...)` call that builds `series` (i.e. right before `const series: VelocitySeries[] = TECHNIQUE_ORDER.filter(...)...map(...)`):
```ts
      const technique = getTechniqueColors();
```
Then inside the `.map()` callback, replace:
```ts
            color: TECHNIQUE_COLORS[key],
```
with:
```ts
            color: technique[key],
```

This is inside the `useEffect` whose dependency array already includes `theme` (confirmed: `AllInOne.tsx`'s draw effect lists `theme` among its dependencies), so the effect re-runs — and therefore re-reads the live technique colours — whenever the theme changes. No dependency-array change is needed.

- [ ] **Step 6: Type check and lint**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64
npx eslint src/components/Forms/FormProcessing.tsx src/components/Graphs/AllInOne.tsx   # no output
```

- [ ] **Step 7: Run the full suite**

Run: `npx jest 2>&1 | tail -5`
Expected: 27 suites, 356 tests passed.

- [ ] **Step 8: Commit**

```bash
git add src/components/Forms/FormProcessing.tsx src/components/Graphs/AllInOne.tsx
git commit -m "Migrate FormProcessing and AllInOne off the static TECHNIQUE_COLORS constant"
```

---


### Task 7: Migrate `TechniqueLegend.tsx`, delete `TECHNIQUE_COLORS`, and add the final regression test

**Files:**
- Modify: `src/components/Graphs/TechniqueLegend.tsx` (1 call site + import)
- Modify: `src/constants/constants.ts` (delete `TECHNIQUE_COLORS`)
- Modify: `src/helpers/noDuplicateColorConstants.test.ts` (append coverage for `TECHNIQUE_COLORS`)

**Interfaces:**
- Consumes: `getTechniqueColors()` from Task 2. This is the last of the 6 `TECHNIQUE_COLORS` call sites (see the File map's consumer list) — after this task, deleting the export is safe.

- [ ] **Step 1: Confirm this really is the last call site**

Run: `grep -rn "TECHNIQUE_COLORS" src --include='*.ts*' | grep -v test`

Expected output: exactly 3 lines — 1 in `constants.ts` (the `export const TECHNIQUE_COLORS = {` definition), and 2 in `TechniqueLegend.tsx` (its `import` line and its `TECHNIQUE_COLORS[key]` usage line). If you see any other file listed, STOP — a call site was missed in an earlier task; report BLOCKED with the file:line rather than guessing whether it's safe to proceed.

- [ ] **Step 2: Update `TechniqueLegend.tsx`**

Replace:
```ts
import { TECHNIQUE_COLORS } from '../../constants/constants';
```
with:
```ts
import { getTechniqueColors } from '../../helpers/getCSSVar';
```

Near the top of the `TechniqueLegend` component function body (before the `return (`), add:
```ts
  const technique = getTechniqueColors();
```

Replace:
```ts
        const color = isActive ? 'var(--primary-text-color)' : TECHNIQUE_COLORS[key];
```
with:
```ts
        const color = isActive ? 'var(--primary-text-color)' : technique[key];
```

- [ ] **Step 3: Write the failing test for the deletion**

Append to `src/helpers/noDuplicateColorConstants.test.ts` a third test inside the existing `describe` block:

```ts

  it('constants.ts no longer exports the static TECHNIQUE_COLORS (every consumer now reads getTechniqueColors live)', () => {
    const constants = readFileSync(join(__dirname, '..', 'constants', 'constants.ts'), 'utf8');
    expect(constants).not.toMatch(/export const TECHNIQUE_COLORS/);
  });
```

- [ ] **Step 4: Run it and confirm it fails**

Run: `npx jest src/helpers/noDuplicateColorConstants.test.ts`
Expected: FAIL on the new test only (the two from Task 4 still pass); `TECHNIQUE_COLORS` is still exported.

- [ ] **Step 5: Delete `TECHNIQUE_COLORS` from `constants.ts`**

Remove this whole block:
```ts
/**
 * Per-technique identity color for the Results panel (legend, chart lines/markers).
 * LSPIV = cyan, STIV = clear red, iWave = clear green — RIVeR's own palette above,
 * not an arbitrary/matplotlib-style scheme.
 */
export const TECHNIQUE_COLORS = {
  lspiv: COLORS.LIGHT_BLUE,
  stiv: COLORS.RED,
  iwave: COLORS.GREEN,
};
```

- [ ] **Step 6: Run the test and confirm it passes**

Run: `npx jest src/helpers/noDuplicateColorConstants.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Type check, lint, full suite — the real gate for this whole plan**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # must still be 64 — this is the step most likely to reveal a missed call site as a type error ("Cannot find name 'TECHNIQUE_COLORS'")
npm run lint 2>&1 | tail -5                                    # must be exactly 25 problems / 22 errors / 3 warnings (the true baseline, restored by the controller's fcb2cb8 fix on top of Task 6 — confirm it stayed there, don't let it drift again)
npx jest 2>&1 | tail -5                                        # 27 suites, 357 tests passed
```

If `tsc` reports a new error naming `TECHNIQUE_COLORS` in any file, that file has a 7th call site this plan's File map missed — fix it the same way as the other 6 (import `getTechniqueColors`, bind a local const, replace the usage), then re-run this step.

- [ ] **Step 8: Check in the app**

Run `npm run dev` (or `yarn dev`). Open a project that has run at least two techniques (e.g. LSPIV + iWave) and reach Results. Confirm the technique legend still shows a distinct colour swatch per technique (now palette B's blue/orange/green-family instead of the old cyan/red/green), the active technique's swatch still turns white when selected (unchanged — that logic wasn't touched), and switching the theme to Dracula shows the Dracula-tuned palette-B colours instead of the same colours as dark mode.

- [ ] **Step 9: Commit**

```bash
git add src/components/Graphs/TechniqueLegend.tsx src/constants/constants.ts src/helpers/noDuplicateColorConstants.test.ts
git commit -m "Migrate TechniqueLegend off TECHNIQUE_COLORS and delete the static export"
```

---

### Task 8: Final verification

**Files:** none modified.

- [ ] **Step 1: Full automated check**

```bash
npx jest 2>&1 | tail -5                                          # 27 suites, all passing
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"      # 64 or fewer
npm run lint 2>&1 | tail -5                                       # 25 problems or fewer (22 errors, 3 warnings, or fewer)
git log --oneline caa2213f6db31e9a65179a095c3c252ed16ec8f0..HEAD  # 7 task commits + at least 1 controller fix commit (the lint-formatting fix fcb2cb8) — the exact count now includes bookkeeping/fix commits this plan's original text didn't anticipate; what matters is every commit's author/trailer, not a fixed count
git log --format='%ae %B' caa2213f6db31e9a65179a095c3c252ed16ec8f0..HEAD | grep -ci "co-authored"  # 0
git log --format='%ae' caa2213f6db31e9a65179a095c3c252ed16ec8f0..HEAD | sort -u                     # only antoine.patalano@gmail.com
```

- [ ] **Step 2: Walk through the app once per theme**

Run `npm run dev` (or `yarn dev`) — remember the worktree needs its own `.env.development` copied in and `yarn install` run if this is a fresh worktree; see the Phase 1 plan's notes on this if `yarn dev` fails to launch Electron. For **Dark**, then **Light**, then **Dracula**:
1. Oblique footage → Control Points: markers show that theme's distance colours (Task 4).
2. Processing (with a video that supports LSPIV/STIV/iWave): the three technique rows' colour swatches are palette B and distinguishable in all three themes (Task 6).
3. Results, with 2+ techniques run: the technique legend's colour dots are palette B, and no technique swatch is ever the same colour as the "Bad"/error red or "Good"/success green shown elsewhere on the same screen (Task 2/7's separation guarantee).
4. If an iWave spectrum was computed: the spectrum viewer's overlay lines/badge use the iWave palette colour, consistent with the legend (Task 5).

- [ ] **Step 3: Report back**

Summarise for the product owner:
- the commits on `ui/design-refresh` since Phase 1's tip, including the two controller-side fix commits this run needed (a `Co-Authored-By` trailer amend pattern that recurred across several tasks, and the Tasks-1/2 prettier-formatting fix)
- test/TypeScript/lint numbers versus this plan's baseline
- the specific, intentional visual changes in light/dracula (oblique control points, technique legend colours) versus Phase 1's "no visual change" — flag these clearly as fixes, not regressions
- the one deferred Minor from Task 2 (STIV-vs-warning-color not directly asserted by the separation test, though the actual values are correct and verified)
- the fact that this plan document itself was reconstructed after being lost from the untracked working tree partway through Task 6, and that a future phase's plan should be written to a location Git actually tracks, or committed immediately after being written, so this can't happen again
- anything from the manual walkthrough that looked different from the expectations above

Do not merge or push. The product owner decides when `ui/design-refresh` goes into `river-labs`.

---

## Out of scope (later phases or explicitly not touched here, do not start here)

- **The rest of `COLORS`** (`RED`, `GREEN`, `YELLOW`, `BLUE`, `LIGHT_BLUE`, `DARK_GREY`, `WHITE`, `BLACK`, `TRANSPARENT_WHITE`, `TRANSPARENT`, `PERCENTILE_AREA`, `PERCENTILE_STROKE`, `STD_AREA`, `STD_STROKE`, `MARK_NUMBER`, `MARK_L`, `MARK_R`, `ELLIPSE`) is untouched. `MARK_NUMBER`/`MARK_L`/`MARK_R` are pin colours — the audit's *Canvas overlays* section (pins, precise crosshair, red-left/green-right) is Phase 3 work and pin colours belong with that redesign, not a token-only phase. `PERCENTILE_AREA`/`PERCENTILE_STROKE`/`STD_AREA`/`STD_STROKE` are fixed-opacity alpha blends derived from specific hex values, not direct duplicates of a theme token — routing them through the live theme is a real design decision (what should a 25%-opacity STIV uncertainty band look like in light mode?) that belongs with Phase 3's Results-panel work, not this plan. `WHITE`/`BLACK`/`TRANSPARENT`/`DARK_GREY` are not theme-identity colours.
- **`.warning`'s background still reads `var(--d14)` instead of `var(--warning-color)`.** These two tokens are identical in dark and dracula but differ in light (`--d14: #F5BF61` — not theme-adapted; `--warning-color: #A97A2E` — properly tuned for light backgrounds). Switching `.warning` to `--warning-color` is a real, correct fix, but it changes what the warning bar looks like in light mode specifically, which this plan's task list doesn't include and which belongs with Phase 4's message-system work (the same phase already reworking `.warning`/`.error`/`.info` more broadly).
- **`--radius-*`/`--space-*`/`--motion-*` have zero consumers after this plan.** That's intentional — Phase 3 is where components start being built against them. Do not "wire them up" to any existing selector as part of this plan; that would be exactly the kind of scope creep the Global Constraints warn against.
- **The `--accent` name from the audit mockup's CSS is not added as a new alias.** The app's real accent token is `--accent-color` (present since before this plan and unchanged by it); the mockup used `--accent` as shorthand for illustration purposes. Adding a second, redundant name for the same value would only create ambiguity about which one Phase 3 should use — Phase 3 uses `--accent-color`.
