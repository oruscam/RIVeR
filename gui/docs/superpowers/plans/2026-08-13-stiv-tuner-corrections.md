# STIV Angle Tuner Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the STIV angle tuner slider-only, strip the readouts that duplicate the STI badge, move the 85–95° warning into the badge without recolouring anything, reposition "Reset all angles", and guarantee a manually-set angle survives **Next** into Results.

**Architecture:** Four independent slices of an existing feature. Task 1 is a pure helper + tests (the slider's 90° crossing). Task 2 is the tuner component and its CSS. Task 3 is a one-line reorder in a form row. Task 4 is the persistence-flush correctness fix. Nothing new is introduced; this is subtraction plus two targeted repairs.

**Tech Stack:** TypeScript, React 18, Redux Toolkit, Electron IPC, Jest (ts-jest, `testEnvironment: 'node'`).

**Spec:** `gui/docs/superpowers/specs/2026-08-13-stiv-tuner-corrections-design.md`

## Global Constraints

- **Work from `/Users/antoine/river/gui`** unless a step says otherwise.
- **Station ids are 1-based; arrays are 0-indexed.** Station id 9 is index 8.
- **Angle unit is degrees**, storable range `[0.5, 179.5]`, with `clampAngle` additionally excluding the open band `(89.5, 90.5)`.
- **Never store a derived value.** Velocity, sign and σ are computed from the angle at read time.
- **i18n:** `fallbackLng` is `'en'` (`src/translations/i18n.js:20`), so only `src/translations/en/global.json` changes. Do **NOT** edit the other 12 locale files.
- **TYPECHECK — `npx tsc --noEmit -p .` DOES NOT WORK here** (59 `TS6305` errors from an unbuilt project reference). Use `npx tsc --noEmit -p tsconfig.check.json 2>&1 | grep -E "^(src/your/file1|src/your/file2)"` → expect **no output**. The repo carries ~152 pre-existing type errors in other files; ignore them.
- **Lint:** `npm run lint` currently reports ~73 pre-existing errors/5 warnings in files unrelated to this work (`getQuiver.ts`, `ImageWithData.tsx`, `InfoPixelSize.tsx`, `StationSearchLines.tsx`, `stationPositions.test.ts`, `Processing.tsx`, `AllInOne.tsx`). Only your own touched files must be clean: `npx eslint <your files> --max-warnings 0`.
- **Test baseline (measured 2026-08-13):** `npx jest` is **20 suites, 214 tests, all passing**. Any failure you see is yours.
- **Commit messages: no `Co-Authored-By` trailer. Do not push.**

---

### Task 1: Direction-aware slider stepping across 90°

**Files:**
- Modify: `gui/src/helpers/stivAngle.ts`
- Modify: `gui/src/helpers/stivAngle.test.ts`
- Modify: `gui/src/helpers/index.ts`

**Interfaces:**
- Consumes: existing `clampAngle`, `ANGLE_MIN`, `ANGLE_MAX` from `stivAngle.ts`.
- Produces: `nextAngleFromSlider(raw: number, current: number): number`, re-exported from the helpers barrel.

**Why:** `clampAngle` pushes anything inside `(89.5, 90.5)` to the **nearer** edge, which makes both edges fixed points. From 89.5° a `→` press computes 90.0° and snaps back to 89.5°. While drag existed that was a nuisance with a workaround; once the slider is the only input (Task 2) it is a wall across the middle of the range. `clampAngle` stays untouched — it is direction-agnostic by design and still guards every other write path. Only the slider has a meaningful "previous value" to derive direction from.

- [ ] **Step 1: Write the failing test**

Append to `gui/src/helpers/stivAngle.test.ts`, after the existing `describe('clampAngle', ...)` block:

```ts
describe('nextAngleFromSlider', () => {
  it('crosses the singularity band upward instead of snapping back', () => {
    // The exact case that traps the slider: stepping + 0.5 from the low edge.
    expect(nextAngleFromSlider(90, 89.5)).toBe(90.5);
  });

  it('crosses the singularity band downward instead of snapping back', () => {
    expect(nextAngleFromSlider(90, 90.5)).toBe(89.5);
  });

  it('resolves any in-band value by direction of travel, not proximity', () => {
    // 89.6 is nearer the low edge, but the user is moving up.
    expect(nextAngleFromSlider(89.6, 89.5)).toBe(90.5);
    // 90.4 is nearer the high edge, but the user is moving down.
    expect(nextAngleFromSlider(90.4, 90.5)).toBe(89.5);
  });

  it('leaves values outside the band to clampAngle', () => {
    expect(nextAngleFromSlider(45, 60)).toBe(45);
    expect(nextAngleFromSlider(120, 45)).toBe(120);
    expect(nextAngleFromSlider(89.5, 45)).toBe(89.5);
    expect(nextAngleFromSlider(90.5, 120)).toBe(90.5);
  });

  it('still enforces the storable range', () => {
    expect(nextAngleFromSlider(-10, 45)).toBe(ANGLE_MIN);
    expect(nextAngleFromSlider(200, 45)).toBe(ANGLE_MAX);
  });

  it('never returns a value inside the band, from any approach', () => {
    for (const current of [0.5, 45, 89.5, 90.5, 120, 179.5]) {
      for (const raw of [89.6, 89.9, 90, 90.1, 90.4]) {
        const next = nextAngleFromSlider(raw, current);
        expect(next === 89.5 || next === 90.5).toBe(true);
      }
    }
  });
});
```

Add `nextAngleFromSlider` to the existing import list at the top of that test file.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd gui && npx jest src/helpers/stivAngle.test.ts`
Expected: FAIL — `nextAngleFromSlider is not a function` / not exported.

- [ ] **Step 3: Write the implementation**

In `gui/src/helpers/stivAngle.ts`, immediately after the `clampAngle` definition:

```ts
/**
 * The angle a slider move should produce, given where the slider was.
 *
 * clampAngle resolves the 90° band by proximity, which makes both of its edges
 * fixed points: stepping +0.5 from 89.5 lands on 90.0 and comes straight back.
 * That is fine for a drag, which passes through the band on its way somewhere
 * else, and fatal for a slider, which is the only input and steps into it.
 *
 * Here the direction of travel decides instead, so the band is crossed rather
 * than bounced off. Outside the band this is exactly clampAngle.
 */
export const nextAngleFromSlider = (raw: number, current: number): number => {
  if (raw > ANGLE_SINGULARITY_LOW && raw < ANGLE_SINGULARITY_HIGH) {
    return raw > current ? ANGLE_SINGULARITY_HIGH : ANGLE_SINGULARITY_LOW;
  }
  return clampAngle(raw);
};
```

`ANGLE_SINGULARITY_LOW` / `ANGLE_SINGULARITY_HIGH` already exist as module-level
constants in this file (declared just above `clampAngle`) — use them, do not
redeclare or inline the numbers.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd gui && npx jest src/helpers/stivAngle.test.ts`
Expected: PASS, including the pre-existing `clampAngle` tests unchanged.

- [ ] **Step 5: Re-export from the barrel**

In `gui/src/helpers/index.ts`, add `nextAngleFromSlider` to both the existing
`import { ... } from './stivAngle';` list and the `export { ... }` block, keeping
the file's existing case-insensitive alphabetical ordering (it sorts next to
`metersPerSlope` / `setOverride`).

