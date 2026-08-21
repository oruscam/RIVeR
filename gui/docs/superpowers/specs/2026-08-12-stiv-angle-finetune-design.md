# STIV Angle Fine-Tuning — Design

**Date:** 2026-08-12
**Branch:** `feat/stiv-angle-finetune`
**Status:** approved design, ready for planning

## Problem

After STIV runs, Processing shows each station's space-time image with the
automatically fitted angle drawn over it (`StiViewer.tsx:135-158`). The user can
*see* that a fit is wrong, and can do nothing about it.

The fit is wrong often enough to matter. On `DJI_1_Tweed_15032022`, four of
fifteen stations came back with an uncertainty larger than their own velocity:

| Station (id) | v (m/s) | σ (m/s) | σ / v |
|---|---|---|---|
| 8 | 1.613 | 2.261 | 1.4 |
| 9 | 1.793 | 2.940 | 1.6 |
| 10 | 1.559 | 2.269 | 1.5 |
| 13 | 1.386 | 2.051 | 1.5 |

A σ/v of 1.5 is the model saying it does not know. Station 9's automatic angle
is 71.5°, while the streaks visible in `sti_9.png` run far closer to horizontal.
A hydrologist reading that image can place the angle better than the ensemble
did — and today has no way to record it.

(Station ids are 1-based and the arrays are 0-indexed: station id 9 is index 8.
This spec quotes **ids** throughout, matching what the UI displays.)

This is not a re-run. Re-running STIV re-derives the same answer from the same
image. What is missing is the expert's eye, applied per station.

The precedent is the internal labelling tool at `~/sti_training/02_labeling`,
which set the angle by eye with a 0–180° slider at 0.5° steps over the STI crop
(`static/index.html:66`, `static/app.js:75`). This feature adapts that idea to
RIVeR.

## Scope

**In scope.** Per-station manual angle override in the Processing STI viewer;
reset to automatic; the override taking priority over the automatic value in the
STIV profile, and therefore in discharge.

**Out of scope.** Fine-tuning LSPIV or iWave. Any change to the STIV fitting
model. Any batch/auto-correction of angles.

## Constraint that shapes the architecture

Discharge for all three techniques is already computed **live in the renderer**
by `getEffectiveTechniqueData` (`src/helpers/techniqueDischarge.ts:127`), from
data that is entirely present in `SectionData` once a project loads. Toggling a
station's checkbox or editing alpha recomputes Q instantly with no backend call.

The angle→velocity conversion is a one-line function
(`river/core/stiv_pipeline.py:204`):

```python
slope = np.tan(np.deg2rad(theta_deg))
v = slope * (meters_per_pix / seconds_per_pix)
return float(-abs(v) if theta_deg > 90.0 else abs(v))
```

Both of its inputs are in Redux already: `meters_per_pix` is the constant
`RW_STEP_M = 0.02`, and `seconds_per_pix` is `step / fps` from
`video.parameters.step` and `video.data.fps`.

**Decision: the override is resolved entirely client-side.** No new CLI command,
no backend round-trip. The backend's only involvement is storage. This matches
how every other live-recomputed control in Results already works, and keeps an
angle nudge as immediate as a checkbox toggle.

The cost is one duplicated formula across the Python/TypeScript boundary. It is
accepted because the formula is three lines, is pinned by unit tests that assert
against values computed from the Python source, and the alternative — a CLI
round-trip per drag frame — would make the interaction unusable.

## Data model

### Storage

One new per-station array in the section object of `xsections.json`:

```
stiv_angle_manual_profile: (number | null)[]
```

`null` at index `i` means "no override at station `i`". The array is written
only by the GUI; the STIV pipeline never produces it.

Velocity, sign and σ for overridden stations are **derived, never stored**. A
stored derived value could drift out of sync with the angle that produced it;
a derived one cannot.

### Derivation

```
effectiveAngle[i] = manual[i] ?? auto[i]
velocity[i]       = tan(θ) · k          k = RW_STEP_M · fps / step
sign[i]           = θ > 90 ? 'negative' : 'positive'
sigma[i]          = manual[i] !== null ? null : autoSigma[i]
```

