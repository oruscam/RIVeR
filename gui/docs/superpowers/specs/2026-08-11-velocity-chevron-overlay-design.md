# Results — Replace the Velocity Arrows with an Animated Chevron Overlay

## 1. Problem

The Results step draws one filled polygon arrow per station over the snapshot
(`drawVectors.ts` + `calculateMultipleArrowsAdaptative` in `drawArrows.ts`). Three
things are wrong with it:

1. **A zero velocity still draws an arrow.** Arrow length is
   `interpolate(magnitudeNormalized, 0, 1, minTargetLength, maxTargetLength)`
   (`drawArrows.ts:404`), so a station at 0 m/s still gets `minTargetLength`
   (2% of image width) plus a tip extension — a permanent arrowhead where there
   is no flow. On `P1060716/20260728T1656` the STIV profile has a genuine `0.00`
   at station 1; it must render as nothing.
2. **The arrows look dated.** Chunky flat polygons whose width is
   `0.8 × mean station spacing`, with a hard triangular head and no depth.
3. **No colour legend.** Results computes `getVelocityLimits(...)` but its
   `<ColorBar>` is commented out (`pages/Results.tsx:31`), so the only colour key
   is in Processing.

A fourth issue was found and fixed separately while investigating (commit
`c0eab6a`): the arrows read `data.activeMagnitude`, an LSPIV-only array computed
in the Electron layer, so they ignored the selected technique. That fix is
assumed present here.

## 2. Goals

- Replace the arrow with an **animated chevron-chase glyph**, validated against
  two real oblique projects in a live prototype before writing this spec.
- **Zero or absent velocity draws nothing at all.**
- **Reverse flow points upstream**, so a negative STIV station is visible on the
  image rather than only in a tooltip.
- Bring the **colour bar** to Results, in the same position and with the same
  behaviour as Processing (including manually locked limits).
- Restore the **hover readout** the arrows had, in the chevron's colour, now with
  an explicit `+`/`−`.
- Degrade to a **static** render for the report and for
  `prefers-reduced-motion`.

## 3. Non-goals

- No change to the velocity chart, grid, discharge computation or
  `getEffectiveTechniqueData`.
- No change to Processing's quiver overlay.
- No new colour palette — the existing 4-stop ramp (`createColorMap`) stays.
- Not touching `activeMagnitude` itself; it still feeds other callers.

## 4. Geometry — real-world metres, projected

**This is the load-bearing decision and the one the prototype got wrong first.**

A homography does not preserve perpendicularity. Taking the flow direction as the
perpendicular of the section *in pixel space* was measured wrong by **25–48°** on
`oblique/20250703T1004`, and produced an identical direction at every station
`(+0.48,−0.88)` where the true projected directions fan from `(+0.97,−0.23)` to
`(+0.81,−0.59)`. A pixel-space size proxy was likewise ~5× too aggressive: a
constant 3 m step projects to 151→239 px across that section (1.6×), while the
proxy varied 8×.

Therefore every vertex of every chevron is defined in **real-world metres at the
station** and projected through the homography, exactly as
`calculateMultipleArrowsAdaptative` already does. Perspective then needs no fudge
factor: thickness, wing span and chevron travel all foreshorten correctly.

Per station `i`:

- **Origin** — `(east[i], north[i])`.
- **Flow direction** — the unit vector of
  `(streamwise_east[i], streamwise_north[i])`, RIVeR's own streamwise vector.
  **Not** a "point up-image" heuristic: that was verified to agree on both test
  projects (0.0° difference, same sense at every station checked), but it agrees
  only because both cameras look downstream — one looking upstream would silently
  reverse every chevron. Where the streamwise vector is absent or zero-length,
  fall back to the section's real-world perpendicular, oriented by the sign of
  the velocity.
- **Cross axis** — the section's real-world tangent, from neighbouring stations.
- **Length** `L = |v|/vMax × 2 × SPACING_M`, where `SPACING_M` is the real-world
  station spacing. **Sign is carried by the direction, not the length** (§6).
- **Width** `W = SPACING_M × 0.5`.

