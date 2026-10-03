# Camera calibration flow: Prepare screen, workspace, saved ending

Date: 2026-10-03
Branch: `ui/design-refresh`
Approved preview: `docs/superpowers/previews/2026-10-03-camera-calibration-flow.html`

## Goal

Make camera calibration easy to start and clear to finish. Today Home opens the
two-panel workspace straight away: an empty canvas, an empty strip area, and a
panel whose first content is two equal buttons (Show board, Import images) and a
drop hint. The user has nothing to look at and no guidance on what good photos
are. The ending is a green banner with a raw path link.

The new flow has three stages:

1. **Prepare** (new): a quiet screen built like the footage-type screen. Two
   numbered steps, Show the board and Import your photos, with guidance on
   shooting. No canvas.
2. **Workspace** (existing two panels): opens when the user clicks Solve and
   starts the solve at once.
3. **Saved ending**: the same done block the report uses after a save, with
   Show in folder and Calibrate another.

## Decisions (user-confirmed)

- No full-screen or canvas drop zone. Drag-and-drop lives only in the Prepare
  screen's dashed drop box, the same pattern as the footage screen.
- Prepare sits between Home and the two-panel workspace; the workspace only
  appears once there are photos to solve.
- Clicking Solve on Prepare opens the workspace and starts solving. There is no
  separate review step; the photos can be browsed on the left while it solves.
- The ending mirrors `SavedReportBlock`: accent check, what was saved, two real
  buttons.
- After a save the footer's primary button becomes **Done** (returns Home).
- Fewer than 15 photos shows a warning; Solve stays enabled.

## Stage 1: Prepare

Rendered inside the existing `.cal-overlay`, on `.default-app-container` (the
footage screen's frame). Top to bottom:

- Title: `Calibration.title`, display size (same rule as `.step-2-title`).
- Lede, subdued, one line: "Calibrate once per camera and lens. Every project
  filmed with them reuses the profile."
- An 850px two-column grid (48px gap):
  - **Step 1, Show the board.** Numeral badge (outlined circle) + heading.
    Text: "Open the board full-screen and photograph it with the camera and
    lens you use in the field." Three tips, each with a drawn icon from
    `react-icons/lu` (monitor, scan/angles, corners):
    - "Keep the screen flat and still; avoid glare."
    - "Take 15 to 30 photos from varied angles and distances."
    - "In some photos, let the board reach the image corners."
    Then a `btn btn-lg btn-secondary` **Show board** (calls `onOpenBoard`), and
    a caption: "Already have photos? Go straight to step 2."
  - **Step 2, Import your photos.** Numeral badge + heading. Text: "A folder of
    JPG or PNG photos of the board, all from the same camera." Then the drop box:
    - Empty: dashed box, hint "Drag a folder of photos here", and a
      `btn btn-lg btn-secondary` **Open folder** (calls `onOpenFolder`). The box
      is the only drop target; it uses the existing folder-or-files drop logic
      moved out of `CameraCalibration.tsx`. While dragging over it, it takes the
      footage screen's drag-over treatment.
    - Loaded: solid box on `--surface-panel` showing a folder icon + folder
      name (truncated with ellipsis, full path in `title`), "N photos ·
      W × H px", and a `btn btn-tertiary` **Change folder** (calls
      `onOpenFolder`). Step 2's badge becomes the filled accent check (same
      look as `.footage-check-badge`).
    - Too few (1 to 14 photos): under the box, a warning line with a
      `--status-fair` triangle icon: "Only N photos. 15 or more give a steadier
      calibration; you can still solve."
    - Empty folder (scan returns 0 images): under the box, an error line using
      the existing `Errors.imagesFolderEmpty` string. The box stays in its empty
      state.
- Footer: the standard `.wizard-container` with `btn-lg btn-tertiary` **Back**
  (closes to Home) and `btn-lg btn-primary` **Solve**. Solve uses
  `aria-disabled` + early-return guard + title "Import photos first" while there
  are no photos.

Positions are stable: the title has a fixed top margin, so the warning line
appearing does not move anything above it.

## Stage 2: Workspace

The existing two-panel page (canvas, strip, view switch, `FormCalibration`),
with these changes to the panel:

- Remove the Show board and Import images buttons, the drop hint
  (`DropHereText`), and the idle "Photos N" block. The panel no longer accepts
  drops (`.form-container` loses its drag handlers in this page).
- Footer Back returns to Prepare (keeping the loaded folder). Back is
  `aria-disabled` with title `Calibration.solving` while a solve runs.
- Everything else stays: progress readout while solving, error alert, grades,
  improvement tips, histogram disclosure, Solve again, the camera/lens save
  rows.
- If a solve fails, the panel shows the error and the footer action is Solve
  again (current `footerAction` behaviour for `error`). Back returns to Prepare.

## Stage 3: Saved ending

