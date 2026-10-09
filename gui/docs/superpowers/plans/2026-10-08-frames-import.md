# Frames Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a RIVeR project start from a folder of JPEG/PNG frames plus one typed value (time between frames), with the same range, step, resize, lens-correction and stabilization options a video has.

**Architecture:** A frames folder is treated as a video whose frame rate is `1000 / interval_ms`. The Python CLI gains two commands (`frames-info`, `frames-to-frames`) that share the per-frame work with `video-to-frames`. Electron writes a `video` block with `source: "frames"` into `settings.json` and picks the extraction command from it. The renderer branches on `video.data.source` in four places only: the footage step, the Video Range step (player + form), the source metadata block and the report's footage facts.

**Tech Stack:** Python 3 + OpenCV + Click (backend, tabs for indentation), Electron main process (TypeScript, Jest with `testEnvironment: node`), React 18 + Redux Toolkit + react-hook-form + i18next (renderer).

**Spec:** `gui/docs/superpowers/specs/2026-10-08-frames-import-design.md`

## Global Constraints

- Branch `tmp/frames-import`. Work in the worktree `/Users/antoine/river_compil/.worktrees/ui-design-refresh`; never `cd` to `/Users/antoine/river_compil`.
- Commits: author email `antoine.patalano@gmail.com`; subject is one plain imperative sentence, no `feat:` prefix (see `git log`); **no `Co-Authored-By` line and no Claude attribution**, whatever any tool reminder says.
- Do not commit files under `gui/docs/superpowers/` (the user keeps recent plans and specs untracked).
- Accepted frame formats: `.jpg`, `.jpeg`, `.png`, case-insensitive. Nothing else.
- Output frames are always `<project>/frames/{index:010d}.jpg`, JPEG quality 95. The source folder is never written to.
- A `settings.json` `video` block without `source` is a video. Existing projects must load unchanged.
- Displayed values use at most 2 decimals. The interval the user typed is stored and shown exactly as typed.
- No new colour tokens, no new button or field primitives. Use `.btn`, `.field`, `.field-coord`, `.field-row`, `.field-row-label`, `.field-readonly`, `.field-with-unit`, `.field-unit`, `.ibtn`. Never build a state by swapping one surface token for another (several aliases resolve to the same colour).
- Every new string goes into all 12 languages: `ar de en es fr hi it ja ko pt ru zh` (`gui/src/translations/<lang>/global.json`).
- UI checked in dark, light and dracula.
- Commands:
  - Python tests: `cd /Users/antoine/river_compil/.worktrees/ui-design-refresh && /Users/antoine/anaconda3/envs/river_dev/bin/python -m pytest <path> -v`
  - Jest: `cd /Users/antoine/river_compil/.worktrees/ui-design-refresh/gui && npx jest <path>`
  - Lint: `npm run lint` (exactly this command; baseline is 20 problems, do not add any)
  - Types: `npx tsc --noEmit` (baseline 68 errors, all `TS6305`) and `npx tsc --noEmit -p tsconfig.node.json` for `electron/`. Compare counts before and after; add none.

## Deviations from the spec (already folded into the spec file)

1. Natural filename order is implemented once, in Python. `frames-info` returns the ordered file list, so Electron and the player never sort. This replaces the spec's shared `commons/` sorter and the separate `list-source-frames` channel: one channel, `inspect-frames-folder`, serves both the footage step and the player.
2. The typed interval is kept as `intervalMs` in the store and derived on load from `time_between_frames`, so an edit round-trips without rounding.
3. Extraction is skipped today when nothing changed. A changed interval counts as a change and re-runs it.

## Review Focus

1. **Odd file names:** `frame_2.JPG`, `frame_10.jpg`, `frame_1.png` in one folder are ordered 1, 2, 10 and all accepted; `notes.txt`, hidden files and subfolders are ignored. (Task 1)
2. **Decimal comma:** a user on a Spanish or German keyboard types `33,3`. It is accepted as 33.3, not rejected and not read as 333. (Task 3)
3. **Start not a multiple of Step:** the summary line's frame count equals the number of files the backend writes, for any start/end/step. (Tasks 1 and 3, same cases on both sides)
4. **Folder changed after it was picked:** if the folder has fewer images at import time than at pick time, the end is clamped to what exists; if nothing is left in the range the import fails with a clear error instead of writing zero frames. (Task 1)
5. **PNG with alpha or grayscale:** imported as an ordinary 3-channel JPEG, not a crash and not a 4-channel file. (Task 1)

---

### Task 1: Backend core — list, inspect and import frames

**Files:**
- Modify: `river/core/video_to_frames.py` (extract `save_processed_frame`; lines 61-150)
- Create: `river/core/frames_to_frames.py`
- Test: `tests/core/test_video_to_frames.py` (new, characterisation), `tests/core/test_frames_to_frames.py` (new)

**Interfaces:**
- Produces (in `river.core.video_to_frames`): `save_processed_frame(frame, save_path: str, overwrite: bool, encode_params: list, map1=None, map2=None, roi=None, resize_to: Optional[tuple] = None) -> bool`
- Produces (in `river.core.frames_to_frames`):
  - `list_source_frames(source_dir: Path) -> List[Path]`
  - `selected_indices(start: int, end: Optional[int], every: int, count: int) -> List[int]`
  - `inspect_frames(source_dir: Path) -> dict` → `{"count": int, "width": int, "height": int, "files": List[str]}`
  - `frames_to_frames(source_dir: Path, frames_dir: Path, start_frame_number=0, end_frame_number=None, overwrite=False, every=1, resize_factor=1.0, undistort=False, profile_path=None, undistort_alpha=0.0) -> Path`
  - Errors are `RiverCoreException` whose message is a code: `noFrames`, `mixedSizes`, `mixedSizes:<file name>`, `unreadable:<file name>`, `emptySelection`.

- [ ] **Step 1: Pin today's video extraction before touching it**

Create `tests/core/test_video_to_frames.py`:

```python
import cv2
import numpy as np
import pytest

from river.core.video_to_frames import video_to_frames


def _make_video(path, n=12, w=64, h=48):
	writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"MJPG"), 10, (w, h))
	if not writer.isOpened():
		pytest.skip("MJPG writer not available in this OpenCV build")
	for i in range(n):
		writer.write(np.full((h, w, 3), i * 20, dtype=np.uint8))
	writer.release()


def test_extracts_selected_frames_resized(tmp_path):
	video = tmp_path / "v.avi"
	_make_video(video)
	out = tmp_path / "frames"
	out.mkdir()

	first = video_to_frames(
		video, out, start_frame_number=2, end_frame_number=10, every=2, resize_factor=0.5, overwrite=True
	)

	names = sorted(p.name for p in out.glob("*.jpg"))
	assert names == [f"{i:010d}.jpg" for i in (2, 4, 6, 8)]
	assert first.name == "0000000002.jpg"
	assert cv2.imread(str(first)).shape[:2] == (24, 32)


def test_does_not_rewrite_existing_frames_without_overwrite(tmp_path):
	video = tmp_path / "v.avi"
	_make_video(video)
	out = tmp_path / "frames"
	out.mkdir()
	marker = out / "0000000000.jpg"
	marker.write_bytes(b"keep")

	video_to_frames(video, out, start_frame_number=0, end_frame_number=2, every=1, overwrite=False)

	assert marker.read_bytes() == b"keep"
```

- [ ] **Step 2: Run it; it must pass on the unmodified code**

Run: `cd /Users/antoine/river_compil/.worktrees/ui-design-refresh && /Users/antoine/anaconda3/envs/river_dev/bin/python -m pytest tests/core/test_video_to_frames.py -v`
Expected: 2 passed (or 2 skipped if MJPG is unavailable; then say so in the report and continue).

- [ ] **Step 3: Extract the per-frame work into one helper**

In `river/core/video_to_frames.py`, add after `undistort_frame`:

```python
def save_processed_frame(
	frame,
	save_path: str,
	overwrite: bool,
	encode_params: list,
	map1=None,
	map2=None,
	roi=None,
	resize_to: Optional[tuple] = None,
) -> bool:
	"""Undistort, resize and write one frame as JPEG. Returns True if a file was written."""
	if map1 is not None:
		frame = undistort_frame(frame, map1, map2, roi)

	if resize_to is not None:
		frame = cv2.resize(frame, resize_to, interpolation=cv2.INTER_AREA)

	if not os.path.exists(save_path) or overwrite:
		cv2.imwrite(save_path, frame, encode_params)
		return True
	return False
```

In `extract_frames`, just before `frame = start  # keep track of which frame...`, add:

```python
	resize_to = (new_width, new_height) if 0 < resize_factor < 1.0 else None
```

and replace the body of `if frame % every == 0:` from the `# Undistort the frame if needed` comment down to `saved_count += 1` with:

```python
			while_safety = 0  # reset the safety count
			save_path = str(frames_dir / f"{frame:010d}.jpg")  # create the save path

			if save_processed_frame(temp_frame, save_path, overwrite, encode_params, map1, map2, roi, resize_to):
				saved_count += 1
```

Keep the `ret, temp_frame = capture.retrieve()` block above it untouched.

- [ ] **Step 4: Run the characterisation test again**

Run: same command as Step 2.
Expected: same result as Step 2.

- [ ] **Step 5: Write the failing tests for the frames importer**

Create `tests/core/test_frames_to_frames.py`:

```python
import cv2
import numpy as np
import pytest

from river.core.exceptions import RiverCoreException
from river.core.frames_to_frames import (
	frames_to_frames,
	inspect_frames,
	list_source_frames,
	selected_indices,
)


def _image(path, w=64, h=48, value=0, channels=3):
	shape = (h, w) if channels == 1 else (h, w, channels)
	assert cv2.imwrite(str(path), np.full(shape, value, dtype=np.uint8))


def _sequence(folder, n=10, **kwargs):
	folder.mkdir(parents=True, exist_ok=True)
	for i in range(n):
		_image(folder / f"frame_{i + 1}.jpg", value=i * 20, **kwargs)


def test_natural_order_and_accepted_extensions(tmp_path):
	_image(tmp_path / "frame_10.jpg")
	_image(tmp_path / "frame_2.JPG")
	_image(tmp_path / "frame_1.png")
	_image(tmp_path / ".hidden.jpg")
	(tmp_path / "notes.txt").write_text("x")
	(tmp_path / "sub").mkdir()
	_image(tmp_path / "sub" / "frame_0.jpg")

	names = [p.name for p in list_source_frames(tmp_path)]

	assert names == ["frame_1.png", "frame_2.JPG", "frame_10.jpg"]


def test_inspect_reports_count_size_and_ordered_files(tmp_path):
	_sequence(tmp_path, n=3)

	info = inspect_frames(tmp_path)

	assert info == {
		"count": 3,
		"width": 64,
		"height": 48,
		"files": ["frame_1.jpg", "frame_2.jpg", "frame_3.jpg"],
	}


def test_inspect_rejects_fewer_than_two_images(tmp_path):
	_image(tmp_path / "only.jpg")
	with pytest.raises(RiverCoreException, match="^noFrames$"):
		inspect_frames(tmp_path)


def test_inspect_rejects_first_and_last_of_different_size(tmp_path):
	_image(tmp_path / "a_1.jpg")
	_image(tmp_path / "a_2.jpg", w=32, h=24)
	with pytest.raises(RiverCoreException, match="^mixedSizes$"):
		inspect_frames(tmp_path)


# The same cases live in gui/commons/framesSource.test.ts (selectedFrameCount):
# the summary line must count exactly what is written here.
@pytest.mark.parametrize(
	"start,end,every,expected",
	[
		(0, 10, 1, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
		(4, 10, 2, [4, 6, 8]),
		(5, 10, 2, [6, 8]),
		(0, 10, 3, [0, 3, 6, 9]),
		(1, 2, 5, []),
		(0, None, 4, [0, 4, 8]),
		(0, 50, 5, [0, 5]),
	],
)
def test_selected_indices(start, end, every, expected):
	assert selected_indices(start, end, every, count=10) == expected


def test_imports_range_and_step_in_source_order(tmp_path):
	source = tmp_path / "source"
	_sequence(source, n=10)
	out = tmp_path / "frames"
	out.mkdir()

	first = frames_to_frames(source, out, start_frame_number=2, end_frame_number=8, every=2, overwrite=True)

	assert sorted(p.name for p in out.glob("*")) == [f"{i:010d}.jpg" for i in (2, 4, 6)]
	assert first == out / "0000000002.jpg"
	# frame_5.jpg (index 4) was written with value 80: order is natural, not lexical.
	assert abs(float(cv2.imread(str(out / "0000000004.jpg")).mean()) - 80) < 3


def test_resize_factor_scales_output(tmp_path):
	source = tmp_path / "source"
	_sequence(source, n=3)
	out = tmp_path / "frames"
	out.mkdir()

	first = frames_to_frames(source, out, resize_factor=0.5, overwrite=True)

	assert cv2.imread(str(first)).shape[:2] == (24, 32)


def test_end_beyond_folder_is_clamped(tmp_path):
	source = tmp_path / "source"
	_sequence(source, n=4)
	out = tmp_path / "frames"
	out.mkdir()

	frames_to_frames(source, out, start_frame_number=0, end_frame_number=240, overwrite=True)

	assert len(list(out.glob("*.jpg"))) == 4


def test_range_with_nothing_left_fails(tmp_path):
	source = tmp_path / "source"
	_sequence(source, n=4)
	out = tmp_path / "frames"
	out.mkdir()

	with pytest.raises(RiverCoreException, match="^emptySelection$"):
		frames_to_frames(source, out, start_frame_number=100, end_frame_number=240)
	assert list(out.glob("*")) == []


def test_a_frame_of_another_size_stops_the_import(tmp_path):
	source = tmp_path / "source"
	_sequence(source, n=4)
	_image(source / "frame_3.jpg", w=32, h=24)
	out = tmp_path / "frames"
	out.mkdir()

	with pytest.raises(RiverCoreException, match=r"^mixedSizes:frame_3\.jpg$"):
		frames_to_frames(source, out, overwrite=True)


def test_an_unreadable_frame_stops_the_import(tmp_path):
	source = tmp_path / "source"
	_sequence(source, n=3)
	(source / "frame_2.jpg").write_text("not an image")
	out = tmp_path / "frames"
	out.mkdir()

	with pytest.raises(RiverCoreException, match=r"^unreadable:frame_2\.jpg$"):
		frames_to_frames(source, out, overwrite=True)


@pytest.mark.parametrize("channels", [1, 4])
def test_grayscale_and_alpha_png_become_three_channel_jpeg(tmp_path, channels):
	source = tmp_path / "source"
	source.mkdir()
	for i in range(2):
		_image(source / f"f_{i}.png", value=120, channels=channels)
	out = tmp_path / "frames"
	out.mkdir()

	first = frames_to_frames(source, out, overwrite=True)

	written = cv2.imread(str(first), cv2.IMREAD_UNCHANGED)
	assert written.shape == (48, 64, 3)
```

- [ ] **Step 6: Run them to see them fail**

Run: `/Users/antoine/anaconda3/envs/river_dev/bin/python -m pytest tests/core/test_frames_to_frames.py -v`
Expected: collection error, `ModuleNotFoundError: No module named 'river.core.frames_to_frames'`.

- [ ] **Step 7: Implement `river/core/frames_to_frames.py`**

```python
"""
File Name:   frames_to_frames.py
Project:     RIVeR - Rectification of Image Velocity Results
Description: Import a folder of already-extracted frames as a project's frames.
Authors:     Antoine Patalano
Institution: ORUS / UNC
License:     AGPL-3.0-or-later
"""
import multiprocessing
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import List, Optional

import cv2
import numpy as np

from river.core.exceptions import RiverCoreException
from river.core.video_to_frames import build_undistort_maps, load_profile, save_processed_frame

FRAME_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def _natural_key(name: str) -> list:
	"""frame_2 before frame_10: digit runs compare as numbers, the rest case-insensitively."""
	return [int(token) if token.isdigit() else token.lower() for token in re.split(r"(\d+)", name)]


def list_source_frames(source_dir: Path) -> List[Path]:
	"""The JPEG/PNG files directly inside source_dir, in natural filename order."""
	files = [
		p
		for p in Path(source_dir).iterdir()
		if p.is_file() and p.suffix.lower() in FRAME_EXTENSIONS and not p.name.startswith(".")
	]
	return sorted(files, key=lambda p: (_natural_key(p.name), p.name))


def selected_indices(start: int, end: Optional[int], every: int, count: int) -> List[int]:
	"""The source indices that are imported: the rule extract_frames applies to a video."""
	end = count if end is None else min(end, count)
	return [i for i in range(max(start, 0), end) if i % every == 0]


def _read_frame(path: Path) -> np.ndarray:
	# np.fromfile + imdecode instead of cv2.imread: imread fails on non-ASCII paths on Windows.
	try:
		frame = cv2.imdecode(np.fromfile(str(path), dtype=np.uint8), cv2.IMREAD_COLOR)
	except Exception:
		frame = None
	if frame is None:
		raise RiverCoreException(f"unreadable:{path.name}")
	return frame


def inspect_frames(source_dir: Path) -> dict:
	"""Count, resolution and ordered file names of a frames folder.

	Only the first and last image are decoded, so this stays fast on large folders;
	frames_to_frames checks every frame it imports.
	"""
	files = list_source_frames(source_dir)
	if len(files) < 2:
		raise RiverCoreException("noFrames")

	height, width = _read_frame(files[0]).shape[:2]
	if _read_frame(files[-1]).shape[:2] != (height, width):
		raise RiverCoreException("mixedSizes")

	return {"count": len(files), "width": width, "height": height, "files": [p.name for p in files]}


def frames_to_frames(
	source_dir: Path,
	frames_dir: Path,
	start_frame_number: int = 0,
	end_frame_number: Optional[int] = None,
	overwrite: bool = False,
	every: int = 1,
	resize_factor: float = 1.0,
	undistort: bool = False,
	profile_path: Optional[str] = None,
	undistort_alpha: float = 0.0,
) -> Path:
	"""Copy the selected source frames into frames_dir as {index:010d}.jpg.

	Mirrors video_to_frames: same selection rule, same undistort/resize, same output names.
	"""
	if resize_factor > 1.0 or resize_factor <= 0:
		raise ValueError("resize_factor must be between 0 and 1.0")

	frames_dir = Path(frames_dir)
	files = list_source_frames(source_dir)
	if len(files) < 2:
		raise RiverCoreException("noFrames")

	indices = selected_indices(start_frame_number, end_frame_number, every, len(files))
	if not indices:
		raise RiverCoreException("emptySelection")

	height, width = _read_frame(files[indices[0]]).shape[:2]

	map1 = map2 = roi = None
	if undistort and profile_path:
		K, dist, cal_size = load_profile(profile_path)
		if cal_size != (width, height):
			raise ValueError(
				f"The profile resolution ({cal_size[0]}×{cal_size[1]}) "
				f"does not match the frames. "
				"Select another camera model or calibrate for this resolution."
			)
		map1, map2, roi = build_undistort_maps(K, dist, (width, height), undistort_alpha)

	resize_to = (int(width * resize_factor), int(height * resize_factor)) if resize_factor < 1.0 else None
	encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), 95]

	def import_one(index: int) -> None:
		frame = _read_frame(files[index])
		if frame.shape[:2] != (height, width):
			raise RiverCoreException(f"mixedSizes:{files[index].name}")
		save_path = str(frames_dir / f"{index:010d}.jpg")
		save_processed_frame(frame, save_path, overwrite, encode_params, map1, map2, roi, resize_to)

	worker_count = max(1, multiprocessing.cpu_count() - 1)
	with ThreadPoolExecutor(max_workers=worker_count) as executor:
		# Consuming the iterator re-raises the first worker error here.
		for _ in executor.map(import_one, indices):
			pass

	return frames_dir / f"{indices[0]:010d}.jpg"
```

