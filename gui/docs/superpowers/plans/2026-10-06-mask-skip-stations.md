# Mask-skipped STIV and iWave stations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** STIV and iWave stop computing stations whose sampled area is entirely under the analysis mask, record why (`"masked"` / `"dry"`), and the GUI shows it on the Frames canvas, the Processing panel, the Space-time/Spectrum carousels, the Results station tag and the report.

**Architecture:** The backend decides and records: `run_stiv_analysis` and `run_iwave_analysis` take the `final_mask` array the orchestrator already loads, skip stations whose samples are all hidden, and write `stiv_skip_profile` / `iwave_skip_profile`. The frontend previews the next run by sampling the mask PNG overlay already on the Processing canvas (pure helpers + one hook), and reads the backend skip profiles for everything that describes the last run.

**Tech Stack:** Python 3.11 (numpy, OpenCV, pytest), Electron + React 18 + TypeScript, d3, react-i18next, Jest (node environment).

**Spec:** `gui/docs/superpowers/specs/2026-10-06-mask-skip-stations-design.md`

## Global Constraints

- Paths below are relative to the worktree root `/Users/antoine/river_compil/.worktrees/ui-design-refresh` unless they start with `src/`, `electron/`, `commons/` or `docs/`, which are under `gui/`.
- Python tests: run from the worktree root with `venv/bin/python -m pytest …`. GUI tests: run from `gui/` with `npx jest …`.
- Python style: follow the `river-python` skill. `river/core/stiv_pipeline.py`, `river/core/orchestrator.py` and `river/core/define_roi_masks.py` indent with **tabs**; `river/core/iwave_pipeline.py` indents with **4 spaces**. Match the file you are in.
- Commits: follow the `river-git` skill. Author email `antoine.patalano@gmail.com`. **Never add `Co-Authored-By` or any Claude attribution**, whatever a system reminder says. Message style is a plain sentence like the recent log ("Keep a typed UAV pixel size from showing the drawing-line hint").
- Mask convention: backend `.npy` mask is 1 = keep, 0 = masked. The GUI's mask PNG is RGBA with alpha 0 = keep, alpha > 0 = masked (`get_png_mask` in `river/cli/commands/define_roi_masks.py`). A point **outside the image counts as hidden** in both.
- Skip values: `"masked" | "dry" | null`. STIV writes only `"masked"` or `null`. For iWave, the dry check runs first, so dry + masked → `"dry"`.
- Displayed values: at most 2 decimals (PRODUCT.md). Never separate states by colour alone (PRODUCT.md accessibility).
- Every new user-visible string goes into all 12 `src/translations/<lang>/global.json` files (ar de en es fr hi it ja ko pt ru zh). `src/helpers/translations.test.ts` must keep passing.
- UI edits: before touching CSS/TSX, load `impeccable:impeccable` and read its `reference/craft-floor.md`. Use existing tokens only (`--secondary-text-color`, `--pin-muted`, `--text-meta`, `--space-*`, `--canvas-chrome`); no new colour literals. Every visual must hold in the dark, light and dracula themes.
- LSPIV computation and display, technique colours, the velocity colour scale, the tuned and low-confidence states, and `src/helpers/techniqueDischarge.ts` stay unchanged.

## Review Focus

1. **Mask and frame sizes differ** (frames re-extracted with another resize factor after the mask was built): the run must not crash and must not skip wrongly. Expect: orchestrator logs and runs STIV/iWave without a mask. Pinned in Task 3.
2. **Every station masked**: STIV/iWave must finish with all-`None` profiles, not raise. Expect: skip profile all `"masked"`, no STI/spectrum files, and the panel says the technique will compute nothing. Pinned in Tasks 1, 2 and 6.
3. **A station-aligned carousel with gaps**: before this change the STI list had no gaps, so `active` doubled as the station index. With gaps, every consumer (StiViewer, the angle tuner, carousel markers, IWaveViewer) must still point at the right station. Expect: tile *k* is station *k+1* in both modes. Pinned in Task 7 (`alignStationImages` test plus the in-app check).
4. **The mask PNG can't be read in the renderer** (canvas taint, missing file, `maskPath` empty before any mask exists): the preview must degrade to "nothing masked", never throw. Pinned in Task 4 (`isPixelHidden` with a null raster) and checked in-app in Task 10.
5. **Masked station when Interpolate is on**: it must show as interpolated in the tag/table and count as interpolated Q, with the "masked" reason still visible. Pinned in Task 8.

---

## File Structure

| File | Responsibility |
|---|---|
| `river/core/define_roi_masks.py` | + `are_all_points_hidden(x, y, mask)`, shared by STIV and iWave |
| `river/core/stiv_pipeline.py` | + `compute_station_pixel_lines`, `get_masked_station_ids`; `build_stis_for_cross_section(skip_ids=)`; `run_stiv_analysis(mask=)` writes `stiv_skip_profile` |
| `river/core/iwave_pipeline.py` | + `_station_window_origin`, `is_window_masked`; `run_iwave_analysis(mask=)` writes `iwave_skip_profile`, `skipped_masked` |
| `river/core/iwave_params.py` | `build_params_record(..., skipped_masked=0)` |
| `river/core/orchestrator.py` | passes the mask to both engines after a shape check |
| `commons/coordinates.ts` | export `invertMatrix` |
| `src/helpers/stationPositions.ts` | + `getSectionSearchLines`, `searchLineCenters` (geometry moved out of `StationSearchLines.tsx`) |
| `src/helpers/maskCoverage.ts` (new) | pure: `MaskRaster`, `isPixelHidden`, `isSegmentMasked`, `isWindowMasked` |
| `src/helpers/loadMaskRaster.ts` (new) | DOM: PNG → `MaskRaster`, cached per src, `null` on any failure |
| `src/hooks/useMaskedStations.ts` (new) | live preview flags `{ stiv, iwave }` for the active section |
| `src/components/Graphs/searchLineState.ts` | + `masked` input, `dotted` output |
| `src/components/StationSearchLines.tsx` | uses the shared geometry + masked flags |
| `src/components/Forms/FormProcessing.tsx` | masked-count notes under STIV and iWave |
| `src/helpers/stationImages.ts` (new) | `alignStationImages`, `skipReasonLabelKey` |
| `src/pages/Processing.tsx`, `src/components/Carousel.tsx`, `src/components/StiViewer.tsx`, `src/components/IWaveViewer.tsx` | station-aligned lists + placeholders |
| `src/components/Graphs/stationTagContent.ts` | quality cell shows `masked` / `dry` |
| `src/helpers/stationRanges.ts` (new) | `formatStationRanges([6,7,8,9,12]) → "6–9, 12"` |
| `src/helpers/reportModel.ts`, `src/components/Report/Method.tsx`, `src/components/Report/StationTable.tsx` | report lines and footnote |
| `src/store/section/types.ts` | `stiv_skip_profile`, `iwave_skip_profile` on `SectionData` |

---

### Task 1: STIV skips fully masked search lines

**Files:**
- Modify: `river/core/define_roi_masks.py` (append a function at the end)
- Modify: `river/core/stiv_pipeline.py:24-33` (STIV_COLUMNS), `:99-194` (build_stis_for_cross_section), `:567-650` (run_stiv_analysis)
- Test: `tests/test_stiv_pipeline.py`

**Interfaces:**
- Produces: `are_all_points_hidden(x: np.ndarray, y: np.ndarray, mask: np.ndarray) -> bool` in `river.core.define_roi_masks`
- Produces: `compute_station_pixel_lines(cs, transformation_matrix, height_roi_m=6.0, rw_step_m=RW_STEP_M) -> list[tuple[int, np.ndarray]]` (station id, `(n_rows, 2)` pixel coords)
- Produces: `get_masked_station_ids(cs, transformation_matrix, mask, height_roi_m=6.0, rw_step_m=RW_STEP_M) -> set[int]`
- Produces: `run_stiv_analysis(..., mask: Optional[np.ndarray] = None)`, which writes `stiv_skip_profile: list[Optional[str]]`

- [ ] **Step 1: Write the failing tests** (append to `tests/test_stiv_pipeline.py`; add `are_all_points_hidden` and `get_masked_station_ids` to the imports at the top)

