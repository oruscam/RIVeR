# UI Design Refresh — Phase 3c (Pin component with crosshair/magnifier) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every hand-rolled push-pin marker on the image canvas (cross-section L/R, UAV pixel-size points 1/2, Oblique's 4-corner rectification points, ipcam control points, and their static report renderings) with one shared `Pin` drawing module whose needle ends in a precise crosshair, and add a `Magnifier` that appears while a pin is being dragged, so placing a point at pixel precision is actually possible. This also fixes the audit's flagged bug: the left-bank pin's red is currently defined twice, in two different values (`#ED6B57` in `pinRed.svg`, `#FF6C6C` in `createPinsBase64.ts`).

**Architecture:** This codebase draws all canvas overlays with imperative D3 (`d3.select(...).append(...)`), never React — there is no JSX "component" layer to build a `Pin.tsx` into (confirmed: zero existing tests render React output; every test here parses source/CSS text or calls pure functions, matching Phase 3b's finding for `TechniqueRow`). So "the `Pin` component" is a small `src/components/Graphs/` module pair, mirroring the codebase's own `drawMask.ts` (already imported cross-folder by `DrawMask.tsx`, `ConfirmMaskBtn`, etc. — shared drawing helpers already live in `Graphs/` regardless of which screen uses them):
- `pinGeometry.ts` — pure functions computing every part's coordinates (head circle, needle line, crosshair ring, 3 ticks, centre dot) from a tip point and a size divisor. Fully unit-tested.
- `drawPin.ts` — the imperative module: given a d3 selection and a geometry, paints the halo+colour pin and returns the head node so callers attach their own `d3.drag()` (each of the 4 call sites has a different drag/store-dispatch model — same "shared shell, separate behaviour" split Phase 3b used for `TechniqueRow`).
- `magnifierGeometry.ts` — pure functions computing the lens centre (clamped inside the image), the enlarged `<image>`'s crop rect, and the coordinate-readout string. Fully unit-tested.
- `drawMagnifier.ts` — the imperative module: shows/updates/hides a circular lens + coordinate readout, built on `magnifierGeometry.ts`.

Five draw files currently duplicate the pin visual and its colours: `CrossSections/drawSections.ts` (cross-section L/R **and** — via `DrawUav.tsx` passing `module: 'uav'` into the same `drawInteractiveSection`/`drawStaticSection` functions — UAV's pixel-size points 1/2), `Graphs/drawOblique.ts` (Oblique camera's 4-corner rectification quad), `Graphs/drawIpcam.ts` (ipcam control points), `Graphs/obliqueSvg.ts` + `Graphs/ipcamSvg.ts` (the static PDF/report renderings, via the duplicated inline-SVG strings in `Graphs/createPinsBase64.ts`). Each is migrated in its own task onto the two new shared modules, then the now-dead `pin*.svg` assets, `createPinsBase64.ts`, and most of the `MARKS` constant are deleted.

**Scoping decisions (read before starting any task):**
- **The magnifier only appears while an *already-placed* pin is being dragged** (each file's `d3.drag()` on the pin itself), not during the raw click-and-drag gesture that creates the very first two points (cross-sections' initial direction line, UAV's initial line, Oblique's initial default rectangle). Those three gestures are separate root-`<svg>` mouse listeners in `DrawSectionsD3.tsx`/`DrawUav.tsx`/`DrawOblique.tsx` that run before any pin element exists to anchor the lens's guide-line to. This matches what the audit's own mockup demonstrates ("dragging point 2", an existing point) and keeps the change localized to one drag handler per file instead of three.
- **The magnifier renders into the same space as that file's own pins**, not a new shared screen-space layer: `drawSections.ts` already projects its pins into `uiLayer` (constant screen size, via its existing `toScreenFactory`/`toScreenFromZoomFactory`) — the magnifier goes there too, using the same projected point. `drawOblique.ts`/`drawIpcam.ts` draw their pins directly into the pan/zoom-transformed `layer` and keep them a constant *screen* size by dividing every dimension by `scale` — the magnifier does the same (divide `radius`/`distance` by `scale`), so it never needs the `position` (pan offset) plumbed in as a new prop. The lens's internal magnification (how many times larger the cropped pixels appear) is a separate, fixed 4× factor, unaffected by canvas zoom.
- **ipcam's "active" (currently-selected-for-editing) point stops being a third pin colour.** Today it's `pinRed` — but the audit's rule is explicit: "Other points (pixel size, control points) use RIVeR's blue pin," leaving no room for a third ipcam-only red. The active point keeps its blue `point` fill and gains a thin `--accent-color` ring around the head instead (an `active` flag on `drawPin`) — consistent with the audit's "Overlays show state... the accent colour when hovered or selected" rule elsewhere on the canvas. **Flag this specific substitution to the product owner in Task 8's check-in** — it is the one call this plan makes without a literal mockup to point at.
- **Oblique's point 0 stops being red.** Today `drawOblique.ts` hard-codes `i === 0 ? COLORS.RED : COLORS.LIGHT_BLUE` — a legacy "first point" accent, not a left-bank meaning. Per the same "other points... use RIVeR's blue pin" rule, all four Oblique corner points become the `point` (blue) colour. Intentional, called out again in Task 7.
- **Cross-section pin labels shorten from a full translated word to a single letter.** Today the floating badge above the pin shows `t('CrossSections.bankLeft')`/`bankRight` (e.g. "Izquierda"/"Derecha"). The audit's mockup puts a bare **L**/**R** inside the pin's head ("The head also carries L or R, so people who can't tell red from green can still read it") — there is no room in a 24px head for a full word in every language. UAV's pixel-size labels stay the digits `1`/`2`, matching today. This is a deliberate, spec-directed content change — Task 6 removes the `t(...)` calls for this one badge, nothing else.

**Tech Stack:** Same as Phases 1–3b — React 18 + TypeScript, D3 v7 for canvas drawing, plain CSS with `[data-theme]` custom properties, Jest 29 (`testEnvironment: "node"`, no DOM). `pinGeometry.ts` and `magnifierGeometry.ts` are pure and fully unit-tested; `drawPin.ts`/`drawMagnifier.ts` and the five migrated draw files are D3-imperative and — matching every existing draw file in this codebase (`drawSections.ts`, `drawOblique.ts`, `drawIpcam.ts`, `drawMask.ts`, none of which have a test) — are not unit-tested beyond the source-text assertions in Task 9 that guard against the colour-duplication bug recurring.

**Spec:** RIVeR Design Audit artifact — https://claude.ai/code/artifact/02bcbe1c-e016-4d2e-9b66-d1bc80f31dcb. Key passages (§ Canvas overlays, "The tip is the point"): *"Pins keep RIVeR's push-pin shape. The needle ends in a small crosshair whose centre is the exact pixel, and the letter or number sits in the head, well away from the point. While you drag, a magnifier shows the pixels under the tip and the coordinates."* § Findings: *"Pins are defined twice, in two different reds, with a 0.8px needle... There is no magnifier when placing points"* → *"One pin component using pin variables: 1.5px needle, crosshair at the tip, label in the head, magnifier and coordinates while dragging."* § Direction table: *"One pin component using `--pin-left / --pin-right / --pin-point`, a 1.5px needle ending in a crosshair, the letter in the head, and a magnifier with coordinates while dragging."* The exact pixel-level shape (head/needle/crosshair/ticks/centre-dot geometry, and the magnifier's lens/crop/inner-crosshair/readout geometry) is reverse-engineered in Tasks 2 and 4 from the audit's own inline SVG mockups (the "Points & lines" cross-section specimen and the "Pixel size" screen mock, both under this same artifact).

## Global Constraints

- Base branch for this plan is `ui/design-refresh` itself, at Phase 3b's tip (`b3f19c3`). Never commit to `river-labs`/`main`.
- **Canvas overlay colours are theme-tuned, not theme-frozen** — same pattern as the existing `--d12`..`--d34` distance-pair tokens: dark and light theme blocks get today's literal hex values (`#ED6B57`/`#62C655`/`#6CD4FF`/`#808080`), dracula gets dracula-native equivalents (matching its own `--background-error`/`--success-color`/`--tech-lspiv`/`--disabled-button`) so the pins don't clash with dracula's palette. Do not make canvas pin colours identical across all three themes.
- **No behaviour or geometry change beyond what each task states.** Drag mechanics, store dispatches, event names, and which points are draggable when are untouched — only the *visual* pin (icon → crosshair) and its *label content* (Task 6 only) change, plus the new magnifier.
- Commits: short imperative message, ending with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` (continuing this branch's session-level attribution policy from Phase 3a/3b). Author email must be `antoine.patalano@gmail.com`.
- Baseline on this plan's base commit (`b3f19c3`, tip of Phase 3b): `npx jest` → 32 suites, 390 tests, all passing; `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"` → 64 (pre-existing, unrelated); `npm run lint` → 24 problems (21 errors, 3 warnings). None of these may get worse. **Run project-wide `npm run lint` (not just the files a task touches) after every task.**
- All paths below are relative to `gui/` unless prefixed with `/`.

---

## File map

| File | Responsibility in this phase |
|---|---|
| `src/index.css` | New `--pin-left/--pin-right/--pin-point/--pin-muted` tokens (per theme block) and one theme-invariant `--pin-ink` (bare `:root`, alongside the existing scale tokens) |
| `src/helpers/getCSSVar.ts` | New `getPinColors()`, mirroring `getDistanceColors()`/`getTechniqueColors()` |
| `src/helpers/pinColorTokens.test.ts` (create) | CSS-text + function tests for the new tokens and `getPinColors()` |
| `src/components/Graphs/pinGeometry.ts` (create) | Pure geometry for one pin's parts (head/needle/ring/ticks/centre-dot) |
| `src/components/Graphs/pinGeometry.test.ts` (create) | Unit tests for the geometry |
| `src/components/Graphs/drawPin.ts` (create) | Imperative D3 module painting one pin from a geometry + colour + label |
| `src/components/Graphs/magnifierGeometry.ts` (create) | Pure geometry for the lens (centre, crop rect) + coordinate-label formatting |
| `src/components/Graphs/magnifierGeometry.test.ts` (create) | Unit tests for the geometry |
| `src/components/Graphs/drawMagnifier.ts` (create) | Imperative D3 module showing/updating/hiding the lens |
| `src/components/CrossSections/drawSections.ts` | `drawIcon` → `drawPin`; drag handlers gain magnifier show/update/hide |
| `src/components/CrossSections/DrawSectionsD3.tsx` | Threads a new `imageSrc` prop through to `drawInteractiveSection`/`drawStaticSection` |
| `src/components/CrossSections/ImageCrossSections.tsx` | Passes its existing `src` as the new `imageSrc` prop |
| `src/components/DrawUav.tsx` | Threads a new `imageSrc` prop through (reuses `drawSections.ts`, module `'uav'`) |
| `src/components/ImageUavNew.tsx` | Passes its existing `src` as the new `imageSrc` prop |
| `src/components/Graphs/drawOblique.ts` | Pin/badge block → `drawPin`; `dragPoint` gains magnifier show/update/hide; drops the `i===0` red special-case |
| `src/components/DrawOblique.tsx` | Threads a new `imageSrc` prop through |
| `src/components/ImageOblique.tsx` | Passes its existing `src` as the new `imageSrc` prop |
| `src/components/Graphs/drawIpcam.ts` | Pin block → `drawPin` (no label, `active` ring instead of a third colour); `dragPoint` gains magnifier show/update/hide |
| `src/components/DrawIpcam.tsx` | Threads a new `imageSrc` prop through |
| `src/components/ImageIpcam.tsx` | Passes its existing `newImageSrc` as the new `imageSrc` prop |
| `src/components/Graphs/obliqueSvg.ts` | Static report pin rendering → `drawPin` (no drag, no magnifier) |
| `src/components/Graphs/ipcamSvg.ts` | Static report pin rendering → `drawPin` |
| `src/components/Graphs/createPinsBase64.ts` (delete) | Dead once obliqueSvg/ipcamSvg no longer call it |
| `src/assets/icons/pin.svg`, `pinRed.svg`, `pinGreen.svg`, `pinGrey.svg` (delete) | Dead once every `<image href={pin...}>` site is migrated |
| `src/assets/icons/icons.ts` | Drop the four pin exports |
| `src/constants/constants.ts` | `MARKS` shrinks to just `STROKE_WIDTH` (the only field any file still reads once pins move to `pinGeometry.ts`); also drops 4 already-dead fields found along the way (`NUMBER_OFFSET_X/Y`, `NUMBER_OFFSET_X/Y_REPORT` — verified unused anywhere in `src/`) |
| `src/helpers/noDuplicateColorConstants.test.ts` | New assertions guarding the colour-duplication bug fix |

---

### Task 1: Pin & magnifier colour tokens

**Files:**
- Modify: `src/index.css`
- Modify: `src/helpers/getCSSVar.ts`
- Create: `src/helpers/pinColorTokens.test.ts`

**Interfaces:**
- Produces: `getPinColors(): { left: string; right: string; point: string; muted: string; ink: string }`. Consumed by Task 3's `drawPin.ts`.

Background: `pinRed.svg` fills `#ED6B57`, but `createPinsBase64.ts`'s inline `pinRedSVG` fills `#FF6C6C` — the exact duplication the audit's findings flagged. `pin.svg` (`#6CD4FF`), `pinGreen.svg` (`#62C655`) and `pinGrey.svg` (`#808080`) are each single-sourced today only by accident (nothing else defines them a second time yet). All four become one set of tokens, following the same "own set, theme-tuned" pattern Phase 2 used for `--tech-*` and the codebase already uses for `--d12`..`--d34`.

- [ ] **Step 1: Write the failing test**

Create `src/helpers/pinColorTokens.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { getPinColors } from './getCSSVar';

const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');

const themeBlock = (theme: 'dark' | 'light' | 'dracula'): string => {
  const match = css.match(new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!match) throw new Error(`Could not find [data-theme="${theme}"] block in index.css`);
  return match[1];
};

describe('pin colour tokens', () => {
  it('dark and light themes use the historical pin hex values', () => {
    expect(themeBlock('dark')).toMatch(/--pin-left:\s*#ED6B57/);
    expect(themeBlock('dark')).toMatch(/--pin-right:\s*#62C655/);
    expect(themeBlock('dark')).toMatch(/--pin-point:\s*#6CD4FF/);
    expect(themeBlock('dark')).toMatch(/--pin-muted:\s*#808080/);
    expect(themeBlock('light')).toMatch(/--pin-left:\s*#ED6B57/);
    expect(themeBlock('light')).toMatch(/--pin-right:\s*#62C655/);
    expect(themeBlock('light')).toMatch(/--pin-point:\s*#6CD4FF/);
    expect(themeBlock('light')).toMatch(/--pin-muted:\s*#808080/);
  });

  it('dracula uses its own palette instead of the dark/light hex values', () => {
    const dracula = themeBlock('dracula');
    expect(dracula).toMatch(/--pin-left:\s*#ff5555/);
    expect(dracula).toMatch(/--pin-right:\s*#50fa7b/);
    expect(dracula).toMatch(/--pin-point:\s*#8be9fd/);
    expect(dracula).toMatch(/--pin-muted:\s*#6272a4/);
  });

  it('--pin-ink is theme-invariant, declared once in the bare :root scale-token block', () => {
    const rootMatch = css.match(/:root\s*\{([\s\S]*?)\n\}/);
    expect(rootMatch?.[1]).toMatch(/--pin-ink:\s*#0B0D10/);
    // Not redefined per theme.
    expect(themeBlock('dark')).not.toMatch(/--pin-ink/);
    expect(themeBlock('light')).not.toMatch(/--pin-ink/);
    expect(themeBlock('dracula')).not.toMatch(/--pin-ink/);
  });

  it('getPinColors reads the CSS variables with the dark-theme values as fallback', () => {
    // No document/theme element in this jsdom-less test environment, so
    // getCSSVar falls through to each call's fallback — this pins down that
    // every fallback matches the dark theme's literal value.
    expect(getPinColors()).toEqual({
      left: '#ED6B57',
      right: '#62C655',
      point: '#6CD4FF',
      muted: '#808080',
      ink: '#0B0D10',
    });
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest src/helpers/pinColorTokens.test.ts`
Expected: FAIL — none of `--pin-left/right/point/muted/ink` exist yet, and `getPinColors` isn't exported.

- [ ] **Step 3: Add the tokens to `index.css`**

In the bare `:root` block at the top of the file (the "SCALE TOKENS... identical across all three themes" block), add after `--motion-ease`:

```css
  /* Pin ink — the label colour drawn inside a pin's head. Always a near-black,
     since every pin fill (left/right/point) is a light, saturated colour in
     every theme; unlike --pin-left/right/point/muted below, this one value
     works everywhere and isn't redeclared per theme. */
  --pin-ink: #0B0D10;
```

In `[data-theme="dark"]`, immediately after the `/* Control point distance colors */` block (after `--d34: #ED6B57;`), add:

```css

  /* Pin colours — cross-section left/right pins, and the plain "point" pin
     used everywhere else (UAV pixel size, Oblique corners, ipcam control
     points). Historically duplicated as pinRed.svg/pinGreen.svg/pin.svg/
     pinGrey.svg and, separately, createPinsBase64.ts's inline SVG strings —
     with the two reds actually different values (#ED6B57 vs #FF6C6C). One
     set of tokens now. */
  --pin-left:  #ED6B57;
  --pin-right: #62C655;
  --pin-point: #6CD4FF;
  --pin-muted: #808080;
```

In `[data-theme="light"]`, immediately after its own `/* Control point distance colors */` block, add the identical block (same comment, same four values — light theme's distance colours are already "same vivid values as dark theme", and canvas pins follow suit):

```css

  /* Pin colours — same vivid values as dark theme (canvas overlay colours
     read against video footage, not the panel background). */
  --pin-left:  #ED6B57;
  --pin-right: #62C655;
  --pin-point: #6CD4FF;
  --pin-muted: #808080;
```

In `[data-theme="dracula"]`, immediately after its own `/* Control point distance colors (matching Dracula palette) */` block, add:

```css

  /* Pin colours — mapped onto Dracula's own red/green/cyan/comment-grey
     (matching --background-error/--success-color/--tech-lspiv/--disabled-button
     above) instead of the dark/light theme's literal hex values. */
  --pin-left:  #ff5555;
  --pin-right: #50fa7b;
  --pin-point: #8be9fd;
  --pin-muted: #6272a4;
```

- [ ] **Step 4: Add `getPinColors` to `getCSSVar.ts`**

Append to `src/helpers/getCSSVar.ts`:

```ts

/**
 * Returns the Pin component's colours from the current theme's CSS
 * variables. `left`/`right` are the cross-section L/R pins (RIVeR's
 * historical red-left/green-right convention); `point` is the plain pin
 * used everywhere else (UAV pixel size, Oblique corners, ipcam control
 * points); `muted` is an unselected/inactive point (ipcam only); `ink` is
 * the label colour drawn inside every pin's head, the same in all themes.
 */
export const getPinColors = () => ({
  left: getCSSVar('--pin-left', '#ED6B57'),
  right: getCSSVar('--pin-right', '#62C655'),
  point: getCSSVar('--pin-point', '#6CD4FF'),
  muted: getCSSVar('--pin-muted', '#808080'),
  ink: getCSSVar('--pin-ink', '#0B0D10'),
});
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `npx jest src/helpers/pinColorTokens.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Type check, lint, full suite**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64
npx eslint src/helpers/getCSSVar.ts src/helpers/pinColorTokens.test.ts   # no output
npx jest 2>&1 | tail -4                                        # 33 suites passed
```

- [ ] **Step 7: Commit**

```bash
git add src/index.css src/helpers/getCSSVar.ts src/helpers/pinColorTokens.test.ts
git commit -m "Add pin colour tokens (--pin-left/right/point/muted/ink)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Pin geometry (pure, tested)

**Files:**
- Create: `src/components/Graphs/pinGeometry.ts`
- Create: `src/components/Graphs/pinGeometry.test.ts`

**Interfaces:**
- Consumes: `Point` from `../../types`.
- Produces: `getPinGeometry(tip: Point, divisor?: number): PinGeometry` and the exported `PIN_BASE` constants. Consumed by Task 3's `drawPin.ts`.

Background: every part of the pin is reverse-engineered from the audit artifact's own inline SVG mockup (the cross-section "Points & lines" specimen, at `resizeFactor`/`scale` 1 — a red **L** pin with tip at `(112, 252)`):
- Head: `<circle cx="112" cy="218" r="12" .../>` — 34px straight up from the tip, radius 12.
- Needle: halo `<line x1="112" y1="245.5" x2="112" y2="229" stroke-width="4">` + white `stroke-width="1.6"` on top — i.e. it runs from the ring's top edge (`252 - 6.5 = 245.5`) to the head's bottom edge (`218 + 12 = 230`, mockup rounds to 229). The audit's own finding text specifies the needle should be **1.5px**, not the mockup's illustrative 1.6 — this plan uses 1.5.
- Crosshair ring at the tip: halo `<circle r="6.5" stroke-width="4">` + white `stroke-width="1.6"` on top.
- Three ticks (left/right/bottom — **not** top; the needle enters from the top and stands in for a fourth tick): `<line x1="101" x2="104" y1="252" y2="252">` etc., each 3px long starting 1.5px outside the ring's edge (edge at `112-6.5=105.5`, tick starts at `104`... this plan uses the cleaner round numbers 3px length / 1.5px gap, matching this within a sub-pixel rounding difference from the hand-authored mockup), stroke-width 1.4.
- Centre dot: `<circle r="1.5" fill="#fff">` at the exact tip — the pixel that gets saved.
- Label: `<text font-size="13" font-weight="700" fill="#0B0D10">` centred at the head, `y` nudged `+4.5` from the head's centre (the mockup doesn't set `dominant-baseline`, so alphabetic-baseline text needs this nudge to look vertically centred for a 13px label).

`divisor` mirrors how every existing draw file already shrinks marks — `resizeFactor` in `drawSections.ts`'s report case (1.2) and `scale` in `drawOblique.ts`/`drawIpcam.ts` (their pins live inside the pan/zoom-scaled layer and divide every dimension by `scale` to stay a constant screen size). Every dimension below is divided by it; default `1` for `uiLayer`-space pins (`drawSections.ts`'s own cross-section/UAV case), where no such division is needed.

