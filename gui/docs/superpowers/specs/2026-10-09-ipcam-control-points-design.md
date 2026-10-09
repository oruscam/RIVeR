# Fixed station control points: bring the step into RIVeR's panel and overlay system

Date: 2026-10-09 · Preview: `docs/superpowers/previews/2026-10-09-ipcam-control-points.html`

## Problem

The Control Points step of fixed station footage is the one wizard step that kept the pre-redesign look (critique of 2026-10-09, 20/40):

- The result is three `.form-video-extra-info-row` lines at up to 20 px, 90 % wide, with colons in the labels, "12.46px" without a space and a camera height without a unit. A 12 px mean error is shown as a neutral fact.
- Uncertainty ellipses are a tan fill (`COLORS.ELLIPSE`, `#D2AF79` at 44 %) used nowhere else; they vanish on brown water and dry grass. The residual is a 1 px red line without a halo. The app draws the ellipse at 1/1.8 of the size the report draws.
- Pins have no label and the table has no per-point error, so the user cannot tell which point to untick. `ipcamPointErrors` already computes that error, but only the report uses it.
- Direct Solve and Optimize sit under the table and the map, below the fold once points are loaded. They look like a toggle pair, and Solve is in the footer in Oblique and UAV.
- The table is 95 % wide with a drop shadow, an uppercase accent-ruled header, centred numerals and a horizontal scrollbar that clips x / y. The map uses default d3 axes with thousands separators and unhaloed markers.

## Goal

The step reads as part of RIVeR: the row grammar of the other panels, the shared overlay style on the frame, Solve where the other footage types have it, and enough feedback to decide which points to drop. Dark, light and dracula all covered.

## Decisions (agreed in brainstorming)

1. **Ellipse as an outline, residual graded by its own error.** Rejected: neutral white residual (the grade would live only in the table), hiding the overlay until hover.
2. **Panel order: import, method, result, table, map.** Rejected: keeping today's order with a pinned solve bar, table and map as tabs.
3. **Grade badge on the mean error and a sortable Error column.**
4. **One Solve in the footer and a Method switch** (`All points` / `Optimized`), the two methods treated equally. Rejected: two buttons in the footer (differs from Oblique and UAV, two primary-weight buttons beside Next), one Solve that runs both methods and compares them (runs Optimize every time, store must hold two solutions).
5. **Grades: good under 5 px, fair from 5 to 10 px, bad over 10 px**, for the mean and for each point.
6. **Pixel x / y leave the table**; the active point's values show in a line under it.
7. **Table cells keep tight side padding** so six columns fit the panel without a horizontal scrollbar. Amended after the in-app check at the 400 px minimum panel: 4 px, not 6 px, and the table extends 8 px past the row inset on each side; with 6 px the Error column was cut off.

## Design

### 1. Grading

New `src/helpers/ipcamErrorGrade.ts`:

```ts
export const IPCAM_ERROR_LIMITS = { GOOD: 5, FAIR: 10 }; // px
export type ErrorGrade = 'good' | 'fair' | 'bad';
export const ipcamErrorGrade = (errorPx: number | null): ErrorGrade | null
```

`null` in gives `null` out (stored errors that no longer line up with the points). Under 5 is good, 5 up to and including 10 is fair, over 10 is bad. The panel, the table and the frame all call this one function.

### 2. On the frame (`drawIpcam.ts`, `ipcamSvg.ts`)

Theme-invariant, like the pins.