```python
from river.core.define_roi_masks import are_all_points_hidden
from river.core.stiv_pipeline import get_masked_station_ids


def test_are_all_points_hidden_counts_outside_image_as_hidden():
	mask = np.ones((10, 10), dtype=np.uint8)
	mask[:, :5] = 0
	assert are_all_points_hidden(np.array([1.0, 2.0, -3.0]), np.array([1.0, 2.0, 4.0]), mask)
	assert not are_all_points_hidden(np.array([1.0, 7.0]), np.array([1.0, 1.0]), mask)
	assert are_all_points_hidden(np.array([-1.0, 50.0]), np.array([0.0, 0.0]), mask)


def test_get_masked_station_ids_needs_the_whole_line_hidden():
	with tempfile.TemporaryDirectory() as tmp:
		cs, T, _ = _make_synthetic_session(tmp)
	# Lines are vertical (along north = pixel y) at x = 5, 10, 15, spanning y 3..7 for a 4 m ROI.
	mask = np.ones((64, 64), dtype=np.uint8)
	mask[:, 8:12] = 0          # station 2 fully hidden
	mask[3:6, 13:17] = 0       # station 3 only partly hidden
	assert get_masked_station_ids(cs, T, mask, height_roi_m=4.0) == {2}


def test_run_stiv_analysis_skips_masked_station():
	with tempfile.TemporaryDirectory() as tmp:
		cs, T, frames_dir = _make_synthetic_session(tmp, n_frames=30)
		xsections = {"CS_default_1": dict(cs, num_stations=3), "summary": {}}
		mask = np.ones((64, 64), dtype=np.uint8)
		mask[:, 8:12] = 0
		stis_dir = os.path.join(tmp, "stis")
		progress_calls = []
		result = run_stiv_analysis(
			xsections=xsections, transformation_matrix=T, frames_dir=frames_dir,
			step=3, fps=30.0, id_section=0, height_roi_m=0.4, stis_dir=stis_dir, mask=mask,
			progress=lambda current, total: progress_calls.append((current, total)),
		)
		written = sorted(os.listdir(stis_dir))
	cs_result = result["CS_default_1"]
	assert cs_result["stiv_skip_profile"] == [None, "masked", None]
	assert cs_result["stiv_velocity_profile"][1] is None
	assert cs_result["stiv_angle_profile"][1] is None
	assert written == ["sti_1.png", "sti_3.png"]
	assert progress_calls == [(1, 3), (2, 3), (3, 3)]


def test_run_stiv_analysis_all_masked_finishes_empty():
	with tempfile.TemporaryDirectory() as tmp:
		cs, T, frames_dir = _make_synthetic_session(tmp, n_frames=30)
		xsections = {"CS_default_1": dict(cs, num_stations=3), "summary": {}}
		mask = np.zeros((64, 64), dtype=np.uint8)
		result = run_stiv_analysis(
			xsections=xsections, transformation_matrix=T, frames_dir=frames_dir,
			step=3, fps=30.0, id_section=0, height_roi_m=0.4, mask=mask,
		)
	cs_result = result["CS_default_1"]
	assert cs_result["stiv_skip_profile"] == ["masked"] * 3
	assert cs_result["stiv_velocity_profile"] == [None] * 3


def test_run_stiv_analysis_without_mask_has_no_skips():
	with tempfile.TemporaryDirectory() as tmp:
		cs, T, frames_dir = _make_synthetic_session(tmp, n_frames=30)
		xsections = {"CS_default_1": dict(cs, num_stations=3), "summary": {}}
		result = run_stiv_analysis(
			xsections=xsections, transformation_matrix=T, frames_dir=frames_dir,
			step=3, fps=30.0, id_section=0, height_roi_m=0.4,
		)
	assert result["CS_default_1"]["stiv_skip_profile"] == [None, None, None]
```

- [ ] **Step 2: Run them to verify they fail**

Run: `venv/bin/python -m pytest tests/test_stiv_pipeline.py -k "hidden or masked or no_skips" -v`
Expected: ImportError on `are_all_points_hidden`.

- [ ] **Step 3: Implement**

Append to `river/core/define_roi_masks.py`:

```python
def are_all_points_hidden(x: np.ndarray, y: np.ndarray, mask: np.ndarray) -> bool:
	"""
	Whether every point is hidden: outside the image or on a masked (0) pixel.

	Args:
		x (np.ndarray): Pixel x coordinates.
		y (np.ndarray): Pixel y coordinates.
		mask (np.ndarray): Binary mask (H, W), 1 = keep, 0 = masked.

	Returns:
		bool: True when no point lands on a kept pixel.
	"""
	h, w = mask.shape[:2]
	xs = np.rint(np.asarray(x, dtype=float)).astype(int)
	ys = np.rint(np.asarray(y, dtype=float)).astype(int)
	inside = (xs >= 0) & (xs < w) & (ys >= 0) & (ys < h)
	if not inside.any():
		return True
	return not bool(np.any(mask[ys[inside], xs[inside]] != 0))
```

In `river/core/stiv_pipeline.py`:

1. Add `"stiv_skip_profile",` to `STIV_COLUMNS` right after `"stiv_sign_profile",`.
2. Import: `from river.core.define_roi_masks import are_all_points_hidden`.
3. Move the per-station geometry out of `build_stis_for_cross_section` into a new function placed just above it. The body is the existing code from `H = np.asarray(...)` through the `pix_coords = np.array([...])` line, without the frame reading and without `inbounds`:

```python
def compute_station_pixel_lines(
	cs: dict,
	transformation_matrix: list,
	height_roi_m: float = 6.0,
	rw_step_m: float = RW_STEP_M,
) -> list[tuple[int, np.ndarray]]:
	"""Pixel coordinates of every station's search line, one row per STI row.

	Returns [(station_id, pix_coords)] with pix_coords of shape (n_rows, 2).
	"""
	H = np.asarray(transformation_matrix, dtype=float)
	if H.shape != (3, 3):
		raise ValueError(f"transformation_matrix must be 3×3, got {H.shape}")
	# ... ids, east_all, north_all, banks, n_rows, half, bank_tan: moved verbatim ...
	lines: list[tuple[int, np.ndarray]] = []
	for idx, (sid, E, N) in enumerate(zip(ids, east_all, north_all)):
		# ... tangent / downstream / offsets / rw_coords: moved verbatim ...
		pix_coords = np.array(
			[ct.transform_real_world_to_pixel(float(rw[0]), float(rw[1]), H)[:2] for rw in rw_coords],
			dtype=float,
		)
		lines.append((sid, pix_coords))
	return lines


def get_masked_station_ids(
	cs: dict,
	transformation_matrix: list,
	mask: np.ndarray,
	height_roi_m: float = 6.0,
	rw_step_m: float = RW_STEP_M,
) -> set[int]:
	"""Stations whose whole search line is hidden by the mask (or off the image)."""
	return {
		sid
		for sid, pix in compute_station_pixel_lines(cs, transformation_matrix, height_roi_m, rw_step_m)
		if are_all_points_hidden(pix[:, 0], pix[:, 1], mask)
	}
```

4. Rewrite `build_stis_for_cross_section`'s signature and geometry part. Keep the frame check, the first-frame read and the remap loop unchanged:

```python
def build_stis_for_cross_section(
	cs: dict,
	transformation_matrix: list,
	frames_dir: str,
	height_roi_m: float = 6.0,
	rw_step_m: float = RW_STEP_M,
	skip_ids: Optional[set[int]] = None,
) -> dict[int, np.ndarray]:
	"""Build STIs for the stations of a cross-section, except skip_ids.

	Returns {station_id: sti_array} where sti_array has shape (n_rows, n_frames).
	NaN values mark out-of-bounds pixel positions.
	"""
	skip_ids = skip_ids or set()
	frames = _collect_frames(frames_dir)
	# ... unchanged frame checks, img_h, img_w ...
	station_data: list[tuple[int, np.ndarray, np.ndarray]] = []
	for sid, pix_coords in compute_station_pixel_lines(cs, transformation_matrix, height_roi_m, rw_step_m):
		if sid in skip_ids:
			continue
		xs, ys = pix_coords[:, 0], pix_coords[:, 1]
		inbounds = (xs >= 0) & (xs <= img_w - 1) & (ys >= 0) & (ys <= img_h - 1)
		station_data.append((sid, pix_coords, inbounds))
	n_rows = int(np.ceil(height_roi_m / rw_step_m)) + 1
	n_frames = len(frames)
	# ... stis / map_x / map_y / masks / remap loop unchanged ...
```

Keep the `ValueError` for a non-3×3 matrix: it now comes from `compute_station_pixel_lines`. `test_build_stis_missing_frames_raises` still holds because the frame check runs first.

5. In `run_stiv_analysis`: add the `mask: Optional[np.ndarray] = None` parameter (last), add a docstring line ("Stations whose whole search line is hidden by mask are not computed; stiv_skip_profile records "masked" for them"), then:

```python
	masked_ids = (
		get_masked_station_ids(cs, transformation_matrix, mask, height_roi_m)
		if mask is not None else set()
	)
	stis = build_stis_for_cross_section(
		cs, transformation_matrix, frames_dir, height_roi_m, skip_ids=masked_ids,
	)
```

In the station loop, `stis.get(sid)` is already `None` for a skipped station, so it only needs the reason recorded. Add `stiv_skip_list: list[Optional[str]] = ["masked" if sid in masked_ids else None for sid in ids]` before the loop. After the loop, write `xsections[current_key]["stiv_skip_profile"] = stiv_skip_list` next to `stiv_sign_profile`.

- [ ] **Step 4: Run the STIV test file**

Run: `venv/bin/python -m pytest tests/test_stiv_pipeline.py -v`
Expected: all PASS, old tests included.

- [ ] **Step 5: Commit**

