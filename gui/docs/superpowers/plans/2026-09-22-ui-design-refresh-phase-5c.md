# UI Design Refresh — Phase 5c (Filmstrip badges) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shrink the large frame number overlaid on every filmstrip thumbnail into a small corner badge, and explain Processing's two-frame ("frame pair") selection with a caption instead of leaving users to guess why two thumbnails are both ringed.

**Architecture:** `src/components/Carousel.tsx`'s `Row` renders `<div className="img-water-mark"> {index + 1}</div>` on every thumbnail in every mode except ipcam; `.img-water-mark` (`components.css`) is currently a 50px, `font-weight: 900`, dead-centre-of-the-thumbnail number. Task 1 restyles that one CSS rule into an 11px badge pinned to the thumbnail's top-right corner — no JSX changes, since the same element already carries the right content and the same class name, it just needs to look different. Task 2 is additive: when `isPairMode` (Processing's PIV pair-frame browsing, `mode==='analize'` — the only mode where two consecutive thumbnails are both highlighted via `.img-carousel-active`/`.img-carousel-second`), render one small caption line reading "Frame pair {{first}}–{{last}}" next to the existing `carousel-info` row (the same place the "N / total" counter already lives), computed from the already-tracked `active` index. Every other mode (STI single-frame browsing, ipcam, cross-section select, pixel-size) shows only the corner badge, unchanged, since only one frame is ever selected there.

**Tech Stack:** React 18 + TypeScript, plain CSS with `[data-theme]` custom properties (`--overlay-text-color`, `--secondary-text-color` already exist — no new tokens), i18next (new key uses inline `defaultValue` with interpolation, matching the existing `Processing.stationsCount: "{{count}} stations"` key's established `{{var}}` convention — no `src/translations/*/global.json` edits), Jest 29 with ts-jest (`testEnvironment: "node"`, no DOM — source-text tests under `src/helpers/`, matching `src/helpers/techniqueRowCss.test.ts`'s established pattern).

**Spec:** RIVeR Design Audit artifact — https://claude.ai/code/artifact/02bcbe1c-e016-4d2e-9b66-d1bc80f31dcb (§ Rollout, Phase 5: *"…filmstrip badges…"*; § Findings: *"Frame numbers cover the filmstrip, and two frames are ringed without explanation — Large numbers over each thumbnail. On Processing, frames 1 and 2 are both ringed. → A small number badge in the corner, and a caption such as 'Frame pair 1–2' when two are selected."*, refs `components/Carousel.tsx`, `components.css:642`). Scope decision made with the product owner on 2026-09-22: `.img-water-mark-ipcam` (a second, already-dead CSS class with zero consumers anywhere in the codebase) is pre-existing dead code, not touched by this plan — out of scope, not a regression to fix here.

## Global Constraints

- Base branch for this plan is `ui/design-refresh` itself, at Phase 5b's tip (`ca9429f`). Never commit to `river-labs`/`main`.
- Commits: short imperative message, ending with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Author email must be `antoine.patalano@gmail.com`.
- Baseline on this plan's base commit (`ca9429f`): run `npx jest`, `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`, and `npm run lint` before Task 1 and record the counts. None of these three may get worse after either task. **Run project-wide `npm run lint` (not just the files a task touches) after every task.**
- No new i18n keys added to any `src/translations/*/global.json` file — the new caption uses `t(key, {defaultValue, ...interpolation})` only.
- Every mode except `analize` (pair mode) must render exactly as it does today, beyond the corner-badge restyle — no new caption, no layout change, for STI/ipcam/select/pixel-size carousels.
- All paths below are relative to `gui/` unless prefixed with `/`.

---

## File map

| File | Responsibility in this phase |
|---|---|
| `src/components/components.css` | `.img-water-mark` restyled from a large centred number to a small corner badge |
| `src/helpers/carouselFrameBadge.test.ts` (create) | Source-text assertions for Task 1 |
| `src/components/Carousel.tsx` | Add the pair-mode "Frame pair" caption |
| `src/helpers/carouselFramePairCaption.test.ts` (create) | Source-text assertions for Task 2 |

---

## Task 1: Shrink the filmstrip frame number into a corner badge

**Files:**
- Modify: `src/components/components.css`
- Test: `src/helpers/carouselFrameBadge.test.ts` (create)

**Interfaces:**
- No JSX/props change — `Carousel.tsx`'s existing `<div className="img-water-mark">{index + 1}</div>` picks up the new look automatically.

- [ ] **Step 1: Write the failing test**

Create `src/helpers/carouselFrameBadge.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

const css = readFileSync(join(__dirname, '..', 'components', 'components.css'), 'utf8');

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ruleBody = (selector: string): string => {
  const match = css.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : '';
};

describe('filmstrip frame number is a small corner badge', () => {
  it('.img-water-mark is a small badge pinned to the corner, not a large centred number', () => {
    const body = ruleBody('.img-water-mark');
    expect(body).toMatch(/font-size:\s*11px/);
    expect(body).toMatch(/top:\s*6px/);
    expect(body).toMatch(/right:\s*6px/);
    expect(body).not.toMatch(/font-size:\s*50px/);
    expect(body).not.toMatch(/left:\s*50%/);
    expect(body).not.toMatch(/transform:\s*translate/);
  });

  it('keeps the z-index needed to out-stack the STI carousel thumbnail', () => {
    expect(ruleBody('.img-water-mark')).toMatch(/z-index:\s*2/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/carouselFrameBadge.test.ts`
Expected: FAIL — `.img-water-mark` is still the large centred 50px number.

- [ ] **Step 3: Restyle `.img-water-mark`**

In `src/components/components.css`, replace:

```css
.img-water-mark {
    position: absolute;
    top: 45%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 50px;
    font-weight: 900;
    color: var(--overlay-text-color);
    width: 100%;
    text-align: center;
    white-space: nowrap;
    /* Must out-stack .img-carousel's z-index: 1. That z-index is inert while the
       container is inline-block (it applies only to positioned elements), but the
       STI carousel's container is a flex box, where z-index DOES apply to flex
       items — so without this the thumbnail paints over the station number. */
    z-index: 2;
}
```

with:

```css
.img-water-mark {
    position: absolute;
    top: 6px;
    right: 6px;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    color: var(--overlay-text-color);
    background: rgba(0, 0, 0, 0.55);
    border-radius: 999px;
    padding: 2px 6px;
    white-space: nowrap;
    /* Must out-stack .img-carousel's z-index: 1. That z-index is inert while the
       container is inline-block (it applies only to positioned elements), but the
       STI carousel's container is a flex box, where z-index DOES apply to flex
       items — so without this the thumbnail paints over the frame badge. */
    z-index: 2;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/helpers/carouselFrameBadge.test.ts`
Expected: PASS

- [ ] **Step 5: Run the full suite, typecheck and lint**

Run: `npx jest`, `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`, `npm run lint`
Expected: all tests pass; tsc error count and lint problem count match (or improve on) the baseline recorded in Global Constraints.

- [ ] **Step 6: Commit**

```bash
git add src/components/components.css src/helpers/carouselFrameBadge.test.ts
git commit -m "$(cat <<'EOF'
Shrink the filmstrip frame number into a corner badge

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Explain Processing's two-frame selection with a caption

**Files:**
- Modify: `src/components/Carousel.tsx`
- Modify: `src/components/components.css`
- Test: `src/helpers/carouselFramePairCaption.test.ts` (create)

**Interfaces:**
- Consumes: `isPairMode` (already computed in `Carousel.tsx` as `mode === 'analize'`) and `active` (existing prop), no new props needed.

- [ ] **Step 1: Write the failing test**

Create `src/helpers/carouselFramePairCaption.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

const tsx = readFileSync(join(__dirname, '..', 'components', 'Carousel.tsx'), 'utf8');
const css = readFileSync(join(__dirname, '..', 'components', 'components.css'), 'utf8');

describe("Processing's paired-frame carousel explains the two-frame selection", () => {
  it('shows a "Frame pair" caption only in pair mode', () => {
    expect(tsx).toMatch(/\{isPairMode && \(/);
    expect(tsx).toMatch(/className="carousel-frame-pair-caption"/);
  });

  it('interpolates the two 1-based frame numbers from the active index', () => {
    expect(tsx).toMatch(/first:\s*active \+ 1/);
    expect(tsx).toMatch(/last:\s*active \+ 2/);
  });

  it('uses a translated key with an inline defaultValue, no locale-file edit needed', () => {
    expect(tsx).toMatch(/t\('Processing\.framePairCaption',\s*\{/);
    expect(tsx).toMatch(/defaultValue:\s*'Frame pair \{\{first\}\}–\{\{last\}\}'/);
  });

  it('.carousel-frame-pair-caption is styled as a small secondary caption', () => {
    const match = css.match(/\.carousel-frame-pair-caption\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/color:\s*var\(--secondary-text-color\)/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/carouselFramePairCaption.test.ts`
Expected: FAIL — none of this markup/CSS exists yet.

- [ ] **Step 3: Add the caption in `Carousel.tsx`**

In `src/components/Carousel.tsx`, replace:

```tsx
          <p> / {images.length} </p>
        </div>
      </div>
      <div className="carousel">
```

with:

```tsx
          <p> / {images.length} </p>
        </div>
      </div>
      {isPairMode && (
        <p className="carousel-frame-pair-caption">
          {t('Processing.framePairCaption', {
            defaultValue: 'Frame pair {{first}}–{{last}}',
            first: active + 1,
            last: active + 2,
          })}
        </p>
      )}
      <div className="carousel">
```

- [ ] **Step 4: Add the caption's CSS**

Append to `src/components/components.css`:

```css
.carousel-frame-pair-caption {
    align-self: center;
    margin-bottom: 6px;
    font-size: 12px;
    color: var(--secondary-text-color);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest src/helpers/carouselFramePairCaption.test.ts`
Expected: PASS

- [ ] **Step 6: Run the full suite, typecheck and lint**

Run: `npx jest`, `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`, `npm run lint`
Expected: all tests pass; tsc error count and lint problem count match (or improve on) Task 1's counts.

- [ ] **Step 7: Commit**

```bash
git add src/components/Carousel.tsx src/components/components.css src/helpers/carouselFramePairCaption.test.ts
git commit -m "$(cat <<'EOF'
Caption Processing's paired-frame carousel selection

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Deferred (not in this plan)

- `.img-water-mark-ipcam`, a second CSS class for a large centred frame-number label, has zero consumers anywhere in the current codebase (confirmed by search) — pre-existing dead code, not removed here since deleting unused CSS unrelated to this plan's own change is out of scope.
- The manual three-theme Electron walkthrough this phase's visual change deserves is owed, same architectural gap as every prior phase (Electron-only renderer, no shell in this environment). If resumed where the real app can run, check: the badge's legibility (11px on a dark translucent pill) against footage of varying brightness in all three themes, and the caption's placement/wrapping in Processing's actual panel width.
