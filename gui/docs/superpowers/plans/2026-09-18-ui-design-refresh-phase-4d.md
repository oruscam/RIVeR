# UI Design Refresh Phase 4d — Step progress and advanced-mode persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unlabelled, non-interactive step-bar (`Progress.tsx`) with a labelled `Stepper` whose completed segments jump the wizard straight there (replaying every reset a sequence of single Back-clicks would have applied), and make the "advanced settings" toggle persist consistently — with a text label — on every screen instead of resetting on Video Range and Processing.

**Architecture:** A pure `getStepLeaveEffect(moduleNumber, handlers)` helper is extracted from `WizardButtons.handlePreviuos`'s existing switch, so both the single-step Back button and the new multi-step `Stepper` jump call the same reset logic. A pure `buildStepperContent(activeStep, footageType)` helper turns `react-use-wizard`'s `activeStep` into the 6 segments' done/current/upcoming status plus the caption text, reusing each screen's own existing, already-translated title key (no new step-name copy). Video Range's and Processing's `extraFields` move from local `useState` into their own existing Redux slice (`Processing` in `dataSlice`, `Video` in `projectSlice`), mirroring the toggle pattern Cross Sections/UAV/Oblique already use. `LockBtn.tsx`'s render swaps the icon-only padlock for the app's existing `.switch-container`/`.switch` pattern, with its `handleOnChange` switch-statement — the part that actually does the toggling and scrolling — untouched.

**Tech Stack:** React, Redux Toolkit, `react-use-wizard`, TypeScript, Jest (`testEnvironment: "node"` — no DOM/React rendering in tests; only pure-logic modules are unit-tested), react-i18next.

**Spec:** `gui/docs/superpowers/specs/2026-09-18-ui-design-refresh-phase-4d-design.md`

## Global Constraints

- No `Co-Authored-By` or other attribution trailer on any commit (project convention, `river-git` skill).
- New copy uses `t(key, { defaultValue: '...' })` only — no edits to the actual locale JSON files; translation entries are deferred to the translation team, matching every prior phase on this branch (4a/4b/4c). Reused existing keys (`VideoRange.title`, `PixelSize.title`, `ControlPoints.title`, `CrossSections.title`, `Processing.title`, `Results.title`, `Report.Summary.title`) are called as plain `t(key)` — they're already fully translated in all 11 locale files, so no `defaultValue` is needed or correct for them.
- No new test infrastructure: this codebase's Jest config is `testEnvironment: "node"` with no `@testing-library/react` and no `.test.tsx` files anywhere. Automated tests are pure-logic `.test.ts` files only (no DOM, no component rendering). Every interactive/visual change gets a **Manual check-in** step instead of an automated test — this matches the existing convention, not a gap introduced by this plan.
- Baseline to preserve, confirm at the start of Task 1 and re-confirm at the end of the final task: run `npx jest`, `npx tsc --noEmit`, `npm run lint` and record the counts (last known, at tip `47779a6`: 45 suites / 467 tests passing, 64 pre-existing `tsc` errors, 20 lint problems). No task may add new `tsc` errors or lint problems, or reduce the passing test count.
- Follow existing per-file conventions exactly: the `MODULE_NUMBER`/`FOOTAGE_TYPES` constants (`src/constants/constants.ts`), the `onSet*`/`onToggle*` hook-method naming already used by every other slice, and the `.switch`/`.switch-container`/`.slider` toggle markup already used throughout `HardModeProcessing.tsx`, `StabilizationRegions.tsx` and `LensCorrection.tsx` — do not invent a new toggle-switch visual.
- Commit after every task (and after every fix wave in the final task), with a concise imperative message — no trailing metadata.

---

## Task 1: Extract `getStepLeaveEffect` from `WizardButtons`

**Files:**
- Create: `src/helpers/stepLeaveEffects.ts`
- Create: `src/helpers/stepLeaveEffects.test.ts`
- Modify: `src/helpers/index.ts`
- Modify: `src/components/WizzardButtons.tsx`

**Interfaces:**
- Produces: `StepLeaveHandlers` interface (`onSetActiveSection: (index: number) => void`, `onSetSeeAll: (value: boolean) => void`, `onSetDefaultProjectState: () => void`); `getStepLeaveEffect(moduleNumber: number, handlers: StepLeaveHandlers): (() => void) | undefined`. Task 3's `Stepper` calls this directly.

- [ ] **Step 1: Confirm the starting baseline**