```bash
git add river/core/define_roi_masks.py river/core/stiv_pipeline.py tests/test_stiv_pipeline.py
git commit -m "Skip STIV stations whose whole search line is under the mask"
```

---

### Task 2: iWave skips fully masked windows

**Files:**
- Modify: `river/core/iwave_pipeline.py:52-57` (IWAVE_COLUMNS), `:282-290` (`_station_window`), `:481-620` (`run_iwave_analysis`)
- Modify: `river/core/iwave_params.py` (`build_params_record`)
- Test: `tests/test_iwave_pipeline.py`

**Interfaces:**
- Consumes: `are_all_points_hidden` (Task 1)
- Produces: `is_window_masked(grid: OrthoGrid, grid_shape: tuple[int, int], east: float, north: float, win: int, transformation_matrix: list, mask: np.ndarray) -> bool`
- Produces: `run_iwave_analysis(..., mask: Optional[np.ndarray] = None)`, which writes `iwave_skip_profile: list[Optional[str]]` and `iwave_params["skipped_masked"]: int`

- [ ] **Step 1: Write the failing tests** (append to `tests/test_iwave_pipeline.py`)

```python
def test_is_window_masked_needs_the_whole_window_hidden():
	from river.core.iwave_pipeline import Extent, OrthoGrid, is_window_masked
	# Ortho grid == raw frame: 0.05 m/px, north up, origin at the top-left.
	H = [[0.05, 0.0, 0.0], [0.0, -0.05, 0.0], [0.0, 0.0, 1.0]]
	grid = OrthoGrid(extent=Extent(east_min=0.0, east_max=4.8, north_min=-4.8, north_max=0.0), resolution=0.05)
	mask = np.ones((96, 96), dtype=np.uint8)
	mask[:, :48] = 0
	# 20 px window centred at col 20 → cols 10..29: all masked.
	assert is_window_masked(grid, (96, 96), 1.0, -2.4, 20, H, mask)
	# Centred at col 48 → cols 38..57: half visible.
	assert not is_window_masked(grid, (96, 96), 2.4, -2.4, 20, H, mask)


@pytest.mark.skipif(not HAS_IWAVE, reason="iwave package not available")
def test_run_iwave_analysis_skips_masked_station(tmp_path):
	frames_dir, H, xsections = _synthetic_project(tmp_path)
	spectra_dir = tmp_path / "iwave_spectra" / "CS1"
	result = run_iwave_analysis(
		xsections, H, str(frames_dir), step=1, fps=20.0, id_section=0,
		spectra_dir=str(spectra_dir), mask=np.zeros((96, 96), dtype=np.uint8),
	)
	cs = result["CS1"]
	assert cs["iwave_skip_profile"] == ["masked"]
	assert cs["iwave_velocity_profile"] == [None]
	assert cs[IWAVE_PARAMS_KEY]["skipped_masked"] == 1
	assert not list(spectra_dir.glob("spectrum_*.png"))


@pytest.mark.skipif(not HAS_IWAVE, reason="iwave package not available")
def test_run_iwave_analysis_dry_wins_over_masked(tmp_path):
	frames_dir, H, xsections = _synthetic_project(tmp_path)
	xsections["CS1"]["distance"] = [0.0]
	xsections["CS1"]["depth"] = [-0.3]
	result = run_iwave_analysis(
		xsections, H, str(frames_dir), step=1, fps=20.0, id_section=0,
		mask=np.zeros((96, 96), dtype=np.uint8),
	)
	assert result["CS1"]["iwave_skip_profile"] == ["dry"]
	assert result["CS1"][IWAVE_PARAMS_KEY]["skipped_masked"] == 0


@pytest.mark.skipif(not HAS_IWAVE, reason="iwave package not available")
def test_run_iwave_analysis_open_mask_changes_nothing(tmp_path):
	frames_dir, H, xsections = _synthetic_project(tmp_path)
	result = run_iwave_analysis(
		xsections, H, str(frames_dir), step=1, fps=20.0, id_section=0,
		mask=np.ones((96, 96), dtype=np.uint8),
	)
	assert result["CS1"]["iwave_skip_profile"] == [None]
	assert result["CS1"]["iwave_velocity_profile"][0] is not None
```

Then update the existing `test_run_iwave_analysis_skips_dry_station` (around line 551): the skip column is now `["dry"]`, not `[None]`:

```python
	for col in IWAVE_COLUMNS:
		if col == "iwave_skip_profile":
			continue
		assert result["CS1"][col] == [None]
	assert result["CS1"]["iwave_skip_profile"] == ["dry"]
	assert result["CS1"][IWAVE_PARAMS_KEY]["skipped_dry"] == 1
```

- [ ] **Step 2: Run them to verify they fail**

Run: `venv/bin/python -m pytest tests/test_iwave_pipeline.py -k "masked or dry" -v`
Expected: ImportError on `is_window_masked`, and the dry test fails on the missing column.

- [ ] **Step 3: Implement** (4-space indentation in this file)

1. `IWAVE_COLUMNS`: append `"iwave_skip_profile",`.
2. Import `from river.core.define_roi_masks import are_all_points_hidden`.
3. Split `_station_window` so the mask check uses exactly the crop the fit uses:

```python
MASK_WINDOW_SAMPLES = 32


def _station_window_origin(grid_shape: tuple, grid: OrthoGrid, east: float, north: float, win: int) -> tuple[int, int]:
    """Top-left (row, col) of a station's window, clamped inside the grid."""
    col, row = grid.real_to_pixel(east, north)
    half = win // 2
    r0 = int(round(float(row))) - half
    c0 = int(round(float(col))) - half
    r0 = min(max(r0, 0), grid_shape[0] - win)
    c0 = min(max(c0, 0), grid_shape[1] - win)
    return r0, c0


def _station_window(stack: np.ndarray, grid: OrthoGrid, east: float, north: float, win: int) -> np.ndarray:
    r0, c0 = _station_window_origin(stack.shape[1:], grid, east, north, win)
    return np.array(stack[:, r0:r0 + win, c0:c0 + win], dtype=np.float64)


def is_window_masked(
    grid: OrthoGrid,
    grid_shape: tuple,
    east: float,
    north: float,
    win: int,
    transformation_matrix: list,
    mask: np.ndarray,
) -> bool:
    """Whether a station's whole window is hidden in the raw frame (masked or off the image).

    Args:
        grid (OrthoGrid): Ortho grid the stack was warped onto.
        grid_shape (tuple): (rows, cols) of that grid.
        east (float): Station east (m).
        north (float): Station north (m).
        win (int): Window side (grid px), as cropped.
        transformation_matrix (list): Pixel -> real-world homography.
        mask (np.ndarray): Raw-frame binary mask, 1 = keep, 0 = masked.

    Returns:
        bool: True when no sampled point of the window lands on a kept pixel.
    """
    r0, c0 = _station_window_origin(grid_shape, grid, east, north, win)
    offsets = np.linspace(0, win - 1, min(win, MASK_WINDOW_SAMPLES))
    cols, rows = np.meshgrid(c0 + offsets, r0 + offsets)
    x, y = _project_h(build_warp_matrix(grid, transformation_matrix), cols.ravel(), rows.ravel())
    return are_all_points_hidden(x, y, mask)
```

4. In `run_iwave_analysis`: add `mask: Optional[np.ndarray] = None` as the last parameter and a docstring sentence ("A station whose whole window is hidden by mask is not fitted; iwave_skip_profile records "dry" or "masked" per station"). Before the loop: `skip: list[Optional[str]] = [None] * n` and `skipped_masked = 0`. In the loop:

```python
        if is_dry_window(cs, i, window_m):
            skipped_dry += 1
            skip[i] = "dry"
            if progress is not None:
                progress(i + 1, n)
            continue
        if mask is not None and is_window_masked(
            grid, stack.shape[1:], east[i], north[i], win, transformation_matrix, mask,
        ):
            skipped_masked += 1
            skip[i] = "masked"
            if progress is not None:
                progress(i + 1, n)
            continue
```

After the loop: `xsections[current_key]["iwave_skip_profile"] = skip`, and pass `skipped_masked=skipped_masked` to `build_params_record`.

5. `river/core/iwave_params.py` → `build_params_record`: add the keyword `skipped_masked: int = 0` next to `skipped_dry`, and write it into the record the same way `skipped_dry` is written. Update its docstring Args.

- [ ] **Step 4: Run the iWave test files**

Run: `venv/bin/python -m pytest tests/test_iwave_pipeline.py tests/test_iwave_params.py tests/test_compute_section_cache.py -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add river/core/iwave_pipeline.py river/core/iwave_params.py tests/test_iwave_pipeline.py
git commit -m "Skip iWave stations whose whole window is under the mask"
```

---

### Task 3: Orchestrator passes the mask to STIV and iWave

**Files:**
- Modify: `river/core/orchestrator.py:119-190`
- Test: `tests/test_orchestrator.py`

**Interfaces:**
- Consumes: `run_stiv_analysis(mask=)`, `run_iwave_analysis(mask=)` (Tasks 1–2)
- Produces: `_mask_for_frames(mask: Optional[np.ndarray], frames_dir: Path) -> Optional[np.ndarray]`

