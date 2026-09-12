# UI Design Refresh — Phase 3b (shared TechniqueRow component) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one `TechniqueRow` component that owns the technique-row visual shell (container, active/hidden state, colour+shape swatch) and use it from both Results' `TechniqueLegend` and Processing's `FormProcessing`, eliminating the CSS duplication between `graphs.css` and `form.css` that Phase 3a had to work around with matching compound selectors in two files.

**Architecture:** A new presentational component, `src/components/TechniqueRow.tsx`, renders a `<div>` (with the shared `technique-row`/`technique-row-active`/`technique-row-hidden` classes and the colour+shape swatch span) around whatever `children` the caller passes, and forwards any other DOM props (`onClick`, `title`, etc.) it's given — so each screen keeps its own interaction model (Results: the row's *label* is the clickable control; Processing: the whole row is) without the component needing to know about it. Its CSS joins `src/components/components.css`, the existing shared stylesheet every other top-level component in `src/components/` already uses (no per-component CSS file exists anywhere in this codebase — matching that convention rather than introducing a new one). The two screens' own trailing controls (Results: eye-toggle, seed-flag, band glyphs; Processing: median/STIV/iWave switches, angle-reset) are untouched — they become `children` of `TechniqueRow` instead of siblings inside a hand-rolled `<div>`.

**Tech Stack:** Same as Phases 1-3a — React 18 + TypeScript, plain CSS with `[data-theme]` custom properties and Phase 2's scale tokens, Jest 29 (`testEnvironment: "node"`, no DOM — this codebase has no React-rendering test anywhere; every existing test parses source/CSS text or calls pure functions, so `TechniqueRow`'s only directly-testable surface is the pure class-name-building logic it's built on, same as every other component test gap in this codebase).

**Spec:** RIVeR Design Audit artifact — https://claude.ai/code/artifact/02bcbe1c-e016-4d2e-9b66-d1bc80f31dcb (*Components* → "Technique picker": *"replaces TechniqueLegend, technique-row-processing … Every row is the same object and can be reached with the keyboard."*; *Findings* → the `.technique-row`/`.technique-row-processing` duplication finding; *Rollout* → "3 · Buttons, fields, techniques": *"Build one `TechniqueRow` for Processing and Results…"*). Scope decision made with the product owner during Phase 3a's planning (2026-09-11): **shared visual shell, separate behaviour** — one component owns the look, each screen keeps its own click/select logic via `children` and forwarded props, rather than one fully unified interactive component. Phase 3a already fixed the "active technique turns white" bug and added the circle/square/triangle swatch shapes this plan builds on; this plan does not touch technique colours or shapes, only consolidates the row's structural CSS and JSX into one component.

## Global Constraints