- [ ] **Step 6: Verify, lint and commit**

```bash
cd gui && npx jest
npx tsc --noEmit -p tsconfig.check.json 2>&1 | grep -E "^src/helpers/stivAngle"
npx eslint src/helpers/stivAngle.ts src/helpers/stivAngle.test.ts src/helpers/index.ts --max-warnings 0
```
Expected: 20 suites pass with 6 new tests added; grep prints nothing; eslint clean.

```bash
git add src/helpers/stivAngle.ts src/helpers/stivAngle.test.ts src/helpers/index.ts
git commit -m "Let the slider step across the 90 degree singularity band"
```

---

### Task 2: Slider-only tuner, badge warning, no colour change

**Files:**
- Modify: `gui/src/components/StiAngleTuner.tsx`
- Modify: `gui/src/components/StiViewer.tsx`
- Modify: `gui/src/components/components.css`
- Modify: `gui/src/translations/en/global.json`

**Interfaces:**
- Consumes: `nextAngleFromSlider` (Task 1); existing `useStivAngleOverride`, `isAnglePoorlyConstrained`, `ANGLE_MIN`, `ANGLE_MAX`.
- Produces: `StiAngleTunerProps` loses `velocity` and `isImperial` (the readout that used them is gone). Everything else keeps its current name and type.

