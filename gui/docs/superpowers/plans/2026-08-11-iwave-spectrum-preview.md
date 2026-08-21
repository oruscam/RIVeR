# iWave Spectrum Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give iWave a per-station preview in the Processing module — the `ky=0` wavenumber–frequency spectrum with the fitted dispersion curves drawn on top — replacing the dead `iwaveNoPreview` placeholder.

**Architecture:** The Python pipeline saves each station's spectrum slice as a bare grayscale PNG and writes a `spectra.json` sidecar holding the axis extents and the two dispersion curves as polylines. An Electron IPC handler lists those files. A React viewer displays the PNG and draws the polylines as themed SVG. All physics stays in Python; the GUI is purely presentational.

**Tech Stack:** Python 3 (numpy, cv2, pytest), Electron (TypeScript, jest), React + TypeScript + d3, i18next.

## Global Constraints

- **Two Python environments — use the right one.** The default `python` on PATH does NOT have the `iwave` package; `/Users/antoine/anaconda3/envs/river_dev/bin/python` DOES. Run Python tests with **both**, and report both results:
  - `python -m pytest tests/test_iwave_pipeline.py -v` (iwave absent — the iwave-dependent test must SKIP, never fail)
  - `/Users/antoine/anaconda3/envs/river_dev/bin/python -m pytest tests/test_iwave_pipeline.py -v` (iwave present — everything must PASS)
  Verified at Task 1: 14 passed/1 skipped without iwave, 15 passed with it.
- New Python helpers should still be pure numpy/cv2 and importable without `iwave` wherever the logic allows, so they stay testable in either env. Inside `river/core/iwave_pipeline.py`, `iwave` is imported *lazily inside `_process_station`* — keep it that way.
- `tests/test_iwave_pipeline.py` gates its iwave-dependent section behind a `HAS_IWAVE` flag (try/except import) plus `@pytest.mark.skipif`, established in Task 1. Add new iwave-dependent tests behind that same flag; do NOT reintroduce a module-level `pytest.importorskip`, which aborts collection of the entire module.
- **Spectra output path:** `<frames_dir>.parent/iwave_spectra/<section_key>/`, mirroring how STIV uses `<frames_dir>.parent/stis/<section_key>/` (`orchestrator.py:115`).
- **Image filename:** `spectrum_<station_id>.png`. Sidecar filename: `spectra.json`.
- **Normalisation:** min/max to uint8, written with `cv2.imwrite` — copy the STI convention verbatim from `stiv_pipeline.py:574-578`, including the `+ 1e-12` guard against a zero-range slice.
- **i18n:** `fallbackLng` is `'en'` (`src/translations/i18n.js:20`), so only `src/translations/en/global.json` needs new keys. Do NOT edit the other 12 locale files.
- **Python indentation:** `river/core/iwave_pipeline.py` uses **4 spaces**. `river/core/stiv_pipeline.py` and `river/core/orchestrator.py` use **tabs**. Match whichever file you are editing.
- **Commits:** do NOT add `Co-Authored-By` trailers. Do NOT push.
- **TYPECHECKING — `npx tsc --noEmit -p .` DOES NOT WORK in this repo.** It emits 59 `TS6305` "output not built from source" errors from an unbuilt project reference, masking everything. Ignore any plan step that says otherwise. Use this instead, from `/Users/antoine/river/gui`:

  1. Ensure `gui/tsconfig.check.json` exists (untracked local tool; create it if missing) — same options as `tsconfig.json` but with the `"references"` key removed and `"include": ["src", "electron"]`.
  2. Run: `npx tsc --noEmit -p tsconfig.check.json`
  3. **The repo has ~133 pre-existing type errors in OTHER files. Do not try to fix them.** The gate is only that YOUR files are clean:
     `npx tsc --noEmit -p tsconfig.check.json 2>&1 | grep -E "^(path/to/your/file1|path/to/your/file2)"` → expect no output.
  Verified at Task 6: `electron/ipcMainHandlers/getIwaveSpectra.*` produced zero errors against that 133-error baseline.
- **Backward compatibility:** when the new `spectra_dir` argument is `None`, behaviour must be byte-for-byte identical to today. Existing profile outputs must not regress.

---

### Task 1: Spectrum slice extraction and normalisation helpers

Pure-numpy helpers, no `iwave` import, so they are testable in this environment.

**Files:**
- Modify: `river/core/iwave_pipeline.py` (add helpers near the other module-level helpers, above `_process_station` at line ~205)
- Test: `tests/test_iwave_pipeline.py` (append)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `extract_ky0_slice(spec: np.ndarray, ky: np.ndarray) -> np.ndarray` — returns a 2D `(n_kt, n_kx)` array.
  - `normalize_to_uint8(arr: np.ndarray) -> np.ndarray` — returns a `uint8` array of the same shape.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_iwave_pipeline.py`:

```python
def test_extract_ky0_slice_picks_row_nearest_zero():
	# spec is (n_kt, n_ky, n_kx); mark each ky plane with its own constant
	spec = np.zeros((4, 3, 5), dtype=np.float32)
	spec[:, 0, :] = 10.0
	spec[:, 1, :] = 20.0
	spec[:, 2, :] = 30.0
	ky = np.array([-2.0, 0.0, 2.0])

	sl = extract_ky0_slice(spec, ky)

	assert sl.shape == (4, 5)
	assert np.all(sl == 20.0)


def test_extract_ky0_slice_handles_no_exact_zero():
	spec = np.zeros((2, 3, 4), dtype=np.float32)
	spec[:, 2, :] = 7.0
	# nearest to zero is index 2 (-0.1), not an exact 0.0
	ky = np.array([-5.0, -3.0, -0.1])

	sl = extract_ky0_slice(spec, ky)

	assert sl.shape == (2, 4)
	assert np.all(sl == 7.0)


def test_normalize_to_uint8_spans_full_range():
	arr = np.array([[0.0, 5.0], [10.0, 2.5]], dtype=np.float32)

	img = normalize_to_uint8(arr)

	assert img.dtype == np.uint8
	assert img.min() == 0
	assert img.max() == 255


def test_normalize_to_uint8_constant_array_does_not_divide_by_zero():
	arr = np.full((3, 3), 4.2, dtype=np.float32)

	img = normalize_to_uint8(arr)

	assert img.dtype == np.uint8
	assert np.all(img == 0)


def test_normalize_to_uint8_replaces_nan():
	arr = np.array([[0.0, np.nan], [10.0, 5.0]], dtype=np.float32)

	img = normalize_to_uint8(arr)

	assert img.dtype == np.uint8
	assert not np.isnan(img).any()
```

Add the three names to the existing import block at the top of the file:

```python
from river.core.iwave_pipeline import (
	Extent,
	OrthoGrid,
	build_ortho_stack,
	build_warp_matrix,
	compute_extent,
	extract_ky0_slice,
	normalize_to_uint8,
	pick_resolution,
	_flow_direction_from_margins,
	_crosswise_streamwise_unit,
	_station_window,
)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_iwave_pipeline.py -v -k "ky0 or uint8"`
Expected: FAIL — `ImportError: cannot import name 'extract_ky0_slice'`

- [ ] **Step 3: Write the implementation**

In `river/core/iwave_pipeline.py` (4-space indent), above the "Spectral fit" section:

```python
# ---------------------------------------------------------------------------
# Spectrum preview (pure numpy — no iwave import, so this stays testable)
# ---------------------------------------------------------------------------


def extract_ky0_slice(spec: np.ndarray, ky: np.ndarray) -> np.ndarray:
    """The ky=0 cross-section of a (n_kt, n_ky, n_kx) spectrum.

    This is the slice the iwave package's own diagnostic plots use
    (iwave/plots.py), the one the dispersion curves are drawn against.
    ky rarely contains an exact 0.0, so take the row nearest to it.
    """
    idx = int(np.argmin(np.abs(ky)))
    return np.asarray(spec)[:, idx, :]


