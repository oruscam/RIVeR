# UI Design Refresh Phase 4d — Step progress and advanced-mode persistence

## 1. Problem

**Spec:** RIVeR Design Audit artifact — https://claude.ai/code/artifact/02bcbe1c-e016-4d2e-9b66-d1bc80f31dcb
(§ Rollout, Phase 4: *"Also labelled step progress and one way of storing
advanced mode."*). This is the last unclaimed slice of Phase 4 (4a
messages/toasts, 4b canvas overlays, 4c Results panel are done).

Two of the audit's findings, both verified directly against `river-labs` /
`ui/design-refresh` code, not just the audit's own (possibly stale)
references:

1. **"The step bar doesn't show where you are"** (High). `Progress.tsx`
   draws `stepCount - 2` unlabelled `<div>` dashes and nothing else — no
   step name, no "N of M", and they aren't clickable. The audit's fix
   mockup: a labelled caption ("**Processing** · Step 4 of 6 / Next:
   Results") with completed segments clickable.
2. **"Advanced mode is an unlabelled padlock"** (Medium). The same
   `LockBtn.tsx` icon-only padlock toggle is used on all 5 form screens, but
   it's wired to two different storage mechanisms: Cross Sections, UAV and
   Oblique read/write `extraFields` on their own Redux slice (persists
   across navigation); Video Range and Processing hold it in a local
   `useState` (silently resets to collapsed every time you leave and come
   back). The audit's fix: a labelled "Advanced settings" switch, stored the
   same way on every screen.

A third thing found during exploration, not in the audit text: `src/
components/ButtonLock.tsx` is a byte-for-byte-logic duplicate of `LockBtn.tsx`
(same switch-statement scroll behaviour, an older checkbox-based visual) that
is never imported anywhere. Dead code, safe to delete alongside this phase.

## 2. Goals

- The step bar shows, at all times, which of the 6 user-facing steps
  (Video Range, Pixel Size/Control Points, Cross Sections, Processing,
  Results, Report) you're on, by name, plus "Step N of 6" and (except on the
  last step) what's next.
- Any already-completed step's segment is clickable and jumps the wizard
  straight there — including from more than one step away — without
  skipping any of the per-step reset logic that today only runs when
  stepping back one step at a time via the Back button.
- Video Range's and Processing's "advanced settings" toggle survives
  leaving and returning to that screen, matching the other three screens.
- The toggle carries a visible text label ("Advanced settings") on all 5
  screens, not just an icon.
- `ButtonLock.tsx` is deleted.

## 3. Non-goals / deferred

- No change to *what* becomes visible when advanced mode is on, on any
  screen — this phase only fixes where the on/off flag lives and how it's
  labelled.
- No forward-jumping. Only strictly-completed steps (module number less
  than the current `activeStep`) are ever clickable; the current step and
  any step after it are not, matching the audit's mockup ("completed
  segments can be clicked") and avoiding the need to re-validate a step's
  `canFollow` gate out of order.
- No change to `WizardButtons`' existing single-step Back button behaviour
  or its `canFollow` gating on Next — the reset logic it already runs is
  being extracted for reuse, not changed.
- Video Range's `onSetDefaultProjectState()` reset (today tied to leaving
  Video Range backward towards Footage Mode) is out of the step bar's
  reachable range entirely — the bar's earliest target is Video Range
  itself, so leaving it backward is never triggered by a bar click. No
  special-casing needed; noted here so it isn't mistaken for a missed case
  during implementation.

## 4. Current architecture (verified against `ui/design-refresh` tip `6b118f1`)