This is the largest task. Read `StiAngleTuner.tsx` and `StiViewer.tsx` in full before editing.

- [ ] **Step 1: Strip rotation from the tuner**

In `gui/src/components/StiAngleTuner.tsx`:

- Delete `applyPointer`, `handlePointerDown`, `handlePointerMove`, `handlePointerUp`, `handleKeyDown`, the `rotatingRef` ref and the `isRotating` state, and the now-unused `useRef` / `useState` imports.
- Delete `angleFromPointer` from the `../helpers` import (it stays exported from the helpers module — other code and its own tests still use it; only this consumer goes).
- On the `<svg>`: remove `tabIndex`, all five `onPointer*` / `onKeyDown` props, and the `is-rotating` class expression. Its className becomes the plain string `"sti-overlay sti-angle-overlay"`.
- Delete the two `<circle className="sti-angle-handle" .../>` elements from the bar group.
- Delete the `NUDGE_COARSE` and `NUDGE_FINE` constants.
- Keep `DEFAULT_ANGLE`, `displayAngle`, and the dashed ghost block exactly as they are.

- [ ] **Step 2: Reduce the controls to one row**

Still in `StiAngleTuner.tsx`:

- Delete the `<span className="sti-angle-value">` element and the `displayVelocity` computation that feeds it, plus the now-unused `UNIT_CONVERSIONS` / `UNITS` import.
- Delete the entire `<div className="sti-angle-meta">` block (hint, warning, tuned lines).
- Remove `velocity` and `isImperial` from `StiAngleTunerProps` and from the destructured parameter list.
- Point the slider at Task 1's helper — it needs the previous value to derive direction:

```tsx
onChange={(event) => setAngle(nextAngleFromSlider(parseFloat(event.target.value), displayAngle))}
```

and add `nextAngleFromSlider` to the `../helpers` import.

- Stop the warning colouring anything. `strokeColor` is deleted; every place that
  used it takes `color` directly — the two `<line>` elements' `style={{ stroke: ... }}`
  and the slider's `style={{ accentColor: ... }}`. The `isWarned` computation moves
  out of this component entirely (Step 3), so delete it and the
  `isAnglePoorlyConstrained` import here.

After this step the returned JSX is: the `<svg>` (ghost + three two-line bars), and
the portalled `<div className="sti-angle-controls">` containing one
`<div className="sti-angle-row">` with the slider and the reset button.

**Keep `onMouseDown={(e) => e.stopPropagation()}` on `.sti-angle-controls`.** It
looks like leftover Shift-drag defence and it is not. React portals bubble along
the *React* tree, and this component renders inside `.sti-frame`, so without it a
drag on the slider thumb would also start a pan — and after Step 3 a plain drag is
exactly what pans. Removing it would make the slider drag the image underneath it.
Its comment currently mentions Shift; reword it to say the row is portalled out of
the frame in the DOM but still bubbles to it in React, so it stops the event to
keep slider drags off the pan handler.

- [ ] **Step 3: Restore plain-drag panning and add the badge warning**

In `gui/src/components/StiViewer.tsx`:

- In `handlePointerDown`, delete the `if (!event.shiftKey) return;` guard so a plain drag pans again.
- In `handlePointerMove`, delete the `if (!event.shiftKey) { handlePointerUp(); return; }` block — with Shift no longer meaningful there is no modifier to release mid-pan. Update the comment above the handlers, which currently explains the Shift split, to say the drag pans the STI and the slider under it sets the angle.
- Add the warning mark to the badge. Import `isAnglePoorlyConstrained` from `../helpers`, and next to the existing `angle`/`velocity` derivation add:

```tsx
// The warning describes an angle somebody chose, so it stays quiet on the
// neutral fallback the tuner draws for a station STIV never fitted.
const isAngleWarned = angle !== null && isAnglePoorlyConstrained(angle);
```

Then in the badge's angle line, replace `{angle === null ? '—' : `${angle.toFixed(1)}°`}` with:

```tsx
{angle === null ? (
  '—'
) : (
  <>
    {angle.toFixed(1)}°
    {isAngleWarned && (
      <span className="sti-badge-warn" title={t('Processing.stiAngleWarnExtreme')}>
        {' '}
        ⚠
      </span>
    )}
  </>
)}
```

- Drop `velocity` and `isImperial` from the `<StiAngleTuner .../>` call site (Step 2 removed both props). `velocity` and `isImperial` are still used by the badge itself, so keep their local computations.
- Change `CONTROLS_HEIGHT` from `48` to `32`, and update its comment: the reserve now covers a single slider row rather than a slider plus a meta line.

**`.sti-badge` has `pointer-events: none`** (`components.css:1191-1199`), which
would suppress the `title` tooltip. Step 4 re-enables pointer events on the mark
alone; do not remove the rule from `.sti-badge` itself — it exists so the badge
does not swallow drags over its corner, which still matters now that plain drag
pans again.

- [ ] **Step 4: Update the CSS**

In `gui/src/components/components.css`, delete these rules outright:

- `.sti-angle-overlay` and `.sti-angle-overlay.is-rotating` (lines ~1211-1222)
- `.sti-angle-handle` and the `.sti-angle-overlay:hover/:focus .sti-angle-handle` pair (~1224-1235)
- `.sti-angle-value` (~1255-1260)
- `.sti-angle-meta`, `.sti-angle-hint`, `.sti-angle-warning`, `.sti-angle-tuned` (~1282-1301)

Deleting `.sti-angle-overlay` is deliberate and is what makes the overlay
non-interactive: the base `.sti-overlay` rule already sets `pointer-events: none`
(`components.css:1181-1186`), and `.sti-angle-overlay` existed only to override it
back to `auto`. With the rule gone the overlay inherits `none` and the drag reaches
`.sti-frame`. Its `cursor: crosshair` and `touch-action: none` go too — both were
drag affordances.

Keep `.sti-angle-controls`, `.sti-angle-row`, `.sti-angle-slider`,
`.sti-angle-reset` and its `:hover`/`:disabled` rules unchanged.

Add, next to the `.sti-badge` rule:

```css
/* The angle's warning mark. .sti-badge is pointer-events:none so it never
   swallows a pan; the mark opts back in so its tooltip is reachable. */
.sti-badge-warn {
    color: var(--warning-color);
    pointer-events: auto;
    cursor: help;
}
```

- [ ] **Step 5: Remove the dead translation keys**

In `gui/src/translations/en/global.json`, delete these three keys from the
`Processing` object — nothing references them after Steps 1-2:

```
"stiAngleTuned": "tuned",
"stiAngleAuto": "auto {{angle}}°",
"stiAngleDragHint": "Drag to rotate · Shift+drag to pan",
```

Keep `stiAngleWarnExtreme` (now the badge tooltip), `stiAngleReset`,
`stiAngleResetAll`, `stiAngleResetAllTitle`, `stiAngleLowConfidence`.

Confirm nothing still references the removed keys, and that the file still parses:

```bash
cd gui && grep -rn "stiAngleTuned\|stiAngleAuto\|stiAngleDragHint" src/ ; \
python3 -c "import json; json.load(open('src/translations/en/global.json')); print('JSON OK')"
```
Expected: the grep prints **nothing**, then `JSON OK`.