def normalize_to_uint8(arr: np.ndarray) -> np.ndarray:
    """Min/max normalise to 0-255, matching how STI images are written
    (stiv_pipeline.py). The 1e-12 guard keeps a constant slice from
    dividing by zero."""
    arr = np.nan_to_num(np.asarray(arr, dtype=np.float32), nan=0.0)
    amin, amax = arr.min(), arr.max()
    return ((arr - amin) / (amax - amin + 1e-12) * 255).astype(np.uint8)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_iwave_pipeline.py -v -k "ky0 or uint8"`
Expected: PASS (5 tests)

- [ ] **Step 5: Run the full file to confirm no regression**

Run: `python -m pytest tests/test_iwave_pipeline.py -v`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add river/core/iwave_pipeline.py tests/test_iwave_pipeline.py
git commit -m "Add pure-numpy spectrum slice and normalisation helpers"
```

---

### Task 2: Sidecar payload builder

Builds the JSON-serialisable dict describing one section's spectra. Kept separate from disk I/O so it is testable without a filesystem and without `iwave`.

**Files:**
- Modify: `river/core/iwave_pipeline.py`
- Test: `tests/test_iwave_pipeline.py` (append)

**Interfaces:**
- Consumes: nothing.
- Produces: `build_spectra_sidecar(entries: list[dict]) -> dict`.
  Each input entry is `{"station": int, "kx": np.ndarray, "kt": np.ndarray, "kt_gw": np.ndarray, "kt_turb": np.ndarray}`.
  Output shape:
  ```python
  {
    "version": 1,
    "stations": [
      {
        "station": 3,
        "kx_min": -1.0, "kx_max": 1.0,
        "kt_min": -4.0, "kt_max": 4.0,
        "curves": {
          "gravity": [[kx0, kt0], [kx1, kt1], ...],
          "turbulence": [[kx0, kt0], ...],
        },
      },
    ],
  }
  ```
  Every number is a plain Python `float`/`int` (never numpy scalars — `json.dumps` cannot serialise those).

- [ ] **Step 1: Write the failing tests**

```python
def test_build_spectra_sidecar_shape_and_extents():
	entries = [
		{
			"station": 3,
			"kx": np.array([-1.0, 0.0, 1.0]),
			"kt": np.array([-4.0, 0.0, 4.0]),
			"kt_gw": np.array([-2.0, 0.0, 2.0]),
			"kt_turb": np.array([-1.0, 0.0, 1.0]),
		}
	]

	out = build_spectra_sidecar(entries)

	assert out["version"] == 1
	assert len(out["stations"]) == 1
	st = out["stations"][0]
	assert st["station"] == 3
	assert st["kx_min"] == pytest.approx(-1.0)
	assert st["kx_max"] == pytest.approx(1.0)
	assert st["kt_min"] == pytest.approx(-4.0)
	assert st["kt_max"] == pytest.approx(4.0)
	assert st["curves"]["gravity"] == [[-1.0, -2.0], [0.0, 0.0], [1.0, 2.0]]
	assert st["curves"]["turbulence"] == [[-1.0, -1.0], [0.0, 0.0], [1.0, 1.0]]


def test_build_spectra_sidecar_is_json_serialisable():
	# numpy scalars are the classic json.dumps failure; assert we emit plain floats
	entries = [
		{
			"station": 1,
			"kx": np.array([0.0, 1.0], dtype=np.float32),
			"kt": np.array([0.0, 2.0], dtype=np.float32),
			"kt_gw": np.array([0.0, 1.0], dtype=np.float32),
			"kt_turb": np.array([0.0, 0.5], dtype=np.float32),
		}
	]

	out = build_spectra_sidecar(entries)

	json.dumps(out)  # must not raise
	assert isinstance(out["stations"][0]["kx_min"], float)
	assert isinstance(out["stations"][0]["station"], int)


def test_build_spectra_sidecar_skips_curves_with_nan():
	entries = [
		{
			"station": 2,
			"kx": np.array([0.0, 1.0, 2.0]),
			"kt": np.array([0.0, 1.0, 2.0]),
			"kt_gw": np.array([0.0, np.nan, 2.0]),
			"kt_turb": np.array([0.0, 1.0, 2.0]),
		}
	]

	out = build_spectra_sidecar(entries)

	# the NaN point is dropped, not emitted as null — the GUI draws a polyline
	assert out["stations"][0]["curves"]["gravity"] == [[0.0, 0.0], [2.0, 2.0]]


def test_build_spectra_sidecar_empty_entries():
	out = build_spectra_sidecar([])

	assert out == {"version": 1, "stations": []}
```

Add `import json` to the test file's imports if not already present, and add `build_spectra_sidecar` to the `river.core.iwave_pipeline` import block.

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_iwave_pipeline.py -v -k sidecar`
Expected: FAIL — `ImportError: cannot import name 'build_spectra_sidecar'`

- [ ] **Step 3: Write the implementation**

In `river/core/iwave_pipeline.py`, below `normalize_to_uint8`:

```python
def _curve_points(kx: np.ndarray, kt_curve: np.ndarray) -> list:
    """Pair kx with a curve's frequencies, dropping non-finite points.

    Dropped rather than emitted as null: the GUI renders these as a single
    SVG polyline, which has no way to express a gap.
    """
    pts = []
    for x, t in zip(np.asarray(kx).ravel(), np.asarray(kt_curve).ravel()):
        if np.isfinite(x) and np.isfinite(t):
            pts.append([float(x), float(t)])
    return pts


def build_spectra_sidecar(entries: list) -> dict:
    """JSON-serialisable description of one section's spectrum previews.

    Everything is converted to plain Python scalars: json.dumps cannot
    serialise numpy types.
    """
    stations = []
    for e in entries:
        kx = np.asarray(e["kx"])
        kt = np.asarray(e["kt"])
        stations.append(
            {
                "station": int(e["station"]),
                "kx_min": float(kx.min()),
                "kx_max": float(kx.max()),
                "kt_min": float(kt.min()),
                "kt_max": float(kt.max()),
                "curves": {
                    "gravity": _curve_points(kx, e["kt_gw"]),
                    "turbulence": _curve_points(kx, e["kt_turb"]),
                },
            }
        )
    return {"version": 1, "stations": stations}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_iwave_pipeline.py -v -k sidecar`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add river/core/iwave_pipeline.py tests/test_iwave_pipeline.py
git commit -m "Add spectra sidecar payload builder"
```

---

### Task 3: Write spectra to disk

Disk I/O, separated from the payload builder so it can be tested with `tmp_path` and no `iwave`.

**Files:**
- Modify: `river/core/iwave_pipeline.py`
- Test: `tests/test_iwave_pipeline.py` (append)

**Interfaces:**
- Consumes: `normalize_to_uint8` (Task 1), `build_spectra_sidecar` (Task 2).
- Produces: `write_spectra(spectra_dir: str, entries: list) -> None`.
  Each entry additionally carries `"slice": np.ndarray` (the 2D ky=0 slice) alongside the Task-2 keys.
  Writes `spectrum_<station>.png` per entry plus one `spectra.json`.

  **Cleanup is targeted, NOT a recursive delete.** The directory is created if absent; if present, only the files this function owns are removed (`spectrum_*.png` and `spectra.json`). Everything else is left untouched.

  This deliberately departs from `run_stiv_analysis`'s `shutil.rmtree(stis_dir)` (`stiv_pipeline.py:569-572`). Review of the first implementation confirmed by execution that an unguarded `rmtree` on a caller-supplied path silently wipes unrelated nested content, and Task 5 derives this path from real user project directories. Ruled by the human partner: the guard wins over consistency with the STIV precedent. Do not reintroduce `shutil.rmtree` here.

- [ ] **Step 1: Write the failing tests**