- [ ] **Step 8: Run both test files**

Run: `/Users/antoine/anaconda3/envs/river_dev/bin/python -m pytest tests/core/test_frames_to_frames.py tests/core/test_video_to_frames.py -v`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add river/core/video_to_frames.py river/core/frames_to_frames.py tests/core/test_video_to_frames.py tests/core/test_frames_to_frames.py
git commit -m "Import a folder of frames with the same range, step and resize rules as a video"
```

---

### Task 2: Backend CLI — `frames-info` and `frames-to-frames`

**Files:**
- Modify: `river/cli/commands/video_to_frames.py` (extract two helpers, no behaviour change)
- Create: `river/cli/commands/frames_to_frames.py`
- Modify: `river/cli/__main__.py` (register the two commands next to `video_to_frames`)
- Test: `tests/test_cli_frames_to_frames.py` (new); `tests/test_cli_video_to_frames.py` must stay green

**Interfaces:**
- Consumes: `inspect_frames`, `frames_to_frames` from Task 1.
- Produces:
  - `river-cli frames-info SOURCE_DIR` → `{"data": {"count", "width", "height", "files"}, "error": {}}`, or `{"data": {}, "error": {"message": "<code>"}}`.
  - `river-cli frames-to-frames SOURCE_DIR FRAMES_DIR [--start-frame N] [--end-frame N] [--every N] [--resize-factor F] [--overwrite] [--undistort --profile-path P] [--stabilize --stabilization-regions P [--replace]]` → `{"data": {"initial_frame": str, ["stabilized_dir": str], ["sanity_check": str]}, "error": {}}`.

- [ ] **Step 1: Write the failing CLI tests**

Create `tests/test_cli_frames_to_frames.py`:

```python
import json
from pathlib import Path
from unittest.mock import patch

import cv2
import numpy as np
from click.testing import CliRunner

from river.cli.__main__ import cli


def _sequence(folder: Path, n=4, w=64, h=48):
	folder.mkdir(parents=True, exist_ok=True)
	for i in range(n):
		cv2.imwrite(str(folder / f"frame_{i + 1}.jpg"), np.full((h, w, 3), i * 20, dtype=np.uint8))


def _run(args):
	# mix_stderr=False: progress goes to stderr, the JSON response to stdout.
	result = CliRunner(mix_stderr=False).invoke(cli, args)
	return json.loads(result.output)


def test_frames_info_reports_the_folder(tmp_path):
	_sequence(tmp_path / "source", n=3)

	response = _run(["frames-info", str(tmp_path / "source")])

	assert response["error"] == {}
	assert response["data"] == {
		"count": 3,
		"width": 64,
		"height": 48,
		"files": ["frame_1.jpg", "frame_2.jpg", "frame_3.jpg"],
	}


def test_frames_info_returns_the_error_code(tmp_path):
	(tmp_path / "source").mkdir()

	response = _run(["frames-info", str(tmp_path / "source")])

	assert response["error"]["message"] == "noFrames"


def test_frames_to_frames_imports_into_the_project(tmp_path):
	_sequence(tmp_path / "source", n=6)
	frames_dir = tmp_path / "frames"

	response = _run([
		"frames-to-frames", str(tmp_path / "source"), str(frames_dir),
		"--start-frame", "0", "--end-frame", "6", "--every", "2", "--overwrite",
	])

	assert response["error"] == {}
	assert response["data"]["initial_frame"] == str(frames_dir / "0000000000.jpg")
	assert sorted(p.name for p in frames_dir.glob("*.jpg")) == [f"{i:010d}.jpg" for i in (0, 2, 4)]


def test_frames_to_frames_reports_a_bad_frame_by_name(tmp_path):
	_sequence(tmp_path / "source", n=3)
	(tmp_path / "source" / "frame_2.jpg").write_text("not an image")

	response = _run(["frames-to-frames", str(tmp_path / "source"), str(tmp_path / "frames"), "--overwrite"])

	assert response["error"]["message"] == "unreadable:frame_2.jpg"


def test_stabilize_without_regions_returns_error(tmp_path):
	_sequence(tmp_path / "source", n=3)

	response = _run(["frames-to-frames", str(tmp_path / "source"), str(tmp_path / "frames"), "--stabilize"])

	assert "stabilization-regions" in response["error"]["message"].lower()


def test_stabilize_runs_on_the_imported_frames(tmp_path):
	_sequence(tmp_path / "source", n=3)
	frames_dir = tmp_path / "frames"
	regions_path = tmp_path / "regions.json"
	regions_path.write_text(json.dumps({"regions": []}))
	stabilized_dir = tmp_path / "frames_stabilized"
	stabilized_dir.mkdir()
	sanity = stabilized_dir / "sanity_check.jpg"
	sanity.write_bytes(b"fake")

	# The stabilization pass lives in the video command module and is shared.
	with patch("river.cli.commands.video_to_frames.stabilize_frames") as mock_stab:
		mock_stab.return_value = sanity
		response = _run([
			"frames-to-frames", str(tmp_path / "source"), str(frames_dir),
			"--overwrite", "--resize-factor", "0.5",
			"--stabilize", "--stabilization-regions", str(regions_path),
		])

	assert response["error"] == {}
	mock_stab.assert_called_once_with(frames_dir, regions_path, stabilized_dir, scale=0.5)
	assert response["data"]["sanity_check"] == str(tmp_path / "sanity_check.jpg")
```

- [ ] **Step 2: Run to see them fail**

Run: `/Users/antoine/anaconda3/envs/river_dev/bin/python -m pytest tests/test_cli_frames_to_frames.py -v`
Expected: FAIL, the JSON decode fails because Click prints `No such command 'frames-info'`.

- [ ] **Step 3: Share the option checks and the stabilization pass**

In `river/cli/commands/video_to_frames.py`, add above the `@click.command` decorator:

```python
def check_stabilize_options(stabilize: bool, stabilization_regions: Optional[str], replace: bool) -> None:
	if stabilize and stabilization_regions is None:
		raise RiverCLIException(
			"--stabilization-regions is required when --stabilize is set"
		)
	if replace and not stabilize:
		raise RiverCLIException(
			"--replace requires --stabilize"
		)


def stabilize_extracted_frames(
	frames_dir_path: Path, stabilization_regions: str, replace: bool, resize_factor: float, result: dict
) -> None:
	"""Stabilize the frames in frames_dir_path and record the outputs in result."""
	regions_path = Path(stabilization_regions)
	stabilized_dir = frames_dir_path.parent / (frames_dir_path.name + "_stabilized")

	print("Stabilizing frames...", file=sys.stderr, flush=True)
	sanity_path = stabilize_frames(frames_dir_path, regions_path, stabilized_dir, scale=resize_factor)
	sanity_dest = frames_dir_path.parent / "sanity_check.jpg"
	shutil.move(str(sanity_path), str(sanity_dest))

	if replace:
		for f in frames_dir_path.glob("*.jpg"):
			f.unlink()
		for f in stabilized_dir.glob("*.jpg"):
			shutil.move(str(f), str(frames_dir_path / f.name))
		shutil.rmtree(stabilized_dir)
	else:
		result["stabilized_dir"] = str(stabilized_dir)

	result["sanity_check"] = str(sanity_dest)
```

In the `video_to_frames` command body, replace the two `if ... raise RiverCLIException` blocks at the top with:

```python
	check_stabilize_options(stabilize, stabilization_regions, replace)
```

and replace the whole `if stabilize:` block at the end with:

```python
	if stabilize:
		stabilize_extracted_frames(frames_dir_path, stabilization_regions, replace, resize_factor, result)
```

- [ ] **Step 4: Check the video CLI tests still pass**

Run: `/Users/antoine/anaconda3/envs/river_dev/bin/python -m pytest tests/test_cli_video_to_frames.py -v`
Expected: 3 passed.

- [ ] **Step 5: Create `river/cli/commands/frames_to_frames.py`**

```python
import sys
import threading
from pathlib import Path
from typing import Optional

import click

from river.cli.commands.utils import render_response
from river.cli.commands.video_to_frames import (
	_monitor_extraction,
	check_stabilize_options,
	stabilize_extracted_frames,
)
from river.core.frames_to_frames import frames_to_frames as ftf
from river.core.frames_to_frames import inspect_frames, list_source_frames, selected_indices


@click.command(help="Report the frame count, resolution and ordered file names of a frames folder.")
@click.argument("source-dir", type=click.Path(exists=True, file_okay=False))
@click.pass_context
@render_response
def frames_info(ctx: click.Context, source_dir: str) -> dict:
	return inspect_frames(Path(source_dir))


@click.command(help="Imports a folder of frames into the project's frames folder and return the initial frame path.")
@click.argument("source-dir", type=click.Path(exists=True, file_okay=False))
@click.argument("frames-dir", type=click.Path(dir_okay=True, writable=True))
@click.option("--start-frame", type=int, default=0, help="Frame number to start.")
@click.option("--end-frame", type=int, default=None, help="Frame number to end.")
@click.option("--every", type=int, default=1, help="Step to import frames.")
@click.option("--overwrite", is_flag=True, help="Overwrite frames if exists.")
@click.option(
	"--resize-factor", type=click.FloatRange(min=0.0, max=1.0), default=1.0, help="Factor to resize the frames."
)
@click.option("--stabilize", is_flag=True, default=False, help="Stabilize frames after import.")
@click.option(
	"--stabilization-regions",
	type=click.Path(exists=True),
	default=None,
	help="Path to stabilization_regions.json (required when --stabilize is set).",
)
@click.option(
	"--replace",
	is_flag=True,
	default=False,
	help="Replace imported frames with stabilized ones (requires --stabilize).",
)
@click.option("--undistort", is_flag=True, default=False, help="Apply lens undistortion to imported frames.")
@click.option("--profile-path", type=click.Path(exists=True), default=None, help="Path to calibration profile.json.")
@click.pass_context
@render_response
def frames_to_frames(
	ctx: click.Context,
	source_dir: str,
	frames_dir: str,
	start_frame: int,
	end_frame: Optional[int],
	every: int,
	overwrite: bool,
	resize_factor: float,
	stabilize: bool,
	stabilization_regions: Optional[str],
	replace: bool,
	undistort: bool,
	profile_path: Optional[str],
) -> dict:
	"""Command to import the given frames folder into frames."""
	check_stabilize_options(stabilize, stabilization_regions, replace)

	frames_dir_path = Path(frames_dir)
	if not frames_dir_path.exists():
		frames_dir_path.mkdir()

	source_count = len(list_source_frames(Path(source_dir)))
	expected = len(selected_indices(start_frame, end_frame, every, source_count))

	print("Extracting frames...", file=sys.stderr, flush=True)
	stop = threading.Event()
	monitor = threading.Thread(
		target=_monitor_extraction,
		args=(frames_dir_path, expected, stop),
		daemon=True,
	)
	monitor.start()

	try:
		initial_frame: Path = ftf(
			source_dir=Path(source_dir),
			frames_dir=frames_dir_path,
			start_frame_number=start_frame,
			end_frame_number=end_frame,
			every=every,
			overwrite=overwrite,
			resize_factor=resize_factor,
			undistort=undistort,
			profile_path=profile_path,
		)
	finally:
		stop.set()
		monitor.join(timeout=3.0)

	result: dict = {"initial_frame": str(initial_frame)}

	if stabilize:
		stabilize_extracted_frames(frames_dir_path, stabilization_regions, replace, resize_factor, result)

	return result
```

The stderr line stays `"Extracting frames..."` on purpose: the GUI's progress display keys on it (`detectPhaseTransition`).

- [ ] **Step 6: Register the commands**

In `river/cli/__main__.py`, next to the `video_to_frames` import add:

```python
from river.cli.commands.frames_to_frames import frames_info, frames_to_frames
```

and right after `cli.add_command(video_to_frames)`:

```python
cli.add_command(frames_info)
cli.add_command(frames_to_frames)
```

- [ ] **Step 7: Run all backend tests for this feature**

Run: `/Users/antoine/anaconda3/envs/river_dev/bin/python -m pytest tests/test_cli_frames_to_frames.py tests/test_cli_video_to_frames.py tests/core/test_frames_to_frames.py tests/core/test_video_to_frames.py -v`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add river/cli/__main__.py river/cli/commands/video_to_frames.py river/cli/commands/frames_to_frames.py tests/test_cli_frames_to_frames.py
git commit -m "Add the frames-info and frames-to-frames commands"
```

---

### Task 3: Shared frame-source maths (`commons/framesSource.ts`)

**Files:**
- Create: `gui/commons/framesSource.ts`
- Test: `gui/commons/framesSource.test.ts`

**Interfaces:**
- Produces:
  - `type VideoSource = 'video' | 'frames'`
  - `parseInterval(text: string): number | null`
  - `fpsFromInterval(ms: number): number`
  - `selectedFrameCount(startFrame: number, endFrame: number, step: number): number` (0-based start, exclusive end; same rule as Python `selected_indices`)
  - `frameRangeValid(start: number, end: number, count: number): boolean` (1-based, inclusive)
  - `frameRange(start: number, end: number, fps: number): { startFrame: number; endFrame: number; startTime: number; endTime: number }`
  - `interface FramesVideoBlock { source: 'frames'; filepath: string; name: string; frame_count: number; total_length: number; time_between_frames: number; fps: number; resolution: { width: number; height: number } }`
  - `framesVideoBlock(input: { folder: string; name: string; count: number; width: number; height: number; intervalMs: number }): FramesVideoBlock`
  - `withInterval<T extends { frame_count?: number }>(video: T, intervalMs: number): T & { fps: number; time_between_frames: number; total_length: number }`
  - `intervalFromSettings(video: { time_between_frames?: number; fps?: number }): number`
  - `extractionCommand(source?: string): 'video-to-frames' | 'frames-to-frames'`

- [ ] **Step 1: Write the failing test**

Create `gui/commons/framesSource.test.ts`:

```ts
import {
  extractionCommand,
  fpsFromInterval,
  frameRange,
  frameRangeValid,
  framesVideoBlock,
  intervalFromSettings,
  parseInterval,
  selectedFrameCount,
  withInterval,
} from './framesSource';

describe('parseInterval', () => {
  it.each([
    ['33.33', 33.33],
    ['33,3', 33.3],
    [' 40 ', 40],
    ['1000', 1000],
  ])('reads %s', (text, expected) => {
    expect(parseInterval(text)).toBe(expected);
  });

  it.each(['', '0', '-5', 'abc', '3 3', '1.2.3', '33,3,3', 'Infinity'])('refuses %s', (text) => {
    expect(parseInterval(text)).toBeNull();
  });
});

describe('fpsFromInterval', () => {
  it('is the inverse of the interval', () => {
    expect(fpsFromInterval(40)).toBe(25);
    expect(fpsFromInterval(33.33)).toBeCloseTo(30.003, 3);
  });
});

// The same cases as tests/core/test_frames_to_frames.py::test_selected_indices.
describe('selectedFrameCount', () => {
  it.each([
    [0, 10, 1, 10],
    [4, 10, 2, 3],
    [5, 10, 2, 2],
    [0, 10, 3, 4],
    [1, 2, 5, 0],
    [0, 10, 4, 3],
  ])('start %i end %i step %i keeps %i', (start, end, step, expected) => {
    expect(selectedFrameCount(start, end, step)).toBe(expected);
  });

  it('is 0 for an unusable step or an empty range', () => {
    expect(selectedFrameCount(0, 10, 0)).toBe(0);
    expect(selectedFrameCount(0, 10, NaN)).toBe(0);
    expect(selectedFrameCount(8, 3, 1)).toBe(0);
  });
});

describe('frameRangeValid', () => {
  it('accepts whole frames inside the folder with start before end', () => {
    expect(frameRangeValid(1, 240, 240)).toBe(true);
    expect(frameRangeValid(10, 11, 240)).toBe(true);
  });

  it.each([
    [0, 10],
    [10, 10],
    [12, 10],
    [1, 241],
    [1.5, 10],
    [NaN, 10],
  ])('refuses %s → %s', (start, end) => {
    expect(frameRangeValid(start, end, 240)).toBe(false);
  });
});

describe('frameRange', () => {
  it('turns 1-based frame numbers into the backend range and its times', () => {
    expect(frameRange(1, 240, 25)).toEqual({ startFrame: 0, endFrame: 240, startTime: 0, endTime: 9.6 });
    expect(frameRange(11, 60, 25)).toEqual({ startFrame: 10, endFrame: 60, startTime: 0.4, endTime: 2.4 });
  });
});

describe('framesVideoBlock', () => {
  it('describes the folder as a video with the typed interval', () => {
    expect(
      framesVideoBlock({ folder: '/data/gauging', name: 'gauging', count: 240, width: 1920, height: 1080, intervalMs: 40 })
    ).toEqual({
      source: 'frames',
      filepath: '/data/gauging',
      name: 'gauging',
      frame_count: 240,
      total_length: 9.6,
      time_between_frames: 0.04,
      fps: 25,
      resolution: { width: 1920, height: 1080 },
    });
  });
});

describe('withInterval', () => {
  it('rewrites the timing and keeps everything else', () => {
    const block = framesVideoBlock({ folder: '/d', name: 'd', count: 100, width: 10, height: 10, intervalMs: 40 });
    const edited = withInterval(block, 50);
    expect(edited).toEqual({ ...block, fps: 20, time_between_frames: 0.05, total_length: 5 });
  });
});

describe('intervalFromSettings', () => {
  it('returns the interval exactly as it was typed', () => {
    const block = framesVideoBlock({ folder: '/d', name: 'd', count: 2, width: 1, height: 1, intervalMs: 33.33 });
    expect(intervalFromSettings(block)).toBe(33.33);
  });

  it('falls back to fps when the interval is missing', () => {
    expect(intervalFromSettings({ fps: 25 })).toBe(40);
    expect(intervalFromSettings({})).toBe(0);
  });
});

describe('extractionCommand', () => {
  it('uses the frames importer only for a frames project', () => {
    expect(extractionCommand('frames')).toBe('frames-to-frames');
    expect(extractionCommand('video')).toBe('video-to-frames');
    expect(extractionCommand(undefined)).toBe('video-to-frames');
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `cd /Users/antoine/river_compil/.worktrees/ui-design-refresh/gui && npx jest commons/framesSource.test.ts`
Expected: FAIL, `Cannot find module './framesSource'`.

- [ ] **Step 3: Implement `gui/commons/framesSource.ts`**

```ts
/** Where a project's frames come from: a video file, or a folder of already-extracted frames. */
export type VideoSource = 'video' | 'frames';

/** The `video` block settings.json holds for a frames project. */
export interface FramesVideoBlock {
  source: 'frames';
  filepath: string;
  name: string;
  frame_count: number;
  total_length: number;
  time_between_frames: number;
  fps: number;
  resolution: { width: number; height: number };
}