- [ ] **Step 1: Write the failing test**

Create `src/components/Graphs/pinGeometry.test.ts`:

```ts
import { getPinGeometry, PIN_BASE } from './pinGeometry';

describe('getPinGeometry', () => {
  it('exposes the base (divisor=1) constants the geometry is built from', () => {
    expect(PIN_BASE).toEqual({
      HEAD_RADIUS: 12,
      HEAD_OFFSET_Y: 34,
      RING_RADIUS: 6.5,
      TICK_LENGTH: 3,
      TICK_GAP: 1.5,
      NEEDLE_WIDTH: 1.5,
      NEEDLE_HALO_WIDTH: 4,
      RING_WIDTH: 1.6,
      RING_HALO_WIDTH: 4,
      TICK_WIDTH: 1.4,
      CENTER_DOT_RADIUS: 1.5,
      HEAD_HALO_WIDTH: 3,
      HEAD_BORDER_WIDTH: 1.5,
      LABEL_FONT_SIZE: 13,
      LABEL_Y_NUDGE: 4.5,
    });
  });

  it('places the head 34px above the tip and the ring exactly at the tip, at divisor 1', () => {
    const g = getPinGeometry({ x: 100, y: 200 });
    expect(g.head).toEqual({ cx: 100, cy: 166, r: 12 });
    expect(g.ring).toEqual({ cx: 100, cy: 200, r: 6.5 });
    expect(g.centerDot).toEqual({ x: 100, y: 200 });
  });

  it('runs the needle from the head’s bottom edge to the ring’s top edge', () => {
    const g = getPinGeometry({ x: 100, y: 200 });
    // head bottom edge = 166 + 12 = 178; ring top edge = 200 - 6.5 = 193.5
    expect(g.needle).toEqual({ x: 100, y1: 178, y2: 193.5 });
  });

  it('places the left/right/bottom ticks 1.5px outside the ring, 3px long', () => {
    const g = getPinGeometry({ x: 100, y: 200 });
    // ring edge = 100 ± 6.5; tick starts 1.5px past that, runs 3px further out
    expect(g.ticks.left).toEqual({ x1: 92, y1: 200, x2: 89, y2: 200 });
    expect(g.ticks.right).toEqual({ x1: 108, y1: 200, x2: 111, y2: 200 });
    expect(g.ticks.bottom).toEqual({ x1: 100, y1: 208, x2: 100, y2: 211 });
  });

  it('places the label at the head centre, nudged down 4.5px', () => {
    const g = getPinGeometry({ x: 100, y: 200 });
    expect(g.label).toEqual({ x: 100, y: 170.5 });
  });

  it('divides every dimension by the divisor, keeping the tip fixed', () => {
    const g = getPinGeometry({ x: 100, y: 200 }, 2);
    expect(g.head).toEqual({ cx: 100, cy: 183, r: 6 }); // (200 - 34/2), 12/2
    expect(g.ring).toEqual({ cx: 100, cy: 200, r: 3.25 });
    expect(g.needle).toEqual({ x: 100, y1: 189, y2: 196.75 });
    expect(g.ticks.left).toEqual({ x1: 96, y1: 200, x2: 94.5, y2: 200 });
    expect(g.label).toEqual({ x: 100, y: 183 + 2.25 });
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest src/components/Graphs/pinGeometry.test.ts`
Expected: FAIL — `pinGeometry.ts` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `src/components/Graphs/pinGeometry.ts`:

```ts
import { Point } from '../../types';

/**
 * Every pin dimension at divisor=1, reverse-engineered from the RIVeR design
 * audit's own inline SVG mockups (Canvas overlays → "The tip is the point").
 * Needle width is the finding's explicit "1.5px needle" spec, not the
 * mockup's own illustrative 1.6px rounding.
 */
export const PIN_BASE = {
  HEAD_RADIUS: 12,
  HEAD_OFFSET_Y: 34, // vertical distance from the tip to the head's centre
  RING_RADIUS: 6.5,
  TICK_LENGTH: 3,
  TICK_GAP: 1.5, // gap between the ring's edge and where a tick starts
  NEEDLE_WIDTH: 1.5,
  NEEDLE_HALO_WIDTH: 4,
  RING_WIDTH: 1.6,
  RING_HALO_WIDTH: 4,
  TICK_WIDTH: 1.4,
  CENTER_DOT_RADIUS: 1.5,
  HEAD_HALO_WIDTH: 3,
  HEAD_BORDER_WIDTH: 1.5,
  LABEL_FONT_SIZE: 13,
  LABEL_Y_NUDGE: 4.5, // no dominant-baseline set, so alphabetic text needs this to look centred
};

export interface PinGeometry {
  head: { cx: number; cy: number; r: number };
  needle: { x: number; y1: number; y2: number };
  ring: { cx: number; cy: number; r: number };
  ticks: {
    left: { x1: number; y1: number; x2: number; y2: number };
    right: { x1: number; y1: number; x2: number; y2: number };
    bottom: { x1: number; y1: number; x2: number; y2: number };
  };
  centerDot: Point;
  label: Point;
}

/**
 * Computes every part of one pin from its exact tip (the pixel that gets
 * saved) and a size divisor. The pin is always drawn upright — the needle
 * runs straight up from the head to the tip, never rotated to a drag
 * direction, matching the teardrop pin icon this replaces.
 *
 * `divisor` shrinks every dimension while keeping the tip fixed: pass the
 * report's `resizeFactor` for the static PDF pins, or the canvas's pan/zoom
 * `scale` for pins that live inside a scale()-transformed layer (Oblique,
 * ipcam) so they stay a constant screen size. Pass 1 (the default) for pins
 * already living in screen-space (uiLayer), like cross-sections/UAV.
 */
export const getPinGeometry = (tip: Point, divisor: number = 1): PinGeometry => {
  const d = (n: number) => n / divisor;

  const headR = d(PIN_BASE.HEAD_RADIUS);
  const ringR = d(PIN_BASE.RING_RADIUS);
  const headCy = tip.y - d(PIN_BASE.HEAD_OFFSET_Y);
  const tickLen = d(PIN_BASE.TICK_LENGTH);
  const ringEdge = ringR + d(PIN_BASE.TICK_GAP);

  return {
    head: { cx: tip.x, cy: headCy, r: headR },
    needle: { x: tip.x, y1: headCy + headR, y2: tip.y - ringR },
    ring: { cx: tip.x, cy: tip.y, r: ringR },
    ticks: {
      left: { x1: tip.x - ringEdge, y1: tip.y, x2: tip.x - ringEdge - tickLen, y2: tip.y },
      right: { x1: tip.x + ringEdge, y1: tip.y, x2: tip.x + ringEdge + tickLen, y2: tip.y },
      bottom: { x1: tip.x, y1: tip.y + ringEdge, x2: tip.x, y2: tip.y + ringEdge + tickLen },
    },
    centerDot: { x: tip.x, y: tip.y },
    label: { x: tip.x, y: headCy + d(PIN_BASE.LABEL_Y_NUDGE) },
  };
};
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx jest src/components/Graphs/pinGeometry.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Type check, lint, full suite**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64
npx eslint src/components/Graphs/pinGeometry.ts               # no output
npx jest 2>&1 | tail -4                                        # 34 suites passed
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Graphs/pinGeometry.ts src/components/Graphs/pinGeometry.test.ts
git commit -m "Add pinGeometry: pure geometry for the crosshair pin

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: `drawPin` — the imperative D3 module

**Files:**
- Create: `src/components/Graphs/drawPin.ts`

**Interfaces:**
- Consumes: `getPinGeometry`, `PIN_BASE` from `./pinGeometry` (Task 2); `getPinColors` from `../../helpers/getCSSVar` (Task 1); `Point` from `../../types`.
- Produces: `drawPin(options: DrawPinOptions): d3.Selection<SVGGElement, unknown, null, undefined>` — appends one `<g class="pin">` into `options.layer` and returns it, so callers attach their own `d3.drag()` to it (each of the 4 call sites' drag/store model differs — this module owns only the visual, matching Phase 3b's `TechniqueRow` split of shell vs. behaviour). Consumed by Tasks 6–9.

No unit test for this task: it is pure D3-DOM painting with no branch worth asserting on without a renderer (matching `drawSections.ts`'s own untested `drawIcon`) — its correctness is covered by `pinGeometry.test.ts` (the numbers) and the manual per-task browser check-ins (the pixels).

- [ ] **Step 1: Write the module**

Create `src/components/Graphs/drawPin.ts`:

```ts
import * as d3 from 'd3';
import { Point } from '../../types';
import { getPinGeometry, PIN_BASE } from './pinGeometry';
import { getPinColors } from '../../helpers/getCSSVar';

export type PinKind = 'left' | 'right' | 'point' | 'muted';

export interface DrawPinOptions {
  /** Group (or layer) to append the pin into. */
  layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  /** The exact pixel this pin marks — the crosshair's centre. */
  tip: Point;
  kind: PinKind;
  /** Short glyph drawn inside the head (e.g. "L", "R", "1"). Omit for no label. */
  label?: string;
  /** Divides every dimension — see pinGeometry.ts's `getPinGeometry` doc. */
  divisor?: number;
  /** Extra class(es) appended to the root <g>, e.g. for later selection/cleanup. */
  className?: string;
  /** Draws a thin accent ring around the head — ipcam's "currently selected
   *  for editing" state, which no longer gets its own pin colour (see this
   *  plan's scoping decisions). */
  active?: boolean;
}

const HALO = 'rgba(0, 0, 0, 0.6)';
const WHITE = '#fff';

/**
 * Paints one push-pin: a coloured head with an optional label, a needle, and
 * a crosshair at the tip whose centre is the exact pixel. Every stroked part
 * gets a dark halo underneath a white line on top (the audit's "every stroke
 * has a halo" rule), so the pin reads on both bright water and dark shade.
 * Returns the root <g> so the caller can attach drag behaviour to it.
 */
export const drawPin = (options: DrawPinOptions): d3.Selection<SVGGElement, unknown, null, undefined> => {
  const { layer, tip, kind, label, divisor = 1, className = '', active = false } = options;
  const geo = getPinGeometry(tip, divisor);
  const colors = getPinColors();
  const fill = colors[kind];
  const d = (n: number) => n / divisor;

  const g = layer.append('g').attr('class', `pin pin-${kind} ${className}`.trim());

  // Needle: halo then white line, from the head's bottom edge to the ring's top edge.
  g.append('line')
    .attr('x1', geo.needle.x)
    .attr('x2', geo.needle.x)
    .attr('y1', geo.needle.y1)
    .attr('y2', geo.needle.y2)
    .attr('stroke', HALO)
    .attr('stroke-width', d(PIN_BASE.NEEDLE_HALO_WIDTH))
    .attr('stroke-linecap', 'round');
  g.append('line')
    .attr('x1', geo.needle.x)
    .attr('x2', geo.needle.x)
    .attr('y1', geo.needle.y1)
    .attr('y2', geo.needle.y2)
    .attr('stroke', WHITE)
    .attr('stroke-width', d(PIN_BASE.NEEDLE_WIDTH))
    .attr('stroke-linecap', 'round');

  // Crosshair ring at the tip: halo then white ring.
  g.append('circle')
    .attr('cx', geo.ring.cx)
    .attr('cy', geo.ring.cy)
    .attr('r', geo.ring.r)
    .attr('fill', 'none')
    .attr('stroke', HALO)
    .attr('stroke-width', d(PIN_BASE.RING_HALO_WIDTH));
  g.append('circle')
    .attr('cx', geo.ring.cx)
    .attr('cy', geo.ring.cy)
    .attr('r', geo.ring.r)
    .attr('fill', 'none')
    .attr('stroke', WHITE)
    .attr('stroke-width', d(PIN_BASE.RING_WIDTH));

  // Three ticks (left/right/bottom — the needle stands in for the fourth, top, tick).
  ([geo.ticks.left, geo.ticks.right, geo.ticks.bottom] as const).forEach((tick) => {
    g.append('line')
      .attr('x1', tick.x1)
      .attr('y1', tick.y1)
      .attr('x2', tick.x2)
      .attr('y2', tick.y2)
      .attr('stroke', WHITE)
      .attr('stroke-width', d(PIN_BASE.TICK_WIDTH))
      .attr('stroke-linecap', 'round');
  });

  // Centre dot — the exact pixel that gets saved.
  g.append('circle')
    .attr('cx', geo.centerDot.x)
    .attr('cy', geo.centerDot.y)
    .attr('r', d(PIN_BASE.CENTER_DOT_RADIUS))
    .attr('fill', WHITE);

  // Head: halo then coloured fill with a white border, an optional accent
  // ring for "active", then the label.
  if (active) {
    g.append('circle')
      .attr('cx', geo.head.cx)
      .attr('cy', geo.head.cy)
      .attr('r', geo.head.r + d(3))
      .attr('fill', 'none')
      .attr('stroke', 'var(--accent-color, #58B8F0)')
      .attr('stroke-width', d(2));
  }
  g.append('circle')
    .attr('cx', geo.head.cx)
    .attr('cy', geo.head.cy)
    .attr('r', geo.head.r)
    .attr('fill', fill)
    .attr('stroke', HALO)
    .attr('stroke-width', d(PIN_BASE.HEAD_HALO_WIDTH));
  g.append('circle')
    .attr('cx', geo.head.cx)
    .attr('cy', geo.head.cy)
    .attr('r', geo.head.r)
    .attr('fill', fill)
    .attr('stroke', WHITE)
    .attr('stroke-width', d(PIN_BASE.HEAD_BORDER_WIDTH));

  if (label) {
    g.append('text')
      .attr('x', geo.label.x)
      .attr('y', geo.label.y)
      .attr('text-anchor', 'middle')
      .attr('font-size', d(PIN_BASE.LABEL_FONT_SIZE))
      .attr('font-weight', 700)
      .attr('fill', colors.ink)
      .attr('pointer-events', 'none')
      .text(label);
  }

  return g;
};
```

- [ ] **Step 2: Type check, lint**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64
npx eslint src/components/Graphs/drawPin.ts                   # no output
npx jest 2>&1 | tail -4                                        # 34 suites passed (unchanged — no tests added this task)
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Graphs/drawPin.ts
git commit -m "Add drawPin: shared crosshair pin drawing module

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Magnifier geometry (pure, tested)

**Files:**
- Create: `src/components/Graphs/magnifierGeometry.ts`
- Create: `src/components/Graphs/magnifierGeometry.test.ts`

**Interfaces:**
- Consumes: `Point` from `../../types`.
- Produces: `getMagnifierLensCenter(...)`, `getMagnifierGeometry(...)`, `formatPinCoordinates(...)`. Consumed by Task 5's `drawMagnifier.ts`.

Background, reverse-engineered from the audit's "Pixel size · dragging point 2" mockup (lens centred at `(648, 128)`, radius 58, point at `(779, 247)`, image resize `factor`≈`0.577`, readout text `"x 1735.1 · y 551.2 px"`):
- **Lens placement:** offset up and toward the horizontal centre of the image from the point, clamped so the full lens stays inside the image bounds — the same "prefer the side closer to the image centre" heuristic `drawSections.ts`'s `drawSectionLabel` already uses for section labels.
- **Crop rect:** the magnifier's own `<image>` is the *same* frame image, scaled by a fixed `zoom` factor (4×, independent of canvas pan/zoom) and offset so the dragged point lands exactly at the lens centre: `image.x = center.x - point.x * zoom`, `image.y = center.y - point.y * zoom`, `image.width = imageWidth * zoom`, `image.height = imageHeight * zoom`.
- **Coordinate readout:** the point's position in the original image's pixel space — `point * factor`, one decimal place, formatted `"x {X} · y {Y} px"`.

- [ ] **Step 1: Write the failing test**

Create `src/components/Graphs/magnifierGeometry.test.ts`:

```ts
import { getMagnifierLensCenter, getMagnifierGeometry, formatPinCoordinates } from './magnifierGeometry';

describe('getMagnifierLensCenter', () => {
  it('offsets up and toward the horizontal centre of the image, clamped inside the bounds', () => {
    // Point on the right half of an 862x484 image (mirrors the audit's R-pin drag) — the
    // lens should be pulled left, toward the centre.
    const center = getMagnifierLensCenter({ x: 796, y: 257 }, 862, 484, 60, 90);
    expect(center.x).toBeLessThan(796);
    expect(center.y).toBeLessThan(257);
  });

  it('clamps the centre so the full lens stays inside the image, near a corner', () => {
    const center = getMagnifierLensCenter({ x: 5, y: 5 }, 862, 484, 60, 90);
    expect(center.x).toBeGreaterThanOrEqual(60);
    expect(center.y).toBeGreaterThanOrEqual(60);
  });
});