- Base branch for this plan is `ui/design-refresh` itself (Phase 3a's tip). Never commit to `river-labs`/`main`.
- **Do not change any screen's interaction model.** Results' technique *name* stays the sole clickable "activate" control (siblings — eye button, seed flag, band glyphs — stay independently clickable, untouched). Processing's whole *row* stays clickable (its trailing switches/buttons keep their existing `event.stopPropagation()` calls). `TechniqueRow` must not add a `role`, `tabIndex`, `onClick`, or `onKeyDown` of its own — those stay exactly as each caller already wires them today, via `children` and forwarded props.
- **Do not change any visual outcome.** Every colour, shape, spacing, and state (active/hidden/disabled/unavailable) must render pixel-identical to Phase 3a's tip — this plan is a structural consolidation, not a redesign. Where this plan's own consolidation happens to fix a *latent* cross-file CSS-specificity risk (the same class of bug Phase 3a's final review found and fixed for `--surface-raised`), fix it — call it out in the task, don't hide it.
- No per-component CSS file. `TechniqueRow.tsx` imports `./components.css`, matching every other component in `src/components/` (verified: none of the ~38 existing top-level `.tsx` files there has its own dedicated `.css` file).
- Commits: short imperative message. This session's commits end with a `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` trailer (a session-level attribution policy that overrode this project's usual no-trailer convention partway through Phase 3a — see that phase's final report; keep doing it for consistency within this branch until told otherwise). Author email must be `antoine.patalano@gmail.com`.
- Baseline on this plan's base commit (`15964c8`, tip of Phase 3a on `ui/design-refresh`): `npx jest` → 30 suites, 374 tests, all passing; `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"` → 64 (pre-existing, unrelated); `npm run lint` → 24 problems (21 errors, 3 warnings). None of these may get worse. **Run project-wide `npm run lint` (not just the files a task touches) after every task** — Phase 3a's Task 4 shipped a lint regression that only project-wide `npm run lint` caught, not a scoped check.
- All paths below are relative to `gui/` unless prefixed with `/`.

---

## File map

| File | Responsibility in this phase |
|---|---|
| `src/helpers/techniqueRowClassName.ts` (create) | Pure function building the row's className from active/hidden/extra-class inputs |
| `src/helpers/techniqueRowClassName.test.ts` (create) | Unit tests for that function |
| `src/components/TechniqueRow.tsx` (create) | The shared component: container + swatch, forwards `children` and other div props |
| `src/helpers/techniqueRowCss.test.ts` (create) | Parses `components.css` for the new shared rules |
| `src/components/components.css` | New shared `.technique-row`/`.technique-row-active`/`.technique-row-hidden`/`.technique-swatch` (+ shape) rules |
| `src/components/Graphs/TechniqueLegend.tsx` | Renders through `TechniqueRow` instead of a hand-rolled `<div>` |
| `src/components/Graphs/graphs.css` | Remove the now-duplicated `.technique-row`/`.technique-swatch` rules (Results-specific extras stay) |
| `src/components/Forms/FormProcessing.tsx` | All three technique rows render through `TechniqueRow` |
| `src/components/Forms/form.css` | Remove the now-dead `.technique-swatch-processing` family and the duplicated container/active-background rules; keep Processing-only modifiers (cursor, disabled, unavailable, field-title) |
| `src/helpers/techniqueActiveColor.test.ts` | Update the two assertions that named the old per-file selectors/files |

---

### Task 1: `buildTechniqueRowClassName` helper

**Files:**
- Create: `src/helpers/techniqueRowClassName.ts`
- Create: `src/helpers/techniqueRowClassName.test.ts`

**Interfaces:**
- Produces: `buildTechniqueRowClassName(options: { active?: boolean; hidden?: boolean; className?: string }): string`. Consumed by Task 2's `TechniqueRow.tsx`.

Background: this project has no React-rendering test setup (`testEnvironment: "node"`, no jsdom/RTL anywhere), so `TechniqueRow`'s only unit-testable logic is extracted into a plain function first, TDD'd on its own, and the component becomes a thin wrapper around it.

- [ ] **Step 1: Write the failing test**

Create `src/helpers/techniqueRowClassName.test.ts`:

```ts
import { buildTechniqueRowClassName } from './techniqueRowClassName';

describe('buildTechniqueRowClassName', () => {
  it('returns just the base class when nothing else is set', () => {
    expect(buildTechniqueRowClassName({})).toBe('technique-row');
  });

  it('appends technique-row-active when active', () => {
    expect(buildTechniqueRowClassName({ active: true })).toBe('technique-row technique-row-active');
  });

  it('appends technique-row-hidden when hidden', () => {
    expect(buildTechniqueRowClassName({ hidden: true })).toBe('technique-row technique-row-hidden');
  });

  it('appends a caller-supplied extra class', () => {
    expect(buildTechniqueRowClassName({ className: 'technique-row-processing' })).toBe(
      'technique-row technique-row-processing'
    );
  });

  it('combines active, hidden and an extra class, in that order', () => {
    expect(buildTechniqueRowClassName({ active: true, hidden: true, className: 'technique-row-processing' })).toBe(
      'technique-row technique-row-active technique-row-hidden technique-row-processing'
    );
  });

  it('omits falsy active/hidden without leaving stray spaces', () => {
    expect(buildTechniqueRowClassName({ active: false, hidden: false, className: '' })).toBe('technique-row');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest src/helpers/techniqueRowClassName.test.ts`
Expected: FAIL — `techniqueRowClassName.ts` doesn't exist yet (module-not-found).

- [ ] **Step 3: Write the implementation**

Create `src/helpers/techniqueRowClassName.ts`:

```ts
/**
 * Builds the shared TechniqueRow container's className: the base row class,
 * plus `technique-row-active`/`technique-row-hidden` state modifiers, plus
 * whatever screen-specific class the caller passes through (e.g.
 * Processing's `technique-row-processing` cursor/disabled modifiers).
 */
export const buildTechniqueRowClassName = (options: {
  active?: boolean;
  hidden?: boolean;
  className?: string;
}): string =>
  ['technique-row', options.active && 'technique-row-active', options.hidden && 'technique-row-hidden', options.className]
    .filter(Boolean)
    .join(' ');
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx jest src/helpers/techniqueRowClassName.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Type check, lint, full suite**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64
npm run lint 2>&1 | tail -3                                    # still 24 problems
npx jest 2>&1 | tail -4                                        # 31 suites passed
```

- [ ] **Step 6: Commit**

```bash
git add src/helpers/techniqueRowClassName.ts src/helpers/techniqueRowClassName.test.ts
git commit -m "Add buildTechniqueRowClassName helper

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: The `TechniqueRow` component and its shared CSS

**Files:**
- Create: `src/components/TechniqueRow.tsx`
- Create: `src/helpers/techniqueRowCss.test.ts`
- Modify: `src/components/components.css` (append a new section at the end of the file)

**Interfaces:**
- Consumes: `buildTechniqueRowClassName` from Task 1; `Technique` from `../store/section/types`.
- Produces: `TechniqueRow` — a React component with props `{ technique: Technique; active?: boolean; hidden?: boolean; className?: string; children: React.ReactNode } & Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'>`. Not consumed by any screen yet in this task — Tasks 3 and 4 wire it in. This mirrors how Phase 2 added tokens and Phase 3a added `.field-row` ahead of their first consumer.

Background: `TechniqueLegend.tsx` and `FormProcessing.tsx` currently each hand-roll an almost-identical row: a flex container with active/hidden modifier classes, and a swatch `<span>` whose background colour is `var(--tech-<key>)` and whose shape comes from a `technique-swatch-<key>`/`technique-swatch-processing.technique-swatch-<key>` compound selector (added in Phase 3a to dodge a cross-file specificity tie). `TechniqueRow` becomes the one place both screens get this from.

- [ ] **Step 1: Write the failing test**

Create `src/helpers/techniqueRowCss.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The shared TechniqueRow container + swatch rules, consumed by both
 * Results (TechniqueLegend) and Processing (FormProcessing) via the
 * TechniqueRow component. Lives in components.css — the one shared
 * stylesheet every top-level src/components/*.tsx file already uses;
 * this project has no per-component CSS file anywhere.
 */
const css = readFileSync(join(__dirname, '..', 'components', 'components.css'), 'utf8');

const ruleBody = (selector: string): string => {
  const pattern = new RegExp(`${selector.replace(/[.:]/g, '\\$&')}\\s*\\{([^}]*)\\}`);
  const match = css.match(pattern);
  return match ? match[1] : '';
};

describe('shared TechniqueRow CSS', () => {
  it('.technique-row is the shared flex row box', () => {
    const body = ruleBody('.technique-row');
    expect(body).toMatch(/display:\s*flex/);
    expect(body).toMatch(/gap:\s*10px/);
    expect(body).toMatch(/padding:\s*8px 12px/);
    expect(body).toMatch(/border-radius:\s*9px/);
  });

  it('.technique-row:hover uses --on-hover', () => {
    expect(ruleBody('.technique-row:hover')).toMatch(/background-color:\s*var\(--on-hover\)/);
  });

  it('.technique-row.technique-row-active uses --surface-field', () => {
    expect(ruleBody('.technique-row.technique-row-active')).toMatch(
      /background-color:\s*var\(--surface-field\)/
    );
  });

  it('.technique-row-hidden fades the row', () => {
    expect(ruleBody('.technique-row-hidden')).toMatch(/opacity:\s*0\.4/);
  });

  it('.technique-swatch is a 9px marker, shaped per technique', () => {
    const body = ruleBody('.technique-swatch');
    expect(body).toMatch(/width:\s*9px/);
    expect(body).toMatch(/height:\s*9px/);
    expect(ruleBody('.technique-swatch.technique-swatch-lspiv')).toMatch(/border-radius:\s*50%/);
    expect(ruleBody('.technique-swatch.technique-swatch-stiv')).toMatch(/border-radius:\s*2px/);
    expect(ruleBody('.technique-swatch.technique-swatch-iwave')).toMatch(
      /clip-path:\s*polygon\(50% 0, 100% 100%, 0 100%\)/
    );
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest src/helpers/techniqueRowCss.test.ts`
Expected: FAIL — none of these rules exist in `components.css` yet.

- [ ] **Step 3: Add the CSS**

Append to the end of `src/components/components.css`:

```css

/* =============================================================================
   TECHNIQUE ROW (shared shell — Results' TechniqueLegend + Processing's
   FormProcessing render through the TechniqueRow component onto this box).
   Screen-specific extras (Results: .technique-name/.technique-seed-flag/
   .technique-band-glyph/.technique-eye-btn in Graphs/graphs.css; Processing:
   cursor/disabled/unavailable modifiers and .field-title in Forms/form.css)
   stay in their own files — only the row box and the swatch are shared.
   ============================================================================= */
.technique-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 9px;
    transition: background-color 0.14s ease;
}

.technique-row:hover {
    background-color: var(--on-hover);
}

/* Active row keeps its own technique colour (set inline by each caller) and
   gains a background instead of recolouring text — see techniqueActiveColor
   .test.ts. */
.technique-row.technique-row-active {
    background-color: var(--surface-field);
}

.technique-row-hidden {
    opacity: 0.4;
}

.technique-swatch {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
}

/* Compound with .technique-swatch (not a bare class) so shape always wins
   over the base rule's border-radius:50% regardless of rule order. */
.technique-swatch.technique-swatch-lspiv {
    border-radius: 50%;
}

.technique-swatch.technique-swatch-stiv {
    border-radius: 2px;
}

.technique-swatch.technique-swatch-iwave {
    border-radius: 0;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx jest src/helpers/techniqueRowCss.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Write the component**

Create `src/components/TechniqueRow.tsx`:

```tsx
import { HTMLAttributes, ReactNode } from 'react';
import { Technique } from '../store/section/types';
import { buildTechniqueRowClassName } from '../helpers/techniqueRowClassName';
import './components.css';

interface TechniqueRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children'> {
  /** Which technique this row represents — drives the swatch's colour and shape. */
  technique: Technique;
  /** Whether this technique is the active one. Shown via a background and
   *  left to each caller to also reflect in its own label styling (bold
   *  text, inline colour) — TechniqueRow only owns the row's background. */
  active?: boolean;
  /** Whether this technique is currently hidden (Results only). Fades the row. */
  hidden?: boolean;
  /** Extra class(es) the caller wants on the row, e.g. Processing's
   *  `technique-row-processing` (cursor) or `technique-row-processing-disabled`. */
  className?: string;
  /** The row's own content — Results passes its name button + trailing
   *  controls; Processing passes its field-title + trailing controls. Each
   *  screen keeps full ownership of what's clickable and how. */
  children: ReactNode;
}

