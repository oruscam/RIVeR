# UI Design Refresh — Phase 4a (Messages) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single "error/warning/info bottom bar" message system with the audit's five message kinds — mode hint, field error, step alert, toast, dialog — build all five as new components, and migrate every real call site in the app onto the kind it actually belongs to (full triage, not a representative subset).

**Architecture:** `uiSlice`'s `error`/`info`/`warning` arrays (each tied to a fixed DOM id and a fixed bottom-of-canvas position) are replaced by four independent pieces of state, one per *kind that has real callers*: `modeHint` (persistent, canvas-adjacent — was `warning`+the one `info` site), `fieldErrors` (a `Record<string, string>` keyed by field name, rendered inline by each form), `stepAlerts` (an array, rendered once per screen in the side panel — was `error`), and `toast` (one at a time, auto-dismissing). Dialog is not state at all: it's a promise-based `useConfirmDialog()` hook mounted once per screen, replacing the single existing consumer of Electron's native `dialog.showMessageBox` (`window.ipcRenderer.invoke('delete-confirmation', …)` in `Sections.tsx` / `electron/main.ts`). `error`/`info`/`warning` and their three renderer components (`Error.tsx`/`Warning.tsx`/`Info.tsx`) are deleted once nothing references them; `message`/`onSetMessage` (the loading-spinner header text) is unrelated and untouched.

**Tech Stack:** React 18 + TypeScript, Redux Toolkit, react-hook-form, plain CSS with `[data-theme]` custom properties (all colour/spacing/radius/motion tokens this phase needs already exist from Phase 2 — `--status-good/fair/bad`, `--surface-panel/raised/field`, `--text-primary/subdued`, `--accent-color`, `--on-error/warning/success`, `--radius-*`, `--space-*`, `--motion-*` — no new tokens, no theme-block edits), i18next (new keys use inline `defaultValue`, matching how every mode-hint string in this codebase is already written — e.g. `t('VideoRange.minRegionsWarning', { defaultValue: 'Add at least 2 regions for stabilization' })` — so this phase does not touch the 12 translation JSON files), Jest 29 with ts-jest (`testEnvironment: "node"`, **no DOM** — confirmed by every existing test in `src/`: reducer tests, pure-function tests, and source/CSS-text-regex tests, never `@testing-library/react` or similar. New components get the same treatment: pure logic (reducers, class-name/text-selection helpers) is unit-tested; JSX wiring and CSS are checked by source-text assertions plus the manual walkthrough in each task's own check-in, exactly as Phase 3c did for its D3-imperative modules).

**Spec:** RIVeR Design Audit artifact — https://claude.ai/code/artifact/02bcbe1c-e016-4d2e-9b66-d1bc80f31dcb (§ Messages: *"Today, errors, warnings, mode indicators and hints all use the same coloured bar at the bottom of the canvas, often far from the thing they're about. The proposal has five kinds of message, each with one place and one look."*; § Rollout, Phase 4: *"The five message kinds (mode hint, field error, step alert, toast, dialog)."*). The audit's own five specimens and their exact copy:
1. **Mode hint** — *on the canvas, while a tool is active* — "Editing regions · 1 of 2 min. · Done". *"Replaces 'Drawing line', 'Modifying section CS_default_1', 'Editing mask 2' and 'Add at least 2 regions' in the bottom bar. It says what mode you're in and how to leave it."*
2. **Field error** — *directly under the field* — "End must be later than Start (00:12.40)." / "Step must be a whole number, 1 or more."
3. **Step alert** — *in the panel, stays until fixed* — info/warning/error card, coloured icon on a neutral card, "An error blocks Next, and links stay clickable, as `Error.tsx` already supports."
4. **Toast** — *bottom of the window, 4 seconds* — "Table copied to clipboard" / "Angles reset for CS_default_1 [Undo]". *"Confirms something you just did. Reversible actions offer Undo instead of asking first."*
5. **Dialog** — *blocks the app until answered* — "Delete CS_bridge? · Its masks, bathymetry and results are removed too. This can't be undone. · [Cancel] [Delete section]". *"Only for destructive or failed actions."*

Wording rules (§ Messages, apply to every string this plan touches): say what happened and how to fix it, in one sentence each; no "Invalid X Selection:" prefix and no "Please enter a valid value."; name the actual item ("CS_default_1", "End (00:08)"); sentence case.

## Global Constraints

- Base branch for this plan is `ui/design-refresh` itself, at Phase 3c's tip (`085d234`). Never commit to `river-labs`/`main`.
- Commits: short imperative message, ending with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` (continuing this branch's session-level attribution policy from Phase 3a onward). Author email must be `antoine.patalano@gmail.com`.
- Baseline on this plan's base commit (`085d234`): `npx jest` → 35 suites, 410 tests, all passing; `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"` → 64 (pre-existing, unrelated); `npm run lint` → 24 problems (21 errors, 3 warnings). None of these may get worse. **Run project-wide `npm run lint` (not just the files a task touches) after every task.**
- **New i18n keys use inline `defaultValue`, never bare `t('Some.Key')`** — matches every existing mode-hint call site (`t('PixelSize.drawingLineWarning', { defaultValue: 'Drawing line' })`). Do not add entries to the 12 `src/translations/*/global.json` files in this plan; that's a translation-team follow-up, same as it already is for the 9 existing mode-hint keys.
- **No behaviour change beyond what each task states.** A field's validation *rule* (when it's considered invalid) never changes in this plan — only *where its message renders*. The one deliberate exception is Task 9's StabilizationRegions simplification (removing a 5-second setTimeout stage-switch), called out explicitly in that task.
- All paths below are relative to `gui/` unless prefixed with `/`.
- Every new/changed message string keeps the *current* wording (already fixed for the common cases in Phase 1) — this plan only moves things, it doesn't rewrite copy, except where a task explicitly quotes new text.

---

## File map

| File | Responsibility in this phase |
|---|---|
| `src/store/ui/types.ts` | `UIState`: drop `error`/`info`/`warning`; add `modeHint`, `fieldErrors`, `stepAlerts`, `toast` and their element types |
| `src/store/ui/uiSlice.ts` | Drop `set/clearErrorMessage`, `set/clearInfoMessage`, `set/clearWarningMessage`; add `setModeHint`/`clearModeHint`, `setFieldError`/`clearFieldError`/`clearAllFieldErrors`, `addStepAlert`/`clearStepAlert`/`clearAllStepAlerts`, `showToast`/`clearToast` |
| `src/store/ui/uiSlice.test.ts` (create) | Reducer tests for every new action |
| `src/hooks/useUiSlice.ts` | Drop `onSet/onClearWarningMessage` (wait — mode hint keeps this shape, renamed), `onSetErrorMessage`, `onSetInfoMessage`; add `onSetModeHint`/`onClearModeHint`, `onSetFieldError`/`onClearFieldError`/`onClearAllFieldErrors`, `onAddStepAlert`/`onClearStepAlert`/`onClearAllStepAlerts`, `onShowToast` |
| `src/components/Messages/ModeHint.tsx` (create) | Canvas-adjacent persistent hint, replaces `Warning.tsx` + the one `Info.tsx` call site |
| `src/components/Messages/FieldError.tsx` (create) | Inline error rendered directly under one field |
| `src/components/Messages/StepAlert.tsx` (create) | Panel card(s), replaces `Error.tsx` |
| `src/components/Messages/Toast.tsx` (create) | Bottom-of-window, auto-dismiss, optional Undo action |
| `src/components/Messages/Dialog.tsx` (create) | Modal card, driven by `useConfirmDialog()` |
| `src/hooks/useConfirmDialog.ts` (create) | `const [dialog, confirm] = useConfirmDialog()`; `confirm({title, body, confirmLabel}) => Promise<boolean>` |
| `src/components/Messages/messages.css` (create) | Styling for all five components, token-only |
| `src/components/Messages/index.ts` (create) | Barrel export |
| `src/components/index.ts` | Export the 5 new components alongside existing ones; drop `Error`/`Warning`/`Info` exports once Task 21 deletes them |
| `src/components/Error.tsx`, `Warning.tsx`, `Info.tsx` | Deleted in Task 21 |
| `src/components/components.css` | `.message-stack`, `.message-region`, `.error*`, `.warning*`, `.info*` rules deleted in Task 21 |
| `src/pages/Uav.tsx`, `CrossSections.tsx`, `Oblique.tsx`, `Ipcam.tsx`, `Processing.tsx`, `Results.tsx`, `VideoRange.tsx` | Swap `<Error/><Warning/>`(`<Info/>`) for `<ModeHint/>` in the canvas + `<StepAlert/>` in the panel (Task 8); individual pages get further edits in Tasks 9–20 for their own mode-hint/step-alert/field-error call sites |
| `src/components/Forms/Components/StabilizationRegions.tsx` | Mode hint (Task 9) + step alert (Task 14) |
| `src/components/Forms/Components/MaskCreation.tsx` | Mode hint (Task 9) |
| `src/components/CrossSections/CrossSections.tsx` | Mode hint (Task 10) + step alert/field error (Task 16) |
| `src/pages/Uav.tsx` | Mode hint (Task 10) + field error/step alert (Task 19) |
| `src/pages/Oblique.tsx` | Mode hint (Task 10) + step alert (Task 17) |
| `src/pages/Ipcam.tsx` | Mode hint (Task 10) + step alert (Task 18) |
| `src/components/Grid.tsx` | Toast (Task 11) |
| `src/components/StiAngleTuner.tsx`, `src/components/Forms/FormProcessing.tsx`, `src/hooks/useStivAngleOverride.ts` | Toast, Undo deferred (Task 12) |
| `src/components/CrossSections/Sections.tsx`, `electron/main.ts` | Dialog (Task 13) + field errors (Task 16) |
| `src/components/Forms/FormVideo.tsx` | Field error + step alert (Task 14) |
| `src/components/Forms/FormProcessing.tsx`, `src/components/Forms/Components/HardModeProcessing.tsx` | Field error + step alert (Task 15) |
| `src/components/Forms/FormCrossSections.tsx` | Field error + step alert (Task 16) |
| `src/components/Forms/FormOblique.tsx` | Step alert (Task 17) |
| `src/components/Forms/FormIpcam.tsx` | Step alert (Task 18) |
| `src/components/Forms/FormUav.tsx`, `src/components/Forms/Components/PixelCoordinates.tsx`, `src/components/Forms/Components/RealWorldCoordinates.tsx` | Field error (Task 19) |
| `src/pages/HomePage.tsx`, `src/pages/Processing.tsx` | Step alert (Task 20) |

---

## Task 1: `uiSlice` state — mode hint, field errors, step alerts, toast

**Files:**
- Modify: `src/store/ui/types.ts`
- Modify: `src/store/ui/uiSlice.ts`
- Test: `src/store/ui/uiSlice.test.ts` (create)

**Interfaces:**
- Produces: `UIState.modeHint: { text: string; meta?: string } | null`; `UIState.fieldErrors: Record<string, string>`; `UIState.stepAlerts: StepAlert[]` where `type StepAlert = { id: string; level: 'info' | 'warning' | 'error'; text: string }`; `UIState.toast: { text: string; actionLabel?: string } | null`. Actions: `setModeHint(payload: {text: string; meta?: string})`, `clearModeHint()`, `setFieldError(payload: {name: string; message: string})`, `clearFieldError(payload: string)`, `clearAllFieldErrors()`, `addStepAlert(payload: StepAlert)`, `clearStepAlert(payload: string)` (by `id`), `clearAllStepAlerts()`, `showToast(payload: {text: string; actionLabel?: string})`, `clearToast()`.

- [ ] **Step 1: Update `UIState`**