After `onSaveProfile` succeeds, the "Save as camera profile" group is replaced
by a new `CalibrationSavedBlock` built on the report's existing classes
(`.summary-saved`, `.summary-saved-head`, `.summary-saved-check`,
`.panel-actions`, `.panel-action`):

- Head: accent check + "Camera profile saved".
- Below, indented to the text: "Camera · Lens" in body text, and the saved
  path relative to the RIVeR main directory
  (`calibration_profiles/<camera>/<lens>/profile.json`) as a subdued caption,
  full path in `title`.
- Two `btn btn-secondary panel-action` buttons:
  - **Show in folder**: `onRevealPath(savedPath)`.
  - **Calibrate another**: resets the calibration store (`onReset`) and returns
    to an empty Prepare.
- Footer primary becomes **Done**: resets the store and closes to Home.
- A failed save keeps the rows and shows the existing error alert.

The green `SuccessBanner` is no longer used by calibration.

## Navigation and keyboard

| Where | Back | Esc | Primary |
|---|---|---|---|
| Prepare | Close to Home | Close to Home | Solve → workspace + start solve |
| Workspace, solving | disabled | leaves Heatmap view; else nothing | disabled (busy) |
| Workspace, idle/error/solved | → Prepare | leaves Heatmap view; else → Prepare | Solve / Save profile |
| Workspace, saved | → Prepare | as above | Done → reset + Home |

←/→ and 1/2/H keep working in the workspace only.

Which stage opens: the stage is local page state. Opening from Home shows
Prepare, unless a solve is running or finished in the store, in which case it
opens the workspace. Closing from Prepare keeps the loaded folder in the store
(reopening shows Prepare in its loaded state); Done and Calibrate another reset
it.

## Code changes

- `src/helpers/calibrationView.ts`
  - `MIN_RECOMMENDED_PHOTOS = 15` and `photoCountAdvice(count)` returning
    `'none' | 'tooFew' | 'ok'`.
  - `initialStage(status)` returning `'prepare' | 'workspace'`.
  - `footerAction` gains `saved: boolean` and `FooterAction.kind` gains
    `'done'`; when saved it returns `{ kind: 'done', blocker: null, busy: false }`.
- `src/components/Calibration/CalibrationPrepare.tsx` (new): the Prepare screen.
  Props: images count, folder path, resolution, scan error, `onOpenBoard`,
  `onOpenFolder`, `onDropFolder`, `onSolve`, `onClose`. Owns its drag-over state.
  Exported from `components/Calibration/index.ts`.
- `src/components/Forms/Components/CalibrationSavedBlock.tsx` (new): the done
  block.
- `src/components/Forms/FormCalibration.tsx`: remove the Prepare-only
  controls; take `onBack` (was `onClose`), `onDone`, `onCalibrateAnother`;
  render `CalibrationSavedBlock` once saved; footer per the table above.
- `src/pages/CameraCalibration.tsx`: holds `stage`; renders `CalibrationPrepare`
  or the workspace; moves the drop handler into Prepare; Esc and arrow keys per
  the table; Solve from Prepare sets `stage = 'workspace'` then calls `onSolve`.
- `src/hooks/useCalibrationSlice.ts`: `onOpenFolder`/`onDropFolder` report an
  empty scan so Prepare can show `Errors.imagesFolderEmpty`.
- `src/pages/pages.css`: new `.cal-prepare*` rules inside the Phase 6e block,
  each commented (the layout test requires that), built on tokens only.
- `src/translations/en/global.json`: new `Calibration.*` keys for the lede,
  step headings and texts, tips, skip caption, drop hint, Open folder, Change
  folder, photo count, too-few warning, saved title, Show in folder, Calibrate
  another, Done. Other locales fall back through `defaultValue`; their
  translations join the existing translation follow-up.

## Testing

- Unit tests for `photoCountAdvice` (0, 1, 14, 15, 30), `initialStage` (each
  status) and `footerAction` with `saved`.
- `calibrationLayout.test.ts` source assertions:
  - Prepare uses `.default-app-container` and `.wizard-container`, gates Solve
    with `aria-disabled` plus an early-return guard, and its drop handlers sit
    only on the drop box.
  - `FormCalibration` no longer references `onOpenBoard`, `onOpenFolder` or
    `DropHereText`, and no longer imports `SuccessBanner`.
  - `CalibrationSavedBlock` uses `.summary-saved` and `.panel-actions`.
  - Update the existing "page is built on the standard workspace" test so it
    accepts the page rendering either Prepare or the workspace.
- `canvasChrome.test.ts`: add `CalibrationPrepare.tsx` to the inline-position
  sweep.
- `npm test` (jest), `npm run lint` and `tsc --noEmit` pass.
- In-app check in dark, light and dracula: empty, loaded, too few, empty
  folder, solving, error, solved, saved; Back/Esc at each stage; reopen after
  closing from Prepare.

## Out of scope

- Changes to the canvas, strip, view switch, grades or histogram.
- Cancelling a running solve.
- Changing the board size or adding board options.
- Translating the new strings into the other 11 locales.