// Seconds and milliseconds are stored to the microsecond, which hides float noise
// (40 / 1000 * 240) without touching anything a user can type.
const round6 = (value: number) => Number(value.toFixed(6));

/** The typed time between frames in ms, or null. A decimal comma is a decimal point. */
export function parseInterval(text: string): number | null {
  const normalised = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalised)) return null;
  const value = Number(normalised);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function fpsFromInterval(intervalMs: number): number {
  return 1000 / intervalMs;
}

/**
 * How many frames the backend writes for [startFrame, endFrame) and a step: it keeps the
 * source indices that are multiples of the step (river/core/frames_to_frames.selected_indices).
 */
export function selectedFrameCount(startFrame: number, endFrame: number, step: number): number {
  if (!Number.isInteger(step) || step < 1 || !(endFrame > startFrame)) return 0;
  return Math.max(0, Math.ceil(endFrame / step) - Math.ceil(Math.max(startFrame, 0) / step));
}

/** `start` and `end` are the 1-based frame numbers the form shows; `end` is included. */
export function frameRangeValid(start: number, end: number, count: number): boolean {
  return Number.isInteger(start) && Number.isInteger(end) && start >= 1 && start < end && end <= count;
}

export function frameRange(start: number, end: number, fps: number) {
  const startFrame = start - 1;
  const endFrame = end;
  return { startFrame, endFrame, startTime: round6(startFrame / fps), endTime: round6(endFrame / fps) };
}

export function withInterval<T extends { frame_count?: number }>(video: T, intervalMs: number) {
  return {
    ...video,
    fps: fpsFromInterval(intervalMs),
    time_between_frames: round6(intervalMs / 1000),
    total_length: round6(((video.frame_count ?? 0) * intervalMs) / 1000),
  };
}

export function framesVideoBlock(input: {
  folder: string;
  name: string;
  count: number;
  width: number;
  height: number;
  intervalMs: number;
}): FramesVideoBlock {
  const { folder, name, count, width, height, intervalMs } = input;
  const timing = withInterval({ frame_count: count }, intervalMs);
  return {
    source: 'frames',
    filepath: folder,
    name,
    frame_count: count,
    total_length: timing.total_length,
    time_between_frames: timing.time_between_frames,
    fps: timing.fps,
    resolution: { width, height },
  };
}

/** The interval in ms as the user typed it, read back from a settings `video` block. */
export function intervalFromSettings(video: { time_between_frames?: number; fps?: number }): number {
  if (video.time_between_frames) return round6(video.time_between_frames * 1000);
  return video.fps ? round6(1000 / video.fps) : 0;
}

export function extractionCommand(source?: string): 'video-to-frames' | 'frames-to-frames' {
  return source === 'frames' ? 'frames-to-frames' : 'video-to-frames';
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npx jest commons/framesSource.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add gui/commons/framesSource.ts gui/commons/framesSource.test.ts
git commit -m "Add the shared timing and range maths for a frames project"
```

---

### Task 4: Electron — pick and inspect a frames folder

**Files:**
- Create: `gui/electron/ipcMainHandlers/framesFolder.ts`
- Test: `gui/electron/ipcMainHandlers/framesFolder.test.ts`
- Modify: `gui/electron/ipcMainHandlers/index.ts` (import + export `framesFolder`), `gui/electron/main.ts` (call `framesFolder(riverCli);` after `firstFrame(riverCli);`, and add it to the import list from `./ipcMainHandlers`)

**Interfaces:**
- Consumes: CLI `frames-info` (Task 2).
- Produces two IPC channels:
  - `get-frames-folder` → `{ path: string; name: string } | null` (null when the dialog is cancelled)
  - `inspect-frames-folder`, args `{ path?: string }` → `{ path: string; name: string; count: number; width: number; height: number; files: string[] }` (`files` are absolute paths in order) or `{ error: 'noFrames' | 'mixedSizes' | 'unreadableFolder' }`. Without `path` it inspects `PROJECT_CONFIG.videoPath` (the open project's source folder).
- Produces: `export type FramesFolderInfo` and `export type FramesFolderError` from `framesFolder.ts`.

- [ ] **Step 1: Write the failing test**

Create `gui/electron/ipcMainHandlers/framesFolder.test.ts`:

```ts
const mockHandlers: Record<string, (...args: any[]) => any> = {};
const mockShowOpenDialog = jest.fn();

jest.mock('electron', () => ({
  ipcMain: { handle: (channel: string, fn: (...args: any[]) => any) => (mockHandlers[channel] = fn) },
  dialog: { showOpenDialog: (...args: any[]) => mockShowOpenDialog(...args) },
}));

const mockConfig = { videoPath: '/open/project/source', defaultFilesPath: '/last' };
jest.mock('../main', () => ({ PROJECT_CONFIG: mockConfig }));

import * as path from 'path';
import { framesFolder } from './framesFolder';

const info = { count: 3, width: 1920, height: 1080, files: ['f_1.jpg', 'f_2.jpg', 'f_10.jpg'] };
const riverCli = jest.fn();

beforeAll(() => framesFolder(riverCli as any));
beforeEach(() => {
  riverCli.mockReset();
  mockShowOpenDialog.mockReset();
});

describe('get-frames-folder', () => {
  it('returns the chosen folder and its name', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/data/gauging_03'] });

    expect(await mockHandlers['get-frames-folder']({})).toEqual({ path: '/data/gauging_03', name: 'gauging_03' });
    expect(mockShowOpenDialog.mock.calls[0][0].properties).toEqual(['openDirectory']);
  });

  it('returns null when the dialog is cancelled', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    expect(await mockHandlers['get-frames-folder']({})).toBeNull();
  });
});