In `src/store/ui/types.ts`, replace:
```ts
  error: string[];
  info: string[];
  warning: string[];
```
with:
```ts
  modeHint: { text: string; meta?: string } | null;
  fieldErrors: Record<string, string>;
  stepAlerts: StepAlert[];
  toast: { text: string; actionLabel?: string } | null;
```
and add, above the `UIState` interface:
```ts
/** One card in the panel's step-alert list — persists until whatever caused it clears. */
interface StepAlert {
  /** Stable id so a caller can clear exactly the alert it raised, e.g. `'stabilization-min-regions'`. */
  id: string;
  level: 'info' | 'warning' | 'error';
  text: string;
}
```
Update the final export line to include `StepAlert`:
```ts
export type { ScreenSizes, UIState, ThemeType, PreviewMode, StepAlert };
```

- [ ] **Step 2: Write the failing reducer tests**

Create `src/store/ui/uiSlice.test.ts`:
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
} from './uiSlice';
import { UIState } from './types';

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
    showInterrogationWindow: false,
    ...overrides,
  }) as UIState;

describe('modeHint', () => {
  it('sets text and optional meta', () => {
    const state = reducer(baseState(), setModeHint({ text: 'Editing regions', meta: '1 of 2 min.' }));
    expect(state.modeHint).toEqual({ text: 'Editing regions', meta: '1 of 2 min.' });
  });

  it('clears to null', () => {
    const withHint = baseState({ modeHint: { text: 'Drawing line' } });
    expect(reducer(withHint, clearModeHint()).modeHint).toBeNull();
  });
});

describe('fieldErrors', () => {
  it('sets one field by name without touching others', () => {
    const withOne = baseState({ fieldErrors: { start: 'Start is required' } });
    const state = reducer(withOne, setFieldError({ name: 'end', message: 'End must be later than Start' }));
    expect(state.fieldErrors).toEqual({ start: 'Start is required', end: 'End must be later than Start' });
  });

  it('clears one field by name, leaving others', () => {
    const withTwo = baseState({ fieldErrors: { start: 'a', end: 'b' } });
    expect(reducer(withTwo, clearFieldError('start')).fieldErrors).toEqual({ end: 'b' });
  });

  it('clears every field at once', () => {
    const withTwo = baseState({ fieldErrors: { start: 'a', end: 'b' } });
    expect(reducer(withTwo, clearAllFieldErrors()).fieldErrors).toEqual({});
  });
});

describe('stepAlerts', () => {
  it('appends an alert', () => {
    const state = reducer(baseState(), addStepAlert({ id: 'a', level: 'error', text: 'Bad thing' }));
    expect(state.stepAlerts).toEqual([{ id: 'a', level: 'error', text: 'Bad thing' }]);
  });

  it('replaces an existing alert with the same id instead of duplicating it', () => {
    const withOne = baseState({ stepAlerts: [{ id: 'a', level: 'warning', text: 'old' }] });
    const state = reducer(withOne, addStepAlert({ id: 'a', level: 'error', text: 'new' }));
    expect(state.stepAlerts).toEqual([{ id: 'a', level: 'error', text: 'new' }]);
  });

  it('clears one alert by id, leaving others', () => {
    const withTwo = baseState({
      stepAlerts: [
        { id: 'a', level: 'error', text: 'A' },
        { id: 'b', level: 'warning', text: 'B' },
      ],
    });
    expect(reducer(withTwo, clearStepAlert('a')).stepAlerts).toEqual([{ id: 'b', level: 'warning', text: 'B' }]);
  });

  it('clears every alert at once', () => {
    const withTwo = baseState({
      stepAlerts: [
        { id: 'a', level: 'error', text: 'A' },
        { id: 'b', level: 'warning', text: 'B' },
      ],
    });
    expect(reducer(withTwo, clearAllStepAlerts()).stepAlerts).toEqual([]);
  });
});