```python
def test_write_spectra_creates_images_and_sidecar(tmp_path):
	entries = [
		{
			"station": 1,
			"slice": np.array([[0.0, 1.0], [2.0, 3.0]], dtype=np.float32),
			"kx": np.array([0.0, 1.0]),
			"kt": np.array([0.0, 1.0]),
			"kt_gw": np.array([0.0, 1.0]),
			"kt_turb": np.array([0.0, 0.5]),
		},
		{
			"station": 10,
			"slice": np.array([[5.0, 6.0], [7.0, 8.0]], dtype=np.float32),
			"kx": np.array([0.0, 1.0]),
			"kt": np.array([0.0, 1.0]),
			"kt_gw": np.array([0.0, 1.0]),
			"kt_turb": np.array([0.0, 0.5]),
		},
	]
	out = tmp_path / "iwave_spectra" / "CS_default_1"

	write_spectra(str(out), entries)

	assert (out / "spectrum_1.png").exists()
	assert (out / "spectrum_10.png").exists()
	sidecar = json.loads((out / "spectra.json").read_text())
	assert [s["station"] for s in sidecar["stations"]] == [1, 10]


def test_write_spectra_image_is_readable_and_correctly_shaped(tmp_path):
	entries = [
		{
			"station": 4,
			"slice": np.arange(12, dtype=np.float32).reshape(3, 4),
			"kx": np.array([0.0, 1.0]),
			"kt": np.array([0.0, 1.0]),
			"kt_gw": np.array([0.0, 1.0]),
			"kt_turb": np.array([0.0, 0.5]),
		}
	]
	out = tmp_path / "spectra"

	write_spectra(str(out), entries)

	img = cv2.imread(str(out / "spectrum_4.png"), cv2.IMREAD_GRAYSCALE)
	assert img is not None
	assert img.shape == (3, 4)
	assert img.min() == 0
	assert img.max() == 255


def test_write_spectra_clears_stale_files(tmp_path):
	out = tmp_path / "spectra"
	out.mkdir(parents=True)
	(out / "spectrum_99.png").write_bytes(b"stale")

	entries = [
		{
			"station": 1,
			"slice": np.zeros((2, 2), dtype=np.float32),
			"kx": np.array([0.0, 1.0]),
			"kt": np.array([0.0, 1.0]),
			"kt_gw": np.array([0.0, 1.0]),
			"kt_turb": np.array([0.0, 0.5]),
		}
	]
	write_spectra(str(out), entries)

	assert not (out / "spectrum_99.png").exists()
	assert (out / "spectrum_1.png").exists()
```

Add `write_spectra` to the import block.

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_iwave_pipeline.py -v -k write_spectra`
Expected: FAIL — `ImportError: cannot import name 'write_spectra'`

- [ ] **Step 3: Write the implementation**

At the top of `river/core/iwave_pipeline.py`, extend the imports:

```python
import json
import shutil
```

(Keep them grouped with the existing stdlib imports, above `import cv2`.)

Then below `build_spectra_sidecar`:

```python
def write_spectra(spectra_dir: str, entries: list) -> None:
    """Write one section's spectrum previews: a bare grayscale PNG per
    station plus a spectra.json sidecar.

    The directory is cleared first so a re-run with fewer stations cannot
    leave stale images behind, matching run_stiv_analysis's handling of
    stis_dir.
    """
    out = Path(spectra_dir)
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True, exist_ok=True)

    for e in entries:
        img = normalize_to_uint8(e["slice"])
        cv2.imwrite(str(out / f"spectrum_{int(e['station'])}.png"), img)

    (out / "spectra.json").write_text(json.dumps(build_spectra_sidecar(entries)))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_iwave_pipeline.py -v -k write_spectra`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add river/core/iwave_pipeline.py tests/test_iwave_pipeline.py
git commit -m "Write iWave spectrum previews and sidecar to disk"
```

---

### Task 4: Capture the spectrum and curves during the fit

Wires the helpers into the real pipeline. `_process_station` is the only place that imports `iwave`, so this task's changes cannot be unit-tested here — verification is by inspection plus the unchanged-behaviour regression test.

**Files:**
- Modify: `river/core/iwave_pipeline.py:205-233` (`_process_station`) and `river/core/iwave_pipeline.py:236-303` (`run_iwave_analysis`)
- Test: `tests/test_iwave_pipeline.py` (append one regression test)

**Interfaces:**
- Consumes: `extract_ky0_slice` (Task 1), `write_spectra` (Task 3).
- Produces: `run_iwave_analysis(..., spectra_dir: Optional[str] = None)`. When `spectra_dir` is `None`, nothing is written and behaviour is unchanged.

- [ ] **Step 1: Extend `_process_station` to return preview data**

Replace the body of `_process_station` (`river/core/iwave_pipeline.py:205-233`, 4-space indent). The early-return and the return dict both gain the new keys so callers always see the same shape:

```python
def _process_station(
    crop: np.ndarray,
    resolution: float,
    fps_eff: float,
    alpha: float,
    time_size: int,
    time_overlap: int,
) -> dict:
    """Spectral velocity fit for one station window. Returns vy/vx/d/quality
    (None on failure), plus the ky=0 spectrum slice, its kx/kt axes, and the
    two theoretical dispersion curves for the preview."""
    from iwave import spectral, window as iw_window, optimise, dispersion as iw_dispersion
    from iwave.iwave import OPTIM_KWARGS_SADE

    empty = dict(
        vy=None, vx=None, d=None, quality=None,
        slice=None, kx=None, kt=None, kt_gw=None, kt_turb=None,
    )

    win = crop.shape[-1]
    if not np.any(crop):
        return empty
    # normalize over time like LazyWindowArray(norm="time"), then flip y so +y = north
    w = iw_window.normalize(crop[None, ...], mode="time")
    w = w[:, :, ::-1, :]
    spec = spectral.sliding_window_spectrum(w, time_size, time_overlap)
    window_dims = (time_size, win, win)
    kt, ky, kx = spectral.wave_numbers(window_dims, resolution, fps_eff)
    spec = spectral.spectrum_preprocessing(spec, kt, ky, kx, SMAX * 3, spectrum_threshold=1.0)
    bnds = ((-SMAX, SMAX), (-SMAX, SMAX), (DMIN, DMAX))
    vy, vx, d, cost, quality, status, msg = optimise.optimize_single_spectrum_velocity(
        spec[0], bnds, alpha, window_dims, resolution, fps_eff,
        penalty_weight=1, gravity_waves_switch=True, turbulence_switch=True,
        pass_downsampling=[2, 1], gauss_width=1, kwargs=dict(OPTIM_KWARGS_SADE),
    )

    # Preview: the ky=0 cross-section with the fitted dispersion relations on
    # top — the diagnostic the iwave package documents in iwave/plots.py.
    # dispersion() needs the 2D velocity, which the caller collapses away.
    kt_gw, kt_turb = iw_dispersion.dispersion(ky, kx, (vy, vx), d, alpha)
    ky0 = int(np.argmin(np.abs(ky)))

    return dict(
        vy=float(vy), vx=float(vx), d=float(d), quality=float(quality),
        slice=extract_ky0_slice(spec[0], ky),
        kx=kx,
        kt=kt,
        kt_gw=np.asarray(kt_gw)[0, ky0, :],
        kt_turb=np.asarray(kt_turb)[0, ky0, :],
    )
```

- [ ] **Step 2: Add `spectra_dir` to `run_iwave_analysis`**

In the signature (`river/core/iwave_pipeline.py:236-247`), add one parameter after `grid`:

```python
    grid: Optional[OrthoGrid] = None,
    spectra_dir: Optional[str] = None,
    progress: Optional[Callable[[int, int], None]] = None,
```

Extend the docstring's second paragraph:

```
    Adds 3 per-station lists: iwave_velocity_profile (signed streamwise, m/s),
    iwave_quality_profile, iwave_depth_profile. Pass a prebuilt (stack, grid)
    pair to reuse the warped frames across sections. If spectra_dir is given,
    each station's ky=0 spectrum preview is saved there as
    spectrum_<station_id>.png alongside a spectra.json sidecar.
```

- [ ] **Step 3: Collect entries in the station loop and write them**

Before the `for i in range(n):` loop, alongside the existing `vel`/`quality`/`depth` lists, add:

```python
    spectra_entries: list = []
```

Inside the loop, within the existing `if r["vy"] is not None:` block, after `depth[i] = r["d"]`, add:

```python
            if spectra_dir is not None and r["slice"] is not None:
                spectra_entries.append(
                    {
                        "station": int(cs["id"][i]),
                        "slice": r["slice"],
                        "kx": r["kx"],
                        "kt": r["kt"],
                        "kt_gw": r["kt_gw"],
                        "kt_turb": r["kt_turb"],
                    }
                )
```

Then, immediately before the three `xsections[current_key][...] = ...` assignments at the end of the function:

```python
    if spectra_dir is not None:
        write_spectra(spectra_dir, spectra_entries)
```

- [ ] **Step 4: Write the tests**

Two tests. The first runs anywhere; the second needs `iwave` and so goes in the `HAS_IWAVE` section at the bottom of the file, beside `test_run_iwave_analysis_recovers_advection`.

Ungated — the preview must be strictly opt-in, so existing callers keep working:

```python
def test_run_iwave_analysis_signature_defaults_spectra_dir_to_none():
	import inspect

	from river.core.iwave_pipeline import run_iwave_analysis

	sig = inspect.signature(run_iwave_analysis)
	assert "spectra_dir" in sig.parameters
	assert sig.parameters["spectra_dir"].default is None
```

Gated — the real end-to-end proof. Reuse the existing `_synthetic_project` helper already in this file (it builds an advecting texture that the pipeline resolves successfully):

```python
@pytest.mark.skipif(not HAS_IWAVE, reason="iwave package not available")
def test_run_iwave_analysis_writes_spectra_when_dir_given(tmp_path):
	frames_dir, H, xsections = _synthetic_project(tmp_path)
	spectra_dir = tmp_path / "iwave_spectra" / "CS1"

	run_iwave_analysis(
		xsections, H, str(frames_dir), step=1, fps=20.0, id_section=0,
		spectra_dir=str(spectra_dir),
	)

	img_path = spectra_dir / "spectrum_1.png"
	assert img_path.exists()
	img = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
	assert img is not None
	assert img.ndim == 2
	# A real spectrum has structure; a blank image would mean we saved the
	# wrong array or normalised a constant.
	assert img.max() > img.min()

	sidecar = json.loads((spectra_dir / "spectra.json").read_text())
	assert [s["station"] for s in sidecar["stations"]] == [1]
	station = sidecar["stations"][0]
	assert station["kx_max"] > station["kx_min"]
	assert station["kt_max"] > station["kt_min"]
	# Both dispersion curves must carry points, mapped over the kx axis.
	assert len(station["curves"]["gravity"]) > 1
	assert len(station["curves"]["turbulence"]) > 1


@pytest.mark.skipif(not HAS_IWAVE, reason="iwave package not available")
def test_run_iwave_analysis_writes_nothing_without_spectra_dir(tmp_path):
	frames_dir, H, xsections = _synthetic_project(tmp_path)

	run_iwave_analysis(
		xsections, H, str(frames_dir), step=1, fps=20.0, id_section=0,
	)

	assert not (tmp_path / "iwave_spectra").exists()
```

These two tests are what verify the `[0, ky0, :]` curve indexing is right — if the shape assumption is wrong, they fail rather than shipping a broken viewer.

- [ ] **Step 5: Run the full Python suite for this module**

Run: `python -m pytest tests/test_iwave_pipeline.py -v`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add river/core/iwave_pipeline.py tests/test_iwave_pipeline.py
git commit -m "Capture the ky=0 spectrum and dispersion curves during the iWave fit"
```

---

### Task 5: Pass `spectra_dir` from the orchestrator and CLI

**Files:**
- Modify: `river/core/orchestrator.py:143-166` (the iWave stage)
- Modify: `river/cli/commands/iwave_pipeline.py`
- Test: none — this is wiring covered by Task 4's default-None guarantee; verified by inspection.

**Interfaces:**
- Consumes: `run_iwave_analysis(..., spectra_dir=...)` (Task 4).
- Produces: spectra written to `<frames_dir>.parent/iwave_spectra/<section_key>/` on every iWave-enabled orchestrator run.

- [ ] **Step 1: Wire the orchestrator**

`river/core/orchestrator.py` uses **tabs**. In the iWave stage, immediately after the `_log("iWave: warping frames onto ortho grid")` line, add:

```python
			spectra_root = frames_dir.parent / "iwave_spectra"
```

Then in the `run_iwave_analysis(...)` call (line ~155), add one argument after `grid=grid,`:

```python
						spectra_dir=str(spectra_root / _key),
```

This mirrors `stis_dir=str(stis_root / _key)` at line 132 — one folder per cross-section, because a flat shared folder would make each section overwrite the previous one's images.

- [ ] **Step 2: Wire the CLI**

In `river/cli/commands/iwave_pipeline.py` (**tabs**), add a flag option after the existing `--write` option:

```python
@click.option(
	"--save-spectra",
	is_flag=True,
	default=False,
	help="Save per-station spectrum previews next to the frames directory.",
)
```

Add `save_spectra: bool,` to the `iwave_analyze` function signature after `write: bool,`, and inside the function, before the `run_iwave_analysis` call:

```python
	session_dir = Path(frames_dir).parent
	spectra_dir = str(session_dir / "iwave_spectra") if save_spectra else None
```

Then add to the `run_iwave_analysis(...)` call, after `bbox=...`:

```python
		spectra_dir=spectra_dir,
```

- [ ] **Step 3: Verify the CLI still loads**

Run: `python -m river.cli --help`
Expected: exits 0, no import errors.

- [ ] **Step 4: Confirm no Python regressions**

Run: `python -m pytest tests/test_iwave_pipeline.py -v`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add river/core/orchestrator.py river/cli/commands/iwave_pipeline.py
git commit -m "Write iWave spectra from the orchestrator and CLI"
```

---

### Task 6: Electron IPC handler for spectra

**Files:**
- Create: `gui/electron/ipcMainHandlers/getIwaveSpectra.ts`
- Create: `gui/electron/ipcMainHandlers/getIwaveSpectra.test.ts`
- Modify: `gui/electron/ipcMainHandlers/index.ts`

**Interfaces:**
- Consumes: files written by Task 3/5.
- Produces: IPC channel `get-iwave-spectra`, taking `{ sectionName: string }` and returning
  `{ stations: number[]; paths: string[]; sidecar: IwaveSpectraSidecar | null }`,
  where `IwaveSpectraSidecar` is
  ```ts
  {
    version: number;
    stations: {
      station: number;
      kx_min: number; kx_max: number;
      kt_min: number; kt_max: number;
      curves: { gravity: [number, number][]; turbulence: [number, number][] };
    }[];
  }
  ```

- [ ] **Step 1: Write the failing tests**

Create `gui/electron/ipcMainHandlers/getIwaveSpectra.test.ts`:

```ts
const mockHandlers: Record<string, (...args: any[]) => any> = {};

jest.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (...args: any[]) => any) => {
      mockHandlers[channel] = fn;
    },
  },
}));

jest.mock('../main', () => ({
  PROJECT_CONFIG: { projectDirectory: '/fake/project' },
}));

const mockReaddir = jest.fn();
const mockReadFile = jest.fn();
jest.mock('fs/promises', () => ({
  readdir: (...args: any[]) => mockReaddir(...args),
  readFile: (...args: any[]) => mockReadFile(...args),
}));

import { getIwaveSpectra } from './getIwaveSpectra';

const trigger = async (args: any) => mockHandlers['get-iwave-spectra']({}, args);

const SIDECAR = {
  version: 1,
  stations: [
    {
      station: 1,
      kx_min: -1,
      kx_max: 1,
      kt_min: -4,
      kt_max: 4,
      curves: { gravity: [[0, 0]], turbulence: [[0, 0]] },
    },
  ],
};

describe('get-iwave-spectra', () => {
  beforeAll(() => {
    getIwaveSpectra();
  });

  beforeEach(() => {
    mockReaddir.mockReset();
    mockReadFile.mockReset();
  });

  it('returns station ids and paths, sorted numerically', async () => {
    // Lexicographically misleading: '10' sorts before '2' as a string.
    mockReaddir.mockResolvedValue(['spectrum_10.png', 'spectrum_2.png', 'spectrum_1.png']);
    mockReadFile.mockResolvedValue(JSON.stringify(SIDECAR));

    const result = await trigger({ sectionName: 'CS_default_1' });

    expect(result.stations).toEqual([1, 2, 10]);
    expect(result.paths).toHaveLength(3);
    expect(result.paths[0]).toContain('spectrum_1.png');
    expect(result.paths[2]).toContain('spectrum_10.png');
  });

  it('ignores files that are not spectrum images', async () => {
    mockReaddir.mockResolvedValue(['spectrum_1.png', 'spectra.json', 'notes.txt']);
    mockReadFile.mockResolvedValue(JSON.stringify(SIDECAR));

    const result = await trigger({ sectionName: 'CS_default_1' });

    expect(result.stations).toEqual([1]);
  });

  it('parses the sidecar', async () => {
    mockReaddir.mockResolvedValue(['spectrum_1.png']);
    mockReadFile.mockResolvedValue(JSON.stringify(SIDECAR));

    const result = await trigger({ sectionName: 'CS_default_1' });

    expect(result.sidecar?.stations[0].kx_max).toBe(1);
  });

  it('returns an empty result when the directory is absent', async () => {
    mockReaddir.mockRejectedValue(new Error('ENOENT'));

    const result = await trigger({ sectionName: 'CS_default_1' });

    expect(result).toEqual({ stations: [], paths: [], sidecar: null });
  });

  it('returns images with a null sidecar when the sidecar is unreadable', async () => {
    mockReaddir.mockResolvedValue(['spectrum_1.png']);
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const result = await trigger({ sectionName: 'CS_default_1' });

    expect(result.stations).toEqual([1]);
    expect(result.sidecar).toBeNull();
  });

  it('returns an empty result when no section name is given', async () => {
    const result = await trigger({});

    expect(result).toEqual({ stations: [], paths: [], sidecar: null });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd gui && npx jest electron/ipcMainHandlers/getIwaveSpectra.test.ts`