σ is dropped for tuned stations. The ensemble spread that produced σ did not
produce this angle, so reporting it would attribute a model's uncertainty to a
hand-placed line. Results renders the tuned station without an error bar, and
the band visibly stops where the model stopped.

### Persistence

A new narrow IPC handler, `set-stiv-manual-angles`, patches only
`stiv_angle_manual_profile` for one named section in `xsections.json`.

`set-sections` is deliberately **not** reused: its adapter
(`adapterCrossSections.ts`) serialises geometry only, so routing through it
would clobber `data`. The narrow-handler shape follows `setColorbarLimits` and
`setPixelSize`.

Overrides reload for free — `loadProjectHelpers.ts:293` spreads the whole
section object into `section.data`, so any key present in `xsections.json`
arrives in Redux without adapter changes.

### Staleness

Two ways an override can become a lie, both handled:

**Station Number changes.** `update_current_x_section` rebuilds station geometry,
so station 6 becomes a different real-world place. Adding
`stiv_angle_manual_profile` to `STIV_COLUMNS`
(`river/core/stiv_pipeline.py:24`) makes the existing strip logic from commit
`003fee9` drop it along with the other STIV arrays. No new mechanism.

**Analize is re-run.** STIV rebuilds every STI and re-fits every angle. An
override made against the previous image should not survive onto a new one, so
`run_stiv_analysis` clears `stiv_angle_manual_profile` when it writes its
results. The user loses manual work on a re-run; that is the correct trade,
because a silently-retained override would apply yesterday's judgement to
today's data with no indication that it had done so.

An ordinary Results recompute is **not** a re-run and must preserve overrides.
It does: `update_current_x_section` merges its rebuilt keys into the section
dict rather than replacing it.

## Components

Splitting rather than growing `StiViewer.tsx`, which at 173 lines already owns
image loading, pan, the overlay and the badge.

| Unit | Does | Depends on |
|---|---|---|
| `helpers/stivAngle.ts` | θ→velocity, θ→sign, profile merge, pointer→angle, clamp, warning predicate | nothing (pure) |
| `hooks/useStivAngleOverride.ts` | reads/writes the override in Redux, persists via IPC | Redux, ipcRenderer |
| `components/StiAngleTuner.tsx` | bars, handles, slider, reset, readout | the two above |
| `components/StiViewer.tsx` | image, pan, composition | `StiAngleTuner` |

`stivAngle.ts` holds every number that matters and has no React or Redux
dependency, so the arithmetic is testable in isolation. `StiAngleTuner` is
presentational: given an angle and a setter it renders, which keeps it
independent of how the override is stored.

## Interaction

Prototyped at `gui/angle.html` (`src/devPreview/angleTuner.tsx`) against the
real Tweed STIs; four variants were compared before settling on the below.

### Rotating

The three bars stay locked to one shared angle — they are three samples of one
measurement, not three independent readings.

- **Drag anywhere on the STI** rotates the bars. The angle follows the pointer's
  bearing from the nearest bar centre.