describe('inspect-frames-folder', () => {
  it('asks the CLI, untracked, and returns absolute paths in the CLI order', async () => {
    riverCli.mockResolvedValue({ data: info, error: {} });

    const result = await mockHandlers['inspect-frames-folder']({}, { path: '/data/gauging_03' });

    expect(riverCli.mock.calls[0][0]).toEqual(['frames-info', '/data/gauging_03']);
    expect(riverCli.mock.calls[0][4]).toBe(false);
    expect(result).toEqual({
      path: '/data/gauging_03',
      name: 'gauging_03',
      count: 3,
      width: 1920,
      height: 1080,
      files: ['f_1.jpg', 'f_2.jpg', 'f_10.jpg'].map((f) => path.join('/data/gauging_03', f)),
    });
  });

  it("inspects the open project's source folder when no path is given", async () => {
    riverCli.mockResolvedValue({ data: info, error: {} });

    await mockHandlers['inspect-frames-folder']({}, undefined);

    expect(riverCli.mock.calls[0][0]).toEqual(['frames-info', '/open/project/source']);
  });

  it.each([
    ['noFrames', 'noFrames'],
    ['mixedSizes', 'mixedSizes'],
    ['unreadable:f_1.jpg', 'unreadableFolder'],
    ['Unexpected error: boom', 'unreadableFolder'],
  ])('maps the CLI error %s to %s', async (message, code) => {
    riverCli.mockResolvedValue({ data: {}, error: { message } });

    expect(await mockHandlers['inspect-frames-folder']({}, { path: '/x' })).toEqual({ error: code });
  });

  it('reports an unreadable folder when the CLI cannot run', async () => {
    riverCli.mockRejectedValue(new Error('spawn failed'));

    expect(await mockHandlers['inspect-frames-folder']({}, { path: '/x' })).toEqual({ error: 'unreadableFolder' });
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx jest electron/ipcMainHandlers/framesFolder.test.ts`
Expected: FAIL, `Cannot find module './framesFolder'`.

- [ ] **Step 3: Implement `gui/electron/ipcMainHandlers/framesFolder.ts`**

```ts
import { dialog, ipcMain } from 'electron';
import * as os from 'os';
import * as path from 'path';
import { PROJECT_CONFIG } from '../main';
import { RiverCli } from './interfaces';

export interface FramesFolderInfo {
  path: string;
  name: string;
  count: number;
  width: number;
  height: number;
  /** Absolute paths, in the order the backend imports them. */
  files: string[];
}

export type FramesFolderError = 'noFrames' | 'mixedSizes' | 'unreadableFolder';

const KNOWN_ERRORS: FramesFolderError[] = ['noFrames', 'mixedSizes'];

/**
 * Picking and inspecting a folder of already-extracted frames. The CLI owns the file
 * order (natural filename order), so nothing here or in the renderer ever sorts.
 */
function framesFolder(riverCli: RiverCli) {
  ipcMain.handle('get-frames-folder', async () => {
    const picked = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      defaultPath: PROJECT_CONFIG.defaultFilesPath || undefined,
    });
    const folder = picked.filePaths[0];
    if (picked.canceled || folder === undefined) return null;
    return { path: folder, name: path.basename(folder) };
  });

  ipcMain.handle(
    'inspect-frames-folder',
    async (_event, args?: { path?: string }): Promise<FramesFolderInfo | { error: FramesFolderError }> => {
      const folder = args?.path ?? PROJECT_CONFIG.videoPath;
      // No project exists yet when a folder is first picked, so this call has no project log.
      const logFile = path.join(os.tmpdir(), 'river-frames-info.log');

      try {
        // Untracked: a quick status call must never kill, or be killed with, a running analysis.
        const { data, error } = await riverCli(['frames-info', folder], 'json', false, logFile, false);
        if (error?.message) {
          console.log('frames-info:', error.message);
          const known = KNOWN_ERRORS.find((code) => code === error.message);
          return { error: known ?? 'unreadableFolder' };
        }
        return {
          path: folder,
          name: path.basename(folder),
          count: data.count,
          width: data.width,
          height: data.height,
          files: (data.files as string[]).map((file) => path.join(folder, file)),
        };
      } catch (error) {
        console.log(error);
        return { error: 'unreadableFolder' };
      }
    }
  );
}

export { framesFolder };
```

- [ ] **Step 4: Register it**

In `gui/electron/ipcMainHandlers/index.ts` add `import { framesFolder } from './framesFolder';` and `framesFolder,` in the export list (alphabetical, after `firstFrame`).
In `gui/electron/main.ts`, add `framesFolder` to the names imported from `./ipcMainHandlers` and add `framesFolder(riverCli);` on the line after `firstFrame(riverCli);`.

- [ ] **Step 5: Run the test and the Electron type check**

Run: `npx jest electron/ipcMainHandlers/framesFolder.test.ts && npx tsc --noEmit -p tsconfig.node.json`
Expected: tests pass; tsc reports no more errors than before this task.

- [ ] **Step 6: Commit**

```bash
git add gui/electron/ipcMainHandlers/framesFolder.ts gui/electron/ipcMainHandlers/framesFolder.test.ts gui/electron/ipcMainHandlers/index.ts gui/electron/main.ts
git commit -m "Pick and inspect a folder of frames from the main process"
```

---

### Task 5: Electron — create a frames project and extract from it

**Files:**
- Modify: `gui/electron/ipcMainHandlers/createFolderStructure.ts`
- Modify: `gui/electron/ipcMainHandlers/initProject.ts`
- Modify: `gui/electron/ipcMainHandlers/firstFrame.ts`
- Modify: `gui/electron/ipcMainHandlers/interfaces.ts` (`FirstFrameArgs`)
- Test: `gui/electron/ipcMainHandlers/initProject.test.ts` (new)

**Interfaces:**
- Consumes: `framesVideoBlock`, `withInterval`, `extractionCommand` from Task 3.
- Produces:
  - `init-project` accepts `frames?: { count: number; width: number; height: number; intervalMs: number }`. With it, `args.path` is the folder and `args.name` the folder name; the result is `{ width, height, fps, duration, creation: '', name, path, source: 'frames', frameCount, intervalMs, directory }`.
  - `createFolderStructure(..., unitSistem, frames?: { count: number; intervalMs: number })`.
  - `FirstFrameArgs.intervalMs?: number`. For a frames project `first-frame` runs `frames-to-frames` with `PROJECT_CONFIG.videoPath` as the source folder.

- [ ] **Step 1: Write the failing test**

Create `gui/electron/ipcMainHandlers/initProject.test.ts`:

```ts
const mockHandlers: Record<string, (...args: any[]) => any> = {};
const mockGetVideoMetadata = jest.fn();
const mockCreateFolderStructure = jest.fn();

jest.mock('electron', () => ({
  ipcMain: { handle: (channel: string, fn: (...args: any[]) => any) => (mockHandlers[channel] = fn) },
}));
jest.mock('./utils/getVideoMetadata', () => ({ getVideoMetadata: (p: string) => mockGetVideoMetadata(p) }));
jest.mock('./createFolderStructure', () => ({
  createFolderStructure: (...args: any[]) => mockCreateFolderStructure(...args),
}));

const mockConfig: Record<string, string> = { mainDirectory: '/River' };
jest.mock('../main', () => ({ PROJECT_CONFIG: mockConfig }));

import * as path from 'path';
import { initProject } from './initProject';

beforeAll(() => initProject());
beforeEach(() => {
  mockGetVideoMetadata.mockReset();
  mockCreateFolderStructure.mockReset().mockResolvedValue('/River/case/20261008T1200');
});

describe('init-project from a frames folder', () => {
  const args = {
    path: '/data/gauging.2026_03',
    name: 'gauging.2026_03',
    type: 'uav',
    language: 'en',
    unitSistem: 'si',
    frames: { count: 240, width: 1920, height: 1080, intervalMs: 40 },
  };

  it('never probes the folder as a video', async () => {
    await mockHandlers['init-project']({}, args);

    expect(mockGetVideoMetadata).not.toHaveBeenCalled();
  });

  it('names the project after the whole folder name and passes the frames facts on', async () => {
    await mockHandlers['init-project']({}, args);

    const call = mockCreateFolderStructure.mock.calls[0];
    expect(call[0]).toBe(path.join('/River', 'gauging.2026_03'));
    expect(call[3]).toBe('/data/gauging.2026_03');
    expect(call[4]).toBe('gauging.2026_03');
    expect(call[5]).toEqual({ width: 1920, height: 1080, fps: 25, duration: 9.6 });
    expect(call[7]).toEqual({ count: 240, intervalMs: 40 });
  });

  it('returns video-shaped metadata marked as frames', async () => {
    const { result } = await mockHandlers['init-project']({}, args);

    expect(result).toEqual({
      width: 1920,
      height: 1080,
      fps: 25,
      duration: 9.6,
      creation: '',
      name: 'gauging.2026_03',
      path: '/data/gauging.2026_03',
      source: 'frames',
      frameCount: 240,
      intervalMs: 40,
      directory: '/River/case/20261008T1200',
    });
    expect(mockConfig.videoPath).toBe('/data/gauging.2026_03');
    expect(mockConfig.defaultFilesPath).toBe('/data');
  });
});

describe('init-project from a video', () => {
  it('still probes the file and passes no frames argument', async () => {
    mockGetVideoMetadata.mockResolvedValue({
      width: 4096,
      height: 2160,
      fps: 30,
      duration: 21.5,
      creation: '',
      name: 'DJI_0083.MP4',
      path: '/v/DJI_0083.MP4',
    });

    const { result } = await mockHandlers['init-project'](
      {},
      { path: '/v/DJI_0083.MP4', name: 'DJI_0083.MP4', type: 'uav', language: 'en', unitSistem: 'si' }
    );

    expect(mockCreateFolderStructure.mock.calls[0][0]).toBe(path.join('/River', 'DJI_0083'));
    expect(mockCreateFolderStructure.mock.calls[0][7]).toBeUndefined();
    expect(result.source).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx jest electron/ipcMainHandlers/initProject.test.ts`
Expected: FAIL, the frames tests call `getVideoMetadata` and the folder name is `gauging`.

- [ ] **Step 3: Teach `createFolderStructure` the frames block**

In `gui/electron/ipcMainHandlers/createFolderStructure.ts`:

Add the import:

```ts
import { framesVideoBlock } from '../../commons/framesSource';
```

Add a last parameter to the signature:

```ts
  unitSistem: string,
  frames?: { count: number; intervalMs: number }
```

Replace the `video: { ... }` property of `jsonData` with:

```ts
    video: frames
      ? framesVideoBlock({
          folder: videoPath,
          name: videoName,
          count: frames.count,
          width: result.width,
          height: result.height,
          intervalMs: frames.intervalMs,
        })
      : {
          filepath: videoPath,
          name: videoName,
          total_length: result.duration,
          time_between_frames: parseFloat((1 / result.fps).toFixed(2)),
          fps: result.fps,
          resolution: {
            width: result.width,
            height: result.height,
          },
        },
```

- [ ] **Step 4: Branch `init-project`**

In `gui/electron/ipcMainHandlers/initProject.ts`:

Add the import:

```ts
import { withInterval } from '../../commons/framesSource';
```

Change the handler's argument type and the start of its body to:

```ts
    async (
      _event,
      args: {
        path: string;
        name: string;
        type: string;
        language: string;
        unitSistem: string;
        frames?: { count: number; width: number; height: number; intervalMs: number };
      }
    ) => {
      const { name, path, type, language, unitSistem, frames } = args;

      // A video's project is named after the file without its extension; a folder name is kept whole.
      const projectName = frames ? name : name.split('.')[0];
      const newDirectory = join(PROJECT_CONFIG.mainDirectory, projectName);

      try {
        const result = frames ? framesMetadata(path, name, frames) : await getVideoMetadata(path);
        const directory = await createFolderStructure(
          newDirectory,
          type,
          language,
          result.path,
          name,
          { width: result.width, height: result.height, fps: result.fps, duration: result.duration },
          unitSistem,
          frames ? { count: frames.count, intervalMs: frames.intervalMs } : undefined
        );
```

The rest of the `try` (including `PROJECT_CONFIG.videoPath = path;`, which is the folder for a frames project) and the `catch` are unchanged.

Add above `function initProject()`:

```ts
/** A frames folder described in the shape getVideoMetadata returns for a video. */
function framesMetadata(
  folder: string,
  name: string,
  frames: { count: number; width: number; height: number; intervalMs: number }
) {
  const timing = withInterval({ frame_count: frames.count }, frames.intervalMs);
  return {
    width: frames.width,
    height: frames.height,
    fps: timing.fps,
    duration: timing.total_length,
    creation: '',
    name,
    path: folder,
    source: 'frames' as const,
    frameCount: frames.count,
    intervalMs: frames.intervalMs,
  };
}
```

- [ ] **Step 5: Run the test**

Run: `npx jest electron/ipcMainHandlers/initProject.test.ts`
Expected: all pass.

- [ ] **Step 6: Pick the extraction command in `first-frame`**

In `gui/electron/ipcMainHandlers/interfaces.ts`, add to `FirstFrameArgs`:

```ts
  /** Frames projects only: the interval typed in Video Range, written to settings before importing. */
  intervalMs?: number;
```

In `gui/electron/ipcMainHandlers/firstFrame.ts`:

Add the import:

```ts
import { extractionCommand, withInterval } from '../../commons/framesSource';
```

Read `intervalMs` from the args:

```ts
    const { start_frame, end_frame, step, factor, lensCorrection, stabilization, stabilizationRegions, intervalMs } =
      args;
```

Move the two lines that read the settings (`const json = await fs.promises.readFile(...)` and `const jsonParsed = JSON.parse(json);`) up, to just above `const options: (string | number)[] = [`, and add right after them:

```ts
    // A frames project imports from its source folder; videoPath holds that folder.
    const isFrames = jsonParsed.video?.source === 'frames';
    if (isFrames && intervalMs) {
      jsonParsed.video = withInterval(jsonParsed.video, intervalMs);
    }
```

Change the first element of `options` from `'video-to-frames',` to:

```ts
      extractionCommand(jsonParsed.video?.source),
```

Nothing else in the handler changes: `videoPath` is already the source folder for a frames project, and `jsonParsed` is written back to `settings.json` by the existing code before the CLI runs.

- [ ] **Step 7: Type check and run the Electron tests**

Run: `npx tsc --noEmit -p tsconfig.node.json && npx jest electron`
Expected: no new tsc errors; all Electron tests pass.

- [ ] **Step 8: Commit**

```bash
git add gui/electron/ipcMainHandlers/createFolderStructure.ts gui/electron/ipcMainHandlers/initProject.ts gui/electron/ipcMainHandlers/initProject.test.ts gui/electron/ipcMainHandlers/firstFrame.ts gui/electron/ipcMainHandlers/interfaces.ts
git commit -m "Create a project from a frames folder and import its frames on extraction"
```

---

### Task 6: Electron — load a frames project and locate a moved folder

**Files:**
- Modify: `gui/commons/projectIssues.ts` (`VideoSpec.frameCount`)
- Modify: `gui/electron/ipcMainHandlers/utils/videoFallback.ts`
- Modify: `gui/electron/ipcMainHandlers/loadProject.ts:149-151`
- Modify: `gui/electron/ipcMainHandlers/locateVideo.ts`, `gui/electron/main.ts` (`locateVideo(riverCli)`)
- Test: `gui/electron/ipcMainHandlers/utils/videoFallback.test.ts` (append), `gui/electron/ipcMainHandlers/locateVideo.test.ts` (append; existing tests must stay green)

**Interfaces:**
- Consumes: `intervalFromSettings` (Task 3), CLI `frames-info` (Task 2).
- Produces:
  - `VideoSpec` gains `frameCount?: number`.
  - `SettingsVideo` gains `source?: string; frame_count?: number; time_between_frames?: number`.
  - `videoMetadataFromSettings(video)` also returns `source: 'video' | 'frames'`, `frameCount: number`, `intervalMs: number`.
  - `load-project` returns that metadata for a frames project whether or not the folder exists.
  - `locateVideo(riverCli: RiverCli)`. For a frames project `locate-video` opens a directory dialog and answers `{ status: 'canceled' } | { status: 'error', message } | { status: 'mismatch', expected: VideoSpec, found: VideoSpec } | { status: 'ok', metadata }` where `expected`/`found` carry `frameCount` and `metadata` is `videoMetadataFromSettings` of the updated block.

- [ ] **Step 1: Write the failing tests**

Append to `gui/electron/ipcMainHandlers/utils/videoFallback.test.ts`:

```ts
import { framesVideoBlock } from '../../../commons/framesSource';

describe('videoMetadataFromSettings for a frames project', () => {
  it('reports the source, the frame count and the typed interval', () => {
    const block = framesVideoBlock({
      folder: '/data/gauging',
      name: 'gauging',
      count: 240,
      width: 1920,
      height: 1080,
      intervalMs: 33.33,
    });

    expect(videoMetadataFromSettings(block)).toEqual({
      width: 1920,
      height: 1080,
      fps: 1000 / 33.33,
      duration: 7.9992,
      creation: '',
      name: 'gauging',
      path: '/data/gauging',
      source: 'frames',
      frameCount: 240,
      intervalMs: 33.33,
    });
  });

  it('reports an old project as a video', () => {
    const metadata = videoMetadataFromSettings({ filepath: '/v/a.mp4', fps: 30 });

    expect(metadata.source).toBe('video');
    expect(metadata.frameCount).toBe(0);
  });
});
```

If `videoMetadataFromSettings` is not already imported at the top of that test file, add it to the existing import from `./videoFallback`. If an existing test in that file asserts the exact object `videoMetadataFromSettings` returns with `toEqual`, add `source: 'video', frameCount: 0, intervalMs: <1000 / its fps, to 6 decimals>` to that expectation.

Append to `gui/electron/ipcMainHandlers/locateVideo.test.ts`:

```ts
describe('locate-video for a frames project', () => {
  const riverCli = jest.fn();
  const framesSettings = {
    video: {
      source: 'frames',
      filepath: '/gone/gauging',
      name: 'gauging',
      frame_count: 240,
      total_length: 9.6,
      time_between_frames: 0.04,
      fps: 25,
      resolution: { width: 1920, height: 1080 },
    },
  };

  beforeAll(() => locateVideo(riverCli as any));
  beforeEach(() => {
    riverCli.mockReset();
    fs.writeFileSync(mockConfig.settingsPath, JSON.stringify(framesSettings));
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/found/gauging'] });
  });

  it('opens a folder dialog and never probes a video', async () => {
    riverCli.mockResolvedValue({ data: { count: 240, width: 1920, height: 1080, files: [] }, error: {} });

    await mockHandlers['locate-video']({});

    expect(mockShowOpenDialog.mock.calls[0][0].properties).toEqual(['openDirectory']);
    expect(mockGetVideoMetadata).not.toHaveBeenCalled();
    expect(riverCli.mock.calls[0][0]).toEqual(['frames-info', '/found/gauging']);
  });

  it('accepts a folder with the same resolution and frame count and saves its path', async () => {
    riverCli.mockResolvedValue({ data: { count: 240, width: 1920, height: 1080, files: [] }, error: {} });

    const result = await mockHandlers['locate-video']({});

    expect(result.status).toBe('ok');
    expect(result.metadata).toMatchObject({ path: '/found/gauging', name: 'gauging', source: 'frames', frameCount: 240 });
    expect(settings().video.filepath).toBe('/found/gauging');
    expect(settings().video.fps).toBe(25);
    expect(mockConfig.videoPath).toBe('/found/gauging');
  });

  it('refuses a folder with another frame count and changes nothing', async () => {
    riverCli.mockResolvedValue({ data: { count: 120, width: 1920, height: 1080, files: [] }, error: {} });

    const result = await mockHandlers['locate-video']({});

    expect(result).toEqual({
      status: 'mismatch',
      expected: { width: 1920, height: 1080, fps: 25, frameCount: 240 },
      found: { width: 1920, height: 1080, fps: 25, frameCount: 120 },
    });
    expect(settings().video.filepath).toBe('/gone/gauging');
  });

  it('reports a folder that is not a frames folder', async () => {
    riverCli.mockResolvedValue({ data: {}, error: { message: 'noFrames' } });

    expect(await mockHandlers['locate-video']({})).toEqual({ status: 'error', message: 'noFrames' });
  });
});
```

In the same file, change the existing `beforeAll(() => locateVideo());` to `beforeAll(() => locateVideo(jest.fn() as any));`.

- [ ] **Step 2: Run to see them fail**

Run: `npx jest electron/ipcMainHandlers/locateVideo.test.ts electron/ipcMainHandlers/utils/videoFallback.test.ts`
Expected: the new tests FAIL (missing `source`; a file dialog is opened for the frames project).

- [ ] **Step 3: Extend the shared types and the fallback**

In `gui/commons/projectIssues.ts`, add to `VideoSpec`:

```ts
  /** Frames projects only: a located folder must hold the same number of frames. */
  frameCount?: number;
```

In `gui/electron/ipcMainHandlers/utils/videoFallback.ts`:

```ts
import { intervalFromSettings } from '../../../commons/framesSource';
```

Add to `SettingsVideo`:

```ts
  /** 'frames' for a project made from a folder of frames; absent for a video. */
  source?: string;
  frame_count?: number;
  time_between_frames?: number;
```

Add three properties to the object `videoMetadataFromSettings` returns:

```ts
    source: video.source === 'frames' ? ('frames' as const) : ('video' as const),
    frameCount: video.frame_count ?? 0,
    intervalMs: intervalFromSettings(video),
```

Replace `settingsVideoSpec` and `videoMismatch` with:

```ts
export function settingsVideoSpec(video: SettingsVideo): VideoSpec {
  const spec: VideoSpec = {
    width: video.resolution?.width ?? 0,
    height: video.resolution?.height ?? 0,
    fps: video.fps ?? 0,
  };
  if (video.source === 'frames') spec.frameCount = video.frame_count ?? 0;
  return spec;
}

/** Frames, matrix and masks depend on these, so a located video or frames folder must match them. */
export function videoMismatch(expected: VideoSpec, found: VideoSpec): boolean {
  return (
    expected.width !== found.width ||
    expected.height !== found.height ||
    Math.round(expected.fps) !== Math.round(found.fps) ||
    (expected.frameCount ?? 0) !== (found.frameCount ?? 0)
  );
}
```

- [ ] **Step 4: Never probe a frames folder on load**

In `gui/electron/ipcMainHandlers/loadProject.ts`, replace:

```ts
  const videoMetadata = videoMissing
    ? videoMetadataFromSettings(settingsParsed.video)
    : await getVideoMetadata(settingsParsed.video.filepath);
```

with:

```ts
  // A frames project has no file to probe: settings.json already holds every fact.
  const videoMetadata =
    videoMissing || settingsParsed.video.source === 'frames'
      ? videoMetadataFromSettings(settingsParsed.video)
      : await getVideoMetadata(settingsParsed.video.filepath);
```

- [ ] **Step 5: Locate a frames folder**

Replace the body of `gui/electron/ipcMainHandlers/locateVideo.ts` with:

```ts
import { dialog, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { PROJECT_CONFIG } from '../main';
import { RiverCli } from './interfaces';
import { getVideoMetadata } from './utils/getVideoMetadata';
import { settingsVideoSpec, videoMetadataFromSettings, videoMismatch } from './utils/videoFallback';

/**
 * Locate… on the missing-video card (spec §3). Only a video with the project's
 * resolution and fps is accepted: frames, matrix and masks all depend on them.
 * A frames project locates its source folder instead, matched on resolution and frame count.
 */
function locateVideo(riverCli: RiverCli) {
  ipcMain.handle('locate-video', async () => {
    const settings = JSON.parse(await fs.promises.readFile(PROJECT_CONFIG.settingsPath, 'utf-8'));
    const expected = settingsVideoSpec(settings.video);

    if (settings.video?.source === 'frames') {
      const picked = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        defaultPath: PROJECT_CONFIG.defaultFilesPath,
      });
      const folder = picked.filePaths[0];
      if (picked.canceled || folder === undefined) return { status: 'canceled' };

      const { data, error } = await riverCli(['frames-info', folder], 'json', false, PROJECT_CONFIG.logsPath, false);
      if (error?.message) return { status: 'error', message: error.message };

      const found = { width: data.width, height: data.height, fps: expected.fps, frameCount: data.count };
      if (videoMismatch(expected, found)) return { status: 'mismatch', expected, found };

      settings.video.filepath = folder;
      await fs.promises.writeFile(PROJECT_CONFIG.settingsPath, JSON.stringify(settings, null, 4), 'utf-8');
      PROJECT_CONFIG.videoPath = folder;
      PROJECT_CONFIG.defaultFilesPath = path.dirname(folder);
      return { status: 'ok', metadata: videoMetadataFromSettings(settings.video) };
    }

    const picked = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv'] }],
      defaultPath: PROJECT_CONFIG.defaultFilesPath,
    });
    const filePath = picked.filePaths[0];
    if (picked.canceled || filePath === undefined) return { status: 'canceled' };

    let metadata;
    try {
      metadata = await getVideoMetadata(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { status: 'error', message };
    }
    const found = { width: metadata.width, height: metadata.height, fps: metadata.fps };
    if (videoMismatch(expected, found)) return { status: 'mismatch', expected, found };

    settings.video.filepath = metadata.path;
    await fs.promises.writeFile(PROJECT_CONFIG.settingsPath, JSON.stringify(settings, null, 4), 'utf-8');
    PROJECT_CONFIG.videoPath = metadata.path;
    PROJECT_CONFIG.defaultFilesPath = path.dirname(metadata.path);
    return { status: 'ok', metadata };
  });
}

export { locateVideo };
```

The frames test config has no `logsPath`; add `logsPath: ''` to `mockConfig` in `locateVideo.test.ts`.

In `gui/electron/main.ts` change `locateVideo();` to `locateVideo(riverCli);`.

- [ ] **Step 6: Run the tests and the type check**

Run: `npx jest electron && npx tsc --noEmit -p tsconfig.node.json`
Expected: all Electron tests pass; no new tsc errors.

- [ ] **Step 7: Commit**

```bash
git add gui/commons/projectIssues.ts gui/electron/ipcMainHandlers/utils/videoFallback.ts gui/electron/ipcMainHandlers/utils/videoFallback.test.ts gui/electron/ipcMainHandlers/loadProject.ts gui/electron/ipcMainHandlers/locateVideo.ts gui/electron/ipcMainHandlers/locateVideo.test.ts gui/electron/main.ts
git commit -m "Load a frames project from its settings and locate a moved frames folder"
```

---

### Task 7: Renderer state — carry the source through the store and the hooks

**Files:**
- Modify: `gui/src/store/project/types.ts` (`VideoData`)
- Modify: `gui/src/hooks/useProjectSlice.ts` (`onInitProject`, `onLoadProject`, `onSetVideoParameters`, two new methods)
- Modify: `gui/src/hooks/useProjectIssues.ts` (`locateVideo`, alerts call)
- Modify: `gui/src/helpers/projectIssueAlerts.ts`
- Modify: `gui/src/translations/en/global.json` (English copy for the whole feature; the other 11 languages are Task 12)
- Test: `gui/src/helpers/projectIssueAlerts.frames.test.ts` (new)

**Interfaces:**
- Consumes: IPC `get-frames-folder`, `inspect-frames-folder`, `init-project` (frames), `first-frame` (`intervalMs`), `locate-video`; `parseInterval`, `fpsFromInterval`, `frameRange`, `VideoSource` from Task 3.
- Produces:
  - `VideoData` gains `source?: VideoSource; frameCount?: number; intervalMs?: number`.
  - `useProjectSlice()` gains `onGetFramesFolder(): Promise<{ path: string; name: string } | null>` and `onInspectFramesFolder(path?: string): Promise<FramesFolderInfo | { error: string }>`.
  - `onInitProject(videoInput, language, unitSistem)` where `videoInput` gains `frames?: { count: number; width: number; height: number; intervalMs: number }`.
  - `onSetVideoParameters(data)`: for a frames project `data.start`/`data.end` are 1-based frame numbers (strings) and `data.interval` is the interval text.
  - `projectIssueAlerts(issues, step, t, videoName, source = 'video')`.
  - English keys (exact strings in Step 1).

- [ ] **Step 1: Add the English copy**

In `gui/src/translations/en/global.json`:

In `"Step-2"`, change `dragAndDrop` and add the rest:

```json
    "dragAndDrop": "Drag a video or a folder of frames here",
    "chooseFramesFolder": "or choose a frames folder",
    "readingFolder": "Reading folder…",
    "framesSummary": "{{count}} frames · {{width}} × {{height}}",
    "timeBetweenFrames": "Time between frames",
    "Errors": {
      "noFrames": "This folder has fewer than 2 JPEG or PNG images.",
      "mixedSizes": "The images in this folder do not all have the same size.",
      "dropFolder": "Drop the folder that contains the frames, not the images.",
      "unreadableFolder": "This folder could not be read."
    },
```

In `"VideoRange"` add `"sourceFrames": "Source frames",`; in `"VideoRange"."Errors"` add:

```json
      "frameRange": "Start and End must be whole frame numbers from 1 to {{count}}, with Start before End.",
      "interval": "Time between frames must be a number greater than 0.",
```

In `"VideoRange"."ExtraInfo"` add:

```json
      "folderName": "Folder",
      "frameCount": "Frames",
```

In `"Report"."Doc"` add:

```json
      "sourceLabel": "Source",
      "imageSequence": "Image sequence · {{count}} frames · interval entered by the operator: {{ms}} ms",
```

In `"Loader"` add `"importingFrames": "Importing Frames",`.

In `"ProjectIssues"` add:

```json
    "framesMissing": "Frames folder {{name}} not found. The imported frames are still available.",
    "framesMismatch": "This folder has {{foundCount}} frames at {{foundWidth}}×{{foundHeight}}; the project was made with {{count}} frames at {{width}}×{{height}}.",
    "framesLocked": "The frames folder is missing: locate it to change the range, step or stabilization.",
```

- [ ] **Step 2: Write the failing alert test**

Create `gui/src/helpers/projectIssueAlerts.frames.test.ts`:

```ts
import type { TFunction } from 'i18next';
import { projectIssueAlerts } from './projectIssueAlerts';
import type { ProjectIssuesState } from '../store/project/types';

// Returns the key plus its options, so the test reads which copy and which values were used.
const t = ((key: string, options?: Record<string, unknown>) =>
  options ? `${key} ${JSON.stringify(options)}` : key) as unknown as TFunction;

const missing: ProjectIssuesState = { videoMissing: true, missingInputs: [], videoMismatch: null };

describe('projectIssueAlerts for a frames project', () => {
  it('says the frames folder is missing, with the same Locate action', () => {
    const [alert] = projectIssueAlerts(missing, 'video', t, 'gauging', 'frames');

    expect(alert.text).toBe('ProjectIssues.framesMissing {"name":"gauging"}');
    expect(alert.action?.action).toBe('locate-video');
  });

  it('explains a refused folder by its frame count', () => {
    const issues: ProjectIssuesState = {
      ...missing,
      videoMismatch: {
        expected: { width: 1920, height: 1080, fps: 25, frameCount: 240 },
        found: { width: 1920, height: 1080, fps: 25, frameCount: 120 },
      },
    };

    const alerts = projectIssueAlerts(issues, 'video', t, 'gauging', 'frames');

    expect(alerts[1].text).toBe(
      'ProjectIssues.framesMismatch {"foundCount":120,"foundWidth":1920,"foundHeight":1080,"count":240,"width":1920,"height":1080}'
    );
  });

  it('keeps the video wording when no source is given', () => {
    const [alert] = projectIssueAlerts(missing, 'video', t, 'DJI_0083.MP4');

    expect(alert.text).toBe('ProjectIssues.videoMissing {"name":"DJI_0083.MP4"}');
  });
});
```

Run: `npx jest src/helpers/projectIssueAlerts.frames.test.ts`
Expected: FAIL on the first two tests (video wording returned).

- [ ] **Step 3: Word the alerts by source**

In `gui/src/helpers/projectIssueAlerts.ts`, add the import and the parameter, and replace the `if (step === 'video' && issues.videoMissing) { ... }` block:

```ts
import type { VideoSource } from '../../commons/framesSource';
```

```ts
export function projectIssueAlerts(
  issues: ProjectIssuesState,
  step: IssueStep,
  t: TFunction,
  videoName: string,
  source: VideoSource = 'video'
): StepAlert[] {
  const locate = t('ProjectIssues.locate');
  const alerts: StepAlert[] = [];
  const frames = source === 'frames';

  if (step === 'video' && issues.videoMissing) {
    alerts.push({
      id: 'issue-video-missing',
      level: 'warning',
      text: t(frames ? 'ProjectIssues.framesMissing' : 'ProjectIssues.videoMissing', { name: videoName }),
      action: { label: locate, action: 'locate-video' },
    });
    if (issues.videoMismatch) {
      const { expected, found } = issues.videoMismatch;
      alerts.push({
        id: 'issue-video-mismatch',
        level: 'error',
        text: frames
          ? t('ProjectIssues.framesMismatch', {
              foundCount: found.frameCount ?? 0,
              foundWidth: found.width,
              foundHeight: found.height,
              count: expected.frameCount ?? 0,
              width: expected.width,
              height: expected.height,
            })
          : t('ProjectIssues.videoMismatch', {
              foundWidth: found.width,
              foundHeight: found.height,
              foundFps: found.fps,
              width: expected.width,
              height: expected.height,
              fps: expected.fps,
            }),
      });
    }
  }
```

The rest of the function is unchanged.

Run: `npx jest src/helpers/projectIssueAlerts`
Expected: all pass (the new file and any existing alert test).

- [ ] **Step 4: Extend `VideoData`**

In `gui/src/store/project/types.ts`:

```ts
import type { VideoSource } from '../../../commons/framesSource';
```

and add to `VideoData`:

```ts
  /** 'frames' when the project was started from a folder of frames; absent or 'video' otherwise. */
  source?: VideoSource;
  /** Frames projects only: images in the source folder. */
  frameCount?: number;
  /** Frames projects only: the time between frames in ms, exactly as typed. */
  intervalMs?: number;
```

- [ ] **Step 5: Update `useProjectSlice`**

In `gui/src/hooks/useProjectSlice.ts`:

Add the import:

```ts
import { fpsFromInterval, frameRange, parseInterval } from '../../commons/framesSource';
```

Add after `onGetVideo`:

```ts
  /** Directory dialog for a folder of already-extracted frames; null when cancelled. */
  const onGetFramesFolder = async (): Promise<{ path: string; name: string } | null> =>
    window.ipcRenderer.invoke('get-frames-folder');

  /** Count, resolution and ordered image paths of a frames folder (the open project's when no path). */
  const onInspectFramesFolder = async (path?: string) =>
    window.ipcRenderer.invoke('inspect-frames-folder', path ? { path } : undefined);
```

and add both names to the object the hook returns (next to `onGetVideo`).

In `onInitProject`, change the parameter type and the conversion message, pass `frames` on, and carry the new fields:

```ts
  const onInitProject = async (
    videoInput: {
      path: string;
      name: string;
      type: string;
      frames?: { count: number; width: number; height: number; intervalMs: number };
    },
    language: string,
    unitSistem: string
  ) => {
    dispatch(setLoading(true));

    const extension = videoInput.name.split('.').pop();
    if (!videoInput.frames && extension?.toUpperCase() !== 'MP4') {
      dispatch(setMessage(t('Loader.videoConversion')));
    }
```

```ts
      const { result, error } = await ipcRenderer.invoke('init-project', {
        path: videoInput.path,
        name: videoInput.name,
        type: videoInput.type,
        language: language,
        unitSistem: unitSistem,
        frames: videoInput.frames,
      });
```

```ts
      const videoData = {
        name: result.name,
        path: filePrefix + result.path,
        width: result.width,
        height: result.height,
        fps: result.fps,
        creation: result.creation,
        duration: result.duration,
        source: result.source,
        frameCount: result.frameCount,
        intervalMs: result.intervalMs,
      };
```

In `onLoadProject`, add three properties to the `setVideoData({ ... })` payload:

```ts
            source: videoMetadata.source,
            frameCount: videoMetadata.frameCount,
            intervalMs: videoMetadata.intervalMs,
```

In `onSetVideoParameters`:

Replace the loader message line with:

```ts
    const frames = video.data.source === 'frames';
    dispatch(setMessage(t(frames ? 'Loader.importingFrames' : 'Loader.extractingFrames')));
```

Replace `const parsedStart = parseTime(data.start);` and `const parsedEnd = parseTime(data.end);` with:

```ts
    // A frames project's form holds 1-based frame numbers and the interval; a video's holds mm:ss.
    const intervalMs = frames ? (parseInterval(String(data.interval ?? '')) ?? video.data.intervalMs ?? 0) : 0;
    const fps = frames && intervalMs > 0 ? fpsFromInterval(intervalMs) : video.data.fps;
    const intervalChanged = frames && intervalMs !== video.data.intervalMs;
    const range = frames
      ? frameRange(parseInt(data.start, 10), parseInt(data.end, 10), fps)
      : (() => {
          const parsedStart = parseTime(data.start);
          const parsedEnd = parseTime(data.end);
          return {
            startTime: parsedStart,
            endTime: parsedEnd,
            startFrame: Math.floor(parsedStart * video.data.fps),
            endFrame: Math.floor(parsedEnd * video.data.fps),
          };
        })();
    const sameRange = frames
      ? range.startFrame === video.parameters.startFrame &&
        range.endFrame === video.parameters.endFrame &&
        !intervalChanged
      : range.startTime === startTime && range.endTime === endTime;
```

In the "nothing changed" condition, replace the two lines `parsedStart === startTime &&` and `parsedEnd === endTime &&` with the single line `sameRange &&`.

In the `parameters` object, replace the four range properties with:

```ts
      startTime: range.startTime,
      endTime: range.endTime,
      startFrame: range.startFrame,
      endFrame: range.endFrame,
```

In the `ipcRenderer.invoke('first-frame', { ... })` payload add:

```ts
        intervalMs: frames ? intervalMs : undefined,
```

After `dispatch(setVideoParameters(parameters));` add:

```ts
      if (intervalChanged) {
        dispatch(
          setVideoData({
            ...video.data,
            fps,
            intervalMs,
            duration: ((video.data.frameCount ?? 0) * intervalMs) / 1000,
          })
        );
      }
```

- [ ] **Step 6: Update `useProjectIssues`**

In `gui/src/hooks/useProjectIssues.ts`:

Pass the source to the alerts:

```ts
  const alerts = useMemo(
    () => projectIssueAlerts(issues, step, t, video.data.name ?? '', video.data.source ?? 'video'),
    [issues, step, t, video.data.name, video.data.source]
  );
```

In `locateVideo`, in the `result.status === 'error'` branch replace the alert text with:

```ts
          text:
            video.data.source === 'frames'
              ? t(`Step-2.Errors.${result.message}`, { defaultValue: t('Step-2.Errors.unreadableFolder') })
              : t('ProjectIssues.videoUnreadable'),
```

(keep `id: 'locate-video-error', level: 'error'`).

- [ ] **Step 7: Type check, lint, run the renderer tests**

Run: `npx tsc --noEmit ; npm run lint ; npx jest src commons`
Expected: tsc error count unchanged from baseline (68, all `TS6305`); lint at baseline (20); tests pass.

- [ ] **Step 8: Commit**

```bash
git add gui/src/store/project/types.ts gui/src/hooks/useProjectSlice.ts gui/src/hooks/useProjectIssues.ts gui/src/helpers/projectIssueAlerts.ts gui/src/helpers/projectIssueAlerts.frames.test.ts gui/src/translations/en/global.json
git commit -m "Carry a project's frame source through the store, the hooks and the issue cards"
```

---

### Task 8: Footage step — one drop zone, two sources

**Files:**
- Modify: `gui/src/pages/FootageMode.tsx` (whole file below)
- Modify: `gui/src/pages/pages.css` (after the `.browse-video-drop-area p` rule, line ~253)

**Interfaces:**
- Consumes: `onGetVideo`, `onGetFramesFolder`, `onInspectFramesFolder`, `onInitProject` (Task 7); `parseInterval`, `fpsFromInterval` (Task 3); English copy (Task 7).
- Produces: nothing other tasks import.

- [ ] **Step 1: Read the craft floor**

Read `/Users/antoine/.claude/plugins/cache/impeccable/impeccable/4.3.1/skills/impeccable/reference/craft-floor.md` before editing any UI file in Tasks 8-11. It lists absolute bans and reflexes for interface edits.

- [ ] **Step 2: Replace `gui/src/pages/FootageMode.tsx`**

```tsx
import { WizardButtons } from '../components/WizzardButtons.js';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useWizard } from 'react-use-wizard';
import { useProjectSlice } from '../hooks/index.js';
import { Icon } from '../components/Icon.js';
import { Icons } from '../components/CustomIcons/Icons';
import { useState } from 'react';
import { OperationCanceledError, UserSelectionError } from '../errors/errors.js';
import { drone, ipcam, oblique } from '../assets/icons/icons';
import './pages.css';
import { formatNumberTo2Decimals, handleDragLeave, handleDragOver } from '../helpers/index.js';
import { fpsFromInterval, parseInterval } from '../../commons/framesSource';

/** What the project starts from: one video file, or a folder of already-extracted frames. */
type Source = {
  kind: 'video' | 'frames';
  name: string;
  path: string;
  type: string;
  frames?: { count: number; width: number; height: number };
};

const footageTypes = [
  { id: 'uav', icon: drone, label: 'Drone', description: 'Top-down view from above' },
  { id: 'oblique', icon: oblique, label: 'Oblique', description: 'Tripod or camera on the bank' },
  { id: 'ipcam', icon: ipcam, label: 'Fixed camera', description: 'IP or CCTV station' },
];

export const FootageMode = () => {
  const { handleSubmit } = useForm();
  const { onInitProject, onGetVideo, onGetFramesFolder, onInspectFramesFolder } = useProjectSlice();
  const { nextStep, previousStep } = useWizard();
  const formId = 'form-step-2';
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const [error, setError] = useState<string>('');
  const [source, setSource] = useState<Source | null>(null);
  // The interval is kept as typed: "33," must stay editable on the way to "33,3".
  const [intervalText, setIntervalText] = useState<string>('');
  const [reading, setReading] = useState<boolean>(false);

  const [dragOver, setDragOver] = useState<string | null>(null);
  const [footageType, setFootageType] = useState<string | null>(null);

  const intervalMs = parseInterval(intervalText);
  const ready = source !== null && (source.kind === 'video' || intervalMs !== null);

  const flashError = (message: string) => {
    setError(message);
    setTimeout(() => setError(''), 3000);
  };

  const onSubmit = async () => {
    if (!source || !ready) return;
    try {
      const currentUnitSystem = localStorage.getItem('unitSystem') || 'si';
      await onInitProject(
        {
          name: source.name,
          path: source.path,
          type: source.type,
          frames:
            source.kind === 'frames' && source.frames && intervalMs !== null
              ? { ...source.frames, intervalMs }
              : undefined,
        },
        currentLanguage,
        currentUnitSystem
      );
      nextStep();
    } catch (error) {
      if (error instanceof OperationCanceledError) previousStep();
    }
  };

  /** Checks a folder with the backend and, if it holds a usable sequence, makes it the source. */
  const pickFramesFolder = async (path: string, name: string, type: string) => {
    setSource(null);
    setIntervalText('');
    setReading(true);
    const result = await onInspectFramesFolder(path);
    setReading(false);
    if ('error' in result) {
      flashError(t(`Step-2.Errors.${result.error}`, { defaultValue: t('Step-2.Errors.unreadableFolder') }));
      return;
    }
    setSource({
      kind: 'frames',
      name,
      path,
      type,
      frames: { count: result.count, width: result.width, height: result.height },
    });
  };

  const onClickBrowseVideo = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    try {
      const { path, name } = await onGetVideo();
      setIntervalText('');
      setSource({ kind: 'video', name, path, type: footageType as string });
    } catch (error) {
      if (error instanceof UserSelectionError) {
        setSource(null);
        flashError(t('Step-2.pleaseSelectVideo', { defaultValue: 'Commons.randomError' }));
      }
    }
  };

  const onClickBrowseFrames = async () => {
    const folder = await onGetFramesFolder();
    if (folder) await pickFramesFolder(folder.path, folder.name, footageType as string);
  };

  const handleDrop = (type: string) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(null);
    const files = event.dataTransfer.files;
    // Must be read before any await: the drag data is gone once the handler returns.
    const isDirectory = event.dataTransfer.items?.[0]?.webkitGetAsEntry?.()?.isDirectory === true;

    setFootageType(type);

    if (files.length === 0) return;
    const file = files[0];

    if (isDirectory) {
      void pickFramesFolder(window.webUtils.getPathForFile(file), file.name, type);
    } else if (file.type.includes('video')) {
      setIntervalText('');
      setSource({ kind: 'video', name: file.name, path: window.webUtils.getPathForFile(file), type });
    } else {
      setSource(null);
      flashError(
        file.type.startsWith('image/')
          ? t('Step-2.Errors.dropFolder')
          : t('Step-2.invalidFileType', { defaultValue: 'Commons.randomError' })
      );
    }
  };

  const onChangeType = () => {
    setSource(null);
    setIntervalText('');
    setFootageType(null);
  };

  return (
    <div className="default-app-container">
      <h2 className="step-2-title">{t('Step-2.title')}</h2>
      <form className="file-upload-container" onSubmit={handleSubmit(onSubmit)} id={formId}>
        <div className="type-footage-container">
          {footageTypes.map(({ id, icon, label, description }) => (
            <div
              key={id}
              className={`footage-button-container ${dragOver === id ? `drag-over-${id}` : ''} ${footageType === id ? 'selected-footage-type' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={footageType === id}
              aria-label={t('Step-2.footageType.' + id, { defaultValue: label })}
              onDragOver={(event) => handleDragOver(event, setDragOver, id)}
              onDragLeave={(event) => handleDragLeave(event, setDragOver, true)}
              onDrop={handleDrop(id)}
              onClick={() => setFootageType(id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setFootageType(id);
                }
              }}
              id={id}
            >
              {footageType === id && (
                <span className="footage-check-badge" aria-hidden="true">
                  {Icons.Check('var(--on-accent)')}
                </span>
              )}
              <Icon path={icon} />
              <b className="footage-type-name">{t('Step-2.footageType.' + id, { defaultValue: label })}</b>
              <small className="footage-type-description">
                {t('Step-2.footageType.' + id + 'Description', { defaultValue: description })}
              </small>
            </div>
          ))}
        </div>
        <div className={`browse-video-container${footageType || source ? ' visible' : ''}`}>
          <div className="browse-video-header">
            {footageType !== null ? (
              <>
                <p>{footageType && source === null ? t(`Step-2.addYourFootage`) : ''}</p>
                <p onClick={() => onChangeType()}>{footageType ? t(`Step-2.changeType`) : undefined} </p>
              </>
            ) : (
              <></>
            )}
          </div>
          <div
            className={`browse-video-drop-area${dragOver === 'drop-area' ? ' drag-over' : ''}`}
            onDragOver={(event) => handleDragOver(event, setDragOver, 'drop-area')}
            onDragLeave={(event) => handleDragLeave(event, setDragOver, true)}
            onDrop={handleDrop(footageType as string)}
            aria-busy={reading || undefined}
            id="drop-area"
          >
            {reading && <p>{t('Step-2.readingFolder')}</p>}
            {!reading && source === null && <p> {t('Step-2.dragAndDrop')}</p>}
            {!reading && source?.kind === 'video' && <p>{source.name}</p>}

            {!reading && source?.kind === 'frames' && source.frames && (
              <div className="frames-source">
                <p className="frames-source-name">
                  <span>{source.name}</span>
                  <span className="field-readonly">{t('Step-2.framesSummary', source.frames)}</span>
                </p>
                <div className="field-row">
                  <label className="field-row-label" htmlFor="frames-interval">
                    {t('Step-2.timeBetweenFrames')}
                  </label>
                  <span className="field-with-unit">
                    <input
                      id="frames-interval"
                      className="field field-coord"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      autoFocus
                      value={intervalText}
                      onChange={(event) => setIntervalText(event.target.value)}
                    />
                    <span className="field-unit">ms</span>
                  </span>
                  <span className="field-readonly frames-source-fps">
                    {intervalMs !== null ? `${formatNumberTo2Decimals(fpsFromInterval(intervalMs))} fps` : ''}
                  </span>
                </div>
              </div>
            )}

            {source?.kind !== 'frames' && !reading && (
              <>
                <button
                  className="btn btn-lg btn-secondary"
                  data-complete={!!source}
                  onClick={onClickBrowseVideo}
                  type="button"
                >
                  {' '}
                  {t('Step-2.openFolders')}{' '}
                </button>
                {source === null && (
                  <button className="browse-frames-link" onClick={onClickBrowseFrames} type="button">
                    {t('Step-2.chooseFramesFolder')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </form>
      {error && <p className="file-name mt-2">{error}</p>}
      <WizardButtons canFollow={source === null || ready} formId={formId} />
    </div>
  );
};
```

Notes for the implementer:
- `canFollow` was `true` before. `source === null || ready` keeps Next exactly as it was until a frames folder is chosen, then holds it until the interval is valid. Check in `gui/src/components/WizzardButtons.tsx` that `canFollow={false}` disables the Next button; if it only changes its look, also keep the `if (!source || !ready) return;` guard in `onSubmit` (already there).

- [ ] **Step 3: Add the styles**

In `gui/src/pages/pages.css`, after the `.browse-video-drop-area p { ... }` rule:

```css
/* Second way in: a text link under the Browse button. Same treatment as "Change type",
   as a real button so the keyboard reaches it. */
.browse-frames-link {
    margin-top: var(--space-3);
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: var(--primary-color);
    text-decoration: underline;
    cursor: pointer;
}

.browse-frames-link:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
}

/* A chosen frames folder: its name and facts on one line, the one required value under it. */
.frames-source {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: min(520px, 100% - 60px);
}

.browse-video-drop-area .frames-source-name {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-4);
    margin-bottom: 0;
    color: var(--text-primary);
}

.frames-source-name > span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.frames-source-fps {
    min-width: 72px;
    text-align: right;
}
```

Before saving, confirm `--space-3`, `--space-4` and `--text-primary` exist: `grep -n -e "--space-3:" -e "--space-4:" -e "--text-primary:" src/index.css`. Each must print at least one line. If a spacing token is missing, use the nearest existing `--space-*` step, never a raw pixel value.

- [ ] **Step 4: Type check and lint**

Run: `npx tsc --noEmit ; npm run lint`
Expected: both at baseline.

- [ ] **Step 5: Run the mechanical design detector on the changed files**

Run: `"/Users/antoine/.claude/plugins/cache/impeccable/impeccable/4.3.1/skills/impeccable/scripts/impeccable" detect --json src/pages/FootageMode.tsx src/pages/pages.css`
Expected: no finding on a line this task added. Fix any that appear; ignore findings on lines this task did not touch.

- [ ] **Step 6: Commit**

```bash
git add gui/src/pages/FootageMode.tsx gui/src/pages/pages.css
git commit -m "Accept a folder of frames in the footage step's drop zone"
```

---

### Task 9: Frame player

**Files:**
- Create: `gui/src/helpers/framePlayback.ts`, `gui/src/helpers/framePlayback.test.ts`
- Create: `gui/src/components/VideoPlayer/FramePlayer.tsx`
- Create: `gui/src/hooks/useSourceFrames.ts`
- Modify: `gui/src/pages/VideoRange.tsx`

**Interfaces:**
- Consumes: `onInspectFramesFolder` (Task 7); `useImageZoomPan` from `../../hooks`; `.video-player`, `.video`, `.video-controls`, `.video-player-time`, `.video-player-seekbar`, `.ibtn` styles; `Icons.Play`, `Icons.Pause`, `Icons.FrameBack`, `Icons.FrameNext`.
- Produces:
  - `framePlayback.ts`: `clampIndex(index: number, count: number): number`, `indexFromProgress(fraction: number, count: number): number`, `progressFromIndex(index: number, count: number): number` (0-100), `playbackDelay(fps: number): number` (ms, never below 40).
  - `FramePlayer` props: `{ frames: string[]; fps: number; currentFrame: number; onFrameChange: (index: number) => void; overlay?: (zoom: { scale: number; position: { x: number; y: number } }) => React.ReactNode }`. `currentFrame` is 0-based.
  - `useSourceFrames(enabled: boolean): string[]` — the source folder's image URLs in order (already prefixed for `<img src>`), `[]` until loaded or when disabled.
  - `VideoRange` holds `currentFrame` state and passes it to `FormVideo` as the prop `currentFrame` (Task 10 consumes it).

- [ ] **Step 1: Write the failing helper test**

Create `gui/src/helpers/framePlayback.test.ts`:

```ts
import { clampIndex, indexFromProgress, playbackDelay, progressFromIndex } from './framePlayback';

describe('clampIndex', () => {
  it('keeps an index inside the sequence', () => {
    expect(clampIndex(-3, 10)).toBe(0);
    expect(clampIndex(4, 10)).toBe(4);
    expect(clampIndex(25, 10)).toBe(9);
    expect(clampIndex(2.6, 10)).toBe(3);
  });

  it('is 0 for an empty sequence', () => {
    expect(clampIndex(5, 0)).toBe(0);
  });
});

describe('indexFromProgress / progressFromIndex', () => {
  it('maps the two ends of the bar to the first and last frame', () => {
    expect(indexFromProgress(0, 240)).toBe(0);
    expect(indexFromProgress(1, 240)).toBe(239);
    expect(progressFromIndex(0, 240)).toBe(0);
    expect(progressFromIndex(239, 240)).toBe(100);
  });

  it('round-trips every frame of a short sequence', () => {
    for (let i = 0; i < 7; i++) {
      expect(indexFromProgress(progressFromIndex(i, 7) / 100, 7)).toBe(i);
    }
  });

  it('does not divide by zero on a single frame', () => {
    expect(progressFromIndex(0, 1)).toBe(0);
    expect(indexFromProgress(0.5, 1)).toBe(0);
  });
});

describe('playbackDelay', () => {
  it('plays at the real rate, capped at 25 frames per second', () => {
    expect(playbackDelay(10)).toBe(100);
    expect(playbackDelay(25)).toBe(40);
    expect(playbackDelay(120)).toBe(40);
  });

  it('falls back to the cap for an unusable rate', () => {
    expect(playbackDelay(0)).toBe(40);
    expect(playbackDelay(NaN)).toBe(40);
  });
});
```

Run: `npx jest src/helpers/framePlayback.test.ts`
Expected: FAIL, `Cannot find module './framePlayback'`.

- [ ] **Step 2: Implement `gui/src/helpers/framePlayback.ts`**

```ts
/** Index maths for the frame player: a folder of frames scrubbed like a video. */

export function clampIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(Math.round(index), 0), count - 1);
}

/** `fraction` is the pointer's position along the seek bar, 0 to 1. */
export function indexFromProgress(fraction: number, count: number): number {
  return clampIndex(fraction * (count - 1), count);
}

/** Percentage along the seek bar for a frame. */
export function progressFromIndex(index: number, count: number): number {
  return count > 1 ? (clampIndex(index, count) / (count - 1)) * 100 : 0;
}

// Decoding full-size stills faster than this stutters; playback is a preview, not a measurement.
const MIN_DELAY_MS = 40;

export function playbackDelay(fps: number): number {
  return fps > 0 ? Math.max(MIN_DELAY_MS, 1000 / fps) : MIN_DELAY_MS;
}
```

Run: `npx jest src/helpers/framePlayback.test.ts`
Expected: all pass.

- [ ] **Step 3: Create `gui/src/hooks/useSourceFrames.ts`**

```ts
import { useEffect, useState } from 'react';
import { useProjectSlice } from './useProjectSlice';

/**
 * The open frames project's source images, in import order, ready for <img src>.
 * Empty until the folder has been read, and when the project is not a frames project.
 */
export const useSourceFrames = (enabled: boolean): string[] => {
  const { onInspectFramesFolder, video } = useProjectSlice();
  const [frames, setFrames] = useState<string[]>([]);

  let filePrefix = import.meta.env.VITE_FILE_PREFIX;
  filePrefix = filePrefix === undefined ? '' : filePrefix;

  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      setFrames([]);
      return;
    }
    onInspectFramesFolder().then((result) => {
      if (cancelled) return;
      setFrames('error' in result ? [] : result.files.map((file: string) => filePrefix + file));
    });
    return () => {
      cancelled = true;
    };
    // video.data.path changes when a moved folder is located: read the new one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, video.data.path]);

  return frames;
};
```

Export it from `gui/src/hooks/index.ts` the way the neighbouring hooks are exported (add `useSourceFrames` to the import and the export list there).

- [ ] **Step 4: Create `gui/src/components/VideoPlayer/FramePlayer.tsx`**

```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import '../components.css';
import { Icons } from '../CustomIcons/Icons';
import { useImageZoomPan } from '../../hooks';
import { clampIndex, indexFromProgress, playbackDelay, progressFromIndex } from '../../helpers/framePlayback';

interface FramePlayerProps {
  /** Image URLs in import order. */
  frames: string[];
  fps: number;
  /** 0-based index of the frame on screen; owned by the page so the form can read it. */
  currentFrame: number;
  onFrameChange: (index: number) => void;
  /** Same contract as VideoPlayer's overlay, so StabilizationCanvas works unchanged. */
  overlay?: (zoom: { scale: number; position: { x: number; y: number } }) => React.ReactNode;
}

/** How many frames ahead are decoded while playing or stepping. */
const LOOK_AHEAD = 3;

/** VideoPlayer's counterpart for a project made from a folder of frames. */
export const FramePlayer = ({ frames, fps, currentFrame, onFrameChange, overlay }: FramePlayerProps) => {
  const count = frames.length;
  const zoomContainerRef = useRef<HTMLDivElement>(null);
  const seekBar = useRef<HTMLDivElement>(null);
  const [zoomContainerSize, setZoomContainerSize] = useState({ width: 0, height: 0 });
  const [playing, setPlaying] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    const el = zoomContainerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setZoomContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [count > 0]);

  const {
    scale,
    position,
    handleWheel,
    handleMouseDown: handleZoomMouseDown,
    handleMouseMove: handleZoomMouseMove,
    handleMouseUp: handleZoomMouseUp,
    handleDoubleClick: handleZoomDoubleClick,
    handleDragStart: handleZoomDragStart,
  } = useImageZoomPan({
    containerWidth: zoomContainerSize.width,
    containerHeight: zoomContainerSize.height,
    minScale: 1,
    maxScale: 5,
    zoomSpeed: 0.0015,
  });

  // Playback: advance one frame per tick and loop, like the video element does.
  useEffect(() => {
    if (!playing || count < 2) return;
    const timer = window.setInterval(() => {
      onFrameChange(currentFrame + 1 >= count ? 0 : currentFrame + 1);
    }, playbackDelay(fps));
    return () => window.clearInterval(timer);
  }, [playing, count, fps, currentFrame, onFrameChange]);

  // Decode the next few frames so stepping and playback do not flash an empty image.
  useEffect(() => {
    for (let ahead = 1; ahead <= LOOK_AHEAD; ahead++) {
      const src = frames[currentFrame + ahead];
      if (src) new Image().src = src;
    }
  }, [frames, currentFrame]);

  const seek = useCallback(
    (clientX: number) => {
      if (!seekBar.current) return;
      const rect = seekBar.current.getBoundingClientRect();
      const fraction = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      onFrameChange(indexFromProgress(fraction, count));
    },
    [count, onFrameChange]
  );

  useEffect(() => {
    if (!scrubbing) return;
    const onMove = (event: MouseEvent) => seek(event.clientX);
    const onUp = () => setScrubbing(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [scrubbing, seek]);

  const step = (direction: -1 | 1) => {
    setPlaying(false);
    // The frame buttons move by the form's Step, as they do for a video.
    const stepInput = document.getElementById('input-step') as HTMLInputElement | null;
    const size = stepInput ? parseInt(stepInput.value, 10) || 1 : 1;
    onFrameChange(clampIndex(currentFrame + direction * size, count));
  };

  if (count === 0) return null;

  const progress = `${progressFromIndex(currentFrame, count)}%`;

  return (
    <div className="video-player">
      <div
        className="video"
        ref={zoomContainerRef}
        style={{ position: 'relative', overflow: 'hidden' }}
        onWheel={handleWheel}
        onMouseDown={handleZoomMouseDown}
        onMouseMove={handleZoomMouseMove}
        onMouseUp={handleZoomMouseUp}
        onMouseLeave={handleZoomMouseUp}
        onDoubleClick={handleZoomDoubleClick}
        onDragStart={handleZoomDragStart}
      >
        <div
          style={{
            position: 'relative',
            display: 'inline-block',
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '50% 50%',
            willChange: 'transform',
          }}
        >
          <img className="video" src={frames[clampIndex(currentFrame, count)]} alt="" draggable={false} />
          {overlay?.({ scale, position })}
        </div>
      </div>

      <div className="video-controls">
        <div className="video-player-time">
          {clampIndex(currentFrame, count) + 1} / {count}
        </div>
        <div
          className="video-player-seekbar"
          ref={seekBar}
          onMouseDown={(event) => {
            setPlaying(false);
            setScrubbing(true);
            seek(event.clientX);
          }}
        >
          <span id="background-track"></span>
          <span id="progress-track" style={{ '--progress': progress } as React.CSSProperties}></span>
          <span id="thumb" style={{ '--progress': progress } as React.CSSProperties}></span>
        </div>
        <div className="row" style={{ width: '100%', justifyContent: 'space-between', paddingTop: '10px' }}>
          <button type="button" className="ibtn" onClick={() => step(-1)}>
            <span className="cl show">{Icons.FrameBack('currentColor')}</span>
          </button>
          <button type="button" className="ibtn" onClick={() => setPlaying((value) => !value)}>
            <span className="cl show">{playing ? Icons.Pause('currentColor') : Icons.Play('currentColor')}</span>
          </button>
          <button type="button" className="ibtn" onClick={() => step(1)}>
            <span className="cl show">{Icons.FrameNext('currentColor')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
```

The inline styles and the `id="background-track"` spans copy `VideoPlayer.tsx` and `VideoPlayerSeekBar.tsx` on purpose: the seek bar's CSS is keyed on those ids, and the two players must look identical. The ResizeObserver effect depends on `count > 0` because the container only exists once frames have loaded; add `// eslint-disable-next-line react-hooks/exhaustive-deps` above that dependency array if lint flags it.

- [ ] **Step 5: Use it in `gui/src/pages/VideoRange.tsx`**

Add imports:

```tsx
import { useRef, useState } from 'react';
import { FramePlayer } from '../components/VideoPlayer/FramePlayer';
import { useProjectSlice, useProjectIssues, useSourceFrames } from '../hooks';
```

(replace the existing `useRef` and hooks imports with these).

Read `fps` and `source` from `video.data`, and add the state, after the existing destructuring:

```tsx
  const { path, duration, width: videoWidth, height: videoHeight, fps, source } = video.data;
```

```tsx
  const isFrames = source === 'frames';
  const sourceFrames = useSourceFrames(isFrames && !videoMissing);
  const [currentFrame, setCurrentFrame] = useState(0);
```

Replace the media block:

```tsx
        {isFrames && sourceFrames.length > 0 ? (
          <FramePlayer
            frames={sourceFrames}
            fps={fps}
            currentFrame={currentFrame}
            onFrameChange={setCurrentFrame}
            overlay={stabilizationOverlay}
          />
        ) : path && !isFrames ? (
          <VideoPlayer ref={videoRef} fileURL={path} duration={duration} overlay={stabilizationOverlay} />
        ) : (
          videoMissing && firstFramePath && <img className="video-missing-still" src={firstFramePath} alt="" />
        )}
```

Pass the frame to the form:

```tsx
        <FormVideo duration={duration} extraFields={extraFields} currentFrame={currentFrame} />
```

`FormVideo` does not accept `currentFrame` until Task 10; to keep this task compiling on its own, add the optional prop to its signature now and leave it unused:

```tsx
export const FormVideo = ({
  duration,
  extraFields,
  currentFrame = 0,
}: {
  duration: number;
  extraFields: boolean;
  currentFrame?: number;
}) => {
```

If lint flags the unused `currentFrame`, add `void currentFrame;` as the first line of the component; Task 10 removes it.

- [ ] **Step 6: Type check, lint, tests**

Run: `npx tsc --noEmit ; npm run lint ; npx jest src/helpers/framePlayback.test.ts`
Expected: tsc and lint at baseline; tests pass.

- [ ] **Step 7: Commit**

```bash
git add gui/src/helpers/framePlayback.ts gui/src/helpers/framePlayback.test.ts gui/src/hooks/useSourceFrames.ts gui/src/hooks/index.ts gui/src/components/VideoPlayer/FramePlayer.tsx gui/src/pages/VideoRange.tsx gui/src/components/Forms/FormVideo.tsx
git commit -m "Scrub a frames project's source folder in the Video Range step"
```

---

### Task 10: Video Range form — frame numbers and the editable interval

**Files:**
- Modify: `gui/src/helpers/validationRules.ts` (add `getFrameValidationRules`)
- Modify: `gui/src/components/Forms/FormVideo.tsx`
- Modify: `gui/src/components/Forms/Components/VideoMetadata.tsx`
- Test: `gui/src/helpers/validationRules.frames.test.ts` (new)

**Interfaces:**
- Consumes: `frameRangeValid`, `parseInterval`, `selectedFrameCount`, `fpsFromInterval` (Task 3); `currentFrame` prop (Task 9); `onSetVideoParameters` reading `data.start`, `data.end`, `data.step`, `data.interval` (Task 7).
- Produces:
  - `getFrameValidationRules(t, getValues, count)` → `{ start, end, step, interval }` rules for react-hook-form.
  - `VideoMetadata` prop `intervalField?: React.ReactNode`.

- [ ] **Step 1: Write the failing validation test**

Create `gui/src/helpers/validationRules.frames.test.ts`:

```ts
import { getFrameValidationRules } from './validationRules';

const t = (key: string) => key;
const rules = (values: Record<string, string>) => getFrameValidationRules(t, (name: string) => values[name], 240);

describe('getFrameValidationRules', () => {
  it('accepts a range inside the folder', () => {
    const r = rules({ start: '1', end: '240' });
    expect(r.start.validate('1')).toBe(true);
    expect(r.end.validate('240')).toBe(true);
  });

  it.each([
    ['0', '10'],
    ['10', '10'],
    ['12', '10'],
    ['1', '241'],
    ['1.5', '10'],
    ['abc', '10'],
  ])('refuses start %s end %s on the End field', (start, end) => {
    expect(rules({ start, end }).end.validate(end)).toBe('VideoRange.Errors.frameRange');
  });

  it('reports a bad Start on the Start field only when Start itself is unusable', () => {
    expect(rules({ start: '0', end: '10' }).start.validate('0')).toBe('VideoRange.Errors.frameRange');
    expect(rules({ start: '12', end: '10' }).start.validate('12')).toBe(true);
  });

  it('accepts a decimal comma in the interval and refuses zero', () => {
    const r = rules({});
    expect(r.interval.validate('33,3')).toBe(true);
    expect(r.interval.validate('0')).toBe('VideoRange.Errors.interval');
    expect(r.interval.validate('')).toBe('VideoRange.Errors.interval');
  });

  it('keeps the video rule for Step', () => {
    expect(rules({}).step.pattern.value.test('2')).toBe(true);
    expect(rules({}).step.pattern.value.test('0')).toBe(false);
  });
});
```

Run: `npx jest src/helpers/validationRules.frames.test.ts`
Expected: FAIL, `getFrameValidationRules` is not exported.

- [ ] **Step 2: Implement the rules**

In `gui/src/helpers/validationRules.ts` add the import and the function:

```ts
import { frameRangeValid, parseInterval } from '../../commons/framesSource';
```

```ts
/**
 * Video Range rules for a project made from a folder of frames: Start and End are
 * 1-based frame numbers, and the time between frames is editable.
 */
export const getFrameValidationRules = (t: any, getValues: any, count: number) => {
  const rangeError = () => t('VideoRange.Errors.frameRange', { count });
  return {
    start: {
      required: t('VideoRange.Errors.required'),
      // A Start that is merely past End is reported once, on End.
      validate: (value: string) => {
        const start = Number(value);
        return Number.isInteger(start) && start >= 1 && start < count ? true : rangeError();
      },
    },
    end: {
      required: t('VideoRange.Errors.required'),
      validate: (value: string) => (frameRangeValid(Number(getValues('start')), Number(value), count) ? true : rangeError()),
    },
    step: getValidationRules(t, getValues, 0).step,
    interval: {
      validate: (value: string) => (parseInterval(String(value)) !== null ? true : t('VideoRange.Errors.interval')),
    },
  };
};
```

The test's `t` ignores options, so it sees the bare key.

Run: `npx jest src/helpers/validationRules.frames.test.ts`
Expected: all pass.

- [ ] **Step 3: Show the frames facts and the interval in `VideoMetadata`**

Replace `gui/src/components/Forms/Components/VideoMetadata.tsx` with:

```tsx
import { useTranslation } from 'react-i18next';
import { useProjectSlice } from '../../../hooks';

/** The source file's facts: read-only text, so quiet that it never competes with a field (rules 3, 7).
 *  A frames project adds one editable row, the time between frames, passed in by the form that owns it. */
export const VideoMetadata = ({ intervalField }: { intervalField?: React.ReactNode }) => {
  const { t } = useTranslation();
  const { video } = useProjectSlice();
  const { name, width, height, duration, fps, source, frameCount } = video.data;
  const frames = source === 'frames';

  const rows: Array<[string, string]> = frames
    ? [
        [t('VideoRange.ExtraInfo.folderName'), name ?? ''],
        [t('VideoRange.ExtraInfo.frameCount'), `${frameCount ?? 0}`],
        [t('VideoRange.ExtraInfo.resolution'), `${width} × ${height}`],
      ]
    : [
        [t('VideoRange.ExtraInfo.fileName'), name ?? ''],
        [t('VideoRange.ExtraInfo.totalLength'), `${Number(duration).toFixed(2)} s`],
        [t('VideoRange.ExtraInfo.resolution'), `${width} × ${height}`],
        ['FPS', `${fps}`],
      ];

  return (
    <div className="panel-section">
      <hr className="panel-rule" />
      <p className="panel-group">
        {frames
          ? t('VideoRange.sourceFrames')
          : t('VideoRange.sourceVideo', { defaultValue: 'Source video' })}
      </p>
      {rows.map(([label, value]) => (
        <div className="field-row" key={label}>
          <span className="field-row-label">{label.replace(/:\s*$/, '')}</span>
          <span className="field-readonly">{value}</span>
        </div>
      ))}
      {frames && intervalField}
    </div>
  );
};
```

- [ ] **Step 4: Branch `FormVideo` on the source**

In `gui/src/components/Forms/FormVideo.tsx`:

Imports:

```tsx
import { getFrameValidationRules, getValidationRules } from '../../helpers/validationRules';
import { formatNumberTo2Decimals, formatTime } from '../../helpers';
import { fpsFromInterval, parseInterval, selectedFrameCount } from '../../../commons/framesSource';
```

(replace the existing `getValidationRules` and `formatTime` import lines).

Remove the `void currentFrame;` line if Task 9 added it.

After `const { startTime, endTime, step } = videoData.parameters;` add:

```tsx
  const { startFrame, endFrame } = videoData.parameters;
  const { source, frameCount = 0, intervalMs } = videoData.data;
  const frames = source === 'frames';
```

Replace the `useForm({ defaultValues: { ... } })` call with:

```tsx
  const { handleSubmit, register, setValue, getValues, watch } = useForm({
    defaultValues: frames
      ? {
          // 1-based frame numbers; endFrame is 0 until the first extraction.
          start: String(startFrame + 1),
          end: String(endFrame !== 0 ? endFrame : frameCount),
          step: step,
          interval: intervalMs ? String(intervalMs) : '',
        }
      : {
          start: formatTime(startTime, 'mm:ss'),
          end: formatTime(endTime !== 0 ? endTime : duration, 'mm:ss'),
          step: step,
          interval: '',
        },
  });
```

After `const watchEndTime = watch('end');` add `const watchInterval = watch('interval');`.

Replace the `validationRules`, `timeBetweenFrames` and `numberOfFrames` lines with:

```tsx
  const frameRules = getFrameValidationRules(t, getValues, frameCount);
  const validationRules = frames ? frameRules : getValidationRules(t, getValues, duration);

  // What the user is typing right now, so the summary follows an edited interval.
  const typedInterval = parseInterval(String(watchInterval ?? ''));
  const timeBetweenFrames = frames
    ? ((typedInterval ?? 0) * watchStep).toFixed(2)
    : ((1 / (fps || 0)) * watchStep * 1000).toFixed(2);

  const numberOfFrames = frames
    ? selectedFrameCount(Number(watchStartTime) - 1, Number(watchEndTime), Number(watchStep))
    : Math.floor(((parseTime(watchEndTime) - parseTime(watchStartTime)) * fps) / watchStep);
```

Replace `handleClick` with:

```tsx
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // currentTarget is the button itself; the click's own target is the icon inside it, which has no id.
    const field = event.currentTarget.id === 'start-button' ? 'start' : 'end';
    if (frames) {
      // The player's index is 0-based; the form shows 1-based frame numbers.
      setValue(field, String(currentFrame + 1), { shouldValidate: true });
      return;
    }
    if (video === null) return;
    setValue(field, formatTime(video.currentTime, 'mm:ss'), { shouldValidate: true });
  };
```

At the top of `handleBlur`, before `let value = event.target.value;`, add:

```tsx
    if (frames) {
      // Frame numbers are validated as typed; only a video's times are reformatted to mm:ss.
      onClearFieldError(event.target.id);
      return;
    }
```

In `handleKeyDown`, inside `if (event.key === 'Enter') {`, right after `if (id === 'step') return;`, add:

```tsx
      if (frames) {
        onClearFieldError(id);
        document.getElementById(id === 'start' ? 'end' : 'input-step')?.focus();
        return;
      }
```

In the `<fieldset>`, change the `title` to:

```tsx
          title={
            videoMissing ? t(frames ? 'ProjectIssues.framesLocked' : 'ProjectIssues.videoLocked') : undefined
          }
```

On both the Start and End `<input>`, change `defaultValue="00:00"` to `defaultValue={frames ? '1' : '00:00'}` and add `inputMode={frames ? 'numeric' : undefined}`.

Replace `<VideoMetadata />` with:

```tsx
          <VideoMetadata
            intervalField={
              <>
                <div className="field-row field-row-top">
                  <label className="field-row-label" htmlFor="interval">
                    {t('Step-2.timeBetweenFrames')}
                  </label>
                  <span className="field-with-unit">
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      id="interval"
                      className="field field-coord"
                      {...register('interval', frames ? frameRules.interval : undefined)}
                    />
                    <span className="field-unit">ms</span>
                  </span>
                </div>
                <p className="field-readonly panel-summary">
                  {typedInterval !== null ? `${formatNumberTo2Decimals(fpsFromInterval(typedInterval))} fps` : ''}
                </p>
                <FieldError name="interval" />
              </>
            }
          />
```

`onSubmit` needs no change: `data` already carries `interval`, and the lens-profile and stabilization checks read width and height from the store.

`handleBlur`, `handleKeyDown` and `setValue` are typed with `'start' | 'end' | 'step'`; the form now also has `interval`. If tsc complains about a call you did not add, widen nothing: the three existing unions are still correct for the calls that use them.

- [ ] **Step 5: Type check, lint, tests**

Run: `npx tsc --noEmit ; npm run lint ; npx jest src/helpers/validationRules.frames.test.ts src/helpers`
Expected: tsc and lint at baseline; tests pass.

- [ ] **Step 6: Run the detector on the changed UI files**

Run: `"/Users/antoine/.claude/plugins/cache/impeccable/impeccable/4.3.1/skills/impeccable/scripts/impeccable" detect --json src/components/Forms/FormVideo.tsx src/components/Forms/Components/VideoMetadata.tsx src/components/VideoPlayer/FramePlayer.tsx`
Expected: no finding on a line added by Tasks 9-10.

- [ ] **Step 7: Commit**

```bash
git add gui/src/helpers/validationRules.ts gui/src/helpers/validationRules.frames.test.ts gui/src/components/Forms/FormVideo.tsx gui/src/components/Forms/Components/VideoMetadata.tsx
git commit -m "Set a frames project's range in frame numbers and keep its interval editable"
```

---

### Task 11: Report — say the footage was an image sequence

**Files:**
- Modify: `gui/src/components/Report/Method.tsx` (the `FootagePanel` facts list, lines ~56-90)

**Interfaces:**
- Consumes: `video.data.source`, `frameCount`, `intervalMs` (Task 7); keys `Report.Doc.sourceLabel`, `Report.Doc.imageSequence` (Task 7).

- [ ] **Step 1: Branch the facts**

In `FootagePanel`, extend the destructuring:

```tsx
  const { name, width, height, fps, duration, creation, source, frameCount, intervalMs } = video.data;
  const isFrames = source === 'frames';
```

Replace the resolution `<dd>` content:

```tsx
          <dd>
            {isFrames ? (
              <>
                {width} × {height}
              </>
            ) : (
              <>
                {width} × {height} · {formatNumberTo2Decimals(fps)} fps · {formatTime(duration)}
              </>
            )}
          </dd>
```

Directly after that resolution `<div>`, add:

```tsx
        {isFrames && (
          <div>
            <dt>{t('Report.Doc.sourceLabel')}</dt>
            <dd>
              {/* The interval is declared by the operator, not measured: the report says so. */}
              {t('Report.Doc.imageSequence', {
                count: frameCount ?? 0,
                ms: formatNumberTo2Decimals(intervalMs ?? 0),
              })}
            </dd>
          </div>
        )}
```

Replace the processed-range `<dd>` content:

```tsx
          <dd>
            {isFrames ? (
              <>
                {p.startFrame + 1} → {p.endFrame}
              </>
            ) : (
              <>
                {formatTime(p.startTime)} → {formatTime(p.endTime)}
              </>
            )}
          </dd>
```

The frame-step row below it already reads `p.step` and `fps`, and is correct for both sources.

- [ ] **Step 2: Type check, lint, report tests**

Run: `npx tsc --noEmit ; npm run lint ; npx jest src/helpers/report src/components/Report`
Expected: tsc and lint at baseline; any existing report tests pass (Jest prints "No tests found" for a pattern with no test files; that is fine).

- [ ] **Step 3: Commit**

```bash
git add gui/src/components/Report/Method.tsx
git commit -m "State in the report that the footage was an image sequence with an entered interval"
```

---

### Task 12: Translate the new copy into the other 11 languages

**Files:**
- Modify: `gui/src/translations/{ar,de,es,fr,hi,it,ja,ko,pt,ru,zh}/global.json`
- Test: `gui/src/translations/framesCopy.test.ts` (new)

**Interfaces:**
- Consumes: the English keys added in Task 7.

- [ ] **Step 1: Write the failing completeness test**

Create `gui/src/translations/framesCopy.test.ts`:

```ts
import * as fs from 'fs';
import * as path from 'path';

const LANGUAGES = ['ar', 'de', 'en', 'es', 'fr', 'hi', 'it', 'ja', 'ko', 'pt', 'ru', 'zh'];

/** Every string the frames import added, with the placeholders it must keep. */
const KEYS: Array<[string, string[]]> = [
  ['Step-2.dragAndDrop', []],
  ['Step-2.chooseFramesFolder', []],
  ['Step-2.readingFolder', []],
  ['Step-2.framesSummary', ['count', 'width', 'height']],
  ['Step-2.timeBetweenFrames', []],
  ['Step-2.Errors.noFrames', []],
  ['Step-2.Errors.mixedSizes', []],
  ['Step-2.Errors.dropFolder', []],
  ['Step-2.Errors.unreadableFolder', []],
  ['VideoRange.sourceFrames', []],
  ['VideoRange.Errors.frameRange', ['count']],
  ['VideoRange.Errors.interval', []],
  ['VideoRange.ExtraInfo.folderName', []],
  ['VideoRange.ExtraInfo.frameCount', []],
  ['Report.Doc.sourceLabel', []],
  ['Report.Doc.imageSequence', ['count', 'ms']],
  ['Loader.importingFrames', []],
  ['ProjectIssues.framesMissing', ['name']],
  ['ProjectIssues.framesMismatch', ['foundCount', 'foundWidth', 'foundHeight', 'count', 'width', 'height']],
  ['ProjectIssues.framesLocked', []],
];

const load = (language: string) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, language, 'global.json'), 'utf-8'));

const read = (bundle: any, key: string) => key.split('.').reduce((node, part) => node?.[part], bundle);

describe('frames import copy', () => {
  it('reads every language file (canary: this sweep sees real content)', () => {
    expect(read(load('en'), 'Step-2.title')).toBe('Select the kind of footage');
  });

  describe.each(LANGUAGES)('%s', (language) => {
    const bundle = load(language);

    it.each(KEYS)('has %s with its placeholders', (key, placeholders) => {
      const value = read(bundle, key);
      expect(typeof value).toBe('string');
      expect(value.trim()).not.toBe('');
      for (const placeholder of placeholders) {
        expect(value).toContain(`{{${placeholder}}}`);
      }
    });
  });
});
```

Run: `npx jest src/translations/framesCopy.test.ts`
Expected: `en` passes; the other 11 languages FAIL on the missing keys.

- [ ] **Step 2: Add the strings**

For each language, merge these values into the same groups the English file uses (`Step-2`, `Step-2.Errors`, `VideoRange`, `VideoRange.Errors`, `VideoRange.ExtraInfo`, `Report.Doc`, `Loader`, `ProjectIssues`). `Step-2.dragAndDrop` replaces the existing value; everything else is new. Keep each file's existing indentation and key order; add new keys at the end of their group.

**es**
```json
"Step-2.dragAndDrop": "Arrastra aquí un video o una carpeta de fotogramas",
"Step-2.chooseFramesFolder": "o elige una carpeta de fotogramas",
"Step-2.readingFolder": "Leyendo la carpeta…",
"Step-2.framesSummary": "{{count}} fotogramas · {{width}} × {{height}}",
"Step-2.timeBetweenFrames": "Tiempo entre fotogramas",
"Step-2.Errors.noFrames": "Esta carpeta tiene menos de 2 imágenes JPEG o PNG.",
"Step-2.Errors.mixedSizes": "Las imágenes de esta carpeta no tienen todas el mismo tamaño.",
"Step-2.Errors.dropFolder": "Suelta la carpeta que contiene los fotogramas, no las imágenes.",
"Step-2.Errors.unreadableFolder": "No se pudo leer esta carpeta.",
"VideoRange.sourceFrames": "Fotogramas de origen",
"VideoRange.Errors.frameRange": "Inicio y Fin deben ser números enteros de fotograma entre 1 y {{count}}, con Inicio antes que Fin.",
"VideoRange.Errors.interval": "El tiempo entre fotogramas debe ser un número mayor que 0.",
"VideoRange.ExtraInfo.folderName": "Carpeta",
"VideoRange.ExtraInfo.frameCount": "Fotogramas",
"Report.Doc.sourceLabel": "Origen",
"Report.Doc.imageSequence": "Secuencia de imágenes · {{count}} fotogramas · intervalo ingresado por el operador: {{ms}} ms",
"Loader.importingFrames": "Importando fotogramas",
"ProjectIssues.framesMissing": "No se encontró la carpeta de fotogramas {{name}}. Los fotogramas importados siguen disponibles.",
"ProjectIssues.framesMismatch": "Esta carpeta tiene {{foundCount}} fotogramas de {{foundWidth}}×{{foundHeight}}; el proyecto se hizo con {{count}} fotogramas de {{width}}×{{height}}.",
"ProjectIssues.framesLocked": "Falta la carpeta de fotogramas: ubícala para cambiar el rango, el paso o la estabilización."
```

**fr**
```json
"Step-2.dragAndDrop": "Glissez ici une vidéo ou un dossier d'images",
"Step-2.chooseFramesFolder": "ou choisissez un dossier d'images",
"Step-2.readingFolder": "Lecture du dossier…",
"Step-2.framesSummary": "{{count}} images · {{width}} × {{height}}",
"Step-2.timeBetweenFrames": "Temps entre images",
"Step-2.Errors.noFrames": "Ce dossier contient moins de 2 images JPEG ou PNG.",
"Step-2.Errors.mixedSizes": "Les images de ce dossier n'ont pas toutes la même taille.",
"Step-2.Errors.dropFolder": "Déposez le dossier qui contient les images, pas les images.",
"Step-2.Errors.unreadableFolder": "Ce dossier n'a pas pu être lu.",
"VideoRange.sourceFrames": "Images source",
"VideoRange.Errors.frameRange": "Début et Fin doivent être des numéros d'image entiers entre 1 et {{count}}, avec Début avant Fin.",
"VideoRange.Errors.interval": "Le temps entre images doit être un nombre supérieur à 0.",
"VideoRange.ExtraInfo.folderName": "Dossier",
"VideoRange.ExtraInfo.frameCount": "Images",
"Report.Doc.sourceLabel": "Source",
"Report.Doc.imageSequence": "Séquence d'images · {{count}} images · intervalle saisi par l'opérateur : {{ms}} ms",
"Loader.importingFrames": "Importation des images",
"ProjectIssues.framesMissing": "Dossier d'images {{name}} introuvable. Les images importées restent disponibles.",
"ProjectIssues.framesMismatch": "Ce dossier contient {{foundCount}} images en {{foundWidth}}×{{foundHeight}} ; le projet a été créé avec {{count}} images en {{width}}×{{height}}.",
"ProjectIssues.framesLocked": "Le dossier d'images est manquant : localisez-le pour modifier la plage, le pas ou la stabilisation."
```

**pt**
```json
"Step-2.dragAndDrop": "Arraste aqui um vídeo ou uma pasta de quadros",
"Step-2.chooseFramesFolder": "ou escolha uma pasta de quadros",
"Step-2.readingFolder": "Lendo a pasta…",
"Step-2.framesSummary": "{{count}} quadros · {{width}} × {{height}}",
"Step-2.timeBetweenFrames": "Tempo entre quadros",
"Step-2.Errors.noFrames": "Esta pasta tem menos de 2 imagens JPEG ou PNG.",
"Step-2.Errors.mixedSizes": "As imagens desta pasta não têm todas o mesmo tamanho.",
"Step-2.Errors.dropFolder": "Solte a pasta que contém os quadros, não as imagens.",
"Step-2.Errors.unreadableFolder": "Não foi possível ler esta pasta.",
"VideoRange.sourceFrames": "Quadros de origem",
"VideoRange.Errors.frameRange": "Início e Fim devem ser números inteiros de quadro entre 1 e {{count}}, com Início antes de Fim.",
"VideoRange.Errors.interval": "O tempo entre quadros deve ser um número maior que 0.",
"VideoRange.ExtraInfo.folderName": "Pasta",
"VideoRange.ExtraInfo.frameCount": "Quadros",
"Report.Doc.sourceLabel": "Origem",
"Report.Doc.imageSequence": "Sequência de imagens · {{count}} quadros · intervalo informado pelo operador: {{ms}} ms",
"Loader.importingFrames": "Importando quadros",
"ProjectIssues.framesMissing": "Pasta de quadros {{name}} não encontrada. Os quadros importados continuam disponíveis.",
"ProjectIssues.framesMismatch": "Esta pasta tem {{foundCount}} quadros de {{foundWidth}}×{{foundHeight}}; o projeto foi feito com {{count}} quadros de {{width}}×{{height}}.",
"ProjectIssues.framesLocked": "A pasta de quadros está ausente: localize-a para alterar o intervalo, o passo ou a estabilização."
```

**it**
```json
"Step-2.dragAndDrop": "Trascina qui un video o una cartella di fotogrammi",
"Step-2.chooseFramesFolder": "oppure scegli una cartella di fotogrammi",
"Step-2.readingFolder": "Lettura della cartella…",
"Step-2.framesSummary": "{{count}} fotogrammi · {{width}} × {{height}}",
"Step-2.timeBetweenFrames": "Tempo tra i fotogrammi",
"Step-2.Errors.noFrames": "Questa cartella contiene meno di 2 immagini JPEG o PNG.",
"Step-2.Errors.mixedSizes": "Le immagini di questa cartella non hanno tutte la stessa dimensione.",
"Step-2.Errors.dropFolder": "Rilascia la cartella che contiene i fotogrammi, non le immagini.",
"Step-2.Errors.unreadableFolder": "Impossibile leggere questa cartella.",
"VideoRange.sourceFrames": "Fotogrammi di origine",
"VideoRange.Errors.frameRange": "Inizio e Fine devono essere numeri interi di fotogramma tra 1 e {{count}}, con Inizio prima di Fine.",
"VideoRange.Errors.interval": "Il tempo tra i fotogrammi deve essere un numero maggiore di 0.",
"VideoRange.ExtraInfo.folderName": "Cartella",
"VideoRange.ExtraInfo.frameCount": "Fotogrammi",
"Report.Doc.sourceLabel": "Origine",
"Report.Doc.imageSequence": "Sequenza di immagini · {{count}} fotogrammi · intervallo inserito dall'operatore: {{ms}} ms",
"Loader.importingFrames": "Importazione dei fotogrammi",
"ProjectIssues.framesMissing": "Cartella dei fotogrammi {{name}} non trovata. I fotogrammi importati sono ancora disponibili.",
"ProjectIssues.framesMismatch": "Questa cartella contiene {{foundCount}} fotogrammi a {{foundWidth}}×{{foundHeight}}; il progetto è stato creato con {{count}} fotogrammi a {{width}}×{{height}}.",
"ProjectIssues.framesLocked": "Manca la cartella dei fotogrammi: individuala per modificare l'intervallo, il passo o la stabilizzazione."
```

**de**
```json
"Step-2.dragAndDrop": "Video oder Ordner mit Einzelbildern hierher ziehen",
"Step-2.chooseFramesFolder": "oder einen Ordner mit Einzelbildern wählen",
"Step-2.readingFolder": "Ordner wird gelesen…",
"Step-2.framesSummary": "{{count}} Einzelbilder · {{width}} × {{height}}",
"Step-2.timeBetweenFrames": "Zeit zwischen Einzelbildern",
"Step-2.Errors.noFrames": "Dieser Ordner enthält weniger als 2 JPEG- oder PNG-Bilder.",
"Step-2.Errors.mixedSizes": "Die Bilder in diesem Ordner haben nicht alle dieselbe Größe.",
"Step-2.Errors.dropFolder": "Ziehen Sie den Ordner mit den Einzelbildern hierher, nicht die Bilder.",
"Step-2.Errors.unreadableFolder": "Dieser Ordner konnte nicht gelesen werden.",
"VideoRange.sourceFrames": "Quellbilder",
"VideoRange.Errors.frameRange": "Start und Ende müssen ganze Bildnummern von 1 bis {{count}} sein, mit Start vor Ende.",
"VideoRange.Errors.interval": "Die Zeit zwischen Einzelbildern muss eine Zahl größer als 0 sein.",
"VideoRange.ExtraInfo.folderName": "Ordner",
"VideoRange.ExtraInfo.frameCount": "Einzelbilder",
"Report.Doc.sourceLabel": "Quelle",
"Report.Doc.imageSequence": "Bildsequenz · {{count}} Einzelbilder · vom Bediener eingegebenes Intervall: {{ms}} ms",
"Loader.importingFrames": "Einzelbilder werden importiert",
"ProjectIssues.framesMissing": "Bildordner {{name}} nicht gefunden. Die importierten Einzelbilder sind weiterhin verfügbar.",
"ProjectIssues.framesMismatch": "Dieser Ordner enthält {{foundCount}} Einzelbilder mit {{foundWidth}}×{{foundHeight}}; das Projekt wurde mit {{count}} Einzelbildern mit {{width}}×{{height}} erstellt.",
"ProjectIssues.framesLocked": "Der Bildordner fehlt: Suchen Sie ihn, um Bereich, Schritt oder Stabilisierung zu ändern."
```

**ru**
```json
"Step-2.dragAndDrop": "Перетащите сюда видео или папку с кадрами",
"Step-2.chooseFramesFolder": "или выберите папку с кадрами",
"Step-2.readingFolder": "Чтение папки…",
"Step-2.framesSummary": "{{count}} кадров · {{width}} × {{height}}",
"Step-2.timeBetweenFrames": "Время между кадрами",
"Step-2.Errors.noFrames": "В этой папке меньше 2 изображений JPEG или PNG.",
"Step-2.Errors.mixedSizes": "Изображения в этой папке имеют разный размер.",
"Step-2.Errors.dropFolder": "Перетащите папку с кадрами, а не сами изображения.",
"Step-2.Errors.unreadableFolder": "Не удалось прочитать эту папку.",
"VideoRange.sourceFrames": "Исходные кадры",
"VideoRange.Errors.frameRange": "Начало и Конец должны быть целыми номерами кадров от 1 до {{count}}, причём Начало раньше Конца.",
"VideoRange.Errors.interval": "Время между кадрами должно быть числом больше 0.",
"VideoRange.ExtraInfo.folderName": "Папка",
"VideoRange.ExtraInfo.frameCount": "Кадры",
"Report.Doc.sourceLabel": "Источник",
"Report.Doc.imageSequence": "Последовательность изображений · {{count}} кадров · интервал, введённый оператором: {{ms}} мс",
"Loader.importingFrames": "Импорт кадров",
"ProjectIssues.framesMissing": "Папка с кадрами {{name}} не найдена. Импортированные кадры по-прежнему доступны.",
"ProjectIssues.framesMismatch": "В этой папке {{foundCount}} кадров {{foundWidth}}×{{foundHeight}}; проект был создан с {{count}} кадрами {{width}}×{{height}}.",
"ProjectIssues.framesLocked": "Папка с кадрами отсутствует: укажите её, чтобы изменить диапазон, шаг или стабилизацию."
```

**zh**
```json
"Step-2.dragAndDrop": "将视频或帧图像文件夹拖到此处",
"Step-2.chooseFramesFolder": "或选择帧图像文件夹",
"Step-2.readingFolder": "正在读取文件夹…",
"Step-2.framesSummary": "{{count}} 帧 · {{width}} × {{height}}",
"Step-2.timeBetweenFrames": "帧间隔时间",
"Step-2.Errors.noFrames": "此文件夹中的 JPEG 或 PNG 图像少于 2 张。",
"Step-2.Errors.mixedSizes": "此文件夹中的图像尺寸不一致。",
"Step-2.Errors.dropFolder": "请拖入包含帧图像的文件夹，而不是图像本身。",
"Step-2.Errors.unreadableFolder": "无法读取此文件夹。",
"VideoRange.sourceFrames": "源帧",
"VideoRange.Errors.frameRange": "开始和结束必须是 1 到 {{count}} 之间的整数帧号，且开始早于结束。",
"VideoRange.Errors.interval": "帧间隔时间必须是大于 0 的数字。",
"VideoRange.ExtraInfo.folderName": "文件夹",
"VideoRange.ExtraInfo.frameCount": "帧数",
"Report.Doc.sourceLabel": "来源",
"Report.Doc.imageSequence": "图像序列 · {{count}} 帧 · 操作员输入的间隔：{{ms}} 毫秒",
"Loader.importingFrames": "正在导入帧",
"ProjectIssues.framesMissing": "未找到帧文件夹 {{name}}。已导入的帧仍然可用。",
"ProjectIssues.framesMismatch": "此文件夹有 {{foundCount}} 帧，尺寸为 {{foundWidth}}×{{foundHeight}}；项目创建时为 {{count}} 帧，尺寸为 {{width}}×{{height}}。",
"ProjectIssues.framesLocked": "帧文件夹缺失：请定位它以更改范围、步长或稳定设置。"
```

**ja**
```json
"Step-2.dragAndDrop": "動画またはフレーム画像のフォルダーをここにドラッグ",
"Step-2.chooseFramesFolder": "またはフレーム画像のフォルダーを選択",
"Step-2.readingFolder": "フォルダーを読み込み中…",
"Step-2.framesSummary": "{{count}} フレーム · {{width}} × {{height}}",
"Step-2.timeBetweenFrames": "フレーム間隔",
"Step-2.Errors.noFrames": "このフォルダーには JPEG または PNG 画像が 2 枚未満しかありません。",
"Step-2.Errors.mixedSizes": "このフォルダーの画像はサイズがそろっていません。",
"Step-2.Errors.dropFolder": "画像ではなく、フレームが入ったフォルダーをドロップしてください。",
"Step-2.Errors.unreadableFolder": "このフォルダーを読み込めませんでした。",
"VideoRange.sourceFrames": "元のフレーム",
"VideoRange.Errors.frameRange": "開始と終了は 1 から {{count}} までの整数のフレーム番号で、開始は終了より前にしてください。",
"VideoRange.Errors.interval": "フレーム間隔は 0 より大きい数値にしてください。",
"VideoRange.ExtraInfo.folderName": "フォルダー",
"VideoRange.ExtraInfo.frameCount": "フレーム数",
"Report.Doc.sourceLabel": "ソース",
"Report.Doc.imageSequence": "画像シーケンス · {{count}} フレーム · オペレーターが入力した間隔: {{ms}} ms",
"Loader.importingFrames": "フレームを取り込み中",
"ProjectIssues.framesMissing": "フレームのフォルダー {{name}} が見つかりません。取り込み済みのフレームは引き続き利用できます。",
"ProjectIssues.framesMismatch": "このフォルダーは {{foundWidth}}×{{foundHeight}} の {{foundCount}} フレームです。プロジェクトは {{width}}×{{height}} の {{count}} フレームで作成されました。",
"ProjectIssues.framesLocked": "フレームのフォルダーがありません。範囲、ステップ、安定化を変更するには場所を指定してください。"
```

**ko**
```json
"Step-2.dragAndDrop": "동영상 또는 프레임 폴더를 여기로 끌어다 놓으세요",
"Step-2.chooseFramesFolder": "또는 프레임 폴더 선택",
"Step-2.readingFolder": "폴더를 읽는 중…",
"Step-2.framesSummary": "{{count}} 프레임 · {{width}} × {{height}}",
"Step-2.timeBetweenFrames": "프레임 간 시간",
"Step-2.Errors.noFrames": "이 폴더에는 JPEG 또는 PNG 이미지가 2개 미만입니다.",
"Step-2.Errors.mixedSizes": "이 폴더의 이미지 크기가 모두 같지 않습니다.",
"Step-2.Errors.dropFolder": "이미지가 아니라 프레임이 들어 있는 폴더를 놓으세요.",
"Step-2.Errors.unreadableFolder": "이 폴더를 읽을 수 없습니다.",
"VideoRange.sourceFrames": "원본 프레임",
"VideoRange.Errors.frameRange": "시작과 끝은 1부터 {{count}}까지의 정수 프레임 번호여야 하며, 시작이 끝보다 앞서야 합니다.",
"VideoRange.Errors.interval": "프레임 간 시간은 0보다 큰 숫자여야 합니다.",
"VideoRange.ExtraInfo.folderName": "폴더",
"VideoRange.ExtraInfo.frameCount": "프레임 수",
"Report.Doc.sourceLabel": "출처",
"Report.Doc.imageSequence": "이미지 시퀀스 · {{count}} 프레임 · 운영자가 입력한 간격: {{ms}} ms",
"Loader.importingFrames": "프레임 가져오는 중",
"ProjectIssues.framesMissing": "프레임 폴더 {{name}}을(를) 찾을 수 없습니다. 가져온 프레임은 계속 사용할 수 있습니다.",
"ProjectIssues.framesMismatch": "이 폴더에는 {{foundWidth}}×{{foundHeight}} 크기의 프레임이 {{foundCount}}개 있습니다. 프로젝트는 {{width}}×{{height}} 크기의 프레임 {{count}}개로 만들어졌습니다.",
"ProjectIssues.framesLocked": "프레임 폴더가 없습니다. 범위, 단계 또는 안정화를 변경하려면 폴더를 찾아 주세요."
```

**ar**
```json
"Step-2.dragAndDrop": "اسحب هنا فيديو أو مجلد إطارات",
"Step-2.chooseFramesFolder": "أو اختر مجلد إطارات",
"Step-2.readingFolder": "جارٍ قراءة المجلد…",
"Step-2.framesSummary": "{{count}} إطارًا · {{width}} × {{height}}",
"Step-2.timeBetweenFrames": "الزمن بين الإطارات",
"Step-2.Errors.noFrames": "يحتوي هذا المجلد على أقل من صورتين بصيغة JPEG أو PNG.",
"Step-2.Errors.mixedSizes": "صور هذا المجلد ليست كلها بالحجم نفسه.",
"Step-2.Errors.dropFolder": "أفلت المجلد الذي يحتوي على الإطارات، لا الصور نفسها.",
"Step-2.Errors.unreadableFolder": "تعذّرت قراءة هذا المجلد.",
"VideoRange.sourceFrames": "الإطارات المصدر",
"VideoRange.Errors.frameRange": "يجب أن تكون البداية والنهاية رقمَي إطار صحيحين بين 1 و{{count}}، وأن تسبق البدايةُ النهايةَ.",
"VideoRange.Errors.interval": "يجب أن يكون الزمن بين الإطارات رقمًا أكبر من 0.",
"VideoRange.ExtraInfo.folderName": "المجلد",
"VideoRange.ExtraInfo.frameCount": "الإطارات",
"Report.Doc.sourceLabel": "المصدر",
"Report.Doc.imageSequence": "تسلسل صور · {{count}} إطارًا · الفاصل الزمني الذي أدخله المشغّل: {{ms}} مللي ثانية",
"Loader.importingFrames": "جارٍ استيراد الإطارات",
"ProjectIssues.framesMissing": "لم يُعثر على مجلد الإطارات {{name}}. الإطارات المستوردة ما زالت متاحة.",
"ProjectIssues.framesMismatch": "يحتوي هذا المجلد على {{foundCount}} إطارًا بحجم {{foundWidth}}×{{foundHeight}}؛ أُنشئ المشروع بـ {{count}} إطارًا بحجم {{width}}×{{height}}.",
"ProjectIssues.framesLocked": "مجلد الإطارات مفقود: حدّد موقعه لتغيير النطاق أو الخطوة أو التثبيت."
```

**hi**
```json
"Step-2.dragAndDrop": "यहाँ वीडियो या फ़्रेम का फ़ोल्डर खींचकर छोड़ें",
"Step-2.chooseFramesFolder": "या फ़्रेम का फ़ोल्डर चुनें",
"Step-2.readingFolder": "फ़ोल्डर पढ़ा जा रहा है…",
"Step-2.framesSummary": "{{count}} फ़्रेम · {{width}} × {{height}}",
"Step-2.timeBetweenFrames": "फ़्रेम के बीच का समय",
"Step-2.Errors.noFrames": "इस फ़ोल्डर में 2 से कम JPEG या PNG चित्र हैं।",
"Step-2.Errors.mixedSizes": "इस फ़ोल्डर के सभी चित्र एक ही आकार के नहीं हैं।",
"Step-2.Errors.dropFolder": "चित्र नहीं, वह फ़ोल्डर छोड़ें जिसमें फ़्रेम हैं।",
"Step-2.Errors.unreadableFolder": "यह फ़ोल्डर पढ़ा नहीं जा सका।",
"VideoRange.sourceFrames": "स्रोत फ़्रेम",
"VideoRange.Errors.frameRange": "प्रारंभ और अंत 1 से {{count}} तक की पूर्ण फ़्रेम संख्याएँ होनी चाहिए, और प्रारंभ अंत से पहले होना चाहिए।",
"VideoRange.Errors.interval": "फ़्रेम के बीच का समय 0 से बड़ी संख्या होनी चाहिए।",
"VideoRange.ExtraInfo.folderName": "फ़ोल्डर",
"VideoRange.ExtraInfo.frameCount": "फ़्रेम",
"Report.Doc.sourceLabel": "स्रोत",
"Report.Doc.imageSequence": "चित्र अनुक्रम · {{count}} फ़्रेम · ऑपरेटर द्वारा दर्ज अंतराल: {{ms}} ms",
"Loader.importingFrames": "फ़्रेम आयात किए जा रहे हैं",
"ProjectIssues.framesMissing": "फ़्रेम फ़ोल्डर {{name}} नहीं मिला। आयात किए गए फ़्रेम अब भी उपलब्ध हैं।",
"ProjectIssues.framesMismatch": "इस फ़ोल्डर में {{foundWidth}}×{{foundHeight}} के {{foundCount}} फ़्रेम हैं; प्रोजेक्ट {{width}}×{{height}} के {{count}} फ़्रेम से बनाया गया था।",
"ProjectIssues.framesLocked": "फ़्रेम फ़ोल्डर नहीं मिल रहा: सीमा, चरण या स्थिरीकरण बदलने के लिए उसे खोजें।"
```

Before writing each language, read how that file already names "Start", "End", "Step", "frame" and "stabilization" (`VideoRange.start`, `VideoRange.end`, `VideoRange.step`, `VideoRange.framesSummary`, `VideoRange.stabilizeVideo`) and use the same words in the new strings if they differ from the ones above.

- [ ] **Step 3: Run the completeness test and check every file still parses**

Run: `npx jest src/translations/framesCopy.test.ts && for l in ar de en es fr hi it ja ko pt ru zh; do node -e "JSON.parse(require('fs').readFileSync('src/translations/$l/global.json','utf8'))" || echo "BROKEN $l"; done`
Expected: all tests pass; no `BROKEN` line.

- [ ] **Step 4: Commit**

```bash
git add gui/src/translations
git commit -m "Translate the frames import copy into all twelve languages"
```

---

### Task 13: In-app verification

No code. This task is the first time the feature runs; expect to find and fix defects here. Fix each in the task that owns the code, with a test where one is possible, and commit separately.

- [ ] **Step 1: Make test folders under `$HOME`**

The dev server refuses image paths outside `$HOME` (403), so the frames must live under it. Pick one existing case video per footage type from `~/Documents/river_cases` and run, for each:

```bash
mkdir -p ~/river_frames_test/uav && ffmpeg -i "<video>" -vframes 120 -q:v 2 ~/river_frames_test/uav/frame_%d.jpg
```

`frame_%d` gives unpadded names (`frame_2`, `frame_10`), which exercises the natural ordering. Note the video's fps: the interval to type is `1000 / fps` (33.33 for 30 fps). Also make one PNG folder: `ffmpeg -i "<video>" -vframes 20 ~/river_frames_test/png/f_%d.png`, and one bad folder containing a single image.

- [ ] **Step 2: Launch the app against this worktree's backend**

Run from `gui/`: `PYTHONPATH=/Users/antoine/river_compil/.worktrees/ui-design-refresh npm run dev`
Check first: `/Users/antoine/anaconda3/envs/river_dev/bin/python -m river.cli frames-info ~/river_frames_test/uav` prints `"count": 120`.

- [ ] **Step 3: Walk the flow once per footage type**

For UAV, oblique and fixed camera, with the app in the dark theme:

1. New project → pick the footage type → drag the folder onto the drop area. Expect the folder name, `120 frames · W × H`, and an empty focused interval field; Next is disabled.
2. Type `33,33`. Expect `30 fps` beside it and Next enabled.
3. Next. Expect the Video Range step with the frame player showing frame `1 / 120`, Start `1`, End `120`, and the summary `120 frames · every 33.33 ms`.
4. Scrub, play, step with the frame buttons; zoom with the wheel. Set Start and End with the target buttons.
5. Set Step to 2: the summary halves the count and doubles the interval.
6. For UAV and oblique: turn on stabilization, draw two regions on the frame, Next. Expect the import and stabilization to run with the progress display.
7. Continue through pixel transformation, one cross section, processing (LSPIV), results and the report. Expect the report's footage facts to show the folder name, the "Image sequence · … · interval entered by the operator" row, and the processed range as frame numbers.
8. Compare the discharge with the same case processed from its video at the same range and step: they should agree closely (the frames were re-encoded once by ffmpeg, so not bit-identical).

- [ ] **Step 4: Check the edges**

1. Drop the single-image folder → "fewer than 2 JPEG or PNG images". Drop one image file → "Drop the folder…". Drop the PNG folder → accepted.
2. Use "or choose a frames folder" instead of dragging.
3. In Video Range, change the interval to 40 and press Next: `settings.json` in the project shows `"fps": 25` and `"time_between_frames": 0.04`; reopening the project shows 40.
4. Type Start `0`, End `500`, Start greater than End: each shows the frame-range error and blocks Next.
5. Close the app, rename the source folder, reopen the project: the Video Range step shows the first frame, the form is locked, the card says the frames folder is missing. Locate the renamed folder: the player returns. Locate a different folder: the mismatch card appears.
6. Open an existing video project: it loads and behaves exactly as before.

- [ ] **Step 5: Repeat the footage step and the Video Range step in light and dracula**

Switch theme on Home, then look at: the empty drop area with the link, the chosen-folder state with the interval field, the Video Range form with the source-frames block. Check the interval field has a visible boundary in light (known limitation: fields in light sit at 1.05:1 against the panel; report it if the field is hard to find, do not restyle fields here), the link is legible in all three, and nothing overflows at the minimum window size (1150 × 700).

- [ ] **Step 6: Run everything once more**

```bash
cd /Users/antoine/river_compil/.worktrees/ui-design-refresh && /Users/antoine/anaconda3/envs/river_dev/bin/python -m pytest tests -q
cd gui && npx jest && npx tsc --noEmit ; npx tsc --noEmit -p tsconfig.node.json ; npm run lint
```

Expected: Python and Jest suites pass; tsc and lint at their baselines. Report the actual counts.
