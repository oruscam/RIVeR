# Starting a project from a folder of frames: design

Confirmed with the user on 2026-10-08 (four choices, one design, two follow-up decisions, all
approved). Branch: `tmp/frames-import`, from `ui/design-refresh` at `8941dfb`.

## Problem

A RIVeR project can only start from a video file. A user who already has extracted frames (from
another tool, a scientific camera, or an old campaign) has to encode them into a video first, which
re-compresses measurement data.

## Idea

A folder of frames is a video whose frame rate the user types in. With the interval between frames,
the app derives everything it reads from a video today:

| Video fact | From a frames folder |
| --- | --- |
| `fps` | `1000 / interval_ms` |
| `duration` | `frame_count × interval_ms / 1000` |
| `width`, `height` | read from the first image |
| frame count | number of accepted images |

Every consumer of timing already reads `settings.video.fps` (`compute_section.py` uses
`step / fps`; `getQuiver`, `getIwaveDefaults`, `saveProjectMetadata` read `video.fps`). So the
wizard keeps its steps, and nothing changes from Pixel Transformation onwards.

## Decisions

1. **Entry point:** the footage step's existing drop zone accepts a video or a folder. No new
   button on Home, no mode switch.
2. **Storage:** frames are copied into `<project>/frames`. The source folder is never written to.
3. **Processing:** everything video has: range, step, resize factor, lens correction,
   stabilization.
4. **Timing input:** one field, time between frames in milliseconds, with the frame rate echoed
   read-only. The interval is assumed constant for the whole folder.
5. **Formats:** JPEG and PNG (`.jpg`, `.jpeg`, `.png`, case-insensitive). TIFF is out of scope:
   Chromium cannot display it, so it would need generated previews.
6. **The interval stays editable** in the Video Range step.

Rejected: encoding the frames into a video at import. It needs almost no UI work but re-compresses
the data and hides what was actually done.

## 1. Footage step (`FootageMode.tsx`)

The three footage cards are unchanged. A folder can be dropped on a card (which also picks that
type) or on the drop area, exactly like a video.

Empty drop area:

```
        Drag a video or a folder of frames
                 [ Browse video ]
             or choose a frames folder
```

- `Browse video` is the existing secondary button and dialog.
- `or choose a frames folder` is a quiet text link that opens a directory dialog. Two affordances
  are needed because Windows and Linux dialogs cannot offer files and folders at once.

After a folder is picked:

```
  gauging_2026_03/              240 frames · 1920 × 1080
  Time between frames  [ 33.33 ] ms               30 fps
```

- The folder name replaces the prompt, as the video name does today; the count and resolution sit
  on the same line as read-only text.
- The interval field appears only for a folder. It starts empty and takes focus. The fps echo is
  read-only, at most 2 decimals, and blank while the field is empty or invalid.
- Next is disabled until the interval is a positive number. A video source behaves as today.
- `Change type` clears the source and the interval.

**Checks when a folder is picked** (new IPC `inspect-frames-folder`, main process):

- Only files directly in the folder with an accepted extension count. Other files and subfolders
  are ignored.
- Order is natural filename order (`frame_2` before `frame_10`).
- Fewer than 2 images: rejected.
- Resolution is read from the first and the last image; if they differ: rejected. The backend
  checks every frame during import (section 3).
- A dropped image file, or several, is rejected with a message asking for the folder.

Failures use the existing inline error line under the form, with new translated messages.

## 2. Video Range step

The step, its form and its footer are kept. Differences for a frames project:

- **Player.** New component `FramePlayer`, used by `VideoRange.tsx` in place of `VideoPlayer` when
  the source is frames. Same transport (play/pause, scrubber, frame step), same zoom, same
  `overlay` prop so `StabilizationCanvas` works unchanged. It reads images straight from the source
  folder, loads only the current frame plus a small look-ahead, and plays at the real rate capped
  at what decoding allows. It exposes the current frame index, which `FormVideo` needs for the
  target buttons (today it reads `#video.currentTime`).
- **Start / End.** Shown as 1-based frame numbers instead of `mm:ss`. Defaults: 1 and the frame
  count. Validation: integers, `1 ≤ start < end ≤ count`. The target buttons set them from the
  player's current frame. Stored parameters stay `startTime`/`endTime` in seconds
  (`(n − 1) × interval`), so the store and `settings.video_range` keep their shape.
- **Summary line.** Unchanged: `{{count}} frames · every {{ms}} ms`, with `ms = interval × step`.
- **Step, resize factor, lens correction, stabilization.** Identical. The default resize factor
  and the lens-profile resolution check use the frames' width and height.
- **Source block** (`VideoMetadata`). Group title becomes `Source frames`. Rows: folder name,
  frame count, resolution, and `Time between frames` as an editable `field field-coord` with the
  fps as read-only text. Editing it updates the summary line immediately.

A changed interval is committed on Next together with the other parameters: `settings.video.fps`,
`time_between_frames` and `total_length` are rewritten before extraction runs, the same moment
`video_range` is written today. Next skips extraction when nothing changed; a changed interval
counts as a change and re-runs it, so downstream results are refreshed by the existing behaviour.
The interval is kept in the store exactly as typed, and read back from `time_between_frames`.

## 3. Backend