```
App.tsx (Wizard, react-use-wizard)
 0 HomePage            1 FootageMode
 2 VideoRange   ─┐
 3 Uav/Oblique/Ipcam │  FormHeader → Progress.tsx (shown for steps 2..7)
 4 CrossSections │
 5 Processing    │      MODULE_NUMBER = { VIDEO_RANGE:2, PIXEL_SIZE:3,
 6 Results       │        CROSS_SECTIONS:4, PROCESSING:5, RESULTS:6, REPORT:7 }
 7 Report       ─┘

Progress.tsx            draws stepCount-2 (=6) unlabelled bars, marks
                         index <= activeStep-2 as "active" — no click, no text

WizardButtons.tsx        Back button → handlePreviuos(), a switch on
                         `activeStep` (the step being LEFT):
                           CROSS_SECTIONS  → onSetActiveSection(0)
                           PROCESSING      → onSetSeeAll(true)
                           VIDEO_RANGE     → onSetDefaultProjectState()
                           (default)       → nothing extra
                         then previousStep() exactly once, every time.

LockBtn.tsx (icon-only)  used by all 5 screens (VideoRange, Uav, Oblique,
                         CrossSections, Processing). Its own switch on
                         `activeStep` decides which header/footer element
                         to scroll to, then toggles the flag:
                           CROSS_SECTIONS → onSetExtraFields()        [Redux: sectionSlice, PERSISTS]
                           PIXEL_SIZE     → setLocalExtraFields()     [Redux: uavSlice/obliqueSlice, PERSISTS]
                           VIDEO_RANGE    → setLocalExtraFields(!x)   [local useState, RESETS]
                           PROCESSING     → setLocalExtraFields(!x)   [local useState, RESETS]

ButtonLock.tsx           unused duplicate of LockBtn.tsx (checkbox visual,
                         identical switch-statement body). Not imported.
```

## 5. Design

### 5.1 Shared step-leave reset registry

Extract `WizardButtons.handlePreviuos`'s switch body into a small pure
lookup, e.g. `getStepLeaveEffect(moduleNumber): (() => void) | undefined`
(new file, e.g. `src/helpers/stepLeaveEffects.ts`, or a small hook next to
`WizardButtons.tsx` — final placement decided at plan-writing time), built
from the same three cases (`CROSS_SECTIONS`, `PROCESSING`, `VIDEO_RANGE`)
using the same hook calls (`onSetActiveSection`, `onSetSeeAll`,
`onSetDefaultProjectState`). `WizardButtons`'s Back button calls it for the
single step it's leaving, exactly as today — pure refactor, no behaviour
change there. This registry is what makes the multi-step jump in §5.2 safe:
it is the single place that knows what must happen when a given step is
left backward, so a jump of N steps applies it N times instead of relying on
new, separately-written logic that could drift from the Back button's.

### 5.2 `Stepper` component (replaces `Progress.tsx`)