describe('getMagnifierGeometry', () => {
  it('builds an image crop rect that lands the point exactly at the lens centre, at the given zoom', () => {
    const point = { x: 400, y: 200 };
    const geo = getMagnifierGeometry({ point, imageWidth: 862, imageHeight: 484, radius: 60, zoom: 4, distance: 90 });
    expect(geo.radius).toBe(60);
    expect(geo.image.width).toBe(862 * 4);
    expect(geo.image.height).toBe(484 * 4);
    expect(geo.image.x).toBe(geo.center.x - point.x * 4);
    expect(geo.image.y).toBe(geo.center.y - point.y * 4);
  });

  it('defaults to radius 60, zoom 4, distance 90', () => {
    const geo = getMagnifierGeometry({ point: { x: 400, y: 200 }, imageWidth: 862, imageHeight: 484 });
    expect(geo.radius).toBe(60);
    expect(geo.image.width).toBe(862 * 4);
  });
});

describe('formatPinCoordinates', () => {
  it('formats a zoom-space point back into image-pixel space, one decimal place', () => {
    expect(formatPinCoordinates({ x: 796, y: 257 }, 2.2426)).toBe('x 1785.1 · y 576.4 px');
  });

  it('handles factor 1 (no resize)', () => {
    expect(formatPinCoordinates({ x: 100, y: 50 }, 1)).toBe('x 100.0 · y 50.0 px');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest src/components/Graphs/magnifierGeometry.test.ts`
Expected: FAIL — `magnifierGeometry.ts` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `src/components/Graphs/magnifierGeometry.ts`:

```ts
import { Point } from '../../types';

export interface MagnifierGeometry {
  center: Point;
  radius: number;
  image: { x: number; y: number; width: number; height: number };
}

/**
 * Where to put the lens: offset up, and toward the image's horizontal
 * centre from the point (so it tends to land over less-important footage
 * and stay clear of the pin being dragged), clamped so the whole circle
 * stays inside the image bounds. Same "prefer the side closer to centre,
 * then clamp" idea as drawSections.ts's drawSectionLabel.
 */
export const getMagnifierLensCenter = (
  point: Point,
  imageWidth: number,
  imageHeight: number,
  radius: number,
  distance: number
): Point => {
  const towardCenterX = point.x > imageWidth / 2 ? -1 : 1;
  const raw = { x: point.x + towardCenterX * distance * 0.6, y: point.y - distance };
  return {
    x: Math.max(radius, Math.min(imageWidth - radius, raw.x)),
    y: Math.max(radius, Math.min(imageHeight - radius, raw.y)),
  };
};

/**
 * Builds the lens's centre and the crop rect for its zoomed `<image>`. The
 * `<image>` is the same frame image rendered at `zoom`× its normal size and
 * offset so `point` lands exactly at `center` — clipped to a circle of
 * `radius` by the caller (drawMagnifier.ts owns the clip-path element).
 * `zoom` is the lens's own magnification, independent of any canvas
 * pan/zoom the caller may also be applying.
 */
export const getMagnifierGeometry = ({
  point,
  imageWidth,
  imageHeight,
  radius = 60,
  zoom = 4,
  distance = 90,
}: {
  point: Point;
  imageWidth: number;
  imageHeight: number;
  radius?: number;
  zoom?: number;
  distance?: number;
}): MagnifierGeometry => {
  const center = getMagnifierLensCenter(point, imageWidth, imageHeight, radius, distance);
  return {
    center,
    radius,
    image: {
      x: center.x - point.x * zoom,
      y: center.y - point.y * zoom,
      width: imageWidth * zoom,
      height: imageHeight * zoom,
    },
  };
};

/** "x {X} · y {Y} px" in the original image's pixel space (point is in
 *  resized/zoom space; factor undoes the resize), one decimal place each. */
export const formatPinCoordinates = (point: Point, factor: number): string =>
  `x ${(point.x * factor).toFixed(1)} · y ${(point.y * factor).toFixed(1)} px`;
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx jest src/components/Graphs/magnifierGeometry.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Type check, lint, full suite**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64
npx eslint src/components/Graphs/magnifierGeometry.ts         # no output
npx jest 2>&1 | tail -4                                        # 35 suites passed
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Graphs/magnifierGeometry.ts src/components/Graphs/magnifierGeometry.test.ts
git commit -m "Add magnifierGeometry: pure geometry for the drag magnifier

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: `drawMagnifier` — the imperative D3 module

**Files:**
- Create: `src/components/Graphs/drawMagnifier.ts`

**Interfaces:**
- Consumes: `getMagnifierGeometry`, `formatPinCoordinates` from `./magnifierGeometry` (Task 4).
- Produces: `showMagnifier(options): void`, `hideMagnifier(layer): void`. Consumed by Tasks 6–8 (report tasks 9 never call this — no dragging there).

No unit test for this task, same rationale as Task 3 (`drawPin`). Each call to `showMagnifier` that creates a new `<g>` (i.e. the first tick of a drag) mints a fresh, module-scoped `clipCounter`-based id for its `<clipPath>` — safe even if two magnifiers somehow existed at once — and `hideMagnifier` fully removes the `<g>` (and its `<clipPath>`) on drag end so nothing lingers.

- [ ] **Step 1: Write the module**

Create `src/components/Graphs/drawMagnifier.ts`:

```ts
import * as d3 from 'd3';
import { Point } from '../../types';
import { getMagnifierGeometry, formatPinCoordinates } from './magnifierGeometry';

let clipCounter = 0;

export interface MagnifierOptions {
  /** Layer to draw into — the same space the caller's own pins live in
   *  (uiLayer for screen-space pins, or the pan/zoom layer for pins that
   *  divide their own dimensions by `scale`). */
  layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  /** The dragged point, in the same coordinate space as `layer`. */
  point: Point;
  /** Href of the current frame image (the same <img> the page shows behind
   *  the SVG overlay) — cropped and magnified inside the lens. Named to
   *  match every call site's local variable (each interactive file already
   *  calls its own frame-image prop `imageSrc`). */
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  /** Undoes the image's resize factor, for the coordinate readout. */
  coordinateFactor: number;
  /** Divides radius/distance so the lens stays a constant screen size
   *  inside a pan/zoom-scaled layer — same convention as pinGeometry's
   *  `divisor`. Pass 1 for screen-space layers. */
  divisor?: number;
}

/**
 * Shows (creating if needed) a circular magnifier: a dashed guide line to
 * the dragged point, a zoomed crop of the current frame clipped to a
 * circle, an inner crosshair marking the lens's own centre pixel, and a
 * coordinate readout below it. Call again on every 'drag' tick to move it;
 * call hideMagnifier on 'end'.
 */
export const showMagnifier = (options: MagnifierOptions): void => {
  const { layer, point, imageSrc, imageWidth, imageHeight, coordinateFactor, divisor = 1 } = options;
  const d = (n: number) => n / divisor;

  let g = layer.select<SVGGElement>('g.magnifier');
  let clipId = g.attr('data-clip-id');
  if (g.empty()) {
    clipCounter += 1;
    clipId = `magnifier-clip-${clipCounter}`;
    g = layer.append('g').attr('class', 'magnifier').attr('data-clip-id', clipId).attr('pointer-events', 'none');
    g.append('defs').append('clipPath').attr('id', clipId).append('circle');
    g.append('line').attr('class', 'magnifier-guide');
    g.append('circle').attr('class', 'magnifier-backing');
    g.append('image').attr('class', 'magnifier-image');
    g.append('line').attr('class', 'magnifier-arm-left');
    g.append('line').attr('class', 'magnifier-arm-right');
    g.append('line').attr('class', 'magnifier-arm-top');
    g.append('line').attr('class', 'magnifier-arm-bottom');
    g.append('circle').attr('class', 'magnifier-center-ring');
    g.append('circle').attr('class', 'magnifier-border');
    g.append('rect').attr('class', 'magnifier-readout-bg');
    g.append('text').attr('class', 'magnifier-readout-text');
  }

  const radius = d(60);
  const geo = getMagnifierGeometry({ point, imageWidth, imageHeight, radius, zoom: 4, distance: d(90) });
  const { center, image } = geo;

  g.select('clipPath circle').attr('cx', center.x).attr('cy', center.y).attr('r', radius);

  g.select('.magnifier-guide')
    .attr('x1', point.x)
    .attr('y1', point.y)
    .attr('x2', center.x)
    .attr('y2', center.y)
    .attr('stroke', 'rgba(255,255,255,.5)')
    .attr('stroke-width', d(1))
    .attr('stroke-dasharray', '3,3');

  g.select('.magnifier-backing').attr('cx', center.x).attr('cy', center.y).attr('r', radius + d(3)).attr('fill', 'rgba(0,0,0,.65)');

  g.select('.magnifier-image')
    .attr('href', imageSrc)
    .attr('x', image.x)
    .attr('y', image.y)
    .attr('width', image.width)
    .attr('height', image.height)
    .attr('preserveAspectRatio', 'none')
    .attr('clip-path', `url(#${clipId})`);

  // Inner crosshair, proportional to the lens radius (audit mockup: gap and
  // centre-ring radius are 7/64 and 3.2/64 of the lens radius; arms reach
  // exactly to the lens border).
  const gap = radius * (7 / 64);
  const armLen = radius - gap;
  g.select('.magnifier-arm-left').attr('x1', center.x - gap).attr('y1', center.y).attr('x2', center.x - gap - armLen).attr('y2', center.y);
  g.select('.magnifier-arm-right').attr('x1', center.x + gap).attr('y1', center.y).attr('x2', center.x + gap + armLen).attr('y2', center.y);
  g.select('.magnifier-arm-top').attr('x1', center.x).attr('y1', center.y - gap).attr('x2', center.x).attr('y2', center.y - gap - armLen);
  g.select('.magnifier-arm-bottom').attr('x1', center.x).attr('y1', center.y + gap).attr('x2', center.x).attr('y2', center.y + gap + armLen);
  g.selectAll('.magnifier-arm-left, .magnifier-arm-right, .magnifier-arm-top, .magnifier-arm-bottom')
    .attr('stroke', '#fff')
    .attr('stroke-width', d(1.3));

  g.select('.magnifier-center-ring')
    .attr('cx', center.x)
    .attr('cy', center.y)
    .attr('r', radius * (3.2 / 64))
    .attr('fill', 'none')
    .attr('stroke', '#fff')
    .attr('stroke-width', d(1.3));

  g.select('.magnifier-border').attr('cx', center.x).attr('cy', center.y).attr('r', radius).attr('fill', 'none').attr('stroke', '#fff').attr('stroke-width', d(2.5));

  const text = g
    .select<SVGTextElement>('.magnifier-readout-text')
    .attr('x', center.x)
    .attr('y', center.y + radius + d(14))
    .attr('text-anchor', 'middle')
    .attr('font-size', d(11))
    .attr('font-weight', 600)
    .attr('fill', '#fff')
    .text(formatPinCoordinates(point, coordinateFactor));

  try {
    const bbox = (text.node() as SVGTextElement).getBBox();
    const padX = d(6);
    const padY = d(3);
    g.select('.magnifier-readout-bg')
      .attr('x', bbox.x - padX)
      .attr('y', bbox.y - padY)
      .attr('width', bbox.width + padX * 2)
      .attr('height', bbox.height + padY * 2)
      .attr('rx', d(4))
      .attr('fill', 'rgba(10,12,14,.8)');
    (g.select('.magnifier-readout-bg').node() as Element)?.parentNode?.insertBefore(
      g.select('.magnifier-readout-bg').node() as Node,
      text.node()
    );
  } catch {
    // getBBox may fail before the text is attached to a rendered document — skip the backing rect.
  }
};

/** Removes the magnifier entirely — call on drag end. */
export const hideMagnifier = (layer: d3.Selection<SVGGElement, unknown, null, undefined>): void => {
  layer.select('g.magnifier').remove();
};
```

- [ ] **Step 2: Type check, lint**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64
npx eslint src/components/Graphs/drawMagnifier.ts              # no output
npx jest 2>&1 | tail -4                                         # 35 suites passed (unchanged)
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Graphs/drawMagnifier.ts
git commit -m "Add drawMagnifier: shared drag-magnifier drawing module

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Migrate cross-sections (L/R) and UAV pixel-size (1/2)

**Files:**
- Modify: `src/components/CrossSections/drawSections.ts`
- Modify: `src/components/CrossSections/DrawSectionsD3.tsx`
- Modify: `src/components/CrossSections/ImageCrossSections.tsx`
- Modify: `src/components/DrawUav.tsx`
- Modify: `src/components/ImageUavNew.tsx`

**Interfaces:**
- Consumes: `drawPin` (Task 3), `showMagnifier`/`hideMagnifier` (Task 5).
- Produces: `drawStaticSection`/`drawInteractiveSection` gain a new required `imageSrc: string` field on their props object.

Background: `drawIcon` (the teardrop `<image>` + floating badge) is used by both `drawStaticSection` (the non-dragging pins) and `drawInteractiveSection` (the actively-draggable pins, via its two `d3.drag()` behaviours) for two `module`s: `'x-sections'` (cross-section L/R, red/green, letter labels) and `'uav'` (UAV's pixel-size line, always-blue pin, digit labels — reached via `DrawUav.tsx` passing `module: 'uav'` into these same functions, not through `drawOblique.ts`).

- [ ] **Step 1: Replace `drawIcon` with `drawPin` in `drawSections.ts`**

In `src/components/CrossSections/drawSections.ts`, replace the imports:

```ts
import * as d3 from 'd3';
import { t } from 'i18next';
import { COLORS, MARKS } from '../../constants/constants';
import { pinGreen, pinRed, pin } from '../../assets/icons/icons';
```

with:

```ts
import * as d3 from 'd3';
import { COLORS } from '../../constants/constants';
import { drawPin, PinKind } from '../Graphs/drawPin';
import { showMagnifier, hideMagnifier } from '../Graphs/drawMagnifier';
```

Replace the whole `drawIcon` function:

```ts
/**
 * Draw a pin icon (L or R) plus its tiny label (L/R).
 */
const drawIcon = (
  position: Point,
  type: 'L' | 'R',
  layer: d3.Selection<SVGGElement, unknown, null, undefined>,
  draggable: boolean,
  extraClass: string = '',
  module: string
) => {
  const isLeft = type === 'L';
  const href = module === 'uav' ? pin : isLeft ? pinRed : pinGreen;
  const labelColor = module === 'uav' ? COLORS.LIGHT_BLUE : isLeft ? COLORS.RED : COLORS.GREEN;

  const icon = layer
    .append('image')
    .attr('href', href)
    .attr('width', MARKS.WIDTH + 5)
    .attr('height', MARKS.HEIGHT + 5)
    .attr('x', position.x - MARKS.OFFSET_X)
    .attr('y', position.y - MARKS.OFFSET_Y)
    .attr('cursor', draggable ? 'move' : 'default')
    .attr('pointer-events', draggable ? 'all' : 'none')
    .attr('class', `pin-${draggable ? 'draggable' : 'static'} pin-${type} ${extraClass}`.trim());

  const badgeText =
    module === 'uav'
      ? type === 'L'
        ? '1'
        : '2'
      : type === 'L'
        ? t('CrossSections.bankLeft')
        : t('CrossSections.bankRight');
  const badgeWidth = 20;
  const badgeHeight = 16;
  const badgeX = position.x - badgeWidth / 2;
  const badgeY = position.y - MARKS.OFFSET_Y - 14;

  const badge = layer
    .append('g')
    .attr('class', `pin-label-${draggable ? 'draggable' : 'static'} pin-label-${type} ${extraClass}`.trim())
    .attr('pointer-events', 'none');

  badge
    .append('rect')
    .attr('x', badgeX)
    .attr('y', badgeY)
    .attr('width', badgeWidth)
    .attr('height', badgeHeight)
    .attr('rx', 3)
    .attr('ry', 3)
    .attr('fill', 'rgba(50,50,50,0.85)');

  badge
    .append('text')
    .attr('x', position.x)
    .attr('y', badgeY + badgeHeight / 2)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .text(badgeText)
    .attr('font-size', 11)
    .attr('font-weight', '600')
    .attr('fill', labelColor);

  return icon;
};
```

with:

```ts
/**
 * Draw one crosshair pin (L or R for cross-sections, 1/2 for UAV pixel
 * size) via the shared drawPin module. `draggable` only affects
 * pointer-events/cursor — the caller decides whether to attach d3.drag().
 */
const drawIcon = (
  position: Point,
  type: 'L' | 'R',
  layer: d3.Selection<SVGGElement, unknown, null, undefined>,
  draggable: boolean,
  extraClass: string = '',
  module: string
) => {
  const isLeft = type === 'L';
  const kind: PinKind = module === 'uav' ? 'point' : isLeft ? 'left' : 'right';
  const label = module === 'uav' ? (isLeft ? '1' : '2') : isLeft ? 'L' : 'R';

  const g = drawPin({
    layer,
    tip: position,
    kind,
    label,
    className: `pin-${draggable ? 'draggable' : 'static'} pin-${type} ${extraClass}`.trim(),
  });
  g.attr('cursor', draggable ? 'move' : 'default').attr('pointer-events', draggable ? 'all' : 'none');

  return g;
};
```

- [ ] **Step 2: Wire the magnifier into the two draggable pins in `drawInteractiveSection`**

Background on the approach below: `drawPin` returns a `<g>` of several children with coordinates baked in at draw time, unlike the old single `<image>` element the original code could just re-`attr('x'/'y')` on every `'drag'` tick. Repainting that whole `<g>` from scratch on every tick would work, but needlessly churns the DOM mid-gesture — instead, each drag handler applies a `transform="translate(dx,dy)"` to the *existing* `<g>` (`this`, unchanged for the gesture's whole lifetime), computed as the delta between the point's current screen position and the screen position it was originally drawn at. This mirrors the original code's own "mutate the dragged element in place for immediate feedback, let the next React-driven redraw settle the rest" pattern — just swapping an absolute `x`/`y` update for a relative transform, since `drawPin`'s output can't be repositioned any other way.

`drawInteractiveSection` needs the current frame's image URL and its own image dimensions to feed `showMagnifier`. Add `imageSrc` to its props interface:

```ts
interface DrawSvgInteractiveSectionProps {
  layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  uiLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  zoomLayerNode: SVGGElement;
  startPoint: Point | null;
  endPoint: Point | null;
  sectionPoints?: Point[];
  name?: string;
  setMousePressed: (pressed: boolean) => void;
  setStartPoint: (point: Point) => void;
  setEndPoint: (point: Point) => void;
  onSetDirPoints: (data: { points: Point[]; factor: number; index: number; mode?: string }, arg2: any) => void;
  factor: number | { x: number; y: number };
  mousePressed: boolean;
  viewport: {
    imageWidth: number;
    imageHeight: number;
    position: { x: number; y: number };
    scale: number;
  };
  module: string;
  imageSrc: string;
}
```

and destructure it in the function signature:

```ts
const drawInteractiveSection = ({
  layer,
  uiLayer,
  zoomLayerNode,
  startPoint,
  endPoint,
  sectionPoints,
  name,
  setMousePressed,
  setStartPoint,
  setEndPoint,
  onSetDirPoints,
  factor,
  mousePressed,
  viewport,
  module,
  imageSrc,
}: DrawSvgInteractiveSectionProps) => {
```

Replace the `dragStartPoint`/`dragEndPoint` bodies — they currently move the icon and call `setStartPoint`/`setEndPoint` on `'drag'`. Add a magnifier show/update on `'drag'` and a hide on `'end'`. Replace:

```ts
  const dragStartPoint = d3
    .drag<SVGImageElement, unknown, { x: number; y: number }>()
    .container(() => zoomLayerNode) // coordenadas del puntero en zoom-space
    .on('start', () => setMousePressed(true))
    .on('drag', function (event) {
      const x = event.x;
      const y = event.y;

      // Actualiza el modelo en zoom-space
      setStartPoint({ x, y });

      // Mueve el ícono en screen-space inmediatamente
      const pScreen = toScreenFromZoom({ x, y });
      d3.select<SVGImageElement, unknown>(this)
        .attr('x', pScreen.x - MARKS.OFFSET_X)
        .attr('y', pScreen.y - MARKS.OFFSET_Y);
    })
    .on('end', function (event) {
      setMousePressed(false);
      if (endPoint) {
        const x = event.x;
        const y = event.y;
        onSetDirPoints({ points: [{ x, y }, endPoint], factor: factor as number, index: 0 }, null);
      }
    });
```

with:

```ts
  // The screen position each pin was actually drawn at, captured once per
  // render — the fixed point every 'drag' tick's transform is relative to.
  const startScreenAtDraw = startPoint ? toScreenFromZoom(startPoint) : null;

  const dragStartPoint = d3
    .drag<SVGGElement, unknown, { x: number; y: number }>()
    .container(() => zoomLayerNode) // coordenadas del puntero en zoom-space
    .on('start', () => setMousePressed(true))
    .on('drag', function (event) {
      const x = event.x;
      const y = event.y;

      // Actualiza el modelo en zoom-space
      setStartPoint({ x, y });

      // Mueve el pin en screen-space inmediatamente (sin recrearlo — ver nota
      // arriba), y actualiza el magnifier.
      const pScreen = toScreenFromZoom({ x, y });
      if (startScreenAtDraw) {
        d3.select<SVGGElement, unknown>(this).attr(
          'transform',
          `translate(${pScreen.x - startScreenAtDraw.x}, ${pScreen.y - startScreenAtDraw.y})`
        );
      }
      showMagnifier({
        layer: uiLayer,
        point: pScreen,
        imageSrc,
        imageWidth: viewport.imageWidth,
        imageHeight: viewport.imageHeight,
        coordinateFactor: typeof factor === 'number' ? factor : factor.x,
      });
    })
    .on('end', function (event) {
      setMousePressed(false);
      hideMagnifier(uiLayer);
      if (endPoint) {
        const x = event.x;
        const y = event.y;
        onSetDirPoints({ points: [{ x, y }, endPoint], factor: factor as number, index: 0 }, null);
      }
    });
```

Apply the same shape to `dragEndPoint` — replace:

```ts
  const dragEndPoint = d3
    .drag<SVGImageElement, unknown, { x: number; y: number }>()
    .container(() => zoomLayerNode)
    .subject(() => {
      if (endPoint) {
        return { x: endPoint.x, y: endPoint.y };
      } else {
        return { x: 0, y: 0 };
      }
    })
    .on('start', () => setMousePressed(true))
    .on('drag', function (event) {
      const x = event.x;
      const y = event.y;

      setEndPoint({ x, y });

      const pScreen = toScreenFromZoom({ x, y });
      d3.select<SVGImageElement, unknown>(this)
        .attr('x', pScreen.x - MARKS.OFFSET_X)
        .attr('y', pScreen.y - MARKS.OFFSET_Y);
    })
    .on('end', function (event) {
      setMousePressed(false);
      if (startPoint) {
        const x = event.x;
        const y = event.y;
        onSetDirPoints({ points: [startPoint, { x, y }], factor: factor as number, index: 1 }, null);
      }
    });
```

with:

```ts
  const endScreenAtDraw = endPoint ? toScreenFromZoom(endPoint) : null;

  const dragEndPoint = d3
    .drag<SVGGElement, unknown, { x: number; y: number }>()
    .container(() => zoomLayerNode)
    .subject(() => {
      if (endPoint) {
        return { x: endPoint.x, y: endPoint.y };
      } else {
        return { x: 0, y: 0 };
      }
    })
    .on('start', () => setMousePressed(true))
    .on('drag', function (event) {
      const x = event.x;
      const y = event.y;

      setEndPoint({ x, y });

      const pScreen = toScreenFromZoom({ x, y });
      if (endScreenAtDraw) {
        d3.select<SVGGElement, unknown>(this).attr(
          'transform',
          `translate(${pScreen.x - endScreenAtDraw.x}, ${pScreen.y - endScreenAtDraw.y})`
        );
      }
      showMagnifier({
        layer: uiLayer,
        point: pScreen,
        imageSrc,
        imageWidth: viewport.imageWidth,
        imageHeight: viewport.imageHeight,
        coordinateFactor: typeof factor === 'number' ? factor : factor.x,
      });
    })
    .on('end', function (event) {
      setMousePressed(false);
      hideMagnifier(uiLayer);
      if (startPoint) {
        const x = event.x;
        const y = event.y;
        onSetDirPoints({ points: [startPoint, { x, y }], factor: factor as number, index: 1 }, null);
      }
    });
```

The function's final block — where both icons are actually drawn and bound to their drag behaviours — is unchanged from the original file (only `drawIcon`'s internals changed, in Step 1):

```ts
  // Icons in UI (screen-space) — tagged with interactiveUiClass so they are
  // cleaned up on the next render without touching the static label.
  if (startPoint) {
    const pScreen = toScreenFromZoom(startPoint);
    const c1 = drawIcon(pScreen, 'L', uiLayer, true, `${sectionClass} ${interactiveUiClass}`, module);
    c1.call(dragStartPoint as any);
  }

  if (endPoint) {
    const pScreen = toScreenFromZoom(endPoint);
    const c2 = drawIcon(pScreen, 'R', uiLayer, true, `${sectionClass} ${interactiveUiClass}`, module);
    c2.call(dragEndPoint as any);
  }
};
```

(`startScreenAtDraw`/`endScreenAtDraw` must be declared before `dragStartPoint`/`dragEndPoint` respectively, in the same position each `const dragXPoint = d3.drag()...` already occupies in the file — no other reordering needed.)

- [ ] **Step 3: Pass `imageSrc` through `DrawSectionsD3.tsx`**

In `src/components/CrossSections/DrawSectionsD3.tsx`, add `imageSrc` to the component's props type and destructure it:

```tsx
export const DrawSectionsD3 = ({
  width,
  height,
  factor,
  module,
  scale,
  position,
  layers,
  sectionIndex,
  imageSrc,
}: {
  width: number;
  height: number;
  factor: number | { x: number; y: number };
  module: string;
  scale: number;
  position: { x: number; y: number };
  layers: OverlayLayers;
  sectionIndex?: number;
  imageSrc: string;
}) => {
```

In the "Interactive drawing" `useEffect`, add `imageSrc` to the `drawInteractiveSection({...})` call and to its dependency array:

```tsx
    drawInteractiveSection({
      layer: layerSel as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      uiLayer: uiLayerSel as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      zoomLayerNode,
      startPoint,
      endPoint,
      sectionPoints,
      name,
      setMousePressed,
      setStartPoint,
      setEndPoint,
      onSetDirPoints,
      factor,
      mousePressed,
      viewport: {
        imageWidth: width,
        imageHeight: height,
        position,
        scale,
      },
      module: 'x-sections',
      imageSrc,
    });
```

```tsx
  }, [
    startPoint,
    endPoint,
    factor,
    sectionPoints,
    name,
    mousePressed,
    module,
    scale,
    position,
    width,
    height,
    interactiveLayerRef,
    uiLayerRef,
    overlayZoomRef,
    seeAll,
    imageSrc,
  ]);
```

- [ ] **Step 4: Pass `src` as `imageSrc` from `ImageCrossSections.tsx`**

In `src/components/CrossSections/ImageCrossSections.tsx`, find the `<DrawSectionsD3 ... />` call (around line 175) and add `imageSrc={src}` to its props (the `src` variable computed at the top of the component, already used by the `<img src={src} .../>` a few lines above it).

- [ ] **Step 5: Thread `imageSrc` through `DrawUav.tsx` (reuses `drawSections.ts`, `module: 'uav'`)**

In `src/components/DrawUav.tsx`, add `imageSrc` to the component's props type:

```tsx
export const DrawUav = ({
  width,
  height,
  factor,
  scale,
  position,
  layers,
  imageSrc,
}: {
  width: number;
  height: number;
  factor: number;
  scale: number;
  position: { x: number; y: number };
  layers: OverlayLayers;
  imageSrc: string;
}) => {
```

Add `imageSrc` to the `drawInteractiveSection({...})` call and its effect's dependency array (same pattern as Step 3):

```tsx
    drawInteractiveSection({
      layer: layerSel as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      uiLayer: uiLayerSel as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      zoomLayerNode,
      startPoint,
      endPoint,
      setMousePressed,
      setStartPoint,
      setEndPoint,
      onSetDirPoints: onSetPixelDirection,
      factor,
      mousePressed,
      viewport: {
        imageWidth: width,
        imageHeight: height,
        position,
        scale,
      },
      module: 'uav',
      imageSrc,
    });
```

```tsx
  }, [
    startPoint,
    endPoint,
    factor,
    scale,
    position,
    width,
    height,
    mousePressed,
    interactiveLayerRef,
    uiLayerRef,
    overlayZoomRef,
    imageSrc,
  ]);
```

- [ ] **Step 6: Pass `src` as `imageSrc` from `ImageUavNew.tsx`**

In `src/components/ImageUavNew.tsx`, add `imageSrc={src}` to the `<DrawUav ... />` call (the `src` variable is already computed at the top of the component and used by the `<img src={src} .../>` above it).

- [ ] **Step 7: Type check, lint, full suite**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64
npx eslint src/components/CrossSections/drawSections.ts src/components/CrossSections/DrawSectionsD3.tsx src/components/CrossSections/ImageCrossSections.tsx src/components/DrawUav.tsx src/components/ImageUavNew.tsx
npx jest 2>&1 | tail -4                                        # 35 suites passed (unchanged — no test files touched)
```

- [ ] **Step 8: Check in the app (Cross sections and UAV Pixel size, all three themes)**

Run `npm run dev`. For a UAV project, on **Pixel size**: the two blue crosshair pins ("1"/"2" in the head) replace the old teardrop icons; dragging point 2 shows the magnifier following the cursor with a live coordinate readout, and it disappears on drop. On **Cross sections**: the L (red)/R (green) pins show a bare letter in the head (not the old translated word badge above them); dragging either shows the magnifier; the section's dashed line and label are unchanged. Repeat once in **Light** and once in **Dracula**.

- [ ] **Step 9: Commit**

```bash
git add src/components/CrossSections/drawSections.ts src/components/CrossSections/DrawSectionsD3.tsx src/components/CrossSections/ImageCrossSections.tsx src/components/DrawUav.tsx src/components/ImageUavNew.tsx
git commit -m "Migrate cross-section and UAV pixel-size pins to drawPin + magnifier

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Migrate Oblique's 4-corner rectification points

**Files:**
- Modify: `src/components/Graphs/drawOblique.ts`
- Modify: `src/components/DrawOblique.tsx`
- Modify: `src/components/ImageOblique.tsx`

**Interfaces:**
- Consumes: `drawPin` (Task 3), `showMagnifier`/`hideMagnifier` (Task 5).
- Produces: `drawOblique`'s props gain a new required `imageSrc: string` field.

Background: today, point 0 is red (`COLORS.RED`) and points 1–3 are blue (`COLORS.LIGHT_BLUE`) — a legacy "first point" accent, not a left-bank meaning. Per this plan's scoping decision, all four become the plain `point` (blue) pin. Pins here live in the pan/zoom-scaled `layer` (not `uiLayer`) and already divide every dimension by `scale` to stay a constant screen size — `drawPin`'s `divisor` and `drawMagnifier`'s `divisor` do the same.

- [ ] **Step 1: Replace the pin/badge block with `drawPin`**

In `src/components/Graphs/drawOblique.ts`, replace the imports:

```ts
import * as d3 from 'd3';
import { pin, pinRed } from '../../assets/icons/icons';
import { COLORS, MARKS } from '../../constants/constants';
import { getDistanceColors } from '../../helpers/getCSSVar';
```

with:

```ts
import * as d3 from 'd3';
import { MARKS } from '../../constants/constants';
import { getDistanceColors } from '../../helpers/getCSSVar';
import { drawPin } from './drawPin';
import { showMagnifier, hideMagnifier } from './drawMagnifier';
```

Add `imageSrc: string` to `drawObliqueProps`:

```ts
interface drawObliqueProps {
  layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  uiLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  localPoints: { x: number; y: number }[];
  setLocalPoints?: (points: { x: number; y: number }[]) => void;
  factor: number;
  setMousePressed: (value: boolean) => void;
  setPointsInStore: (
    payload: { points: { x: number; y: number }[]; factor: number; index: number },
    event: any
  ) => void;
  scale: number;
  isDefaultCoordinates: boolean;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
}
```

and destructure the three new fields in the function signature:

```ts
export const drawOblique = ({
  layer,
  uiLayer,
  localPoints,
  setLocalPoints,
  factor,
  setMousePressed,
  setPointsInStore,
  scale,
  isDefaultCoordinates,
  imageSrc,
  imageWidth,
  imageHeight,
}: drawObliqueProps) => {
```

Replace the `dragPoint` behaviour:

```ts
  const dragPoint = d3
    .drag<SVGImageElement, { index: number }, { x: number; y: number }>()
    .subject((event, d) => {
      const p = localPoints[d.index];
      return { x: p.x, y: p.y };
    })
    .on('start', function () {
      setMousePressed(true);
      // Trae la imagen al frente al iniciar el drag
      d3.select<SVGImageElement, { index: number }>(this).raise();
    })
    .on('drag', function (event, d) {
      const x = event.x;
      const y = event.y;

      const next = [...localPoints];
      next[d.index] = { x, y };
      setLocalPoints?.(next);

      d3.select<SVGImageElement, { index: number }>(this)
        .attr('x', x - MARKS.OFFSET_X)
        .attr('y', y - MARKS.OFFSET_Y);
    })
    .on('end', function (event, d) {
      setMousePressed(false);

      const x = event.x;
      const y = event.y;
      const next = [...localPoints];
      next[d.index] = { x, y };

      setPointsInStore({ points: next, factor, index: d.index }, null);
    });
```

with:

```ts
  const dragPoint = d3
    .drag<SVGGElement, { index: number }, { x: number; y: number }>()
    .subject((event, d) => {
      const p = localPoints[d.index];
      return { x: p.x, y: p.y };
    })
    .on('start', function () {
      setMousePressed(true);
      d3.select<SVGGElement, { index: number }>(this).raise();
    })
    .on('drag', function (event, d) {
      const x = event.x;
      const y = event.y;
      // Where this pin was actually drawn (this render's localPoints) — the
      // transform below is relative to that fixed point, so the existing
      // <g> can just be moved instead of torn down and repainted every tick
      // (drawPin returns several children with coordinates baked in, unlike
      // the old single <image>'s x/y attrs).
      const origin = localPoints[d.index];

      const next = [...localPoints];
      next[d.index] = { x, y };
      setLocalPoints?.(next);

      d3.select<SVGGElement, { index: number }>(this).attr(
        'transform',
        `translate(${x - origin.x}, ${y - origin.y})`
      );
      showMagnifier({
        layer,
        point: { x, y },
        imageSrc,
        imageWidth,
        imageHeight,
        coordinateFactor: factor,
        divisor: scale,
      });
    })
    .on('end', function (event, d) {
      setMousePressed(false);
      hideMagnifier(layer);

      const x = event.x;
      const y = event.y;
      const next = [...localPoints];
      next[d.index] = { x, y };

      setPointsInStore({ points: next, factor, index: d.index }, null);
    });
```

Replace the pin+badge drawing loop:

```ts
  localPoints.forEach((point, i) => {
    if (isDefaultCoordinates && i !== 0) return;

    // Pin
    layer
      .append('image')
      .attr('href', i === 0 ? pinRed : pin)
      .attr('width', (MARKS.WIDTH + 5) / scale)
      .attr('height', (MARKS.HEIGHT + 5) / scale)
      .datum({ index: i })
      .attr('x', point.x - MARKS.OFFSET_X / scale)
      .attr('y', point.y - MARKS.OFFSET_Y / scale)
      .attr('cursor', 'move')
      .call(dragPoint as any);

    // Badge label
    const badgeWidth = 18 / scale;
    const badgeHeight = 14 / scale;
    const badgeX = point.x - badgeWidth / 2;
    const badgeY = point.y - (MARKS.OFFSET_Y + 14) / scale;

    layer
      .append('rect')
      .attr('x', badgeX)
      .attr('y', badgeY)
      .attr('width', badgeWidth)
      .attr('height', badgeHeight)
      .attr('rx', 3 / scale)
      .attr('ry', 3 / scale)
      .attr('fill', 'rgba(50,50,50,0.85)')
      .attr('pointer-events', 'none');

    layer
      .append('text')
      .attr('x', point.x)
      .attr('y', badgeY + badgeHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', 10 / scale)
      .attr('font-weight', '600')
      .attr('fill', i === 0 ? COLORS.RED : COLORS.LIGHT_BLUE)
      .attr('pointer-events', 'none')
      .text(`${i + 1}`);
  });
};
```

with:

```ts
  // Every corner is the plain blue "point" pin — point 0 no longer gets its
  // own red accent (see this plan's scoping decisions).
  localPoints.forEach((point, i) => {
    if (isDefaultCoordinates && i !== 0) return;

    const g = drawPin({ layer, tip: point, kind: 'point', label: `${i + 1}`, divisor: scale });
    g.attr('cursor', 'move').datum({ index: i }).call(dragPoint as any);
  });
};
```

- [ ] **Step 2: Pass `imageSrc`/`imageWidth`/`imageHeight` through `DrawOblique.tsx`**

In `src/components/DrawOblique.tsx`, add `imageSrc` to the component's props type:

```tsx
export const DrawOblique = ({
  width,
  height,
  factor,
  scale,
  position,
  layers,
  imageSrc,
}: {
  width: number;
  height: number;
  factor: number;
  scale: number;
  position: { x: number; y: number };
  layers: OverlayLayers;
  imageSrc: string;
}) => {
```

Add the three new fields to the `drawOblique({...})` call and to the effect's dependency array:

```tsx
    drawOblique({
      layer: interactiveLayerSel,
      uiLayer: uiLayerSel as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      localPoints,
      setLocalPoints,
      factor,
      setMousePressed,
      setPointsInStore: onChangeCoordinates,
      scale,
      isDefaultCoordinates,
      imageSrc,
      imageWidth: width,
      imageHeight: height,
    });
```

```tsx
  }, [
    interactiveLayerRef,
    uiLayerRef,
    coordinates,
    scale,
    position,
    factor,
    width,
    height,
    mousePressed,
    localPoints,
    isDefaultCoordinates,
    theme,
    imageSrc,
  ]);
```

- [ ] **Step 3: Pass `src` as `imageSrc` from `ImageOblique.tsx`**

In `src/components/ImageOblique.tsx`, add `imageSrc={src}` to the `<DrawOblique ... />` call (the `src` variable is already computed at the top of the component).

- [ ] **Step 4: Type check, lint, full suite**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64
npx eslint src/components/Graphs/drawOblique.ts src/components/DrawOblique.tsx src/components/ImageOblique.tsx
npx jest 2>&1 | tail -4                                        # 35 suites passed (unchanged)
```

- [ ] **Step 5: Check in the app (Oblique camera type, all three themes)**

Create/open an Oblique-type project. All four rectification corners show as blue crosshair pins numbered 1–4 (point 0 is no longer red — expected, called out in this plan). Dragging any corner shows the magnifier with a live coordinate readout and disappears on drop; the distance lines between corners (D12/D13/etc., unrelated to this task) are unchanged. Repeat once in **Light** and once in **Dracula**.

- [ ] **Step 6: Commit**

```bash
git add src/components/Graphs/drawOblique.ts src/components/DrawOblique.tsx src/components/ImageOblique.tsx
git commit -m "Migrate Oblique's 4 rectification points to drawPin + magnifier

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Migrate ipcam control points

**Files:**
- Modify: `src/components/Graphs/drawIpcam.ts`
- Modify: `src/components/DrawIpcam.tsx`
- Modify: `src/components/ImageIpcam.tsx`

**Interfaces:**
- Consumes: `drawPin` (Task 3), `showMagnifier`/`hideMagnifier` (Task 5).
- Produces: `drawIpcam`'s props gain a new required `imageSrc: string` field.

Background: today `getIcon` picks `pinRed` for the active (currently-selected-for-editing) point, `pin` (blue) for a selected-but-inactive point, `pinGrey` for an unselected one — no number/letter label is drawn for ipcam points today, and this plan does not add one. Per this plan's scoping decision, "active" no longer gets its own colour: it stays the `point` (blue) pin and gains a thin accent ring (`drawPin`'s `active` flag) instead. **This is the one visual call in this plan without a literal mockup to point at — flag it explicitly in Step 5's check-in.**

- [ ] **Step 1: Replace the pin block with `drawPin`**

In `src/components/Graphs/drawIpcam.ts`, replace the imports:

```ts
import * as d3 from 'd3';
import { pinRed, pin, pinGrey } from '../../assets/icons/icons';
import { COLORS, MARKS } from '../../constants/constants';
import { IpcamPoint, SetPointPixelCoordinatesProps } from '../../store/ipcam/types';
```

with:

```ts
import * as d3 from 'd3';
import { COLORS } from '../../constants/constants';
import { IpcamPoint, SetPointPixelCoordinatesProps } from '../../store/ipcam/types';
import { drawPin, PinKind } from './drawPin';
import { showMagnifier, hideMagnifier } from './drawMagnifier';
```

Add `imageSrc: string` to `drawIpcamProps` and destructure it:

```ts
interface drawIpcamProps {
  layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  uiLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  localPoints: IpcamPoint[] | null;
  factor: number;
  scale: number;
  width: number;
  height: number;
  activePoint: number | null;
  setMousePressed: (value: boolean) => void;
  onSetPointInStore: (props: SetPointPixelCoordinatesProps) => void;
  onSetActivePoint: (index: number) => void;
  cameraSolution: any | null;
  imageSrc: string;
}

const drawIpcam = ({
  layer,
  uiLayer,
  localPoints,
  factor,
  scale,
  width,
  height,
  activePoint,
  setMousePressed,
  onSetPointInStore,
  onSetActivePoint,
  cameraSolution,
  imageSrc,
}: drawIpcamProps) => {
```

Replace the `dragPoint` behaviour and the pin-drawing loop:

```ts
  const dragPoint = d3
    .drag<SVGImageElement, { index: number }, { x: number; y: number }>()
    .subject((event) => ({ x: event.x, y: event.y }))
    .on('start', function (_event, d) {
      onSetActivePoint(d.index);
      d3.select(this.ownerSVGElement).style('cursor', 'default');
    })
    .on('drag', function (event, d) {
      if (activePoint !== d.index) return;
      setMousePressed(true);

      const x = Math.max(0, Math.min(width, event.x));
      const y = Math.max(0, Math.min(height, event.y));

      d3.select<SVGImageElement, { index: number }>(this)
        .attr('x', x - MARKS.IPCAM_OFFSET_X / scale)
        .attr('y', y - MARKS.IPCAM_OFFSET_Y / scale);
    })
    .on('end', function (event, d) {
      if (activePoint !== d.index) return;

      setMousePressed(false);
      d3.select(this.ownerSVGElement).style('cursor', null);

      const x = Math.max(0, Math.min(width, event.x));
      const y = Math.max(0, Math.min(height, event.y));

      onSetPointInStore({ index: d.index, point: { x: x * factor, y: y * factor } });
    });

  localPoints.forEach((point, index) => {
    if (cameraSolution === null && point.selected === false) return;
    if (point.wasEstablished === false && activePoint !== index) return;

    if (cameraSolution !== null) {
      drawEllipses(point, layer, factor);
      drawProjectionPoint(point, layer, factor, scale);
    }

    layer
      .append('image')
      .attr('xlink:href', getIcon(index, activePoint, point.selected))
      .attr('x', point.x - MARKS.IPCAM_OFFSET_X / scale)
      .attr('y', point.y - MARKS.IPCAM_OFFSET_Y / scale)
      .datum({ index })
      .attr('width', MARKS.WIDTH / scale)
      .attr('height', MARKS.HEIGHT / scale)
      .attr('cursor', 'default')
      .call(dragPoint);
  });
};

const getIcon = (index: number, activePoint: number | null, selected: boolean) => {
  if (activePoint === index) {
    return pinRed;
  } else {
    if (selected) {
      return pin;
    } else {
      return pinGrey;
    }
  }
};
```

with:

```ts
  const dragPoint = d3
    .drag<SVGGElement, { index: number }, { x: number; y: number }>()
    .subject((event) => ({ x: event.x, y: event.y }))
    .on('start', function (_event, d) {
      onSetActivePoint(d.index);
      d3.select(this.ownerSVGElement).style('cursor', 'default');
    })
    .on('drag', function (event, d) {
      if (activePoint !== d.index) return;
      setMousePressed(true);

      const x = Math.max(0, Math.min(width, event.x));
      const y = Math.max(0, Math.min(height, event.y));
      // Where this pin was actually drawn (this render's localPoints) — see
      // the equivalent note in drawOblique.ts's migration (Task 7).
      const origin = localPoints![d.index];

      d3.select<SVGGElement, { index: number }>(this).attr(
        'transform',
        `translate(${x - origin.x}, ${y - origin.y})`
      );
      showMagnifier({
        layer,
        point: { x, y },
        imageSrc,
        imageWidth: width,
        imageHeight: height,
        coordinateFactor: factor,
        divisor: scale,
      });
    })
    .on('end', function (event, d) {
      if (activePoint !== d.index) return;

      setMousePressed(false);
      hideMagnifier(layer);
      d3.select(this.ownerSVGElement).style('cursor', null);

      const x = Math.max(0, Math.min(width, event.x));
      const y = Math.max(0, Math.min(height, event.y));

      onSetPointInStore({ index: d.index, point: { x: x * factor, y: y * factor } });
    });

  // No label — matches today's behaviour (ipcam control points have never
  // shown a number/letter). "active" (currently selected for editing) no
  // longer gets its own pin colour — see this plan's scoping decisions —
  // and instead gains an accent ring via drawPin's `active` flag.
  const getPinKind = (index: number, selected: boolean): PinKind => {
    if (activePoint === index) return 'point';
    return selected ? 'point' : 'muted';
  };

  localPoints.forEach((point, index) => {
    if (cameraSolution === null && point.selected === false) return;
    if (point.wasEstablished === false && activePoint !== index) return;

    if (cameraSolution !== null) {
      drawEllipses(point, layer, factor);
      drawProjectionPoint(point, layer, factor, scale);
    }

    const g = drawPin({
      layer,
      tip: point,
      kind: getPinKind(index, point.selected),
      divisor: scale,
      active: activePoint === index,
    });
    g.attr('cursor', 'default').datum({ index }).call(dragPoint as any);
  });
};
```

**Also within this same file**, near the top of `drawIpcam` (above everything shown so far in this step), the function unconditionally wipes both layers on every call:

```ts
  d3.selectAll(layer.selectAll('*')).remove();
  d3.selectAll(uiLayer.selectAll('*')).remove();

  // Draw each point
  if (localPoints === null) return;
