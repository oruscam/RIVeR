# Phase 6d — Processing Preview Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the implicit "click a technique row's name to change the canvas preview" behaviour with an explicit `Frames | Space-time | Spectrum` segmented control on the canvas itself, and move `previewMode` from component-local state into `uiSlice` as a first-class, user-visible view mode.

**Architecture:** One new component (`PreviewModeControl`, a `.seg` consumer on a new translucent `.seg-float` backdrop) renders inside `Processing.tsx`'s `.media-container`. `previewMode` moves from `Processing.tsx`'s local `useState` into `uiSlice`. `FormProcessing.tsx`'s three technique-name elements lose their click handler and `aria-pressed` — they become plain labels, since the segmented control is now the only thing that changes what the canvas shows. A new `--canvas-chrome` token unifies the translucent-dark-blur backdrop already duplicated, un-tokenized, in `.mode-hint` and `.mask-toolbar`; `.seg-float` becomes its third consumer.

**Tech Stack:** Electron, React 18.3.1, TypeScript, Redux Toolkit, Jest 29 + ts-jest (`testEnvironment: "node"`, **no DOM**), i18next.

**Spec:** `docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md` (§4/6d, §2's canvas rule, amendment A4, amendment A10/D12)

**Approved preview:** `docs/superpowers/previews/2026-09-30-phase-6d-processing-preview-control.html` — approved by the product owner 2026-09-30. Two values in it were proposals, not spec text, and are now locked in by that approval: **`--canvas-chrome: rgba(10, 12, 14, 0.84)`** (replacing `.mode-hint`'s 0.82 and `.mask-toolbar`'s 0.86) and **top-centre placement** for `.seg-float` (the one canvas edge the mode-hint pill, shape toolbar, and colour bar don't already own).

**Scope note:** the spec's §4/6d text describes rebuilding the technique rows as part of this sub-plan; that work actually shipped in 6c (amendment A10/D12 — "the technique-row rebuild belongs to 6c, not 6d, because the rows and the export icon are one visual unit"). `FormProcessing.tsx`'s rows are therefore already a grid with aligned toggles, Median pill, export icon and angle-reset — 6d touches only the row-click-to-preview behaviour on top of that shipped state, not the rows' layout.

---

## Global Constraints

Every task's requirements implicitly include this section.

- Git author must be `antoine.patalano@gmail.com`. Never commit to `main` or `river-labs`. The branch `ui/design-refresh` stays unmerged.
- All work happens in the worktree `/Users/antoine/river_compil/.worktrees/ui-design-refresh/gui`. **Never `cd` to the original repository root.**
- **Never edit `src/translations/*/global.json`.** New copy uses `t(key, { defaultValue })` only.
- **Never use bare `git stash` / `git stash pop`** — the stash stack is shared with the main checkout and other worktrees. Prefer a temporary WIP commit; if you must stash, `git stash push -u -m "<unique-tag>"` then `git stash apply <sha>`, never `pop`.
- **Never run `git checkout -- <file>`** to undo an experiment — it reverts the whole file. Undo with an editor or `perl -0pi`.
- Contrast floors in `src/helpers/themeStateContrast.test.ts` **may never be lowered**, and no existing assertion in any test file may be weakened, deleted, or have a threshold reduced. `--canvas-chrome` is a literal value used identically in all three themes (like `--overlay-line`/`--overlay-dim` already in `index.css`), not a themed token, so it adds no new entries to that file — see Task 3's note.
- The lint command is **`npm run lint`** exactly. `npx eslint src --ext .ts,.tsx` under-reports and has already caused one false alarm in this branch.
- Baseline at the start of 6d (measured 2026-09-30 against `c36464b`): **65 suites / 677 tests passing**, `npx tsc --noEmit` **64 errors**, `npm run lint` **20 problems (17 errors, 3 warnings)**. These three counts may not regress. New tests raise the test count; report the new number in the final task.
- Commit messages end with exactly:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  ```

### Carried-over contracts from 6a-6c — read before writing any state

1. **The `aria-disabled` dual contract.** Chromium dispatches no pointer events — and therefore no `title` tooltip — on a natively `disabled` control. A control that must explain _why_ it is unavailable carries `aria-disabled="true"` instead of `disabled`, **and** an early-return guard in its click handler (`onClick={() => { if (!cond) return; ... }}` — a block body, not a `&&` short-circuit), because `aria-disabled` is advisory only. `src/helpers/legacyButtonRetirement.test.ts` sweeps **every** `.tsx` file in `src/` for this pairing already; it will pick up the new component automatically — see Task 5.
2. **Selected-state contract (spec §4/6a):** `.seg button` matches `[aria-pressed="true"], [aria-selected="true"]`. `PreviewModeControl` uses `role="tablist"`/`role="tab"`/`aria-selected`, exactly the reading 6a's contract was written to support for this consumer by name.
3. **Token collapse.** `--surface-field` ≡ `--input-background`; `--surface-raised` ≡ `--card-surface` ≡ `--surface-panel` (1.00:1); dracula `--border-color` ≡ `--on-hover` ≡ `--input-background`; light `--surface-field` vs `--surface-panel` is 1.05:1. Not directly relevant to 6d's new rules (none of them sit on a themed surface token — `.seg-float` sits on `--canvas-chrome`, a literal), but do not "correct" `.seg-float` toward a themed surface token later; it must stay legible over arbitrary video footage in all three themes, which a themed token cannot guarantee.
4. **A hover rule out-specifies a state rule; a media query adds no specificity; a guard can fail green.** Every sweep this plan adds gets a canary asserting it still sees something known-present (see Task 5's and Task 6's tests).
5. Jest here has **no DOM**. No test in this project can observe cascade, specificity, media queries, or geometry. Verification of `.seg-float`'s actual on-screen appearance happens via the approved preview and the manual three-theme walkthrough, not via Jest.

---

## Review Focus

- **A user opens Processing before running anything.** `stiPaths`/`spectrumPaths` are both empty, `stivAvailable` may still be the optimistic `true` default. Space-time and Spectrum must render `aria-disabled` with a tooltip, Frames must be selected, and nothing must throw. Covered in Task 5's tests (`canToggleSti`/`canToggleIwave` both `false`) and Task 2's reset-effect test.
- **STIV weights are missing on disk.** `stivAvailable` is `false` — the Space-time segment's tooltip must say so specifically (`Processing.stivWeightsMissing`), not the generic "Run STIV first" (`Processing.noStisYet`). Covered in Task 5.
- **A previously-selected non-Frames mode becomes unavailable mid-session** (e.g. STI paths clear because the active section changed). `Processing.tsx`'s existing reset effect (lines 116-119 pre-6d) must still fire and flip `previewMode` back to `'frames'` through the new `uiSlice` action, not silently leave the segmented control showing a selected-but-now-disabled segment. Covered in Task 2.
- **Clicking a technique's name no longer does anything.** A regression here would be silent — no error, just the old behaviour quietly coming back. Task 6's guard test greps `FormProcessing.tsx` for any remaining `onClick`/`setPreviewMode` reference on the three name elements and fails if one reappears.
- **`--canvas-chrome`'s two pre-existing consumers must not visibly change.** `.mode-hint` moves from 0.82 alpha and `.mask-toolbar` from 0.86 to a shared 0.84 — both are small enough to be a non-issue per the approved preview, but Task 3's test pins the exact value so a future edit can't silently drift it back apart.

---

## File Structure

**Created**

- `src/components/PreviewModeControl.tsx` — the `Frames | Space-time | Spectrum` segmented control, rendered once inside `Processing.tsx`'s `.media-container`.
- `src/helpers/previewModeAdoption.test.ts` — guards (a) that `FormProcessing.tsx`'s technique-name elements carry no `previewMode`-changing interaction any more, and (b) that `.seg-float`/`--canvas-chrome` are wired the way this plan claims.

**Modified**

- `src/store/ui/types.ts` — `UIState` gains `previewMode: PreviewMode`.
- `src/store/ui/uiSlice.ts` — initial state + `setPreviewMode` reducer + export.
- `src/store/ui/uiSlice.test.ts` — reducer tests for `setPreviewMode`.
- `src/hooks/useUiSlice.ts` — exposes `previewMode` / `onSetPreviewMode`.
- `src/pages/Processing.tsx` — drops the local `useState<PreviewMode>`, reads/writes via `useUiSlice()`, renders `<PreviewModeControl>`.
- `src/components/Forms/FormProcessing.tsx` — the three technique-name `<button>`s lose `onClick`/`aria-pressed`/`title` and become `<span>`s; colour/bold identity (driven by the row's own `active` prop, not the button's own state) is unchanged.
- `src/components/Forms/form.css` — removes the now-dead button-reset and cursor rules the comments at `form.css:723-739,759-774` tied specifically to the name being a clickable `<button>`.
- `src/components/Messages/messages.css` — `.mode-hint`'s background/blur become `var(--canvas-chrome)` + `blur(6px)`.
- `src/components/components.css` — `.mask-toolbar`'s background/blur become `var(--canvas-chrome)` + `blur(6px)`.
- `src/index.css` — declares `--canvas-chrome`; adds `.seg-float`/`.seg-float button` rules next to the existing `.seg` family.
- `src/helpers/canvasChrome.test.ts` — updates its doc comment: three sanctioned canvas-chrome things now (mode-hint pill, per-shape toolbar, `.seg-float`), not two. No logic change — `.seg-float` is CSS-class-positioned like `.mode-hint`/`.mask-toolbar`, invisible to this sweep by construction (see the file's own comment), so nothing here needs a new allow-list entry.
- `docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md` — amendment A11, recording the `--canvas-chrome` alpha and placement decisions taken during preview review, mirroring how A10 recorded 6c's.

---

### Task 1: `previewMode` in `uiSlice`

**Files:**
- Modify: `src/store/ui/types.ts`
- Modify: `src/store/ui/uiSlice.ts`
- Test: `src/store/ui/uiSlice.test.ts`
- Modify: `src/hooks/useUiSlice.ts`

**Interfaces:**
- Produces: `setPreviewMode(mode: PreviewMode)` action, `state.previewMode: PreviewMode` (initial `'frames'`), and `useUiSlice()`'s `previewMode` / `onSetPreviewMode(mode: PreviewMode)`. Task 2 consumes all three; Task 5's `PreviewModeControl` consumes `previewMode` and `onSetPreviewMode` as props passed down from `Processing.tsx`.

- [ ] **Step 1: Write the failing reducer test**

Add to `src/store/ui/uiSlice.test.ts` (extend the existing `import` list and `baseState` — both already exist in the file):

```ts
import reducer, {
  setModeHint,
  clearModeHint,
  setFieldError,
  clearFieldError,
  clearAllFieldErrors,
  addStepAlert,
  clearStepAlert,
  clearAllStepAlerts,
  showToast,
  clearToast,
  setPinnedStation,
  toggleStationPin,
  setPreviewMode,
} from './uiSlice';
```

```ts
const baseState = (overrides: Partial<UIState> = {}): UIState =>
  ({
    screenSizes: { width: 0, height: 0 },
    theme: 'dark',
    modeHint: null,
    fieldErrors: {},
    stepAlerts: [],
    toast: null,
    isLoading: false,
    seeAll: true,
    language: 'en',
    hoveredStation: null,
    pinnedStation: null,
    showInterrogationWindow: false,
    previewMode: 'frames',
    ...overrides,
  }) as UIState;
```

```ts
describe('previewMode', () => {
  it('defaults to frames', () => {
    expect(baseState().previewMode).toBe('frames');
  });

  it('switches to sti', () => {
    const state = reducer(baseState(), setPreviewMode('sti'));
    expect(state.previewMode).toBe('sti');
  });

  it('switches to iwave', () => {
    const state = reducer(baseState(), setPreviewMode('iwave'));
    expect(state.previewMode).toBe('iwave');
  });

  it('switches back to frames', () => {
    const withSti = baseState({ previewMode: 'sti' });
    expect(reducer(withSti, setPreviewMode('frames')).previewMode).toBe('frames');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/store/ui/uiSlice.test.ts`
Expected: FAIL — `setPreviewMode` is not exported from `./uiSlice`, and `baseState()`'s object literal doesn't satisfy `UIState` (missing `previewMode`) until Step 3 also updates `types.ts`.

- [ ] **Step 3: Add `previewMode` to the state type**

In `src/store/ui/types.ts`, add to the `UIState` interface, right after `showInterrogationWindow`:

```ts
  /** Interrogation-window size preview on the Processing image. Off by default —
   *  it's a reference overlay, not something needed on every frame. */
  showInterrogationWindow: boolean;
  /** Which per-technique preview Processing's canvas is showing — Frames,
   *  Space-time (STIV) or Spectrum (iWave). Lives here rather than as
   *  component-local state because it's a user-visible view mode the
   *  segmented control on the canvas both reads and writes (Phase 6d). */
  previewMode: PreviewMode;
}
```

- [ ] **Step 4: Add the reducer**

In `src/store/ui/uiSlice.ts`, add `previewMode: 'frames'` to `initialState` (right after `showInterrogationWindow: false,`), add the reducer case right after `setShowInterrogationWindow`:

```ts
    setShowInterrogationWindow: (state, action: PayloadAction<boolean>) => {
      state.showInterrogationWindow = action.payload;
    },
    setPreviewMode: (state, action: PayloadAction<UIState['previewMode']>) => {
      state.previewMode = action.payload;
    },
```

and export it alongside the others:

```ts
export const {
  changeTheme,
  setTheme,
  setModeHint,
  clearModeHint,
  setFieldError,
  clearFieldError,
  clearAllFieldErrors,
  addStepAlert,
  clearStepAlert,
  clearAllStepAlerts,
  showToast,
  clearToast,
  clearMessage,
  setLoading,
  setMessage,
  setScreen,
  setSeeAll,
  setLanguage,
  setIsLastVersion,
  setHoveredStation,
  setPinnedStation,
  toggleStationPin,
  setShowInterrogationWindow,
  setPreviewMode,
} = uiSlice.actions;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest src/store/ui/uiSlice.test.ts`
Expected: PASS, all `previewMode` cases green.

- [ ] **Step 6: Wire the hook**

In `src/hooks/useUiSlice.ts`:

```diff
 import {
   changeTheme,
   setTheme,
   setModeHint,
   clearModeHint,
   setFieldError,
   clearFieldError,
   clearAllFieldErrors,
   addStepAlert,
   clearStepAlert,
   clearAllStepAlerts,
   showToast,
   clearToast,
   setSeeAll,
   setScreen,
   setLanguage,
   setIsLastVersion,
   setMessage,
   setHoveredStation,
   setPinnedStation,
   toggleStationPin,
   setShowInterrogationWindow,
+  setPreviewMode,
 } from '../store/ui/uiSlice';
-import { ThemeType } from '../store/ui/types';
+import { ThemeType, UIState } from '../store/ui/types';
```

```diff
   const {
     theme,
     modeHint,
     fieldErrors,
     stepAlerts,
     toast,
     isLoading,
     seeAll,
     screenSizes,
     message,
     language,
     isLatestVersion,
     latestVersion,
     hoveredStation,
     pinnedStation,
     showInterrogationWindow,
+    previewMode,
   } = useSelector((state: RootState) => state.ui);
```

Add the method next to `onSetShowInterrogationWindow`:

```ts
  /**
   * Switches which per-technique preview Processing's canvas shows. Written
   * by the canvas segmented control (PreviewModeControl) and, on stale
   * selections, by Processing.tsx's own reset effect.
   */
  const onSetPreviewMode = (mode: UIState['previewMode']) => {
    dispatch(setPreviewMode(mode));
  };
```

And add both to the `return`:

```diff
     hoveredStation,
     pinnedStation,
     showInterrogationWindow,
+    previewMode,

     // METHODS
     onChangeTheme,
     onSetTheme,
     onSetModeHint,
     onClearModeHint,
     onSetFieldError,
     onClearFieldError,
     onClearAllFieldErrors,
     onAddStepAlert,
     onClearStepAlert,
     onClearAllStepAlerts,
     onShowToast,
     onClearToast,
     onSetMessage,
     onSetSeeAll,
     onSetScreen,
     onSetLanguage,
     onCheckVersion,
     onSetHoveredStation,
     onPinStation,
     onUnpinStation,
     onSetShowInterrogationWindow,
+    onSetPreviewMode,
   };
```

- [ ] **Step 7: Full check**

Run: `npx jest src/store/ui/ src/hooks/` and `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: new tests pass, `tsc` error count still 64 (no new errors — `useUiSlice.ts`'s existing consumers are untouched, this only adds exports).

- [ ] **Step 8: Commit**

```bash
git add src/store/ui/types.ts src/store/ui/uiSlice.ts src/store/ui/uiSlice.test.ts src/hooks/useUiSlice.ts
git commit -m "$(cat <<'EOF'
Task 1: Move previewMode into uiSlice

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `Processing.tsx` reads/writes `previewMode` from `uiSlice`

**Files:**
- Modify: `src/pages/Processing.tsx`

**Interfaces:**
- Consumes: `useUiSlice()`'s `previewMode` / `onSetPreviewMode` from Task 1.
- Produces: `Processing.tsx` no longer owns `previewMode` as local state — `FormProcessing`'s `previewMode`/`setPreviewMode` props and `ImageProcessing`'s `previewMode` prop are unchanged in type/shape, just sourced differently, so Task 6 (which edits `FormProcessing.tsx`'s body, not its prop contract) is unaffected by this task's diff.

- [ ] **Step 1: Read the current effect this task must preserve**

`Processing.tsx` currently (pre-6d) has, among its hooks:

```ts
const [previewMode, setPreviewMode] = useState<PreviewMode>('frames');
```

and later:

```ts
useEffect(() => {
  if (previewMode === 'sti' && stiPaths.length === 0) setPreviewMode('frames');
  if (previewMode === 'iwave' && spectrumPaths.length === 0) setPreviewMode('frames');
}, [previewMode, stiPaths, spectrumPaths]);
```

This effect is the Review Focus case "a previously-selected mode becomes unavailable mid-session" — it must keep working, just through the new action.

- [ ] **Step 2: Swap local state for the slice**

In `src/pages/Processing.tsx`:

1. Remove `const [previewMode, setPreviewMode] = useState<PreviewMode>('frames');`.
2. `useUiSlice()` is already destructured near the top (`const { onAddStepAlert, onClearStepAlert, onSetSeeAll } = useUiSlice();`) — add `previewMode, onSetPreviewMode` to that same destructure:

```ts
  const { onAddStepAlert, onClearStepAlert, onSetSeeAll, previewMode, onSetPreviewMode } = useUiSlice();
```

3. Update the reset effect to call the slice action:

```ts
  useEffect(() => {
    if (previewMode === 'sti' && stiPaths.length === 0) onSetPreviewMode('frames');
    if (previewMode === 'iwave' && spectrumPaths.length === 0) onSetPreviewMode('frames');
  }, [previewMode, stiPaths, spectrumPaths, onSetPreviewMode]);
```

4. Every other existing reference to `previewMode` in this file (the `activeList` computation, the `onSetActiveImage` effect, the JSX passed to `ImageProcessing`/`Carousel`/`FormProcessing`) stays exactly as it reads today — it's the same identifier, just sourced from the hook now. Where `FormProcessing` is given `setPreviewMode={setPreviewMode}`, change that one prop value to `setPreviewMode={onSetPreviewMode}` (the prop *name* `FormProcessing` expects is unchanged — see Task 6's interface note).
5. The `import type { PreviewMode } from '../store/ui/types';` line becomes unused in this file once the local `useState<PreviewMode>` is gone (nothing else in `Processing.tsx` names the type directly) — remove it. If `npx tsc --noEmit` or lint still reports it as needed for some other reference, leave it; check before removing.
6. `PreviewModeControl` (built in Task 5) is not rendered yet — that's this task's boundary. Don't add it here; Task 5 adds it in the same file.
7. **Leave `FormProcessing`'s `setPreviewMode` prop and its call-site value exactly as this step's rename leaves them** (`setPreviewMode={onSetPreviewMode}`), even though Task 6 is about to delete the three call sites inside `FormProcessing.tsx` that use it. Task 6 owns removing the now-dead prop from both ends (it's editing `FormProcessing.tsx` anyway) — don't do it here, so each task's diff stays scoped to the file it's named for.

- [ ] **Step 3: Verify no regression**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` and `npx jest`
Expected: `tsc` error count still 64; all 677+ existing tests still pass (this task adds no new test file — Task 1's reducer test already covers the action itself; this task is a call-site swap with no new branch of logic).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Processing.tsx
git commit -m "$(cat <<'EOF'
Task 2: Read/write previewMode through uiSlice in Processing.tsx

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `--canvas-chrome` token

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/Messages/messages.css`
- Modify: `src/components/components.css`
- Test: `src/helpers/previewModeAdoption.test.ts` (created here, extended in Tasks 4, 5 and 6)

**Interfaces:**
- Produces: the CSS custom property `--canvas-chrome`, declared once, value `rgba(10, 12, 14, 0.84)`. Task 4's `.seg-float` consumes it as its third user.

- [ ] **Step 1: Write the failing token test**

Create `src/helpers/previewModeAdoption.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const read = (relPath: string) => readFileSync(join(SRC, relPath), 'utf8');

describe('--canvas-chrome token', () => {
  it('is declared exactly once, in index.css, at the agreed 0.84 alpha', () => {
    const indexCss = read('index.css');
    const declarations = indexCss.match(/--canvas-chrome:\s*rgba\([^)]*\)/g) ?? [];
    expect(declarations).toEqual(['--canvas-chrome: rgba(10, 12, 14, 0.84)']);
  });

  it('.mode-hint consumes --canvas-chrome instead of its own literal', () => {
    const messagesCss = read('components/Messages/messages.css');
    expect(messagesCss).toMatch(/\.mode-hint\s*{[^}]*background:\s*var\(--canvas-chrome\)/s);
    expect(messagesCss).not.toMatch(/\.mode-hint\s*{[^}]*rgba\(10,\s*12,\s*14/s);
  });

  it('.mask-toolbar consumes --canvas-chrome instead of its own literal', () => {
    const componentsCss = read('components/components.css');
    expect(componentsCss).toMatch(/\.mask-toolbar\s*{[^}]*background:\s*var\(--canvas-chrome\)/s);
    expect(componentsCss).not.toMatch(/\.mask-toolbar\s*{[^}]*rgba\(10,\s*12,\s*14/s);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/previewModeAdoption.test.ts`
Expected: FAIL — `--canvas-chrome` doesn't exist yet, and `.mode-hint`/`.mask-toolbar` still carry their own literal `rgba(10, 12, 14, ...)`.

- [ ] **Step 3: Declare the token**

In `src/index.css`, inside the bare `:root { ... }` "SCALE TOKENS" block, right after `--overlay-dim: rgba(0, 0, 0, 0.4);` and before the block's closing `}`:

```css
  /* Translucent-dark-plus-blur backdrop for chrome that sits directly over
     video footage: the mode-hint pill, the mask/shape toolbar, and (Phase 6d)
     the Processing preview segmented control. Like --overlay-line/-dim above,
     this sits on footage rather than app chrome, so one value works in every
     theme. Was two slightly different, un-tokenized literals (0.82 for
     .mode-hint, 0.86 for .mask-toolbar) before Phase 6d unified them — see
     spec amendment A11. */
  --canvas-chrome: rgba(10, 12, 14, 0.84);
```

- [ ] **Step 4: Point the two existing consumers at it**

In `src/components/Messages/messages.css`, in the `.mode-hint` rule:

```diff
-    background: rgba(10, 12, 14, 0.82);
+    background: var(--canvas-chrome);
```

In `src/components/components.css`, in the `.mask-toolbar` rule:

```diff
-    background: rgba(10, 12, 14, 0.86);
+    background: var(--canvas-chrome);
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest src/helpers/previewModeAdoption.test.ts`
Expected: PASS.

- [ ] **Step 6: Full check**

Run: `npx jest` and `npm run lint`
Expected: test count now 677 + 4 (Task 1) + 3 (this task) = 684; `65` suites `+1` (the new helper file) `= 66`; lint problems still 20.

- [ ] **Step 7: Commit**

```bash
git add src/index.css src/components/Messages/messages.css src/components/components.css src/helpers/previewModeAdoption.test.ts
git commit -m "$(cat <<'EOF'
Task 3: Extract --canvas-chrome from .mode-hint and .mask-toolbar

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `.seg-float`

**Files:**
- Modify: `src/index.css`
- Test: `src/helpers/previewModeAdoption.test.ts`

**Interfaces:**
- Consumes: `--canvas-chrome` (Task 3), the existing `.seg button` rules' sizing/typography conventions (26px segments, `--text-meta`, `--radius-full`).
- Produces: `.seg-float` (container) and `.seg-float button` (segment), with `[aria-selected="true"]` and `[aria-disabled="true"]` states. Task 5's `PreviewModeControl` is the sole consumer.

- [ ] **Step 1: Write the failing CSS-shape test**

Add to `src/helpers/previewModeAdoption.test.ts`:

```ts
describe('.seg-float', () => {
  const indexCss = read('index.css');

  it('exists as a canvas-chrome consumer, not a --surface-field one', () => {
    expect(indexCss).toMatch(/\.seg-float\s*{[^}]*background:\s*var\(--canvas-chrome\)/s);
  });

  it('segment buttons carry a selected state and a disabled-with-tooltip state', () => {
    expect(indexCss).toMatch(/\.seg-float button\[aria-selected=['"]true['"]\]/);
    expect(indexCss).toMatch(/\.seg-float button\[aria-disabled=['"]true['"]\]/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/previewModeAdoption.test.ts`
Expected: FAIL — `.seg-float` doesn't exist yet.

- [ ] **Step 3: Add the rules**

In `src/index.css`, immediately after the existing `.seg button:disabled, .seg button[aria-disabled="true"] { ... }` block (the one whose comment explains the 0.7-opacity deviation and names 6d), add:

```css
/* .seg-float — the same .seg control, on the translucent-dark-blur backdrop
   canvas-overlay chrome uses instead of an opaque panel colour, which would
   give no separation from video footage. Sized and spaced identically to
   .seg (26px segments in a 32px track) so it reads as the same widget
   family; only the backdrop and resting label colour differ, because
   --text-subdued (the panel .seg's resting colour) is tuned for an opaque
   surface, not arbitrary video footage behind a blur.
   First and, as of Phase 6d, only consumer: PreviewModeControl.tsx. */
.seg-float {
  position: absolute;
  top: var(--space-3);
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  padding: 3px;
  border-radius: var(--radius-full);
  background: var(--canvas-chrome);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}

.seg-float button {
  height: 26px;
  padding: 0 var(--space-3);
  border: 0;
  border-radius: var(--radius-full);
  background-color: transparent;
  color: rgba(255, 255, 255, 0.75);
  font-family: inherit;
  font-size: var(--text-meta);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--motion-ease),
    color var(--motion-fast) var(--motion-ease);
}

.seg-float button:hover:not([aria-disabled='true']):not([aria-selected='true']) {
  color: #fff;
}

.seg-float button:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

.seg-float button[aria-selected='true'] {
  background-color: var(--accent-color);
  color: var(--on-accent);
}

/* Same 0.7 deviation from the app's usual 0.38-disabled convention as .seg,
   and for the same reason (spec §4/6d needs a user to read a disabled
   "Space-time" segment and hover it for why) — see the comment above
   .seg button:disabled. */
.seg-float button[aria-disabled='true'] {
  opacity: 0.7;
  cursor: not-allowed;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/helpers/previewModeAdoption.test.ts`
Expected: PASS.

- [ ] **Step 5: Full check**

Run: `npx jest` and `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: test count up by 2; `tsc` errors still 64 (pure CSS addition, no `.tsx` touched).

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/helpers/previewModeAdoption.test.ts
git commit -m "$(cat <<'EOF'
Task 4: Add .seg-float, the canvas-chrome variant of .seg

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `PreviewModeControl` component, wired into `Processing.tsx`

**Files:**
- Create: `src/components/PreviewModeControl.tsx`
- Modify: `src/pages/Processing.tsx`
- Test: `src/helpers/previewModeAdoption.test.ts`

**Interfaces:**
- Consumes: `previewMode: PreviewMode`, `onSetPreviewMode: (mode: PreviewMode) => void` (Task 1/2), `canToggleSti: boolean`, `canToggleIwave: boolean`, `stivAvailable: boolean` — the same three booleans `Processing.tsx` already computes today for `FormProcessing` (`stiPaths.length > 0`, `spectrumPaths.length > 0`, the `stivAvailable` state).
- Produces: the rendered `.seg-float` tablist. No other file consumes this component.

- [ ] **Step 1: Write the failing shape test**

Add to `src/helpers/previewModeAdoption.test.ts`:

```ts
describe('PreviewModeControl', () => {
  const component = read('components/PreviewModeControl.tsx');

  it('is a tablist of three segments using role/aria-selected, not aria-pressed', () => {
    expect(component).toMatch(/role=["']tablist["']/);
    expect((component.match(/role=["']tab["']/g) ?? []).length).toBe(3);
    expect(component).toMatch(/aria-selected=/);
  });

  it('gates Space-time and iWave with aria-disabled plus a matching early-return guard', () => {
    // The generic sweep in legacyButtonRetirement.test.ts covers the
    // guard-pairing correctness for every .tsx file already; this just pins
    // down that this file actually uses the aria-disabled idiom at all, so a
    // rewrite that switched to a native `disabled` (silently breaking the
    // tooltip — see Global Constraints contract 1) would be caught here even
    // before that broader sweep runs.
    expect((component.match(/aria-disabled=\{/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('renders on .seg-float, not the panel .seg', () => {
    expect(component).toMatch(/className=["']seg-float["']/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/previewModeAdoption.test.ts`
Expected: FAIL — `src/components/PreviewModeControl.tsx` doesn't exist.

- [ ] **Step 3: Write the component**

Create `src/components/PreviewModeControl.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import type { PreviewMode } from '../store/ui/types';

interface PreviewModeControlProps {
  previewMode: PreviewMode;
  onSetPreviewMode: (mode: PreviewMode) => void;
  /** STI images exist to look at (STIV has been run at least once). */
  canToggleSti: boolean;
  /** iWave spectra exist to look at. */
  canToggleIwave: boolean;
  /** STIV model weights are present on disk at all — distinct from
   *  canToggleSti: weights can be missing even before a user has tried to
   *  run STIV, and that's a different reason to disable the segment. */
  stivAvailable: boolean;
}

/**
 * The canvas's own view switch (spec §4/6d, amendment A4): decides what
 * Processing's canvas shows, decoupled from the technique rows' switches,
 * which decide what runs. Sits on .seg-float (Task 4's translucent-dark-blur
 * variant of .seg) rather than the panel .seg, since it floats directly over
 * video footage. First and only consumer of both.
 */
export const PreviewModeControl = ({
  previewMode,
  onSetPreviewMode,
  canToggleSti,
  canToggleIwave,
  stivAvailable,
}: PreviewModeControlProps) => {
  const { t } = useTranslation();

  const stiDisabledReason = !stivAvailable
    ? t('Processing.stivWeightsMissing')
    : t('Processing.noStisYet', { defaultValue: 'Run STIV to see space-time images' });
  const spectrumDisabledReason = t('Processing.noSpectraYet', { defaultValue: 'Run iWave to see spectra' });

  return (
    <div className="seg-float" role="tablist" aria-label={t('Processing.previewTablistLabel', { defaultValue: 'Preview' })}>
      <button
        type="button"
        role="tab"
        aria-selected={previewMode === 'frames'}
        onClick={() => {
          if (previewMode === 'frames') return;
          onSetPreviewMode('frames');
        }}
      >
        {t('Processing.previewFrames', { defaultValue: 'Frames' })}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={previewMode === 'sti'}
        aria-disabled={!canToggleSti}
        title={canToggleSti ? undefined : stiDisabledReason}
        onClick={() => {
          if (!canToggleSti) return;
          if (previewMode === 'sti') return;
          onSetPreviewMode('sti');
        }}
      >
        {t('Processing.previewSpaceTime', { defaultValue: 'Space-time' })}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={previewMode === 'iwave'}
        aria-disabled={!canToggleIwave}
        title={canToggleIwave ? undefined : spectrumDisabledReason}
        onClick={() => {
          if (!canToggleIwave) return;
          if (previewMode === 'iwave') return;
          onSetPreviewMode('iwave');
        }}
      >
        {t('Processing.previewSpectrum', { defaultValue: 'Spectrum' })}
      </button>
    </div>
  );
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/helpers/previewModeAdoption.test.ts`
Expected: PASS.

- [ ] **Step 5: Render it in `Processing.tsx`**

In `src/pages/Processing.tsx`, import the component:

```ts
import { PreviewModeControl } from '../components/PreviewModeControl';
```

Render it as a direct child of `.media-container`, alongside `ImageProcessing` and `Carousel` (matching where `<ModeHint />` sits as a sibling in `CrossSections.tsx`/`VideoRange.tsx` — a `.media-container`-relative absolutely-positioned child, not nested inside `ImageProcessing`'s own conditional returns, since the control must render identically across all three of `ImageProcessing`'s internal branches):

```tsx
      <div className="media-container">
        <PreviewModeControl
          previewMode={previewMode}
          onSetPreviewMode={onSetPreviewMode}
          canToggleSti={stiPaths.length > 0}
          canToggleIwave={spectrumPaths.length > 0}
          stivAvailable={stivAvailable}
        />
        <ImageProcessing
          showMedian={showMedian}
          extraFields={extraFields}
          previewMode={previewMode}
          stiPaths={stiPaths}
          stiStations={stiStations}
          spectrumPaths={spectrumPaths}
          spectrumStations={spectrumStations}
          spectraSidecar={spectraSidecar}
        />
        <Carousel
          images={activeList}
          active={active}
          setActiveImage={onSetActiveImage}
          showMedian={showMedian && fullQuiver !== null}
          setShowMedian={setShowMedian}
          mode={previewMode === 'frames' ? 'analize' : 'processing'}
          showStivMarkers={previewMode === 'sti'}
        />
      </div>
```

- [ ] **Step 6: Run the generic aria-disabled/guard sweep**

Run: `npx jest src/helpers/legacyButtonRetirement.test.ts`
Expected: PASS. This file walks every `.tsx` in `src/` (see its `describe('an aria-disabled button always pairs with an early-return guard', ...)` block) and will have picked up `PreviewModeControl.tsx`'s two `aria-disabled` buttons automatically — each one's `onClick` is a block body containing `if (!canToggleSti) return;` / `if (!canToggleIwave) return;`, matching the `ident` the sweep extracts from the `aria-disabled={...}` expression. If this fails, the guard's condition and the `aria-disabled` expression's identifier have drifted apart — fix the component, not the sweep.

- [ ] **Step 7: Full check**

Run: `npx jest` and `npx tsc --noEmit 2>&1 | grep -c "error TS"` and `npm run lint`
Expected: all tests pass (test count up by Task 5's own 3); `tsc` errors still 64; lint problems still 20.

- [ ] **Step 8: Commit**

```bash
git add src/components/PreviewModeControl.tsx src/pages/Processing.tsx src/helpers/previewModeAdoption.test.ts
git commit -m "$(cat <<'EOF'
Task 5: Add PreviewModeControl, the canvas segmented view switch

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Remove row-click-to-preview from `FormProcessing.tsx`

**Files:**
- Modify: `src/components/Forms/FormProcessing.tsx`
- Modify: `src/components/Forms/form.css`
- Test: `src/helpers/previewModeAdoption.test.ts`

**Interfaces:**
- Consumes: nothing new. `FormProcessing`'s `previewMode` prop stays (still read for colour/bold identity); its `setPreviewMode` prop is **removed** by this task — after Steps 3-5 delete the only three call sites that used it, it would otherwise be a dead destructured parameter (an unused-variable lint finding, which Global Constraints forbids regressing).
- Produces: the technique-name elements become non-interactive, and `FormProcessing` no longer accepts a `setPreviewMode` prop at all. `Processing.tsx`'s call site (Task 2/5) is updated in Step 6 below to match.

- [ ] **Step 1: Write the failing regression guard**

Add to `src/helpers/previewModeAdoption.test.ts`:

```ts
describe('FormProcessing technique names are no longer clickable', () => {
  const formProcessing = read('components/Forms/FormProcessing.tsx');

  it('the three technique-name elements are spans, not buttons', () => {
    // A brace-balanced extractor is overkill for this file's three known,
    // simple call sites — a bounded-window check after each technique's
    // opening <TechniqueRow is enough here, the same reasoning
    // canvasChrome.test.ts's CONTEXT_WINDOW uses for a finite, known case.
    const rowStarts = [...formProcessing.matchAll(/<TechniqueRow\b/g)].map((m) => m.index!);
    expect(rowStarts).toHaveLength(3);
    for (const start of rowStarts) {
      const window = formProcessing.slice(start, start + 700);
      expect(window).toMatch(/<span\s+className=["']field-title["']/);
      expect(window).not.toMatch(/<button[^>]*className=["']field-title["']/);
    }
  });

  it('setPreviewMode is never called from this file', () => {
    // The segmented control (PreviewModeControl.tsx) is now the only writer.
    expect(formProcessing).not.toMatch(/setPreviewMode\(/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/helpers/previewModeAdoption.test.ts`
Expected: FAIL — the three `.field-title` elements are still `<button>`s calling `setPreviewMode`.

- [ ] **Step 3: Edit the LSPIV row**

In `src/components/Forms/FormProcessing.tsx`, replace:

```tsx
              <button
                type="button"
                className="field-title"
                aria-pressed={previewMode === 'frames'}
                title={t('Processing.showLspivFrames')}
                onClick={() => previewMode !== 'frames' && setPreviewMode('frames')}
                style={previewMode === 'frames' ? { color: 'var(--tech-lspiv)' } : undefined}
              >
                LSPIV
              </button>
```

with:

```tsx
              <span
                className="field-title"
                style={previewMode === 'frames' ? { color: 'var(--tech-lspiv)' } : undefined}
              >
                LSPIV
              </span>
```

- [ ] **Step 4: Edit the STIV row**

Replace:

```tsx
                <button
                  type="button"
                  className="field-title"
                  aria-pressed={previewMode === 'sti'}
                  title={
                    !stivAvailable
                      ? t('Processing.stivWeightsMissing')
                      : canToggleSti
                        ? t('Processing.showStivStis')
                        : t('Processing.noStisYet')
                  }
                  onClick={() => canToggleSti && previewMode !== 'sti' && setPreviewMode('sti')}
                  style={previewMode === 'sti' ? { color: 'var(--tech-stiv)' } : undefined}
                >
                  STIV
                </button>
```

with:

```tsx
                <span
                  className="field-title"
                  style={previewMode === 'sti' ? { color: 'var(--tech-stiv)' } : undefined}
                >
                  STIV
                </span>
```

- [ ] **Step 5: Edit the iWave row**

Replace:

```tsx
              <button
                type="button"
                className="field-title"
                aria-pressed={previewMode === 'iwave'}
                title={canToggleIwave ? t('Processing.showIwaveSpectra') : t('Processing.noSpectraYet')}
                onClick={() => canToggleIwave && previewMode !== 'iwave' && setPreviewMode('iwave')}
                style={previewMode === 'iwave' ? { color: 'var(--tech-iwave)' } : undefined}
              >
                iWave
              </button>
```

with:

```tsx
              <span
                className="field-title"
                style={previewMode === 'iwave' ? { color: 'var(--tech-iwave)' } : undefined}
              >
                iWave
              </span>
```

- [ ] **Step 6: Remove the now-dead `setPreviewMode` prop**

In `src/components/Forms/FormProcessing.tsx`, remove `setPreviewMode` from both the destructure and the prop type:

```diff
 export const FormProcessing = ({
   extraFields,
   showMedian,
   setShowMedian,
   previewMode,
-  setPreviewMode,
   canToggleSti,
   canToggleIwave,
   canToggleMedian,
   stivAvailable,
 }: {
   extraFields: boolean;
   showMedian: boolean;
   setShowMedian: React.Dispatch<React.SetStateAction<boolean>>;
   previewMode: PreviewMode;
-  setPreviewMode: (value: PreviewMode) => void;
   canToggleSti: boolean;
   canToggleIwave: boolean;
   canToggleMedian: boolean;
   stivAvailable: boolean;
 }) => {
```

In `src/pages/Processing.tsx`, remove the now-invalid prop from the `<FormProcessing>` call site added/renamed in Task 2:

```diff
         <FormProcessing
           extraFields={extraFields}
           showMedian={showMedian}
           setShowMedian={setShowMedian}
           previewMode={previewMode}
-          setPreviewMode={onSetPreviewMode}
           canToggleSti={stiPaths.length > 0}
           canToggleIwave={spectrumPaths.length > 0}
           canToggleMedian={fullQuiver !== null}
           stivAvailable={stivAvailable}
         />
```

(`onSetPreviewMode` stays in scope in `Processing.tsx` — `PreviewModeControl`, added in Task 5, still needs it.)

- [ ] **Step 7: Clean up `form.css`**

In `src/components/Forms/form.css`:

Replace the `.technique-row-processing` rule (the whole-row `cursor: pointer`, now stale since nothing in the row is a row-wide click target any more — the toggle/Median/export controls each carry their own `cursor: pointer` already):

```diff
-.technique-row-processing {
-    cursor: pointer;
-}
-
-/* .field-title is a plain heading everywhere else in this form (Hard mode's
-   section labels, the stations counter) — only inside a Processing technique
-   row is it also the row's clickable name control (Task 7), so the button
-   reset lives on this compound selector rather than on the bare class. The
-   explicit font-size replaces the 1.17em an <h3> got for free from the UA
-   stylesheet, now that this is a <button>. */
-.technique-row-processing .field-title {
-    flex: 1;
-    min-width: 0;
-    color: var(--secondary-text-color);
-    background: none;
-    border: none;
-    padding: 0;
-    font-size: 1.17em;
-    text-align: left;
-    cursor: pointer;
-}
+/* .field-title is a plain heading everywhere else in this form too (Hard
+   mode's section labels, the stations counter) — inside a Processing
+   technique row it's the technique's name, non-interactive since Phase 6d
+   moved the canvas-preview switch onto PreviewModeControl.tsx. The explicit
+   font-size replaces the 1.17em an <h3> got for free; this is a <span>. */
+.technique-row-processing .field-title {
+    flex: 1;
+    min-width: 0;
+    color: var(--secondary-text-color);
+    font-size: 1.17em;
+    text-align: left;
+}
```

Replace the now-stale comment and rule at `.technique-row-processing-disabled .field-title`:

```diff
-/* The name button now sets its own cursor:pointer (it's a real button, not an
-   inert <h3>), so the disabled row's not-allowed cursor above no longer
-   reaches it by inheritance — this restates it directly. Scoped to -disabled
-   only, not -unavailable: an unavailable (weights-missing) STIV row still
-   lets its name button switch the preview, it only looks muted — the click
-   guard the name button carries is canToggleSti, the same condition
-   -disabled represents, not stivAvailable. */
-.technique-row-processing-disabled .field-title {
-    cursor: not-allowed;
-}
-
```

(Delete this block outright — `.field-title` is no longer interactive at all, in either state, so there's nothing left for a cursor override to say.)

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx jest src/helpers/previewModeAdoption.test.ts`
Expected: PASS.

- [ ] **Step 9: Full check, including translation-key usage**

Run: `npx jest` and `npx tsc --noEmit 2>&1 | grep -c "error TS"` and `npm run lint`

Then check whether `Processing.showLspivFrames`, `Processing.showStivStis`, `Processing.showIwaveSpectra` are now unused anywhere:

Run: `grep -rn "showLspivFrames\|showStivStis\|showIwaveSpectra" src --include="*.tsx" --include="*.ts"`

Expected: no matches (these three keys were only ever the old buttons' `title`s, now deleted). They stay in `src/translations/*/global.json` untouched — Global Constraints forbids editing those files, and an orphaned translation key is not a regression this plan needs to clean up. `Processing.stivWeightsMissing`, `Processing.noStisYet`, `Processing.noSpectraYet` remain in use (now from `PreviewModeControl.tsx` — `noStisYet`/`noSpectraYet` via their own `defaultValue`, matching the existing English copy exactly so no visible string changes).

`tsc` errors still 64, lint problems still 20, full suite green.

- [ ] **Step 10: Commit**

```bash
git add src/components/Forms/FormProcessing.tsx src/components/Forms/form.css src/helpers/previewModeAdoption.test.ts
git commit -m "$(cat <<'EOF'
Task 6: Drop row-click-to-preview — the canvas control owns it now

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Doc-comment accuracy, amendment log, final check

**Files:**
- Modify: `src/helpers/canvasChrome.test.ts`
- Modify: `docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md`

**Interfaces:**
- Consumes: nothing code-facing. This task only corrects prose so it stays true, per this branch's own established standard (a passing guard whose comment describes a world that no longer exists is exactly the "guard can fail green" class of problem 6b/6c kept finding).

- [ ] **Step 1: Update `canvasChrome.test.ts`'s doc comment**

In `src/helpers/canvasChrome.test.ts`, the file's top comment currently says (lines 4-19) that the spec allows exactly two things over the canvas (mode-hint pill, per-shape toolbar) and explains why `.mode-hint`/`.mask-toolbar` never show up in this sweep's output. Update the opening sentence and add a third bullet:

```diff
 /**
  * Spec rule (docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md:32-34,134):
- * no inline-positioned CONTROL floats over any image canvas except the
- * mode-hint pill and per-shape toolbars. The operative word is "control" -
+ * no inline-positioned CONTROL floats over any image canvas except the
+ * mode-hint pill, per-shape toolbars, and (Phase 6d, amendment A4) the
+ * Processing preview segmented control. The operative word is "control" -
```

```diff
  * Two names in the spec's allow list never appear in this sweep's output at
  * all, and that is expected, not a bug to "fix":
  *  - `.mode-hint`'s positioning is CSS-class-based (messages.css:4), and
  *    `ModeHint.tsx` never sets an inline `position` - class-based rules are
  *    structurally invisible to an inline-style sweep by construction.
  *  - `.mask-toolbar`'s positioning is likewise CSS-class-based
  *    (components.css:1306); `MaskToolbar.tsx`'s call site only ever passes a
  *    className, never an inline `position`.
- * Both are named here so a reader looking for "where is the mode pill /
- * mask toolbar allow-listed" finds the answer instead of a silent gap.
+ *  - `.seg-float`'s positioning is likewise CSS-class-based (index.css,
+ *    Phase 6d); `PreviewModeControl.tsx` never sets an inline `position`.
+ * All three are named here so a reader looking for "where is the mode pill /
+ * mask toolbar / preview control allow-listed" finds the answer instead of a
+ * silent gap.
  */
```

- [ ] **Step 2: Run the sweep to confirm it still passes**

Run: `npx jest src/helpers/canvasChrome.test.ts`
Expected: PASS, unchanged behaviour (comment-only edit).

- [ ] **Step 3: Record amendment A11 in the spec**

In `docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md`, append to the amendment log (§9), after the 2026-09-25/6c entry:

```markdown
### 2026-09-30 — after 6d's preview review

6d's preview (`docs/superpowers/previews/2026-09-30-phase-6d-processing-preview-control.html`) was approved by the product owner 2026-09-30. It proposed two concrete values the spec text had left open; both are now locked in as amendment A11.

| # | Amendment | Evidence that prompted it |
|---|---|---|
| **A11** | `--canvas-chrome: rgba(10, 12, 14, 0.84)` unifies `.mode-hint`'s prior 0.82 and `.mask-toolbar`'s prior 0.86 into one token (spec §4/6d already named this extraction; the preview fixed the number). `.seg-float` is placed top-centre on Processing's canvas — the one edge the mode-hint pill (bottom-centre), the shape toolbar (bottom-centre, different pages), and the colour bar (bottom-right) don't already claim. | Neither value was in the spec text. The preview proposed both explicitly, flagged them as open questions, and the product owner approved the preview as shown. |

Also confirmed during 6d: the technique-row rebuild §4/6d's prose describes was already shipped in 6c (A10/D12), so 6d's actual diff is scoped to the segmented control, the `uiSlice` state move, and the row-click removal — not a rebuild of rows that already exist in their final shape.
```

- [ ] **Step 4: Full regression suite**

Run:
```bash
npx jest
npx tsc --noEmit 2>&1 | grep -c "error TS"
npm run lint
```

Expected: full suite passes (report the final suite/test counts — should be 66 suites, up from 65 by the one new `previewModeAdoption.test.ts` file; test count up from 677 by Task 1's 4 + Task 3's 3 + Task 4's 2 + Task 5's 3 + Task 6's 2 = 14, i.e. **691**); `tsc` errors still **64**; lint problems still **20 (17 errors, 3 warnings)**.

- [ ] **Step 5: Commit**

```bash
git add src/helpers/canvasChrome.test.ts docs/superpowers/specs/2026-09-23-ui-design-refresh-phase-6-design.md
git commit -m "$(cat <<'EOF'
Task 7: Record amendment A11, correct canvasChrome.test.ts's doc comment

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## After this plan

A manual three-theme Electron walkthrough of Processing (dark/light/dracula) is still owed, per §7 of the spec ("every visual change is owed a three-theme check") — `.seg-float`'s colours are theme-independent by design, but its placement and the removed row affordance are worth a real look, the same way 6c's final review caught a geometry defect (the region toolbar leaving the zoomed viewport) that no test could have found. Flag this rather than silently skip it, matching how 6c's plan handled the same obligation.