- Reads `activeStep`, `stepCount`, `goToStep` from `useWizard()`, `type`
  from `useProjectSlice()` (to name the Pixel-Size step), and
  `isBackendWorking` from `useDataSlice()` (to disable jumping mid-run,
  matching the Back button's own guard).
- A `STEP_LABELS` list of the 6 module numbers in order, each with a
  translation key; the Pixel-Size entry resolves to `PixelSize.title` when
  `type === FOOTAGE_TYPES.UAV` and `ControlPoints.title` otherwise (Oblique
  and Ipcam both already use `ControlPoints.title` for their own
  `FormHeader`).
- Renders 6 segments as real `<button>` elements (native keyboard/focus
  support, no extra ARIA plumbing needed) in a row, each showing a
  done/current/upcoming visual state, by module number: done when
  `moduleNumber < activeStep`, current when `moduleNumber === activeStep`,
  upcoming otherwise. (Together, done + current is exactly the set
  `Progress.tsx` today marks "active" via `index <= activeStep - 2` on its
  0-based bar index — this just splits that set into two visual states.)
  Only `done` segments are enabled; `current`/`upcoming` are rendered
  disabled (not just visually — a disabled `<button>` isn't a click target).
- A caption row below/alongside the bars: `"<current step's label> · Step
  <n> of 6"`, and, unless the current step is Report (module 7, the last of
  the 6), a second `"Next: <next step's label>"`.
- `onClick` on a `done` segment calls a new `onJumpToStep(target:
  MODULE_NUMBER)`: walks module numbers from `activeStep` down to, but
  excluding, `target` (i.e. `target + 1` through `activeStep` inclusive),
  calling `getStepLeaveEffect` (§5.1) for each and invoking it if defined,
  then calls `goToStep(target)` once. This applies
  every reset a sequence of single Back-clicks from `activeStep` down to
  `target` would have applied, in the same order, before making the single
  jump — so, e.g., jumping from Results straight to Video Range still resets
  `activeSection` to 0 and forces `seeAll` true, even though the user never
  visits Cross Sections or Processing on the way.
- `FormHeader.tsx` swaps `<Progress />` for `<Stepper />` (same
  `showProgress` gate, same call sites — no page-level changes needed
  beyond the import).

### 5.3 Advanced-mode persistence

- `store/data/types.ts`'s `Processing` interface gains `extraFields:
  boolean` (default `false` in the slice's initial state, alongside the
  other `Processing` defaults). `useDataSlice.ts` gains
  `onToggleProcessingExtraFields()`, mirroring the existing
  `onSetExtraFields`/`onChangeExtraFields` reducers on the other three
  slices (toggle-in-place, no payload).
- `store/project/types.ts`'s `Video` interface gains `extraFields: boolean`
  (default `false`). `useProjectSlice.ts` gains `onToggleVideoExtraFields()`,
  same shape.
- `Processing.tsx` and `VideoRange.tsx` drop their `useState<boolean>` and
  read/write the new Redux fields instead; `LockBtn`'s existing
  `localExtraFields`/`setLocalExtraFields` props are passed the Redux value
  and the new toggle action in place of the local state and setter — no
  change to `LockBtn`'s own switch-on-`activeStep` scroll logic, since it
  already treats `localExtraFields`/`setLocalExtraFields` as opaque.
- Cross Sections, UAV and Oblique are untouched — they already persist
  correctly.

### 5.4 Labelled toggle

- `LockBtn.tsx`'s rendered markup changes from the standalone animated
  padlock icon button to the app's existing `.switch-container` pattern
  (already used throughout `HardModeProcessing.tsx`, `StabilizationRegions.
  tsx`, `LensCorrection.tsx`, etc.): a small lock/unlock icon, the text
  label "Advanced settings" via `t(key, { defaultValue: 'Advanced
  settings' })` — no locale JSON files are edited, matching every prior
  phase on this branch (4a/4b/4c all introduced new copy this way,
  deferring the actual translation entries to the translation team) — and
  the standard `.switch`/`<input type="checkbox">` toggle. The
  `toggle`/`handleOnChange` logic (which
  element to scroll to, which setter to call) is unchanged — only the JSX
  it returns changes.
- This is one component edit that covers all 5 screens.
- Delete `src/components/ButtonLock.tsx` (confirmed unused via
  project-wide search).

## 6. Testing

- `getStepLeaveEffect` (§5.1): unit tests for each of the three special-
  cased module numbers plus the default (no-op) case — pure enough to test
  by spying on the injected hook actions.
- `Stepper`: unit/component tests for done/current/upcoming classification
  at each `activeStep`, the caption text (including the UAV-vs-Oblique
  Pixel-Size name and the no-"Next" case on Report), that upcoming/current
  segments are disabled, and that clicking a multi-step-away `done` segment
  invokes every intermediate reset in order before the single `goToStep`
  call.
- Reducer tests for `onToggleProcessingExtraFields` and
  `onToggleVideoExtraFields`, mirroring the existing tests (if any) for
  `onSetExtraFields`/`onChangeExtraFields`.
- A regression test that `Processing`'s and `VideoRange`'s `extraFields`
  survive an unmount/remount of the page component (simulating navigating
  away and back) by asserting the value lives in the store, not component
  state.
- Full `npx jest` run with no new failures against the current baseline (45
  suites / 467 tests passing, 64 pre-existing `tsc` errors, 20 lint problems
  — confirmed at this spec's writing time from the `ui/design-refresh`
  worktree tip `6b118f1`).

## 7. Decisions already made (not open questions for the plan)

- Step-bar navigation is implemented as real multi-step jumping (replaying
  every applicable reset), not deferred to a label-only fix.
- Video Range's and Processing's advanced-mode flag moves into each
  screen's own existing Redux slice (`Processing`/`Video`), not into a new
  shared `uiSlice` map — Cross Sections/UAV/Oblique are not touched or
  migrated.
- `ButtonLock.tsx` is deleted as part of this phase.