New CLI commands `frames-info SOURCE_DIR` (count, resolution, ordered file names) and
`frames-to-frames SOURCE_DIR FRAMES_DIR`, both in
`river/cli/commands/frames_to_frames.py`, with the same options as `video-to-frames`
(`--start-frame`, `--end-frame`, `--every`, `--resize-factor`, `--overwrite`, `--undistort`,
`--profile-path`, `--stabilize`, `--stabilization-regions`, `--replace`) and the same JSON result.

- `river/core/video_to_frames.py`: the per-frame work in `extract_frames` (undistort, resize, JPEG
  write at quality 95) moves into one helper used by both the video loop and a new
  `frames_to_frames` function. Video behaviour does not change.
- `frames_to_frames` lists accepted images in natural order, selects indices in
  `[start, end)` where `index % every == 0` (the rule `extract_frames` uses), reads each with
  `cv2.imread(..., IMREAD_COLOR)`, and writes `{index:010d}.jpg`. Output names and format match
  extracted frames, so the progress monitor (`*.jpg` count) and every later step work unchanged.
- A frame whose size differs from the first, or that cannot be read, stops the import with an
  error naming the file.
- Stabilization is the existing post-pass (`stabilize_frames`), which already works on a folder.

PNG frames are re-encoded to JPEG at quality 95, as video frames are. 16-bit or grayscale PNGs are
read as 8-bit colour.

## 4. Electron

- `get-frames-folder`: directory dialog, returns `{ path, name }`.
- `inspect-frames-folder`: runs the backend's `frames-info` command and returns
  `{ count, width, height, files }` or an error code. Natural sorting lives in one place, the
  Python backend, which returns the ordered file list; Electron and the player never sort. The
  same channel, called without a path, gives `FramePlayer` the open project's source images.
- `init-project` takes an optional `frames: { intervalMs }`. When present it builds the metadata
  from the inspection instead of `getVideoMetadata`, and no video conversion runs.
- `createFolderStructure` writes the `video` block below. `time_between_frames` is written
  unrounded for a frames project (the video path rounds `1 / fps` to 2 decimals today; that is left
  alone).
- `first-frame` runs `frames-to-frames` instead of `video-to-frames` when the source is frames, and
  writes the interval fields first (section 2).

`settings.json`:

```json
"video": {
  "source": "frames",
  "filepath": "/path/to/gauging_2026_03",
  "name": "gauging_2026_03",
  "frame_count": 240,
  "total_length": 8.0,
  "time_between_frames": 0.03333,
  "fps": 30.0,
  "resolution": { "width": 1920, "height": 1080 }
}
```

A `video` block without `source` is a video, so existing projects load unchanged. The project
folder is named after the source folder, as it is named after the video today.

## 5. Loading, missing source, report

- **Load.** `loadProject` and `useProjectSlice` carry `source` into `video.data`. The renderer
  branches on it in three places only: `FootageMode`, `VideoRange`/`FormVideo`, `VideoMetadata`,
  plus the report line below.
- **Missing folder.** Same as a missing video: the project opens, the Video Range form is locked,
  the extracted frames are kept, and the card offers Locate. `locate-video` opens a directory
  dialog for a frames project and accepts a folder whose resolution and frame count match
  `settings.video`.
- **Report** (`Method.tsx`, footage facts). For a frames project the name row shows the folder,
  and a row states `Image sequence · 240 frames · interval entered by the operator: 33.33 ms`. The
  interval is declared, not measured, and the report says so (product principle 2).

## 6. Copy

All new strings go into the 12 languages. English:

- `Step-2.dragAndDrop`: `Drag a video or a folder of frames`
- `Step-2.chooseFramesFolder`: `or choose a frames folder`
- `Step-2.framesSummary`: `{{count}} frames · {{width}} × {{height}}`
- `Step-2.timeBetweenFrames`: `Time between frames`
- `Step-2.Errors.noFrames`: `This folder has fewer than 2 JPEG or PNG images.`
- `Step-2.Errors.mixedSizes`: `The images in this folder do not all have the same size.`
- `Step-2.Errors.dropFolder`: `Drop the folder that contains the frames, not the images.`
- `VideoRange.sourceFrames`: `Source frames`
- `VideoRange.ExtraInfo.frameCount`: `Frames`
- `Report.Doc.imageSequence`: `Image sequence · {{count}} frames · interval entered by the operator: {{ms}} ms`

## 7. Themes and style

No new tokens or primitives. The folder link uses the existing quiet-link treatment of
`Change type`; the interval uses `field field-coord` in a `field-row`; read-only echoes use
`field-readonly`. Checked in dark, light and dracula.

## 8. Testing

- Python: `tests/test_cli_frames_to_frames.py` (range, step, resize, mixed sizes, unreadable file,
  natural order, output names) next to the existing `test_cli_video_to_frames.py`, which must stay
  green after the helper extraction.
- Electron (Jest): folder inspection (ignored files, fewer than 2, mixed sizes, order), the
  `settings.json` block, locate-folder match and mismatch.
- Renderer: frame-number validation and the seconds conversion; summary line with an edited
  interval.
- In-app: one frames project per footage type through to the report, in the three themes.

## Out of scope

- TIFF and other formats.
- Variable intervals, or reading timestamps from EXIF or filenames.
- Using the frames in place without copying.
- Appending frames to an existing project.