A station renders nothing when `v` is `null`, or when the projected base→tip
distance is under 2 px (which is what "zero velocity" reduces to).

## 5. The glyph

Filled chevrons chasing along the arrow axis. Fixed shape parameters, chosen from
the live prototype:

| Parameter | Value |
|---|---|
| thickness | `W × 0.16 × 3.3` metres |
| wing half-span | `W × 0.7` metres |
| wing trail-back | `W × 0.5` metres |
| drop shadow | `feDropShadow dy=1 stdDeviation=1.4 floodOpacity=0.45` |
| opacity per chevron | `sin(π·f) × 0.95`, `f` = fraction along the axis |

The chevron outline is an outer V and an inner V offset back along the flow by the
thickness, giving a closed 6-point polygon.

The shadow is in **screen pixels, not metres** — deliberately. A cast shadow reads
as depth toward the viewer, so it must not foreshorten; if it did, far chevrons
would lose it entirely. The filter is applied **once per station group**, not per
chevron (15 filter passes per frame rather than ~75).

### 5.1 Count and period are derived, not tuned

Both follow from the geometry, so they stay correct across projects with
different velocities, station spacing, or techniques.

**Count — constant pitch.** Arrow length is proportional to velocity, so a fixed
count crams N chevrons into a short slow arrow and spreads the same N thinly over
a long fast one. Instead hold the pitch constant:

```
count_i = clamp(round(L_i / (W × 0.8)), 1, 6)
```

`0.8` is back-derived from the count of 5 chosen at the longest arrow, so the
fastest station is unchanged and only slow stations stop being crowded. Observed
range on the test projects: 1–5.

**Period — uniform across stations.** A chevron should travel at a speed
proportional to the water speed. It crosses its arrow (length ∝ v) in one period
`T`, so `speed = L/T ∝ v` requires `T` to be identical at every station; the speed
difference then comes free from the arrow length. The prototype's original
per-station multiplier `(0.35 + 0.85t)` made apparent speed ∝ `t(0.35+0.85t)`,
overstating fast water by ~2.4× relative to slow water — a motion cue that
actively misreports the ratio. Default period **1.7 s**.

Stations get a fixed phase offset of `(i × 0.618) mod 1` so a shared period does
not read as marching in lockstep.

## 6. Reverse flow

Negative velocities are real (STIV reports them; `P1060716` has a −1.25 m/s
station). The glyph **flips 180°** — chevrons point and chase upstream — so
reverse flow is visible on the image itself.

- Length uses `|v|`; direction carries the sign.
- Colour comes from the same ramp; the scale spans `min(0, vMin) … vMax` so
  negatives are not clipped.
- The hover readout shows an explicit sign (§8).

## 7. Colour bar

Results gains `<ColorBar min max />` in the same position as Processing: a sibling
of the zoom container, **outside** the zoomed/panned element
(`ImageProcessing.tsx:182`), so it does not scale with the image.

`ColorBar` is not a passive legend — it writes through to `colorbarLimits` in the
data slice (manual min/max, plus a refresh button that restores `default: true`).
Results must therefore behave like Processing:

- **Limits** come from the **active technique's resolved profile** — the same
  array the chevrons and the velocity chart use
  (`getEffectiveTechniqueData(...).resolved`), spanning `min(0, vMin) … vMax`.
- **When `colorbarLimits.default === false`**, use the locked `min`/`max` for both
  the bar and the chevron colouring, clamping values outside the range — mirroring
  `ImageProcessing.tsx:72-86`.

`getVelocityLimits` (`drawArrows.ts`), which Results already calls, still reads
the LSPIV-only `activeMagnitude` and must be made technique-aware the same way
`getGlobalMagnitudes` was in commit `c0eab6a`. Without this the bar would label the
scale with LSPIV numbers while the chevrons are coloured by STIV.

## 8. Hover readout

Reuse the existing pattern from `drawVectors.ts:40-113`: a single lazily-created
`#vectors-tooltip` div, positioned at the pointer, background
`rgba(50,50,50,0.85)`, border `#262626`, text in the glyph's colour.

Changes:

- Text becomes `+1.92 m/s` / `−1.25 m/s` — explicit sign, always shown, using the
  same `−` (U+2212) the STI badge uses rather than a hyphen.
- Unit conversion and label follow `unitSistem` exactly as now
  (`UNIT_CONVERSIONS.M_TO_FT`, `UNITS.IMPERIAL/SI.VELOCITY`).
- The hover target is a **per-station transparent hit area** covering the whole
  glyph (the swept quad from base to tip, width `W`), not the individual chevrons
  — chevrons move, so hit-testing them would make the tooltip flicker as they
  slide out from under the pointer.
- On hover the station's chevrons go to full opacity, as the arrows did.

## 9. Animation lifecycle

- Driven by one `requestAnimationFrame` loop for the whole overlay, not one per
  station.
- **Stops** when: `isReport` is true, `prefers-reduced-motion: reduce` is set, or
  the Results step is not the active step. A stopped overlay renders the chevrons
  at a fixed phase — the glyph is fully legible static; motion is an enhancement,
  never the only carrier of meaning.
- With `seeAll` on, every visible section animates; sections are already drawn in
  one pass in `VelocityVector`, so this adds glyph count, not loop count.

## 10. Files

| File | Change |
|---|---|
| `src/components/Graphs/drawVectors.ts` | Replaced by chevron drawing; keeps the tooltip pattern and the `magnitude` parameter added in `c0eab6a` |
| `src/components/Graphs/VelocityVector.tsx` | Owns the rAF loop, reduced-motion/report checks, passes streamwise vectors |
| `src/helpers/drawArrows.ts` | `getVelocityLimits` made technique-aware; arrow-polygon helpers retired if unused |
| `src/components/ImageResults.tsx` | Renders `<ColorBar>` inside `image-with-data-container` |
| `src/pages/Results.tsx` | Drop the dead `getVelocityLimits` call and commented `<ColorBar>` |

`.colorbar-container` is `position: absolute; bottom: 16px; right: 16px`
(`components.css:755`), so it anchors to the nearest positioned ancestor. Every
existing usage puts it directly inside `image-with-data-container`
(`ImageProcessing.tsx:182`, `ImageWithData.tsx:95`). Results must do the same,
which means it belongs in `ImageResults.tsx` — **not** in `pages/Results.tsx`,
where the commented-out call currently sits inside `.media-container` and would
anchor to the wrong box.

No store/type changes: `streamwise_east` / `streamwise_north` are already declared
optional on `SectionData` (`src/store/section/types.ts:40-41`), so §4's direction
source needs no new plumbing — only a guard for the optional case.

## 11. Testing

This project has no React component test infrastructure (`jest.config.ts` →
`testEnvironment: "node"`), so the overlay itself is verified manually, as in
prior rounds. The extractable pure logic is unit-tested:

1. **`count_i` from `L`/`W`** — constant pitch: 1 at very short arrows, 5 at the
   longest, clamped at 6.
2. **Direction selection** — prefers the streamwise vector; falls back to the
   section perpendicular when it is absent or zero-length; flips for negative `v`.
3. **`getVelocityLimits`** — technique-aware, spans 0, ignores `null`/`NaN`,
   honours locked `colorbarLimits` (mirrors the `getGlobalMagnitudes` tests added
   in `c0eab6a`).
4. **Sign formatting** — `+1.92` / `−1.25`, imperial conversion.

Manual verification must cover both test projects
(`oblique/20250703T1004`, `P1060716/20260728T1656`):

- The STIV `0.00` station on `P1060716` draws nothing.
- Both `NaN` bank stations draw nothing.
- The off-frame station (`x = −21.7 px` on `P1060716`) does not produce artefacts.
- Switching LSPIV↔STIV re-colours chevrons **and** re-labels the colour bar.
- Locking colour-bar limits clamps the chevron colours.
- A negative station points upstream and reads `−` on hover.
- Report export renders static chevrons.
- All three themes.

## 12. Open questions

None. Glyph, thickness, wing span, shadow, and the auto count/period rules were
all validated against both projects in the live prototype before this spec was
written.
