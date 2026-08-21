# STIV Angle Tuner — Corrections

**Date:** 2026-08-13
**Branch:** `feat/stiv-angle-finetune`
**Status:** approved design, ready for planning
**Amends:** `2026-08-12-stiv-angle-finetune-design.md`

## Problem

The STIV angle tuner shipped on this branch works, but first use surfaced seven
problems — six of them are the interaction carrying more than it should, and one
is a correctness bug on the path that matters most.

| # | Problem |
|---|---|
| 1 | Drag rotates the bars, so panning the STI needs Shift. Drag was already the pan gesture; taking it costs more than rotation gains |
| 2 | The angle and velocity beside the slider repeat what the STI's corner badge already shows |
| 3 | The `tuned · auto 71.5°` line below Reset earns nothing |
| 4 | "Reset all angles" appears at the end of the STIV row and shoves the toggle and eye button sideways |
| 5 | The 85–95° warning sits under the slider, away from the values it describes, and is too long |
| 6 | That warning also recolours the bars, which reads as a different measurement rather than a caution |
| 7 | A manually-set angle does not reliably reach the STIV profile in Results after **Next** |

## 1–3, 5–6: the tuner

### Rotation is the slider's job alone

The overlay drops every pointer handler and takes `pointer-events: none`. It
becomes what it looks like: a drawing of the current angle over the STI.

`StiViewer`'s pan handlers drop their `event.shiftKey` guard, so a plain drag
pans the image exactly as it did before this feature existed. Shift+drag stops
being a gesture.

Two things follow:

- **The bar-end handles go.** A handle is a promise that the thing can be
  grabbed. Nothing can be grabbed now.
- **The dashed ghost stays.** With §3 removing the numeric `auto 71.5°`, the
  ghost becomes the only way to see how far a correction has moved from the
  automatic fit. It is the reason to keep it, not a leftover.

The custom `keydown` handler and `tabIndex` on the overlay go with the rest —
the slider is a native `<input type="range">` and already answers arrow keys.

### The controls collapse to one row

Everything under the slider goes:

| Element | Why |
|---|---|
| `.sti-angle-hint` ("Drag to rotate · Shift+drag to pan") | Describes a gesture that no longer exists |
| `.sti-angle-value` (`71.5° · +1.79 m/s`) | The badge already shows both, four inches away |
| `.sti-angle-tuned` (`tuned · auto 71.5°`) | The ghost line says it better |
| `.sti-angle-warning` | Moves into the badge |

What remains is one row: the slider and `↺ Reset to automatic`.

`CONTROLS_HEIGHT` in `StiViewer.tsx` drops from 48 to 32 — the reserve exists so
the row cannot land on the floating colour bar, and the row is now a single line.
The STI gets the difference back as height.

### The warning moves to the badge and stops recolouring

The bars and the slider keep the velocity colour at every angle. Colour means
velocity everywhere in this app; making it mean "caution" at 85–95° gives one
channel two jobs and reads as a different measurement rather than a warning.

The badge's angle line gains a `⚠` in `--warning-color` when
`isAnglePoorlyConstrained` holds, with the full sentence as its `title`:

```
Station 9
89.5° ⚠          ← title="Velocity is poorly constrained at this angle"
+68.75 m/s
```

Short form visible, explanation one hover away.

### The slider must be able to cross 90°

`clampAngle` pushes anything inside 89.5–90.5° out to the **nearer** edge, so it
is a fixed point at both ends of that band: at 89.5° a `→` press computes 90.0°,
which snaps straight back to 89.5°. While drag existed this was a minor
annoyance with an obvious workaround. As the only input, it is a wall across the
middle of the range.

A new pure helper resolves a step landing inside the band by **direction of
travel** rather than proximity:

```
nextAngleFromSlider(raw, current):
  raw inside (89.5, 90.5)  →  raw > current ? 90.5 : 89.5
  otherwise                →  clampAngle(raw)
```

`clampAngle` itself is untouched — it stays pure, direction-agnostic, and keeps
guarding every other write path. Only the slider, which alone has a meaningful
"previous value", uses the new helper.

## 4: where "Reset all angles" belongs

`.technique-row-processing .field-title` has `flex: 1` (`form.css:715`), so the
title absorbs the row's slack and the toggle and eye sit pinned to the right
edge. A button appended *after* the eye competes for that space and pushes both
left, which is the jump that was observed.