Run: `npx jest`, `npx tsc --noEmit`, `npm run lint`
Expected: 45 suites / 467 tests passing, 64 `tsc` errors, 20 lint problems (matching this plan's Global Constraints). If different, record the actual counts and use those as the baseline for every later task's "no regression" check instead.

- [ ] **Step 2: Write the failing tests**

Create `src/helpers/stepLeaveEffects.test.ts`:

```ts
import { getStepLeaveEffect } from './stepLeaveEffects';
import { MODULE_NUMBER } from '../constants/constants';

const handlers = () => ({
  onSetActiveSection: jest.fn(),
  onSetSeeAll: jest.fn(),
  onSetDefaultProjectState: jest.fn(),
});

describe('getStepLeaveEffect', () => {
  it('resets the active section to 0 when leaving Cross Sections', () => {
    const h = handlers();
    getStepLeaveEffect(MODULE_NUMBER.CROSS_SECTIONS, h)?.();
    expect(h.onSetActiveSection).toHaveBeenCalledWith(0);
    expect(h.onSetSeeAll).not.toHaveBeenCalled();
    expect(h.onSetDefaultProjectState).not.toHaveBeenCalled();
  });

  it('forces seeAll on when leaving Processing', () => {
    const h = handlers();
    getStepLeaveEffect(MODULE_NUMBER.PROCESSING, h)?.();
    expect(h.onSetSeeAll).toHaveBeenCalledWith(true);
    expect(h.onSetActiveSection).not.toHaveBeenCalled();
    expect(h.onSetDefaultProjectState).not.toHaveBeenCalled();
  });

  it('resets the whole project when leaving Video Range', () => {
    const h = handlers();
    getStepLeaveEffect(MODULE_NUMBER.VIDEO_RANGE, h)?.();
    expect(h.onSetDefaultProjectState).toHaveBeenCalled();
    expect(h.onSetActiveSection).not.toHaveBeenCalled();
    expect(h.onSetSeeAll).not.toHaveBeenCalled();
  });

  it('has no effect for a step with no special reset (Pixel Size, Results, Report)', () => {
    const h = handlers();
    expect(getStepLeaveEffect(MODULE_NUMBER.PIXEL_SIZE, h)).toBeUndefined();
    expect(getStepLeaveEffect(MODULE_NUMBER.RESULTS, h)).toBeUndefined();
    expect(getStepLeaveEffect(MODULE_NUMBER.REPORT, h)).toBeUndefined();
    expect(h.onSetActiveSection).not.toHaveBeenCalled();
    expect(h.onSetSeeAll).not.toHaveBeenCalled();
    expect(h.onSetDefaultProjectState).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx jest src/helpers/stepLeaveEffects.test.ts`
Expected: FAIL — `./stepLeaveEffects` does not exist yet.

- [ ] **Step 4: Implement `getStepLeaveEffect`**

Create `src/helpers/stepLeaveEffects.ts`:

```ts
import { MODULE_NUMBER } from '../constants/constants';

export interface StepLeaveHandlers {
  onSetActiveSection: (index: number) => void;
  onSetSeeAll: (value: boolean) => void;
  onSetDefaultProjectState: () => void;
}

/**
 * The side effect that must run when leaving `moduleNumber` backward — via
 * the wizard's single-step Back button, or a multi-step jump from the step
 * bar. Returns `undefined` when leaving that step has no extra effect.
 *
 * This is the single place that knows what "leaving a step backward" means,
 * so a multi-step jump can apply every intermediate step's effect in the
 * same order a sequence of single Back-clicks would have, instead of a
 * second, hand-written copy that could drift from this one.
 */
export function getStepLeaveEffect(
  moduleNumber: number,
  handlers: StepLeaveHandlers
): (() => void) | undefined {
  switch (moduleNumber) {
    case MODULE_NUMBER.CROSS_SECTIONS:
      return () => handlers.onSetActiveSection(0);
    case MODULE_NUMBER.PROCESSING:
      return () => handlers.onSetSeeAll(true);
    case MODULE_NUMBER.VIDEO_RANGE:
      return () => handlers.onSetDefaultProjectState();
    default:
      return undefined;
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/helpers/stepLeaveEffects.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Export it from the helpers barrel**

In `src/helpers/index.ts`, add the import near the other single-purpose helpers (e.g. next to `getDirectionVector`):

```ts
import { getStepLeaveEffect } from './stepLeaveEffects';
import type { StepLeaveHandlers } from './stepLeaveEffects';
```

Add to the `export type { ... }` block:

```ts
  StepLeaveHandlers,
```

Add to the `export { ... }` block:

```ts
  getStepLeaveEffect,
```

- [ ] **Step 7: Refactor `WizardButtons.handlePreviuos` to use it — pure refactor, no behaviour change**

In `src/components/WizzardButtons.tsx`, replace the `handlePreviuos` function:

```ts
  const handlePreviuos = () => {
    switch (activeStep) {
      case MODULE_NUMBER.CROSS_SECTIONS:
        onSetActiveSection(0);
        previousStep();
        break;

      case MODULE_NUMBER.PROCESSING:
        onSetSeeAll(true);
        previousStep();
        break;

      case MODULE_NUMBER.VIDEO_RANGE:
        onSetDefaultProjectState();
        previousStep();
        break;

      default:
        previousStep();
    }
  };
```

with:

```ts
  const handlePreviuos = () => {
    getStepLeaveEffect(activeStep, { onSetActiveSection, onSetSeeAll, onSetDefaultProjectState })?.();
    previousStep();
  };
```

`MODULE_NUMBER` is no longer used anywhere else in this file, so replace its import with the new one instead of adding alongside it:

```ts
import { MODULE_NUMBER } from '../constants/constants';
```

becomes:

```ts
import { getStepLeaveEffect } from '../helpers';
```

(Leaving the old `MODULE_NUMBER` import in place would fail the build — `noUnusedLocals` is on — so it must be removed, not just left unused.)

- [ ] **Step 8: Manual check-in**

This is a pure refactor of existing, already-exercised behaviour — no new manual verification is required beyond confirming the app still builds (`npx tsc --noEmit` in Step 9). If running the actual Electron app is available in this environment, click Back once from Cross Sections, Processing, and Video Range and confirm the same behaviour as before (active section resets to the first one; Processing's "see all" state; Video Range's full project reset when going back to Footage Mode).

- [ ] **Step 9: Run the full suite and verify no regression**

Run: `npx jest`, `npx tsc --noEmit`, `npm run lint`
Expected: 45 suites / 471 tests passing (467 + 4 new), same 64 `tsc` errors, same 20 lint problems.

- [ ] **Step 10: Commit**

```bash
git add src/helpers/stepLeaveEffects.ts src/helpers/stepLeaveEffects.test.ts src/helpers/index.ts src/components/WizzardButtons.tsx
git commit -m "Extract getStepLeaveEffect from WizardButtons for reuse by the step bar"
```

---

## Task 2: `buildStepperContent` — pure content builder for the step bar

**Files:**
- Create: `src/helpers/stepperContent.ts`
- Create: `src/helpers/stepperContent.test.ts`
- Modify: `src/helpers/index.ts`

**Interfaces:**
- Consumes: `MODULE_NUMBER`, `FOOTAGE_TYPES` from `src/constants/constants.ts`.
- Produces: `StepStatus = 'done' | 'current' | 'upcoming'`; `StepInfo { moduleNumber: number; labelKey: string }`; `StepperStep extends StepInfo { status: StepStatus }`; `StepperContent { steps: StepperStep[]; stepNumber: number; totalSteps: number; currentLabelKey: string; nextLabelKey: string | null }`; `buildStepperContent(activeStep: number, footageType: string): StepperContent`. Task 3's `Stepper` component calls this directly and renders its output.

- [ ] **Step 1: Write the failing tests**

Create `src/helpers/stepperContent.test.ts`:

```ts
import { buildStepperContent } from './stepperContent';
import { MODULE_NUMBER, FOOTAGE_TYPES } from '../constants/constants';

describe('buildStepperContent', () => {
  it('marks Video Range as current and everything after it as upcoming', () => {
    const content = buildStepperContent(MODULE_NUMBER.VIDEO_RANGE, FOOTAGE_TYPES.UAV);
    expect(content.steps.map((s) => s.status)).toEqual([
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
    expect(content.stepNumber).toBe(1);
    expect(content.totalSteps).toBe(6);
    expect(content.currentLabelKey).toBe('VideoRange.title');
  });

  it('matches the audit mockup exactly: Processing is step 4 of 6, next is Results', () => {
    const content = buildStepperContent(MODULE_NUMBER.PROCESSING, FOOTAGE_TYPES.UAV);
    expect(content.stepNumber).toBe(4);
    expect(content.totalSteps).toBe(6);
    expect(content.currentLabelKey).toBe('Processing.title');
    expect(content.nextLabelKey).toBe('Results.title');
    expect(content.steps.map((s) => s.status)).toEqual([
      'done',
      'done',
      'done',
      'current',
      'upcoming',
      'upcoming',
    ]);
  });

  it('has no "next" on the last step, Report', () => {
    const content = buildStepperContent(MODULE_NUMBER.REPORT, FOOTAGE_TYPES.UAV);
    expect(content.stepNumber).toBe(6);
    expect(content.currentLabelKey).toBe('Report.Summary.title');
    expect(content.nextLabelKey).toBeNull();
    expect(content.steps.every((s, i) => (i < 5 ? s.status === 'done' : s.status === 'current'))).toBe(true);
  });

  it('names the Pixel Size step "PixelSize.title" for UAV footage', () => {
    const content = buildStepperContent(MODULE_NUMBER.PIXEL_SIZE, FOOTAGE_TYPES.UAV);
    expect(content.currentLabelKey).toBe('PixelSize.title');
  });

  it('names the Pixel Size step "ControlPoints.title" for Oblique footage', () => {
    const content = buildStepperContent(MODULE_NUMBER.PIXEL_SIZE, FOOTAGE_TYPES.OBLIQUE);
    expect(content.currentLabelKey).toBe('ControlPoints.title');
  });

  it('names the Pixel Size step "ControlPoints.title" for Ipcam footage', () => {
    const content = buildStepperContent(MODULE_NUMBER.PIXEL_SIZE, FOOTAGE_TYPES.IPCAM);
    expect(content.currentLabelKey).toBe('ControlPoints.title');
  });

  it('marks Cross Sections done once past it, without touching later steps', () => {
    const content = buildStepperContent(MODULE_NUMBER.RESULTS, FOOTAGE_TYPES.UAV);
    const crossSections = content.steps.find((s) => s.moduleNumber === MODULE_NUMBER.CROSS_SECTIONS);
    expect(crossSections?.status).toBe('done');
    expect(content.currentLabelKey).toBe('Results.title');
    expect(content.nextLabelKey).toBe('Report.Summary.title');
  });

  it('falls back to the first step for an activeStep outside the 6 (e.g. Home/Footage Mode)', () => {
    const content = buildStepperContent(0, FOOTAGE_TYPES.UAV);
    expect(content.stepNumber).toBe(1);
    expect(content.currentLabelKey).toBe('VideoRange.title');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/helpers/stepperContent.test.ts`
Expected: FAIL — `./stepperContent` does not exist yet.

- [ ] **Step 3: Implement `buildStepperContent`**

Create `src/helpers/stepperContent.ts`:

```ts
import { MODULE_NUMBER, FOOTAGE_TYPES } from '../constants/constants';

export type StepStatus = 'done' | 'current' | 'upcoming';

export interface StepInfo {
  moduleNumber: number;
  labelKey: string;
}

export interface StepperStep extends StepInfo {
  status: StepStatus;
}

export interface StepperContent {
  steps: StepperStep[];
  stepNumber: number;
  totalSteps: number;
  currentLabelKey: string;
  nextLabelKey: string | null;
}

const getPixelSizeLabelKey = (footageType: string): string =>
  footageType === FOOTAGE_TYPES.UAV ? 'PixelSize.title' : 'ControlPoints.title';

/**
 * The 6 user-facing wizard steps the step bar shows, in order. Each label
 * key is an existing, already-translated title key — the same one that
 * screen's own FormHeader already uses — so this introduces no new step-name
 * copy. The Pixel Size step's name depends on footage type, matching how
 * Uav.tsx vs. Oblique.tsx/Ipcam.tsx title their own FormHeader today.
 */
const getStepInfos = (footageType: string): StepInfo[] => [
  { moduleNumber: MODULE_NUMBER.VIDEO_RANGE, labelKey: 'VideoRange.title' },
  { moduleNumber: MODULE_NUMBER.PIXEL_SIZE, labelKey: getPixelSizeLabelKey(footageType) },
  { moduleNumber: MODULE_NUMBER.CROSS_SECTIONS, labelKey: 'CrossSections.title' },
  { moduleNumber: MODULE_NUMBER.PROCESSING, labelKey: 'Processing.title' },
  { moduleNumber: MODULE_NUMBER.RESULTS, labelKey: 'Results.title' },
  { moduleNumber: MODULE_NUMBER.REPORT, labelKey: 'Report.Summary.title' },
];

export function buildStepperContent(activeStep: number, footageType: string): StepperContent {
  const steps: StepperStep[] = getStepInfos(footageType).map((info) => ({
    ...info,
    status: info.moduleNumber < activeStep ? 'done' : info.moduleNumber === activeStep ? 'current' : 'upcoming',
  }));

  const currentIndex = steps.findIndex((step) => step.moduleNumber === activeStep);
  const resolvedIndex = currentIndex === -1 ? 0 : currentIndex;
  const current = steps[resolvedIndex];
  const next = resolvedIndex < steps.length - 1 ? steps[resolvedIndex + 1] : null;

  return {
    steps,
    stepNumber: resolvedIndex + 1,
    totalSteps: steps.length,
    currentLabelKey: current.labelKey,
    nextLabelKey: next ? next.labelKey : null,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/helpers/stepperContent.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Export it from the helpers barrel**

In `src/helpers/index.ts`, add the import next to `stepLeaveEffects`:

```ts
import { buildStepperContent } from './stepperContent';
import type { StepperContent, StepperStep, StepStatus } from './stepperContent';
```

Add to the `export type { ... }` block:

```ts
  StepperContent,
  StepperStep,
  StepStatus,
```

Add to the `export { ... }` block:

```ts
  buildStepperContent,
```

- [ ] **Step 6: Run the full suite and verify no regression**

Run: `npx jest`, `npx tsc --noEmit`, `npm run lint`
Expected: 45 suites / 479 tests passing (471 + 8 new), same 64 `tsc` errors, same 20 lint problems.

- [ ] **Step 7: Commit**

```bash
git add src/helpers/stepperContent.ts src/helpers/stepperContent.test.ts src/helpers/index.ts
git commit -m "Add buildStepperContent: pure step-bar label/status builder"
```

---

## Task 3: `Stepper` component — replaces `Progress.tsx`

**Files:**
- Create: `src/components/Stepper.tsx`
- Modify: `src/components/Forms/Components/FormHeader.tsx`
- Modify: `src/components/index.ts`
- Modify: `src/index.css`
- Delete: `src/components/Progress.tsx`

**Interfaces:**
- Consumes: `buildStepperContent` and `getStepLeaveEffect` (Tasks 1–2, from `../helpers`); `useWizard()` from `react-use-wizard` (`activeStep`, `goToStep`); `useDataSlice()` (`isBackendWorking`); `useProjectSlice()` (`type`, `onSetDefaultProjectState`); `useSectionSlice()` (`onSetActiveSection`); `useUiSlice()` (`onSetSeeAll`).
- Produces: `Stepper` component (default export style matches `Progress.tsx`'s named export — `export const Stepper = () => {...}`), consumed only by `FormHeader.tsx`.

- [ ] **Step 1: Write `Stepper.tsx`**

Create `src/components/Stepper.tsx`:

```tsx
import { useWizard } from 'react-use-wizard';
import { useTranslation } from 'react-i18next';
import { useDataSlice, useProjectSlice, useSectionSlice, useUiSlice } from '../hooks';
import { buildStepperContent, getStepLeaveEffect } from '../helpers';

export const Stepper = () => {
  const { activeStep, goToStep } = useWizard();
  const { t } = useTranslation();
  const { type, onSetDefaultProjectState } = useProjectSlice();
  const { isBackendWorking } = useDataSlice();
  const { onSetActiveSection } = useSectionSlice();
  const { onSetSeeAll } = useUiSlice();

  const content = buildStepperContent(activeStep, type);

  const handleJumpToStep = (target: number) => {
    if (isBackendWorking) return;
    for (let step = activeStep; step > target; step--) {
      getStepLeaveEffect(step, { onSetActiveSection, onSetSeeAll, onSetDefaultProjectState })?.();
    }
    goToStep(target);
  };

  return (
    <div className="stepper">
      <div className="stepper-bars">
        {content.steps.map((step) => (
          <button
            key={step.moduleNumber}
            type="button"
            className={`stepper-bar stepper-bar-${step.status}`}
            disabled={step.status !== 'done' || isBackendWorking}
            onClick={() => handleJumpToStep(step.moduleNumber)}
            aria-label={t(step.labelKey)}
          />
        ))}
      </div>
      <div className="stepper-caption">
        <span>
          <b>{t(content.currentLabelKey)}</b>
          {' · '}
          {t('Commons.stepOf', {
            defaultValue: 'Step {{n}} of {{total}}',
            n: content.stepNumber,
            total: content.totalSteps,
          })}
        </span>
        {content.nextLabelKey && (
          <span>
            {t('Commons.next', { defaultValue: 'Next: {{name}}', name: t(content.nextLabelKey) })}
          </span>
        )}
      </div>
    </div>
  );
};
```

Note: the loop applies every intermediate step's leave-effect from `activeStep` down to (but not including) `target` — e.g. jumping from Results (6) to Video Range (2) applies the effects registered for module numbers 6, 5, 4, 3 in that order (Processing's `onSetSeeAll(true)` and Cross Sections' `onSetActiveSection(0)` fire; the other two are no-ops), exactly matching what 4 individual Back-clicks from Results would apply — verified by hand in the spec's §5.1.

- [ ] **Step 2: Wire it into `FormHeader.tsx`**

In `src/components/Forms/Components/FormHeader.tsx`, replace:

```tsx
import { Sections } from '../../CrossSections';
import { Progress } from '../../Progress';
```

with:

```tsx
import { Sections } from '../../CrossSections';
import { Stepper } from '../../Stepper';
```

and replace:

```tsx
      {showProgress && <Progress />}
```

with:

```tsx
      {showProgress && <Stepper />}
```

- [ ] **Step 3: Update the `components` barrel**

In `src/components/index.ts`, replace:

```ts
import { Progress } from './Progress';
```

with:

```ts
import { Stepper } from './Stepper';
```

In the `export { ... }` block, the list is case-sensitively sorted (e.g. `IWaveViewer` before `ImageIpcam` — uppercase sorts before lowercase). Remove `Progress` from its current spot:

```ts
  ModeHint,
  Progress,
  Results,
```

becomes:

```ts
  ModeHint,
  Results,
```

and insert `Stepper` in its sorted spot, between `StepAlertList` and `StiAngleTuner`:

```ts
  StepAlertList,
  StiAngleTuner,
```

becomes:

```ts
  StepAlertList,
  Stepper,
  StiAngleTuner,
```

- [ ] **Step 4: Delete `Progress.tsx`**

```bash
git rm src/components/Progress.tsx
```

- [ ] **Step 5: Replace the step-bar CSS**

In `src/index.css`, replace the `PROGRESS INDICATORS` block:

```css
/* =============================================================================
   PROGRESS INDICATORS
   ============================================================================= */

.progress-indicator-container {
  position: absolute;
  top: 15px;
  width: 90%;
  height: 10px;
  display: flex;
  justify-content: space-between;
  flex-shrink: 0;
}

.progress-indicator {
  background-color: var(--secondary-input-background);
  width: auto;
  min-width: 56px;
  height: 10px;
  border-radius: 5px;
  max-width: 65px;
}

.progress-indicator-active {
  background-color: var(--primary-text-color);
}
```

with:

```css
/* =============================================================================
   STEPPER
   ============================================================================= */

.stepper {
  width: 90%;
}

.stepper-bars {
  display: flex;
  gap: var(--space-1);
}

.stepper-bar {
  flex: 1;
  min-width: 0;
  height: 4px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background-color: var(--secondary-input-background);
  cursor: default;
}

.stepper-bar-done {
  background-color: var(--accent-color);
  cursor: pointer;
}

.stepper-bar-done:hover {
  opacity: 0.8;
}

.stepper-bar-done:disabled {
  cursor: default;
  opacity: 1;
}

.stepper-bar-current {
  background-color: var(--primary-text-color);
}

.stepper-caption {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: var(--space-1);
  font-size: 12px;
  color: var(--secondary-text-color);
}

.stepper-caption b {
  color: var(--primary-text-color);
  font-weight: 600;
}
```

(`stepper-bar-done:disabled` covers the "disabled while the backend is working" case, so a done segment doesn't look clickable when it temporarily isn't.) All colours are the existing theme-aware custom properties already defined per-theme (`--accent-color`, `--primary-text-color`, `--secondary-text-color`, `--secondary-input-background`), so this needs no separate dark/light/dracula rules.

- [ ] **Step 6: Manual check-in**

If running the actual Electron app is available in this environment: step through Video Range → Pixel Size → Cross Sections → Processing → Results → Report and confirm at each: the caption names the current step and shows "Step N of 6"; every step but Report shows "Next: <name>"; a UAV project shows "Pixel Size" while an Oblique/Ipcam project shows "Control Points" at that step; only bars before the current one are highlighted as done and clickable; clicking a multi-step-back done bar (e.g. from Results, click Video Range) lands on that screen and applies the expected resets (Cross Sections' active section back to the first one; re-entering Processing later shows "see all" stations); the bar is unclickable while the backend is working (e.g. mid-Analize). If this environment cannot run the actual app (same Electron-only limitation every prior phase's plan has hit), flag this step as owed rather than claiming it done.

- [ ] **Step 7: Run the full suite and verify no regression**

Run: `npx jest`, `npx tsc --noEmit`, `npm run lint`
Expected: 45 suites / 479 tests passing (no new automated tests in this task — `Stepper.tsx` itself is a React component and isn't unit-tested per this codebase's Jest setup), same 64 `tsc` errors, same 20 lint problems.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Replace Progress with a labelled, clickable Stepper"
```

---

## Task 4: Processing's `extraFields` moves into `dataSlice`

**Files:**
- Modify: `src/store/data/types.ts`
- Modify: `src/store/data/dataSlice.ts`
- Create: `src/store/data/dataSlice.test.ts`
- Modify: `src/hooks/useDataSlice.ts`
- Modify: `src/pages/Processing.tsx`

**Interfaces:**
- Produces: `Processing.extraFields: boolean` (default `false`); action `toggleProcessingExtraFields`; hook method `onToggleProcessingExtraFields(): void` (toggles in place, no payload — matches `LockBtn`'s existing call pattern of invoking `setLocalExtraFields` with or without an argument).

- [ ] **Step 1: Add `extraFields` to the `Processing` type**

In `src/store/data/types.ts`, add it to the `Processing` interface:

```ts
interface Processing {
  form: FormProcessing;
  parImages: string[];
  maskPath: string;
  bbox?: number[];
  masks: Point[][];
  activeMaskIndex: number | null;
  /** Indices of masks that are currently visible as static overlays */
  visibleMaskIndices: number[];
  /** "Advanced settings" expanded state for this screen's footer toggle.
   *  Lives here (not component state) so it survives navigating away and
   *  back, matching Cross Sections/UAV/Oblique's own extraFields. */
  extraFields: boolean;
}
```

- [ ] **Step 2: Write the failing reducer tests**

Create `src/store/data/dataSlice.test.ts`:

```ts
import reducer, { toggleProcessingExtraFields, setDefaultDataState } from './dataSlice';
import { DataState } from './types';

const baseState = (overrides: Partial<DataState> = {}): DataState =>
  ({
    processing: {
      form: {} as DataState['processing']['form'],
      parImages: [],
      maskPath: '',
      masks: [],
      activeMaskIndex: null,
      visibleMaskIndices: [],
      extraFields: false,
    },
    images: { paths: [], active: 0 },
    quiver: null,
    fullQuiver: null,
    isBackendWorking: false,
    isDataLoaded: false,
    hasChanged: false,
    colorbarLimits: { min: null, max: null, default: true },
    ...overrides,
  }) as DataState;

describe('toggleProcessingExtraFields', () => {
  it('turns advanced mode on from false', () => {
    const state = reducer(baseState(), toggleProcessingExtraFields());
    expect(state.processing.extraFields).toBe(true);
  });

  it('turns advanced mode off from true', () => {
    const state = baseState({
      processing: { ...baseState().processing, extraFields: true },
    });
    expect(reducer(state, toggleProcessingExtraFields()).processing.extraFields).toBe(false);
  });

  it('does not touch any other processing field', () => {
    const state = baseState({
      processing: { ...baseState().processing, maskPath: 'foo.png', extraFields: false },
    });
    const next = reducer(state, toggleProcessingExtraFields());
    expect(next.processing.maskPath).toBe('foo.png');
  });
});

describe('setDefaultDataState', () => {
  it('resets extraFields to false along with the rest of processing', () => {
    const state = baseState({
      processing: { ...baseState().processing, extraFields: true },
    });
    expect(reducer(state, setDefaultDataState()).processing.extraFields).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx jest src/store/data/dataSlice.test.ts`
Expected: FAIL — `toggleProcessingExtraFields` is not exported yet, and `defaultProcessing` has no `extraFields` field so the type doesn't compile.

- [ ] **Step 4: Implement the reducer and default state**

In `src/store/data/dataSlice.ts`, add `extraFields: false,` to `defaultProcessing`:

```ts
const defaultProcessing = {
  form: defaultFormProcessing,
  parImages: ['', '1', '', '2'],
  maskPath: '',
  masks: [],
  activeMaskIndex: null,
  visibleMaskIndices: [] as number[],
  extraFields: false,
};
```

Add a new reducer next to `setBackendWorking`:

```ts
    toggleProcessingExtraFields: (state) => {
      state.processing.extraFields = !state.processing.extraFields;
    },
```

Add `toggleProcessingExtraFields,` to the `export const { ... } = dataSlice.actions;` block.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/store/data/dataSlice.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Wire the hook method**

In `src/hooks/useDataSlice.ts`, add `toggleProcessingExtraFields` to the import from `'../store/data/dataSlice'`:

```ts
import {
  updateProcessingPar,
  setActiveImage,
  updateProcessingForm,
  setBackendWorking,
  setQuiver,
  setProcessingMask,
  setDataLoaded,
  setImages,
  setDefaultDataState,
  addMask,
  deleteMask,
  updateMask,
  setColorbarLimits,
  toggleMaskVisibility,
  toggleProcessingExtraFields,
} from '../store/data/dataSlice';
```

Add a method next to `onUpdateProcessing`:

```ts
  const onToggleProcessingExtraFields = () => {
    dispatch(toggleProcessingExtraFields());
  };
```

Add `onToggleProcessingExtraFields,` to the hook's returned `METHODS` list.

- [ ] **Step 7: Wire `Processing.tsx` to the Redux flag instead of local state**

In `src/pages/Processing.tsx`, replace:

```ts
  const { images, fullQuiver, isBackendWorking, onSetActiveImage, onLoadResultData } = useDataSlice();
  const [showMedian, setShowMedian] = useState(fullQuiver !== null);
  const [extraFields, setExtraFields] = useState(false);
```

with:

```ts
  const { images, fullQuiver, isBackendWorking, onSetActiveImage, onLoadResultData, processing, onToggleProcessingExtraFields } =
    useDataSlice();
  const { extraFields } = processing;
  const [showMedian, setShowMedian] = useState(fullQuiver !== null);
```

Replace the `LockBtn`'s prop:

```tsx
          <LockBtn
            setLocalExtraFields={setExtraFields}
            localExtraFields={extraFields}
```

with:

```tsx
          <LockBtn
            setLocalExtraFields={onToggleProcessingExtraFields}
            localExtraFields={extraFields}
```

- [ ] **Step 8: Manual check-in**

If running the actual Electron app is available: open Processing, turn advanced settings on, navigate to Results and back to Processing — advanced settings should still be on (it previously reset to off). Start a brand-new project — Processing's advanced settings should start off.

- [ ] **Step 9: Run the full suite and verify no regression**

Run: `npx jest`, `npx tsc --noEmit`, `npm run lint`
Expected: 46 suites / 483 tests passing (479 + 4 new), same 64 `tsc` errors, same 20 lint problems.

- [ ] **Step 10: Commit**

```bash
git add src/store/data/types.ts src/store/data/dataSlice.ts src/store/data/dataSlice.test.ts src/hooks/useDataSlice.ts src/pages/Processing.tsx
git commit -m "Persist Processing's advanced-settings toggle in Redux instead of local state"
```

---

## Task 5: Video Range's `extraFields` moves into `projectSlice`

**Files:**
- Modify: `src/store/project/types.ts`
- Modify: `src/store/project/projectSlice.ts`
- Create: `src/store/project/projectSlice.test.ts`
- Modify: `src/hooks/useProjectSlice.ts`
- Modify: `src/pages/VideoRange.tsx`

**Interfaces:**
- Produces: `Video.extraFields: boolean` (default `false`); action `toggleVideoExtraFields`; hook method `onToggleVideoExtraFields(): void` (same shape as Task 4's `onToggleProcessingExtraFields`).

- [ ] **Step 1: Add `extraFields` to the `Video` type**

In `src/store/project/types.ts`, add it to the `Video` interface:

```ts
interface Video {
  data: VideoData;
  parameters: VideoParameters;
  /** "Advanced settings" expanded state for Video Range's footer toggle.
   *  Lives here (not component state) so it survives navigating away and
   *  back, matching Cross Sections/UAV/Oblique's own extraFields. */
  extraFields: boolean;
}
```

- [ ] **Step 2: Write the failing reducer tests**

Create `src/store/project/projectSlice.test.ts`:

```ts
import reducer, { toggleVideoExtraFields, setDefaultProjectState } from './projectSlice';
import { ProjectState } from './types';

const baseState = (overrides: Partial<ProjectState> = {}): ProjectState =>
  ({
    projectDirectory: '',
    video: {
      data: {
        name: '',
        path: '',
        width: 0,
        height: 0,
        fps: 0,
        duration: 0,
        creation: '',
      },
      parameters: {
        step: 1,
        startTime: 0,
        endTime: 0,
        startFrame: 0,
        endFrame: 0,
        factor: 1,
        lensCorrection: null,
        stabilization: false,
        stabilizationRegions: [],
        committedFactor: 1,
        committedLensCorrection: null,
        committedStabilization: false,
        committedStabilizationRegions: [],
      },
      extraFields: false,
    },
    type: '',
    firstFramePath: '',
    projectDetails: { riverName: '', site: '', unitSistem: 'si', meditionDate: '' },
    stabilizationActiveRegionIndex: null,
    ...overrides,
  }) as ProjectState;

describe('toggleVideoExtraFields', () => {
  it('turns advanced mode on from false', () => {
    const state = reducer(baseState(), toggleVideoExtraFields());
    expect(state.video.extraFields).toBe(true);
  });

  it('turns advanced mode off from true', () => {
    const state = baseState({ video: { ...baseState().video, extraFields: true } });
    expect(reducer(state, toggleVideoExtraFields()).video.extraFields).toBe(false);
  });

  it('does not touch any other video field', () => {
    const state = baseState({
      video: { ...baseState().video, data: { ...baseState().video.data, name: 'clip.mp4' } },
    });
    const next = reducer(state, toggleVideoExtraFields());
    expect(next.video.data.name).toBe('clip.mp4');
  });
});

describe('setDefaultProjectState', () => {
  it('resets extraFields to false along with the rest of video', () => {
    const state = baseState({ video: { ...baseState().video, extraFields: true } });
    expect(reducer(state, setDefaultProjectState()).video.extraFields).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx jest src/store/project/projectSlice.test.ts`
Expected: FAIL — `toggleVideoExtraFields` is not exported yet.

- [ ] **Step 4: Implement the reducer and default state**

In `src/store/project/projectSlice.ts`, add `extraFields: false,` to `defaultVideo`:

```ts
const defaultVideo = {
  data: {
    name: '',
    path: '',
    width: 0,
    height: 0,
    fps: 0,
    duration: 0,
    creation: '',
  },
  parameters: {
    step: 1,
    startTime: 0,
    endTime: 0,
    startFrame: 0,
    endFrame: 0,
    factor: 1,
    lensCorrection: null,
    stabilization: false,
    stabilizationRegions: [],
    committedFactor: 1,
    committedLensCorrection: null,
    committedStabilization: false,
    committedStabilizationRegions: [],
  },
  extraFields: false,
};
```

Add a new reducer next to `setStabilizationActiveRegionIndex`:

```ts
    toggleVideoExtraFields: (state) => {
      state.video.extraFields = !state.video.extraFields;
    },
```

Add `toggleVideoExtraFields,` to the `export const { ... } = projectSlice.actions;` block.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/store/project/projectSlice.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Wire the hook method**

In `src/hooks/useProjectSlice.ts`, add `toggleVideoExtraFields` to the import from `'../store/project/projectSlice'`:

```ts
import {
  setProjectDirectory,
  setProjectType,
  setVideoData,
  setFirstFramePath,
  setVideoParameters,
  setProjectDetails,
  setDefaultProjectState,
  setStabilizationActiveRegionIndex,
  toggleVideoExtraFields,
} from '../store/project/projectSlice';
```

Add a method next to `onSetStabilizationActiveRegionIndex`:

```ts
  const onToggleVideoExtraFields = () => {
    dispatch(toggleVideoExtraFields());
  };
```

Add `onToggleVideoExtraFields,` to the hook's returned `METHODS` list.

- [ ] **Step 7: Wire `VideoRange.tsx` to the Redux flag instead of local state**

In `src/pages/VideoRange.tsx`, remove the now-unused import:

```ts
import { useState } from 'react';
```

Replace:

```ts
  const {
    video,
    type,
    stabilizationActiveRegionIndex,
    onUpdateStabilizationRegion,
    onSetStabilizationActiveRegionIndex,
  } = useProjectSlice();
  const { path, duration, width: videoWidth, height: videoHeight } = video.data;
  const { stabilization, stabilizationRegions } = video.parameters;
  const { t } = useTranslation();
  const [extraFields, setExtraFields] = useState(false);
```

with:

```ts
  const {
    video,
    type,
    stabilizationActiveRegionIndex,
    onUpdateStabilizationRegion,
    onSetStabilizationActiveRegionIndex,
    onToggleVideoExtraFields,
  } = useProjectSlice();
  const { path, duration, width: videoWidth, height: videoHeight } = video.data;
  const { stabilization, stabilizationRegions } = video.parameters;
  const { extraFields } = video;
  const { t } = useTranslation();
```

Replace the `LockBtn`'s prop:

```tsx
          <LockBtn
            localExtraFields={extraFields}
            setLocalExtraFields={setExtraFields}
```

with:

```tsx
          <LockBtn
            localExtraFields={extraFields}
            setLocalExtraFields={onToggleVideoExtraFields}
```

- [ ] **Step 8: Manual check-in**

If running the actual Electron app is available: open Video Range, turn advanced settings on, navigate forward and back — advanced settings should still be on (it previously reset to off). Start a brand-new project — Video Range's advanced settings should start off.

- [ ] **Step 9: Run the full suite and verify no regression**

Run: `npx jest`, `npx tsc --noEmit`, `npm run lint`
Expected: 47 suites / 487 tests passing (483 + 4 new), same 64 `tsc` errors, same 20 lint problems.

- [ ] **Step 10: Commit**

```bash
git add src/store/project/types.ts src/store/project/projectSlice.ts src/store/project/projectSlice.test.ts src/hooks/useProjectSlice.ts src/pages/VideoRange.tsx
git commit -m "Persist Video Range's advanced-settings toggle in Redux instead of local state"
```

---

## Task 6: Labelled "Advanced settings" switch, and delete the dead `ButtonLock.tsx`

**Files:**
- Modify: `src/components/CustomIcons/LockBtn.tsx`
- Modify: `src/components/Forms/form.css`
- Delete: `src/components/ButtonLock.tsx`

**Interfaces:**
- No new interfaces — `LockBtn`'s props (`localExtraFields`, `setLocalExtraFields`, `footerElementID`, `headerElementID`, `disabled`) are unchanged; only its rendered JSX changes. All 5 call sites (Video Range, UAV, Oblique, Cross Sections, Processing) need no changes.

- [ ] **Step 1: Confirm `ButtonLock.tsx` is genuinely unused**

Run: `grep -rn "ButtonLock" src --include="*.tsx" --include="*.ts"`
Expected: only `src/components/ButtonLock.tsx`'s own definition — no import anywhere else. (Already confirmed during spec research; re-confirm here in case something changed since.)

- [ ] **Step 2: Delete it**

```bash
git rm src/components/ButtonLock.tsx
```

- [ ] **Step 3: Rewrite `LockBtn.tsx`'s render — `handleOnChange`'s logic is untouched**

Replace the full contents of `src/components/CustomIcons/LockBtn.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { Icons } from './Icons';
import { useSectionSlice } from '../../hooks';
import { useWizard } from 'react-use-wizard';
import { MODULE_NUMBER } from '../../constants/constants';

interface LockButtonProps {
  localExtraFields?: boolean;
  setLocalExtraFields?: any;
  footerElementID: string;
  headerElementID: string;
  disabled: boolean;
}

export function LockBtn({
  localExtraFields,
  setLocalExtraFields,
  footerElementID,
  headerElementID,
  disabled,
}: LockButtonProps) {
  const { onSetExtraFields, sections, activeSection } = useSectionSlice();
  const { extraFields, name } = sections[activeSection];
  const { activeStep } = useWizard();
  const { t } = useTranslation();

  const checked = localExtraFields !== undefined ? localExtraFields : extraFields;

  const handleOnChange = () => {
    switch (activeStep) {
      case MODULE_NUMBER.CROSS_SECTIONS:
        if (extraFields) {
          const header = name + '-' + headerElementID;
          const headerElement = document.getElementById(header);
          headerElement?.scrollIntoView({ behavior: 'smooth' });
        } else {
          const footer = name + '-' + footerElementID;

          const footerElement = document.getElementById(footer);
          setTimeout(() => {
            footerElement?.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }
        onSetExtraFields();
        break;

      case MODULE_NUMBER.PIXEL_SIZE:
        if (extraFields) {
          const headerElement = document.getElementById(headerElementID);
          headerElement?.scrollIntoView({ behavior: 'smooth' });
        } else {
          const footerElement = document.getElementById(footerElementID);
          setTimeout(() => {
            footerElement?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
        setLocalExtraFields();
        break;

      case MODULE_NUMBER.VIDEO_RANGE:
        if (extraFields) {
          const headerElement = document.getElementById(headerElementID);
          headerElement?.scrollIntoView({ behavior: 'smooth' });
        } else {
          const footerElement = document.getElementById(footerElementID);
          setTimeout(() => {
            footerElement?.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }
        setLocalExtraFields(!localExtraFields);
        break;

      case MODULE_NUMBER.PROCESSING:
        if (localExtraFields) {
          const headerElement = document.getElementById(headerElementID);
          headerElement?.scrollIntoView({ behavior: 'smooth' });
        } else {
          const footerElement = document.getElementById(footerElementID);
          setTimeout(() => {
            footerElement?.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }
        setLocalExtraFields(!localExtraFields);
        break;

      default:
        if (localExtraFields) {
          const headerElement = document.getElementById(headerElementID);
          headerElement?.scrollIntoView({ behavior: 'smooth' });
        } else {
          const footerElement = document.getElementById(footerElementID);
          setTimeout(() => {
            footerElement?.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }
        setLocalExtraFields(!localExtraFields);
        break;
    }
  };

  return (
    <div className="switch-container advanced-mode-toggle">
      <span className="advanced-mode-label">
        {Icons.Lock('currentColor')}
        {t('Commons.advancedSettings', { defaultValue: 'Advanced settings' })}
      </span>
      <label className="switch">
        <input type="checkbox" checked={checked} onChange={handleOnChange} disabled={disabled} />
        <span className="slider"></span>
      </label>
    </div>
  );
}
```

Everything inside `handleOnChange` is byte-for-byte identical to before — only the `useState`/`useEffect`/`useRipple`-driven padlock-icon render (and the now-unused `locked`/`shakeKey`/`rpl`/`fire` machinery) is gone, replaced by the app's standard labelled switch, with `checked` computed directly from the same values the old `locked` state was synced from.

- [ ] **Step 4: Add the label's CSS**

In `src/components/Forms/form.css`, add next to `.switch-container`:

```css
.advanced-mode-toggle {
    width: 90%;
    align-self: center;
}

.advanced-mode-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--secondary-text-color);
}
```

(`.advanced-mode-toggle`'s `width: 90%; align-self: center;` matches `.wizard-container`'s own sizing in `components.css`, so the label-left/switch-right row spans the same width as the Back/Next buttons below it in every screen's footer.)

- [ ] **Step 5: Manual check-in**

If running the actual Electron app is available: on each of the 5 screens (Video Range, UAV, Oblique, Cross Sections, Processing), confirm the footer now shows a lock icon + "Advanced settings" label + toggle switch (not the old padlock icon button), that toggling it still shows/hides the same advanced fields as before, and that it still scrolls to the same header/footer element it did before. Confirm in all three themes (dark/light/dracula) that the label text and icon are legible against `.switch-container`'s hover background.

- [ ] **Step 6: Run the full suite and verify no regression**

Run: `npx jest`, `npx tsc --noEmit`, `npm run lint`
Expected: 47 suites / 487 tests passing (no new automated tests — this task only changes JSX/CSS), same 64 `tsc` errors, same 20 lint problems.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Give the advanced-settings toggle a text label; delete dead ButtonLock"
```

---

## Task 7: Final full-branch review and verification

**Files:** none new — this task re-reads everything Tasks 1–6 touched as a whole, the same way every prior phase's final review caught cross-task issues no task-scoped review could see. Fix findings inline; re-run verification after each fix.

- [ ] **Step 1: Run the full suite and record counts**

Run: `npx jest`, `npx tsc --noEmit`, `npm run lint`
Expected: 20 new tests over the plan's starting baseline (4 from Task 1's `getStepLeaveEffect` + 8 from Task 2's `buildStepperContent` + 4 from Task 4's `toggleProcessingExtraFields`/`setDefaultDataState` + 4 from Task 5's `toggleVideoExtraFields`/`setDefaultProjectState` — e.g. 467 + 20 = 487 if the branch was still at 467 when this plan started; confirm against whatever `npx jest` actually reported at the start of Task 1, since the branch may have moved since this plan was written). `tsc`/lint counts unchanged from the plan's Global Constraints baseline. Investigate and fix any drift before proceeding.

- [ ] **Step 2: Cross-task read-through**

Re-read, in one pass: `stepLeaveEffects.ts`/`WizzardButtons.tsx` (Task 1), `stepperContent.ts`/`Stepper.tsx`/`FormHeader.tsx` (Tasks 2–3), `dataSlice.ts`/`useDataSlice.ts`/`Processing.tsx` (Task 4), `projectSlice.ts`/`useProjectSlice.ts`/`VideoRange.tsx` (Task 5), `LockBtn.tsx` (Task 6). Specifically check: that `Stepper`'s `handleJumpToStep` loop direction is correct (`for (let step = activeStep; step > target; step--)` — off-by-one here would silently skip or double-apply a reset); that neither `Processing.tsx` nor `VideoRange.tsx` has a second, stale reference to the old `useState` setter anywhere (e.g. in a `useEffect` dependency array or a prop passed further down); that `LockBtn`'s `checked` computation (`localExtraFields !== undefined ? localExtraFields : extraFields`) is not accidentally inverted anywhere relative to the old `locked`-based logic (the sense flipped deliberately from "is locked" to "is advanced mode on" — confirm every one of the 5 call sites still shows the switch in the correct on/off position for its current state); that `defaultProcessing`/`defaultVideo` being module-level constants reused by reference on reset (`state.processing = defaultProcessing`, `state.video = defaultVideo`) still behaves correctly with the new `extraFields` field (this is the pre-existing reset pattern, unchanged by this plan, but confirm it wasn't broken).

- [ ] **Step 3: Full three-theme manual walkthrough**

Note (matching every prior phase's own final task): this environment cannot run the actual Electron shell (the renderer crashes outside Electron's preload bridge). If this plan is executed somewhere that can run the real desktop app, do the walkthrough here — dark, light, and dracula — covering: the step bar's caption and clickable-done-segments behaviour on every one of the 6 steps, including a UAV project and an Oblique or Ipcam project (to see both Pixel-Size-step names); a multi-step backward jump from Results to Video Range, confirming Cross Sections' active section and Processing's "see all" state both come back correctly when you later revisit those screens; the labelled advanced-settings switch's legibility and behaviour on all 5 screens. If this environment cannot run it, explicitly flag to the user that this step is owed, exactly as every prior phase's plan did — do not claim it as done.

- [ ] **Step 4: Fix wave**

Fix anything Step 2 or Step 3 surfaced, inline, then re-run Step 1's full verification. Repeat until clean.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "Phase 4d final review: fix wave"
```

(Skip this commit if Step 4 found nothing to fix.)
