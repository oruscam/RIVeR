# STI View Refinements

## 1. Problem

The STI view shipped in the Processing step and was exercised against real projects. Six issues came
back — all presentation defects, no incorrect data:

1. **Carousel thumbnails sit high.** The STI strips are not vertically aligned with the ◀ ▶ arrows or
   with the station number overlaid on them.
2. **The STI is not vertically centered** in its canvas; it packs to the top with dead space below.
3. **The orientation line is barely visible** in some scenes, and a single line through the middle
   gives no way to check the angle against streaks elsewhere in the frame.
4. **The badge (station / angle / velocity) has its own style**, unrelated to the tooltip shown when
   hovering a PIV arrow.
5. **Nothing is coloured by velocity.** The badge text and the orientation line use a flat accent
   colour, while the context ticks directly above them are already velocity-coloured.
6. **No colorbar.** The PIV view has one; the STI view does not.

## 2. Goals

- The STI strip, its overlaid station number, and the carousel arrows share one horizontal centre
  line; the STI itself is centred in its canvas.
- Three orientation lines instead of one, thicker, spread across the frame so the reported angle can
  be checked against streaks in more than one place.
- The badge is visually identical to the PIV arrow tooltip — same box, border, padding, radius, font,
  and the same `<value> <unit>` number format.
- Badge text and orientation lines take their colour from the velocity colormap, matching the context
  ticks already rendered above the frame.
- The STI view gets the same `ColorBar` component the PIV view uses.
- One helper decides the colour scale for ticks, lines, badge, and colorbar, so the four cannot drift.

## 3. Non-goals

- **No change to STIV's numbers.** Angle, velocity, and sign are rendered exactly as computed; this is
  presentation only.
- **No new colormap.** `createColorMap()` / `Normalize` from `commons/vectors` are reused as-is.
- **No change to the carousel's behaviour** — selection, paging, and median handling are untouched.
  Only the vertical alignment of the STI-mode thumbnail changes.
- No change to the PIV view beyond extracting the tooltip's style into a shared class (§7).

## 4. Carousel vertical alignment

`Carousel.tsx`'s `Row` renders `.img-carousel-container` with `style={style}` supplied by
`react-window`, which sets a **fixed row height** inline — overriding the stylesheet's `height: auto`.
With `display: inline-block`, a short STI strip therefore renders at the top of a tall row, while
`.img-water-mark` (`position: absolute; top: 45%`) lands near the row's vertical middle. The arrows are
centred against the list. Hence three different vertical positions.

The fix applies only in STI mode. `Processing.tsx` already passes `mode={stiMode ? 'processing' :
'analize'}`, so the container gains a modifier class when `mode === 'processing'` that makes it a flex
box with `align-items: center; justify-content: center`. The short strip then centres within the fixed
row height, and the number — still at 45% — lands on the strip.

Other modes keep `inline-block` exactly as today. PIV frames fill their row, so they are unaffected
either way; scoping the change avoids touching steps that are not being reworked.

## 5. STI centred in its canvas

`.sti-viewer` is `flex-direction: column; align-items: center`, which centres horizontally only. It
needs `height: 100%` and `justify-content: center` so the frame centres vertically inside
`.image-with-data-container`.

`ImageProcessing` passes `containerHeight={realHeight! - 90}`, reserving room for the context-tick
strip. That reservation stays; the change is only how the remaining space is distributed.

## 6. Orientation lines

Three parallel lines at the angle from `stiv_angle_profile`, centred at **25%, 50% and 75% of the
frame width**, all at `viewH / 2` vertically. Each has the length the single line uses today,
`min(viewW, viewH) * 0.8`, so behaviour at the centre is unchanged apart from thickness and colour.

Stroke width goes from 2 to **3**. Colour comes from the velocity colormap (§8) rather than
`var(--accent-color)`.

Lines are clipped by `.sti-frame`'s existing `overflow: hidden`, so the outer two may run past the
frame edge on extreme angles without visual artefacts.

## 7. Badge styled as the PIV tooltip

The PIV tooltip is built in `drawQuiver.ts` with inline d3 `.style()` calls:

```
background:    rgba(50, 50, 50, 0.85)
border:        1px solid #262626
padding:       5px 10px
border-radius: 5px
```

and its text colour is set per-arrow to that arrow's colormap colour — the STI badge is adopting an
appearance the PIV tooltip already has.