- **Ellipse:** `fill: none`; a `rgba(0,0,0,0.5)` halo stroke under a white (`--overlay-line`) stroke. Widths follow `OVERLAY_STYLE`: a new `ELLIPSE_WIDTH` of 1.5 px (app) and 0.75 px (report), halo at `OVERLAY_RATIOS.HALO` times that, both divided by the zoom scale in the app. A shared `drawOverlayEllipse` in `overlayStyle.ts` is used by both drawers.
- **Ellipse size:** the backend (`calculate_uncertainty_ellipses`) returns `width` and `height` as full axis lengths (`2 * sqrt(chi2 * eigenvalue)`) and `angle` in degrees. Both drawers therefore draw `rx = width / (2 * factor)`, `ry = height / (2 * factor)`, rotated by `angle` degrees. The app's `/ 1.8` goes, and the report stops drawing the ellipse at twice its size. The comments in `store/ipcam/types.ts` ("radians") are corrected.
- **Residual:** `drawOverlayLine` without `thin`, at a new `RESIDUAL_WIDTH` of 2.5 px (app) and 1.25 px (report) with its halo; the dot is `r = 3.5` with a `--pin-ink` outline. Colour comes from the point's grade through new fixed tokens `--residual-good: #62C655`, `--residual-fair: #F5BF61`, `--residual-bad: #ED6B57` (the pin palette's values, declared in the bare `:root` block). A point with no error value draws white. The `thin` option of `overlayLineParts` loses its only user and is removed, with its row in the overlay-style spec's table.
- **Active point:** a chip beside the pin head on `--canvas-chrome`: label in 600, grade dot, error with unit ("PTO 37 · 21.80 px"). Before a solve it shows the label only. It leans inward near a border with the same bounds the pin uses. Drawn in the app only.
- **Points left out of the solve:** the `muted` pin at 0.7 of the normal size, no ellipse, no residual (today's rule for the overlays; the size is new).
- Colour is never the only cue: the residual's length is the error, and the number is in the table and the chip.

### 3. The panel (`FormIpcam.tsx`, `Ipcam.tsx`)

Order inside `.panel-section`:

1. **Import row:** unchanged (`.panel-actions`, `data-complete`), with the drop hint.
2. **Method row:** `.field-row.field-row-top`, label "Method", control a `.seg` with two buttons, `All points` (`direct-solve`) and `Optimized` (`optimize-solution`). The choice is local state initialised from `cameraSolution?.mode`, defaulting to `direct-solve`. Changing it does not solve. `Optimized` is `aria-disabled` under 7 ticked points, with a `title` giving the reason.
3. **Result block** (only when `cameraSolution` exists): read-only `.field-row`s, 32 px tall.
   - "Mean reprojection error": value at `--text-section`, 600, tabular, unit "px" in subdued caption text, then the `.badge` for its grade.
   - "Points used": `numPoints` "of" the number of placed points.
   - "Camera height": two decimals with the unit (m or ft).
   - When the grade is fair or bad and the solve was All points, one caption line (Optimized picks its own points, so unticking does not change it): "Untick the points with the largest error, then solve again."
   - If the method switch differs from `cameraSolution.mode`, the block stays as it is; it describes the last solve.
4. **Points table**, then **map**.

Footer (`Ipcam.tsx`): a `.processing-run` block with one `btn btn-lg btn-primary` "Solve" (`Commons.solve`, id `solve-ipcam`) above `WizardButtons`, as in `Oblique.tsx`. Disabled when `points === null`, the backend is working, or fewer points are ticked than the method needs (6 for All points, 7 for Optimized). Under the limit, a caption line under the Method row says "Tick at least N points to solve."; it replaces the untick hint while it shows.

The body takes the `processing-body` flex so the footer never moves.

### 4. Points table (`IpcamGrid.tsx`, `components.css`)

- Columns: select, Label, East, North, Z, Error px. x and y are removed.
- Error comes from `ipcamPointErrors(points, cameraSolution)` joined by `index`; blank before a solve and for points not placed on the image. The cell shows a 7 px grade dot (fair and bad only) and the value in 600.
- The Error header sorts: first click worst first, second click best first, third click back to file order. Rows with no error go last. Sorting must keep `rowKeyGetter` on the point index so selection and `onChangePointSelected` still address the right point.
- A point left out of the solve keeps its error, with the row in `--text-subdued`.
- Active point: accent tint on the row and a 2 px accent bar on its left edge. Clicking anywhere on a row except the checkbox activates the point (today only the label cell does).
- Chrome, scoped to `#ipcam-grid`: full width of the panel section, no box shadow, header at `--text-caption` 600 in `--text-subdued` with a 1 px `--border-color` rule (no uppercase, no accent rule), cells at `--text-caption` tabular, numbers right-aligned, label left-aligned, 4 px side padding, 30 px rows. No horizontal scrollbar at the 400 px minimum panel width.
- Footer line under the rows: "{label} on the frame" left, "x … · y … px" right, for the active point; hidden when none is active.
- Before import: no placeholder rows. The table is not rendered and the drop hint stands alone.

The Results grid and other `.grid` users are not touched.

### 5. Map (`PointsMap.tsx`, `pointsMapSvg.ts`)

- Width is the panel section's width (measured from the container), not `screenWidth * 0.26`; height keeps the ortho extent's aspect ratio, capped at the width.
- Axes: tick labels are plain integers without separators, 11 px, `--text-subdued`; axis lines `--border-color`; three ticks per axis. Colours come from CSS classes, not literals, so all three themes work. The hard-coded `'white'` strokes are removed.
- Markers on the ortho image: crosses with a dark halo; the active point in white, 2.5 px.
- Scale bar: a rounded value with no decimals ("30 m"), in `--text-primary`.
- The map stays inert as today (`pointer-events: none`): wheel and drag over it scroll the panel.

### 6. Copy and translations

New keys under `ControlPoints3d` in all 12 languages: `method`, `allPoints`, `optimized`, `meanReprojectionError`, `pointsUsed`, `pointsUsedOf`, `errorPx`, `onTheFrame`, `hintUntick`, `hintMinPoints`, `optimizedNeedsPoints`. The grade words reuse the existing `Calibration.grade.*` keys and Solve reuses `Commons.solve`. `cameraHeight` loses its colon and trailing space. `directSolve`, `optimize`, `reprojectionErrors` and `numberOfPoints` are deleted once nothing reads them.

### 7. What does not change

The backend call and its `mode` values, the store shape, the report's `CalibrationSheet` layout (its frame overlay picks up the new ellipse and residual through `ipcamSvg`), the import flow, the carousel, UAV and Oblique.

## Testing

- `ipcamErrorGrade.test.ts`: the boundaries (4.99, 5, 10, 10.01) and `null`.
- `overlayStyle.test.ts`: ellipse and residual widths at both sizes and under zoom; no `thin` left.
- A sort helper for the table rows (pure function): worst first, best first, file order, missing errors last.
- `overlayStyleGuard.test.ts`: extend so a literal colour or width for the ellipse or residual in `drawIpcam.ts` / `ipcamSvg.ts` fails. Check that the guard fails when the rule is broken before trusting it green.
- Theme contrast: the grade dot against the table's two row colours in each theme reaches 3:1.
- In-app check in dark, light and dracula with a real fixed-station project: before import, after import, after each method, with a point unticked, sorted by error, and at the 400 px minimum panel width.

## Out of scope

Running both methods and comparing them; batch actions such as "untick the worst N"; pin labels on every point; changes to the solver.
