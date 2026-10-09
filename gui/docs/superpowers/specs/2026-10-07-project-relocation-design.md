# Opening moved projects and projects with missing inputs: design

Confirmed with the user on 2026-10-07 (three choices, then four design sections, all approved).

## Problem

A RIVeR project stores absolute paths. `settings.json` holds `xsections`, `piv_results`,
`transformation.matrix`, `stabilization_regions_path`, `camera_solution_3d`, `grp_3d`,
`rectification_3d_images` and `video.filepath`; each section in `xsections.json` holds `bath`, the
bathymetry CSV.

Moving a project folder (the user wants to move about 110 old cases from `~/river` to
`~/Documents/river_cases`) breaks it:

- `xsections` is read from, and written to, the stored path. If the old folder is gone, sections don't
  load. If an old copy is still there, the app edits that copy instead of the opened project.
- `stabilization_regions_path` and `camera_solution_3d` are read from the stored path.
- A missing video makes the whole load fail: `getVideoMetadata` throws. Today 24 of the 119 projects
  under `~/river` already point at a video that no longer exists.
- The bathymetry CSV usually stays outside the project. The Python backend re-reads it on every
  discharge computation (`compute_section.py`) and when it builds the island mask
  (`define_roi_masks.py`), and the GUI re-reads it on load to draw the profile. If it moves, the
  project can no longer be recomputed.

`piv_results` is already resolved against the opened folder (`pivResultsPath.ts`); that is the
pattern to extend. Python reads no paths from `settings.json` (only `user_masks` points), so every
change here is in Electron and the renderer.

## Decisions

1. **Paths:** always resolve against the opened folder, and keep writing absolute paths, so
   RIVeR 3.7 can still open a project saved by 3.8 (option C).
2. **Missing video:** open the project anyway, warn, and offer to locate it (option A).
3. **External inputs:** copy the bathymetry into the project, both for new imports and for old
   projects on load (option A). The video and the fixed-camera image folder are never copied,
   because of their size.

**Corrections found while planning (2026-10-07):**

- `grp_3d` is not an external file: `calculate3dRectification` always writes `grp_3d.json` inside
  the project. It is a project-owned key (section 1), and there is no `locate-grp3d` action.
- RIVeR has 12 languages, not 5. All new copy goes into all 12.
- Step alerts in the store are global and never cleared on navigation, so the project-issue cards are
  not stored there. They are derived per step from the project's issues (section 4).
- Today a missing bathymetry drops the whole section on load (`onLoadCrossSections` catches the
  error and skips it). The section must load with an empty profile instead.

## 1. Project-owned files

New module `electron/ipcMainHandlers/utils/relocateProject.ts`, called first by `handleLoadProject`.

- Project-owned keys: `xsections`, `piv_results`, `transformation.matrix`,
  `stabilization_regions_path`, `camera_solution_3d`, `grp_3d`. When one is set, its value becomes
  `join(projectFolder, basename(storedValue))`. The stored folder is ignored.
- A key that is unset (`null` or missing) stays unset.
- If the resolved file does not exist, the key still points into the project folder, and the load
  treats it as a missing optional file, as it does today. It **never** falls back to the stored path.
- If any value changed, `settings.json` is rewritten (absolute paths, same format) and `river.log`
  gets one line: `project moved from <old folder> to <new folder>`. The old folder is taken from the
  stored `xsections` or `piv_results` value, whichever is set first.
- The corrected settings object is what `loadProject` returns to the renderer. Renderer code that
  reads paths straight from `settings` (the stabilization regions, for example) therefore receives
  correct paths without being touched.
- `PROJECT_CONFIG.xsectionsPath` and `PROJECT_CONFIG.matrixPath` are set from the corrected values.

## 2. External input: bathymetry

Resolution order on load, for each section's `bath` in `xsections.json`:

1. A file with the same basename exists in the project folder: use it. This covers the
   `*_modified.csv` copies made today, copies made on earlier loads, and moved projects.
2. Otherwise the stored path exists: copy it into the project folder and use the copy.
3. Otherwise it is **missing**. Keep the stored value and report it in the load result:
   `missingInputs: [{ kind: 'bathymetry', section: 'CS_default_1', path }]`.

Rules:

- A CSV shared by several sections is copied once.
- If the project folder already has a file with that basename but different content, the copy gets a
  suffix (`bathy_2.csv`, `bathy_3.csv`, …). Nothing in the project is ever overwritten.