```

Since the magnifier's own `<g class="magnifier">` lives inside `layer` (per its `showMagnifier({ layer, ... })` call above), and `drawIpcam` re-runs on every `'drag'` tick's own state update (`onSetActivePoint`/`onSetPointInStore` trigger a re-render, whose effect calls `drawIpcam` again) exactly the way Task 7's `drawOblique.ts` did, this blanket `layer.selectAll('*').remove()` would immediately wipe the magnifier right after `showMagnifier` draws it on each tick — the identical bug Task 7 discovered live in `drawOblique.ts` and fixed by sparing the magnifier from its own blanket clear. Apply the same fix here, replacing the block above with:

```ts
  layer.selectAll('*:not(.magnifier):not(.magnifier *)').remove();
  d3.selectAll(uiLayer.selectAll('*')).remove();

  // Draw each point
  if (localPoints === null) return;
```

(`uiLayer`'s clear is untouched — the magnifier never lives there in this file. Note the two `:not()` clauses: excluding only `.magnifier` itself is not enough — Task 7's own execution discovered live that the magnifier's *children* [`.magnifier-guide`, `.magnifier-border`, etc.] don't carry the `magnifier` class themselves and were still being stripped every tick, leaving an empty, invisible shell. `:not(.magnifier *)` additionally excludes every descendant of a `.magnifier` element, at any depth — apply both clauses together, exactly as shown.)

- [ ] **Step 2: Pass `imageSrc` through `DrawIpcam.tsx`**

In `src/components/DrawIpcam.tsx`, add `imageSrc` to the component's props type:

```tsx
export const DrawIpcam = ({
  width,
  height,
  factor,
  scale,
  position,
  layers,
  imageSrc,
}: {
  width: number;
  height: number;
  factor: number;
  scale: number;
  position: { x: number; y: number };
  layers: OverlayLayers;
  imageSrc: string;
}) => {
```

Add `imageSrc` to the `drawIpcam({...})` call and to the effect's dependency array:

```tsx
    drawIpcam({
      layer: interactiveLayerSel,
      uiLayer: uiLayerSel as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      localPoints,
      factor,
      scale,
      width,
      height,
      activePoint,
      setMousePressed,
      onSetPointInStore: onSetPointPixelCoordinates,
      onSetActivePoint,
      cameraSolution,
      imageSrc,
    });
```

```tsx
  }, [
    localPoints,
    activePoint,
    scale,
    position,
    factor,
    width,
    height,
    cameraSolution,
    interactiveLayerRef,
    uiLayerRef,
    imageSrc,
  ]);