- **Shift+drag** pans the STI (today's unmodified drag). The cursor indicates
  which gesture is active.
- **Slider below the image**, 0–180° at 0.5° steps — the precision instrument,
  and the one that reaches comfortably into the near-90° region where dragging
  is twitchy.
- **←/→** nudge 0.5°; **Shift+←/→** nudge 0.1°.

Handles appear at the bar ends on hover, so the bars read as grabbable without
an edit mode to enter.

### Colour

Bars take live velocity colour from the existing `getStiColorScale`, so they
visibly change as they rotate, and so that colour means the same thing here as
it does in the colour bar and the Results chevrons.

Automatic-vs-tuned is therefore carried by **shape, not colour**:

- a dashed ghost of the automatic angle persists while a station is tuned, so
  the size of the correction is always legible
- the readout gains a `tuned · auto 71.5° (+0.42 m/s)` line
- the station strip marks tuned stations

### The near-90° warning

`tan θ` diverges at 90°. In the prototype, one ordinary drag took station 9
from 71.5° to 85.2°, its velocity from 1.79 to 7.14 m/s, and total Q up 38%.

Above 85° and below 5°, the readout and bars take the warning colour
(`--warning-color`) and the readout adds a line stating that velocity is poorly
constrained at this angle. The slider carries a warning band at both ends, so
the region is visible before the user drags into it.

Nothing is blocked. Some rivers really are that fast, and a hydrologist
overriding by eye is exactly the person entitled to say so.

### Reset

- `↺ Reset to automatic` beside the slider, enabled only when the current
  station is tuned.
- `Reset all` in the Processing form panel, shown only when some station in the
  section is tuned.

### Pointing the user at the right stations

The station strip underlines stations where the model is least confident:

```
σ[i] != null  &&  v[i] != null  &&  v[i] != 0  &&  σ[i] > |v[i]|
```

The `v != 0` guard matters — a dry bank station has v = 0 and the σ floor of
0.05, which satisfies `σ > |v|` while meaning nothing. On the Tweed project the
rule marks exactly ids 8, 9, 10 and 13, and correctly leaves id 15 (the dry
right bank) unmarked. It costs one comparison per station and replaces "check
all fifteen" with "check these four".

## Results integration

Because the merge happens upstream, Results needs no new concept.
`getEffectiveTechniqueData` takes the merged profile as its `baseProfile` when
`technique === 'stiv'`, and the profile chart, Q table, graphs, report and
export all keep reading one profile, unchanged.

Two visible touches:

- tuned stations render as a filled marker on the STIV series
- tuned stations carry no ±σ error bar

## Edge cases

| Case | Behaviour |
|---|---|
| θ → 90° | Storable range clamped to 0.5–179.5°, so velocity is always finite |
| θ ≤ 0.5° | Velocity ≈ 0. Legal — this is how "no detectable motion" is recorded |
| Station has no automatic angle | Override allowed. A station STIV gave up on is a prime candidate for a human read |
| Station is unchecked | Override stored but excluded from Q, like any unchecked station. Re-checking restores it |
| Station Number changes | Overrides stripped with the other STIV arrays |
| Analize re-run | Overrides cleared by `run_stiv_analysis` |
| Sign | Derived from θ, never stored, so it cannot contradict the angle |

## Testing

- **`helpers/stivAngle.test.ts`** — θ→velocity against a table of angles
  including >90°, with expected values taken from the Python
  `theta_to_velocity`; the clamp; merge precedence; the warning predicate at its
  boundaries. Pure functions, so these are cheap and they guard the number that
  ends up in the discharge.
- **`techniqueDischarge.test.ts`** — extends the existing suite: an override
  changes total Q; reset restores the automatic Q exactly; σ is dropped for
  tuned stations only.
- **Python** — a regression test that `stiv_angle_manual_profile` is stripped on
  a Station-Number change, alongside the three `003fee9` added; and that
  `run_stiv_analysis` clears it.

**No component tests.** `jest.config.js` sets `testEnvironment: 'node'` with no
jsdom and no testing-library, and every existing GUI test is a pure-helper test.
Rendering `StiAngleTuner` would mean adding `jest-environment-jsdom` and
`@testing-library/react` to test one disabled attribute.

Instead the reset logic is pushed into `stivAngle.ts` as pure functions —
`isStationTuned(manual, i)`, `clearOverride(manual, i)`, `clearAllOverrides(n)` —
which are unit-tested directly. `StiAngleTuner` then renders
`disabled={!isStationTuned(...)}`, which needs no test of its own.

No end-to-end test drives the drag gesture either. It would be expensive and
brittle, and the pure helpers already cover the arithmetic that affects the
result.

## Prototype cleanup

`gui/angle.html`, `src/devPreview/angleMain.tsx`, `src/devPreview/angleTuner.tsx`
and `src/devPreview/angleSample.json` are throwaway design artefacts, kept in the
tree during implementation as the visual reference and deleted in the final task.