- Changed paths are written back to `xsections.json` and logged in `river.log`. Only the `bath`
  values are rewritten, in place in the raw text: the file can hold bare `NaN` tokens written by
  Python, and a parse/stringify round trip would turn them into `null`.

From 3.8 on, at import time, `get-bathimetry` always copies the CSV into the project folder, not only
when it converts or transforms it, and returns the copy's path. A file already inside the project
folder is used as it is.

`rectification_3d_images` (fixed-camera image folder) is not copied. If it is missing it is reported
as `{ kind: 'ipcamImages', path }` and handled like the video (section 4).

## 3. Missing video

- On load, if `video.filepath` does not exist, ffprobe is not called. The video metadata is built
  from `settings.video`: `resolution.width`, `resolution.height`, `fps`, `total_length` (duration)
  and `name`; `creation` is empty. The load result carries `videoMissing: true`.
- Locked while the video is missing: video playback in the video/range step, and anything that
  re-extracts frames (changing range or step, redoing stabilization). Everything that works from the
  extracted frames keeps working: masks, sections, processing, results, report.
- **Locate:** a new IPC handler `locate-video` opens a file picker, then compares the chosen video's
  resolution and fps with `settings.video`.
  - They match: update `video.filepath` in `settings.json`, `PROJECT_CONFIG.videoPath` and
    `PROJECT_CONFIG.defaultFilesPath`, and unlock.
  - They differ: refuse with the two values side by side ("this video is 1920×1080 at 25 fps; the
    project was made with 4096×2160 at 30 fps"), and let the user pick another or cancel. A different
    video is never accepted, since frames, matrix and masks depend on its dimensions.

## 4. User interface

- **Pattern:** the existing step alert cards (`StepAlert`, level `warning`). They gain an optional
  action: `{ label, action }`, where `action` is a serializable id (`'locate-video'`,
  `'locate-bathymetry:CS_default_1'`, `'locate-ipcam-images'`) that `StepAlertList` maps to the
  matching call. No modals, no toasts; the card stays until the cause is fixed.
- **Where they live:** the project slice holds the issues (`videoMissing`, `missingInputs`). Each page
  passes its step's cards to `StepAlertList` as extra alerts, built by a pure function from those
  issues. They are not added to the global alert store.
- **Video:** in the video/range step: "Video *DJI_0083.MP4* not found. The extracted frames are still
  available. [Locate…]". The player shows the first frame as a still. Controls that would re-extract
  frames are disabled, with a tooltip giving the reason.
- **Bathymetry:** in the cross-sections step, one card per affected section: "Bathymetry for
  *CS_default_1* (*bathy.csv*) is missing. [Locate…]". The section's profile stays empty. Processing
  shows the same card, and Test, Analyze and the Results recompute refuse to call the backend while
  a bathymetry is missing. Locate uses a new IPC handler `locate-bathymetry`: it runs the same import
  as `get-bathimetry` (normalization, copy into the project), writes the new `bath` into
  `xsections.json` for that section, and the section keeps its saved water level.
- **Fixed-camera images:** same card in the 3D rectification step; Locate reuses the existing
  `ipcam-images` folder picker.
- **Moved project:** no message. The fix is silent and only logged in `river.log`.
- **Copy:** in all 12 languages.

## Testing

- Jest, `relocateProject`: project not moved; moved; owned file missing (never falls back to the old
  path); key unset; `settings.json` rewritten only when something changed; log line written.
- Jest, external inputs: found in the project; copied from outside; missing; same name with different
  content gets a suffix; one CSV shared by two sections is copied once; `NaN` tokens in
  `xsections.json` survive the rewrite.
- Jest, `get-bathimetry`: an untransformed CSV is copied into the project.
- Jest, load: a section whose bathymetry is missing still loads, with an empty profile.
- Jest, video: fallback metadata from `settings.video`; load succeeds with no video; `locate-video`
  accepts a matching video and refuses a mismatched one.
- In app: a copy of DJI_0083 moved to another folder, with its video and `bathy.csv` renamed away.
  It opens, shows both cards, locating fixes each one, and processing runs. Checked in the dark,
  light and dracula themes.

## Out of scope

- Relative paths in `settings.json` (they would break 3.7).
- Searching the disk for a missing video by name (DJI names repeat between flights).
- A batch script that fixes every project without opening it. Opening a project fixes it.
- Moving `~/river` itself. That comes after this ships, once its local branches and uncommitted
  changes are backed up.