- [ ] **Step 1: Write the failing tests** (append to `tests/test_orchestrator.py`; the `fake_project` fixture's `fake_stiv` doesn't record kwargs, so these tests patch their own)

```python
def test_mask_reaches_stiv_and_iwave(fake_project, monkeypatch):
	tmp_path, calls = fake_project
	seen = {}
	def fake_stiv(**kw):
		seen["stiv"] = kw["mask"]
		return kw["xsections"]
	monkeypatch.setattr(orch, "run_stiv_analysis", fake_stiv)
	mask = np.ones((4, 4), dtype=np.uint8)
	_run(tmp_path, mask=mask)
	assert seen["stiv"] is mask
	assert calls["iwave_kwargs"]["mask"] is mask


def test_mask_with_wrong_shape_is_dropped(fake_project, monkeypatch, capsys):
	tmp_path, calls = fake_project
	frame = sorted((tmp_path / "frames").glob("*.jpg"))[0]
	cv2.imwrite(str(frame), np.zeros((8, 8), dtype=np.uint8))
	seen = {}
	def fake_stiv(**kw):
		seen["stiv"] = kw["mask"]
		return kw["xsections"]
	monkeypatch.setattr(orch, "run_stiv_analysis", fake_stiv)
	_run(tmp_path, mask=np.ones((4, 4), dtype=np.uint8))
	assert seen["stiv"] is None
	assert calls["iwave_kwargs"]["mask"] is None
	assert "mask shape" in capsys.readouterr().err
```

The fake frames are the bytes `b"fake"`, so `cv2.imread` returns `None` and the first test keeps the mask. The second test writes one real 8×8 frame to force the mismatch. Add `import cv2` at the top of the test file if it isn't there.

- [ ] **Step 2: Run them to verify they fail**

Run: `venv/bin/python -m pytest tests/test_orchestrator.py -k mask -v`
Expected: KeyError `'mask'`.

- [ ] **Step 3: Implement**

In `river/core/orchestrator.py` add `import cv2` and, below `_log`:

```python
def _mask_for_frames(mask: Optional[np.ndarray], frames_dir: Path) -> Optional[np.ndarray]:
	"""The mask, or None when it does not match the frames' size.

	A mask built on frames of another size would point at the wrong pixels, so
	STIV and iWave then run without it rather than skip the wrong stations.
	"""
	if mask is None:
		return None
	frames = sorted(Path(frames_dir).glob("*.jpg"))
	first = cv2.imread(str(frames[0]), cv2.IMREAD_GRAYSCALE) if frames else None
	if first is None or first.shape[:2] == mask.shape[:2]:
		return mask
	_log(f"STIV/iWave: mask shape {mask.shape[:2]} differs from frames {first.shape[:2]}, not skipping masked stations")
	return None
```

Before Stage 3: `engine_mask = _mask_for_frames(mask, frames_dir)`. Pass `mask=engine_mask` to `run_stiv_analysis(...)` and to `run_iwave_analysis(...)`.

- [ ] **Step 4: Run the orchestrator tests**

Run: `venv/bin/python -m pytest tests/test_orchestrator.py -v`
Expected: all PASS.

- [ ] **Step 5: Run the whole Python suite**

Run: `venv/bin/python -m pytest tests -q`
Expected: all PASS. If a test unrelated to this plan fails, check whether it also fails on the commit before Task 1 (`git log` to find it, then a throwaway `git worktree add`). Report it; don't fix it here.

- [ ] **Step 6: Commit**

```bash
git add river/core/orchestrator.py tests/test_orchestrator.py
git commit -m "Pass the analysis mask to STIV and iWave when it matches the frames"
```

---

### Task 4: Frontend mask coverage helpers

**Files:**
- Modify: `commons/coordinates.ts:156-164` (export `invertMatrix`)
- Modify: `src/helpers/stationPositions.ts` (add `interpolateStationCenters`, `getSectionSearchLines`, `searchLineCenters`; make `computeStationSearchLines` use `interpolateStationCenters`)
- Create: `src/helpers/maskCoverage.ts`, `src/helpers/maskCoverage.test.ts`
- Create: `src/helpers/loadMaskRaster.ts`
- Modify: `src/helpers/index.ts` (re-export the new helpers next to `./stationPositions`)
- Test: `src/helpers/stationPositions.test.ts`

**Interfaces:**
- Produces: `interface MaskRaster { width: number; height: number; alpha: Uint8Array }` (one byte per pixel, > 0 = masked)
- Produces: `isPixelHidden(raster: MaskRaster, x: number, y: number): boolean`
- Produces: `isSegmentMasked(raster: MaskRaster | null, a: Point, b: Point): boolean` (false when raster is null)
- Produces: `isWindowMasked(raster: MaskRaster | null, center: Point, windowM: number, matrix: number[][], samples?: number): boolean` (center in real-world metres)
- Produces: `loadMaskRaster(src: string): Promise<MaskRaster | null>`
- Produces: `getSectionSearchLines(input: { sectionPoints?: Point[]; numStations?: number; data?: { num_stations?: number; east?: number[]; north?: number[] } | null; heightRoiM: number; matrix: number[][] }): SearchLine[]`
- Produces: `searchLineCenters(lines: SearchLine[], matrix: number[][]): Point[]` (real-world midpoints)

- [ ] **Step 1: Write the failing tests**

`src/helpers/maskCoverage.test.ts`:

```ts
import { isPixelHidden, isSegmentMasked, isWindowMasked, MaskRaster } from './maskCoverage';

// 10×10 raster, left half masked.
const raster: MaskRaster = {
  width: 10,
  height: 10,
  alpha: Uint8Array.from({ length: 100 }, (_, i) => (i % 10 < 5 ? 111 : 0)),
};
const identity = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

describe('maskCoverage', () => {
  it('treats masked and off-image pixels as hidden', () => {
    expect(isPixelHidden(raster, 2, 2)).toBe(true);
    expect(isPixelHidden(raster, 7, 2)).toBe(false);
    expect(isPixelHidden(raster, -1, 2)).toBe(true);
    expect(isPixelHidden(raster, 2, 10)).toBe(true);
  });

  it('flags a segment only when every sample is hidden', () => {
    expect(isSegmentMasked(raster, { x: 1, y: 0 }, { x: 1, y: 9 })).toBe(true);
    expect(isSegmentMasked(raster, { x: 1, y: 5 }, { x: 8, y: 5 })).toBe(false);
  });

  it('flags a window only when every sample is hidden', () => {
    expect(isWindowMasked(raster, { x: 2, y: 5 }, 3, identity)).toBe(true);
    expect(isWindowMasked(raster, { x: 5, y: 5 }, 4, identity)).toBe(false);
  });

  it('never masks without a raster or a window', () => {
    expect(isSegmentMasked(null, { x: 1, y: 0 }, { x: 1, y: 9 })).toBe(false);
    expect(isWindowMasked(null, { x: 2, y: 5 }, 3, identity)).toBe(false);
    expect(isWindowMasked(raster, { x: 2, y: 5 }, 0, identity)).toBe(false);
  });
});
```

Append to `src/helpers/stationPositions.test.ts` (use whatever identity matrix the file already declares, or declare `identity` as above):

```ts
import { getSectionSearchLines, searchLineCenters } from './stationPositions';

describe('getSectionSearchLines', () => {
  const sectionPoints = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
  ];

  it('interpolates stations along the drawn line before any run', () => {
    const lines = getSectionSearchLines({ sectionPoints, numStations: 3, data: null, heightRoiM: 2, matrix: identity });
    expect(lines).toHaveLength(3);
    expect(searchLineCenters(lines, identity).map((c) => Math.round(c.x))).toEqual([0, 5, 10]);
  });

  it('uses the backend centres once a matching run exists', () => {
    const data = { num_stations: 3, east: [1, 4, 9], north: [0, 0, 0] };
    const lines = getSectionSearchLines({ sectionPoints, numStations: 3, data, heightRoiM: 2, matrix: identity });
    expect(searchLineCenters(lines, identity).map((c) => Math.round(c.x))).toEqual([1, 4, 9]);
  });

  it('returns nothing for an incomplete section', () => {
    expect(getSectionSearchLines({ sectionPoints, numStations: 1, data: null, heightRoiM: 2, matrix: identity })).toEqual([]);
    expect(getSectionSearchLines({ sectionPoints: [], numStations: 3, data: null, heightRoiM: 2, matrix: identity })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run (from `gui/`): `npx jest src/helpers/maskCoverage.test.ts src/helpers/stationPositions.test.ts`
Expected: "Cannot find module './maskCoverage'".

- [ ] **Step 3: Implement**

`commons/coordinates.ts`: add `invertMatrix,` to the export block.

`src/helpers/maskCoverage.ts`:

```ts
import { invertMatrix } from '../../commons/coordinates';
import type { Point } from '../types';