Moving the button **between the title and the toggle** makes the flexing title
shrink to absorb it instead. The toggle and eye hold their position whether the
button is present or not.

## 7: a manual angle must survive Next

### Root cause

`setSectionData` replaces `section.data` wholesale (`sectionSlice.ts:79`), and
both **Next** (`onLoadResultData`) and Results' recompute feed it data read back
from `xsections.json`.

For every other field that is correct: the backend writes, the renderer reads.
`stiv_angle_manual_profile` is the one field where the renderer is the author and
the file is the copy — so a read that happens before the write lands silently
reverts the user's angle.

`flushStivAngleWrites()` was added ahead of that read last round, but it does not
close the hole: the debounce timer removes its own bookkeeping entry *before*
its IPC write resolves. A **Next** landing in that gap finds nothing pending,
returns immediately, and the read beats the write.

### Fix

Keep each pending entry alive until its write **settles**, not until it
**starts**, and have `flushStivAngleWrites()` await in-flight writes as well as
scheduled ones. Then no read on this path can outrun a write.

### Rejected alternative

Carrying the in-memory override forward across the reload instead of racing at
all. It cannot distinguish "the file has not caught up yet" from "the file says
this was deliberately cleared" — which is exactly what `run_stiv_analysis`
writes on a re-run. It would resurrect overrides the backend had just correctly
discarded. Fixing the timing is precise; inferring authority is not.

### Caveat

This closes a defect that can be demonstrated from the code. It was not possible
to reproduce the reported symptom in the running app — the repo has no
Electron driver and loading a project needs the native file dialog. If the
symptom survives this fix, reproducing it live is the next step, with the exact
sequence recorded (which station, how soon after the edit **Next** was clicked).

## Translation keys

| Key | Change |
|---|---|
| `stiAngleTuned` | Remove — no consumer |
| `stiAngleAuto` | Remove — no consumer |
| `stiAngleDragHint` | Remove — the gesture is gone |
| `stiAngleWarnExtreme` | Keep, now the badge `⚠`'s tooltip |
| `stiAngleReset`, `stiAngleResetAll`, `stiAngleResetAllTitle`, `stiAngleLowConfidence` | Unchanged |

`en/global.json` only — `fallbackLng` is `'en'`.

## CSS

Delete outright: `.sti-angle-overlay` **and** `.sti-angle-overlay.is-rotating`,
`.sti-angle-handle` with its two hover/focus rules, `.sti-angle-meta`,
`.sti-angle-hint`, `.sti-angle-warning`, `.sti-angle-tuned`, `.sti-angle-value`.

`.sti-angle-overlay` exists only to override the base `.sti-overlay`'s
`pointer-events: none` back to `auto` (`components.css:1181-1186`, `1211-1216`).
Deleting the rule restores the inherited `none` — the overlay needs no rule of
its own, and its `cursor: crosshair` / `touch-action: none` go with it, both
being drag affordances.

`.sti-angle-controls` keeps its flex column but now wraps a single row; leave the
column in place rather than restructure markup for one child.

Add one rule for the badge's `⚠`: `--warning-color`, and `cursor: help` so the
tooltip is discoverable.

## Testing

- **`stivAngle.test.ts`** — `nextAngleFromSlider`: upward from 89.5° reaches
  90.5°, downward from 90.5° reaches 89.5°, values outside the band fall through
  to `clampAngle` unchanged, and the storable range still holds.
- **Existing suites** must stay green; no test asserts the removed UI.

No component test — `jest.config.js` is `testEnvironment: 'node'` with no jsdom,
matching every prior decision on this branch. The removals are verified by the
manual pass below.

## Manual verification

1. Plain drag on the STI pans it; nothing rotates.
2. The slider rotates the bars; the badge's angle and velocity track it.
3. Arrow keys on the slider cross 90° in both directions.
4. Below the slider there is nothing but the slider and Reset.
5. At 85–95° the bars keep their velocity colour and the badge shows `⚠`,
   whose tooltip carries the sentence.
6. Toggling a station's override on and off leaves the STIV toggle and eye
   button motionless.
7. Set an angle, click **Next** immediately: Results' STIV profile shows the
   set value at that station.