/**
 * Shared visual shell for a technique picker row (LSPIV/STIV/iWave), used on
 * both Results (TechniqueLegend) and Processing (FormProcessing). Owns the
 * row container, the active/hidden state classes, and the colour+shape
 * swatch. Deliberately does NOT own any interaction (no onClick/role/tabIndex
 * of its own) — the two screens' selection models differ (Results: the name
 * is the clickable control; Processing: the whole row is) and each supplies
 * its own via `children` and forwarded div props (onClick, title, ...rest).
 */
export const TechniqueRow = ({ technique, active = false, hidden = false, className, children, ...rest }: TechniqueRowProps) => (
  <div className={buildTechniqueRowClassName({ active, hidden, className })} {...rest}>
    <span
      className={`technique-swatch technique-swatch-${technique}`}
      style={{ background: `var(--tech-${technique})` }}
    />
    {children}
  </div>
);
```

- [ ] **Step 6: Type check, lint, full suite**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64
npx eslint src/components/TechniqueRow.tsx src/helpers/techniqueRowClassName.ts   # no output
npx jest 2>&1 | tail -4                                        # 32 suites passed
```

- [ ] **Step 7: Commit**

```bash
git add src/components/TechniqueRow.tsx src/helpers/techniqueRowCss.test.ts src/components/components.css
git commit -m "Add the shared TechniqueRow component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Migrate `TechniqueLegend.tsx` (Results) to `TechniqueRow`

**Files:**
- Modify: `src/components/Graphs/TechniqueLegend.tsx`
- Modify: `src/components/Graphs/graphs.css` (remove the now-duplicated rules)

**Interfaces:**
- Consumes: `TechniqueRow` from `../TechniqueRow` (Task 2).
- Produces: nothing new. `FormProcessing.tsx` still uses its own standalone `.technique-row-processing`/`.technique-swatch-processing` CSS untouched until Task 4 — this task does not break Processing.

- [ ] **Step 1: Migrate the JSX**

In `src/components/Graphs/TechniqueLegend.tsx`, add the import:

```tsx
import { TechniqueRow } from '../TechniqueRow';
```

Replace

```tsx
        return (
          <div
            key={key}
            className={`technique-row${visible ? '' : ' technique-row-hidden'}${isActive ? ' technique-row-active' : ''}`}
          >
            <span className={`technique-swatch technique-swatch-${key}`} style={{ background: color }} />
            <button
```

with

```tsx
        return (
          <TechniqueRow key={key} technique={key} active={isActive} hidden={!visible}>
            <button
```

Then, further down in the same block, replace the closing

```tsx
          </div>
        );
      })}
