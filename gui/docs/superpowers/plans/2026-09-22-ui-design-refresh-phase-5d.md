# UI Design Refresh — Phase 5d (Type scale) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce the audit's Outfit display font and apply it to the two places in the app where a prominent heading/number is rendered as plain text: every wizard screen's shared title (`.form-title`, all 9 screens via `FormHeader.tsx`) and the exported report's title/discharge banner (`.header-title-text`).

**Architecture:** No display font exists anywhere in this codebase today — every heading, including `.form-title`, currently has no explicit `font-family`/`font-size`/`font-weight` at all and simply falls back to the browser's default `<h1>` styling (confirmed by reading `src/components/Forms/form.css` and `src/components/Report/report.css`: `.form-title` is only `margin-top: 6vh`, `.header-title-text` is only `color: #FFFFFF`). The audit calls for a distinct "display" typeface (Outfit) for large numbers and screen titles, kept separate from the interface font (Inter, unchanged, used everywhere else via the existing global `* { font-family: Inter, ... }` rule). Task 1 bundles `@fontsource/outfit` the same way `@fontsource/inter` is already bundled (an import in `main.tsx`, not a runtime Google Fonts fetch), adds one new theme-invariant `--font-display` token alongside Phase 2's existing scale-token block in `src/index.css`, and applies it to `.form-title` (24px/700, the audit's "screen title" size) — this one shared component change reaches all 9 screens that use `FormHeader`. Task 2 applies the same `--font-display`/700-weight treatment to the report's `.header-title-text`, the one place in the live app where a genuinely large, prominent number (the river@site title and "Total Q: X.XX {unit}") renders as plain HTML text rather than inside a D3 chart — this plan does not invent a new "big number" element inside `Results.tsx`/`AllInOne.tsx` to match the audit mockup's imagined 40px readout, since no such plain-text element exists there today (the discharge value is drawn inside a D3 SVG chart); a scope decision made with the product owner on 2026-09-22. Task 2 leaves the report's existing dynamic shrink-to-fit `titleFontSize` inline-style logic (for long river/site names) completely untouched — only `font-family`/`font-weight` change, not `font-size`.

**Tech Stack:** React 18 + TypeScript, `@fontsource/outfit` (new dependency, bundled the same way `@fontsource/inter` already is — no runtime Google Fonts fetch, no `<link>` tags), plain CSS with the existing theme-invariant scale-token block (`src/index.css`'s bare `:root`, Phase 2's home for tokens that don't vary per `[data-theme]`), Jest 29 with ts-jest (`testEnvironment: "node"`, no DOM — source-text tests under `src/helpers/`, matching `src/helpers/techniqueRowCss.test.ts`'s established pattern).

**Spec:** RIVeR Design Audit artifact — https://claude.ai/code/artifact/02bcbe1c-e016-4d2e-9b66-d1bc80f31dcb (§ Rollout, Phase 5: *"…the type scale everywhere…"*; § Tokens → "Type scale": Outfit 700 for the big highlighted number (40px) and screen titles (24px), Inter for everything else — *"Outfit matches the rounded letters of the logo. Bundle it with `@fontsource/outfit` so it works offline."*). Scope decision made with the product owner on 2026-09-22, after confirming by reading the live code that `.form-title` and the report's `.header-title-text` are the only two places a prominent heading/number exists as plain text (everything else matching the mockup's "big number" concept is drawn inside a D3 chart): apply Outfit 700 to both of those two real elements; do not invent a new big-number HTML element elsewhere to force a literal match to the mockup's 40px specimen.

## Global Constraints

- Base branch for this plan is `ui/design-refresh` itself, at Phase 5c's tip (`fa98984`). Never commit to `river-labs`/`main`.
- Commits: short imperative message, ending with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Author email must be `antoine.patalano@gmail.com`.
- Baseline on this plan's base commit (`fa98984`): run `npx jest`, `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`, and `npm run lint` before Task 1 and record the counts. None of these three may get worse after either task. **Run project-wide `npm run lint` (not just the files a task touches) after every task.**
- Only the `700` weight of Outfit is bundled — this plan has no use for any other weight, and importing unused weights only grows the offline bundle for nothing.
- The interface font (Inter, the existing global `* { font-family: Inter, ... }` rule in `src/index.css`) is not touched by this plan — `--font-display` is additive, used only by the two rules this plan edits.
- The report's existing dynamic `titleFontSize` shrink-to-fit inline-style logic (`src/components/Report/Header.tsx`) must not change — this plan only touches `font-family`/`font-weight` in CSS, never `font-size`, for `.header-title-text`.
- All paths below are relative to `gui/` unless prefixed with `/`.

---

## File map

| File | Responsibility in this phase |
|---|---|
| `package.json` | New `@fontsource/outfit` dependency |
| `src/main.tsx` | Import the bundled Outfit 700 font file |
| `src/index.css` | New `--font-display` theme-invariant token, alongside Phase 2's other bare-`:root` scale tokens |
| `src/components/Forms/form.css` | `.form-title` gains explicit Outfit 700/24px styling |
| `src/helpers/formTitleTypeScale.test.ts` (create) | Source-text assertions for Task 1 |
| `src/components/Report/report.css` | `.header-title-text` gains explicit Outfit 700 styling (family/weight only, no size change) |
| `src/helpers/reportTitleTypeScale.test.ts` (create) | Source-text assertions for Task 2 |

---

## Task 1: Bundle Outfit and style the shared screen-title heading

**Files:**
- Modify: `package.json`
- Modify: `src/main.tsx`
- Modify: `src/index.css`
- Modify: `src/components/Forms/form.css`
- Test: `src/helpers/formTitleTypeScale.test.ts` (create)

**Interfaces:**
- Produces: `--font-display` CSS custom property, available globally (declared on a bare `:root`, like every other Phase 2 scale token) for Task 2 to reuse.

- [ ] **Step 1: Write the failing test**

Create `src/helpers/formTitleTypeScale.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

const main = readFileSync(join(__dirname, '..', 'main.tsx'), 'utf8');
const index = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');
const formCss = readFileSync(join(__dirname, '..', 'components', 'Forms', 'form.css'), 'utf8');
const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'));

describe('Outfit display font powers the shared screen-title heading', () => {
  it('bundles the Outfit font instead of loading it at runtime', () => {
    expect(pkg.dependencies['@fontsource/outfit']).toBeDefined();
    expect(main).toMatch(/@fontsource\/outfit\/700\.css/);
    expect(main).not.toMatch(/fonts\.googleapis\.com/);
  });

  it('declares a --font-display token, leaving the interface font untouched', () => {
    expect(index).toMatch(/--font-display:\s*'Outfit'/);
  });

  it('.form-title uses the display font at 24px/700', () => {
    const match = formCss.match(/\.form-title\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/font-family:\s*var\(--font-display\)/);
    expect(match![1]).toMatch(/font-size:\s*24px/);
    expect(match![1]).toMatch(/font-weight:\s*700/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/formTitleTypeScale.test.ts`
Expected: FAIL — `@fontsource/outfit` isn't a dependency yet, `--font-display` doesn't exist, and `.form-title` has no font styling.

- [ ] **Step 3: Add the dependency**

Run: `npm install @fontsource/outfit@^5.2.8`

This adds `@fontsource/outfit` to `package.json`'s `dependencies` (alongside the existing `@fontsource/inter`) and updates `package-lock.json`.

- [ ] **Step 4: Import the font file**

In `src/main.tsx`, add this line immediately after the existing `@fontsource/inter` imports:

```ts
import '@fontsource/outfit/700.css';
```

- [ ] **Step 5: Add the `--font-display` token**

In `src/index.css`, replace:

```css
  /* Motion */
  --motion-fast:  120ms;
  --motion-base:  200ms;
  --motion-slow:  320ms;
  --motion-ease:  cubic-bezier(.2,0,0,1);
```

with:

```css
  /* Motion */
  --motion-fast:  120ms;
  --motion-base:  200ms;
  --motion-slow:  320ms;
  --motion-ease:  cubic-bezier(.2,0,0,1);

  /* Type — Outfit for prominent headings/numbers (bundled via @fontsource/outfit,
     matching how @fontsource/inter is bundled rather than loaded at runtime).
     Body/interface text stays on the existing global Inter stack, untouched. */
  --font-display: 'Outfit', 'Avenir Next', system-ui, sans-serif;
```

- [ ] **Step 6: Style `.form-title`**

In `src/components/Forms/form.css`, replace:

```css
.form-title {
    margin-top: 6vh;
}
```

with:

```css
.form-title {
    margin-top: 6vh;
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 700;
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx jest src/helpers/formTitleTypeScale.test.ts`
Expected: PASS

- [ ] **Step 8: Run the full suite, typecheck and lint**

Run: `npx jest`, `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`, `npm run lint`
Expected: all tests pass; tsc error count and lint problem count match (or improve on) the baseline recorded in Global Constraints.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/main.tsx src/index.css src/components/Forms/form.css src/helpers/formTitleTypeScale.test.ts
git commit -m "$(cat <<'EOF'
Bundle the Outfit display font and style the shared screen title

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Style the exported report's title/discharge banner

**Files:**
- Modify: `src/components/Report/report.css`
- Test: `src/helpers/reportTitleTypeScale.test.ts` (create)

**Interfaces:**
- Consumes: `--font-display` from Task 1 (already globally available once Task 1 lands).

- [ ] **Step 1: Write the failing test**

Create `src/helpers/reportTitleTypeScale.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

const css = readFileSync(join(__dirname, '..', 'components', 'Report', 'report.css'), 'utf8');

describe("The exported report's title/discharge banner uses the display font", () => {
  it('.header-title-text uses the display font at weight 700, without touching its font-size', () => {
    const match = css.match(/\.header-title-text\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/font-family:\s*var\(--font-display\)/);
    expect(match![1]).toMatch(/font-weight:\s*700/);
    expect(match![1]).not.toMatch(/font-size/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/reportTitleTypeScale.test.ts`
Expected: FAIL — `.header-title-text` has no font styling yet.

- [ ] **Step 3: Style `.header-title-text`**

In `src/components/Report/report.css`, replace:

```css
.header-title-text {
    color: #FFFFFF;
}
```

with:

```css
.header-title-text {
    color: #FFFFFF;
    font-family: var(--font-display);
    font-weight: 700;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/helpers/reportTitleTypeScale.test.ts`
Expected: PASS

- [ ] **Step 5: Run the full suite, typecheck and lint**

Run: `npx jest`, `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`, `npm run lint`
Expected: all tests pass; tsc error count and lint problem count match (or improve on) Task 1's counts.

- [ ] **Step 6: Commit**

```bash
git add src/components/Report/report.css src/helpers/reportTitleTypeScale.test.ts
git commit -m "$(cat <<'EOF'
Style the exported report's title and discharge banner with the display font

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Deferred (not in this plan)

- No new "big number" HTML element is added to `Results.tsx`/`AllInOne.tsx` to literally match the audit mockup's 40px discharge specimen — the real discharge readout there is drawn inside a D3 SVG chart, not plain HTML text, and building a duplicate plain-text readout just to carry a font size was judged out of scope for a type-scale pass (scope decision recorded above).
- Technique names, station numbers, unit labels and every other size in the audit's "Type scale" token spec already sit close to Inter's existing sizes in this codebase and are left alone, per the original brainstorming scope decision for this phase.
- This is the last lettered sub-plan of Phase 5 (screen polish: 5a Home tool bar, 5b footage tiles, 5c filmstrip badges, 5d type scale — all done after this plan lands). The manual three-theme Electron walkthrough every prior sub-phase has owed is still owed here too, plus specifically for this phase: confirm Outfit actually renders (not silently falling back to the next font in the stack) in a real Electron window, and confirm `.form-title`'s new 24px/700 size doesn't visually clash with the existing `margin-top: 6vh` spacing on any of the 9 screens now that the text is more prominent than the old browser-default size.