Expected: FAIL — cannot find module `./getIwaveSpectra`

- [ ] **Step 3: Write the implementation**

Create `gui/electron/ipcMainHandlers/getIwaveSpectra.ts`:

```ts
import { ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PROJECT_CONFIG } from '../main';

const SPECTRUM_FILENAME = /^spectrum_(\d+)\.png$/;

export interface IwaveSpectraSidecar {
  version: number;
  stations: {
    station: number;
    kx_min: number;
    kx_max: number;
    kt_min: number;
    kt_max: number;
    curves: { gravity: [number, number][]; turbulence: [number, number][] };
  }[];
}

/**
 * Lists the spectrum previews iWave wrote for one cross-section.
 *
 * iWave writes <project>/iwave_spectra/<section>/spectrum_<station_id>.png plus a
 * spectra.json sidecar on every spectra-enabled run. Returns an empty result (not
 * an error) when the folder is absent — that is the normal state before iWave has
 * ever run for this section. A missing or corrupt sidecar still yields the images,
 * so the viewer can show the spectrum without the dispersion curves.
 */
function getIwaveSpectra() {
  ipcMain.handle('get-iwave-spectra', async (_event, args) => {
    const { sectionName } = args ?? {};
    if (!sectionName) {
      return { stations: [], paths: [], sidecar: null };
    }
    const { projectDirectory, filePrefix } = PROJECT_CONFIG;
    const spectraDir = path.join(projectDirectory, 'iwave_spectra', sectionName);
    const prefix = filePrefix === undefined ? '' : filePrefix;

    let entries: { station: number; file: string }[];
    try {
      const files = await fs.readdir(spectraDir);
      entries = files
        .map((file) => {
          const match = SPECTRUM_FILENAME.exec(file);
          return match ? { station: parseInt(match[1], 10), file } : null;
        })
        .filter((entry): entry is { station: number; file: string } => entry !== null)
        // Numeric sort: a lexicographic sort would order spectrum_10 before spectrum_2.
        .sort((a, b) => a.station - b.station);
    } catch {
      return { stations: [], paths: [], sidecar: null };
    }

    let sidecar: IwaveSpectraSidecar | null = null;
    try {
      sidecar = JSON.parse(await fs.readFile(path.join(spectraDir, 'spectra.json'), 'utf-8'));
    } catch {
      sidecar = null;
    }

    return {
      stations: entries.map((entry) => entry.station),
      paths: entries.map((entry) => path.join(prefix, spectraDir, entry.file)),
      sidecar,
    };
  });
}

export { getIwaveSpectra };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd gui && npx jest electron/ipcMainHandlers/getIwaveSpectra.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Register the handler**

Three edits, mirroring how `getStis` is wired.

In `gui/electron/ipcMainHandlers/index.ts`, add the import next to the `getStis` import (line 22):

```ts
import { getIwaveSpectra } from './getIwaveSpectra';
```

and add it to the `export { ... }` block, keeping the block's alphabetical order — between `getImages` and `getIpcamImages`:

```ts
  getIwaveSpectra,
```

In `gui/electron/main.ts`, add `getIwaveSpectra,` to the import block at line ~30, then add the invocation in the registration block (near line 226), keeping that block's alphabetical order — between `getIpcamImages();` and `getPoints();`:

```ts
  getIwaveSpectra();
```

- [ ] **Step 6: Verify registration compiles**

Run: `cd gui && npx tsc --noEmit -p .`
Expected: no errors in `electron/ipcMainHandlers/` or `electron/main.ts`

- [ ] **Step 7: Commit**

```bash
git add gui/electron/ipcMainHandlers/getIwaveSpectra.ts gui/electron/ipcMainHandlers/getIwaveSpectra.test.ts gui/electron/ipcMainHandlers/index.ts
git commit -m "Add get-iwave-spectra IPC handler"
```

---

### Task 7: Curve-to-view coordinate mapping helper

Pure function, extracted so the geometry is unit-tested without rendering.

**Files:**
- Create: `gui/src/helpers/spectrumGeometry.ts`
- Create: `gui/src/helpers/spectrumGeometry.test.ts`
- Modify: `gui/src/helpers/index.ts`

**Interfaces:**
- Consumes: the sidecar station shape from Task 6.
- Produces:
  ```ts
  export interface SpectrumExtent {
    kxMin: number; kxMax: number; ktMin: number; ktMax: number;
  }
  export const curveToPolylinePoints = (
    curve: [number, number][],
    extent: SpectrumExtent,
    viewWidth: number,
    viewHeight: number
  ): string
  ```
  Returns an SVG `points` attribute string, e.g. `"0,100 50,50"`. Returns `''` for an empty curve.

- [ ] **Step 1: Write the failing tests**

Create `gui/src/helpers/spectrumGeometry.test.ts`:

```ts
import { curveToPolylinePoints, SpectrumExtent } from './spectrumGeometry';

const EXTENT: SpectrumExtent = { kxMin: -1, kxMax: 1, ktMin: -2, ktMax: 2 };