```

with

```tsx
          </TechniqueRow>
        );
      })}
```

(Everything between the name `<button>` and the closing tag — the seed-flag button, the band-glyphs span, and the eye-button — is unchanged; it's still `TechniqueRow`'s `children`. The `color` variable computed just above — `` const color = `var(--tech-${key})`; `` — stays in place and stays used: the swatch's own `style={{ background: color }}` is gone from this file now that `TechniqueRow` renders the swatch internally, but the name button's `style={isActive ? { color } : undefined}` a few lines below is untouched by this edit and still reads it.)

- [ ] **Step 2: Remove the now-duplicated CSS from `graphs.css`**

Replace

```css
.technique-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 9px;
    transition: background-color 0.14s ease;
}

.technique-row:hover {
    background-color: var(--on-hover);
}

/* Active row keeps its own technique colour (set inline in TechniqueLegend.tsx
   via the swatch's and button's style) and gains a background instead of
   recolouring the text to --primary-text-color. */
.technique-row.technique-row-active {
    background-color: var(--surface-field);
}

.technique-row-hidden {
    opacity: 0.4;
}

.technique-swatch {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
}

/* Compound with .technique-swatch (not a bare class) so this always wins
   over .technique-swatch's own border-radius:50% regardless of CSS file
   load order — a bare .technique-swatch-stiv would tie in specificity with
   .technique-swatch and could lose the cascade unpredictably. Mirrored in
   Forms/form.css for .technique-swatch-processing. */