/** The Processing mask overlay, one byte per pixel: > 0 is masked (the PNG's alpha). */
export interface MaskRaster {
  width: number;
  height: number;
  alpha: Uint8Array;
}

/** Off-image counts as hidden, matching the backend's are_all_points_hidden. */
export const isPixelHidden = (raster: MaskRaster, x: number, y: number): boolean => {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= raster.width || yi >= raster.height) return true;
  return raster.alpha[yi * raster.width + xi] > 0;
};

/** Whether every pixel along a → b (one sample per pixel of length) is hidden. */
export const isSegmentMasked = (raster: MaskRaster | null, a: Point, b: Point): boolean => {
  if (!raster) return false;
  const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)) + 1);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    if (!isPixelHidden(raster, a.x + t * (b.x - a.x), a.y + t * (b.y - a.y))) return false;
  }
  return true;
};

/**
 * Whether an iWave window (a real-world square aligned with east/north, like the
 * backend's ortho grid) is hidden at every sample. A preview only: the backend
 * decides with the exact crop.
 */
export const isWindowMasked = (
  raster: MaskRaster | null,
  center: Point,
  windowM: number,
  matrix: number[][],
  samples = 16
): boolean => {
  if (!raster || !(windowM > 0) || matrix.length !== 3) return false;
  const inv = invertMatrix(matrix);
  const half = windowM / 2;
  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < samples; j++) {
      const e = center.x - half + (windowM * i) / (samples - 1);
      const n = center.y - half + (windowM * j) / (samples - 1);
      const w = inv[2][0] * e + inv[2][1] * n + inv[2][2] || 1;
      const x = (inv[0][0] * e + inv[0][1] * n + inv[0][2]) / w;
      const y = (inv[1][0] * e + inv[1][1] * n + inv[1][2]) / w;
      if (!isPixelHidden(raster, x, y)) return false;
    }
  }
  return true;
};
```

(Check `Point`'s import path against what `stationPositions.ts` uses and match it.)

`src/helpers/loadMaskRaster.ts`:

```ts
import type { MaskRaster } from './maskCoverage';

const cache = new Map<string, Promise<MaskRaster | null>>();

/**
 * Reads the Processing mask PNG into a MaskRaster. Resolves null (never rejects)
 * when there is no mask yet or the image can't be read, so a preview just shows
 * nothing masked.
 */
export const loadMaskRaster = (src: string): Promise<MaskRaster | null> => {
  if (!src) return Promise.resolve(null);
  const cached = cache.get(src);
  if (cached) return cached;
  const promise = new Promise<MaskRaster | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const alpha = new Uint8Array(canvas.width * canvas.height);
        for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
        resolve({ width: canvas.width, height: canvas.height, alpha });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
  cache.set(src, promise);
  return promise;
};
```

`maskPath` carries a `?t=` timestamp that changes whenever the mask is rebuilt (`dataSlice.ts:71`), so the per-src cache can't serve a stale mask.

`src/helpers/stationPositions.ts`: extract the centre interpolation loop of `computeStationSearchLines` into `export const interpolateStationCenters = (rwStart: Point, rwEnd: Point, numStations: number): Point[]` and call it from there. Then add (importing `transformPixelToRealWorld` from `../../commons/coordinates`):

```ts
export interface SectionSearchLinesInput {
  sectionPoints?: Point[];
  numStations?: number;
  data?: { num_stations?: number; east?: number[]; north?: number[] } | null;
  heightRoiM: number;
  matrix: number[][];
}

/**
 * The STIV search lines for a section, as drawn on Processing: the backend's
 * per-station centres once a run with this station count exists, else stations
 * interpolated along the drawn line. Moved here from StationSearchLines so the
 * mask preview uses the exact same geometry.
 */
export const getSectionSearchLines = ({
  sectionPoints,
  numStations,
  data,
  heightRoiM,
  matrix,
}: SectionSearchLinesInput): SearchLine[] => {
  if (!numStations || numStations < 2) return [];
  if (!sectionPoints || sectionPoints.length < 2) return [];
  if (matrix.length !== 3) return [];
  const [sx, sy] = transformPixelToRealWorld(sectionPoints[0].x, sectionPoints[0].y, matrix);
  const [ex, ey] = transformPixelToRealWorld(sectionPoints[1].x, sectionPoints[1].y, matrix);
  const hasAuthoritativeCenters =
    !!data &&
    data.num_stations === numStations &&
    Array.isArray(data.east) &&
    Array.isArray(data.north) &&
    data.east.length === numStations &&
    data.north.length === numStations;
  return hasAuthoritativeCenters
    ? computeSearchLinesFromCenters(
        data!.east!.map((east, i) => ({ x: east, y: data!.north![i] })),
        { x: sx, y: sy },
        { x: ex, y: ey },
        heightRoiM,
        matrix
      )
    : computeStationSearchLines({ x: sx, y: sy }, { x: ex, y: ey }, numStations, heightRoiM, matrix);
};

/** Real-world centre of each search line (lines are symmetric about it in metres). */
export const searchLineCenters = (lines: SearchLine[], matrix: number[][]): Point[] =>
  lines.map(({ a, b }) => {
    const [ax, ay] = transformPixelToRealWorld(a.x, a.y, matrix);
    const [bx, by] = transformPixelToRealWorld(b.x, b.y, matrix);
    return { x: (ax + bx) / 2, y: (ay + by) / 2 };
  });
```

Re-export from `src/helpers/index.ts`: `getSectionSearchLines`, `searchLineCenters`, `interpolateStationCenters`, plus `isSegmentMasked`, `isWindowMasked`, `isPixelHidden`, `loadMaskRaster` and `type MaskRaster`.

- [ ] **Step 4: Run the tests**

Run: `npx jest src/helpers/maskCoverage.test.ts src/helpers/stationPositions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add commons/coordinates.ts src/helpers/maskCoverage.ts src/helpers/maskCoverage.test.ts src/helpers/loadMaskRaster.ts src/helpers/stationPositions.ts src/helpers/stationPositions.test.ts src/helpers/index.ts
git commit -m "Add mask coverage helpers and share the STIV search-line geometry"
```

---

### Task 5: Live masked STIV lines on the Frames canvas

**Files:**
- Create: `src/hooks/useMaskedStations.ts`; export it from `src/hooks/index.ts`
- Modify: `src/components/Graphs/searchLineState.ts`, `src/components/Graphs/searchLineState.test.ts`
- Modify: `src/components/StationSearchLines.tsx:54-154`

**Interfaces:**
- Consumes: Task 4 helpers
- Produces: `useMaskedStations(iwaveWindowM: number | null): { stiv: boolean[]; iwave: boolean[] }` (index = station index; empty arrays when the section has no stations)
- Produces: `SearchLineStateInput.masked?: boolean`; `SearchLineVisual.dotted: boolean`

- [ ] **Step 1: Write the failing test** (`searchLineState.test.ts`)

Add `dotted: false` to every existing `toEqual` expectation in the file, then append:

```ts
  it('is a muted dotted line with ⊘ when the whole line is masked, whatever STIV found', () => {
    const v = getSearchLineVisual({
      hasRun: true,
      velocityColor: '#ff0000',
      isHovered: false,
      tuned: false,
      lowConfidence: true,
      masked: true,
      colors,
    });
    expect(v.strokeColor).toBe(colors.muted);
    expect(v.dotted).toBe(true);
    expect(v.dashed).toBe(false);
    expect(v.strokeWidth).toBe(1);
    expect(v.labelSuffix).toBe(' ⊘');
    expect(v.badgeBackground).toBe(colors.badge);
  });

  it('keeps the hover halo on a masked line', () => {
    const v = getSearchLineVisual({
      hasRun: false, velocityColor: null, isHovered: true, tuned: false, lowConfidence: false, masked: true, colors,
    });
    expect(v.haloColor).toBe(colors.accent);
    expect(v.strokeWidth).toBe(2.5);
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/components/Graphs/searchLineState.test.ts`
Expected: FAIL (`dotted` is undefined).

- [ ] **Step 3: Implement**

`searchLineState.ts`: add `masked?: boolean` to the input (doc comment: "The whole line is hidden by the mask, so the next run skips it. Overrides velocity, tuned and low-confidence."), and `dotted: boolean` to the visual (doc comment: "Masked: drawn as a fine dotted line"). Add `const MASKED_STROKE_WIDTH = 1;`. At the top of the function body:

```ts
  if (masked) {
    return {
      strokeColor: colors.muted,
      haloColor: isHovered ? colors.accent : BASE_HALO_COLOR,
      strokeWidth: isHovered ? HOVER_STROKE_WIDTH : MASKED_STROKE_WIDTH,
      haloWidth: isHovered ? HOVER_HALO_WIDTH : BASE_HALO_WIDTH,
      dashed: false,
      dotted: true,
      labelSuffix: ' ⊘',
      badgeBackground: colors.badge,
    };
  }
```

and `dotted: false` in the normal return.

`src/hooks/useMaskedStations.ts`:

```ts
import { useEffect, useMemo, useState } from 'react';
import { useDataSlice, useSectionSlice } from '.';
import {
  getSectionSearchLines,
  isSegmentMasked,
  isWindowMasked,
  loadMaskRaster,
  searchLineCenters,
  type MaskRaster,
} from '../helpers';
import { STIV_DEFAULT_HEIGHT_ROI_M } from '../constants/constants';

/**
 * What the next Analyze will skip in the active section: per station, whether its
 * STIV search line / iWave window is entirely under the Processing mask. A live
 * preview from the mask overlay; the run's own record is section.data.*_skip_profile.
 * Pass the iWave window (m) or null to skip the iWave preview.
 */
export const useMaskedStations = (iwaveWindowM: number | null) => {
  const { sections, activeSection, transformationMatrix } = useSectionSlice();
  const { processing } = useDataSlice();
  const [raster, setRaster] = useState<MaskRaster | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMaskRaster(processing.maskPath).then((r) => {
      if (!cancelled) setRaster(r);
    });
    return () => {
      cancelled = true;
    };
  }, [processing.maskPath]);

  const section = sections[activeSection];
  const heightRoi = processing.form.heightRoi;

  return useMemo(() => {
    const lines = getSectionSearchLines({
      sectionPoints: section?.sectionPoints,
      numStations: section?.numStations,
      data: section?.data,
      heightRoiM: heightRoi > 0 ? heightRoi : STIV_DEFAULT_HEIGHT_ROI_M,
      matrix: transformationMatrix,
    });
    const stiv = lines.map((l) => isSegmentMasked(raster, l.a, l.b));
    const iwave =
      iwaveWindowM === null
        ? lines.map(() => false)
        : searchLineCenters(lines, transformationMatrix).map((c) =>
            isWindowMasked(raster, c, iwaveWindowM, transformationMatrix)
          );
    return { stiv, iwave };
  }, [section?.sectionPoints, section?.numStations, section?.data, heightRoi, transformationMatrix, raster, iwaveWindowM]);
};
```

(If `useDataSlice`/`useSectionSlice` are imported differently inside `src/hooks/`, copy the import style of a sibling hook such as `useIwaveDefaults.ts`.)

`StationSearchLines.tsx`:
- Replace lines 59–90 (the guards, endpoint conversion, `hasAuthoritativeCenters` and `lines`) with:

```ts
    const lines = getSectionSearchLines({
      sectionPoints,
      numStations,
      data,
      heightRoiM: heightRoi > 0 ? heightRoi : STIV_DEFAULT_HEIGHT_ROI_M,
      matrix: transformationMatrix,
    });
    if (lines.length === 0) return;
    const hasAuthoritativeCenters = !!data && data.num_stations === numStations && Array.isArray(data.east);