- [ ] **Step 6: Verify, lint and commit**

```bash
cd gui && npx jest
npx tsc --noEmit -p tsconfig.check.json 2>&1 | grep -E "^(src/components/StiAngleTuner|src/components/StiViewer)"
npx eslint src/components/StiAngleTuner.tsx src/components/StiViewer.tsx --max-warnings 0
```
Expected: 20 suites / 220 tests pass (Task 1 added 6); grep prints nothing; eslint clean.

```bash
git add src/components/StiAngleTuner.tsx src/components/StiViewer.tsx src/components/components.css src/translations/en/global.json
git commit -m "Make the STIV angle slider-only and move its warning into the badge"
```

---

### Task 3: Move "Reset all angles" left of the toggle

**Files:**
- Modify: `gui/src/components/Forms/FormProcessing.tsx`

**Interfaces:**
- Consumes: existing `hasAnyStivOverride` / `resetAllStivAngles` from `useStivAngleOverride(0)` — already wired in this file.
- Produces: nothing.

**Why:** `.technique-row-processing .field-title` has `flex: 1` (`form.css:715`), so the title absorbs the row's slack and the toggle and eye sit pinned to the right edge. A button appended after the eye competes for that space and shoves both left whenever an override exists. Placed between the title and the toggle, the flexing title shrinks to absorb it and the toggle and eye never move.

- [ ] **Step 1: Reorder the STIV row**

In `gui/src/components/Forms/FormProcessing.tsx`, in the STIV `technique-row-processing` block, move the whole `{hasAnyStivOverride && (<button ... >{t('Processing.stiAngleResetAll')}</button>)}` expression so it sits immediately **after** `<h3 className="field-title">STIV</h3>` and **before** `<label className="switch">`. Change nothing inside the button.

Resulting child order: swatch → title → reset-all (conditional) → toggle → eye.

- [ ] **Step 2: Verify the row order changed and nothing else did**

```bash
cd gui && git diff --stat src/components/Forms/FormProcessing.tsx
```
Expected: one file, a small balanced insertion/deletion — the button moved, not rewritten.

- [ ] **Step 3: Verify, lint and commit**

```bash
cd gui && npx jest
npx tsc --noEmit -p tsconfig.check.json 2>&1 | grep -E "^src/components/Forms/FormProcessing"
npx eslint src/components/Forms/FormProcessing.tsx --max-warnings 0
```
Expected: tests pass; grep prints nothing; eslint clean.

```bash
git add src/components/Forms/FormProcessing.tsx
git commit -m "Keep the STIV toggle still when Reset all angles appears"
```

---

### Task 4: A pending angle write must settle before anything reads it

**Files:**
- Modify: `gui/src/hooks/useStivAngleOverride.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `flushStivAngleWrites(): Promise<void>` keeps its exact signature and its existing import in `gui/src/pages/Processing.tsx` — only its internals change. No call site is touched.

**Why:** `setSectionData` replaces `section.data` wholesale (`sectionSlice.ts:79`), and both **Next** (`onLoadResultData`) and Results' recompute feed it data read back from `xsections.json`. `stiv_angle_manual_profile` is the one field the renderer authors, so a read that precedes the write silently reverts the user's angle. `flushStivAngleWrites()` already runs before that read, but the debounce timer deletes its own map entry **before** its IPC write resolves — so a **Next** landing in that gap finds nothing pending, returns instantly, and the read wins. The entry has to survive until the write settles.

- [ ] **Step 1: Read the current file**

Read `gui/src/hooks/useStivAngleOverride.ts` in full. The parts that matter: the
module-level `pending` Map, `schedulePersist`, `flushStivAngleWrites`, and the
unmount-cleanup `useEffect`.

- [ ] **Step 2: Track in-flight writes alongside scheduled ones**

Replace the `PendingWrite` type, the `pending` map, `schedulePersist` and
`flushStivAngleWrites` with:

```ts
type PendingWrite = {
  timer: ReturnType<typeof setTimeout> | null;
  angles: (number | null)[];
  /** Set once the IPC call is away; resolves when the file write has settled. */
  inFlight: Promise<void> | null;
};