```

- [ ] **Step 3: Pass `newImageSrc` as `imageSrc` from `ImageIpcam.tsx`**

In `src/components/ImageIpcam.tsx`, add `imageSrc={newImageSrc}` to the `<DrawIpcam ... />` call (`newImageSrc` is the state variable already computed at the top of the component and used by the `<img>` above it).

- [ ] **Step 4: Type check, lint, full suite**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64
npx eslint src/components/Graphs/drawIpcam.ts src/components/DrawIpcam.tsx src/components/ImageIpcam.tsx
npx jest 2>&1 | tail -4                                        # 35 suites passed (unchanged)
```

- [ ] **Step 5: Check in the app (Camera calibration, all three themes) — and flag the active-point colour change**

Open a project's ipcam camera calibration step. Unselected control points show as muted/grey crosshair pins; selected ones are blue; the currently-active (being placed/edited) point is blue **with a thin accent ring** instead of the old red — **tell the product owner about this specific substitution** (no literal mockup covers it; it follows the audit's general "blue for non-bank points" + "accent ring for selected/hovered" rules, see this plan's Architecture section). Dragging the active point shows the magnifier with a live coordinate readout. The ellipse/projection-point overlays (unrelated to this task) are unchanged. Repeat once in **Light** and once in **Dracula**.

