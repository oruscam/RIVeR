# Phase 6e — Camera Calibration Re-layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Camera calibration overlay onto the app's standard workspace (`.regular-page` → `.media-container` + `.form-container` + `.footer`), so a screenshot of it and a screenshot of any wizard step read as the same application.

**Architecture:** `src/pages/CameraCalibration.tsx` (667 lines today) becomes a thin page shaped like `Processing.tsx`. It keeps page state (selected photo, view mode, keyboard, drag-and-drop) and composes three new canvas-side components in `src/components/Calibration/` (`CalibrationViewControl` on 6d's `.seg-float`, `CalibrationCanvas`, `CalibrationStrip` reusing the shared carousel's classes) plus one new panel component, `src/components/Forms/FormCalibration.tsx`, which owns the panel body and the footer. All decision logic (view availability, key mapping, grade mapping, the Solve/Save footer state) lives in one pure helper, `src/helpers/calibrationView.ts`, so Jest can test it without a DOM. Two shared primitives are added under the spec's build-then-adopt rule: a `.badge` (worded rating) and an optional title on `.step-alert`. About 42 private `.cal-*` classes collapse to the ~24 the new components use, each commented.

**Tech Stack:** Electron, React 18.3.1, TypeScript, Redux Toolkit, Jest 29 + ts-jest (`testEnvironment: "node"`, **no DOM**), i18next.

**Spec:** `docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md` — §4/6e and **amendment A12** (read A12 in §9 before starting; it is the design this plan implements).

**Approved preview:** `docs/superpowers/previews/2026-09-30-phase-6e-camera-calibration.html` — approved by the product owner 2026-09-30. It is the binding visual reference for layout and states.

---

## Global Constraints

Every task's requirements implicitly include this section.

- Git author must be `antoine.patalano@gmail.com`. Never commit to `main` or `river-labs`. The branch `ui/design-refresh` stays unmerged.
- All work happens in the worktree `/Users/antoine/river_compil/.worktrees/ui-design-refresh/gui`. **Never `cd` to the original repository root.**
- **Never edit `src/translations/*/global.json`.** New copy uses `t(key, { defaultValue })` only. Existing `Calibration.*` keys are reused wherever one fits (they are translated in 12 locales); a new key is introduced only for genuinely new copy.
- **Never use bare `git stash` / `git stash pop`** — the stash stack is shared with other worktrees. Prefer a temporary WIP commit.
- **Never run `git checkout -- <file>`** to undo an experiment. Undo with an editor.
- Contrast floors in `src/helpers/themeStateContrast.test.ts` **may never be lowered**, and no existing assertion in any test file may be weakened, deleted, or have a threshold reduced. Adding new pairs is expected (Task 2).
- The lint command is **`npm run lint`** exactly.
- Baseline at the start of 6e (measured 2026-09-30 against `87acc64`): **66 suites / 694 tests passing**, `npx tsc --noEmit` **64 errors**, `npm run lint` **20 problems (17 errors, 3 warnings)**. None may regress. Each task states the expected new test count.
- Commit messages end with the attribution trailer the executing session's own system prompt specifies (spec §7: "Commits end with the session's attribution trailer"). Do not copy a model name from this plan.

### Carried-over contracts from 6a–6d — read before writing any state

1. **The `aria-disabled` dual contract.** Chromium fires no pointer events — so no `title` tooltip — on a natively `disabled` control. A control that must explain why it is unavailable uses `aria-disabled` **plus** an early-return guard in its click handler, written as a block body: `onClick={() => { if (cond) return; ... }}`. `src/helpers/legacyButtonRetirement.test.ts` sweeps every `.tsx` in `src/` and checks that the **first identifier** of each `aria-disabled={...}` expression appears inside an `if (...) return` in the handler. So `aria-disabled={action.blocker !== null}` needs `if (action.blocker !== null) return;`, and `aria-disabled={availability[mode] !== null}` needs `if (availability[mode] !== null) return;`.
2. **React renders `aria-x={false}` as the string `"false"`**; only `undefined` omits it. For `aria-busy`, pass `true` or `undefined`, never `false`.
3. **Selected-state contract:** `.seg-float button` styles `[aria-selected="true"]`; use `role="tablist"` / `role="tab"` / `aria-selected`, exactly as 6d's `PreviewModeControl.tsx`.
4. **A guard can fail green.** Every sweep this plan adds has a canary asserting it still sees something known-present.
5. **No DOM in Jest.** Layout, spacing and cascade are verified by the approved preview and the manual three-theme walkthrough, not Jest.
6. **Canvas rule:** the left canvas carries imagery, geometry and the `.seg-float` view switch only. **Graphs never go on the left canvas** (product-owner rule), which is why the histogram stays in the panel even though the audit mockup put it under the canvas.

---

## Review Focus

- **Importing a new folder after a solve.** `status` returns to `'idle'`, so Corrected/Heatmap become unavailable while `viewMode` may still be `'corrected'`. The page must fall back to `'original'` (not show a selected-but-disabled segment), and `selectedIdx` must reset to 0 so it can't point past a shorter image list. Pinned by Task 7's fallback-effect and reset-effect tests, and by Task 1's availability tests.
- **A solver result with a missing or unknown grade** (`verdict.grades` absent, or a value other than good/fair/bad). Today it renders an empty coloured string. It must render a neutral "—", never a badge claiming a rating. Pinned by Task 1 (`badgeGrade` returns `null`) and Task 6 (the `GradeBadge` null branch).
- **Pressing 2 or H before solving.** Today `2` switches to the corrected view regardless of status. Keys must now only select a view whose availability is `null`. Pinned by Task 7's key-handling test and Task 1's `viewForKey`/availability tests.
- **Whitespace-only camera or lens names.** The save IPC rejects them (`useCalibrationSlice.ts:118` trims). The Save tooltip must name the missing field rather than let the click silently fail. Pinned by Task 1's `footerAction` tests.
- **A heatmap-less solve.** `heatmapBase64` is `null` after a solve that produced no heatmap. The Heatmap segment must be disabled with its own reason ("No heatmap was produced…"), and the H key must do nothing. Pinned by Task 1 (`noHeatmap`) and Task 3 (tooltip mapping).

---

## File Structure

**Created**

- `src/helpers/calibrationView.ts` — pure logic: view modes, availability, key mapping, grade mapping, footer action.
- `src/helpers/calibrationView.test.ts`
- `src/helpers/calFileUrl.ts` — `toCalFileUrl`, moved out of the page (used by the canvas and the strip).
- `src/helpers/calFileUrl.test.ts`
- `src/helpers/calibrationPrimitives.test.ts` — `.badge` and titled `.step-alert` source-text guards.
- `src/helpers/calibrationLayout.test.ts` — component and page shape guards (created in Task 3, extended through Task 7).
- `src/components/Calibration/CalibrationViewControl.tsx` — `Original | Corrected | Heatmap` on `.seg-float`.
- `src/components/Calibration/CalibrationCanvas.tsx` — what the canvas shows per view, including the corner overlay.
- `src/components/Calibration/CalibrationStrip.tsx` — thumbnail strip on the shared carousel classes.
- `src/components/Calibration/index.ts` — barrel.
- `src/components/Forms/FormCalibration.tsx` — the panel body and the footer.

**Modified**

- `src/index.css` — `.badge` family.
- `src/components/Messages/messages.css` — `.step-alert-content` / `.step-alert-title`.
- `src/helpers/themeStateContrast.test.ts` — four new floor pairs.
- `src/components/Forms/index.ts` — exports `FormCalibration`.
- `src/pages/pages.css` — a new commented `CAMERA CALIBRATION (Phase 6e)` block; the old block and `.drag-over-cal` deleted.
- `src/pages/CameraCalibration.tsx` — rewritten as the thin page.
- `src/helpers/canvasChrome.test.ts` — calibration files added to `FILES`, doc comment updated.
- `src/helpers/listPrimitiveAdoption.test.ts` — doc comment only (it names two classes this plan deletes).

---

### Task 1: Pure calibration view logic and `toCalFileUrl`

**Files:**
- Create: `src/helpers/calibrationView.ts`
- Create: `src/helpers/calibrationView.test.ts`
- Create: `src/helpers/calFileUrl.ts`
- Create: `src/helpers/calFileUrl.test.ts`

**Interfaces:**
- Produces (exact names, consumed by Tasks 3–7):
  - `type CalibrationViewMode = 'original' | 'corrected' | 'heatmap'`
  - `const CALIBRATION_VIEW_MODES: readonly CalibrationViewMode[]` (in display order)
  - `type ViewBlocker = 'notSolved' | 'noHeatmap' | null`
  - `viewAvailability(status: CalibrationStatus, hasHeatmap: boolean): Record<CalibrationViewMode, ViewBlocker>`
  - `viewForKey(key: string): CalibrationViewMode | null`
  - `type BadgeGrade = 'good' | 'fair' | 'bad'`
  - `badgeGrade(grade: string | null | undefined): BadgeGrade | null`
  - `type FooterBlocker = 'noPhotos' | 'solving' | 'nameCameraAndLens' | 'nameCamera' | 'nameLens'`
  - `interface FooterAction { kind: 'solve' | 'save'; blocker: FooterBlocker | null; busy: boolean }`
  - `footerAction(input: { status: CalibrationStatus; imageCount: number; cameraName: string; lensName: string }): FooterAction`
  - `toCalFileUrl(p: string): string` (from `calFileUrl.ts`)

- [ ] **Step 1: Write the failing tests**

Create `src/helpers/calibrationView.test.ts`:

```ts
import {
  badgeGrade,
  CALIBRATION_VIEW_MODES,
  footerAction,
  viewAvailability,
  viewForKey,
} from './calibrationView';
import type { CalibrationStatus } from '../store/calibration/types';

describe('viewAvailability', () => {
  it('offers only Original before solving', () => {
    const unsolved: CalibrationStatus[] = ['idle', 'solving', 'error'];
    for (const status of unsolved) {
      expect(viewAvailability(status, true)).toEqual({
        original: null,
        corrected: 'notSolved',
        heatmap: 'notSolved',
      });
    }
  });

  it('offers every view once solved with a heatmap', () => {
    expect(viewAvailability('solved', true)).toEqual({ original: null, corrected: null, heatmap: null });
  });

  it('keeps Heatmap unavailable when the solver produced none', () => {
    expect(viewAvailability('solved', false).heatmap).toBe('noHeatmap');
    expect(viewAvailability('solved', false).corrected).toBeNull();
  });

  it('lists the modes in display order', () => {
    expect(CALIBRATION_VIEW_MODES).toEqual(['original', 'corrected', 'heatmap']);
  });
});

describe('viewForKey', () => {
  it('maps 1, 2 and H in either case to views', () => {
    expect(viewForKey('1')).toBe('original');
    expect(viewForKey('2')).toBe('corrected');
    expect(viewForKey('h')).toBe('heatmap');
    expect(viewForKey('H')).toBe('heatmap');
  });

  it('ignores every other key', () => {
    for (const key of ['3', 'x', 'Escape', 'ArrowLeft', '']) {
      expect(viewForKey(key)).toBeNull();
    }
  });
});

describe('badgeGrade', () => {
  it('passes the three known grades through', () => {
    expect(badgeGrade('good')).toBe('good');
    expect(badgeGrade('fair')).toBe('fair');
    expect(badgeGrade('bad')).toBe('bad');
  });

  it('returns null for a missing or unknown grade instead of guessing one', () => {
    expect(badgeGrade(undefined)).toBeNull();
    expect(badgeGrade(null)).toBeNull();
    expect(badgeGrade('')).toBeNull();
    expect(badgeGrade('excellent')).toBeNull();
  });
});

describe('footerAction', () => {
  const base = { cameraName: '', lensName: '' };

  it('asks for photos before the first solve', () => {
    expect(footerAction({ ...base, status: 'idle', imageCount: 0 })).toEqual({
      kind: 'solve',
      blocker: 'noPhotos',
      busy: false,
    });
  });

  it('lets Solve run once photos exist, including to retry after an error', () => {
    expect(footerAction({ ...base, status: 'idle', imageCount: 3 })).toEqual({ kind: 'solve', blocker: null, busy: false });
    expect(footerAction({ ...base, status: 'error', imageCount: 3 })).toEqual({ kind: 'solve', blocker: null, busy: false });
    expect(footerAction({ ...base, status: 'error', imageCount: 0 }).blocker).toBe('noPhotos');
  });

  it('shows Solve as busy while solving', () => {
    expect(footerAction({ ...base, status: 'solving', imageCount: 3 })).toEqual({
      kind: 'solve',
      blocker: 'solving',
      busy: true,
    });
  });

  it('names whichever profile name is missing after solving, treating whitespace as missing', () => {
    const solved = { status: 'solved' as const, imageCount: 3 };
    expect(footerAction({ ...solved, cameraName: '', lensName: '' }).blocker).toBe('nameCameraAndLens');
    expect(footerAction({ ...solved, cameraName: '   ', lensName: '24 mm' }).blocker).toBe('nameCamera');
    expect(footerAction({ ...solved, cameraName: 'DJI Mini 3', lensName: ' ' }).blocker).toBe('nameLens');
    expect(footerAction({ ...solved, cameraName: 'DJI Mini 3', lensName: '' }).kind).toBe('save');
  });

  it('enables Save once both names are filled', () => {
    expect(footerAction({ status: 'solved', imageCount: 3, cameraName: 'DJI Mini 3', lensName: '24 mm' })).toEqual({
      kind: 'save',
      blocker: null,
      busy: false,
    });
  });
});
```

Create `src/helpers/calFileUrl.test.ts`:

```ts
import { toCalFileUrl } from './calFileUrl';

describe('toCalFileUrl', () => {
  it('prefixes a POSIX path with the cal-file scheme', () => {
    expect(toCalFileUrl('/Users/a/board/img_01.jpg')).toBe('cal-file:///Users/a/board/img_01.jpg');
  });

  it('turns a Windows path into forward slashes with a leading slash before the drive letter', () => {
    expect(toCalFileUrl('C:\\Users\\a\\img_01.jpg')).toBe('cal-file:///C:/Users/a/img_01.jpg');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/helpers/calibrationView.test.ts src/helpers/calFileUrl.test.ts`
Expected: FAIL — both suites fail with "Cannot find module './calibrationView'" / "'./calFileUrl'".

- [ ] **Step 3: Implement `calFileUrl.ts`**

Create `src/helpers/calFileUrl.ts` (the body is moved verbatim from `CameraCalibration.tsx:10-17`; Task 7 deletes the page's copy):

```ts
// Backslash isn't a valid separator for the "cal-file" URL scheme (only special schemes
// like http/file get that WHATWG normalization), so Windows paths (C:\Users\...) must be
// converted to forward slashes with a leading "/" before the drive letter — mirrored on
// the main-process side in main.ts's cal-file protocol.handle.
export const toCalFileUrl = (p: string): string => {
  const normalized = p.replace(/\\/g, '/');
  return `cal-file://${normalized.startsWith('/') ? '' : '/'}${normalized}`;
};
```

- [ ] **Step 4: Implement `calibrationView.ts`**

Create `src/helpers/calibrationView.ts`:

```ts
import type { CalibrationStatus } from '../store/calibration/types';

/** What Camera calibration's canvas is showing (spec amendment A12). */
export type CalibrationViewMode = 'original' | 'corrected' | 'heatmap';

/** Display order of the view switch's segments. */
export const CALIBRATION_VIEW_MODES: readonly CalibrationViewMode[] = ['original', 'corrected', 'heatmap'];

/** Why a view segment can't be selected, or null when it can. */
export type ViewBlocker = 'notSolved' | 'noHeatmap' | null;

/**
 * Before solving only the raw photo exists. After solving, Corrected is always
 * available (a photo the solver didn't use shows the canvas's "Not used"
 * placeholder, but other photos do have corrected views), and Heatmap only if
 * the solver actually produced one.
 */
export const viewAvailability = (
  status: CalibrationStatus,
  hasHeatmap: boolean
): Record<CalibrationViewMode, ViewBlocker> => ({
  original: null,
  corrected: status === 'solved' ? null : 'notSolved',
  heatmap: status !== 'solved' ? 'notSolved' : hasHeatmap ? null : 'noHeatmap',
});

/** The calibration screen's view shortcuts: 1, 2 and H (unchanged from before 6e). */
export const viewForKey = (key: string): CalibrationViewMode | null => {
  if (key === '1') return 'original';
  if (key === '2') return 'corrected';
  if (key === 'h' || key === 'H') return 'heatmap';
  return null;
};

export type BadgeGrade = 'good' | 'fair' | 'bad';

/** Only the solver's three known grades become a badge; anything else is "no rating". */
export const badgeGrade = (grade: string | null | undefined): BadgeGrade | null =>
  grade === 'good' || grade === 'fair' || grade === 'bad' ? grade : null;

export type FooterBlocker = 'noPhotos' | 'solving' | 'nameCameraAndLens' | 'nameCamera' | 'nameLens';

export interface FooterAction {
  /** The footer's right-hand button: Solve until solved, Save profile after. */
  kind: 'solve' | 'save';
  /** Why the button can't act right now, or null when it can. */
  blocker: FooterBlocker | null;
  busy: boolean;
}

export const footerAction = ({
  status,
  imageCount,
  cameraName,
  lensName,
}: {
  status: CalibrationStatus;
  imageCount: number;
  cameraName: string;
  lensName: string;
}): FooterAction => {
  if (status === 'solved') {
    const hasCamera = cameraName.trim().length > 0;
    const hasLens = lensName.trim().length > 0;
    const blocker: FooterBlocker | null =
      !hasCamera && !hasLens ? 'nameCameraAndLens' : !hasCamera ? 'nameCamera' : !hasLens ? 'nameLens' : null;
    return { kind: 'save', blocker, busy: false };
  }
  if (status === 'solving') return { kind: 'solve', blocker: 'solving', busy: true };
  return { kind: 'solve', blocker: imageCount === 0 ? 'noPhotos' : null, busy: false };
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/helpers/calibrationView.test.ts src/helpers/calFileUrl.test.ts`
Expected: PASS — 2 suites, 15 tests (13 + 2).

- [ ] **Step 6: Full check**

Run: `npx jest` and `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: **68 suites / 709 tests** passing; `tsc` still **64**.

- [ ] **Step 7: Commit**

```bash
git add src/helpers/calibrationView.ts src/helpers/calibrationView.test.ts src/helpers/calFileUrl.ts src/helpers/calFileUrl.test.ts
git commit -m "Task 1: Add pure calibration view logic and move toCalFileUrl to helpers"
```
(append the session's attribution trailer — see Global Constraints)

---

### Task 2: `.badge` primitive, titled `.step-alert`, contrast floors

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/Messages/messages.css`
- Modify: `src/helpers/themeStateContrast.test.ts`
- Create: `src/helpers/calibrationPrimitives.test.ts`

**Interfaces:**
- Produces: CSS classes `.badge`, `.badge-good`, `.badge-fair`, `.badge-bad` (the dot colour travels on a `--badge-dot` custom property set by each variant); `.step-alert-content`, `.step-alert-title` (a wrapper placed as the single child of an existing `.step-alert` element). Task 6 is the first consumer of both.

Measured values that set this task's floors (worst theme first): badge **word** (`--primary-text-color`) on its 15% status tint — light bad **7.68**, light good 7.85, light fair 8.07, dark/dracula all > 10. Badge **dot** vs panel — light fair **3.12** (good 4.14 and bad 4.46 are already floored at 3.0 by the existing `.ibtn[data-state="success"]` and `.ibtn-danger` pairs). Status colours as **text** would fail (light 2.68–3.64, dracula bad 4.15), which is why the word is never a status colour.

- [ ] **Step 1: Write the failing tests**

Create `src/helpers/calibrationPrimitives.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const indexCss = readFileSync(join(SRC, 'index.css'), 'utf8');
const messagesCss = readFileSync(join(SRC, 'components/Messages/messages.css'), 'utf8');

const ruleBody = (css: string, selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
};

describe('.badge', () => {
  it('keeps the word in --primary-text-color, never a status colour', () => {
    const body = ruleBody(indexCss, '.badge');
    expect(body).toMatch(/color:\s*var\(--primary-text-color\)/);
    for (const grade of ['good', 'fair', 'bad']) {
      expect(ruleBody(indexCss, `.badge-${grade}`)).not.toMatch(/(?:^|[\s;])color:/);
    }
  });

  it('gives each grade its status dot and a 15% status tint', () => {
    for (const grade of ['good', 'fair', 'bad']) {
      const body = ruleBody(indexCss, `.badge-${grade}`);
      expect(body).toMatch(new RegExp(`--badge-dot:\\s*var\\(--status-${grade}\\)`));
      expect(body).toMatch(new RegExp(`color-mix\\(in srgb, var\\(--status-${grade}\\) 15%, transparent\\)`));
    }
    expect(ruleBody(indexCss, '.badge::before')).toMatch(/background-color:\s*var\(--badge-dot\)/);
  });
});

describe('.step-alert title', () => {
  it('adds an optional bold title above a stacked body without touching .step-alert itself', () => {
    expect(ruleBody(messagesCss, '.step-alert-title')).toMatch(/font-weight:\s*600/);
    expect(ruleBody(messagesCss, '.step-alert-content')).toMatch(/flex-direction:\s*column/);
  });
});
```

In `src/helpers/themeStateContrast.test.ts`, add these four entries at the **end** of the `STATE_PAIRS` array (after the `.ibtn-danger fill` entry, before the closing `];`):

```ts
  {
    label: '.badge-fair dot (--status-fair) vs panel',
    floor: 3.0,
    ratio: (t) => contrastRatio(resolveRgb(t, '--status-fair'), panel(t)),
  },
  {
    label: '.badge word (--primary-text-color) on its good tint (--status-good at 15%)',
    floor: 7.5,
    ratio: (t) =>
      contrastRatio(
        resolveRgb(t, '--primary-text-color'),
        mixOverBackdrop(resolveRgb(t, '--status-good'), 0.15, panel(t))
      ),
  },
  {
    label: '.badge word (--primary-text-color) on its fair tint (--status-fair at 15%)',
    floor: 7.5,
    ratio: (t) =>
      contrastRatio(
        resolveRgb(t, '--primary-text-color'),
        mixOverBackdrop(resolveRgb(t, '--status-fair'), 0.15, panel(t))
      ),
  },
  {
    label: '.badge word (--primary-text-color) on its bad tint (--status-bad at 15%)',
    floor: 7.5,
    ratio: (t) =>
      contrastRatio(
        resolveRgb(t, '--primary-text-color'),
        mixOverBackdrop(resolveRgb(t, '--status-bad'), 0.15, panel(t))
      ),
  },
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/helpers/calibrationPrimitives.test.ts src/helpers/themeStateContrast.test.ts`
Expected: `calibrationPrimitives.test.ts` FAILS (3 failed — no `.badge` / `.step-alert-title` rules yet). `themeStateContrast.test.ts` PASSES including the 12 new cases: the floors are measurements of tokens that already exist, not of the new CSS. That is expected and not a TDD violation — they pin the palette this primitive depends on, so a later palette change that would make the badge illegible fails here.

- [ ] **Step 3: Add `.badge` to `index.css`**

In `src/index.css`, insert this block immediately **before** the `/* ====...` line that opens the `   FORM INPUTS` section (i.e. after the whole `.list-row` family, outside the CHIP→LIST ROW region that `chipSegPrimitives.test.ts` sweeps):

```css
/* =============================================================================
   BADGE (.badge family) — Phase 6e, spec amendment A12
   A worded rating: a coloured dot, the word, and a light tint of the status
   colour. The WORD is --primary-text-color in every theme, never the status
   colour: as coloured text on its own tint the status colours measure
   2.68-3.64:1 in light and 4.15:1 for dracula "bad", under the 4.5:1 text
   floor. The colour lives on the dot (non-text, >= 3:1 against the panel in
   every theme) and on the tint. Floors: themeStateContrast.test.ts.
   First consumer: FormCalibration.tsx (Overall + six metric ratings).
   ============================================================================= */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-caption);
  font-weight: 600;
  line-height: 1;
  color: var(--primary-text-color);
  white-space: nowrap;
}

