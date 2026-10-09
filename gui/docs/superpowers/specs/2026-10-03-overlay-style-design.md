# Overlay style: one way to draw lines and pins over a frame

Date: 2026-10-03 · Branch: ui/design-refresh

## Problem

Lines and pins drawn over video frames are styled separately in each drawer:

- The report's section line is the app's 4 px line divided by 1.2, so it is heavy on a 300 px frame.
- Left/Right bank pins are drawn only in the Cross Sections module; Results and the report never show them.
- The 6 calibration distance lines (Oblique canvas and report) have no dark halo, so they wash out over bright water next to the haloed section lines.
- A pin's head always sits 34 px (at divisor 1) straight above its tip; a point near the top or a side edge loses its head beyond the image border.
- Widths are scattered: 4 px in `drawSections`, `MARKS.STROKE_WIDTH` 3 px in `drawOblique`, 3 px in `drawIpcam`, 2.4/divisor in `obliqueSvg`, divisors 1.2 and 2 for pins. Two unused files (`LineAndText.tsx`, `drawSvgSectionLine.ts`) carry a third set.

## Goal

One module defines how an overlay line and an overlay pin look, at two sizes: `app` and `report`. Every drawer in scope uses it. L/R pins appear wherever a section is drawn (Results: active section only). No pin head is ever cut off by the image border.

## Decisions (agreed in brainstorming)

1. **Pins near a border lean inward** (option B). Rejected: flipping the pin downward (still clips at side edges), spilling the head outside the frame (needs room around the image).
2. **Every line gets a dark halo** (option A): coloured stroke over a dark casing, the treatment section lines already have. Rejected: white casing (vanishes on foamy water), plain thicker strokes (pale colours wash out).
3. **Results draws L/R pins only on the active section.** Other sections keep their line and name badge.
4. **Approach: a shared TypeScript style module** with two drawing primitives. Rejected: CSS-class styling (canvases divide widths by zoom, which CSS cannot do), per-site patches (styles would drift again).

## Design

### 1. Style table and line primitive

New `src/components/Graphs/overlayStyle.ts`:

| Token | app | report |
|---|---|---|
| Line width | 3 px | 1.5 px |
| Halo total width | 6 px, `rgba(0,0,0,0.5)` | 3 px, same colour |
| Section dash | 7.5 / 9 (2.5× / 3× line width) | 3.75 / 4.5 |
| Section end ticks | 9 px each side, width 0.6 × line | 4.5 px each side, width 0.6 × line |
| Pin divisor | 1 for screen-space pins; the zoom divisor inside zoomed layers, as today | 2 |
| Thin reference line (ipcam reprojection) | 1 px, no halo | 0.75 px, no halo |

Report values are the app values halved, except the pin divisor (1 → 2 at screen scale; the report frame is not zoomed).

`drawOverlayLine({ layer, from, to, color, size, dashed?, ticks?, zoom?, thin?, className? })`:

- Draws the halo line, then the coloured line on top, both with round caps.
- `dashed` applies the section dash to both halo and stroke; `ticks` adds perpendicular end ticks (stroke colour, no halo).
- `zoom` (default 1) divides every width, dash and tick length. Each drawer keeps its current zoom compensation: layers that use `vector-effect: non-scaling-stroke` today keep it and pass `zoom: 1`; layers that divide by `scale` today pass `zoom: scale`.
- `thin` draws the thin reference line with no halo.
- Returns the group it appended, so callers can add classes or remove it.

Colours do not change. Drawers keep reading `--d12…--d34`, `--pin-*` and the module line colours. The report is already theme-independent: `getCSSVar` reads from the `[data-theme-scope]` element (the report root, `data-theme="light"`) whenever the report is mounted, so report overlays get light-theme colours whatever the app theme. (Correction 2026-10-03: an earlier draft proposed a separate `REPORT_OVERLAY_COLORS` constant; it is not needed.)

Line kinds and users:

| Kind | Style | Used by |
|---|---|---|
| Section transect | dashed + ticks | Cross Sections, Results, Processing, report |
| Direction line | solid | same, plus UAV pixel size |
| Calibration distances | solid, 6 colours | Oblique canvas, report |
| ipcam reprojection | thin | ipcam canvas, report |

### 2. Pin lean