/**
 * Module-scoped, not per-hook-instance: this hook is called from more than one
 * component (the tuner, the viewer, the Reset-all button), and a write must be
 * flushable regardless of which instance scheduled it. Keyed by section name so
 * switching cross-sections mid-edit cannot cross-write.
 *
 * An entry lives from the moment a write is scheduled until the moment it has
 * settled on disk — not until it is merely sent. Anything that re-reads
 * xsections.json (Processing's Next, via flushStivAngleWrites) has to be able to
 * wait for a write that is already away, or it reads the file as it was before.
 */
const pending = new Map<string, PendingWrite>();

const sendWrite = (sectionName: string, angles: (number | null)[]): Promise<void> => {
  const entry = pending.get(sectionName);
  const inFlight = window.ipcRenderer
    .invoke('set-stiv-manual-angles', { sectionName, angles })
    .catch(() => {})
    .then(() => {
      // Only retire this entry if it is still the one we sent. A newer edit
      // during the round trip will have replaced it, and that one owes a write.
      if (pending.get(sectionName)?.inFlight === inFlight) pending.delete(sectionName);
    });
  if (entry) entry.inFlight = inFlight;
  else pending.set(sectionName, { timer: null, angles, inFlight });
  return inFlight;
};

const schedulePersist = (sectionName: string, angles: (number | null)[]) => {
  const existing = pending.get(sectionName);
  if (existing?.timer) clearTimeout(existing.timer);
  const timer = setTimeout(() => {
    const entry = pending.get(sectionName);
    if (entry) entry.timer = null;
    sendWrite(sectionName, angles);
  }, PERSIST_DELAY_MS);
  pending.set(sectionName, { timer, angles, inFlight: existing?.inFlight ?? null });
};

/**
 * Settle every angle write — scheduled or already away — before the caller reads
 * xsections.json back. Processing's Next button calls this ahead of
 * onLoadResultData, which replaces Redux's section data wholesale from disk.
 */
export const flushStivAngleWrites = async (): Promise<void> => {
  const entries = Array.from(pending.entries());
  await Promise.all(
    entries.map(([sectionName, entry]) => {
      if (entry.timer) {
        clearTimeout(entry.timer);
        entry.timer = null;
        return sendWrite(sectionName, entry.angles);
      }
      return entry.inFlight ?? Promise.resolve();
    })
  );
};
```

`PERSIST_DELAY_MS` already exists at the top of the file; keep it as is.

- [ ] **Step 3: Point the unmount cleanup at the same path**

The cleanup `useEffect` currently clears the timer and fires its own
`window.ipcRenderer.invoke`. Replace its body so it reuses `sendWrite`, keeping
the entry tracked instead of orphaning it:

```ts
  // Unmounting means leaving the STI view (switching stations does not remount),
  // which must not swallow an edit made in the last few hundred milliseconds.
  useEffect(() => {
    const sectionName = section?.name;
    return () => {
      if (sectionName === undefined) return;
      const entry = pending.get(sectionName);
      if (!entry?.timer) return;
      clearTimeout(entry.timer);
      entry.timer = null;
      sendWrite(sectionName, entry.angles);
    };
  }, [section?.name]);