.technique-swatch.technique-swatch-lspiv {
    border-radius: 50%;
}

.technique-swatch.technique-swatch-stiv {
    border-radius: 2px;
}

.technique-swatch.technique-swatch-iwave {
    border-radius: 0;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
}

.technique-name {
```

with

```css
.technique-name {
```

(This deletes the row-container, active-background, hidden, and swatch rules — they now live in `components.css`, added by Task 2 — while keeping everything from `.technique-name` onward, which is Results-specific and stays here.)

- [ ] **Step 3: Type check, lint, full suite**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64
npx eslint src/components/Graphs/TechniqueLegend.tsx           # no output
npx jest 2>&1 | tail -4                                        # 32 suites passed
```

- [ ] **Step 4: Check in the app (Results, all three themes)**

Open a project with LSPIV + STIV + iWave data on Results:
1. The three technique rows look exactly as before Phase 3b — same swatch shapes/colours, same active-row background, same hidden-row fade.
2. Clicking a technique's name still activates it; the eye button, seed flag and σ/%/Q glyphs still work exactly as before (all still independently clickable, none of them accidentally trigger activation).
3. Tab to a technique name — the focus ring still appears only on the name, not the whole row.

- [ ] **Step 5: Commit**

```bash
git add src/components/Graphs/TechniqueLegend.tsx src/components/Graphs/graphs.css
git commit -m "Migrate TechniqueLegend onto the shared TechniqueRow component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Migrate `FormProcessing.tsx` (Processing) to `TechniqueRow`

**Files:**
- Modify: `src/components/Forms/FormProcessing.tsx`
- Modify: `src/components/Forms/form.css` (remove now-dead rules, rename the active-label selector, fix a stale comment, harden one specificity tie)
- Modify: `src/helpers/techniqueActiveColor.test.ts` (update two assertions to the new, consolidated location/selector)

**Interfaces:**
- Consumes: `TechniqueRow` from `../TechniqueRow` (Task 2).
- Produces: nothing new.

Background: this is the higher-risk half of the migration — Processing's rows put `onClick`/`title` on the row itself (not a child button, like Results), have three different "shapes" of trailing content, and one modifier row (`technique-row-processing-disabled`) whose `:hover` override must keep beating the shared `.technique-row:hover` now that the two rules live in different files (the exact class of cross-file specificity tie Phase 3a's final review found and fixed once already for `--surface-raised`).

- [ ] **Step 1: Migrate the three rows' JSX**

In `src/components/Forms/FormProcessing.tsx`, add the import:

```tsx
import { TechniqueRow } from '../TechniqueRow';
```

Replace the LSPIV row

```tsx
            <div
              className={`technique-row-processing${previewMode === 'frames' ? ' technique-row-processing-active' : ''}`}
              title={t('Processing.showLspivFrames')}
              onClick={() => previewMode !== 'frames' && setPreviewMode('frames')}
            >
              <span
                className="technique-swatch-processing technique-swatch-lspiv"
                style={{ background: 'var(--tech-lspiv)' }}
              />
              <h3
                className="field-title"
                style={previewMode === 'frames' ? { color: 'var(--tech-lspiv)' } : undefined}
              >
                LSPIV
              </h3>
              <button
                type="button"
                className={`technique-seed-flag${showMedian ? ' technique-seed-flag-seeded' : ''}${
                  canToggleMedian ? '' : ' technique-flag-off'
                }`}
                title={t('Processing.medianHint')}
                onClick={(event) => {
                  event.stopPropagation();
                  if (canToggleMedian) setShowMedian(!showMedian);
                }}
              >
                {t('Processing.carouselMedia')}
              </button>
            </div>
```

with

```tsx
            <TechniqueRow
              technique="lspiv"
              active={previewMode === 'frames'}
              className="technique-row-processing"
              title={t('Processing.showLspivFrames')}
              onClick={() => previewMode !== 'frames' && setPreviewMode('frames')}
            >
              <h3
                className="field-title"
                style={previewMode === 'frames' ? { color: 'var(--tech-lspiv)' } : undefined}
              >
                LSPIV
              </h3>
              <button
                type="button"
                className={`technique-seed-flag${showMedian ? ' technique-seed-flag-seeded' : ''}${
                  canToggleMedian ? '' : ' technique-flag-off'
                }`}
                title={t('Processing.medianHint')}
                onClick={(event) => {
                  event.stopPropagation();
                  if (canToggleMedian) setShowMedian(!showMedian);
                }}
              >
                {t('Processing.carouselMedia')}
              </button>
            </TechniqueRow>
```

Replace the STIV row

```tsx
            <div
              className={`technique-row-processing${previewMode === 'sti' ? ' technique-row-processing-active' : ''}${
                canToggleSti ? '' : ' technique-row-processing-disabled'
              }${stivAvailable ? '' : ' technique-row-processing-unavailable'}`}
              title={
                !stivAvailable
                  ? t('Processing.stivWeightsMissing')
                  : canToggleSti
                    ? t('Processing.showStivStis')
                    : t('Processing.noStisYet')
              }
              onClick={() => canToggleSti && previewMode !== 'sti' && setPreviewMode('sti')}
            >
              <span
                className="technique-swatch-processing technique-swatch-stiv"
                style={{ background: 'var(--tech-stiv)' }}
              />
              <h3
                className="field-title"
                style={previewMode === 'sti' ? { color: 'var(--tech-stiv)' } : undefined}
              >
                STIV
              </h3>
              {hasAnyStivOverride && (
```

with

```tsx
            <TechniqueRow
              technique="stiv"
              active={previewMode === 'sti'}
              className={`technique-row-processing${canToggleSti ? '' : ' technique-row-processing-disabled'}${
                stivAvailable ? '' : ' technique-row-processing-unavailable'
              }`}
              title={
                !stivAvailable
                  ? t('Processing.stivWeightsMissing')
                  : canToggleSti
                    ? t('Processing.showStivStis')
                    : t('Processing.noStisYet')
              }
              onClick={() => canToggleSti && previewMode !== 'sti' && setPreviewMode('sti')}
            >
              <h3
                className="field-title"
                style={previewMode === 'sti' ? { color: 'var(--tech-stiv)' } : undefined}
              >
                STIV
              </h3>
              {hasAnyStivOverride && (
```

Further down in the same STIV row, replace the closing

```tsx
              <label className="switch" onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={stiv && stivAvailable}
                  disabled={!stivAvailable}
                  onChange={(event) => onUpdateProcessing({ stiv: event.currentTarget.checked })}
                />
                <span className="slider"></span>
              </label>
            </div>
```

with

```tsx
              <label className="switch" onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={stiv && stivAvailable}
                  disabled={!stivAvailable}
                  onChange={(event) => onUpdateProcessing({ stiv: event.currentTarget.checked })}
                />
                <span className="slider"></span>
              </label>
            </TechniqueRow>
```

Replace the iWave row

```tsx
            <div
              className={`technique-row-processing${previewMode === 'iwave' ? ' technique-row-processing-active' : ''}${
                canToggleIwave ? '' : ' technique-row-processing-disabled'
              }`}
              title={canToggleIwave ? t('Processing.showIwaveSpectra') : t('Processing.noSpectraYet')}
              onClick={() => canToggleIwave && previewMode !== 'iwave' && setPreviewMode('iwave')}
            >
              <span
                className="technique-swatch-processing technique-swatch-iwave"
                style={{ background: 'var(--tech-iwave)' }}
              />
              <h3
                className="field-title"
                style={previewMode === 'iwave' ? { color: 'var(--tech-iwave)' } : undefined}
              >
                iWave
              </h3>
```

with

```tsx
            <TechniqueRow
              technique="iwave"
              active={previewMode === 'iwave'}
              className={`technique-row-processing${canToggleIwave ? '' : ' technique-row-processing-disabled'}`}
              title={canToggleIwave ? t('Processing.showIwaveSpectra') : t('Processing.noSpectraYet')}
              onClick={() => canToggleIwave && previewMode !== 'iwave' && setPreviewMode('iwave')}
            >
              <h3
                className="field-title"
                style={previewMode === 'iwave' ? { color: 'var(--tech-iwave)' } : undefined}
              >
                iWave
              </h3>
```

Further down in the same iWave row, replace the closing

```tsx
              <label className="switch" onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={iwave}
                  onChange={(event) => onUpdateProcessing({ iwave: event.currentTarget.checked })}
                />
                <span className="slider"></span>
              </label>
            </div>

            <span className="divider-line mt-2 mb-1" />
```

with

```tsx
              <label className="switch" onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={iwave}
                  onChange={(event) => onUpdateProcessing({ iwave: event.currentTarget.checked })}
                />
                <span className="slider"></span>
              </label>
            </TechniqueRow>

            <span className="divider-line mt-2 mb-1" />
```

- [ ] **Step 2: Remove the now-dead swatch CSS and consolidate the active-background rule in `form.css`**

Replace

```css
/* Same box as the Results module's .technique-row (Graphs/graphs.css) — padding,
   corner radius, everything — so the two selectors read as one shared pattern. */
.technique-row-processing {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 9px;
    cursor: pointer;
    transition: background-color 0.14s ease;
}

.technique-row-processing:hover {
    background-color: var(--on-hover);
}

/* The active row gets a background (see .technique-row-processing-active above)
   and bold text; colour stays the technique's own, set inline in FormProcessing.tsx. */
.technique-row-processing .field-title {
    flex: 1;
    color: var(--secondary-text-color);
}

/* Active row keeps its own technique colour (set inline in FormProcessing.tsx)
   and gains a background plus bold text instead of recolouring to
   --primary-text-color — matches .technique-row-active in Graphs/graphs.css. */
.technique-row-processing.technique-row-processing-active {
    background-color: var(--surface-field);
}

.technique-row-processing-active .field-title {
    font-weight: 700;
}

/* STIV/iWave before their STI images or spectra exist yet — nothing to preview. */
.technique-row-processing-disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.technique-row-processing-disabled:hover {
    background-color: transparent;
}

/* STIV weights not present on disk (see stivAvailable in Processing.tsx) —
   the whole row reads as inactive, not just the preview-click affordance,
   since the toggle itself is disabled too. */
.technique-row-processing-unavailable .field-title {
    color: var(--secondary-text-color);
    opacity: 0.6;
}

.technique-swatch-processing {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
}

/* Compound with .technique-swatch-processing (not a bare class) so this
   always wins over its own border-radius:50% regardless of CSS file load
   order. Mirrors .technique-swatch.technique-swatch-lspiv/stiv/iwave in
   Graphs/graphs.css — same shapes, same class names, different base class. */
.technique-swatch-processing.technique-swatch-lspiv {
    border-radius: 50%;
}

.technique-swatch-processing.technique-swatch-stiv {
    border-radius: 2px;
}

.technique-swatch-processing.technique-swatch-iwave {
    border-radius: 0;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
}
```

with

```css
/* The row's box (padding, corner radius, hover, active background) now
   comes from the shared .technique-row in components.css via the
   TechniqueRow component — this class only adds the whole-row-is-clickable
   cursor Processing needs that Results' rows don't. */
.technique-row-processing {
    cursor: pointer;
}

.technique-row-processing .field-title {
    flex: 1;
    color: var(--secondary-text-color);
}

/* The active row's background comes from the shared .technique-row-active
   in components.css (added by TechniqueRow); this just bolds this screen's
   own label element. Colour stays the technique's own, set inline in
   FormProcessing.tsx. */
.technique-row-active .field-title {
    font-weight: 700;
}

/* STIV/iWave before their STI images or spectra exist yet — nothing to preview. */
.technique-row-processing-disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

/* Compound with .technique-row (not bare) so this keeps beating the shared
   .technique-row:hover in components.css regardless of which file's CSS
   import runs first — the same cross-file specificity tie Phase 3a found
   and fixed once already for the active-row background. */
.technique-row.technique-row-processing-disabled:hover {
    background-color: transparent;
}

/* STIV weights not present on disk (see stivAvailable in Processing.tsx) —
   the whole row reads as inactive, not just the preview-click affordance,
   since the toggle itself is disabled too. */
.technique-row-processing-unavailable .field-title {
    color: var(--secondary-text-color);
    opacity: 0.6;
}
```

- [ ] **Step 3: Update `techniqueActiveColor.test.ts`**

Replace

```ts
  it('form.css does not recolour the active processing row label to --primary-text-color', () => {
    const css = read('components', 'Forms', 'form.css');
    expect(css).not.toMatch(
      /\.technique-row-processing-active \.field-title\s*\{[^}]*color:\s*var\(--primary-text-color\)/
    );
  });

  it('graphs.css and form.css give the active row a background instead', () => {
    expect(read('components', 'Graphs', 'graphs.css')).toMatch(
      /\.technique-row\.technique-row-active\s*\{[^}]*background-color:\s*var\(--surface-field\)/
    );
    expect(read('components', 'Forms', 'form.css')).toMatch(
      /\.technique-row-processing\.technique-row-processing-active\s*\{[^}]*background-color:\s*var\(--surface-field\)/
    );
  });
```

with

```ts
  it('form.css does not recolour the active processing row label to --primary-text-color', () => {
    const css = read('components', 'Forms', 'form.css');
    expect(css).not.toMatch(/\.technique-row-active \.field-title\s*\{[^}]*color:\s*var\(--primary-text-color\)/);
  });

  it('the shared TechniqueRow CSS gives the active row a background instead', () => {
    expect(read('components', 'components.css')).toMatch(
      /\.technique-row\.technique-row-active\s*\{[^}]*background-color:\s*var\(--surface-field\)/
    );
  });

  it('form.css no longer duplicates the row box or the swatch shapes (both now shared via TechniqueRow)', () => {
    const css = read('components', 'Forms', 'form.css');
    expect(css).not.toMatch(/\.technique-swatch-processing/);
    expect(css).not.toMatch(/\.technique-row-processing\s*\{[^}]*display:\s*flex/);
  });
```

(Leave every other `it(...)` block in this file untouched.)

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
npx jest src/helpers/techniqueActiveColor.test.ts   # PASS, 7 tests
npx jest 2>&1 | tail -4                              # 32 suites passed
```

- [ ] **Step 5: Type check, lint**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64
npx eslint src/components/Forms/FormProcessing.tsx              # no output
npm run lint 2>&1 | tail -3                                     # still 24 problems (project-wide, not just this file)
```

- [ ] **Step 6: Check in the app (Processing, all three themes)**

1. The three technique rows (LSPIV/STIV/iWave) look exactly as before: same swatch shapes/colours, same active-row background and bold label, same hover highlight when not disabled.
2. Clicking anywhere on the LSPIV row switches the preview to frames; clicking the "median" seed-flag button does NOT also trigger that (its `stopPropagation` still works).
3. With STIV weights missing (or `canToggleSti` false), the STIV row shows the disabled look (dimmed, `cursor: not-allowed`) and hovering it shows no background highlight — confirming the specificity fix in Step 2 actually holds once `.technique-row:hover` moved to `components.css`.
4. Clicking the STIV angle-reset button or its toggle switch does not change the preview mode (their `stopPropagation` calls still work).

- [ ] **Step 7: Commit**

```bash
git add src/components/Forms/FormProcessing.tsx src/components/Forms/form.css src/helpers/techniqueActiveColor.test.ts
git commit -m "Migrate FormProcessing's technique rows onto the shared TechniqueRow component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Final verification

**Files:** none modified.

- [ ] **Step 1: Full automated check**

```bash
npx jest 2>&1 | tail -5                                          # 32 suites, all passing (374 existing + new)
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"      # 64 or fewer
npm run lint 2>&1 | tail -3                                      # 24 problems or fewer
git log --oneline 15964c8..HEAD                                  # 4 commits
```

- [ ] **Step 2: Walk through the app once per theme**

Run `npm run dev`. For **Dark**, then **Light**, then **Dracula** (switch on Home):
1. Results: technique rows behave and look exactly as they did at the end of Phase 3a.
2. Processing: technique rows behave and look exactly as they did at the end of Phase 3a, including the STIV-disabled hover case from Task 4's Step 6.

- [ ] **Step 3: Report back**

Summarise for the product owner:
- the 4 commits on `ui/design-refresh`
- test, TypeScript and lint numbers versus the baseline
- confirmation that no visual or interaction change occurred anywhere — this phase was a pure consolidation
- the cross-file specificity fix applied to `.technique-row-processing-disabled:hover` in Task 4 (same bug class Phase 3a's final review found once already, caught proactively here before it could recur)

Do not merge or push. The owner decides when `ui/design-refresh` goes into `river-labs`.

---

## Out of scope (later phases, do not start here)

- The `Pin` component (crosshair, magnifier, drag coordinates) → Phase 3c.
- Converting the σ/%/Q band-glyph buttons to written-label chips, or unifying Results'/Processing's *interaction* model (making Processing's whole-row click become Results' name-only click, or vice versa) — not requested by this phase's scope decision.
- The known, still-open Phase 3a findings not owned by this plan: the light-theme active-technique-name contrast gap (token-layer decision), and the iWave triangle marker's size constant (needs a real-browser look).
- Any change to masks, regions, STIV search lines, the colour bar, or the five message kinds → Phase 4.