describe('toast', () => {
  it('shows a toast, with an optional action label', () => {
    const state = reducer(baseState(), showToast({ text: 'Table copied to clipboard' }));
    expect(state.toast).toEqual({ text: 'Table copied to clipboard', actionLabel: undefined });
  });

  it('replaces any toast already showing (one at a time)', () => {
    const withOne = baseState({ toast: { text: 'first' } });
    const state = reducer(withOne, showToast({ text: 'second', actionLabel: 'Undo' }));
    expect(state.toast).toEqual({ text: 'second', actionLabel: 'Undo' });
  });

  it('clears to null', () => {
    const withOne = baseState({ toast: { text: 'first' } });
    expect(reducer(withOne, clearToast()).toast).toBeNull();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx jest src/store/ui/uiSlice.test.ts`
Expected: FAIL — `setModeHint` (and every other new export) is not exported from `./uiSlice`.

- [ ] **Step 4: Implement the reducer changes**

In `src/store/ui/uiSlice.ts`, update the import and initial state:
```ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState, ScreenSizes, ThemeType, StepAlert } from './types';
```
```ts
const initialState: UIState = {
  screenSizes: {
    width: window.innerWidth,
    height: window.innerHeight,
  },
  theme: THEME_CYCLE.includes(savedTheme) ? savedTheme : 'dark',
  modeHint: null,
  fieldErrors: {},
  stepAlerts: [],
  toast: null,
  isLoading: false,
  seeAll: true,
  language: savedLanguage,
  isLatestVersion: undefined,
  hoveredStation: null,
  showInterrogationWindow: false,
};
```
Replace the `setErrorMessage`/`clearErrorMessage`/`setInfoMessage`/`clearInfoMessage`/`setWarningMessage`/`clearWarningMessage` reducers with:
```ts
    setModeHint: (state, action: PayloadAction<{ text: string; meta?: string }>) => {
      state.modeHint = action.payload;
    },
    clearModeHint: (state) => {
      state.modeHint = null;
    },
    setFieldError: (state, action: PayloadAction<{ name: string; message: string }>) => {
      state.fieldErrors[action.payload.name] = action.payload.message;
    },
    clearFieldError: (state, action: PayloadAction<string>) => {
      delete state.fieldErrors[action.payload];
    },
    clearAllFieldErrors: (state) => {
      state.fieldErrors = {};
    },
    addStepAlert: (state, action: PayloadAction<StepAlert>) => {
      const existingIndex = state.stepAlerts.findIndex((a) => a.id === action.payload.id);
      if (existingIndex === -1) {
        state.stepAlerts.push(action.payload);
      } else {
        state.stepAlerts[existingIndex] = action.payload;
      }
    },
    clearStepAlert: (state, action: PayloadAction<string>) => {
      state.stepAlerts = state.stepAlerts.filter((a) => a.id !== action.payload);
    },
    clearAllStepAlerts: (state) => {
      state.stepAlerts = [];
    },
    showToast: (state, action: PayloadAction<{ text: string; actionLabel?: string }>) => {
      state.toast = action.payload;
    },
    clearToast: (state) => {
      state.toast = null;
    },
```
Update the `export const { ... }` block to export the new action creators in place of the old ones, and remove `clearErrorMessage`/`clearInfoMessage`/`clearWarningMessage`/`setErrorMessage`/`setInfoMessage`/`setWarningMessage` from it.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/store/ui/uiSlice.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 6: Run the full suite and lint**

Run: `npx jest && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS" && npm run lint`
Expected: jest now fails elsewhere (every file still importing the old action creators) — that's expected until Task 2 fixes `useUiSlice.ts`. Confirm the *only* new failures are `TS2305 '"./uiSlice"' has no exported member 'setErrorMessage'` (or similar) in `src/hooks/useUiSlice.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/store/ui/types.ts src/store/ui/uiSlice.ts src/store/ui/uiSlice.test.ts
git commit -m "Replace error/info/warning uiSlice state with modeHint/fieldErrors/stepAlerts/toast"
```

---

## Task 2: `useUiSlice` hook — new setters

**Files:**
- Modify: `src/hooks/useUiSlice.ts`

**Interfaces:**
- Consumes: `setModeHint`, `clearModeHint`, `setFieldError`, `clearFieldError`, `clearAllFieldErrors`, `addStepAlert`, `clearStepAlert`, `clearAllStepAlerts`, `showToast`, `clearToast` from `../store/ui/uiSlice` (Task 1).
- Produces: `onSetModeHint(text: string, meta?: string)`, `onClearModeHint()`, `onSetFieldError(name: string, message: string)`, `onClearFieldError(name: string)`, `onClearAllFieldErrors()`, `onAddStepAlert(id: string, level: 'info'|'warning'|'error', text: string)`, `onClearStepAlert(id: string)`, `onClearAllStepAlerts()`, `onShowToast(text: string, actionLabel?: string)`. Also returns the raw state: `modeHint`, `fieldErrors`, `stepAlerts`, `toast`.

- [ ] **Step 1: Update imports**

In `src/hooks/useUiSlice.ts`, replace:
```ts
  setErrorMessage,
  clearErrorMessage,
  setInfoMessage,
  clearInfoMessage,
  setWarningMessage,
  clearWarningMessage,
```
with:
```ts
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
```

- [ ] **Step 2: Update the selector destructure**

Replace:
```ts
    error,
    info,
    warning,
```
with:
```ts
    modeHint,
    fieldErrors,
    stepAlerts,
    toast,
```

- [ ] **Step 3: Replace the old methods**

Remove `onSetErrorMessage`, `onSetInfoMessage`, `onSetWarningMessage`, `onClearWarningMessage` and their doc comments; add:
```ts
  /**
   * Sets the persistent canvas-adjacent mode hint (e.g. "Drawing line",
   * "Editing mask 2"). Unlike the old warning/info bars, there is exactly one
   * mode hint at a time and it never auto-clears — the caller clears it
   * explicitly with onClearModeHint once the mode ends.
   * @param text - What mode the user is in.
   * @param meta - Optional short status alongside it (e.g. "1 of 2 min.").
   */
  const onSetModeHint = (text: string, meta?: string) => {
    dispatch(setModeHint({ text, meta }));
  };

  const onClearModeHint = () => {
    dispatch(clearModeHint());
  };

  /**
   * Sets the inline error for one named field. Persists until the field is
   * corrected (the caller clears it, usually right before re-validating).
   */
  const onSetFieldError = (name: string, message: string) => {
    dispatch(setFieldError({ name, message }));
  };

  const onClearFieldError = (name: string) => {
    dispatch(clearFieldError(name));
  };

  const onClearAllFieldErrors = () => {
    dispatch(clearAllFieldErrors());
  };

  /**
   * Adds (or replaces, by id) one step alert in the panel's alert list. Stays
   * until the caller clears that same id — typically when the condition that
   * raised it no longer holds.
   */
  const onAddStepAlert = (id: string, level: 'info' | 'warning' | 'error', text: string) => {
    dispatch(addStepAlert({ id, level, text }));
  };

  const onClearStepAlert = (id: string) => {
    dispatch(clearStepAlert(id));
  };

  const onClearAllStepAlerts = () => {
    dispatch(clearAllStepAlerts());
  };

  /**
   * Shows a toast for 4 seconds, then clears itself. A second call while one
   * is showing replaces it outright (one toast at a time), matching the
   * audit's "bottom of the window, 4 seconds" spec.
   * @param actionLabel - e.g. "Undo" — Toast.tsx renders it as a click target;
   *   the caller is responsible for what it does (see Task 12).
   */
  const onShowToast = (text: string, actionLabel?: string) => {
    dispatch(showToast({ text, actionLabel }));
    setTimeout(() => {
      dispatch(clearToast());
    }, 4000);
  };
```

- [ ] **Step 4: Update the returned object**

Replace:
```ts
    error,
    info,
    warning,
```
with:
```ts
    modeHint,
    fieldErrors,
    stepAlerts,
    toast,
```
and replace:
```ts
    onSetErrorMessage,
    onSetInfoMessage,
    onSetWarningMessage,
    onClearWarningMessage,
```
with:
```ts
    onSetModeHint,
    onClearModeHint,
    onSetFieldError,
    onClearFieldError,
    onClearAllFieldErrors,
    onAddStepAlert,
    onClearStepAlert,
    onClearAllStepAlerts,
    onShowToast,
```

- [ ] **Step 5: Confirm the build error count**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: higher than 64 — every remaining call site (`onSetErrorMessage`, `onSetWarningMessage`, `onClearWarningMessage`, `onSetInfoMessage`, `<Error/>`, `<Warning/>`, `<Info/>`) is now a real type error. This is expected; Tasks 3–21 fix each one. Note the count so later tasks can watch it shrink back to 64.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useUiSlice.ts
git commit -m "Add mode hint/field error/step alert/toast setters to useUiSlice"
```

---

## Task 3: `ModeHint` component

**Files:**
- Create: `src/components/Messages/ModeHint.tsx`
- Create: `src/components/Messages/messages.css`
- Create: `src/components/Messages/index.ts`
- Test: `src/components/Messages/modeHintText.test.ts` (create)

**Interfaces:**
- Consumes: `useUiSlice().modeHint` (Task 2).
- Produces: `ModeHint` React component (no props — reads Redux directly, matching `Warning.tsx`/`Error.tsx`'s existing style); `buildModeHintAriaLabel(hint: {text: string; meta?: string} | null): string` (pure, tested).

- [ ] **Step 1: Write the failing test for the pure text helper**

Create `src/components/Messages/modeHintText.test.ts`:
```ts
import { buildModeHintAriaLabel } from './ModeHint';

describe('buildModeHintAriaLabel', () => {
  it('returns the text alone when there is no meta', () => {
    expect(buildModeHintAriaLabel({ text: 'Drawing line' })).toBe('Drawing line');
  });

  it('appends meta after the text', () => {
    expect(buildModeHintAriaLabel({ text: 'Editing regions', meta: '1 of 2 min.' })).toBe(
      'Editing regions, 1 of 2 min.'
    );
  });

  it('returns an empty string for no hint', () => {
    expect(buildModeHintAriaLabel(null)).toBe('');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/components/Messages/modeHintText.test.ts`
Expected: FAIL — cannot find module `./ModeHint`.

- [ ] **Step 3: Implement `ModeHint.tsx`**

Create `src/components/Messages/ModeHint.tsx`:
```tsx
import './messages.css';
import { useUiSlice } from '../../hooks/useUiSlice';

/** Pure so it can be unit-tested without rendering — the aria-label needs the
 *  meta folded in, since visually it's a separate, smaller span. */
export const buildModeHintAriaLabel = (hint: { text: string; meta?: string } | null): string => {
  if (hint === null) return '';
  return hint.meta ? `${hint.text}, ${hint.meta}` : hint.text;
};

/**
 * Persistent canvas-adjacent hint: "what mode you're in and how to leave it."
 * Replaces the old Warning.tsx bar (and VideoRange's one Info.tsx use, whose
 * "add 2 regions" copy is now StabilizationRegions's `meta`, see Task 9).
 * Always mounted; renders nothing when there's no active hint, matching
 * Warning.tsx's existing "reserve no layout at all" behavior.
 */
export const ModeHint = () => {
  const { modeHint } = useUiSlice();

  if (modeHint === null) return null;

  return (
    <div className="mode-hint" role="status" aria-live="polite" aria-label={buildModeHintAriaLabel(modeHint)}>
      <span className="mode-hint-text">{modeHint.text}</span>
      {modeHint.meta && <span className="mode-hint-meta">{modeHint.meta}</span>}
    </div>
  );
};
```

- [ ] **Step 4: Add the CSS**

Create `src/components/Messages/messages.css`:
```css
/* Phase 4a: mode hint, field error, step alert, toast, dialog. Every colour
   here is an existing Phase 2 token — no new theme-block entries. */

.mode-hint {
    position: absolute;
    left: 50%;
    bottom: var(--space-4);
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    background: rgba(10, 12, 14, 0.82);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    color: #fff;
    border-radius: var(--radius-full);
    padding: var(--space-1) var(--space-2) var(--space-1) var(--space-4);
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    z-index: 5;
    pointer-events: none;
}

.mode-hint-meta {
    color: rgba(255, 255, 255, 0.75);
}
```

- [ ] **Step 5: Add the barrel export**

Create `src/components/Messages/index.ts`:
```ts
export { ModeHint, buildModeHintAriaLabel } from './ModeHint';
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx jest src/components/Messages/modeHintText.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/Messages/ModeHint.tsx src/components/Messages/messages.css src/components/Messages/index.ts src/components/Messages/modeHintText.test.ts
git commit -m "Add ModeHint component"
```

---

## Task 4: `FieldError` component

**Files:**
- Create: `src/components/Messages/FieldError.tsx`
- Modify: `src/components/Messages/messages.css`
- Modify: `src/components/Messages/index.ts`

**Interfaces:**
- Consumes: `useUiSlice().fieldErrors` (Task 2).
- Produces: `<FieldError name="start" />` — renders nothing when `fieldErrors[name]` is unset.

- [ ] **Step 1: Implement `FieldError.tsx`**

No pure logic to isolate here (it's a one-line lookup) — same "no automated test, manual + regression-suite coverage" treatment Phase 3c gave its D3 wiring, since there's no DOM test environment to render this in.

Create `src/components/Messages/FieldError.tsx`:
```tsx
import './messages.css';
import { useUiSlice } from '../../hooks/useUiSlice';

/**
 * Inline error for exactly one named field, rendered directly under it (the
 * caller places `<FieldError name="start" />` right after the input). Reads
 * uiSlice's fieldErrors map (Task 1) — the field's own onBlur/onSubmit
 * handler is what calls onSetFieldError/onClearFieldError (Tasks 14–19).
 */
export const FieldError = ({ name }: { name: string }) => {
  const { fieldErrors } = useUiSlice();
  const message = fieldErrors[name];

  if (!message) return null;

  return (
    <div className="field-error" role="alert">
      {message}
    </div>
  );
};
```

- [ ] **Step 2: Add the CSS**

Append to `src/components/Messages/messages.css`:
```css
.field-error {
    color: var(--status-bad);
    font-size: 12.5px;
    margin-top: var(--space-1);
}
```

- [ ] **Step 3: Add the barrel export**

Append to `src/components/Messages/index.ts`:
```ts
export { FieldError } from './FieldError';
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: unchanged from Task 2's count (this task only adds a new, unreferenced file — nothing to break yet).

- [ ] **Step 5: Commit**

```bash
git add src/components/Messages/FieldError.tsx src/components/Messages/messages.css src/components/Messages/index.ts
git commit -m "Add FieldError component"
```

---

## Task 5: `StepAlert` component

**Files:**
- Create: `src/components/Messages/StepAlert.tsx`
- Modify: `src/components/Messages/messages.css`
- Modify: `src/components/Messages/index.ts`
- Test: `src/components/Messages/stepAlertIcon.test.ts` (create)

**Interfaces:**
- Consumes: `useUiSlice().stepAlerts` (Task 2).
- Produces: `StepAlertList` component (renders every current `StepAlert`, no props); `stepAlertClassName(level: 'info'|'warning'|'error'): string` (pure, tested).

- [ ] **Step 1: Write the failing test**

Create `src/components/Messages/stepAlertIcon.test.ts`:
```ts
import { stepAlertClassName } from './StepAlert';

describe('stepAlertClassName', () => {
  it.each([
    ['info', 'step-alert step-alert-info'],
    ['warning', 'step-alert step-alert-warning'],
    ['error', 'step-alert step-alert-error'],
  ] as const)('maps %s to %s', (level, expected) => {
    expect(stepAlertClassName(level)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/components/Messages/stepAlertIcon.test.ts`
Expected: FAIL — cannot find module `./StepAlert`.

- [ ] **Step 3: Implement `StepAlert.tsx`**

`Error.tsx` already links URLs inside its text (the audit: *"An error blocks Next, and links stay clickable, as `Error.tsx` already supports"*) — that URL-linkifying behavior is carried over unchanged, just applied to every level, not only errors.

Create `src/components/Messages/StepAlert.tsx`:
```tsx
import './messages.css';
import { useUiSlice } from '../../hooks/useUiSlice';

/** Pure so the level→class mapping is unit-tested without rendering. */
export const stepAlertClassName = (level: 'info' | 'warning' | 'error'): string => `step-alert step-alert-${level}`;

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const linkify = (text: string) => {
  const parts = text.split(URL_REGEX);
  return parts.map((part, index) =>
    URL_REGEX.test(part) ? (
      <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="step-alert-link">
        {part}
      </a>
    ) : (
      <span key={index}>{part}</span>
    )
  );
};

/**
 * Every current step alert, stacked in the panel. Replaces Error.tsx — every
 * former onSetErrorMessage call site becomes either this (multi-field or
 * non-field conditions) or FieldError (Task 4, one specific field).
 */
export const StepAlertList = () => {
  const { stepAlerts } = useUiSlice();

  if (stepAlerts.length === 0) return null;

  return (
    <div className="step-alert-list" aria-live="assertive">
      {stepAlerts.map((alert) => (
        <div key={alert.id} className={stepAlertClassName(alert.level)} role="alert">
          {linkify(alert.text)}
        </div>
      ))}
    </div>
  );
};
```

- [ ] **Step 4: Add the CSS**

Append to `src/components/Messages/messages.css`:
```css
.step-alert-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: var(--space-2) 0;
}

.step-alert {
    display: flex;
    background: var(--surface-raised);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    font-size: 13.5px;
    color: var(--text-primary);
}

.step-alert-info { border-left: 3px solid var(--accent-color); }
.step-alert-warning { border-left: 3px solid var(--status-fair); }
.step-alert-error { border-left: 3px solid var(--status-bad); }

.step-alert-link {
    color: var(--accent-color);
    text-decoration: underline;
}
```

- [ ] **Step 5: Add the barrel export**

Append to `src/components/Messages/index.ts`:
```ts
export { StepAlertList, stepAlertClassName } from './StepAlert';
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx jest src/components/Messages/stepAlertIcon.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/Messages/StepAlert.tsx src/components/Messages/messages.css src/components/Messages/index.ts src/components/Messages/stepAlertIcon.test.ts
git commit -m "Add StepAlert component"
```

---

## Task 6: `Toast` component

**Files:**
- Create: `src/components/Messages/Toast.tsx`
- Modify: `src/components/Messages/messages.css`
- Modify: `src/components/Messages/index.ts`

**Interfaces:**
- Consumes: `useUiSlice().toast`, `onClearToast` — **note:** Task 2 did not add `onClearToast` to the returned object (only `onShowToast`, which self-clears on a timer). This task adds it, since the Undo/dismiss click needs to clear immediately rather than wait out the timer.
- Produces: `<Toast onAction={() => void}>` — `onAction` is called when the action label (if any) is clicked; the toast itself always knows how to dismiss.

- [ ] **Step 1: Add `onClearToast` to `useUiSlice`**

In `src/hooks/useUiSlice.ts`, add alongside `onShowToast` (Task 2):
```ts
  const onClearToast = () => {
    dispatch(clearToast());
  };
```
and add `onClearToast` to the returned object, next to `onShowToast`.

- [ ] **Step 2: Implement `Toast.tsx`**

```tsx
import './messages.css';
import { useUiSlice } from '../../hooks/useUiSlice';

/**
 * Bottom-of-window toast, auto-dismissing after 4s (started by onShowToast,
 * Task 2). `onAction` is provided by the caller that showed the toast — this
 * component has no idea what "Undo" means for copy-to-clipboard vs. an STIV
 * angle reset (Tasks 11–12); it only renders the label and forwards the click.
 */
export const Toast = ({ onAction }: { onAction?: () => void }) => {
  const { toast, onClearToast } = useUiSlice();

  if (toast === null) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      <span>{toast.text}</span>
      {toast.actionLabel && onAction && (
        <button
          type="button"
          className="toast-action"
          onClick={() => {
            onAction();
            onClearToast();
          }}
        >
          {toast.actionLabel}
        </button>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Add the CSS**

Append to `src/components/Messages/messages.css`:
```css
.toast {
    position: fixed;
    left: 50%;
    bottom: var(--space-5);
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: var(--space-3);
    background: var(--surface-raised);
    color: var(--text-primary);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-4);
    font-size: 13.5px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    z-index: 30;
}

.toast-action {
    border: 0;
    background: transparent;
    color: var(--accent-color);
    font-weight: 700;
    font-size: inherit;
    text-decoration: underline;
    padding: 0;
    cursor: pointer;
}
```

- [ ] **Step 4: Add the barrel export**

Append to `src/components/Messages/index.ts`:
```ts
export { Toast } from './Toast';
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: unchanged from Task 2's count.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useUiSlice.ts src/components/Messages/Toast.tsx src/components/Messages/messages.css src/components/Messages/index.ts
git commit -m "Add Toast component"
```

---

## Task 7: `Dialog` component + `useConfirmDialog` hook

**Files:**
- Create: `src/components/Messages/Dialog.tsx`
- Create: `src/hooks/useConfirmDialog.ts`
- Modify: `src/components/Messages/messages.css`
- Modify: `src/components/Messages/index.ts`

**Interfaces:**
- Produces: `useConfirmDialog(): [dialogElement: React.ReactNode, confirm: (opts: {title: string; body: string; confirmLabel: string; cancelLabel?: string}) => Promise<boolean>]`.

- [ ] **Step 1: Implement `Dialog.tsx`**

Pure presentational piece — all the state lives in the hook (Step 2).
```tsx
import './messages.css';

export interface DialogOptions {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
}

export const Dialog = ({
  options,
  onConfirm,
  onCancel,
}: {
  options: DialogOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <b id="dialog-title">{options.title}</b>
        <p>{options.body}</p>
        <div className="dialog-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {options.cancelLabel ?? 'Cancel'}
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} autoFocus>
            {options.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Implement `useConfirmDialog.ts`**

```ts
import { useCallback, useRef, useState } from 'react';
import { Dialog, DialogOptions } from '../components/Messages/Dialog';

/**
 * Promise-based replacement for the native `window.ipcRenderer.invoke('delete-confirmation', …)`
 * confirm (Task 13's only consumer). Mount the returned element once per
 * screen (same place `<StepAlertList/>` goes); call `confirm(...)` from any
 * click handler and `await` the boolean instead of `await window.ipcRenderer.invoke(...)`.
 */
export const useConfirmDialog = (): [React.ReactNode, (opts: DialogOptions) => Promise<boolean>] => {
  const [options, setOptions] = useState<DialogOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: DialogOptions): Promise<boolean> => {
    setOptions(opts);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  const element =
    options === null ? null : (
      <Dialog options={options} onConfirm={() => settle(true)} onCancel={() => settle(false)} />
    );

  return [element, confirm];
};
```

- [ ] **Step 3: Add the CSS**

Append to `src/components/Messages/messages.css`:
```css
.dialog-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 40;
}

.dialog {
    background: var(--surface-panel);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    max-width: 360px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3);
}

.dialog b {
    font-size: 16px;
    color: var(--text-primary);
}

.dialog p {
    color: var(--text-subdued);
    font-size: 13px;
    margin: var(--space-2) 0 var(--space-4);
}

.dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
}
```

- [ ] **Step 4: Add the barrel export**

Append to `src/components/Messages/index.ts`:
```ts
export { Dialog } from './Dialog';
export type { DialogOptions } from './Dialog';
```

- [ ] **Step 5: Verify `.btn-secondary`/`.btn-danger` already exist**

Run: `grep -n "\.btn-secondary\|\.btn-danger" src/index.css`
Expected: `.btn-secondary` exists from Phase 3a. `.btn-danger` does not yet — add it to `src/index.css` right after `.btn-secondary`'s block, using the same existing tokens (mirrors the audit's Direction section `.btn-danger{background:var(--bad);color:var(--on-bad)}` — this codebase's equivalent token names are `--status-bad`/`--on-error`):
```css
.btn-danger {
    background-color: var(--status-bad);
    color: var(--on-error);
}
```

- [ ] **Step 6: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: unchanged from Task 2's count.

- [ ] **Step 7: Commit**

```bash
git add src/components/Messages/Dialog.tsx src/hooks/useConfirmDialog.ts src/components/Messages/messages.css src/components/Messages/index.ts src/index.css
git commit -m "Add Dialog component and useConfirmDialog hook"
```

---

## Task 8: Wire `ModeHint`/`StepAlertList`/`Toast` into the 7 page shells

**Files:**
- Modify: `src/pages/Uav.tsx`, `src/pages/CrossSections.tsx`, `src/pages/Oblique.tsx`, `src/pages/Ipcam.tsx`, `src/pages/Processing.tsx`, `src/pages/Results.tsx`, `src/pages/VideoRange.tsx`
- Modify: `src/components/index.ts`
- Modify: `src/components/components.css`

**Interfaces:**
- Consumes: `ModeHint`, `StepAlertList`, `Toast` (Tasks 3, 5, 6).

This is the task where `<Error/>`/`<Warning/>`/`<Info/>` stop being rendered anywhere (their files are deleted later, in Task 21, once every remaining reference — the components themselves compiling is fine in the meantime — is gone). `ModeHint` replaces `Warning` (and `VideoRange`'s one `Info`) **in place**, inside `.media-container`. `StepAlertList` is new: it goes in `.form-container`, right after `FormHeader`, across all 7 pages, replacing `Error`. `Toast` is mounted once per page too, anywhere outside `.media-container`/`.form-container` (it's `position: fixed`, so placement doesn't matter) — mounted bare, with no `onAction` prop, on every page: neither of this plan's two toasts (Tasks 11–12) shows an action button (`Toast` simply renders no button when `toast.actionLabel` is unset), so `onAction` stays unused until the Undo follow-up noted in Task 12's scoping decision.

- [ ] **Step 1: Export the new components**

In `src/components/index.ts`, add:
```ts
export { ModeHint, FieldError, StepAlertList, Toast, Dialog } from './Messages';
```
(Leave the existing `Error`/`Warning`/`Info` exports in place for now — Task 21 removes them once nothing imports them.)

- [ ] **Step 2: `Uav.tsx`**

Replace the import:
```ts
import { WizardButtons, Error, Warning, FocusOverlay, Carousel } from '../components/index';
```
with:
```ts
import { WizardButtons, ModeHint, StepAlertList, Toast, FocusOverlay, Carousel } from '../components/index';
```
Replace:
```tsx
        <div className="message-stack">
          <Error />
          <Warning />
        </div>
```
with:
```tsx
        <ModeHint />
```
Then, right after the `<FormHeader .../>` line inside `.form-container`, add:
```tsx
        <StepAlertList />
```
And anywhere inside the page's top-level returned `<div className="regular-page">`, add:
```tsx
        <Toast />
```

- [ ] **Step 3: `CrossSections.tsx`**

Same three edits as Step 2 — swap the `Error`/`Warning`/`message-stack` block in `.media-container` for `<ModeHint />`, add `<StepAlertList />` right after that page's `<FormHeader .../>`, add `<Toast />` once at the top level.

- [ ] **Step 4: `Oblique.tsx`**

Same three edits.

- [ ] **Step 5: `Ipcam.tsx`**

Same three edits.

- [ ] **Step 6: `Processing.tsx`**

This page only renders `<Error />` today (no `<Warning/>`, no `message-stack` wrapper — confirmed by `grep -n "message-stack\|<Error \|<Warning "` earlier). Replace:
```tsx
        <Error />
```
with:
```tsx
        <StepAlertList />
```
(No `<ModeHint/>` needed — Processing has no mode-hint call site.) Add `<Toast />` once at the top level (bare, no `onAction` — Task 12's toast takes no action).

- [ ] **Step 7: `Results.tsx`**

Same as Processing: replace the lone `<Error />` with `<StepAlertList />`. Add `<Toast />` (bare, no `onAction` — Task 11's copy-to-clipboard toast takes no action).

- [ ] **Step 8: `VideoRange.tsx`**

This page renders `<Error/><Info/><Warning/>`. Replace:
```tsx
        <div className="message-stack">
          <Error />
          <Info />
          <Warning />
        </div>
```
with:
```tsx
        <ModeHint />
```
Add `<StepAlertList />` after its `FormHeader`, and `<Toast />` once at the top level.

- [ ] **Step 9: Delete the now-empty `.message-stack` CSS**

In `src/components/components.css`, delete the `.message-stack .error, .message-stack .info, .message-stack .warning { ... }` and `.message-stack .error { z-index: 3; }` / `.message-stack .warning { z-index: 2; }` / `.message-stack .info { z-index: 1; }` rules (lines 261–273) — `.message-stack` itself (the flex/absolute wrapper class, still referenced by its container `<div>`) can go too, since no page still renders a `<div className="message-stack">` after Steps 2–8. Search first to confirm:

Run: `grep -rn "message-stack" src`
Expected: no matches (Steps 2–8 removed every `<div className="message-stack">`).

If confirmed empty, also delete the `.message-stack { ... }` rule itself (the one with `min-height: 35px`, above the rules just deleted).

- [ ] **Step 10: Verify the build error count**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: lower than Task 2's count — every `<Error/>`/`<Warning/>`/`<Info/>` JSX usage is gone, but `onSetErrorMessage`/`onSetWarningMessage`/`onClearWarningMessage`/`onSetInfoMessage` call sites (Tasks 9–20) still error.

- [ ] **Step 11: Manual check-in**

Run the app (`npm run dev`) and open each of the 7 screens. Confirm: no console error about missing `Error`/`Warning`/`Info` exports; the panel has room for `StepAlertList` without visibly breaking layout (it renders nothing yet, since nothing calls `onAddStepAlert` until Task 9+); canvas bottom edge no longer reserves the old 35px bar (this is an intentional, audit-directed layout change — the mode hint is now a floating pill, not a fixed-height bar).

- [ ] **Step 12: Commit**

```bash
git add src/pages/Uav.tsx src/pages/CrossSections.tsx src/pages/Oblique.tsx src/pages/Ipcam.tsx src/pages/Processing.tsx src/pages/Results.tsx src/pages/VideoRange.tsx src/components/index.ts src/components/components.css
git commit -m "Wire ModeHint/StepAlertList/Toast into all 7 screens"
```

---

## Task 9: Migrate mode hint — `StabilizationRegions.tsx` + `MaskCreation.tsx`

**Files:**
- Modify: `src/components/Forms/Components/StabilizationRegions.tsx`
- Modify: `src/components/Forms/Components/MaskCreation.tsx`

**Interfaces:**
- Consumes: `onSetModeHint`, `onClearModeHint` (Task 2).

**Scoping decision:** `StabilizationRegions.tsx` currently does something the new model doesn't need: it shows an `onSetInfoMessage` hint for 5 seconds, then a `setTimeout` swaps it for a persistent `onSetWarningMessage`. That two-stage dance exists only because the old system had no way to show a *counter alongside* a persistent hint — `modeHint.meta` (Task 1) is exactly that "1 of 2 min." field from the audit's own mockup. This task removes the timer and shows one hint immediately, with the live region count as `meta`, for the entire time editing is active.

- [ ] **Step 1: `StabilizationRegions.tsx`**

Replace the import:
```ts
  const { onSetInfoMessage, onSetWarningMessage, onClearWarningMessage } = useUiSlice();
```
with:
```ts
  const { onSetModeHint, onClearModeHint } = useUiSlice();
```
Replace the whole effect:
```tsx
  useEffect(() => {
    if (!stabilization || stabilizationActiveRegionIndex === null) {
      onClearWarningMessage();
      return;
    }

    onSetInfoMessage(
      t('VideoRange.minRegionsWarning', { defaultValue: 'Add at least 2 regions for stabilization' })
    );

    const timer = setTimeout(() => {
      onSetWarningMessage(
        t('VideoRange.editingRegionsWarning', { defaultValue: 'Editing stabilization regions' })
      );
    }, 5000);

    return () => {
      clearTimeout(timer);
      onClearWarningMessage();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stabilization, stabilizationActiveRegionIndex]);
```
with:
```tsx
  useEffect(() => {
    if (!stabilization || stabilizationActiveRegionIndex === null) {
      onClearModeHint();
      return;
    }

    onSetModeHint(
      t('VideoRange.editingRegionsWarning', { defaultValue: 'Editing regions' }),
      t('VideoRange.minRegionsCount', {
        defaultValue: '{{count}} of 2 min.',
        count: stabilizationRegions.length,
      })
    );

    return () => onClearModeHint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stabilization, stabilizationActiveRegionIndex, stabilizationRegions.length]);
```

- [ ] **Step 2: `MaskCreation.tsx`**

Replace the import:
```ts
  const { onSetWarningMessage, onClearWarningMessage } = useUiSlice();
```
with:
```ts
  const { onSetModeHint, onClearModeHint } = useUiSlice();
```
Replace:
```tsx
    onSetWarningMessage(
      t('CrossSections.editingMaskWarning', { defaultValue: 'Editing mask {{n}}', n: activeMaskIndex + 1 })
    );

    return () => {
      onClearWarningMessage();
    };
```
with:
```tsx
    onSetModeHint(
      t('CrossSections.editingMaskWarning', { defaultValue: 'Editing mask {{n}}', n: activeMaskIndex + 1 })
    );

    return () => {
      onClearModeHint();
    };
```
and the effect's early-return branch:
```tsx
    if (activeMaskIndex === null) {
      onClearWarningMessage();
      return;
    }
```
becomes:
```tsx
    if (activeMaskIndex === null) {
      onClearModeHint();
      return;
    }
```

- [ ] **Step 3: Run the affected test suites**

Run: `npx jest`
Expected: no new failures (neither file had a dedicated test before this change).

- [ ] **Step 4: Manual check-in**

In the app: open Video Range, enable stabilization, click "Add region" — confirm the mode hint pill shows "Editing regions" with "1 of 2 min." next to it, and the count updates live as a second region is added. Open Cross Sections, edit a mask — confirm "Editing mask 1" shows in the same pill style.

- [ ] **Step 5: Commit**

```bash
git add src/components/Forms/Components/StabilizationRegions.tsx src/components/Forms/Components/MaskCreation.tsx
git commit -m "Migrate StabilizationRegions/MaskCreation onto ModeHint"
```

---

## Task 10: Migrate mode hint — `CrossSections.tsx` + `Uav.tsx` + `Oblique.tsx` + `Ipcam.tsx` (pages)

**Files:**
- Modify: `src/components/CrossSections/CrossSections.tsx`
- Modify: `src/pages/Uav.tsx`
- Modify: `src/pages/Oblique.tsx`
- Modify: `src/pages/Ipcam.tsx`

**Interfaces:**
- Consumes: `onSetModeHint`, `onClearModeHint` (Task 2).

Purely mechanical rename — every `onSetWarningMessage(x)` → `onSetModeHint(x)`, every `onClearWarningMessage()` → `onClearModeHint()`, no logic change (unlike Task 9, none of these four have a counter to fold in as `meta`).

- [ ] **Step 1: `CrossSections.tsx`**

Replace every `onSetWarningMessage(` with `onSetModeHint(` and every `onClearWarningMessage()` with `onClearModeHint()` in the effect at the file's "drawing/modifying section" comment (2 call sites + 2 clears). Update the hook import accordingly (`onSetWarningMessage, onClearWarningMessage` → `onSetModeHint, onClearModeHint`, wherever `useUiSlice()` is destructured in this file).

- [ ] **Step 2: `Uav.tsx`**

Same rename, 2 call sites (`drawingLineWarning`/`modifyingLineWarning`) + clears, at the "drawing/modifying line" effect.

- [ ] **Step 3: `Oblique.tsx`**

Same rename, 2 call sites (`drawingPointsWarning`/`modifyingPointsWarning`) + clears, at the "drawing/modifying points" effect.

- [ ] **Step 4: `Ipcam.tsx`**

Same rename, 1 call site (`movingPointWarning`) + clears, at the "moving CP#" effect.

- [ ] **Step 5: Run the full suite**

Run: `npx jest`
Expected: no new failures.

- [ ] **Step 6: Manual check-in**

In the app: on Cross Sections, start drawing a section's direction line — confirm "Drawing section CS_..." shows as a mode-hint pill (not the old bottom bar). Drag an existing pin — confirm it switches to "Modifying section CS_...". Repeat for Uav's pixel-size line, Oblique's control-point square, and Ipcam's control-point drag ("Moving R"/similar).

- [ ] **Step 7: Commit**

```bash
git add src/components/CrossSections/CrossSections.tsx src/pages/Uav.tsx src/pages/Oblique.tsx src/pages/Ipcam.tsx
git commit -m "Migrate CrossSections/Uav/Oblique/Ipcam page mode hints onto ModeHint"
```

---

## Task 11: Toast — `Grid.tsx` copy-to-clipboard

**Files:**
- Modify: `src/components/Grid.tsx`
- Modify: `src/pages/Results.tsx`

**Interfaces:**
- Consumes: `onShowToast` (Task 2).

**Scoping decision:** `Grid.tsx`'s existing `copied` state (a local `useState<boolean>`, driving the `<CopyBtn>`'s tooltip `title` text between "Copy table" and "Copied") stays exactly as-is — that's the button's own hover tooltip, a different UI element from the toast. This task adds a toast alongside it; it does not remove the tooltip swap.

- [ ] **Step 1: `Grid.tsx`**

Add `onShowToast` to this file's `useUiSlice()` destructure (it currently pulls `hoveredStation, onSetHoveredStation` from it — add `onShowToast` to that same destructure). Inside `copyAllDataToClipboard`, in the `.then(() => { setCopied(true); ... })` callback, add the toast call:
```tsx
    navigator.clipboard
      .writeText(textData)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        onShowToast(t('Results.copied', { defaultValue: 'Table copied to clipboard' }));
      })
      .catch((err) => {
        console.error('Error trying to copy table:', err);
      });
```

- [ ] **Step 2: `Results.tsx`**

Grid's toast has no action button, so `<Toast />` (added in Task 8, Step 7) needs no `onAction` prop here — confirm it's still just `<Toast />`.

- [ ] **Step 3: Run the full suite**

Run: `npx jest`
Expected: no new failures.

- [ ] **Step 4: Manual check-in**

On Results, click the copy-table button. Confirm both the existing tooltip text change AND a new toast reading "Table copied to clipboard" appear, and the toast disappears after ~4 seconds.

- [ ] **Step 5: Commit**

```bash
git add src/components/Grid.tsx src/pages/Results.tsx
git commit -m "Show a toast when the results table is copied"
```

---

## Task 12: Toast — STIV angle reset (Undo deferred)

**Files:**
- Modify: `src/hooks/useStivAngleOverride.ts`
- Modify: `src/components/StiAngleTuner.tsx`
- Modify: `src/components/Forms/FormProcessing.tsx`

**Scoping decision — Undo is out of this task:** the audit's mockup for this toast is "Angles reset for CS_default_1 — Undo," and `[[ui-redesign-decisions]]` already establishes Undo-toasts as this project's pattern for reversible actions. But `<Toast/>`'s `onAction` (Task 6) is one callback owned by whichever page renders `<Toast/>` (Results, per Task 8 Step 7), while the two reset actions live two components away (`StiAngleTuner`, reached via `AllInOne`, and `FormProcessing`, rendered directly by `Processing.tsx` — not by `Results.tsx` at all). Wiring a real Undo needs a shared "what would Undo do right now" channel — a small `pendingAction` slice in `uiSlice`, mirroring `toast` itself — which is its own piece of design, not a one-line addition to this task. This task ships both resets as **plain confirmation toasts**, matching Task 11's Grid pattern exactly, and leaves the Undo channel as follow-up work (flag to the product owner: the audit's mockup ships without Undo in 4a).

**Interfaces:**
- Consumes: `onShowToast` (Task 2).
- Produces: `useStivAngleOverride(stationIndex).restore(angles: (number | null)[]): void` — new, exposes the hook's existing internal `persist`. Unused by this task's own call sites (which need no restore without Undo), but is the exact hook the deferred Undo follow-up will call — adding it now, next to `persist`'s other three consumers (`setAngle`/`reset`/`resetAll`), is a one-line, obviously-correct addition; inventing it later would mean re-deriving the same line from scratch.

- [ ] **Step 1: Expose `restore` from `useStivAngleOverride`**

In `src/hooks/useStivAngleOverride.ts`, add `restore` to the returned object, reusing the existing `persist` callback already defined in the hook:
```ts
  return {
    manual,
    autoAngle,
    angle,
    isTuned,
    hasAny: hasAnyOverride(manual),
    setAngle: (deg: number) => persist(setOverride(manual, stationIndex, deg, n)),
    reset: () => persist(clearOverride(manual, stationIndex, n)),
    resetAll: () => persist(clearAllOverrides(n)),
    restore: (angles: (number | null)[]) => persist(angles),
  };
```

- [ ] **Step 2: `StiAngleTuner.tsx`, single-station reset**

Add `useUiSlice` to this file's imports and call it for `onShowToast` (`useTranslation`'s `t` is already imported):
```ts
  const { angle, autoAngle, isTuned, setAngle, reset } = useStivAngleOverride(stationIndex);
  const { onShowToast } = useUiSlice();
```
Change the reset button's handler from the bare `onClick={reset}` to one that also shows a toast:
```tsx
              <button
                type="button"
                className="sti-angle-reset"
                disabled={!isTuned}
                onClick={() => {
                  reset();
                  onShowToast(
                    t('Processing.stiAngleResetToast', {
                      defaultValue: 'Angle reset for station {{station}}',
                      station: stationId,
                    })
                  );
                }}
              >
                {t('Processing.stiAngleReset')}
              </button>
```

- [ ] **Step 3: `FormProcessing.tsx`, reset-all**

Add `onShowToast` to this file's `useUiSlice()` destructure (already pulls `onSetErrorMessage` from it — Task 15 changes that separately; for now just add `onShowToast` alongside it). Change the reset-all button's handler:
```tsx
                <button
                  type="button"
                  className="sti-angle-reset"
                  title={t('Processing.stiAngleResetAllTitle')}
                  onClick={(event) => {
                    event.stopPropagation();
                    resetAllStivAngles();
                    onShowToast(
                      t('Processing.stiAngleResetAllToast', {
                        defaultValue: 'Angles reset for {{section}}',
                        section: name,
                      })
                    );
                  }}
                >
```

- [ ] **Step 4: Run the full suite**

Run: `npx jest`
Expected: no new failures.

- [ ] **Step 5: Manual check-in**

On Processing/Results' STIV view, tune one station's angle, click its reset button — confirm a toast reads "Angle reset for station N". Click "Reset all" — confirm "Angles reset for CS_...".

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useStivAngleOverride.ts src/components/StiAngleTuner.tsx src/components/Forms/FormProcessing.tsx
git commit -m "Show a toast on STIV angle reset (Undo deferred — see Task 12 scoping note)"
```

---

## Task 13: Dialog — `Sections.tsx` delete confirmation

**Files:**
- Modify: `src/components/CrossSections/Sections.tsx`
- Modify: `electron/main.ts`

**Interfaces:**
- Consumes: `useConfirmDialog` (Task 7).

- [ ] **Step 1: `Sections.tsx`**

Add the import and mount the hook:
```ts
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
```
```ts
  const [dialog, confirmDialog] = useConfirmDialog();
```
Replace:
```tsx
    if (event.currentTarget.id === 'delete' && setDeletedSections) {
      const result = await window.ipcRenderer.invoke('delete-confirmation', {
        message: t('CrossSections.warning', {
          section_name: sections[activeSection].name,
        }),
        title: t('CrossSections.title'),
      });

      if (result === 0) {
        setDeletedSections(sections[activeSection].name);
        onDeleteSection();
      }
    }
```
with:
```tsx
    if (event.currentTarget.id === 'delete' && setDeletedSections) {
      const confirmed = await confirmDialog({
        title: t('CrossSections.title'),
        body: t('CrossSections.warning', { section_name: sections[activeSection].name }),
        confirmLabel: t('CrossSections.deleteConfirm', { defaultValue: 'Delete section' }),
        cancelLabel: t('CrossSections.deleteCancel', { defaultValue: 'Cancel' }),
      });

      if (confirmed) {
        setDeletedSections(sections[activeSection].name);
        onDeleteSection();
      }
    }
```
Render `{dialog}` at the end of the component's returned JSX (as a sibling of the outer `<div className="sections">`, e.g. wrap both in a fragment):
```tsx
  return (
    <>
      <div className="sections">
        {/* ...unchanged... */}
      </div>
      {dialog}
    </>
  );
```

- [ ] **Step 2: `electron/main.ts`**

Remove the now-unused handler (its only caller was Step 1's removed `window.ipcRenderer.invoke('delete-confirmation', ...)`):
```ts
ipcMain.handle('delete-confirmation', async (_event, args) => {
  const { message, title } = args;
  const { response } = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['Yes', 'No'],
    defaultId: 1,
    title: title,
    message: message,
  });

  return response;
});
```
Run `grep -n "delete-confirmation" -r electron src` first to confirm no other caller exists before deleting (confirmed at plan-writing time — only these two sites reference the channel name).

- [ ] **Step 3: Run the full suite and typecheck**

Run: `npx jest && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: no new jest failures; tsc count unchanged (Electron's `main.ts` is outside the app's own `tsconfig.json`'s type-check scope the way this project's baseline is measured, per every prior phase's constraint section — confirm by checking the count didn't move).

- [ ] **Step 4: Manual check-in**

Add a second cross-section, click its delete (×) button. Confirm the in-app Dialog appears (not a native OS dialog) with "Cross Sections" title and "Are you sure you want to delete CS_...?" body, Cancel and Delete section buttons. Confirm Cancel closes it with no deletion, and Delete section removes it.

- [ ] **Step 5: Commit**

```bash
git add src/components/CrossSections/Sections.tsx electron/main.ts
git commit -m "Replace native delete-confirmation dialog with in-app Dialog"
```

---

## Task 14: Field error + step alert — `FormVideo.tsx`

**Files:**
- Modify: `src/components/Forms/FormVideo.tsx`

**Interfaces:**
- Consumes: `onSetFieldError`, `onClearFieldError`, `onAddStepAlert`, `onClearStepAlert` (Task 2); `FieldError` (Task 4).

**Triage:** `start`/`end`/`step` are each one registered field with a visible input → field error. The lens-correction-resolution mismatch and the "add 2 regions" submit-time block are not tied to one field → step alert (ids `'lens-correction-mismatch'`, `'stabilization-min-regions'`).

- [ ] **Step 1: Update the hook import and add `FieldError` under each input**

Replace:
```ts
  const { onSetErrorMessage } = useUiSlice();
```
with:
```ts
  const { onSetFieldError, onClearFieldError, onAddStepAlert, onClearStepAlert } = useUiSlice();
```
After the `start` input's closing `</div>` (still inside `.input-field-container`, right after the `<input .../>`), add:
```tsx
              <FieldError name="start" />
```
Same for `end` and `step`. Add `FieldError` to this file's import from `'../index'` or wherever `Messages` is re-exported (`../../components` per Task 8's barrel).

- [ ] **Step 2: Replace the `onError` callback**

Replace:
```ts
  const onError = (error: any) => {
    console.log(error);
    onSetErrorMessage(error);
  };
```
with:
```ts
  const onError = (errors: FieldValues) => {
    Object.entries(errors).forEach(([name, value]) => {
      const message = (value as { message?: string })?.message;
      if (message) onSetFieldError(name, message);
    });
  };
```
Clear a field's error the moment its own value changes — add to `handleBlur` (right before its existing `setValue(...)` calls) and to `handleKeyDown`'s Enter branch, one line each:
```ts
    onClearFieldError(id);
```
(`id` is already in scope in both handlers — `event.target.id` / `(event.target as HTMLInputElement).id`.)

- [ ] **Step 3: Migrate the lens-correction and min-regions errors to step alerts**

Replace:
```ts
          onSetErrorMessage(
            t('VideoRange.Errors.profileResolutionMismatch', { calW: profileSize.width, calH: profileSize.height })
          );
          return;
```
with:
```ts
          onAddStepAlert(
            'lens-correction-mismatch',
            'error',
            t('VideoRange.Errors.profileResolutionMismatch', { calW: profileSize.width, calH: profileSize.height })
          );
          return;
```
Replace:
```ts
      onSetErrorMessage(
        t('VideoRange.minRegionsWarning', { defaultValue: 'Add at least 2 regions for stabilization' })
      );
      return;
```
with:
```ts
      onAddStepAlert(
        'stabilization-min-regions',
        'error',
        t('VideoRange.minRegionsWarning', { defaultValue: 'Add at least 2 regions for stabilization' })
      );
      return;
```
Both step alerts should clear once their condition no longer applies — the simplest correct place is at the top of `onSubmit`, before either check runs:
```ts
  const onSubmit = async (data: FieldValues) => {
    onClearStepAlert('lens-correction-mismatch');
    onClearStepAlert('stabilization-min-regions');
    const lensCorrection = videoData.parameters.lensCorrection;
    // ...unchanged...
```
(A fresh submit attempt either re-raises the alert immediately, if the problem persists, or leaves it cleared — no stale alert can survive a successful path past that check.)

- [ ] **Step 4: Run the full suite and typecheck**

Run: `npx jest && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: no new jest failures; tsc count strictly lower than before this task (one more `onSetErrorMessage` call site resolved).

- [ ] **Step 5: Manual check-in**

On Video Range: leave Step empty, tab out — confirm "Step must be a whole number, 1 or more" appears directly under the Step field, not in a bottom bar. Set End before Start — confirm the field error appears under End. Enable stabilization with 1 region and try to proceed — confirm "Add at least 2 regions for stabilization" appears as a step-alert card in the panel.

- [ ] **Step 6: Commit**

```bash
git add src/components/Forms/FormVideo.tsx
git commit -m "Migrate FormVideo's field validation and step alerts off the old error bar"
```

---

## Task 15: Field error + step alert — `FormProcessing.tsx` + `HardModeProcessing.tsx`

**Files:**
- Modify: `src/components/Forms/FormProcessing.tsx`
- Modify: `src/components/Forms/Components/HardModeProcessing.tsx`

**Interfaces:**
- Consumes: `onSetFieldError`, `onClearFieldError`, `onAddStepAlert`, `onClearStepAlert` (Task 2); `FieldError` (Task 4).

**Triage:** the stations-count check is tied to the stations-number input → field error. The test/analyze backend failures (`handleOnClickTest`, `handleOnClick`'s `analize-button` branch) are not field-shaped → step alert (id `'processing-backend-error'`, cleared at the start of the next attempt). `HardModeProcessing.tsx`'s ROI-height recalculation failure is also not field-shaped (it's a backend/IPC failure surfaced after a value already changed) → step alert (id `'processing-roi-recalc-error'`).

- [ ] **Step 1: `FormProcessing.tsx` — stations field error**

Replace the `useUiSlice()` destructure's `onSetErrorMessage` with `onSetFieldError, onClearFieldError, onAddStepAlert, onClearStepAlert` (leave `onShowToast` from Task 12 alongside it). Replace:
```tsx
      } else {
        methods.setValue(`${name}_STATIONS_NUMBER`, numStations);
        if (typeof value === 'number') {
          onSetErrorMessage('The number of stations must be greater than 2');
        }
      }
```
with:
```tsx
      } else {
        methods.setValue(`${name}_STATIONS_NUMBER`, numStations);
        if (typeof value === 'number') {
          onSetFieldError('stations-number', 'The number of stations must be greater than 2');
        }
      }
```
and clear it at the top of the branch that succeeds:
```tsx
      if (isNaN(value) === false && value >= 3) {
        onClearFieldError('stations-number');
        if (value !== numStations) {
          onUpdateSection({ numStations: value }, undefined);
        }
      } else {
```
Add `<FieldError name="stations-number" />` right after the `stations-number` input's closing tag (still inside the same `.switch-container`).

- [ ] **Step 2: `FormProcessing.tsx` — backend step alerts**

Replace:
```tsx
    onSetQuiverTest()
      .then(() => setIsTesting(false))
      .catch((error) => onSetErrorMessage(error.message));
```
with:
```tsx
    onClearStepAlert('processing-backend-error');
    onSetQuiverTest()
      .then(() => setIsTesting(false))
      .catch((error) => onAddStepAlert('processing-backend-error', 'error', error.message));
```
Replace:
```tsx
      onSetQuiverAll()
        .then(() => {
          setShowMedian(true);
        })
        .catch((error) => onSetErrorMessage(error.message));
```
with:
```tsx
      onClearStepAlert('processing-backend-error');
      onSetQuiverAll()
        .then(() => {
          setShowMedian(true);
        })
        .catch((error) => onAddStepAlert('processing-backend-error', 'error', error.message));
```

- [ ] **Step 3: `HardModeProcessing.tsx`**

Replace the hook import and:
```tsx
        } catch (error) {
          onSetErrorMessage((error as Error).message);
        }
```
with:
```tsx
        } catch (error) {
          onAddStepAlert('processing-roi-recalc-error', 'error', (error as Error).message);
        }
```
Clear it right before the `try`:
```tsx
      if (value !== heightRoi) {
        onClearStepAlert('processing-roi-recalc-error');
        try {
          await onReCalculateMask(value);
```
Update its `useUiSlice()` destructure accordingly.

- [ ] **Step 4: Run the full suite and typecheck**

Run: `npx jest && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: no new jest failures; tsc count strictly lower.

- [ ] **Step 5: Manual check-in**

On Processing: type "1" into the stations field and tab out — confirm the field error shows under that input, not a bottom bar. Trigger a backend test/analyze failure (e.g. stop mid-run then retry with a bad config, if reproducible locally) — confirm it shows as a step-alert card in the panel.

- [ ] **Step 6: Commit**

```bash
git add src/components/Forms/FormProcessing.tsx src/components/Forms/Components/HardModeProcessing.tsx
git commit -m "Migrate FormProcessing/HardModeProcessing field and step errors"
```

---

## Task 16: Field error + step alert — `FormCrossSections.tsx` + `Sections.tsx` + `CrossSections.tsx` (page)

**Files:**
- Modify: `src/components/Forms/FormCrossSections.tsx`
- Modify: `src/components/CrossSections/Sections.tsx`
- Modify: `src/components/CrossSections/CrossSections.tsx`

**Interfaces:**
- Consumes: `onSetFieldError`, `onClearFieldError`, `onAddStepAlert`, `onClearStepAlert` (Task 2); `FieldError` (Task 4).

**Triage:** `FormCrossSections.tsx`'s Level and LeftBank errors are each tied to one field (`Level`, `LeftBank`) → field errors. Its bathymetry-import failures are not field-shaped (they come from a file-picker/IPC round trip, not a single input) → step alert (id `'bathymetry-import-error'`). `Sections.tsx`'s three rename-validation errors are all tied to the section-name input → field error, keyed per-section (`` `section-name-${index}` ``, since more than one section's name field can exist at once). `CrossSections.tsx`'s "waiting for frames" and the multi-field `onError` are page-level submit failures, not one field → step alerts.

- [ ] **Step 1: `FormCrossSections.tsx` — Level and LeftBank field errors**

Update the `useUiSlice()` destructure: drop `onSetErrorMessage`, add `onSetFieldError, onClearFieldError, onAddStepAlert, onClearStepAlert`. Replace:
```tsx
      } else {
        setValue(`${name}_LEVEL`, formatNumberTo2Decimals(toDisplay(bathimetry.level)));
        onSetErrorMessage({
          Level: {
            type: 'error',
            message: t('CrossSections.Errors.levelError', {
              yMin: yMin !== undefined ? (toDisplay(yMin) as number).toFixed(2) : undefined,
              yMax: yMax !== undefined ? (toDisplay(yMax) as number).toFixed(2) : undefined,
            }),
          },
        });
      }
```
with:
```tsx
      } else {
        setValue(`${name}_LEVEL`, formatNumberTo2Decimals(toDisplay(bathimetry.level)));
        onSetFieldError(
          'Level',
          t('CrossSections.Errors.levelError', {
            yMin: yMin !== undefined ? (toDisplay(yMin) as number).toFixed(2) : undefined,
            yMax: yMax !== undefined ? (toDisplay(yMax) as number).toFixed(2) : undefined,
          })
        );
      }
```
and clear it in the success branch right above (`if (yMax !== undefined && ...) { onClearFieldError('Level'); onUpdateSection(...); ... }`). Replace the LeftBank site the same way — `onSetErrorMessage({ LeftBank: { type: 'Error', message: t('CrossSections.Errors.leftBank') } })` → `onSetFieldError('LeftBank', t('CrossSections.Errors.leftBank'))`, clearing it in the success branch above it. Add `<FieldError name="Level" />` / `<FieldError name="LeftBank" />` right after each field's input in this file's JSX.

- [ ] **Step 2: `FormCrossSections.tsx` — bathymetry step alert**

Replace:
```tsx
            onSetErrorMessage({
              Bathimetry: {
                type: 'error',
                message: t(message, { level: displayLevel }),
              },
            });
```
with:
```tsx
            onAddStepAlert('bathymetry-import-error', 'error', t(message, { level: displayLevel }));
```
Replace both remaining `.catch((error) => onSetErrorMessage(error.message))` in this file's `handleImportBath` with `.catch((error) => onAddStepAlert('bathymetry-import-error', 'error', error.message))`. Clear the alert at the top of `handleImportBath`:
```ts
  const handleImportBath = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onClearStepAlert('bathymetry-import-error');
```

- [ ] **Step 3: `Sections.tsx` — rename field errors**

Update the `useUiSlice()` destructure: drop `onSetErrorMessage`, add `onSetFieldError, onClearFieldError`. Replace all three:
```tsx
        onSetErrorMessage({
          message: 'Section name can not be empty',
        });
```
```tsx
        onSetErrorMessage({
          message: 'Section name can only contain letters, numbers, and under scores',
        });
```
```tsx
        onSetErrorMessage({
          message: 'Section name already exists',
        });
```
with, respectively:
```tsx
        onSetFieldError(`section-name-${index}`, 'Section name cannot be empty');
```
```tsx
        onSetFieldError(`section-name-${index}`, 'Section name can only contain letters, numbers, and underscores');
```
```tsx
        onSetFieldError(`section-name-${index}`, 'Section name already exists');
```
and clear it in the success branch:
```tsx
      } else {
        onClearFieldError(`section-name-${index}`);
        input.readOnly = true;
        onUpdateSection({ sectionName: value }, undefined);
      }
```
Add `<FieldError name={`section-name-${index}`} />` right after each section's `<input className="input-section" .../>`.

- [ ] **Step 4: `CrossSections.tsx` (page) — step alerts**

Update the `useUiSlice()` destructure similarly. Replace:
```tsx
    if (images.paths.length === 0) {
      onSetErrorMessage(t('Errors.waitingForFrames'));
      return;
    }
```
with:
```tsx
    if (images.paths.length === 0) {
      onAddStepAlert('cross-sections-waiting-for-frames', 'error', t('Errors.waitingForFrames'));
      return;
    }
```
Replace:
```tsx
  const onError = (errors: any) => {
    console.log(errors);
    onSetErrorMessage(errors);
  };
```
with:
```tsx
  const onError = (errors: FieldValues) => {
    const messages = Object.values(errors)
      .map((value) => (value as { message?: string })?.message)
      .filter((message): message is string => Boolean(message));
    onAddStepAlert('cross-sections-form-error', 'error', messages.join(' '));
  };
```
Clear both at the top of `onSubmit`:
```tsx
  const onSubmit = (data: FieldValues) => {
    onClearStepAlert('cross-sections-waiting-for-frames');
    onClearStepAlert('cross-sections-form-error');
    if (images.paths.length === 0) {
```

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npx jest && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: no new jest failures; tsc count strictly lower.

- [ ] **Step 6: Manual check-in**

On Cross Sections: set a bathymetry level out of range — confirm the field error shows under that field. Try importing a malformed bathymetry file (or check the code path manually) — confirm a step-alert card. Rename a section to an existing name — confirm the field error shows under the name input, not a bottom bar. Try to proceed with no frames loaded — confirm a step alert.

- [ ] **Step 7: Commit**

```bash
git add src/components/Forms/FormCrossSections.tsx src/components/CrossSections/Sections.tsx src/components/CrossSections/CrossSections.tsx
git commit -m "Migrate Cross Sections field and step errors"
```

---

## Task 17: Step alert — `FormOblique.tsx` + `Oblique.tsx` (page)

**Files:**
- Modify: `src/components/Forms/FormOblique.tsx`
- Modify: `src/pages/Oblique.tsx`

**Interfaces:**
- Consumes: `onAddStepAlert`, `onClearStepAlert` (Task 2).

**Triage:** every one of these is an IPC/backend round trip (import distances, solve transformation matrix, drag-drop distances file), not tied to a single visible field → all step alerts, one id per distinct operation so a later success only clears its own alert (`'oblique-import-distances'`, `'oblique-solve'`, `'oblique-form-error'`).

- [ ] **Step 1: `FormOblique.tsx`**

Update the `useUiSlice()` destructure. Replace:
```ts
  const handleOnClickImportDistances = () => {
    onGetDistances().catch((error) => onSetErrorMessage(error.message));
  };
```
with:
```ts
  const handleOnClickImportDistances = () => {
    onClearStepAlert('oblique-import-distances');
    onGetDistances().catch((error) => onAddStepAlert('oblique-import-distances', 'error', error.message));
  };
```

- [ ] **Step 2: `Oblique.tsx` (page)**

Update the `useUiSlice()` destructure. Replace:
```ts
  const onError = (error: string) => {
    onSetErrorMessage(error);
  };
```
with:
```ts
  const onError = (error: string) => {
    onAddStepAlert('oblique-form-error', 'error', error);
  };
```
Replace:
```ts
  const onClickSolveButton = () => {
    onGetObliqueTransformationMatrix(methods.getValues()).catch((error) => onSetErrorMessage(error.message));
  };
```
with:
```ts
  const onClickSolveButton = () => {
    onClearStepAlert('oblique-solve');
    onGetObliqueTransformationMatrix(methods.getValues()).catch((error) =>
      onAddStepAlert('oblique-solve', 'error', error.message)
    );
  };
```
Replace:
```ts
      onGetDistances(path).catch((error) => onSetErrorMessage(error.message));
```
with:
```ts
      onClearStepAlert('oblique-import-distances');
      onGetDistances(path).catch((error) => onAddStepAlert('oblique-import-distances', 'error', error.message));
```
(This reuses `'oblique-import-distances'` — the same operation as `FormOblique.tsx`'s button, just triggered by drag-drop instead of a click, so sharing the id is correct: only one can be "in flight" at a time and either success path should clear it.)

- [ ] **Step 3: Run the full suite and typecheck**

Run: `npx jest && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: no new jest failures; tsc count strictly lower.

- [ ] **Step 4: Manual check-in**

On Oblique: trigger an import-distances failure (malformed file) via both the button and drag-drop — confirm both surface the same step alert. Trigger a solve failure — confirm a separate step alert.

- [ ] **Step 5: Commit**

```bash
git add src/components/Forms/FormOblique.tsx src/pages/Oblique.tsx
git commit -m "Migrate Oblique's error messages to step alerts"
```

---

## Task 18: Step alert — `FormIpcam.tsx` + `Ipcam.tsx` (page)

**Files:**
- Modify: `src/components/Forms/FormIpcam.tsx`
- Modify: `src/pages/Ipcam.tsx`

**Interfaces:**
- Consumes: `onAddStepAlert`, `onClearStepAlert` (Task 2).

**Triage:** same shape as Task 17 — all IPC/backend round trips, all step alerts (`'ipcam-import-points'`, `'ipcam-import-images'`, `'ipcam-camera-solution'`).

- [ ] **Step 1: `FormIpcam.tsx`**

Update the `useUiSlice()` destructure. Replace:
```tsx
    if (id === 'import-points') {
      onGetPoints().catch((error) => onSetErrorMessage(error.message));
    } else {
      onGetImages(undefined).catch((error) => onSetErrorMessage(error.message));
    }
```
with:
```tsx
    if (id === 'import-points') {
      onClearStepAlert('ipcam-import-points');
      onGetPoints().catch((error) => onAddStepAlert('ipcam-import-points', 'error', error.message));
    } else {
      onClearStepAlert('ipcam-import-images');
      onGetImages(undefined).catch((error) => onAddStepAlert('ipcam-import-images', 'error', error.message));
    }
```
Replace:
```tsx
    onGetCameraSolution(id)
      .catch((error) => {
        onSetErrorMessage(error.message);
      })
      .finally(() => {
        setMode('');
      });
```
with:
```tsx
    onClearStepAlert('ipcam-camera-solution');
    onGetCameraSolution(id)
      .catch((error) => {
        onAddStepAlert('ipcam-camera-solution', 'error', error.message);
      })
      .finally(() => {
        setMode('');
      });
```

- [ ] **Step 2: `Ipcam.tsx` (page)**

Update the `useUiSlice()` destructure. Replace:
```tsx
        onGetImages(path).catch((error) => {
          onSetErrorMessage(error.message);
        });
      } else {
        onGetPoints(path).catch((error) => {
          onSetErrorMessage(error.message);
        });
      }
```
with:
```tsx
        onClearStepAlert('ipcam-import-images');
        onGetImages(path).catch((error) => {
          onAddStepAlert('ipcam-import-images', 'error', error.message);
        });
      } else {
        onClearStepAlert('ipcam-import-points');
        onGetPoints(path).catch((error) => {
          onAddStepAlert('ipcam-import-points', 'error', error.message);
        });
      }
```
(Reuses `FormIpcam.tsx`'s ids, same reasoning as Task 17's drag-drop reuse.)

- [ ] **Step 3: Run the full suite and typecheck**

Run: `npx jest && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: no new jest failures; tsc count strictly lower.

- [ ] **Step 4: Manual check-in**

On Ipcam: trigger import-points, import-images, and camera-solution failures — confirm each shows its own step alert in the panel.

- [ ] **Step 5: Commit**

```bash
git add src/components/Forms/FormIpcam.tsx src/pages/Ipcam.tsx
git commit -m "Migrate Ipcam's error messages to step alerts"
```

---

## Task 19: Field error — `FormUav.tsx` + `Uav.tsx` (page) + `PixelCoordinates.tsx` + `RealWorldCoordinates.tsx`

**Files:**
- Modify: `src/components/Forms/FormUav.tsx`
- Modify: `src/pages/Uav.tsx`
- Modify: `src/components/Forms/Components/PixelCoordinates.tsx`
- Modify: `src/components/Forms/Components/RealWorldCoordinates.tsx`

**Interfaces:**
- Consumes: `onSetFieldError`, `onClearFieldError`, `onAddStepAlert` (Task 2); `FieldError` (Task 4).

**Triage:** `FormUav.tsx`'s two errors are each tied to one field (`uav_lineLength`, `uav_pixelSize`) → field errors. `Uav.tsx`'s `onError` receives RHF's aggregate errors object from a multi-field form → step alert (id `'uav-form-error'`, same shape as Task 16's `CrossSections.tsx` `onError`). `PixelCoordinates.tsx`/`RealWorldCoordinates.tsx` each build a `{[target.id]: {...}}` error keyed by the exact input id that failed → field error, keyed by that same id.

- [ ] **Step 1: `FormUav.tsx`**

Update the `useUiSlice()` destructure. Replace:
```ts
      } else {
        const error = {
          uav_lineLength: {
            type: 'required',
            message: t('PixelSize.Errors.lineLength'),
          },
        };
        onSetErrorMessage(error);
      }
```
with:
```ts
      } else {
        onSetFieldError('uav_lineLength', t('PixelSize.Errors.lineLength'));
      }
```
and clear it in the success branch right above (`if (rawValue > 0) { onClearFieldError('uav_lineLength'); onUpdatePixelSize(...); }`). Same pattern for `uav_pixelSize`. Add `<FieldError name="uav_lineLength" />` / `<FieldError name="uav_pixelSize" />` after their respective inputs.

- [ ] **Step 2: `Uav.tsx` (page)**

Update the `useUiSlice()` destructure. Replace:
```ts
  const onError = (error: FieldValues, event: React.FormEvent<HTMLFormElement>) => {
    if (event === undefined) return;

    onSetErrorMessage(error);
  };
```
with:
```ts
  const onError = (errors: FieldValues, event: React.FormEvent<HTMLFormElement>) => {
    if (event === undefined) return;

    const messages = Object.values(errors)
      .map((value) => (value as { message?: string })?.message)
      .filter((message): message is string => Boolean(message));
    onAddStepAlert('uav-form-error', 'error', messages.join(' '));
  };
```

- [ ] **Step 3: `PixelCoordinates.tsx`**

Update the `useUiSlice()` destructure. Replace:
```tsx
      if (value < 0 || isNaN(value)) {
        const error = {
          [target.id]: {
            type: 'required',
            message: `The value ${target.id} must be greater than 0 and can't be empty`,
          },
        };
        onSetErrorMessage(error);
        const fieldName = `${modeName}_${target.id}`;
        resetField(fieldName);
        return;
      }
```
with:
```tsx
      if (value < 0 || isNaN(value)) {
        onSetFieldError(target.id, `The value ${target.id} must be greater than 0 and can't be empty`);
        const fieldName = `${modeName}_${target.id}`;
        resetField(fieldName);
        return;
      }
```
Clear it right after the guard, before the loop that dispatches the valid value:
```tsx
      onClearFieldError(target.id);
      for (let i = 0; i < fields; i++) {
```
Add `<FieldError name={target.id} />` — this needs the actual field id in scope at render time, not just in the handler; check this file's render loop for where each coordinate input is mapped and add one `<FieldError name={pointsNames[i]} />` per rendered input, next to it.

- [ ] **Step 4: `RealWorldCoordinates.tsx`**

Same pattern as Step 3: `onSetErrorMessage({[target.id]: {type: 'required', message: ...}})` → `onSetFieldError(target.id, ...)`, cleared before the dispatch loop, `<FieldError name={pointsNames[i]} />` added per rendered input.

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npx jest && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: no new jest failures; tsc count strictly lower.

- [ ] **Step 6: Manual check-in**

On Uav's pixel-size screen: leave the line-length field invalid — confirm the field error shows under it. Enter an out-of-range pixel/real-world coordinate — confirm the field error shows under that specific coordinate input, not a shared bottom bar.

- [ ] **Step 7: Commit**

```bash
git add src/components/Forms/FormUav.tsx src/pages/Uav.tsx src/components/Forms/Components/PixelCoordinates.tsx src/components/Forms/Components/RealWorldCoordinates.tsx
git commit -m "Migrate Uav pixel-size field errors and form step alert"
```

---

## Task 20: Step alert — `HomePage.tsx` + `Processing.tsx` (page)

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/Processing.tsx`

**Interfaces:**
- Consumes: `onAddStepAlert`, `onClearStepAlert` (Task 2).

**Triage:** both are whole-operation failures (load project, flush+load results before advancing) with no single field to attach to → step alerts (`'home-load-project'`, `'processing-load-results'`). `HomePage.tsx` renders no `StepAlertList` yet (it's the wizard's very first screen, no `.form-container`/`.media-container` split) — check whether `HomePage.tsx` was included in Task 8's 7 pages; it was not (only Uav/CrossSections/Oblique/Ipcam/Processing/Results/VideoRange were). This task adds `<StepAlertList />` to `HomePage.tsx` directly.

- [ ] **Step 1: `HomePage.tsx`**

Add the import (`StepAlertList` from `'../components'`). Update the `useUiSlice()` destructure — drop `onSetErrorMessage, error` (note: `error` was also destructured for display elsewhere in this file; check its other uses before removing — if the raw array is read anywhere besides the `onSetErrorMessage` call, that read becomes `stepAlerts` instead, though a raw `error`/`stepAlerts` array read outside `StepAlertList` itself would be unusual and worth double-checking against this file's actual render code, not just the header import, before deleting). Replace:
```tsx
        onSetErrorMessage(
          t('MainPage.Errors.' + result, {
            defaultValue: t('MainPage.Errors.default'),
          })
        );
```
with:
```tsx
        onAddStepAlert(
          'home-load-project',
          'error',
          t('MainPage.Errors.' + result, {
            defaultValue: t('MainPage.Errors.default'),
          })
        );
```
Clear it at the top of `handleNewProjectClick`'s `else` branch, before `onLoadProject()` is awaited. Mount `<StepAlertList />` somewhere sensible in this page's JSX (near the "load project" button, since that's its only source).

- [ ] **Step 2: `Processing.tsx` (page)**

Update the `useUiSlice()` destructure. Replace:
```tsx
    } catch (error) {
      onSetErrorMessage((error as Error).message);
    }
```
with:
```tsx
    } catch (error) {
      onAddStepAlert('processing-load-results', 'error', (error as Error).message);
    }
```
Clear it at the top of `handleNext`'s `try`.

- [ ] **Step 3: Run the full suite and typecheck**

Run: `npx jest && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: no new jest failures; tsc count back down to exactly 64 (this is the last `onSetErrorMessage`/`onSetWarningMessage`/`onSetInfoMessage`/`onClearWarningMessage` call site in the app — confirm with `grep -rn "onSetErrorMessage\|onSetWarningMessage\|onClearWarningMessage\|onSetInfoMessage" src` returning zero matches before moving to Task 21).

- [ ] **Step 4: Manual check-in**

On the Home screen, try loading a malformed/missing project — confirm a step alert appears. On Processing, trigger a failure in the Next-button's result-loading path if reproducible — confirm a step alert.

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/Processing.tsx
git commit -m "Migrate HomePage/Processing's remaining error messages to step alerts"
```

---

## Task 21: Cleanup — delete dead code, final verification

**Files:**
- Delete: `src/components/Error.tsx`, `src/components/Warning.tsx`, `src/components/Info.tsx`
- Modify: `src/components/index.ts`
- Modify: `src/components/components.css`
- Modify: `src/store/ui/types.ts`, `src/store/ui/uiSlice.ts` (if anything was left half-migrated)

- [ ] **Step 1: Confirm nothing references the old components or state**

Run:
```bash
grep -rn "components/Error\|components/Warning\|components/Info\b" src --include="*.tsx" --include="*.ts" | grep -v "src/components/Error.tsx\|src/components/Warning.tsx\|src/components/Info.tsx"
grep -rn "\berror\b: string\[\]\|\bwarning\b: string\[\]\|\binfo\b: string\[\]" src/store/ui/types.ts
```
Expected: both empty (the first because Task 8 removed every JSX usage; the second because Task 1 already replaced the type fields).

- [ ] **Step 2: Delete the three components**

```bash
git rm src/components/Error.tsx src/components/Warning.tsx src/components/Info.tsx
```
Remove their exports from `src/components/index.ts`.

- [ ] **Step 3: Delete their CSS**

In `src/components/components.css`, delete the `.error`, `.error-text`, `.info`, `.info-text`, `.warning`, `.warning-text`, `.message-region`, `.message-stack .message-region` rules (everything Task 8, Step 9 didn't already remove). Check `.error-message-link` (line ~1016) separately — it was `Error.tsx`'s URL-link style; `StepAlert.tsx`'s Task 5 `.step-alert-link` replaces its *function*, so this rule is also now dead. Confirm with `grep -n "error-message-link" src` returning only the CSS rule itself before deleting it.

- [ ] **Step 4: Full verification run**

Run:
```bash
npx jest
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"
npm run lint
```
Expected: jest suites/tests count ≥ the Task 1 baseline (35 suites/410 tests) plus this plan's new test files (Tasks 1, 3, 5 — 3 new suites, ~20 new tests); `error TS` count back to exactly 64; lint problems ≤ 24 (21 errors, 3 warnings).

- [ ] **Step 5: Manual full walkthrough**

Run `npm run dev`. Walk through Home → Video Range → (Cross Sections | Uav | Oblique | Ipcam, whichever the project type is) → Processing → Results, in all three themes (dark/light/dracula, per `[[feedback_ui_three_themes]]`), confirming: no page shows a leftover bottom-of-canvas coloured bar; mode hints appear as floating pills on the canvas while drawing/editing; field errors appear inline; step alerts appear as panel cards; the two toasts (Grid copy, STIV reset) appear and auto-dismiss; the cross-section delete Dialog is in-app, themed correctly in all three themes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Delete the old Error/Warning/Info components and their dead CSS"
```

---

## Deferred / explicitly out of scope

- **Toast Undo** (Task 12): STIV angle reset ships as a plain confirmation toast, not the audit's "Angles reset — Undo" mockup. A shared `pendingAction` channel (mirroring how `toast` itself is one Redux field) is real, scoped work for a follow-up, not a one-task add-on.
- **The audit's "STIV model weights not found" / "Bathymetry required for CS_default_1" step-alert mockups** are illustrative, not real call sites — `stivWeightsMissing` is (and stays) a disabled-row tooltip only, never dispatched as a message today. Nothing in this plan invents a new alert that doesn't already fire in the current app.
- **4b (canvas overlays: masks, regions, STIV search lines, colour bar), 4c (Results panel: crosshair, pinnable station tag, expandable technique rows), 4d (step progress, advanced-mode persistence)** — separate plans, per the phase-4 brainstorming split.
- **12-language translation entries** for any new `defaultValue`-backed keys this plan introduces — deferred to the translation team, matching how the 9 existing mode-hint keys were handled.