```

- [ ] **Step 4: Confirm no call site changed**

```bash
cd gui && grep -rn "flushStivAngleWrites" src/
```
Expected: exactly two lines — the export in `src/hooks/useStivAngleOverride.ts`
and the import in `src/pages/Processing.tsx`. If `Processing.tsx` shows anything
other than the existing `await flushStivAngleWrites();` inside `handleNext`, stop
and report — this task must not change its callers.

- [ ] **Step 5: Verify, lint and commit**

```bash
cd gui && npx jest
npx tsc --noEmit -p tsconfig.check.json 2>&1 | grep -E "^src/hooks/useStivAngleOverride"
npx eslint src/hooks/useStivAngleOverride.ts --max-warnings 0
```
Expected: tests pass; grep prints nothing; eslint clean.

There is no unit test for this hook — it is Redux + IPC wiring, and
`jest.config.js` is `testEnvironment: 'node'` with no jsdom, matching every prior
decision on this branch. Its gate is the manual pass in Task 5.

```bash
git add src/hooks/useStivAngleOverride.ts
git commit -m "Hold a pending angle write until it settles, not until it is sent"
```

---

### Task 5: Manual verification

**Files:** none — this task runs the app.

**Interfaces:**
- Consumes: Tasks 1-4.
- Produces: nothing.

This is the correctness gate for Tasks 2, 3 and 4, none of which carry automated
tests (interactive SVG/pointer UI, CSS, and IPC timing — none reachable from a
`testEnvironment: 'node'` suite).

- [ ] **Step 1: Launch the app and load a real project**

```bash
cd gui && npm run dev
```

Load `/Users/antoine/river/DJI_1_Tweed_15032022/20260714T2031` through the app's
own project dialog, go to **Processing**, and switch the STIV preview to the STI
view (the eye button on the STIV row). Stations 8, 9, 10 and 13 carry σ larger
than their own velocity and are the interesting ones.

- [ ] **Step 2: Walk the checklist**

1. Plain drag on the STI pans the image; nothing rotates.
2. The slider rotates the bars; the badge's angle and velocity track it live.
3. Focus the slider and press `→` / `←` repeatedly across 90° — the value crosses in both directions and never sticks at 89.5° or 90.5°.
4. Below the slider there is nothing but the slider and `↺ Reset to automatic`.
5. At 85–95° the bars keep their velocity colour, and the badge shows `⚠` beside the angle whose tooltip reads "Velocity is poorly constrained at this angle".
6. Tune a station, then reset it: the STIV toggle and eye button do not shift as "Reset all angles" appears and disappears.
7. Switch the preview to iWave: no tuned/low-confidence markers appear on that strip.
8. Tune a station's angle, then click **Next** immediately (within a second): Results' STIV profile shows the tuned value at that station, and total Q reflects it.
9. Reload the project: the override is still there.

- [ ] **Step 3: Report**

Report each numbered item as pass or fail with what was observed. Any failure
stops the task — report it rather than patching, so the fix can be scoped
deliberately.

---

## Self-Review

**Spec coverage.** Spec §1 (slider-only) → Task 2 Steps 1, 3. §2 (remove readout) → Task 2 Step 2. §3 (remove auto line) → Task 2 Step 2. §4 (Reset all placement) → Task 3. §5 (warning to badge, shortened) → Task 2 Steps 3, 4. §6 (no colour change) → Task 2 Step 2. §7 (survive Next) → Task 4. Slider 90° crossing → Task 1. Translation keys → Task 2 Step 5. CSS → Task 2 Step 4. Manual verification → Task 5.

**Known risks for the implementer.**

- Task 2 is the big one and touches four files. Steps 1-2 are pure deletion; if a deletion leaves an unused import, `noUnusedLocals` in `tsconfig.check.json` will catch it — that is what the grep gate is for.
- The single easiest way to break Task 2 is deleting `.sti-angle-controls`'s `stopPropagation` alongside the other Shift-drag leftovers. It is the only thing keeping a slider drag from panning the image. Task 5 item 2 catches it if it slips through.
- Task 2 Step 3's badge JSX replaces a bare expression with a fragment. `t` is already in scope in `StiViewer.tsx`; confirm before assuming.
- Task 4's `sendWrite` identity check (`?.inFlight === inFlight`) is what keeps a superseding edit from being retired by an older write's completion. Do not simplify it to an unconditional `pending.delete`.
- Task 5 item 8 is the one that verifies the actual reported bug. If it fails, capture the exact sequence — which station, how soon after the edit **Next** was clicked — before reporting.