- [ ] **Step 6: Commit**

```bash
git add src/components/Graphs/drawIpcam.ts src/components/DrawIpcam.tsx src/components/ImageIpcam.tsx
git commit -m "Migrate ipcam control points to drawPin + magnifier

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Migrate report renderers; delete the now-dead pin assets and code

**Files:**
- Modify: `src/components/Graphs/obliqueSvg.ts`
- Modify: `src/components/Graphs/ipcamSvg.ts`
- Delete: `src/components/Graphs/createPinsBase64.ts`
- Delete: `src/assets/icons/pin.svg`, `pinRed.svg`, `pinGreen.svg`, `pinGrey.svg`
- Modify: `src/assets/icons/icons.ts`
- Modify: `src/constants/constants.ts`
- Modify: `src/helpers/noDuplicateColorConstants.test.ts`

**Interfaces:**
- Consumes: `drawPin` (Task 3).
- Produces: nothing new.

These two report renderers are static (no dragging, so no magnifier) — they only need the pin visual swap, using `drawPin`'s `divisor` with the report's own `resizeFactor` equivalent. This is also where the audit's flagged colour-duplication bug is actually fixed: `createPinsBase64.ts`'s inline `pinRedSVG` (`#FF6C6C`) disappears entirely, leaving `--pin-left` (`#ED6B57`, from Task 1) as the only red a pin is ever drawn with.