```

  Keep the comment about the ROI Height default above it. Drop the now-unused imports (`computeStationSearchLines`, `computeSearchLinesFromCenters`, `transformPixelToRealWorld`).
- `const { stiv: maskedStiv } = useMaskedStations(null);` at the top of the component. Pass `masked: maskedStiv[stationIndex] === true` to `getSearchLineVisual`, and add `maskedStiv` to the effect deps.
- The stroke dash: `.attr('stroke-dasharray', (_d, i) => (visuals[i].dotted ? '1 3' : visuals[i].dashed ? '5 4' : null))`, plus `.attr('stroke-linecap', (_d, i) => (visuals[i].dotted ? 'round' : null))` so the dots read as dots.

- [ ] **Step 4: Run tests and type-check**

Run: `npx jest src/components/Graphs src/helpers && npx tsc --noEmit -p tsconfig.json`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMaskedStations.ts src/hooks/index.ts src/components/Graphs/searchLineState.ts src/components/Graphs/searchLineState.test.ts src/components/StationSearchLines.tsx
git commit -m "Show STIV search lines that sit under the mask as skipped"
```

---

### Task 6: Masked-count notes in the Processing panel

**Files:**
- Create: `src/helpers/maskedNote.ts`, `src/helpers/maskedNote.test.ts`
- Modify: `src/components/Forms/FormProcessing.tsx:340-400`
- Modify: `src/translations/*/global.json` (12 files, `Processing` block)

**Interfaces:**
- Consumes: `useMaskedStations` (Task 5)
- Produces: `maskedNote(flags: boolean[]): { key: 'none' | 'some' | 'all'; count: number }`

- [ ] **Step 1: Write the failing test** (`src/helpers/maskedNote.test.ts`)

```ts
import { maskedNote } from './maskedNote';

describe('maskedNote', () => {
  it('says nothing when no station is masked', () => {
    expect(maskedNote([false, false])).toEqual({ key: 'none', count: 0 });
    expect(maskedNote([])).toEqual({ key: 'none', count: 0 });
  });
  it('counts masked stations', () => {
    expect(maskedNote([false, true, true])).toEqual({ key: 'some', count: 2 });
  });
  it('flags a technique that would compute nothing', () => {
    expect(maskedNote([true, true])).toEqual({ key: 'all', count: 2 });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/helpers/maskedNote.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
/** Which Processing note to show for a technique's masked-station preview. */
export const maskedNote = (flags: boolean[]): { key: 'none' | 'some' | 'all'; count: number } => {
  const count = flags.filter(Boolean).length;
  if (count === 0) return { key: 'none', count };
  return { key: count === flags.length ? 'all' : 'some', count };
};
```

Translations, `Processing` block, en values:

```json
"maskedStations_one": "{{count}} station under a mask will be skipped",
"maskedStations_other": "{{count}} stations under a mask will be skipped",
"allStationsMasked": "Every station is under a mask: {{technique}} will compute nothing"
```

Translate them into ar de es fr hi it ja ko pt ru zh. Keep `{{count}}` and `{{technique}}`. For languages with more plural forms (ar, ru), add the forms the existing `_few`/`_many` keys in those files use; check an existing plural key such as `Report.Doc.stabilization` to see which suffixes they carry.

`FormProcessing.tsx`:

```ts
  const iwaveWindowM = processing.form.iwaveManual?.windowSize ?? iwaveDefaults.windowSize;
  const masked = useMaskedStations(iwave ? iwaveWindowM : null);
  const stivMasked = maskedNote(masked.stiv);
  const iwaveMasked = maskedNote(masked.iwave);
  const maskedText = (note: ReturnType<typeof maskedNote>, technique: string) =>
    note.key === 'all'
      ? t('Processing.allStationsMasked', { technique })
      : t('Processing.maskedStations', { count: note.count });
```

Right after the STIV `</TechniqueRow>` (line ~340):

```tsx
              {stiv && stivAvailable && stivMasked.key !== 'none' && (
                <p className="tech-params-note tech-row-note">{maskedText(stivMasked, 'STIV')}</p>
              )}
```

After the iWave `</TechniqueRow>` and before the short-clip note:

```tsx
              {iwave && iwaveMasked.key !== 'none' && (
                <p className="tech-params-note tech-row-note">{maskedText(iwaveMasked, 'iWave')}</p>
              )}
```

If `.tech-row-note` notes stack with the short-clip note without a gap, adjust only spacing, and only with `--space-*` tokens in `form.css`.

- [ ] **Step 4: Run tests**

Run: `npx jest src/helpers/maskedNote.test.ts src/helpers/translations.test.ts src/helpers/processingPanelLayout.test.ts && npx tsc --noEmit -p tsconfig.json`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/helpers/maskedNote.ts src/helpers/maskedNote.test.ts src/components/Forms/FormProcessing.tsx src/translations
git commit -m "Say in Processing how many STIV and iWave stations the mask will skip"
```

---

### Task 7: Station-aligned Space-time and Spectrum carousels

**Files:**
- Modify: `src/store/section/types.ts:81-95`
- Create: `src/helpers/stationImages.ts`, `src/helpers/stationImages.test.ts`
- Modify: `src/pages/Processing.tsx:120-180`, `src/components/Carousel.tsx`, `src/components/StiViewer.tsx`, `src/components/IWaveViewer.tsx`, `src/components/ImageProcessing.tsx:125-160`, `src/components/components.css`
- Modify: `src/translations/*/global.json`

**Interfaces:**
- Produces: `SectionData.stiv_skip_profile?: ('masked' | null)[]`, `SectionData.iwave_skip_profile?: ('masked' | 'dry' | null)[]`
- Produces: `alignStationImages(stations: number[], paths: string[], count: number): string[]` (length `count`, `''` where a station has no image; station id *k* goes to index *k − 1*)
- Produces: `skipReasonLabelKey(reason: string | null | undefined): 'Processing.stationMasked' | 'Processing.stationDry' | 'Processing.stationNoResult'`
- Produces: Carousel prop `emptyLabels?: string[]`; StiViewer/IWaveViewer prop `emptyLabel: string`

- [ ] **Step 1: Write the failing test** (`src/helpers/stationImages.test.ts`)

```ts
import { alignStationImages, skipReasonLabelKey } from './stationImages';

describe('alignStationImages', () => {
  it('puts each image at its station index and leaves gaps empty', () => {
    expect(alignStationImages([1, 2, 4], ['a', 'b', 'd'], 5)).toEqual(['a', 'b', '', 'd', '']);
  });
  it('ignores ids outside the station count', () => {
    expect(alignStationImages([0, 3], ['x', 'c'], 2)).toEqual(['', '']);
  });
  it('is empty when nothing was written', () => {
    expect(alignStationImages([], [], 3)).toEqual(['', '', '']);
  });
});

describe('skipReasonLabelKey', () => {
  it('names the reason', () => {
    expect(skipReasonLabelKey('masked')).toBe('Processing.stationMasked');
    expect(skipReasonLabelKey('dry')).toBe('Processing.stationDry');
    expect(skipReasonLabelKey(null)).toBe('Processing.stationNoResult');
    expect(skipReasonLabelKey(undefined)).toBe('Processing.stationNoResult');
  });
});
```

- [ ] **Step 2: Run it to verify it fails** → `npx jest src/helpers/stationImages.test.ts`, FAIL.

- [ ] **Step 3: Implement**

`types.ts`, after `stiv_angle_manual_profile`:

```ts
  /** Why STIV did not compute a station: 'masked' = its whole search line was under the mask. */
  stiv_skip_profile?: ('masked' | null)[];
