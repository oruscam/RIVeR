# STIV and iWave skip stations that are fully masked: design

Confirmed with the user on 2026-10-06 (impeccable shape brief + two follow-up answers).

## Problem

A STIV or iWave station whose sampled area sits entirely under a mask (bridge, boat, trees) cannot
produce a real value, yet both engines compute it anyway: STIV runs its CNN on an all-NaN STI, iWave
fits a spectrum on a black window. That wastes time and can return junk. The operator also cannot
tell, after a run, *why* a station is empty.

## Rule

- **Mask** = the full `final_mask` the GUI already passes to the analysis (`--mask`, `.npy`, 1 = keep,
  0 = masked): section ROI AND user polygons. A sample point is *hidden* when it is outside the image
  or its mask value is 0.
- **STIV**: skip a station only when *every* sampled point of its search line is hidden. Partly
  visible lines are computed as today.
- **iWave**: skip a station only when *every* point of the exact window it would crop (after border
  clamping) maps to a hidden raw-frame pixel. The existing dry-window rule runs first; a station that
  is both dry and masked is reported as `"dry"`.
- **LSPIV**: unchanged.
- A skipped station keeps its position; its velocity (and sigma/angle/quality/depth) is `None`; no
  STI PNG / spectrum is written for it.
- New per-station list on each section: `stiv_skip_profile` and `iwave_skip_profile`, values
  `"masked" | "dry" | null` (STIV only ever writes `"masked"` or `null`). They join `STIV_COLUMNS` /
  `IWAVE_COLUMNS` so they are stripped with the rest of the technique's columns.
- iWave's params record gains `skipped_masked` next to `skipped_dry`.
- If the mask's shape differs from the frames' shape, the orchestrator logs it and runs STIV/iWave
  without a mask (never a crash, never a wrong skip).
- **Discharge**: a skipped station is a gap like any other (Froude-filled when Interpolate is on,
  blank when off). No change to `techniqueDischarge.ts`.

## GUI

- **What the next Analyze will do** (Frames canvas, Processing panel) comes from a live frontend
  preview: the mask PNG overlay already shown on Processing (`processing.maskPath`, alpha > 0 =
  masked) is sampled along each STIV search line and over each iWave window. It updates as the
  station count, ROI height, iWave window or masks change.
- **What the last run did** (Space-time / Spectrum carousels and viewers, Results station tag,
  report) comes from the backend `*_skip_profile`.
- **Frames canvas**: a fully masked STIV line is a thin dotted line in the muted pin colour (never a
  velocity colour), with a ` ⊘` badge suffix (same convention as ` ✎` and ` !`). Distinct from the
  dashed "ran, no value" state by dash pattern and glyph, not colour alone. Hover still works.
- **iWave has no canvas layer**: its preview shows only in the panel line.
- **Processing panel**: under the STIV row and under the iWave row, a muted note
  "N stations under a mask will be skipped", only when N > 0 and the technique is on. When every
  station is masked: "Every station is under a mask: STIV will compute nothing" (same note style).
- **Space-time / Spectrum carousels**: lists become station-aligned (one tile per station). A station
  without an image gets a quiet placeholder tile: "Masked: not computed", "Dry: not computed", or
  "No result" when there is no recorded reason. The viewer shows the same text in place of the image.
- **Results station tag**: the technique row's quality cell says `masked` or `dry`, plus
  ` · interpolated` when the station was filled. Never a warning colour.
- **Report**: in the Processing block, under STIV / iWave, a line "Stations under a mask (not
  computed)" listing ranges per section ("Section 1: 6–9, 12"). In each section's station table, a
  masked station of the section's active technique gets a `†` and a footnote
  "† under a mask: STIV not computed".

## Untouched

LSPIV computation and display, technique colours, the velocity colour scale, the tuned and
low-confidence states, `techniqueDischarge.ts`.