New pure `pinLeanAngle(tip, divisor, bounds?)` in `Graphs/pinLean.ts` returns degrees (0 = upright, positive = clockwise on screen). `bounds` is `{ x, y, width, height }` in the pin's own coordinate space. `getPinGeometry` is unchanged and still describes the upright pin.

1. No bounds, empty bounds, or the upright head circle fits inside `bounds` inset by a margin (2 px / divisor): angle 0.
2. Otherwise the smallest whole-degree angle (searching both directions, 1° to 180°) that puts the whole head circle inside the inset bounds. If both directions fit at the same angle, the one whose head is nearer the bounds' centre wins (clockwise on an exact tie).
3. If no angle fits (tip outside the bounds, or bounds smaller than the pin), the pin points straight at the bounds' centre.

`drawPin` accepts `bounds`. It draws the needle, head and label inside a `.pin-arm` group rotated by the angle about the tip; the label is counter-rotated about the head centre so it stays upright. The ring, ticks and centre dot stay outside the arm, on the tip. `updatePinLean(pin, liveTip, divisor, bounds)` re-computes and re-applies the angle while a pin is dragged. Callers supply:

- Canvases: the visible part of the image (image rect intersected with the viewport) in the pin layer's space. Screen space for uiLayer pins, image space for pins inside a scale-transformed layer.
- Report: the frame box `{ 0, 0, width, height }`.

Dragging is unchanged: the tip is what is dragged and saved; the head re-leans live as the tip nears an edge.

### 3. Changes by file

- `CrossSections/drawSections.ts`
  - `drawLine` is replaced by `drawOverlayLine`; `getSectionStyles` keeps colours only (no `resizeFactor`).
  - Module `report` uses `size: 'report'`.
  - L/R pins: drawn in `results` for the active section only, and in `report` always, at the direction-line ends (dirPoints). Static (no drag, no pointer events).
  - Cross Sections and UAV keep their current pins, now with bounds.
  - Section name badges unchanged; still hidden in the report.
- `Graphs/drawOblique.ts`, `Graphs/drawIpcam.ts`: distance and reprojection lines through `drawOverlayLine` with `zoom: scale`; pins get visible-image bounds. `MARKS.STROKE_WIDTH` deleted.
- `Graphs/obliqueSvg.ts`, `Graphs/ipcamSvg.ts`: `size: 'report'`. Oblique point 1 becomes the red `left` pin, as on the Oblique canvas. The `pinDivisor` option and `REPORT_FLOW.METHOD_PIN_DIVISOR` are removed (the style table holds the report pin size). Pins get the frame box as bounds.
- Report `SectionBlock` frame (via `ImageResults` → `DrawSectionsD3`, module `report`): thinner section, L/R pins, no badge.
- Deleted: `components/LineAndText.tsx`, `components/Graphs/drawSvgSectionLine.ts` (no importers).

### Out of scope

Station search lines, velocity vectors, quiver, masks and regions, window-size preview, section name badge styling, and each canvas's zoom mechanism.

## Testing

Jest, no browser.

- `pinLean.test.ts` (new)
  - Angle 0 without bounds or when the head fits; `getPinGeometry` tests stay as they are.
  - Top, side and corner cases lean by the minimal angle.
  - A tie leans toward the centre; when nothing fits, the pin points at the centre.
  - `visibleImageBounds` in screen and image space, at zoom 1 and zoomed/panned.
- `overlayStyle.test.ts` (new)
  - Tokens follow the table; dash and tick sizes are multiples of line width.
  - The pure `overlayLineParts` puts the halo before the stroke, divides by `zoom`, adds ticks only when asked, and `thin` has no halo.
  - `drawOverlayLine` and `drawPin` run against a small fake d3 selection (Jest runs in node, no jsdom).
- Guard test
  - No in-scope drawer sets a literal stroke width for overlay lines: they call `drawOverlayLine`/`drawPin`.
  - `LineAndText.tsx` and `drawSvgSectionLine.ts` do not exist.
- Source checks on `drawSections.ts`: `results` draws L/R pins only for the active section; `report` always draws them.
- By eye
  - Headless Chrome render of the report method and section frames with pins near edges.
  - The user's in-app pass in dark, light and Dracula: Cross Sections, Results with "see all", Oblique, ipcam, UAV.