```

and after `iwave_valid_profile`:

```ts
  /** Why iWave did not fit a station: its window was mostly dry, or entirely under the mask. */
  iwave_skip_profile?: ('masked' | 'dry' | null)[];
```

`src/helpers/stationImages.ts`:

```ts
/**
 * One slot per station (station id k at index k − 1), '' where the run wrote no
 * image. STIV and iWave skip stations, so the files alone are a sparser list
 * than the stations; aligning them keeps the carousel index == station index
 * for every consumer (viewer, angle tuner, markers).
 */
export const alignStationImages = (stations: number[], paths: string[], count: number): string[] => {
  const aligned = Array.from({ length: count }, () => '');
  stations.forEach((id, i) => {
    if (id >= 1 && id <= count) aligned[id - 1] = paths[i];
  });
  return aligned;
};

export const skipReasonLabelKey = (reason: string | null | undefined) =>
  reason === 'masked'
    ? ('Processing.stationMasked' as const)
    : reason === 'dry'
      ? ('Processing.stationDry' as const)
      : ('Processing.stationNoResult' as const);
```

Translations (`Processing` block, en): `"stationMasked": "Masked: not computed"`, `"stationDry": "Dry: not computed"`, `"stationNoResult": "No result"`, in all 12 languages.

`Processing.tsx`:

```ts
  const sectionData = sections[activeSection]?.data;
  const stationCount = sectionData?.id?.length ?? 0;
  const stiSlots = useMemo(() => alignStationImages(stiStations, stiPaths, stationCount), [stiStations, stiPaths, stationCount]);
  const spectrumSlots = useMemo(
    () => alignStationImages(spectrumStations, spectrumPaths, stationCount),
    [spectrumStations, spectrumPaths, stationCount]
  );
  const stiEmptyLabels = useMemo(
    () => stiSlots.map((_, i) => t(skipReasonLabelKey(sectionData?.stiv_skip_profile?.[i]))),
    [stiSlots, sectionData?.stiv_skip_profile, t]
  );
  const spectrumEmptyLabels = useMemo(
    () => spectrumSlots.map((_, i) => t(skipReasonLabelKey(sectionData?.iwave_skip_profile?.[i]))),
    [spectrumSlots, sectionData?.iwave_skip_profile, t]
  );
  const hasStis = stiPaths.length > 0;
  const hasSpectra = spectrumPaths.length > 0;
```

(Check `SectionData` for the station-id field name; the backend writes `id`. If the type lacks it, use `sectionData?.distance?.length`, which is per-station too.) Then:
- `activeList = previewMode === 'sti' ? stiSlots : previewMode === 'iwave' ? spectrumSlots : paths`.
- Every `stiPaths.length > 0` / `spectrumPaths.length > 0` becomes `hasStis` / `hasSpectra`. Those are the toggle guards and the fallback-to-frames effect, so an all-masked run still can't open an empty strip.
- Pass `images={activeList}` plus `emptyLabels={previewMode === 'sti' ? stiEmptyLabels : previewMode === 'iwave' ? spectrumEmptyLabels : undefined}` to `Carousel`.
- Pass `stiPaths={stiSlots}`, `spectrumPaths={spectrumSlots}` and the two label arrays down through `ImageProcessing` (new props `stiEmptyLabels?: string[]`, `spectrumEmptyLabels?: string[]`). `stiStations` / `spectrumStations` become `stiSlots.map((_, i) => i + 1)` / the same for spectra, or simply drop those props and use `activeStation + 1` in the viewers. Prefer dropping them, since the alignment makes them redundant.

`Carousel.tsx`: add the `emptyLabels?: string[]` prop with a doc comment. In `Row`:

```tsx
        {images[index] ? (
          <img src={images[index]} alt={`Slide ${index}`} className={className}></img>
        ) : (
          <div className={`${className} img-carousel-empty`}>{emptyLabels?.[index] ?? ''}</div>
        )}
```

Update the `showStivMarkers` comment ("the iWave strip … sparser list") because both strips are station-aligned now.

`components.css`, next to `.sti-empty`:

```css
/* A station the run skipped (masked, dry, no fit): a quiet tile in the strip,
   same footprint as an image so the strip keeps its rhythm. */
.img-carousel-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 5 / 1;
    width: 100%;
    color: var(--secondary-text-color);
    font-size: var(--text-meta);
    background: var(--canvas-chrome);
}
```

Then check the tile in-app against a real STI tile. Match its height (the STI strips are wide and short) and adjust `aspect-ratio` only if they differ visibly.

`StiViewer.tsx`: new prop `emptyLabel: string`. Keep the `stiPaths.length === 0` → "Run STIV" branch, but change its test to `stiPaths.every((p) => !p)`. After it, when `!stiPaths[activeStation]`, return:

```tsx
    <div className="sti-viewer">
      <p className="sti-empty">
        {t('Processing.stiStation')} {activeStation + 1} · {emptyLabel}
      </p>
    </div>
```

All hooks must stay above both early returns (they already are; keep it so). Replace `stiStations[activeStation] ?? activeStation + 1` with `activeStation + 1`.

`IWaveViewer.tsx`: same pattern. `stationId = activeStation + 1`. Keep the comment about indexing by station id, but reword it: the list is station-aligned now. Use `spectrumPaths.every((p) => !p)` for the "Run iWave" state, and add the per-station empty branch before the plot.

`ImageProcessing.tsx`: pass `emptyLabel={stiEmptyLabels?.[active] ?? ''}` / `spectrumEmptyLabels?.[active] ?? ''`.

- [ ] **Step 4: Run tests and type-check**

Run: `npx jest src/helpers src/components && npx tsc --noEmit -p tsconfig.json`
Expected: PASS. If `previewModeAdoption.test.ts` or `carouselFrameBadge.test.ts` guard source strings you changed, update their expectations to the new code. Don't weaken what they check.

- [ ] **Step 5: Commit**

```bash
git add src/store/section/types.ts src/helpers/stationImages.ts src/helpers/stationImages.test.ts src/pages/Processing.tsx src/components/Carousel.tsx src/components/StiViewer.tsx src/components/IWaveViewer.tsx src/components/ImageProcessing.tsx src/components/components.css src/translations
git commit -m "Keep one Space-time and Spectrum tile per station and label skipped ones"
```

---

### Task 8: Station tag says why a station is empty

**Files:**
- Modify: `src/components/Graphs/stationTagContent.ts:112-165`
- Test: `src/components/Graphs/stationTagContent.test.ts` (create it if it doesn't exist; otherwise append)

**Interfaces:**
- Consumes: `SectionData.*_skip_profile` (Task 7)

- [ ] **Step 1: Write the failing test**

Build a minimal `SectionData` the way an existing test does (look for one that calls `buildStationTagContent` or `getEffectiveTechniqueData`, e.g. `src/helpers/techniqueDischarge.test.ts`, and reuse its fixture builder). Three stations, depths `[1, 1, 1]`, `activeCheck` all true, STIV profile `[0.5, null, 0.6]` with `stiv_skip_profile: [null, 'masked', null]`, iWave profile `[0.4, null, null]` with `iwave_skip_profile: [null, 'masked', 'dry']`. Leave `stiv_angle_profile` undefined so STIV reads `stiv_velocity_profile` directly. Then:

```ts
const params = { activeTechnique: 'lspiv' as const, artificialSeeding: false, alpha: 0.85, step: 1, fps: 30 };
```

```ts
  it('names the skip reason, and adds interpolated when the gap is filled', () => {
    const tag = buildStationTagContent({ ...params, data, stationIndex: 1, interpolated: true });
    const stiv = tag!.rows.find((r) => r.key === 'stiv')!;
    expect(stiv.qualityText).toBe('masked · interpolated');
    expect(stiv.qualityWarn).toBe(false);
    const iwave = tag!.rows.find((r) => r.key === 'iwave')!;
    expect(iwave.qualityText).toBe('masked · interpolated');
  });

  it('shows the bare reason when the gap is left blank', () => {
    const tag = buildStationTagContent({ ...params, data, stationIndex: 2, interpolated: false });
    expect(tag!.rows.find((r) => r.key === 'iwave')!.qualityText).toBe('dry');
    expect(tag!.rows.find((r) => r.key === 'iwave')!.velocityText).toBe('—');
  });