describe('curveToPolylinePoints', () => {
  it('maps the extent corners to the view corners', () => {
    // kx=-1 -> x=0; kx=1 -> x=width.
    // kt is inverted: kt=ktMax -> y=0 (top), kt=ktMin -> y=height (bottom),
    // because SVG y grows downward while frequency grows upward.
    const points = curveToPolylinePoints(
      [
        [-1, 2],
        [1, -2],
      ],
      EXTENT,
      200,
      100
    );

    expect(points).toBe('0,0 200,100');
  });

  it('maps the centre of the extent to the centre of the view', () => {
    const points = curveToPolylinePoints([[0, 0]], EXTENT, 200, 100);

    expect(points).toBe('100,50');
  });

  it('returns an empty string for an empty curve', () => {
    expect(curveToPolylinePoints([], EXTENT, 200, 100)).toBe('');
  });

  it('does not divide by zero on a degenerate extent', () => {
    const degenerate: SpectrumExtent = { kxMin: 0, kxMax: 0, ktMin: 0, ktMax: 0 };

    const points = curveToPolylinePoints([[0, 0]], degenerate, 200, 100);

    expect(points).not.toContain('NaN');
  });

  it('rounds to two decimals to keep the DOM attribute small', () => {
    const points = curveToPolylinePoints([[0.3333333, 0]], EXTENT, 300, 100);

    expect(points).toBe('200,50');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd gui && npx jest src/helpers/spectrumGeometry.test.ts`
Expected: FAIL — cannot find module `./spectrumGeometry`

- [ ] **Step 3: Write the implementation**

Create `gui/src/helpers/spectrumGeometry.ts`:

```ts
export interface SpectrumExtent {
  kxMin: number;
  kxMax: number;
  ktMin: number;
  ktMax: number;
}

/**
 * Map a dispersion curve from wavenumber/frequency space to view pixels,
 * as an SVG polyline `points` string.
 *
 * The spectrum image spans the extent exactly, so kx maps linearly across the
 * width. kt is inverted because SVG's y axis grows downward while frequency
 * grows upward — without this the curves would appear mirrored against the
 * energy ridge they are supposed to trace.
 */
export const curveToPolylinePoints = (
  curve: [number, number][],
  extent: SpectrumExtent,
  viewWidth: number,
  viewHeight: number
): string => {
  const kxSpan = extent.kxMax - extent.kxMin || 1;
  const ktSpan = extent.ktMax - extent.ktMin || 1;

  return curve
    .map(([kx, kt]) => {
      const x = ((kx - extent.kxMin) / kxSpan) * viewWidth;
      const y = ((extent.ktMax - kt) / ktSpan) * viewHeight;
      return `${Number(x.toFixed(2))},${Number(y.toFixed(2))}`;
    })
    .join(' ');
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd gui && npx jest src/helpers/spectrumGeometry.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Re-export from the helpers barrel**

`gui/src/helpers/index.ts` uses an import-then-export barrel with a separate `export type { ... }` line, not direct re-export. Three edits.

Add the imports next to the other helper imports (near line 60):

```ts
import { curveToPolylinePoints } from './spectrumGeometry';
import type { SpectrumExtent } from './spectrumGeometry';
```

Add `SpectrumExtent` to the existing `export type { ... }` line (line 63):

```ts
export type { StiColorScale, Technique, DischargeResult, TechniqueDischargeData, TechniqueOptions, SpectrumExtent };
```

Add `curveToPolylinePoints,` to the main `export { ... }` block, keeping its alphabetical order.

- [ ] **Step 6: Commit**

```bash
git add gui/src/helpers/spectrumGeometry.ts gui/src/helpers/spectrumGeometry.test.ts gui/src/helpers/index.ts
git commit -m "Add spectrum curve-to-view geometry helper"
```

---

### Task 8: Translation keys

**Files:**
- Modify: `gui/src/translations/en/global.json:174-188` (the `Processing` block)

**Interfaces:**
- Consumes: nothing.
- Produces: keys `Processing.showIwaveSpectra`, `Processing.noSpectraYet`, `Processing.iwaveNoData`, `Processing.carouselSpectra`, `Processing.spectrumKx`, `Processing.spectrumKt`, `Processing.spectrumGravity`, `Processing.spectrumTurbulence`, `Processing.spectrumQuality`.

- [ ] **Step 1: Add the keys**

In `gui/src/translations/en/global.json`, inside the `Processing` object, replace the `"iwaveNoPreview"` line with:

```json
    "showIwaveSpectra": "Show iWave spectra",
    "noSpectraYet": "Run iWave to see spectra",
    "iwaveNoData": "Run iWave to see spectra",
    "carouselSpectra": "Spectra",
    "spectrumKx": "kx (rad/m)",
    "spectrumKt": "ω (rad/s)",
    "spectrumGravity": "Gravity waves",
    "spectrumTurbulence": "Turbulence",
    "spectrumQuality": "Quality",
```

`iwaveNoPreview` is removed — Task 10 deletes its only usage. Only `en` is edited: `i18n.js:20` sets `fallbackLng: 'en'`, so the other 12 locales fall back automatically.

- [ ] **Step 2: Verify the JSON parses**

Run: `cd gui && node -e "JSON.parse(require('fs').readFileSync('src/translations/en/global.json','utf8')); console.log('ok')"`
Expected: prints `ok`

- [ ] **Step 3: Confirm no stale references remain**

Run: `cd gui && grep -rn "iwaveNoPreview" src/ | grep -v translations`
Expected: one hit in `src/components/Forms/FormProcessing.tsx` — removed in Task 10. Note it and continue.

- [ ] **Step 4: Commit**

```bash
git add gui/src/translations/en/global.json
git commit -m "Add iWave spectrum preview translation keys"
```

---

### Task 9: IWaveViewer component

**Files:**
- Create: `gui/src/components/IWaveViewer.tsx`
- Modify: `gui/src/components/components.css` (append styles)

**Interfaces:**
- Consumes: `curveToPolylinePoints`, `SpectrumExtent` (Task 7); `IwaveSpectraSidecar` shape (Task 6); translation keys (Task 8).
- Produces:
  ```tsx
  export const IWaveViewer: (props: {
    spectrumPaths: string[];
    spectrumStations: number[];
    sidecar: IwaveSpectraSidecar | null;
    activeStation: number;
    containerWidth: number;
    containerHeight: number;
  }) => JSX.Element
  ```

- [ ] **Step 1: Write the component**

Create `gui/src/components/IWaveViewer.tsx`. It mirrors `StiViewer.tsx`'s structure — a fitted frame, an SVG overlay, and a `.velocity-readout` badge — but the base layer is a spectrum rather than an STI, and the overlay is two polylines rather than angle lines:

```tsx
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectSlice, useSectionSlice } from '../hooks';
import { curveToPolylinePoints, SpectrumExtent } from '../helpers';
import { UNIT_CONVERSIONS, UNITS, TECHNIQUE_COLORS } from '../constants/constants';
import type { IwaveSpectraSidecar } from '../../electron/ipcMainHandlers/getIwaveSpectra';
import './components.css';

interface IWaveViewerProps {
  /** Renderer-loadable spectrum image paths, index-aligned with spectrumStations. */
  spectrumPaths: string[];
  /** Station ids parsed from the spectrum filenames, index-aligned with spectrumPaths. */
  spectrumStations: number[];
  /** Axis extents and dispersion curves; null when the sidecar is missing. */
  sidecar: IwaveSpectraSidecar | null;
  /** Index into the station list — which spectrum is currently selected. */
  activeStation: number;
  containerWidth: number;
  containerHeight: number;
}

export const IWaveViewer = ({
  spectrumPaths,
  spectrumStations,
  sidecar,
  activeStation,
  containerWidth,
  containerHeight,
}: IWaveViewerProps) => {
  const { sections, activeSection } = useSectionSlice();
  const { projectDetails } = useProjectSlice();
  const { t } = useTranslation();
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const isImperial = projectDetails.unitSistem === 'imperial';
  const data = sections[activeSection]?.data;

  const stationId = spectrumStations[activeStation];
  const entry = useMemo(
    () => sidecar?.stations.find((s) => s.station === stationId) ?? null,
    [sidecar, stationId]
  );

  // Index the profiles by STATION ID, not by position in the spectrum list.
  // Spectra are only written for stations whose fit succeeded, so a failed
  // station leaves a gap: spectrumStations might be [1,2,4,5] while the
  // profile arrays still have an entry for every station, 0-indexed with
  // station id 1 at index 0 (ids come from np.arange(1, n+1),
  // compute_section.py:567). Using the list position here would show the
  // wrong station's velocity whenever any fit failed.
  const profileIndex = stationId === undefined ? -1 : stationId - 1;
  const velocity = profileIndex >= 0 ? (data?.iwave_velocity_profile?.[profileIndex] ?? null) : null;
  const quality = profileIndex >= 0 ? (data?.iwave_quality_profile?.[profileIndex] ?? null) : null;

  if (spectrumPaths.length === 0) {
    return <p className="sti-empty">{t('Processing.iwaveNoData')}</p>;
  }

  // Fit the spectrum into the panel. Unlike the STI, a non-uniform fit is fine
  // here: the axes are independent physical quantities (wavenumber vs
  // frequency), so stretching one does not misrepresent the other — and the
  // curves are mapped through the same extent, so they stay aligned.
  const aspect = natural ? natural.w / natural.h : 1;
  const viewW = Math.min(containerWidth, containerHeight * aspect);
  const viewH = viewW / (aspect || 1);

  const extent: SpectrumExtent | null = entry
    ? { kxMin: entry.kx_min, kxMax: entry.kx_max, ktMin: entry.kt_min, ktMax: entry.kt_max }
    : null;

  const gravityPoints = extent
    ? curveToPolylinePoints(entry!.curves.gravity, extent, viewW, viewH)
    : '';
  const turbulencePoints = extent
    ? curveToPolylinePoints(entry!.curves.turbulence, extent, viewW, viewH)
    : '';

  return (
    <div className="sti-viewer">
      <div className="sti-frame iwave-frame" style={{ width: viewW, height: viewH }}>
        <img
          src={spectrumPaths[activeStation]}
          className="iwave-spectrum-image"
          draggable={false}
          onLoad={(e) =>
            setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
          }
          style={{ width: viewW, height: viewH }}
        />
        {extent && (
          <svg className="sti-overlay" width={viewW} height={viewH}>
            {gravityPoints && (
              <polyline
                points={gravityPoints}
                fill="none"
                stroke={TECHNIQUE_COLORS.iwave}
                strokeWidth={2}
              />
            )}
            {turbulencePoints && (
              <polyline
                points={turbulencePoints}
                fill="none"
                stroke={TECHNIQUE_COLORS.iwave}
                strokeWidth={2}
                strokeDasharray="5,4"
                strokeOpacity={0.75}
              />
            )}
          </svg>
        )}
        <div className="iwave-axis iwave-axis-x">{t('Processing.spectrumKx')}</div>
        <div className="iwave-axis iwave-axis-y">{t('Processing.spectrumKt')}</div>
        <div className="sti-badge velocity-readout" style={{ color: TECHNIQUE_COLORS.iwave }}>
          {t('Processing.stiStation')} {stationId ?? activeStation + 1}
          <br />
          {velocity === null
            ? '—'
            : `${(isImperial ? velocity * UNIT_CONVERSIONS.M_TO_FT : velocity).toFixed(2)} ${
                isImperial ? UNITS.IMPERIAL.VELOCITY : UNITS.SI.VELOCITY
              }`}
          <br />
          {t('Processing.spectrumQuality')}: {quality === null ? '—' : quality.toFixed(2)}
        </div>
        <div className="iwave-legend velocity-readout">
          <span>
            <svg width="18" height="8">
              <line x1="0" y1="4" x2="18" y2="4" stroke={TECHNIQUE_COLORS.iwave} strokeWidth="2" />
            </svg>
            {t('Processing.spectrumGravity')}
          </span>
          <span>
            <svg width="18" height="8">
              <line
                x1="0"
                y1="4"
                x2="18"
                y2="4"
                stroke={TECHNIQUE_COLORS.iwave}
                strokeWidth="2"
                strokeDasharray="5,4"
                strokeOpacity="0.75"
              />
            </svg>
            {t('Processing.spectrumTurbulence')}
          </span>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Add the styles**

Append to `gui/src/components/components.css`:

```css
/* iWave spectrum preview — reuses .sti-viewer / .sti-frame / .sti-overlay /
   .sti-badge from the STI viewer, and adds the axis labels and curve legend
   that are specific to a spectrum. */
.iwave-frame {
    position: relative;
}

.iwave-spectrum-image {
    display: block;
    /* The spectrum is a data image; smoothing would invent structure that is
       not in the underlying array. */
    image-rendering: pixelated;
}

.iwave-axis {
    position: absolute;
    font-size: 11px;
    color: var(--secondary-text-color);
    pointer-events: none;
}

.iwave-axis-x {
    bottom: -18px;
    left: 50%;
    transform: translateX(-50%);
}

.iwave-axis-y {
    left: -12px;
    top: 50%;
    transform: translateY(-50%) rotate(-90deg);
    transform-origin: center;
}

.iwave-legend {
    position: absolute;
    left: 8px;
    bottom: 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 11px;
    padding: 4px 8px;
}

.iwave-legend span {
    display: flex;
    align-items: center;
    gap: 6px;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd gui && npx tsc --noEmit -p .`
Expected: no errors mentioning `IWaveViewer.tsx`

- [ ] **Step 4: Lint the new files**

Run: `cd gui && npx eslint src/components/IWaveViewer.tsx src/helpers/spectrumGeometry.ts`
Expected: no output

- [ ] **Step 5: Commit**

```bash
git add gui/src/components/IWaveViewer.tsx gui/src/components/components.css
git commit -m "Add IWaveViewer: spectrum image with fitted dispersion curves"
```

---

### Task 10: Wire the preview mode through Processing

Replaces the `stiMode` boolean with a three-way mode and activates the iWave eye button.

**Files:**
- Modify: `gui/src/pages/Processing.tsx`
- Modify: `gui/src/components/Forms/FormProcessing.tsx:11-24, 180-229`
- Modify: `gui/src/components/ImageProcessing.tsx:14-26, 114-135`
- Modify: `gui/src/components/index.ts` (export `IWaveViewer`)

**Interfaces:**
- Consumes: `IWaveViewer` (Task 9), `get-iwave-spectra` (Task 6), translation keys (Task 8).
- Produces: `PreviewMode = 'frames' | 'sti' | 'iwave'`, replacing the `stiMode: boolean` / `setStiMode` prop pair on both `FormProcessing` and `ImageProcessing`.

- [ ] **Step 1: Define the shared type**

In `gui/src/store/ui/types.ts`, add alongside the existing type exports:

```ts
/** Which per-technique preview the Processing left panel is showing. */
type PreviewMode = 'frames' | 'sti' | 'iwave';
```

and add `PreviewMode` to the `export type { ... }` list at the bottom of the file.

- [ ] **Step 2: Update `Processing.tsx`**

Replace the `stiMode` state (line 18) with:

```tsx
  const [previewMode, setPreviewMode] = useState<PreviewMode>('frames');
```

Add the spectra state next to the STI state (after line 20):

```tsx
  const [spectrumPaths, setSpectrumPaths] = useState<string[]>([]);
  const [spectrumStations, setSpectrumStations] = useState<number[]>([]);
  const [spectraSidecar, setSpectraSidecar] = useState<IwaveSpectraSidecar | null>(null);
```

Add the fetch effect immediately after the existing `get-stis` effect (after line 61), mirroring it:

```tsx
  useEffect(() => {
    let cancelled = false;
    window.ipcRenderer
      .invoke('get-iwave-spectra', { sectionName: activeSectionName })
      .then(
        (result: {
          stations: number[];
          paths: string[];
          sidecar: IwaveSpectraSidecar | null;
        }) => {
          if (cancelled) return;
          setSpectrumStations(result.stations);
          setSpectrumPaths(result.paths);
          setSpectraSidecar(result.sidecar);
        }
      )
      .catch(() => {
        if (cancelled) return;
        setSpectrumStations([]);
        setSpectrumPaths([]);
        setSpectraSidecar(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSectionName, fullQuiver]);
```

Replace the two mode-guard effects (lines 63-73) with versions that understand all three modes:

```tsx
  useEffect(() => {
    if (previewMode === 'sti' && stiPaths.length === 0) setPreviewMode('frames');
    if (previewMode === 'iwave' && spectrumPaths.length === 0) setPreviewMode('frames');
  }, [previewMode, stiPaths, spectrumPaths]);

  const { paths, active } = images;

  // Each mode has its own list length; a station index valid in one can be out
  // of range in another, so clamp whenever the active list changes.
  const activeList =
    previewMode === 'sti' ? stiPaths : previewMode === 'iwave' ? spectrumPaths : paths;

  useEffect(() => {
    if (previewMode !== 'frames' && activeList.length > 0 && active >= activeList.length) {
      onSetActiveImage(0);
    }
  }, [previewMode, activeList, active, onSetActiveImage]);
```

Update the `ImageProcessing` props:

```tsx
        <ImageProcessing
          showMedian={showMedian}
          extraFields={extraFields}
          previewMode={previewMode}
          stiPaths={stiPaths}
          stiStations={stiStations}
          spectrumPaths={spectrumPaths}
          spectrumStations={spectrumStations}
          spectraSidecar={spectraSidecar}
        />
```

Update the `Carousel` props:

```tsx
        <Carousel
          images={activeList}
          active={active}
          setActiveImage={onSetActiveImage}
          showMedian={showMedian && fullQuiver !== null}
          setShowMedian={setShowMedian}
          mode={previewMode === 'frames' ? 'analize' : 'processing'}
        />
```

Update the `FormProcessing` props:

```tsx
        <FormProcessing
          extraFields={extraFields}
          showMedian={showMedian}
          setShowMedian={setShowMedian}
          previewMode={previewMode}
          setPreviewMode={setPreviewMode}
          canToggleSti={stiPaths.length > 0}
          canToggleIwave={spectrumPaths.length > 0}
          canToggleMedian={fullQuiver !== null}
        />
```

Add the imports at the top of the file:

```tsx
import type { PreviewMode } from '../store/ui/types';
import type { IwaveSpectraSidecar } from '../../electron/ipcMainHandlers/getIwaveSpectra';
```

- [ ] **Step 3: Update `FormProcessing.tsx`**

Replace the `stiMode: boolean; setStiMode: (value: boolean) => void;` prop pair (lines 13-14 and 21-22) with:

```tsx
  previewMode: PreviewMode;
  setPreviewMode: (value: PreviewMode) => void;
  canToggleIwave: boolean;
```

Add the import:

```tsx
import type { PreviewMode } from '../../store/ui/types';
```

Replace the three eye buttons. LSPIV (lines 180-187):

```tsx
              <button
                type="button"
                className={`technique-eye-btn${previewMode === 'frames' ? ' technique-eye-btn-on' : ''}`}
                title={t('Processing.showLspivFrames')}
                onClick={previewMode !== 'frames' ? () => setPreviewMode('frames') : undefined}
              >
                {previewMode === 'frames' ? <LuEye size={15} /> : <LuEyeOff size={15} />}
              </button>
```

STIV (lines 200-209):

```tsx
              <button
                type="button"
                className={`technique-eye-btn${previewMode === 'sti' ? ' technique-eye-btn-on' : ''}${
                  canToggleSti ? '' : ' technique-eye-btn-off'
                }`}
                title={canToggleSti ? t('Processing.showStivStis') : t('Processing.noStisYet')}
                onClick={canToggleSti && previewMode !== 'sti' ? () => setPreviewMode('sti') : undefined}
              >
                {previewMode === 'sti' ? <LuEye size={15} /> : <LuEyeOff size={15} />}
              </button>
```

iWave (lines 222-228) — replacing the dead placeholder:

```tsx
              <button
                type="button"
                className={`technique-eye-btn${previewMode === 'iwave' ? ' technique-eye-btn-on' : ''}${
                  canToggleIwave ? '' : ' technique-eye-btn-off'
                }`}
                title={canToggleIwave ? t('Processing.showIwaveSpectra') : t('Processing.noSpectraYet')}
                onClick={
                  canToggleIwave && previewMode !== 'iwave' ? () => setPreviewMode('iwave') : undefined
                }
              >
                {previewMode === 'iwave' ? <LuEye size={15} /> : <LuEyeOff size={15} />}
              </button>
```

- [ ] **Step 4: Update `ImageProcessing.tsx`**

Replace the `stiMode?: boolean;` prop with the new set (lines 14-26):

```tsx
export const ImageProcessing = ({
  showMedian,
  extraFields,
  previewMode = 'frames',
  stiPaths,
  stiStations,
  spectrumPaths,
  spectrumStations,
  spectraSidecar,
}: {
  showMedian?: boolean;
  extraFields?: boolean;
  previewMode?: PreviewMode;
  stiPaths?: string[];
  stiStations?: number[];
  spectrumPaths?: string[];
  spectrumStations?: number[];
  spectraSidecar?: IwaveSpectraSidecar | null;
}) => {
```

Add the imports:

```tsx
import { IWaveViewer } from './IWaveViewer';
import type { PreviewMode } from '../store/ui/types';
import type { IwaveSpectraSidecar } from '../../electron/ipcMainHandlers/getIwaveSpectra';
```

Replace the `if (stiMode) {` guard (line 114) with `if (previewMode === 'sti') {`, and add an iWave branch immediately after that block closes (after line 135):

```tsx
  if (previewMode === 'iwave') {
    return (
      <div className="image-with-data-container" style={{ width: realWidth, height: realHeight }}>
        <IWaveViewer
          spectrumPaths={spectrumPaths ?? []}
          spectrumStations={spectrumStations ?? []}
          sidecar={spectraSidecar ?? null}
          activeStation={active}
          containerWidth={realWidth!}
          containerHeight={realHeight! - 90}
        />
      </div>
    );
  }
```

- [ ] **Step 5: Export the component**

`gui/src/components/index.ts` uses an import-then-export barrel, not direct re-export. Add the import next to the other component imports:

```ts
import { IWaveViewer } from './IWaveViewer';
```

then add it to the `export { ... }` block, keeping alphabetical order — between `Icon` and `ImageIpcam`:

```ts
  IWaveViewer,
```

- [ ] **Step 6: Verify the whole app compiles**

Run: `cd gui && npx tsc --noEmit -p .`
Expected: no errors

- [ ] **Step 7: Confirm the placeholder is fully gone**

Run: `cd gui && grep -rn "stiMode\|iwaveNoPreview" src/ electron/ | grep -v translations`
Expected: no output

- [ ] **Step 8: Lint the changed files**

Run: `cd gui && npx eslint src/pages/Processing.tsx src/components/Forms/FormProcessing.tsx src/components/ImageProcessing.tsx src/components/IWaveViewer.tsx`
Expected: no output

- [ ] **Step 9: Run the GUI test suite**

Run: `cd gui && npx jest`
Expected: all PASS

- [ ] **Step 10: Commit**

```bash
git add gui/src/pages/Processing.tsx gui/src/components/Forms/FormProcessing.tsx gui/src/components/ImageProcessing.tsx gui/src/components/index.ts gui/src/store/ui/types.ts
git commit -m "Activate the iWave spectrum preview in Processing"
```

---

### Task 11: End-to-end verification

**Files:** none modified — verification only.

**Interfaces:**
- Consumes: everything above.
- Produces: a verified working feature.

- [ ] **Step 1: Full Python suite**

Run: `python -m pytest tests/test_iwave_pipeline.py -v`
Expected: all PASS

Note: the wider suite has 13 pre-existing failures on this branch's ancestor (`test_compute_section.py`, `test_define_roi_masks.py`, `test_cli_video_to_frames.py`, `test_compute_section_cache.py`) that are unrelated to this work. Do not attempt to fix them here; confirm the count is unchanged.

Run: `python -m pytest -q 2>&1 | tail -3`
Expected: still 13 failed, and no new failure names.

- [ ] **Step 2: Full GUI suite**

Run: `cd gui && npx jest`
Expected: all PASS

- [ ] **Step 3: Typecheck**

Run: `cd gui && npx tsc --noEmit -p .`
Expected: no errors

- [ ] **Step 4: Manual verification in the running app**

Start the app (`cd gui && npm run dev`), then:

1. Load a project and run Processing with **iWave enabled**.
2. Confirm `<project>/iwave_spectra/<section>/` now contains `spectrum_<id>.png` files and a `spectra.json`.
3. The iWave eye button is enabled (not greyed).
4. Clicking it switches the left panel to the spectrum viewer; the LSPIV and STIV eyes turn off — the three are mutually exclusive.
5. The carousel steps through stations and the spectrum updates.
6. Dispersion curves are drawn over the spectrum, and the badge shows station, velocity, and quality.
7. Switch themes (dark / light / dracula): axis labels, legend, and badge stay legible in all three.
8. Open a project where iWave has **never** run: the iWave eye is greyed with the `noSpectraYet` tooltip, and nothing crashes.

- [ ] **Step 5: Report results**

Report actual command output for steps 1-3 and the observed behaviour for step 4. Do not claim success for anything not actually run — if the app could not be launched, say so explicitly rather than assuming.

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Backend extracts `ky=0` slice | 1, 4 |
| Backend computes `kt_gw` / `kt_turb` from optimised params | 4 |
| Bare normalised PNG per station, STI convention | 1, 3 |
| `spectra.json` sidecar with extents + curves | 2, 3 |
| `spectra_dir` mirrors `stis_dir`, opt-in | 4, 5 |
| Orchestrator writes one folder per section | 5 |
| IPC handler mirroring `getStis`, numeric sort, empty-on-missing | 6 |
| `IWaveViewer` mirroring `StiViewer` | 9 |
| Two curves distinguished, axis labels, station badge | 9 |
| `stiMode` → `previewMode` three-way | 10 |
| iWave eye button activated, gated on data | 10 |
| GUI does no physics | 7, 9 (geometry only) |
| Out of scope: depth, Results module | not implemented anywhere |

**Placeholder scan:** no TBD/TODO; every code step carries real code; no "similar to Task N" references.

**Type consistency:** `IwaveSpectraSidecar` is defined once in Task 6 and imported by Tasks 9 and 10. `PreviewMode` is defined in Task 10 Step 1 before its first use in Step 2. `SpectrumExtent` / `curveToPolylinePoints` are defined in Task 7 and consumed in Task 9 with matching signatures. The sidecar's snake_case field names (`kx_min`, `kt_max`) are consistent between the Python emitter (Task 2) and the TypeScript consumers (Tasks 6, 9). `write_spectra` entry dicts carry the same keys in Tasks 3 and 4.

**Known risk:** Task 4 cannot be unit-tested in this environment because `iwave` is not installed. The exact shape returned by `iwave.dispersion.dispersion()` (`1 × N_y × N_x` per its docstring) drives the `[0, ky0, :]` indexing. If manual verification in Task 11 shows mis-shaped curves, that indexing is the first thing to check.