- [ ] **Step 1: Migrate `obliqueSvg.ts`**

Replace the imports:

```ts
import { factor, Point } from '../../types';
import * as d3 from 'd3';
import { COLORS, MARKS } from '../../constants/constants';
import { createPinsBase64 } from './createPinsBase64';
import { getDistanceColors } from '../../helpers/getCSSVar';
```

with:

```ts
import { factor, Point } from '../../types';
import * as d3 from 'd3';
import { getDistanceColors } from '../../helpers/getCSSVar';
import { drawPin } from './drawPin';
```

Replace the pin/badge block:

```ts
  const { pinRedSVGBase64, pinSVGBase64 } = createPinsBase64();

  const DC = getDistanceColors();
```

with:

```ts
  const DC = getDistanceColors();
```

and replace:

```ts
  svg
    .selectAll('image')
    .data(coordinates)
    .enter()
    .append('image')
    .attr('x', (d) => d.x / factor.x - MARKS.OFFSET_X_REPORT) // Adjusting for image width
    .attr('y', (d) => d.y / factor.y - MARKS.OFFSET_Y_REPORT) // Adjusting for image height
    .attr('width', MARKS.WIDTH_REPORT)
    .attr('height', MARKS.HEIGHT_REPORT)
    .attr('xlink:href', (_d, i: number) => {
      if (i === 0) return pinRedSVGBase64;
      return pinSVGBase64;
    });

  // Badge background
  svg
    .selectAll('rect.pin-badge-bg')
    .data(coordinates)
    .enter()
    .append('rect')
    .attr('class', 'pin-badge-bg')
    .attr('x', (d) => d.x / factor.x - 9)
    .attr('y', (d) => d.y / factor.y - MARKS.OFFSET_Y_REPORT - 13)
    .attr('width', 18)
    .attr('height', 13)
    .attr('rx', 2)
    .attr('ry', 2)
    .attr('fill', 'rgba(50,50,50,0.85)');

  // Badge text
  svg
    .selectAll('text.pin-badge-text')
    .data(coordinates)
    .enter()
    .append('text')
    .attr('class', 'pin-badge-text')
    .attr('x', (d) => d.x / factor.x)
    .attr('y', (d) => d.y / factor.y - MARKS.OFFSET_Y_REPORT - 6.5)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-size', '9px')
    .attr('font-weight', 'bold')
    .attr('fill', (_d, i) => (i === 0 ? COLORS.RED : COLORS.LIGHT_BLUE))
    .text((_d, i) => i + 1);
};
```

with:

```ts
  // Every corner is the plain blue "point" pin, at the report's fixed
  // resizeFactor of 1.2 — matches drawOblique.ts's own migration (point 0
  // no longer gets its own red accent).
  coordinates.forEach((point, i) => {
    drawPin({
      layer: svg as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      tip: { x: point.x / factor.x, y: point.y / factor.y },
      kind: 'point',
      label: `${i + 1}`,
      divisor: 1.2,
    });
  });
};
```

- [ ] **Step 2: Migrate `ipcamSvg.ts`**

Replace the imports:

```ts
import * as d3 from 'd3';
import { factor } from '../../types';
import { IpcamPoint } from '../../store/ipcam/types';
import { COLORS, MARKS } from '../../constants/constants';
import { createPinsBase64 } from './createPinsBase64';
```

with:

```ts
import * as d3 from 'd3';
import { factor } from '../../types';
import { IpcamPoint } from '../../store/ipcam/types';
import { COLORS } from '../../constants/constants';
import { drawPin } from './drawPin';
```

Replace the pin block:

```ts
    if (x && y) {
      const { pinSVGBase64, pinGreySVGBase64 } = createPinsBase64();
      clippedGroup
        .append('image')
        .attr('x', x / factor.x - MARKS.OFFSET_X_REPORT)
        .attr('y', y / factor.y - MARKS.OFFSET_Y_REPORT)
        .attr('width', MARKS.WIDTH_REPORT)
        .attr('height', MARKS.HEIGHT_REPORT)
        .attr('xlink:href', () => {
          if (selected) {
            return pinSVGBase64;
          } else {
            return pinGreySVGBase64;
          }
        });
    }
```

with:

```ts
    if (x && y) {
      drawPin({
        layer: clippedGroup, // already a Selection<SVGGElement, ...> — no cast needed
        tip: { x: x / factor.x, y: y / factor.y },
        kind: selected ? 'point' : 'muted',
        divisor: 1.2,
      });
    }
```

- [ ] **Step 3: Delete the dead pin assets and code**

```bash
git rm src/components/Graphs/createPinsBase64.ts
git rm src/assets/icons/pin.svg src/assets/icons/pinRed.svg src/assets/icons/pinGreen.svg src/assets/icons/pinGrey.svg
```

In `src/assets/icons/icons.ts`, remove the four pin imports and their exports:

```ts
import drone from './drone.svg';
import ipcam from './ipcam.svg';
import next from './next.svg';
import oblique from './oblique.svg';
import pause from './pause.svg';
import pinRed from './pinRed.svg';
import pinGreen from './pinGreen.svg';
import pin from './pin.svg';
import play from './play.svg';
import previous from './previous.svg';
import language from './language.svg';
import eyeball from './eyeball.svg';
import back from './back.svg';
import pinGrey from './pinGrey.svg';
import clipboard from './clipboard.svg';
import addMask from './addMask.svg';

export {
  addMask,
  back,
  clipboard,
  drone,
  eyeball,
  ipcam,
  language,
  next,
  oblique,
  pause,
  pin,
  pinGreen,
  pinGrey,
  pinRed,
  play,
  previous,
};
```

becomes:

```ts
import drone from './drone.svg';
import ipcam from './ipcam.svg';
import next from './next.svg';
import oblique from './oblique.svg';
import pause from './pause.svg';
import play from './play.svg';
import previous from './previous.svg';
import language from './language.svg';
import eyeball from './eyeball.svg';
import back from './back.svg';
import clipboard from './clipboard.svg';
import addMask from './addMask.svg';

export { addMask, back, clipboard, drone, eyeball, ipcam, language, next, oblique, pause, play, previous };
```

- [ ] **Step 4: Shrink `MARKS` in `constants.ts`**

Every field of `MARKS` except `STROKE_WIDTH` is now dead: `WIDTH`/`HEIGHT`/`OFFSET_X`/`OFFSET_Y`/`WIDTH_REPORT`/`HEIGHT_REPORT`/`OFFSET_X_REPORT`/`OFFSET_Y_REPORT`/`IPCAM_OFFSET_X`/`IPCAM_OFFSET_Y` were only read by the pin-drawing code just migrated onto `pinGeometry.ts`; `NUMBER_OFFSET_X`/`NUMBER_OFFSET_Y`/`NUMBER_FONT_SIZE`/`LETTER_FONT_SIZE`/`NUMBER_OFFSET_X_REPORT`/`NUMBER_OFFSET_Y_REPORT` were already unused anywhere in `src/` before this plan (verified via `grep -rn "MARKS\." src` in Task investigation — confirm again here since new code was added since). Confirm, then replace:

```ts
export const MARKS = {
  WIDTH: 34,
  HEIGHT: 34,
  OFFSET_X: 20,
  OFFSET_Y: 36,
  NUMBER_OFFSET_X: 5,
  NUMBER_OFFSET_Y: 35,
  NUMBER_FONT_SIZE: 13,
  LETTER_FONT_SIZE: 13,
  WIDTH_REPORT: 20,
  HEIGHT_REPORT: 20,
  OFFSET_X_REPORT: 10,
  OFFSET_Y_REPORT: 18,
  NUMBER_OFFSET_X_REPORT: 2.5,
  NUMBER_OFFSET_Y_REPORT: 6,
  STROKE_WIDTH: 3,
  IPCAM_OFFSET_X: 17,
  IPCAM_OFFSET_Y: 31,
};
```

with:

```ts
export const MARKS = {
  STROKE_WIDTH: 3,
};
```

Run `grep -rn "MARKS\." src` first and confirm the only remaining hits are the two `MARKS.STROKE_WIDTH / scale` lines in `drawOblique.ts` — if anything else still references a field being removed, stop and re-check that call site before deleting.

- [ ] **Step 5: Extend `noDuplicateColorConstants.test.ts`**

Add to the end of the `describe` block in `src/helpers/noDuplicateColorConstants.test.ts` (before its closing `});`):

```ts
  it('the pin colour duplication is fixed: createPinsBase64.ts is gone, and nothing reads the old pin*.svg assets', () => {
    const iconsSource = readFileSync(join(__dirname, '..', 'assets', 'icons', 'icons.ts'), 'utf8');
    expect(iconsSource).not.toMatch(/pinRed|pinGreen|pinGrey|from '\.\/pin\.svg'/);
    expect(() =>
      readFileSync(join(__dirname, '..', 'components', 'Graphs', 'createPinsBase64.ts'), 'utf8')
    ).toThrow();
  });

  it('every migrated pin call site reads colours from getPinColors, not COLORS.RED/GREEN/LIGHT_BLUE for pins', () => {
    const files = [
      ['components', 'CrossSections', 'drawSections.ts'],
      ['components', 'Graphs', 'drawOblique.ts'],
      ['components', 'Graphs', 'drawIpcam.ts'],
      ['components', 'Graphs', 'obliqueSvg.ts'],
      ['components', 'Graphs', 'ipcamSvg.ts'],
    ];
    files.forEach((segments) => {
      const source = readFileSync(join(__dirname, '..', ...segments), 'utf8');
      expect(source).not.toMatch(/pinRed|pinGreen|pinGrey|createPinsBase64/);
    });
  });
```

- [ ] **Step 6: Run the tests and confirm they pass**

```bash
npx jest src/helpers/noDuplicateColorConstants.test.ts   # PASS
npx jest 2>&1 | tail -4                                   # 35 suites passed
```

- [ ] **Step 7: Type check, lint**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # still 64 (deleting dead code shouldn't move this number)
npm run lint 2>&1 | tail -3                                    # still 24 problems
```

- [ ] **Step 8: Check the report/PDF output once (any theme — report overlays are theme-invariant)**

Generate a report for an Oblique or ipcam project. The pixel-transformation/control-point pages show the new crosshair pins (blue for points, muted grey for ipcam's unselected points) instead of the old teardrop icons, at the same small report scale as before.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Migrate report pin rendering to drawPin; delete dead pin assets and createPinsBase64

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: Final verification

**Files:** none modified.

- [ ] **Step 1: Full automated check**

```bash
npx jest 2>&1 | tail -5                                          # 35 suites, all passing (390 + ~16 new)
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"      # 64 or fewer
npm run lint 2>&1 | tail -3                                      # 24 problems or fewer
git log --oneline b3f19c3..HEAD                                  # 9 commits
```

- [ ] **Step 2: Walk through every migrated screen once per theme**

Run `npm run dev`. For **Dark**, then **Light**, then **Dracula**:
1. UAV Pixel size — drag both points, confirm the magnifier and its coordinate readout.
2. Cross sections — drag L and R, confirm the letter-only head label and the magnifier.
3. Oblique (if reachable in this project's footage type) — drag all four corners.
4. ipcam camera calibration — select/drag a control point, confirm the accent ring on the active pin and the magnifier.
5. Generate one report and check its pin rendering once.

- [ ] **Step 3: Report back**

Summarise for the product owner:
- the 9 commits on `ui/design-refresh`
- test, TypeScript and lint numbers versus the Phase 3b baseline
- **the two visual decisions made without a literal mockup, both needing sign-off:** ipcam's active point losing its red in favour of an accent ring (Task 8), and Oblique's point 0 losing its legacy red accent (Task 7)
- the still-open, not-fixed-here Phase 3a finding: the light-theme active-technique-name contrast gap (unrelated token-layer decision, carried forward from Phase 3a/3b's own final reports)

Do not merge or push. The owner decides when `ui/design-refresh` goes into `river-labs`.

---

## Out of scope (later phases, do not start here)

- **Keyboard nudging.** The audit's Pixel-size mockup shows a hint pill reading "Arrow keys nudge 1 px" while dragging — no draggable pin anywhere in this codebase has keyboard support today (mirrors Phase 3a/3b's own deferral of Processing's row keyboard access). Not started here; a future phase's job.
- **The raw first-placement gestures** (cross-sections' and UAV's initial direction-line draw, Oblique's initial default-rectangle draw) do not get a magnifier — see this plan's scoping decisions. If the product owner wants it there too, that is a follow-up, not a gap in this plan.
- Masks, regions, STIV search lines, the colour bar, the five message kinds, expandable technique rows, the pinnable station tag → Phase 4.
- Any further colour-token cleanup in `constants.ts`'s `COLORS` block beyond what Task 9 touches (e.g. the already-dead `COLORS.MARK_L`/`MARK_NUMBER`, or `COLORS.RED`/`GREEN`/`LIGHT_BLUE`'s many non-pin consumers like `ColorBar.tsx`, `VersionMessage.tsx`, `OrthoImage.tsx`, `bathimetrySvg.ts`) — out of this component's scope.