```

- [ ] **Step 2: Run it to verify it fails.**

- [ ] **Step 3: Implement**

In the rows `.map`, after `const v = effective.resolved[stationIndex];`:

```ts
      const skip =
        key === 'stiv' ? data.stiv_skip_profile?.[stationIndex] : key === 'iwave' ? data.iwave_skip_profile?.[stationIndex] : null;
      const skipText = skip ? `${skip}${effective.interpFlags[stationIndex] ? ' · interpolated' : ''}` : null;
```

In the STIV branch: `qualityText: skipText ?? (lowConf ? 'low confidence' : '—')` and `qualityWarn: !skipText && lowConf`. In the iWave branch: `qualityText: skipText ?? (typeof quality === 'number' ? quality.toFixed(2) : '—')`. Update the `qualityText` doc comment on `StationTagRow` to mention `masked` / `dry`.

- [ ] **Step 4: Run** `npx jest src/components/Graphs` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Graphs/stationTagContent.ts src/components/Graphs/stationTagContent.test.ts
git commit -m "Say masked or dry in the station tag for stations STIV or iWave skipped"
```

---

### Task 9: Report lists masked stations

**Files:**
- Create: `src/helpers/stationRanges.ts`, `src/helpers/stationRanges.test.ts`
- Modify: `src/helpers/reportModel.ts`, `src/helpers/reportModel.test.ts`
- Modify: `src/components/Report/Method.tsx:212-232`, `src/components/Report/StationTable.tsx`
- Modify: `src/translations/*/global.json` (`Report.Doc`)

**Interfaces:**
- Produces: `formatStationRanges(stations: number[]): string`
- Produces: `ReportModel.maskedStations: Partial<Record<'stiv' | 'iwave', { section: string; stations: number[] }[]>>` (1-based station numbers; only sections with at least one masked station)

- [ ] **Step 1: Write the failing tests**

`src/helpers/stationRanges.test.ts`:

```ts
import { formatStationRanges } from './stationRanges';

describe('formatStationRanges', () => {
  it('collapses runs into ranges', () => {
    expect(formatStationRanges([6, 7, 8, 9, 12])).toBe('6–9, 12');
    expect(formatStationRanges([3])).toBe('3');
    expect(formatStationRanges([4, 5])).toBe('4–5');
    expect(formatStationRanges([9, 1, 2])).toBe('1–2, 9');
    expect(formatStationRanges([])).toBe('');
  });
});
```

Append to `src/helpers/reportModel.test.ts`, using its existing section fixture with `data.stiv_skip_profile = [null, 'masked', 'masked']` and `data.iwave_skip_profile = ['dry', null, 'masked']`:

```ts
  it('lists masked stations per technique and section', () => {
    const model = buildReportModel({ sections: [section], step: 1, fps: 30 });
    expect(model.maskedStations.stiv).toEqual([{ section: section.name, stations: [2, 3] }]);
    expect(model.maskedStations.iwave).toEqual([{ section: section.name, stations: [3] }]);
  });
```

- [ ] **Step 2: Run them to verify they fail.**

- [ ] **Step 3: Implement**

`src/helpers/stationRanges.ts`:

```ts
/** "6–9, 12" from [6, 7, 8, 9, 12]: station numbers as the report prints them. */
export const formatStationRanges = (stations: number[]): string => {
  const sorted = [...new Set(stations)].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) continue;
    const end = sorted[i - 1];
    parts.push(start === end ? `${start}` : `${start}–${end}`);
    start = sorted[i];
  }
  return parts.join(', ');
};
```

`reportModel.ts`: add `maskedStations` to `ReportModel` (with a doc comment: "Stations STIV/iWave skipped because they were entirely under the mask, from the run's skip profiles"). In `buildReportModel`, for each section with data:

```ts
    (['stiv', 'iwave'] as const).forEach((technique) => {
      const profile = technique === 'stiv' ? data.stiv_skip_profile : data.iwave_skip_profile;
      const stations = (profile ?? []).flatMap((reason, i) => (reason === 'masked' ? [i + 1] : []));
      if (stations.length) (maskedStations[technique] ??= []).push({ section: section.name, stations });
    });
```

Return it from the function.

`Method.tsx` → `ProcessingBlock`: inside the STIV `<dl>` (after the model note) and the iWave `<dl>`, when `model.maskedStations[tech]?.length`:

```tsx
            <dt>{t('Report.Doc.maskedStations', { defaultValue: 'Stations under a mask (not computed)' })}</dt>
            <dd>
              {model.maskedStations.stiv!.map((m) => `${m.section}: ${formatStationRanges(m.stations)}`).join(' · ')}
            </dd>
```

`StationTable.tsx`:

```ts
  const skipProfile =
    section.activeTechnique === 'stiv' ? data.stiv_skip_profile : section.activeTechnique === 'iwave' ? data.iwave_skip_profile : undefined;
  const isMasked = (i: number) => skipProfile?.[i] === 'masked';
```

In the `#` cell: `{i + 1}{effective.interpFlags[i] ? '*' : ''}{isMasked(i) ? '†' : ''}`. After the `starred` note:

```tsx
      {Array.from({ length: rowEnd - rowStart }, (_, k) => rowStart + k).some(isMasked) && (
        <p className="doc-note">
          †{' '}
          {t('Report.Doc.maskedStationNote', {
            technique: TECHNIQUE_LABEL[section.activeTechnique],
            defaultValue: 'under a mask: {{technique}} not computed',
          })}
        </p>
      )}
```

(import `TECHNIQUE_LABEL` from `../../helpers/reportModel`).

Translations, `Report.Doc`, en: `"maskedStations": "Stations under a mask (not computed)"`, `"maskedStationNote": "under a mask: {{technique}} not computed"`, in all 12 languages.

- [ ] **Step 4: Run** `npx jest src/helpers/stationRanges.test.ts src/helpers/reportModel.test.ts src/helpers/report*.test.ts src/helpers/translations.test.ts && npx tsc --noEmit -p tsconfig.json` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/helpers/stationRanges.ts src/helpers/stationRanges.test.ts src/helpers/reportModel.ts src/helpers/reportModel.test.ts src/components/Report/Method.tsx src/components/Report/StationTable.tsx src/translations
git commit -m "List stations skipped under a mask in the report"
```

---

### Task 10: In-app check, three themes, detector

**Files:** none unless the check finds defects.

- [ ] **Step 1: Full test runs**

Run: `venv/bin/python -m pytest tests -q` (worktree root) and `npx jest` + `npx tsc --noEmit -p tsconfig.json` (gui/). Everything must pass.

- [ ] **Step 2: Drive the app** (the `run` skill; the Playwright recipe is in memory `project_camera_calibration_flow.md`). Open a UAV project with a section crossing the bridge (the 2026-10-06 screenshot: stations 6–9 sit under the bridge). Draw or keep a mask over the bridge.
  - Frames canvas, **before Analyze**: stations whose whole line is under the bridge are dotted, muted, with `⊘`. Partly covered lines are normal. Change the station count and the masks: the lines follow. Confirm that the mask PNG loaded at all, i.e. that `loadMaskRaster` didn't resolve `null` because of a canvas taint. If it did, move the PNG read to the main process: an `ipcMain.handle('get-mask-raster')` that reads `PROJECT_CONFIG` mask `.npy`/`.png` and returns `{ width, height, alpha }`. Use it in `loadMaskRaster`, and record the change in the plan.
  - Panel: "N stations under a mask will be skipped" under STIV and under iWave. Mask everything once to see the "Every station…" text, then undo.
  - Analyze, and note the STIV and iWave times next to a run without the mask.
  - Space-time strip: one tile per station; skipped ones show "Masked: not computed"; clicking one shows the same text in the viewer; the angle tuner on the next station still edits that station.
  - Spectrum strip: same check; a dry bank station says "Dry: not computed".
  - Results: hover a masked station. The tag says `masked · interpolated` (Interpolate on) or `masked` (off).
  - Report: the Processing block lists the ranges; the station table shows `†` and the footnote.
- [ ] **Step 3: Repeat the canvas, strip and tag checks in light and dracula.**
- [ ] **Step 4: Detector**

Run: `"/Users/antoine/.claude/plugins/cache/impeccable/impeccable/4.3.1/skills/impeccable/scripts/impeccable" detect --json src/components/Carousel.tsx src/components/StiViewer.tsx src/components/IWaveViewer.tsx src/components/Forms/FormProcessing.tsx src/components/components.css src/components/Report/StationTable.tsx src/components/Report/Method.tsx`
Fix real findings in one batch, then re-run once.

- [ ] **Step 5: Commit any fixes** with a message naming what changed.