Those two colours are hardcoded, which conflicts with this project's rule that every colour resolve to
a `var(--*)` custom property. Duplicating the literals into `.sti-badge` would double the violation and
guarantee drift the first time either is touched.

So: define two custom properties in `index.css`'s three theme blocks —
`--readout-background` and `--readout-border` — and add one shared class carrying the box style.
`.sti-badge` uses it, and `drawQuiver.ts` switches from inline `.style()` calls to that class. Both
readouts then have a single source of truth, and the hardcoded values are removed rather than
multiplied.

The **dark** theme takes the current literals verbatim, so it stays pixel-identical. Light and dracula
take values from their own palettes. This is a deliberate, small behaviour change: because the values
were hardcoded, the PIV tooltip has always rendered dark-on-dark regardless of theme, which is a defect
in the light theme. Moving to theme properties fixes it as a side effect; a reviewer should expect the
light-theme tooltip to look different from before, and correct.

The badge keeps its three lines. Velocity keeps its sign (`+0.92 m/s` / `−0.92 m/s`): the sign comes
from `stiv_sign_profile` and carries flow-direction information the PIV tooltip has no equivalent for,
so dropping it to match the PIV format exactly would discard data. Unit and 2-decimal formatting match
the PIV tooltip, including the imperial conversion already applied via `UNIT_CONVERSIONS.M_TO_FT`.

**Verification note:** `drawQuiver.ts` sets tooltip text colour per-arrow at hover time. That
`.style('color', d.color)` call must survive the refactor — the shared class supplies the box, not the
text colour.

## 8. Velocity colour scale — one source

`StiViewer` already computes `stationColors` with exactly the rule requested:

```ts
const min = colorbarLimits.default === false ? colorbarLimits.min! : Math.min(...values);
const max = colorbarLimits.default === false ? colorbarLimits.max! : Math.max(...values);
```

That is: **manual limits are shared** across LSPIV and STIV (they live in one store field, so locking
them in either view applies to both), and **automatic limits use each view's own range** — STIV's from
`stiv_velocity_profile`. This is the agreed behaviour; it needs no change, only wider use.

The min/max derivation is extracted from the `stationColors` memo into a helper returning
`{ min, max, colors }`, so a single computation feeds:

- the context ticks (already),
- the three orientation lines (new),
- the badge text colour (new),
- the `ColorBar`'s bounds (new, §9).

A station whose velocity is `null` yields `'transparent'` today. For the lines and badge — where
"transparent" would mean invisible — `var(--accent-color)` is the fallback, preserving current
appearance when STIV produced no value for the selected station.

## 9. ColorBar in STI mode

`ImageProcessing`'s `stiMode` branch returns early, before the `ColorBar` render. It gains the same
`<ColorBar min={min} max={max} />`, fed by §8's helper.

`ColorBar` writes through `onSetManualColorbarLimits` to the same `colorbarLimits` store field the PIV
colorbar uses, which is what makes manual limits shared and automatic limits independent — no new
wiring. Its refresh button clears back to automatic, restoring STIV's own range.

Because the helper lives in `StiViewer` but the bounds are needed in `ImageProcessing`, it moves to a
module both import (`helpers/`), taking the profile and `colorbarLimits` and returning
`{ min, max, colors }`. This keeps the two components from computing bounds independently.

## 10. Testing strategy

No React component test infrastructure exists; UI verification is manual, consistent with prior rounds.

The colour-scale helper is pure and worth unit tests, since a silent error changes what every colour in
the view means:

- automatic limits use the profile's own min/max;
- manual limits (`default === false`) override both bounds;
- values outside manual limits clamp to the end colours rather than indexing out of range;
- a `null` entry maps to `'transparent'`;
- an all-`null` or empty profile returns empty colours without throwing.

Manual verification must cover:
- STI strip, overlaid number, and arrows share a centre line; other steps' carousels unchanged.
- The STI is vertically centred, at several window sizes.
- Three lines appear at 25/50/75%, thicker, and follow the reported angle.
- The badge is indistinguishable from a PIV arrow tooltip apart from its three lines and the sign.
- **PIV arrow tooltips still work** and are still velocity-coloured after the `drawQuiver.ts` refactor.
- Badge and lines are velocity-coloured and agree with the context tick beneath them.
- The colorbar appears in STI mode; editing min/max there changes the PIV view too; refresh returns
  STIV to its own range.
- A station with no STIV value renders a legible badge and lines.
- All three themes.

## 11. Open questions

None — line count, colorbar range semantics, and the velocity sign were confirmed before writing.