.badge::before {
  content: "";
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--badge-dot);
}

.badge-good {
  --badge-dot: var(--status-good);
  background-color: color-mix(in srgb, var(--status-good) 15%, transparent);
}

.badge-fair {
  --badge-dot: var(--status-fair);
  background-color: color-mix(in srgb, var(--status-fair) 15%, transparent);
}

.badge-bad {
  --badge-dot: var(--status-bad);
  background-color: color-mix(in srgb, var(--status-bad) 15%, transparent);
}

```

- [ ] **Step 4: Add the alert title to `messages.css`**

In `src/components/Messages/messages.css`, insert immediately after the `.step-alert-error::before { ... }` line:

```css

/* Optional title + body inside a .step-alert (Phase 6e, spec amendment A12).
   Additive: an alert whose only child is text renders exactly as before; an
   alert that needs a title wraps its content in .step-alert-content. First
   consumer: FormCalibration.tsx's "How to improve this calibration". */
.step-alert-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
}

.step-alert-title {
    font-weight: 600;
}

.step-alert-content ul {
    margin: 0;
    padding-left: var(--space-4);
    color: var(--secondary-text-color);
    line-height: 1.45;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/helpers/calibrationPrimitives.test.ts src/helpers/themeStateContrast.test.ts src/helpers/chipSegPrimitives.test.ts`
Expected: PASS, all three suites.

- [ ] **Step 6: Full check**

Run: `npx jest` and `npm run lint`
Expected: **69 suites / 724 tests** (709 + 3 + 12); lint still **20 problems**.

- [ ] **Step 7: Commit**

```bash
git add src/index.css src/components/Messages/messages.css src/helpers/themeStateContrast.test.ts src/helpers/calibrationPrimitives.test.ts
git commit -m "Task 2: Add .badge and titled .step-alert, with contrast floors"
```
(append the session's attribution trailer)

---

### Task 3: `CalibrationViewControl`

**Files:**
- Create: `src/components/Calibration/CalibrationViewControl.tsx`
- Create: `src/components/Calibration/index.ts`
- Create: `src/helpers/calibrationLayout.test.ts`

**Interfaces:**
- Consumes: `CALIBRATION_VIEW_MODES`, `CalibrationViewMode`, `ViewBlocker` (Task 1); `.seg-float` (6d, already in `index.css`).
- Produces: `CalibrationViewControl` with props `{ viewMode: CalibrationViewMode; onSetViewMode: (mode: CalibrationViewMode) => void; availability: Record<CalibrationViewMode, ViewBlocker> }`, exported from `src/components/Calibration/index.ts`. Task 7 renders it.

- [ ] **Step 1: Write the failing test**

Create `src/helpers/calibrationLayout.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const read = (relPath: string) => readFileSync(join(SRC, relPath), 'utf8');

describe('CalibrationViewControl', () => {
  const control = read('components/Calibration/CalibrationViewControl.tsx');

  it('is a tablist on .seg-float, the canvas-chrome variant of .seg', () => {
    expect(control).toMatch(/className=["']seg-float["']/);
    expect(control).toMatch(/role=["']tablist["']/);
  });

  it('renders one tab per mode from CALIBRATION_VIEW_MODES, selected via aria-selected', () => {
    expect(control).toMatch(/CALIBRATION_VIEW_MODES\.map\(/);
    expect(control).toMatch(/role=["']tab["']/);
    expect(control).toMatch(/aria-selected=\{viewMode === mode\}/);
  });

  it('gates an unavailable segment with aria-disabled plus a matching early-return guard', () => {
    expect(control).toMatch(/aria-disabled=\{availability\[mode\] !== null\}/);
    expect(control).toMatch(/if \(availability\[mode\] !== null\) return;/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/calibrationLayout.test.ts`
Expected: FAIL — "ENOENT … CalibrationViewControl.tsx".

- [ ] **Step 3: Write the component**

Create `src/components/Calibration/CalibrationViewControl.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { CALIBRATION_VIEW_MODES, type CalibrationViewMode, type ViewBlocker } from '../../helpers/calibrationView';

interface CalibrationViewControlProps {
  viewMode: CalibrationViewMode;
  onSetViewMode: (mode: CalibrationViewMode) => void;
  availability: Record<CalibrationViewMode, ViewBlocker>;
}

/** Existing, already-translated labels (Calibration.overlay reads "Original"). */
const LABEL_KEY: Record<CalibrationViewMode, string> = {
  original: 'Calibration.overlay',
  corrected: 'Calibration.undistorted',
  heatmap: 'Calibration.heatmap',
};

/**
 * The calibration canvas's view switch (spec amendment A12): Original |
 * Corrected | Heatmap on .seg-float, the second consumer of 6d's canvas-chrome
 * segmented control after PreviewModeControl. Same tablist + aria-disabled
 * pattern, so an unavailable view still explains itself on hover.
 */
export const CalibrationViewControl = ({ viewMode, onSetViewMode, availability }: CalibrationViewControlProps) => {
  const { t } = useTranslation();

  const reasonText = (blocker: ViewBlocker): string | undefined => {
    if (blocker === 'notSolved') return t('Calibration.solveFirst', { defaultValue: 'Solve the calibration first' });
    if (blocker === 'noHeatmap')
      return t('Calibration.noHeatmap', { defaultValue: 'No heatmap was produced for this calibration' });
    return undefined;
  };

  return (
    <div className="seg-float" role="tablist" aria-label={t('Calibration.viewTablist', { defaultValue: 'View' })}>
      {CALIBRATION_VIEW_MODES.map((mode) => (
        <button
          key={mode}
          type="button"
          role="tab"
          aria-selected={viewMode === mode}
          aria-disabled={availability[mode] !== null}
          title={reasonText(availability[mode])}
          onClick={() => {
            if (availability[mode] !== null) return;
            if (viewMode === mode) return;
            onSetViewMode(mode);
          }}
        >
          {t(LABEL_KEY[mode])}
        </button>
      ))}
    </div>
  );
};
```

Create `src/components/Calibration/index.ts`:

```ts
import { CalibrationViewControl } from './CalibrationViewControl';

export { CalibrationViewControl };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/helpers/calibrationLayout.test.ts src/helpers/legacyButtonRetirement.test.ts`
Expected: PASS. The legacy sweep now also verifies this file's `aria-disabled`/guard pairing (identifier `availability`).

- [ ] **Step 5: Full check**

Run: `npx jest`, `npx tsc --noEmit 2>&1 | grep -c "error TS"`, `npm run lint`
Expected: **70 suites / 727 tests**; `tsc` **64**; lint **20**.

- [ ] **Step 6: Commit**

```bash
git add src/components/Calibration/CalibrationViewControl.tsx src/components/Calibration/index.ts src/helpers/calibrationLayout.test.ts
git commit -m "Task 3: Add CalibrationViewControl on .seg-float"
```
(append the session's attribution trailer)

---

### Task 4: `CalibrationCanvas`

**Files:**
- Create: `src/components/Calibration/CalibrationCanvas.tsx`
- Modify: `src/components/Calibration/index.ts`
- Modify: `src/pages/pages.css` (new block, first rules)
- Test: `src/helpers/calibrationLayout.test.ts`

**Interfaces:**
- Consumes: `CalibrationViewMode` (Task 1), `toCalFileUrl` (Task 1), `CalibrationStatus` and `FrameCorners` from `src/store/calibration/types.ts`.
- Produces: `CalibrationCanvas` with props `{ viewMode: CalibrationViewMode; status: CalibrationStatus; image: string | undefined; undistortedPath: string | null; corners: FrameCorners | undefined; heatmapBase64: string | null }`. Task 7 computes these from the slice and renders it.
- Produces CSS: a new `CAMERA CALIBRATION (Phase 6e)` block in `pages.css` with `.cal-undistorted-wrap` and `.cal-corner-overlay`. Tasks 5–7 append to this block.

- [ ] **Step 1: Write the failing test**

Append to `src/helpers/calibrationLayout.test.ts`:

```ts
describe('CalibrationCanvas', () => {
  const canvas = read('components/Calibration/CalibrationCanvas.tsx');

  it('owns the corrected view and its corner overlay', () => {
    expect(canvas).toMatch(/const UndistortedOverlay\b/);
    expect(canvas).toMatch(/className=["']cal-corner-overlay["']/);
    expect(canvas).toMatch(/import \{ toCalFileUrl \} from ['"]\.\.\/\.\.\/helpers\/calFileUrl['"]/);
  });

  it('positions nothing inline, so the canvas-chrome sweep has nothing to allow-list', () => {
    expect(canvas).not.toMatch(/position:\s*['"]absolute['"]/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/calibrationLayout.test.ts`
Expected: FAIL — the new suite's `read` throws ENOENT for `CalibrationCanvas.tsx`.

- [ ] **Step 3: Write the component**

Create `src/components/Calibration/CalibrationCanvas.tsx`. `UndistortedOverlay` is moved from `CameraCalibration.tsx:60-153` with one change: its two inline `style` objects become the classes `.cal-undistorted-wrap` and `.cal-corner-overlay` (the canvas's per-draw `left/top/width/height` stay inline — they are measured geometry, not positioning mode).

```tsx
import { FC, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toCalFileUrl } from '../../helpers/calFileUrl';
import type { CalibrationViewMode } from '../../helpers/calibrationView';
import type { CalibrationStatus, FrameCorners } from '../../store/calibration/types';

interface UndistortedOverlayProps {
  src: string;
  corners: FrameCorners;
}

const UndistortedOverlay: FC<UndistortedOverlayProps> = ({ src, corners }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const iw = img.clientWidth;
    const ih = img.clientHeight;
    if (!iw || !ih) return;

    // Size canvas buffer to match the rendered image, then position it exactly over the image.
    canvas.width = iw;
    canvas.height = ih;
    canvas.style.width = `${iw}px`;
    canvas.style.height = `${ih}px`;
    canvas.style.left = `${img.offsetLeft}px`;
    canvas.style.top = `${img.offsetTop}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = iw / img.naturalWidth;
    const scaleY = ih / img.naturalHeight;

    ctx.clearRect(0, 0, iw, ih);

    corners.detected.forEach(([dx, dy], i) => {
      const px = [corners.projected[i][0] * scaleX, corners.projected[i][1] * scaleY];
      const dp = [dx * scaleX, dy * scaleY];

      ctx.strokeStyle = 'rgba(50, 180, 255, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(dp[0], dp[1]);
      ctx.lineTo(px[0], px[1]);
      ctx.stroke();

      ctx.fillStyle = 'rgb(240, 0, 0)';
      ctx.beginPath();
      ctx.arc(dp[0], dp[1], 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgb(240, 240, 240)';
      ctx.beginPath();
      ctx.arc(px[0], px[1], 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = 'white';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText(`RMS ${corners.rms.toFixed(3)} px`, 10, 22);
  }, [corners]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth) {
      draw();
    } else {
      img.addEventListener('load', draw);
      return () => img.removeEventListener('load', draw);
    }
  }, [draw]);

  useEffect(() => {
    const obs = new ResizeObserver(draw);
    if (imgRef.current) obs.observe(imgRef.current);
    return () => obs.disconnect();
  }, [draw]);

  return (
    <div className="cal-undistorted-wrap">
      <img ref={imgRef} className="cal-canvas-img" src={src} alt="Undistorted" />
      <canvas ref={canvasRef} className="cal-corner-overlay" />
    </div>
  );
};

interface CalibrationCanvasProps {
  viewMode: CalibrationViewMode;
  status: CalibrationStatus;
  /** Path of the selected original photo; undefined when no photos are loaded. */
  image: string | undefined;
  /** Corrected image for the selected photo, or null when the solver didn't use it. */
  undistortedPath: string | null;
  corners: FrameCorners | undefined;
  heatmapBase64: string | null;
}

/**
 * What the calibration canvas shows for the current view (spec amendment A12).
 * The page guarantees viewMode is available (it falls back to 'original'
 * otherwise); the explicit status/heatmap checks below are belt-and-braces so
 * a stale mode can never render an empty canvas.
 */
export const CalibrationCanvas = ({
  viewMode,
  status,
  image,
  undistortedPath,
  corners,
  heatmapBase64,
}: CalibrationCanvasProps) => {
  const { t } = useTranslation();

  if (!image) {
    return (
      <div className="cal-canvas">
        <p className="cal-canvas-placeholder">{t('Calibration.noPhotos', { defaultValue: 'No photos yet' })}</p>
      </div>
    );
  }

  const original = <img className="cal-canvas-img" src={toCalFileUrl(image)} alt={image.split('/').pop()} />;

  if (status !== 'solved' || viewMode === 'original') {
    return <div className="cal-canvas">{original}</div>;
  }

  if (viewMode === 'heatmap') {
    return (
      <div className="cal-canvas">
        {heatmapBase64 ? (
          <img className="cal-canvas-img" src={`data:image/png;base64,${heatmapBase64}`} alt="Heatmap" />
        ) : (
          original
        )}
      </div>
    );
  }

  if (!undistortedPath) {
    return (
      <div className="cal-canvas">
        <p className="cal-canvas-placeholder">{t('Calibration.notUsed')}</p>
      </div>
    );
  }

  return (
    <div className="cal-canvas">
      {corners ? (
        <UndistortedOverlay src={toCalFileUrl(undistortedPath)} corners={corners} />
      ) : (
        <img className="cal-canvas-img" src={toCalFileUrl(undistortedPath)} alt="Undistorted" />
      )}
    </div>
  );
};
```

Update `src/components/Calibration/index.ts`:

```ts
import { CalibrationCanvas } from './CalibrationCanvas';
import { CalibrationViewControl } from './CalibrationViewControl';

export { CalibrationCanvas, CalibrationViewControl };
```

- [ ] **Step 4: Open the new CSS block**

In `src/pages/pages.css`, insert immediately **before** the line `/* ── Lens correction settings rows (VideoRange) ──────────────── */`:

```css
/* =============================================================================
   CAMERA CALIBRATION (Phase 6e, spec amendment A12)
   The overlay now sits on the standard workspace (.regular-page →
   .media-container + .form-container + .footer). Every rule left here is
   genuinely calibration-specific and says why; layout, buttons, the strip's
   look and the view switch all come from the shared rules.
   ============================================================================= */

/* The corrected view stacks the corner-overlay canvas on the undistorted
   image, so the image needs a positioned, centring box of its own. */
.cal-undistorted-wrap {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Detected (red) vs projected (white) corners, drawn over the image. A drawing
   surface, not a control: pointer events pass through to the image. Its
   left/top/width/height are set per draw from the image's measured box. */
.cal-corner-overlay {
    position: absolute;
    left: 0;
    top: 0;
    pointer-events: none;
}

```

(The existing `.cal-canvas`, `.cal-canvas-img` and `.cal-canvas-placeholder` rules in the old block are reused unchanged for now; Task 7 moves them into this block.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/helpers/calibrationLayout.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Full check**

Run: `npx jest`, `npx tsc --noEmit 2>&1 | grep -c "error TS"`, `npm run lint`
Expected: **70 suites / 729 tests**; `tsc` **64**; lint **20**.

- [ ] **Step 7: Commit**

```bash
git add src/components/Calibration/CalibrationCanvas.tsx src/components/Calibration/index.ts src/pages/pages.css src/helpers/calibrationLayout.test.ts
git commit -m "Task 4: Add CalibrationCanvas and open the Phase 6e calibration CSS block"
```
(append the session's attribution trailer)

---

### Task 5: `CalibrationStrip`

**Files:**
- Create: `src/components/Calibration/CalibrationStrip.tsx`
- Modify: `src/components/Calibration/index.ts`
- Modify: `src/pages/pages.css` (append to the Phase 6e block)
- Test: `src/helpers/calibrationLayout.test.ts`

**Interfaces:**
- Consumes: `toCalFileUrl` (Task 1); `useResizableCarousel` from `src/hooks` (signature `{ storageKey, defaultHeight, minHeight, maxHeight, onDragProgress } → { height, onDragHandleMouseDown }`); `Icon` from `src/components/Icon`; `back`, `play` from `src/assets/icons/icons`.
- Produces: `CalibrationStrip` with props `{ images: string[]; thumbs: string[]; selectedIdx: number; onSelect: (index: number) => void; usedSet: ReadonlySet<string>; showUnused: boolean }`. Task 7 renders it.

- [ ] **Step 1: Write the failing test**

Append to `src/helpers/calibrationLayout.test.ts`:

```ts
describe('CalibrationStrip', () => {
  const strip = read('components/Calibration/CalibrationStrip.tsx');
  // .video-button lives in index.css, the rest in components.css.
  const sharedCss = read('components/components.css') + read('index.css');
  const pagesCss = read('pages/pages.css');

  // The strip deliberately copies the shared Carousel's look instead of using
  // the component (spec A12). These are the classes that make it look the
  // same; each must exist in the shared stylesheet AND be used here, so a
  // rename on either side fails this test instead of silently diverging.
  const SHARED = [
    'carousel-container',
    'carousel-resize-handle',
    'carousel-info',
    'carousel',
    'video-button',
    'img-carousel-container',
    'img-carousel',
    'img-carousel-active',
    'img-water-mark',
  ];

  it('uses every shared carousel class that gives the wizard strip its look', () => {
    for (const name of SHARED) {
      expect(sharedCss).toMatch(new RegExp(`\\.${name}[\\s{:,.]`));
      expect(strip).toMatch(new RegExp(`(?<![\\w-])${name}(?![\\w-])`));
    }
  });

  it('dims an unused photo with a selector that out-specifies the shared resting dim', () => {
    // Shared: .img-carousel:not(.img-carousel-active):not(.img-carousel-second) = (0,3,0).
    expect(pagesCss).toContain('.cal-strip .img-carousel.cal-strip-unused:not(.img-carousel-active) {');
    expect(strip).toMatch(/cal-strip-unused/);
  });

  it('keeps the strip height the user already saved', () => {
    expect(strip).toMatch(/storageKey:\s*['"]river-cal-carousel-height['"]/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/calibrationLayout.test.ts`
Expected: FAIL — ENOENT for `CalibrationStrip.tsx`.

- [ ] **Step 3: Write the component**

Create `src/components/Calibration/CalibrationStrip.tsx`:

```tsx
import { memo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useResizableCarousel } from '../../hooks';
import { toCalFileUrl } from '../../helpers/calFileUrl';
import { Icon } from '../Icon';
import { back, play } from '../../assets/icons/icons';

interface ThumbProps {
  img: string;
  thumbSrc: string;
  idx: number;
  active: boolean;
  unused: boolean;
  notUsedLabel: string;
  notUsedTag: string;
  onSelect: (index: number) => void;
}

const StripThumb = memo(({ img, thumbSrc, idx, active, unused, notUsedLabel, notUsedTag, onSelect }: ThumbProps) => {
  const handleClick = useCallback(() => onSelect(idx), [onSelect, idx]);
  return (
    <button
      type="button"
      className="img-carousel-container cal-strip-thumb"
      onClick={handleClick}
      title={unused ? notUsedLabel : img.split('/').pop()}
    >
      <img
        src={toCalFileUrl(thumbSrc)}
        alt=""
        loading="lazy"
        className={`img-carousel${active ? ' img-carousel-active' : ''}${unused ? ' cal-strip-unused' : ''}`}
      />
      <span className="img-water-mark">{idx + 1}</span>
      {unused && <span className="cal-strip-unused-tag">{notUsedTag}</span>}
    </button>
  );
});

interface CalibrationStripProps {
  images: string[];
  thumbs: string[];
  selectedIdx: number;
  onSelect: (index: number) => void;
  usedSet: ReadonlySet<string>;
  /** Only after a solve does "unused" mean anything. */
  showUnused: boolean;
}

/**
 * Calibration's thumbnail strip, built on the shared Carousel's classes so it
 * looks like every wizard step's strip (spec amendment A12) without taking on
 * the shared component's coupling to the project store and Processing.
 * calibrationLayout.test.ts pins the shared class list.
 */
export const CalibrationStrip = ({ images, thumbs, selectedIdx, onSelect, usedSet, showUnused }: CalibrationStripProps) => {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);

  const { height: thumbHeight, onDragHandleMouseDown } = useResizableCarousel({
    storageKey: 'river-cal-carousel-height',
    defaultHeight: 90,
    minHeight: 50,
    maxHeight: 220,
    onDragProgress: (h) => {
      listRef.current?.style.setProperty('--thumb-height', `${h}px`);
      listRef.current?.style.setProperty('--thumb-width', `${Math.round(h * (56 / 42))}px`);
    },
  });
  const thumbWidth = Math.round(thumbHeight * (56 / 42));

  const scroll = useCallback((direction: 'backward' | 'forward') => {
    const el = listRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * 0.8 * (direction === 'backward' ? -1 : 1), behavior: 'smooth' });
  }, []);

  const notUsedLabel = t('Calibration.notUsed');
  const notUsedTag = t('Calibration.notUsedTag', { defaultValue: 'Not used' });

  return (
    <div className="carousel-container mt-1">
      <div className="carousel-resize-handle" onMouseDown={onDragHandleMouseDown} />
      <div className="carousel-info">
        <div>
          <input value={selectedIdx + 1} readOnly tabIndex={-1} aria-label={t('Calibration.photoNumber', { defaultValue: 'Photo' })} />
          <p> / {images.length} </p>
        </div>
      </div>
      <div className="carousel">
        <button type="button" className="video-button" onClick={() => scroll('backward')}>
          <Icon path={back} />
        </button>
        <div
          ref={listRef}
          className="cal-strip"
          style={
            {
              '--thumb-height': `${thumbHeight}px`,
              '--thumb-width': `${thumbWidth}px`,
            } as React.CSSProperties
          }
        >
          {images.map((img, idx) => (
            <StripThumb
              key={img}
              img={img}
              thumbSrc={thumbs[idx] ?? img}
              idx={idx}
              active={idx === selectedIdx}
              unused={showUnused && !usedSet.has(img)}
              notUsedLabel={notUsedLabel}
              notUsedTag={notUsedTag}
              onSelect={onSelect}
            />
          ))}
        </div>
        <button type="button" className="video-button" onClick={() => scroll('forward')}>
          <Icon path={play} />
        </button>
      </div>
    </div>
  );
};
```

Update `src/components/Calibration/index.ts`:

```ts
import { CalibrationCanvas } from './CalibrationCanvas';
import { CalibrationStrip } from './CalibrationStrip';
import { CalibrationViewControl } from './CalibrationViewControl';

export { CalibrationCanvas, CalibrationStrip, CalibrationViewControl };
```

- [ ] **Step 4: Append the strip rules**

In `src/pages/pages.css`, append to the end of the Phase 6e block (after `.cal-corner-overlay { ... }`, still before the Lens correction comment):

```css
/* The strip's row. The shared Carousel virtualises its list with react-window;
   calibration sets are small (tens of photos), so a plain scrolling flex row
   with lazy-loaded thumbnails is enough. --thumb-height/--thumb-width come
   from useResizableCarousel via inline custom properties. */
.cal-strip {
    display: flex;
    gap: var(--space-2);
    flex: 1;
    min-width: 0;
    margin-top: 8px;
    overflow-x: auto;
    scrollbar-width: thin;
}

/* Each thumbnail is a real <button> (keyboard-reachable) wearing the shared
   .img-carousel-container look, so the UA button chrome is reset here. */
.cal-strip-thumb {
    flex: 0 0 var(--thumb-width);
    background: none;
    border: 0;
    padding: 0;
}

.cal-strip-thumb .img-carousel {
    display: block;
    width: 100%;
    height: var(--thumb-height);
    object-fit: cover;
}

/* A photo the solver rejected. Must read differently from "not selected",
   which the shared carousel already shows as brightness(0.42), so it is also
   desaturated. Selector is (0,4,0) to beat the shared resting-dim rule's
   (0,3,0); a selected unused photo keeps the normal selected look. */
.cal-strip .img-carousel.cal-strip-unused:not(.img-carousel-active) {
    filter: grayscale(1) brightness(0.3);
}

/* The word that makes an unused photo's state explicit (not colour/dimming
   alone). Sits on the same canvas-chrome backdrop as the other over-image
   labels, since it overlays photo pixels. */
.cal-strip-unused-tag {
    position: absolute;
    bottom: 6px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
    padding: 1px 6px;
    border-radius: var(--radius-full);
    background: var(--canvas-chrome);
    color: var(--overlay-line);
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
}

```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/helpers/calibrationLayout.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 6: Full check**

Run: `npx jest`, `npx tsc --noEmit 2>&1 | grep -c "error TS"`, `npm run lint`
Expected: **70 suites / 732 tests**; `tsc` **64**; lint **20**.

- [ ] **Step 7: Commit**

```bash
git add src/components/Calibration/CalibrationStrip.tsx src/components/Calibration/index.ts src/pages/pages.css src/helpers/calibrationLayout.test.ts
git commit -m "Task 5: Add CalibrationStrip on the shared carousel classes"
```
(append the session's attribution trailer)

---

### Task 6: `FormCalibration` — panel body and footer

**Files:**
- Create: `src/components/Forms/FormCalibration.tsx`
- Modify: `src/components/Forms/index.ts`
- Modify: `src/pages/pages.css` (append to the Phase 6e block)
- Test: `src/helpers/calibrationLayout.test.ts`

**Interfaces:**
- Consumes: `footerAction`, `badgeGrade`, `BadgeGrade`, `FooterBlocker` (Task 1); `.badge`, `.step-alert-content`, `.step-alert-title` (Task 2); `stepAlertClassName(level)` from `src/components/Messages/stepAlertClassName.ts`; existing `FormHeader` and `DropHereText` from `./Components`; existing `Loading`, `SuccessBanner` from `../index`; existing `CalibrationHistogram` from `../Graphs`; types from `src/store/calibration/types.ts`.
- Produces: `FormCalibration` (exported from `src/components/Forms/index.ts`) with props:

```ts
interface FormCalibrationProps {
  status: CalibrationStatus;
  imageCount: number;
  summary: CalibrationSummary | null;
  csvRows: CsvRow[];
  imageResolution: { width: number; height: number } | null;
  progressPercentage: string;
  progressTime: string;
  errorMsg: string;
  onOpenBoard: () => void;
  onOpenFolder: () => void;
  onSolve: () => void;
  onSaveProfile: (cameraName: string, lensName: string) => Promise<string | false>;
  onRevealPath: (path: string) => void;
  onClose: () => void;
}
```

It renders the **children** of `.form-container` (header, `.body`, `.footer`); the page (Task 7) renders the `.form-container` element itself because it owns the drag-and-drop target.

- [ ] **Step 1: Write the failing test**

Append to `src/helpers/calibrationLayout.test.ts`:

```ts
describe('FormCalibration', () => {
  const form = read('components/Forms/FormCalibration.tsx');

  it('opens with the standard FormHeader, without the wizard stepper or section chips', () => {
    expect(form).toMatch(/<FormHeader[^>]*showProgress=\{false\}[^>]*showSections=\{false\}/s);
  });

  it('puts Back and the single Solve/Save action in the standard footer', () => {
    expect(form).toMatch(/className=["']footer["']/);
    expect(form).toMatch(/className=["']wizard-container["']/);
    expect(form).toMatch(/footerAction\(\{/);
    expect(form).toMatch(/aria-disabled=\{action\.blocker !== null\}/);
    expect(form).toMatch(/if \(action\.blocker !== null\) return;/);
  });

  it('renders ratings as .badge through badgeGrade, never as coloured text', () => {
    expect(form).toMatch(/badgeGrade\(/);
    expect(form).toMatch(/`badge badge-\$\{/);
    expect(form).not.toMatch(/cal-metric-|cal-grade-pill/);
  });

  it('merges the recommendations into one titled warning alert', () => {
    expect((form.match(/className=["']step-alert-title["']/g) ?? []).length).toBe(1);
    expect(form).toMatch(/stepAlertClassName\(['"]warning['"]\)/);
  });

  it('keeps the histogram in the panel and off every canvas-side component', () => {
    expect(form).toMatch(/<CalibrationHistogram\b/);
    for (const file of ['CalibrationCanvas', 'CalibrationStrip', 'CalibrationViewControl']) {
      expect(read(`components/Calibration/${file}.tsx`)).not.toMatch(/Histogram/);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/calibrationLayout.test.ts`
Expected: FAIL — ENOENT for `FormCalibration.tsx`.

- [ ] **Step 3: Write the component**

Create `src/components/Forms/FormCalibration.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuCheckCircle } from 'react-icons/lu';
import { DropHereText, FormHeader } from './Components';
import { Loading, SuccessBanner } from '../index';
import { CalibrationHistogram } from '../Graphs';
import { stepAlertClassName } from '../Messages/stepAlertClassName';
import { badgeGrade, footerAction, type BadgeGrade, type FooterBlocker } from '../../helpers/calibrationView';
import type { CalibrationStatus, CalibrationSummary, CsvRow } from '../../store/calibration/types';

/** Solver recommendation strings → their translation keys (moved from the page). */
const ACTION_KEY_MAP: Record<string, string> = {
  'Add frames hitting edges/corners; vary angle & distance.': 'Calibration.actions.addFrames',
  'Push board nearer sensor edges; allow some marker clipping.': 'Calibration.actions.pushBoard',
  'Increase sharpness (more light, lower ISO), reduce screen moiré (resize board).':
    'Calibration.actions.increaseSharpness',
  'Capture from varied viewpoints (tilt/pan/roll) and distances.': 'Calibration.actions.varyViewpoints',
  'Ensure corners appear across the whole sensor; avoid heavy cropping.': 'Calibration.actions.ensureCorners',
  'Re-shoot with better coverage; if persists, inspect image readout/metadata.': 'Calibration.actions.reshoot',
};

const GRADE_WORD: Record<BadgeGrade, string> = { good: 'Good', fair: 'Fair', bad: 'Bad' };

/** Existing, translated metric labels, in the order the solver has always been shown. */
const METRICS = [
  ['Calibration.metrics.medianRms', 'median_rms'],
  ['Calibration.metrics.p90Rms', 'p90_rms'],
  ['Calibration.metrics.coverage', 'coverage'],
  ['Calibration.metrics.edgeReach', 'edge_reach'],
  ['Calibration.metrics.poseSpread', 'pose_spread'],
  ['Calibration.metrics.centerOffset', 'center_offset'],
] as const;

const GradeBadge = ({ grade }: { grade: string | undefined }) => {
  const { t } = useTranslation();
  const g = badgeGrade(grade);
  // No rating from the solver: say nothing rather than claim one.
  if (g === null) return <span className="cal-grade-missing">—</span>;
  return <span className={`badge badge-${g}`}>{t(`Calibration.grade.${g}`, { defaultValue: GRADE_WORD[g] })}</span>;
};

interface FormCalibrationProps {
  status: CalibrationStatus;
  imageCount: number;
  summary: CalibrationSummary | null;
  csvRows: CsvRow[];
  imageResolution: { width: number; height: number } | null;
  progressPercentage: string;
  progressTime: string;
  errorMsg: string;
  onOpenBoard: () => void;
  onOpenFolder: () => void;
  onSolve: () => void;
  onSaveProfile: (cameraName: string, lensName: string) => Promise<string | false>;
  onRevealPath: (path: string) => void;
  onClose: () => void;
}

/**
 * Camera calibration's panel (spec amendment A12): the children of the page's
 * .form-container — header, scrolling body, and the standard footer whose
 * right-hand button is Solve until solved and Save profile after.
 */
export const FormCalibration = ({
  status,
  imageCount,
  summary,
  csvRows,
  imageResolution,
  progressPercentage,
  progressTime,
  errorMsg,
  onOpenBoard,
  onOpenFolder,
  onSolve,
  onSaveProfile,
  onRevealPath,
  onClose,
}: FormCalibrationProps) => {
  const { t } = useTranslation();
  const [cameraName, setCameraName] = useState('');
  const [lensName, setLensName] = useState('');
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [existingCameras, setExistingCameras] = useState<string[]>([]);
  const [comboOpen, setComboOpen] = useState(false);

  // Existing camera names, for the Camera name suggestions.
  useEffect(() => {
    window.ipcRenderer
      .invoke('calibration-list-profiles')
      .then((result: { camera: string }[]) => {
        setExistingCameras((result ?? []).map((g) => g.camera));
      })
      .catch(() => {});
  }, []);

  // A fresh solve clears the previous save's outcome.
  useEffect(() => {
    if (status === 'solved') {
      setSavedPath(null);
      setSaveError(null);
    }
  }, [status]);

  const cameraSuggestions = useMemo(
    () =>
      cameraName.trim().length > 0
        ? existingCameras.filter((c) => c.toLowerCase().includes(cameraName.toLowerCase()) && c !== cameraName)
        : [],
    [cameraName, existingCameras]
  );

  const busy = status === 'solving';
  const action = footerAction({ status, imageCount, cameraName, lensName });

  const blockerText = (blocker: FooterBlocker | null): string | undefined => {
    switch (blocker) {
      case 'noPhotos':
        return t('Calibration.importFirst', { defaultValue: 'Import photos first' });
      case 'solving':
        return t('Calibration.solving');
      case 'nameCameraAndLens':
        return t('Calibration.nameCameraAndLens', { defaultValue: 'Name the camera and lens to save' });
      case 'nameCamera':
        return t('Calibration.nameCamera', { defaultValue: 'Name the camera to save' });
      case 'nameLens':
        return t('Calibration.nameLens', { defaultValue: 'Name the lens to save' });
      default:
        return undefined;
    }
  };

  const handleSave = async () => {
    setSaveError(null);
    const result = await onSaveProfile(cameraName, lensName);
    if (result) {
      setSavedPath(result);
      setCameraName('');
      setLensName('');
    } else {
      setSaveError(t('Calibration.errorGeneric'));
    }
  };

  const remainingTimeLabel = t('Analizing.remainingTime');
  const actions = summary?.verdict?.actions ?? [];

  return (
    <>
      <FormHeader title={t('Calibration.title')} showProgress={false} showSections={false} />

      <div className="body cal-panel-body">
        <p className="cal-sub">{t('Calibration.subtitle', { defaultValue: 'Import photos of the board, then solve.' })}</p>

        <div className="cal-top-actions">
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            aria-disabled={busy}
            title={busy ? t('Calibration.solving') : undefined}
            onClick={() => {
              if (busy) return;
              onOpenBoard();
            }}
          >
            {t('Calibration.board')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            aria-disabled={busy}
            title={busy ? t('Calibration.solving') : undefined}
            onClick={() => {
              if (busy) return;
              onOpenFolder();
            }}
          >
            {t('Calibration.import')}
          </button>
        </div>

        {imageCount === 0 && <DropHereText text={`${t('Calibration.dropZone')} ${t('Calibration.dropHint')}`} show />}

        {imageCount > 0 && status === 'idle' && (
          <p className="cal-count">
            {t('Calibration.photosLoaded', { defaultValue: '{{count}} photos loaded', count: imageCount })}
          </p>
        )}

        {status === 'solving' && (
          <div className="cal-solving-loader">
            <Loading
              percentage={progressPercentage}
              time={progressTime ? `${remainingTimeLabel}${progressTime}` : ''}
              size="big"
              isComplete={progressPercentage === '100%'}
            />
          </div>
        )}

        {(status === 'error' || errorMsg) && (
          <div className={stepAlertClassName('error')} role="alert">
            {errorMsg || t('Calibration.errorGeneric')}
          </div>
        )}

        {status === 'solved' && summary && (
          <>
            <div className="cal-overall">
              <b>
                {t('Calibration.overall', { defaultValue: 'Overall' })}
                <GradeBadge grade={summary.verdict?.grade_overall} />
              </b>
              <button type="button" className="btn btn-sm btn-tertiary" onClick={onSolve}>
                {t('Calibration.solveAgain', { defaultValue: 'Solve again' })}
              </button>
            </div>

            <div className="cal-metrics">
              {METRICS.map(([labelKey, gradeKey]) => (
                <span key={labelKey} className="cal-metric">
                  <span>{t(labelKey)}</span>
                  <GradeBadge grade={summary.verdict?.grades?.[gradeKey]} />
                </span>
              ))}
            </div>

            {actions.length > 0 && (
              <div className={stepAlertClassName('warning')} role="status">
                <div className="step-alert-content">
                  <span className="step-alert-title">
                    {t('Calibration.improveTitle', { defaultValue: 'How to improve this calibration' })}
                  </span>
                  <ul>
                    {actions.map((a) => (
                      <li key={a}>{t(ACTION_KEY_MAP[a] ?? a, a)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {csvRows.length > 0 && (
              <>
                <h3 className="cal-section-title">{t('Calibration.histogram')}</h3>
                <CalibrationHistogram rows={csvRows} />
              </>
            )}

            <h3 className="cal-section-title">
              {t('Calibration.saveSection', { defaultValue: 'Save as camera profile' })}
            </h3>
            <div className="cal-fields">
              <div className="simple-input-container cal-combo">
                <label>{t('Calibration.cameraName')}</label>
                <input
                  type="text"
                  value={cameraName}
                  onChange={(e) => {
                    setCameraName(e.target.value);
                    setComboOpen(true);
                  }}
                  onFocus={() => setComboOpen(true)}
                  onBlur={() => setTimeout(() => setComboOpen(false), 150)}
                  placeholder={t('Calibration.cameraName')}
                />
                {comboOpen && cameraSuggestions.length > 0 && (
                  <ul className="cal-combo-list">
                    {cameraSuggestions.map((c) => (
                      <li
                        key={c}
                        onMouseDown={() => {
                          setCameraName(c);
                          setComboOpen(false);
                        }}
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="simple-input-container">
                <label>{t('Calibration.lensName')}</label>
                <input
                  type="text"
                  value={lensName}
                  onChange={(e) => setLensName(e.target.value)}
                  placeholder={t('Calibration.lensName')}
                />
              </div>
            </div>
            <dl className="cal-kv">
              <dt>{t('Calibration.resolution')}</dt>
              <dd>{imageResolution ? `${imageResolution.width} × ${imageResolution.height} px` : '—'}</dd>
            </dl>

            {savedPath && (
              <SuccessBanner compact icon={LuCheckCircle} title={t('Calibration.savedTo')}>
                <button className="success-banner-link" onClick={() => onRevealPath(savedPath)}>
                  {savedPath}
                </button>
              </SuccessBanner>
            )}
            {saveError && (
              <div className={stepAlertClassName('error')} role="alert">
                {saveError}
              </div>
            )}
          </>
        )}
      </div>

      <div className="footer">
        <div className="wizard-container">
          <button type="button" className="btn btn-lg btn-tertiary" onClick={onClose}>
            {t('Wizard.back')}
          </button>
          <button
            type="button"
            className="btn btn-lg btn-primary"
            aria-disabled={action.blocker !== null}
            aria-busy={action.busy ? true : undefined}
            title={blockerText(action.blocker)}
            onClick={() => {
              if (action.blocker !== null) return;
              if (action.kind === 'solve') onSolve();
              else void handleSave();
            }}
          >
            {action.kind === 'solve' ? t('Calibration.solve') : t('Calibration.saveProfile')}
          </button>
        </div>
      </div>
    </>
  );
};
```

Note on copy: the footer's save label reuses the existing, translated `Calibration.saveProfile` key (it reads "Save" in English), not a new "Save profile" key. The section title directly above ("Save as camera profile") already says what is being saved, and keeping the key keeps the button translated in all 12 locales.

In `src/components/Forms/index.ts`, add the import and export (keep alphabetical order in the export list):

```ts
import { FormCalibration } from './FormCalibration';
```

```ts
export {
  FormAnalizing,
  FormCalibration,
  FormCrossSections,
  ...
```

- [ ] **Step 4: Append the panel rules**

In `src/pages/pages.css`, append to the end of the Phase 6e block (still before the Lens correction comment):

```css
/* The panel body keeps .form-container .body's scrolling and adds side
   padding, which the wizard forms get from their own inner wrappers. */
.cal-panel-body {
    padding: 0 18px;
    box-sizing: border-box;
}

/* One-line instruction under the title. Calibration is the only
   .form-container screen launched outside the wizard, so it has no stepper
   to orient the user and says what to do instead. */
.cal-sub {
    margin: 4px 0 14px;
    text-align: center;
    color: var(--secondary-text-color);
    font-size: var(--text-body);
}

/* Show board / Import images: two small secondary actions side by side,
   above the state-dependent content. */
.cal-top-actions {
    display: flex;
    justify-content: center;
    gap: var(--space-2);
    margin-bottom: 14px;
}

/* "24 photos loaded" — the photos-loaded, not-yet-solved state. */
.cal-count {
    margin-top: 10px;
    text-align: center;
    color: var(--secondary-text-color);
    font-size: var(--text-body);
}

/* Section headings inside the solved results (histogram, save). */
.cal-section-title {
    margin: 18px 0 8px;
    font-size: var(--text-body);
    font-weight: 700;
}

/* Overall rating with Solve again pushed to the right. */
.cal-overall {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
}

.cal-overall b {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: var(--text-section);
}

/* The six metric ratings, two per row: label then badge. */
.cal-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2) var(--space-3);
    margin: 12px 0;
    font-size: var(--text-meta);
}

/* One label + badge pair inside the grid. */
.cal-metric {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    color: var(--secondary-text-color);
}

/* A metric the solver didn't grade: a neutral dash, never a badge. */
.cal-grade-missing {
    color: var(--secondary-text-color);
}

/* Camera name and Lens / zoom side by side. */
.cal-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

/* Resolution: a read-only fact, shown as text rather than a greyed input. */
.cal-kv {
    display: flex;
    justify-content: space-between;
    margin: 10px 0 0;
    font-size: var(--text-meta);
}

.cal-kv dt {
    color: var(--secondary-text-color);
}

.cal-kv dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
}

```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/helpers/calibrationLayout.test.ts src/helpers/legacyButtonRetirement.test.ts`
Expected: PASS. The legacy sweep now verifies three more `aria-disabled` pairings in `FormCalibration.tsx` (identifiers `busy`, `busy`, `action`).

- [ ] **Step 6: Full check**

Run: `npx jest`, `npx tsc --noEmit 2>&1 | grep -c "error TS"`, `npm run lint`
Expected: **70 suites / 737 tests**; `tsc` **64**; lint **20**.

- [ ] **Step 7: Commit**

```bash
git add src/components/Forms/FormCalibration.tsx src/components/Forms/index.ts src/pages/pages.css src/helpers/calibrationLayout.test.ts
git commit -m "Task 6: Add FormCalibration, the calibration panel and footer"
```
(append the session's attribution trailer)

---

### Task 7: Rewrite the page; delete the old calibration CSS

**Files:**
- Modify: `src/pages/CameraCalibration.tsx` (full rewrite)
- Modify: `src/pages/pages.css`
- Modify: `src/helpers/canvasChrome.test.ts` (`FILES` only)
- Test: `src/helpers/calibrationLayout.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–6. `useCalibrationSlice()` returns (unchanged) `status, images, thumbs, usedImages, imageResolution, summary, csvRows, heatmapBase64, undistortedPaths, perFrameCorners, progressPercentage, progressTime, errorMsg, onOpenFolder, onDropFolder, onOpenBoard, onSolve, onSaveProfile, onRevealPath`.
- Produces: `CameraCalibration: React.FC<{ onClose: () => void }>` — same export and props as today, so `HomePage.tsx:49` is untouched.

- [ ] **Step 1: Write the failing tests**

First, at the top of `src/helpers/calibrationLayout.test.ts`, change the `fs` import and add a `.tsx` walker below `read` (top-level imports rather than inline `require`, which the linter would flag):

```ts
import { readdirSync, readFileSync, statSync } from 'fs';
```

```ts
const tsxFiles = (dir: string = SRC): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return tsxFiles(full);
    return full.endsWith('.tsx') ? [full] : [];
  });
```

Then append:

```ts
describe('the calibration page', () => {
  const page = read('pages/CameraCalibration.tsx');
  const pagesCss = read('pages/pages.css');

  it('is built on the standard workspace', () => {
    expect(page).toMatch(/className=["']regular-page["']/);
    expect(page).toMatch(/className=["']media-container["']/);
    expect(page).toMatch(/className=\{`form-container/);
    expect(page).toMatch(/<FormCalibration\b/);
  });

  it('no longer carries the old private layout anywhere in src', () => {
    const OLD = /(?<![\w-])(?:cal-left|cal-right|cal-body|cal-carousel|cal-thumb|cal-view-controls|cal-panel-title|cal-results|drag-over-cal)(?![\w-])/;
    const offenders = tsxFiles().filter((f) => OLD.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  // Every class a pages.css rule names under the cal- prefix must still be
  // used by some .tsx, so a rule orphaned by a later edit fails here.
  const calClasses = (): string[] => [...new Set(pagesCss.match(/\.cal-[a-z-]+/g) ?? [])].map((c) => c.slice(1));
  const allTsx = (): string =>
    tsxFiles()
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');

  it('has no .cal-* rule that no component uses', () => {
    const names = calClasses();
    expect(names.length).toBeGreaterThanOrEqual(15); // canary: the sweep sees the block
    const tsx = allTsx();
    const unused = names.filter((n) => !new RegExp(`(?<![\\w-])${n}(?![\\w-])`).test(tsx));
    expect(unused).toEqual([]);
  });

  it('keeps every .cal-* rule inside the Phase 6e block, each commented or continuing its class family', () => {
    const start = pagesCss.indexOf('CAMERA CALIBRATION (Phase 6e');
    const end = pagesCss.indexOf('/* ── Lens correction settings rows', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    // Nothing calibration-specific may live outside the block (this is also
    // what proves the old block was deleted).
    const outside = pagesCss.slice(0, start) + pagesCss.slice(end);
    expect(outside.match(/\.cal-[a-z-]+/g) ?? []).toEqual([]);

    const block = pagesCss.slice(pagesCss.indexOf('*/', start) + 2, end);
    const rules = [...block.matchAll(/([^{}]*)\{[^{}]*\}/g)];
    expect(rules.length).toBeGreaterThanOrEqual(20); // canary: the sweep sees the block

    // A rule needs its own comment unless it continues the previous rule's
    // class (e.g. `.cal-kv dt` after `.cal-kv`), which that comment covers.
    const bare: string[] = [];
    let previousFirstClass: string | null = null;
    for (const [, prelude] of rules) {
      const commented = prelude.includes('*/');
      const selector = prelude.slice(prelude.lastIndexOf('*/') + 1).trim();
      const firstClass = selector.match(/^\.[a-z-]+/)?.[0] ?? null;
      if (!commented && firstClass !== previousFirstClass) bare.push(selector);
      previousFirstClass = firstClass;
    }
    expect(bare).toEqual([]);
  });

  it('routes view keys through viewForKey and only selects an available view', () => {
    expect(page).toMatch(/viewForKey\(e\.key\)/);
    expect(page).toMatch(/availability\[mode\] === null/);
  });

  it('falls back to Original when the selected view stops being available, and resets the photo on a new folder', () => {
    expect(page).toMatch(/if \(availability\[viewMode\] !== null\) setViewMode\(['"]original['"]\)/);
    expect(page).toMatch(/useEffect\(\(\) => \{\s*setSelectedIdx\(0\);\s*\}, \[images\]\)/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/helpers/calibrationLayout.test.ts`
Expected: FAIL — the six new tests fail (old page has `cal-left`, no `regular-page`, old `.cal-*` rules unused/uncommented, no `viewForKey`).

- [ ] **Step 3: Rewrite the page**

Replace the whole of `src/pages/CameraCalibration.tsx` with:

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCalibrationSlice } from '../hooks';
import { FormCalibration } from '../components/Forms';
import { CalibrationCanvas, CalibrationStrip, CalibrationViewControl } from '../components/Calibration';
import { toCalFileUrl } from '../helpers/calFileUrl';
import { viewAvailability, viewForKey, type CalibrationViewMode } from '../helpers/calibrationView';

interface Props {
  onClose: () => void;
}

/**
 * Camera calibration, a full-screen overlay launched from Home, laid out on
 * the same workspace as every wizard step (spec §4/6e, amendment A12): the
 * canvas and strip on the left, FormCalibration's panel and footer on the right.
 * This page owns selection, view mode, keyboard and drag-and-drop.
 */
export const CameraCalibration: React.FC<Props> = ({ onClose }) => {
  const {
    status,
    images,
    thumbs,
    usedImages,
    imageResolution,
    summary,
    csvRows,
    heatmapBase64,
    undistortedPaths,
    perFrameCorners,
    progressPercentage,
    progressTime,
    errorMsg,
    onOpenFolder,
    onDropFolder,
    onOpenBoard,
    onSolve,
    onSaveProfile,
    onRevealPath,
  } = useCalibrationSlice();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [viewMode, setViewMode] = useState<CalibrationViewMode>('original');
  const [dragOver, setDragOver] = useState(false);

  const usedSet = useMemo(() => new Set(usedImages), [usedImages]);
  const availability = useMemo(() => viewAvailability(status, Boolean(heatmapBase64)), [status, heatmapBase64]);

  // A new folder starts on its first photo (a shorter list must not leave the
  // selection pointing past its end).
  useEffect(() => {
    setSelectedIdx(0);
  }, [images]);

  // After a solve, show the corrected view on the first photo the solver used.
  useEffect(() => {
    if (status === 'solved') {
      setViewMode('corrected');
      const firstUsedIdx = images.findIndex((img) => usedSet.has(img));
      setSelectedIdx(firstUsedIdx >= 0 ? firstUsedIdx : 0);
    }
  }, [status, images, usedSet]);

  // A view that stops being available (a new import resets status to idle)
  // must not stay selected-but-disabled on the switch.
  useEffect(() => {
    if (availability[viewMode] !== null) setViewMode('original');
  }, [availability, viewMode]);

  // Preload neighbours so switching photos feels instant; decode() forces the
  // JPEG decode before the user gets there.
  useEffect(() => {
    const preload = (p: string) => {
      const img = new Image();
      img.src = toCalFileUrl(p);
      img.decode().catch(() => {});
    };
    for (let d = 1; d <= 3; d++) {
      if (images[selectedIdx - d]) preload(images[selectedIdx - d]);
      if (images[selectedIdx + d]) preload(images[selectedIdx + d]);
    }
  }, [selectedIdx, images]);

  // Keys: ←/→ photos, 1/2/H views, Esc leaves Heatmap or closes the screen.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') {
        if (viewMode === 'heatmap') setViewMode('original');
        else onClose();
        return;
      }
      if (e.key === 'ArrowLeft') {
        setSelectedIdx((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === 'ArrowRight') {
        setSelectedIdx((i) => Math.min(images.length - 1, i + 1));
        return;
      }
      const mode = viewForKey(e.key);
      if (mode && availability[mode] === null) setViewMode(mode);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [images.length, viewMode, availability, onClose]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const items = e.dataTransfer.items;
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry?.isDirectory) {
          const file = items[i].getAsFile();
          if (file) {
            await onDropFolder(window.webUtils.getPathForFile(file));
            return;
          }
        }
      }
      // Fallback: individual image files → use parent directory of first file
      const files = Array.from(e.dataTransfer.files);
      const first = files.find((f) => /\.(jpg|jpeg|png)$/i.test(f.name));
      if (first) {
        const p = window.webUtils.getPathForFile(first);
        await onDropFolder(p.substring(0, p.lastIndexOf('/')));
      }
    },
    [onDropFolder]
  );

  const selectedImg = images[selectedIdx];
  const usedIdx = selectedImg ? usedImages.indexOf(selectedImg) : -1;
  const undistortedPath = usedIdx >= 0 ? (undistortedPaths[usedIdx] ?? null) : null;
  const corners = usedIdx >= 0 ? perFrameCorners[usedIdx] : undefined;

  return (
    <div className="cal-overlay">
      <div className="regular-page">
        <div className="media-container">
          {images.length > 0 && (
            <CalibrationViewControl viewMode={viewMode} onSetViewMode={setViewMode} availability={availability} />
          )}
          <CalibrationCanvas
            viewMode={viewMode}
            status={status}
            image={selectedImg}
            undistortedPath={undistortedPath}
            corners={corners}
            heatmapBase64={heatmapBase64}
          />
          {images.length > 0 && (
            <CalibrationStrip
              images={images}
              thumbs={thumbs}
              selectedIdx={selectedIdx}
              onSelect={setSelectedIdx}
              usedSet={usedSet}
              showUnused={status === 'solved'}
            />
          )}
        </div>
        <div
          className={`form-container${dragOver ? ' drag-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDragEnd={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <FormCalibration
            status={status}
            imageCount={images.length}
            summary={summary}
            csvRows={csvRows}
            imageResolution={imageResolution}
            progressPercentage={progressPercentage}
            progressTime={progressTime}
            errorMsg={errorMsg}
            onOpenBoard={() => onOpenBoard()}
            onOpenFolder={onOpenFolder}
            onSolve={onSolve}
            onSaveProfile={onSaveProfile}
            onRevealPath={onRevealPath}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};
```

If `tsc` reports that `onRevealPath` or `onOpenFolder` doesn't match `() => void` / `(path: string) => void` because it returns a Promise, that is assignable in TypeScript and should not error; if it does, wrap it at the call site (`onRevealPath={(p) => void onRevealPath(p)}`) and record a ruling.

- [ ] **Step 4: Rebuild the calibration CSS**

In `src/pages/pages.css`:

1. **Delete** the `.drag-over-cal { ... }` rule (around line 179). The page now uses the shared `.form-container.drag-over` from `form.css`.
2. **Delete** the old block: from the line `/* =============================================================================` directly above `   CAMERA CALIBRATION OVERLAY` through the last line before the new `/* ====...` header of `   CAMERA CALIBRATION (Phase 6e, spec amendment A12)`. Read the block before deleting it; everything in it is either replaced by a shared rule or re-added in item 3.
3. **Add** these five survivors to the new Phase 6e block, immediately after its header comment and before `.cal-undistorted-wrap`. They are the old rules with their values unchanged and a comment added:

```css
/* Full-screen overlay: calibration opens over Home rather than as a wizard
   step (spec §4/6e keeps it that way). Inside it is a plain .regular-page. */
.cal-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: var(--background-color);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

/* The canvas box inside .media-container: takes the height left over by the
   strip, and centres whichever image the current view shows. */
.cal-canvas {
    flex: 1 1 0;
    min-height: 0;
    width: 98%;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
}

/* Fit the photo, corrected photo or heatmap inside the canvas box without
   cropping — calibration users inspect corners at the image edges. */
.cal-canvas-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
}

/* "No photos yet" / "Not used in calibration" in place of an image. */
.cal-canvas-placeholder {
    color: var(--secondary-text-color);
    font-size: 0.85rem;
    text-align: center;
    padding: 20px;
}

/* Centres the existing Loading progress in the panel while the solver runs. */
.cal-solving-loader {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px 0;
    gap: 12px;
    flex: 1;
}

```

4. **Also add** the combobox survivors at the end of the Phase 6e block (after `.cal-kv dd`), values unchanged:

```css
/* Camera name suggestions: a dropdown of previously saved camera names,
   anchored under the input. */
.cal-combo {
    position: relative;
}

/* The suggestions list itself, floating over the fields below it. */
.cal-combo-list {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 20;
    background: var(--secondary-background-color);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    list-style: none;
    margin: 0;
    padding: 4px 0;
    overflow: hidden;
}

.cal-combo-list li {
    padding: 8px 18px;
    font-size: 15px;
    color: var(--primary-text-color);
    cursor: pointer;
    transition: background 0.1s;
}

.cal-combo-list li:hover {
    background: var(--on-hover);
}

```

Verify: `grep -c "^\.cal-\|^\.cal-[a-z-]* " src/pages/pages.css` — expect roughly 30 rule openings, down from 60, and `grep -o "^\.cal-[a-z-]*" src/pages/pages.css | sort -u | wc -l` — expect **24** distinct classes, down from 42. (These are sanity numbers for the report, not assertions; the tests in Step 1 are the gate.)

- [ ] **Step 5: Add the calibration files to the canvas-chrome sweep**

In `src/helpers/canvasChrome.test.ts`, add four entries to the `FILES` array (after `'pages/VideoRange.tsx'` for the page, and at the end for the components):

```ts
const FILES = [
  'pages/CameraCalibration.tsx',
  'pages/CrossSections.tsx',
  'pages/Processing.tsx',
  'pages/VideoRange.tsx',
  'components/VideoPlayer/VideoPlayer.tsx',
  'components/VideoPlayer/StabilizationCanvas.tsx',
  'components/Carousel.tsx',
  'components/ImageProcessing.tsx',
  'components/FloatingPlot.tsx',
  'components/Calibration/CalibrationCanvas.tsx',
  'components/Calibration/CalibrationStrip.tsx',
  'components/Calibration/CalibrationViewControl.tsx',
];
```

The calibration page and components set no inline `position: 'absolute'` (Task 4's test pins that for the canvas), so the sweep should find no new candidates and its allow-list count (3) is unchanged.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx jest src/helpers/calibrationLayout.test.ts src/helpers/canvasChrome.test.ts src/helpers/legacyButtonRetirement.test.ts src/helpers/listPrimitiveAdoption.test.ts src/helpers/homeToolbarLayout.test.ts src/helpers/footageTileContent.test.ts`
Expected: PASS, all six suites. If the "comment directly above" test names a class, add a comment above that rule — do not loosen the test.

- [ ] **Step 7: Full check**

Run: `npx jest`, `npx tsc --noEmit 2>&1 | grep -c "error TS"`, `npm run lint`
Expected: **70 suites / 743 tests**; `tsc` **64**; lint **20**. Lint may flag the page's keyboard effect for exhaustive deps if a dependency is missing; the dependency list above is complete (`images.length, viewMode, availability, onClose`, with state setters stable).

- [ ] **Step 8: Commit**

```bash
git add src/pages/CameraCalibration.tsx src/pages/pages.css src/helpers/canvasChrome.test.ts src/helpers/calibrationLayout.test.ts
git commit -m "Task 7: Rebuild the calibration page on the standard workspace"
```
(append the session's attribution trailer)

---

### Task 8: Doc comments, final check

**Files:**
- Modify: `src/helpers/canvasChrome.test.ts` (doc comment)
- Modify: `src/helpers/listPrimitiveAdoption.test.ts` (doc comment)

**Interfaces:**
- Consumes: nothing code-facing. This task keeps two guard comments true now that 6e has changed what they describe (a passing guard whose comment describes a world that no longer exists is the "guard can fail green" class of problem).

- [ ] **Step 1: Update `canvasChrome.test.ts`'s scope paragraph**

Replace the sentence that begins `CameraCalibration.tsx is out of scope:` (it currently says the page has zero `media-container` occurrences and "is not rebuilt onto the standard workspace until a later phase (6e)") with:

```ts
 * ImageProcessing, FloatingPlot). CameraCalibration.tsx and its three
 * canvas-side components (components/Calibration/) joined the sweep in Phase
 * 6e, when the calibration overlay was rebuilt onto the standard workspace;
 * none of them sets an inline `position`, so they add no candidates.
```

Keep the lines before and after it unchanged, and update the count wording "these 8 files" if it appears to "these files".

- [ ] **Step 2: Update `listPrimitiveAdoption.test.ts`'s example list**

In the doc comment above `hasClassToken` (around line 100), the example class names include `cal-save-section` and `cal-back-section`, which Task 7 deleted. Replace them with two compound names that still exist, so the comment keeps describing live code:

```ts
 * `lens-correction-section`, `summary-last-section` - and `\bsection\b`
 * matches inside every one of them (`\b` only requires a word/non-word
```

Check the result reads grammatically ("…appears as part of many unrelated, live, legitimate compound class names in this codebase - `lens-correction-section`, `summary-last-section` - and…"), and fix the count wording if the comment says "those four" nearby — make it "those".

- [ ] **Step 3: Full regression**

Run:
```bash
npx jest
npx tsc --noEmit 2>&1 | grep -c "error TS"
npm run lint
```
Expected: **70 suites / 743 tests** passing (694 + 15 + 15 + 3 + 2 + 3 + 5 + 6); `tsc` **64**; lint **20 problems (17 errors, 3 warnings)**. Report the actual numbers.

- [ ] **Step 4: Commit**

```bash
git add src/helpers/canvasChrome.test.ts src/helpers/listPrimitiveAdoption.test.ts
git commit -m "Task 8: Keep canvasChrome and listPrimitiveAdoption comments true after 6e"
```
(append the session's attribution trailer)

---

## After this plan

- **Manual three-theme walkthrough of the calibration overlay** (dark, light, dracula) is owed, per spec §7. Jest cannot see layout. Check against the approved preview, in particular: the panel's vertical fit on a short window once solved (it scrolls inside `.body`); the strip's thumbnails at the smallest and largest saved heights; the "Not used" tag legibility; the `.badge` dot in light "Fair"; and that `.seg-float` sits above the image (it has `z-index: 5` since 6d).
- **Translations:** the new keys this plan introduces (`Calibration.subtitle`, `photosLoaded`, `importFirst`, `nameCameraAndLens`, `nameCamera`, `nameLens`, `solveFirst`, `noHeatmap`, `viewTablist`, `noPhotos`, `notUsedTag`, `photoNumber`, `overall`, `solveAgain`, `improveTitle`, `saveSection`, `grade.good/fair/bad`) fall through to English `defaultValue` in all 12 locales until the owed translation pass (spec §6).
