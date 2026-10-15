"""Tests for river.core.iwave_pipeline geometry helpers (no iwave package required)."""
import copy
import cv2
import json
import numpy as np
import pytest

from river.core.iwave_pipeline import (
	Extent,
	OrthoGrid,
	build_ortho_stack,
	build_warp_matrix,
	build_spectra_sidecar,
	calculate_branch_energy,
	compute_extent,
	extract_kx0_slice,
	extract_ky0_slice,
	get_display_max,
	normalize_to_uint8,
	pick_resolution,
	_flow_direction_from_margins,
	_crosswise_streamwise_unit,
	_station_window,
)

# Identity-like homography: pixel (x, y) -> real-world (east, north) = (x * 0.1, -y * 0.1)
H_SIMPLE = [[0.1, 0.0, 0.0], [0.0, -0.1, 0.0], [0.0, 0.0, 1.0]]


def test_orthogrid_roundtrip():
	grid = OrthoGrid(extent=Extent(0.0, 10.0, 0.0, 5.0), resolution=0.5)
	assert grid.width_px == 20
	assert grid.height_px == 10
	col, row = grid.real_to_pixel(3.0, 4.0)
	assert col == pytest.approx(6.0)
	assert row == pytest.approx(2.0)  # north_max=5 -> (5-4)/0.5


def test_compute_extent_covers_sections_and_bbox():
	xsections = {"CS1": {"east": [1.0, 4.0], "north": [2.0, 3.0], "alpha": 0.85}}
	ext = compute_extent(xsections, H_SIMPLE, bbox=[0, 0, 100, 100], margin=2.0)
	# bbox corners map to east [0,10], north [-10,0]
	assert ext.east_min == pytest.approx(-2.0)
	assert ext.east_max == pytest.approx(12.0)
	assert ext.north_min == pytest.approx(-12.0)
	assert ext.north_max == pytest.approx(5.0)


def test_pick_resolution_caps_grid():
	ext = Extent(0.0, 700.0, 0.0, 70.0)
	res = pick_resolution(ext, max_grid=700)
	assert res == pytest.approx(1.0)


def test_build_warp_matrix_maps_grid_to_frame():
	grid = OrthoGrid(extent=Extent(0.0, 10.0, -10.0, 0.0), resolution=0.1)
	M = build_warp_matrix(grid, H_SIMPLE)
	# grid pixel (0,0) is real-world (0, 0) -> frame pixel (0, 0)
	pt = M @ np.array([0.0, 0.0, 1.0])
	assert pt[0] / pt[2] == pytest.approx(0.0, abs=1e-9)
	assert pt[1] / pt[2] == pytest.approx(0.0, abs=1e-9)
	# grid pixel (10, 10) is real-world (1.0, -1.0) -> frame pixel (10, 10)
	pt = M @ np.array([10.0, 10.0, 1.0])
	assert pt[0] / pt[2] == pytest.approx(10.0)
	assert pt[1] / pt[2] == pytest.approx(10.0)


def test_flow_direction_from_margins_convention():
	# Left margin west of right margin (west->east cross-section):
	# downstream is +90deg CCW rotation of left->right = north... using
	# hydrologic convention d = (north_l - north_r, east_r - east_l), normalized.
	d_e, d_n = _flow_direction_from_margins(east_l=0.0, north_l=0.0, east_r=10.0, north_r=0.0)
	assert d_e == pytest.approx(0.0)
	assert d_n == pytest.approx(1.0)


def test_crosswise_streamwise_unit_convention():
	section = {"dir_east_l": 0.0, "dir_north_l": 0.0, "dir_east_r": 10.0, "dir_north_r": 0.0}
	u_cross, u_stream = _crosswise_streamwise_unit(section)
	np.testing.assert_allclose(u_cross, [1.0, 0.0])
	np.testing.assert_allclose(u_stream, [0.0, 1.0])


def test_station_window_clips_at_borders():
	stack = np.arange(2 * 10 * 10, dtype=np.uint8).reshape(2, 10, 10)
	grid = OrthoGrid(extent=Extent(0.0, 1.0, 0.0, 1.0), resolution=0.1)
	# station at the far corner: window must clip inside the stack
	crop = _station_window(stack, grid, east=0.99, north=0.01, win=4)
	assert crop.shape == (2, 4, 4)
	assert crop.dtype == np.float64


def _write_fake_frames(frames_dir, n, size=20):
	frames_dir.mkdir(parents=True, exist_ok=True)
	rng = np.random.default_rng(3)
	for i in range(n):
		img = rng.integers(0, 255, (size, size), dtype=np.uint8)
		cv2.imwrite(str(frames_dir / f"frame_{i:04d}.jpg"), img)


def test_build_ortho_stack_save_dir_writes_rectified_frames(tmp_path):
	frames_dir = tmp_path / "frames"
	_write_fake_frames(frames_dir, n=5)
	xsections = {"CS1": {"east": [1.0, 4.0], "north": [2.0, 3.0], "alpha": 0.85}}
	save_dir = tmp_path / "rectified"

	stack, grid = build_ortho_stack(str(frames_dir), H_SIMPLE, xsections, save_dir=str(save_dir))

	files = sorted(save_dir.glob("*.jpg"))
	assert len(files) == stack.shape[0] == 5
	img = cv2.imread(str(files[0]), cv2.IMREAD_GRAYSCALE)
	assert img is not None
	assert img.shape == (grid.height_px, grid.width_px)


def test_build_ortho_stack_without_save_dir_has_no_side_effects(tmp_path):
	frames_dir = tmp_path / "frames"
	_write_fake_frames(frames_dir, n=3)
	xsections = {"CS1": {"east": [1.0, 4.0], "north": [2.0, 3.0], "alpha": 0.85}}
	would_be_dir = tmp_path / "rectified"

	build_ortho_stack(str(frames_dir), H_SIMPLE, xsections)

	assert not would_be_dir.exists()
	assert sorted(p.name for p in tmp_path.iterdir()) == ["frames"]


def test_build_ortho_stack_uses_given_resolution(tmp_path):
	frames_dir = tmp_path / "frames"
	frames_dir.mkdir()
	_write_fake_frames(frames_dir, 3)
	H = [[0.05, 0.0, 0.0], [0.0, -0.05, 0.0], [0.0, 0.0, 1.0]]
	xsections = {"CS1": {"east": [0.5], "north": [-0.5]}}
	stack, grid = build_ortho_stack(str(frames_dir), H, xsections, resolution=0.1)
	assert grid.resolution == 0.1
	assert stack.shape[1:] == (grid.height_px, grid.width_px)


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


def test_extract_ky0_slice_does_not_pin_the_full_spectrum():
	# A basic-slice index (spec[:, idx, :]) returns a VIEW whose .base is the
	# full spectrum, keeping it alive in memory. The returned slice must be
	# an independent copy instead.
	spec = np.zeros((4, 3, 5), dtype=np.float64)
	ky = np.array([-2.0, 0.0, 2.0])

	sl = extract_ky0_slice(spec, ky)

	assert sl.base is None
	assert not np.shares_memory(sl, spec)


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

	assert out["version"] == 2
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

	assert out == {"version": 2, "stations": []}


def test_build_spectra_sidecar_v1_entry_has_no_planes():
	# an entry without the kx=0 slice still describes a version 1 station
	entries = [
		{
			"station": 3,
			"kx": np.array([-1.0, 0.0, 1.0]),
			"kt": np.array([0.0, 4.0]),
			"kt_gw": np.array([2.0, 0.0, 2.0]),
			"kt_turb": np.array([-1.0, 0.0, 1.0]),
		}
	]

	st = build_spectra_sidecar(entries)["stations"][0]

	assert "planes" not in st
	assert "energy" not in st


def _two_plane_entry():
	return {
		"station": 5,
		"kx": np.array([-1.0, 0.0, 1.0]),
		"ky": np.array([-2.0, 0.0, 2.0]),
		"kt": np.array([0.0, 4.0], dtype=np.float32),
		"slice": np.array([[0.0, 1.23456, 0.0], [0.0, np.nan, 2.0]], dtype=np.float32),
		"slice_ky": np.array([[0.5, 0.0, 0.5], [0.0, 0.0, 0.0]], dtype=np.float32),
		"kt_gw": np.array([2.0, 0.0, 2.0]),
		"kt_turb": np.array([-1.0, 0.0, 1.0]),
		"kt_gw_ky": np.array([3.0, 0.0, 3.0]),
		"kt_turb_ky": np.array([0.0, 0.0, 0.0]),
		"energy": {"waves": np.float64(0.25), "advected": np.float64(0.5)},
		"vx": np.float64(1.0),
		"vy": np.float64(-0.1),
		"d": np.float64(0.8),
	}


def test_build_spectra_sidecar_writes_both_planes():
	out = build_spectra_sidecar([_two_plane_entry()])
	st = out["stations"][0]

	json.dumps(out)  # must not raise
	assert st["kt"] == [0.0, 4.0]
	# rows follow kt (lowest frequency first), rounded, NaN written as 0
	assert st["planes"]["kx"]["k"] == [-1.0, 0.0, 1.0]
	assert st["planes"]["kx"]["values"] == [[0.0, 1.235, 0.0], [0.0, 0.0, 2.0]]
	assert st["planes"]["ky"]["k"] == [-2.0, 0.0, 2.0]
	assert st["planes"]["ky"]["values"] == [[0.5, 0.0, 0.5], [0.0, 0.0, 0.0]]
	# each plane carries its own curves, against its own k axis
	assert st["planes"]["ky"]["curves"]["gravity"] == [[-2.0, 3.0], [0.0, 0.0], [2.0, 3.0]]
	assert st["planes"]["kx"]["curves"]["turbulence"] == st["curves"]["turbulence"]
	assert st["fit"] == {"vx": 1.0, "vy": -0.1, "depth": 0.8}
	assert st["energy"] == {"waves": 0.25, "advected": 0.5}
	assert st["display_max"] > 0


def test_extract_kx0_slice_picks_column_nearest_zero():
	spec = np.arange(2 * 3 * 4, dtype=np.float32).reshape(2, 3, 4)
	kx = np.array([-1.5, -0.4, 0.6, 1.6])

	sl = extract_kx0_slice(spec, kx)

	np.testing.assert_array_equal(sl, spec[:, :, 1])
	assert sl.base is None


def test_get_display_max_ignores_a_single_hot_cell():
	arr = np.ones((20, 20))
	arr[0, 0] = 500.0

	assert get_display_max(arr) == pytest.approx(1.0)


def test_get_display_max_without_positive_cells():
	assert get_display_max(np.zeros((3, 3))) == 0.0
	assert get_display_max(np.array([np.nan, -1.0])) == 0.0


def test_calculate_branch_energy_splits_between_branches():
	# one (ky, kx) column; the wave curve sits at kt=10, the advected at kt=2
	kt = np.arange(0.0, 13.0)
	spec = np.zeros((13, 1, 1))
	spec[10, 0, 0] = 3.0  # on the wave curve
	spec[2, 0, 0] = 1.0  # on the advected line

	energy = calculate_branch_energy(spec, kt, np.array([[[10.0]]]), np.array([[[2.0]]]))

	assert energy["waves"] == pytest.approx(0.75)
	assert energy["advected"] == pytest.approx(0.25)


def test_calculate_branch_energy_leaves_out_cells_far_from_both_curves():
	kt = np.arange(0.0, 13.0)
	spec = np.zeros((13, 1, 1))
	spec[6, 0, 0] = 1.0  # four rad/s from either curve

	energy = calculate_branch_energy(spec, kt, np.array([[[10.0]]]), np.array([[[2.0]]]))

	assert energy["waves"] + energy["advected"] < 1e-6


def test_calculate_branch_energy_without_the_wave_branch():
	kt = np.arange(0.0, 13.0)
	spec = np.zeros((13, 1, 1))
	spec[10, 0, 0] = 3.0
	spec[2, 0, 0] = 1.0

	energy = calculate_branch_energy(
		spec, kt, np.array([[[10.0]]]), np.array([[[2.0]]]), gravity_waves=False
	)

	assert energy["waves"] is None
	assert energy["advected"] == pytest.approx(0.25)


def test_calculate_branch_energy_empty_spectrum():
	energy = calculate_branch_energy(np.zeros((4, 2, 2)), np.arange(4.0), np.ones((1, 2, 2)), np.ones((1, 2, 2)))

	assert energy == {"waves": 0.0, "advected": 0.0}


def test_write_spectra_thumbnail_survives_a_hot_cell(tmp_path):
	# a single cell far above the rest used to leave every other pixel black
	from river.core.iwave_pipeline import write_spectra

	slice_ = np.linspace(1.0, 2.0, 400, dtype=np.float32).reshape(20, 20)
	slice_[0, 0] = 500.0
	entries = [
		{
			"station": 2,
			"slice": slice_,
			"kx": np.array([0.0, 1.0]),
			"kt": np.array([0.0, 1.0]),
			"kt_gw": np.array([0.0, 1.0]),
			"kt_turb": np.array([0.0, 0.5]),
		}
	]
	out = tmp_path / "spectra"

	write_spectra(str(out), entries)

	img = cv2.imread(str(out / "spectrum_2.png"), cv2.IMREAD_GRAYSCALE)
	assert np.unique(img).size > 100


def test_write_spectra_creates_images_and_sidecar(tmp_path):
	from river.core.iwave_pipeline import write_spectra

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
	from river.core.iwave_pipeline import write_spectra

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


def test_write_spectra_flips_slice_vertically(tmp_path):
	# kt from the iwave package ascends from zero (low frequency in row 0)
	# and is never fftshifted. write_spectra must flip the slice so the PNG's
	# TOP row is the HIGHEST frequency. Row 0 of the input is all zeros
	# (lowest), the last row is all high values (highest); after the flip
	# the PNG's top row must be the high-value row, not the zero row. A test
	# that only checked img.min()/img.max() would pass with or without the
	# flip, so this checks row ORDER instead.
	from river.core.iwave_pipeline import write_spectra

	slice_ = np.zeros((4, 5), dtype=np.float32)
	slice_[0, :] = 0.0
	slice_[1, :] = 50.0
	slice_[2, :] = 100.0
	slice_[3, :] = 200.0
	entries = [
		{
			"station": 7,
			"slice": slice_,
			"kx": np.array([0.0, 1.0]),
			"kt": np.array([0.0, 1.0]),
			"kt_gw": np.array([0.0, 1.0]),
			"kt_turb": np.array([0.0, 0.5]),
		}
	]
	out = tmp_path / "spectra"

	write_spectra(str(out), entries)

	img = cv2.imread(str(out / "spectrum_7.png"), cv2.IMREAD_GRAYSCALE)
	assert img is not None
	# The row order in the PNG must be the reverse of the input slice's:
	# the input's last (highest-value) row lands in the PNG's row 0, and the
	# input's first (lowest-value, zero) row lands in the PNG's last row.
	expected = normalize_to_uint8(slice_[::-1])
	np.testing.assert_array_equal(img, expected)
	assert img[0, 0] > img[-1, 0]  # highest frequency row is on top


def test_write_spectra_clears_stale_files(tmp_path):
	from river.core.iwave_pipeline import write_spectra

	out = tmp_path / "spectra"
	out.mkdir(parents=True)
	(out / "spectrum_99.png").write_bytes(b"stale")
	# Create unrelated content that must survive
	(out / "notes.txt").write_text("important data")
	unrelated_subdir = out / "nested" / "deep"
	unrelated_subdir.mkdir(parents=True)
	(unrelated_subdir / "other.txt").write_text("unrelated")

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
	assert (out / "notes.txt").read_text() == "important data"
	assert (unrelated_subdir / "other.txt").read_text() == "unrelated"


def test_run_iwave_analysis_signature_defaults_spectra_dir_to_none():
	import inspect

	from river.core.iwave_pipeline import run_iwave_analysis

	sig = inspect.signature(run_iwave_analysis)
	assert "spectra_dir" in sig.parameters
	assert sig.parameters["spectra_dir"].default is None


# Check if iwave is available for tests that require it
try:
	import iwave
	HAS_IWAVE = True
except ImportError:
	HAS_IWAVE = False

if HAS_IWAVE:
	from river.core.iwave_pipeline import run_iwave_analysis, IWAVE_COLUMNS, IWAVE_PARAMS_KEY
	from river.core.iwave_params import SceneParams


def _synthetic_project(tmp_path, n_frames=128, size=96, speed_px=1.0):
	"""Frames of a texture advecting +x at speed_px px/frame; homography = 0.05 m/px identity."""
	rng = np.random.default_rng(7)
	base = rng.normal(0.5, 0.2, (size, size * 3)).astype(np.float32)
	base = cv2.GaussianBlur(base, (7, 7), 0)
	frames_dir = tmp_path / "frames"
	frames_dir.mkdir()
	for i in range(n_frames):
		shift = int(round(i * speed_px))
		frame = np.roll(base, shift, axis=1)[:, :size]
		img = np.clip(frame * 255, 0, 255).astype(np.uint8)
		cv2.imwrite(str(frames_dir / f"frame_{i:04d}.jpg"), img)
	res = 0.05  # m/px
	H = [[res, 0.0, 0.0], [0.0, -res, 0.0], [0.0, 0.0, 1.0]]
	mid_e = size * res / 2
	xsections = {
		"CS1": {
			"alpha": 0.85,
			"id": [1],
			"east": [mid_e],
			"north": [-mid_e],
			"east_l": mid_e, "north_l": 0.0, "east_r": mid_e, "north_r": -size * res,
			"dir_east_l": mid_e, "dir_north_l": 0.0, "dir_east_r": mid_e, "dir_north_r": -size * res,
		}
	}
	return frames_dir, H, xsections


import cv2  # noqa: E402


@pytest.mark.skipif(not HAS_IWAVE, reason="iwave package not available")
def test_run_iwave_analysis_recovers_advection(tmp_path):
	frames_dir, H, xsections = _synthetic_project(tmp_path)
	fps = 20.0
	progress_calls = []
	result = run_iwave_analysis(
		xsections, H, str(frames_dir), step=1, fps=fps, id_section=0,
		progress=lambda current, total: progress_calls.append((current, total)),
	)
	for col in IWAVE_COLUMNS:
		assert col in result["CS1"]
		assert len(result["CS1"][col]) == 1
	v = result["CS1"]["iwave_velocity_profile"][0]
	assert v is not None
	# true speed: 1 px/frame * 0.05 m/px * 20 fps = 1.0 m/s along +east.
	# cross-section runs north->south, so streamwise (+90deg CCW of l->r) = +east... sign positive.
	assert abs(abs(v) - 1.0) < 0.5
	assert progress_calls == [(1, 1)]


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


@pytest.mark.skipif(not HAS_IWAVE, reason="iwave package not available")
def test_run_iwave_analysis_records_params(tmp_path):
	frames_dir, H, xsections = _synthetic_project(tmp_path)
	result = run_iwave_analysis(xsections, H, str(frames_dir), step=1, fps=20.0, id_section=0)
	record = result["CS1"][IWAVE_PARAMS_KEY]
	# No LSPIV/STIV in the synthetic project -> fallbacks
	assert record["u_est"] is None and record["smax"] == 5.0
	assert record["gravity_waves"] is True
	assert record["fps_eff"] == 20.0
	assert record["time_size"] == 100  # 6.4 s clip -> 5 s segments at 20 fps
	assert result["CS1"]["iwave_valid_profile"][0] in (True, False)


@pytest.mark.skipif(not HAS_IWAVE, reason="iwave package not available")
def test_run_iwave_analysis_reruns_station_pinned_at_auto_smax(tmp_path):
	frames_dir, H, xsections = _synthetic_project(tmp_path)
	scene = SceneParams(
		smax=0.6, smax_is_auto=True, window_m=2.4, window_px=48, resolution=0.05,
		time_size=64, time_overlap=32, fps_eff=20.0, penalty_weight=1.0,
	)
	result = run_iwave_analysis(
		xsections, H, str(frames_dir), step=1, fps=20.0, id_section=0, scene=scene,
	)
	assert result["CS1"][IWAVE_PARAMS_KEY]["smax_reruns"] == 1
	# true speed is 1.0 m/s, out of reach of the first 0.6 m/s bound
	assert abs(abs(result["CS1"]["iwave_velocity_profile"][0]) - 1.0) < 0.5


@pytest.mark.skipif(not HAS_IWAVE, reason="iwave package not available")
def test_run_iwave_analysis_keeps_user_smax(tmp_path):
	frames_dir, H, xsections = _synthetic_project(tmp_path)
	scene = SceneParams(
		smax=0.6, smax_is_auto=False, window_m=2.4, window_px=48, resolution=0.05,
		time_size=64, time_overlap=32, fps_eff=20.0, penalty_weight=1.0,
	)
	result = run_iwave_analysis(
		xsections, H, str(frames_dir), step=1, fps=20.0, id_section=0, scene=scene,
	)
	assert result["CS1"][IWAVE_PARAMS_KEY]["smax_reruns"] == 0
	# pass 2 may move 0.1 m/s past the bound, never to the true 1.0 m/s
	assert abs(result["CS1"]["iwave_velocity_profile"][0]) < 0.8


@pytest.mark.skipif(not HAS_IWAVE, reason="iwave package not available")
def test_run_iwave_analysis_skips_dry_station(tmp_path):
	frames_dir, H, xsections = _synthetic_project(tmp_path)
	xsections["CS1"]["distance"] = [0.0]
	xsections["CS1"]["depth"] = [-0.3]
	result = run_iwave_analysis(xsections, H, str(frames_dir), step=1, fps=20.0, id_section=0)
	for col in IWAVE_COLUMNS:
		if col == "iwave_skip_profile":
			continue
		assert result["CS1"][col] == [None]
	assert result["CS1"]["iwave_skip_profile"] == ["dry"]
	assert result["CS1"][IWAVE_PARAMS_KEY]["skipped_dry"] == 1


def test_is_window_masked_needs_the_whole_window_hidden():
	from river.core.iwave_pipeline import Extent, OrthoGrid, is_window_masked
	# Ortho grid == raw frame: 0.05 m/px, north up, origin at the top-left.
	H = [[0.05, 0.0, 0.0], [0.0, -0.05, 0.0], [0.0, 0.0, 1.0]]
	grid = OrthoGrid(extent=Extent(east_min=0.0, east_max=4.8, north_min=-4.8, north_max=0.0), resolution=0.05)
	mask = np.ones((96, 96), dtype=np.uint8)
	mask[:, :48] = 0
	# 20 px window centred at col 20 -> cols 10..29: all masked.
	assert is_window_masked(grid, (96, 96), 1.0, -2.4, 20, H, mask)
	# Centred at col 48 -> cols 38..57: half visible.
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


def test_run_iwave_analysis_rejects_stack_without_scene():
	with pytest.raises(ValueError):
		from river.core.iwave_pipeline import run_iwave_analysis as run
		run({"CS1": {}}, [[1, 0, 0], [0, 1, 0], [0, 0, 1]], "unused", step=1, fps=1.0, id_section=0,
			stack=np.zeros((2, 4, 4), np.uint8), grid=object())


def test_prepare_iwave_scene_switches_on_full_clip_length(tmp_path, monkeypatch):
	import river.core.iwave_pipeline as pipeline

	monkeypatch.setattr(pipeline, "MAX_FRAMES", 10)
	frames_dir = tmp_path / "frames"
	_write_fake_frames(frames_dir, n=25)
	xsections = {"CS1": {"east": [1.0, 4.0], "north": [2.0, 3.0], "alpha": 0.85}}
	# 25 frames at 1 fps = 25 s clip (long) although only 10 frames are warped
	_, scene = pipeline.prepare_iwave_scene(str(frames_dir), H_SIMPLE, xsections, step=1, fps=1.0)
	assert scene.time_size == 10


@pytest.mark.skipif(not HAS_IWAVE, reason="iwave package not available")
def test_run_iwave_analysis_is_reproducible(tmp_path):
	# The spectral fit uses differential evolution; without a fixed seed the same
	# project gave velocities up to 20 % apart between identical runs.
	frames_dir, H, xsections = _synthetic_project(tmp_path)
	results = []
	for _ in range(2):
		result = run_iwave_analysis(copy.deepcopy(xsections), H, str(frames_dir), step=1, fps=20.0, id_section=0)
		results.append((result["CS1"]["iwave_velocity_profile"], result["CS1"]["iwave_quality_profile"]))
	assert results[0] == results[1]


def _defaults_section(lspiv, depth):
	n = len(lspiv)
	return {
		"id": list(range(1, n + 1)),
		"east": [float(i) for i in range(n)],
		"north": [1.0] * n,
		"distance": [float(i) for i in range(n)],
		"check": [True] * n,
		"depth": depth,
		"streamwise_velocity_magnitude": lspiv,
		"alpha": 0.85,
	}


def test_iwave_defaults_without_estimate_use_fallbacks(tmp_path):
	from river.core.iwave_pipeline import get_iwave_defaults

	frames_dir = tmp_path / "frames"
	_write_fake_frames(frames_dir, n=60)
	xsections = {"CS1": {"east": [1.0, 4.0], "north": [2.0, 3.0], "alpha": 0.85}}
	defaults = get_iwave_defaults(str(frames_dir), H_SIMPLE, xsections, step=1, fps=10.0)
	assert set(defaults) == {"window_size", "smax", "flow_type", "estimated_from", "clip_s", "iwave_s", "short_clip"}
	assert defaults["smax"] == pytest.approx(5.0)
	assert defaults["flow_type"] == "waves"
	assert defaults["estimated_from"] == "none"
	assert defaults["window_size"] > 0
	assert defaults["clip_s"] == pytest.approx(6.0)
	assert defaults["short_clip"] is False


def test_iwave_defaults_use_lspiv_estimate_and_supercritical_flow(tmp_path):
	from river.core.iwave_pipeline import get_iwave_defaults

	frames_dir = tmp_path / "frames"
	_write_fake_frames(frames_dir, n=60)
	# 2 m/s over 0.1 m depth: Froude about 2, clearly supercritical
	xsections = {"CS1": _defaults_section([2.0] * 5, [0.1] * 5)}
	defaults = get_iwave_defaults(str(frames_dir), H_SIMPLE, xsections, step=1, fps=10.0)
	assert defaults["smax"] == pytest.approx(4.0)  # 2 x U_est
	assert defaults["estimated_from"] == "lspiv"
	assert defaults["flow_type"] == "no-waves"


def test_iwave_defaults_keep_waves_when_any_section_is_subcritical(tmp_path):
	from river.core.iwave_pipeline import get_iwave_defaults

	frames_dir = tmp_path / "frames"
	_write_fake_frames(frames_dir, n=60)
	xsections = {
		"CS1": _defaults_section([2.0] * 5, [0.1] * 5),
		"CS2": _defaults_section([2.0] * 5, [10.0] * 5),  # Froude about 0.2
	}
	defaults = get_iwave_defaults(str(frames_dir), H_SIMPLE, xsections, step=1, fps=10.0)
	assert defaults["flow_type"] == "waves"


def test_iwave_defaults_short_clip_boundary(tmp_path):
	from river.core.iwave_pipeline import get_iwave_defaults

	xsections = {"CS1": {"east": [1.0, 4.0], "north": [2.0, 3.0], "alpha": 0.85}}
	short_dir = tmp_path / "short"
	_write_fake_frames(short_dir, n=49)  # 4.9 s at 10 fps
	long_dir = tmp_path / "long"
	_write_fake_frames(long_dir, n=50)  # 5.0 s
	assert get_iwave_defaults(str(short_dir), H_SIMPLE, xsections, step=1, fps=10.0)["short_clip"] is True
	assert get_iwave_defaults(str(long_dir), H_SIMPLE, xsections, step=1, fps=10.0)["short_clip"] is False


def test_iwave_defaults_iwave_seconds_respect_frame_cap(tmp_path, monkeypatch):
	import river.core.iwave_pipeline as pipeline

	monkeypatch.setattr(pipeline, "MAX_FRAMES", 10)
	frames_dir = tmp_path / "frames"
	_write_fake_frames(frames_dir, n=25)
	xsections = {"CS1": {"east": [1.0, 4.0], "north": [2.0, 3.0], "alpha": 0.85}}
	defaults = pipeline.get_iwave_defaults(str(frames_dir), H_SIMPLE, xsections, step=2, fps=4.0)
	# 2 frames of step per 4 fps -> 0.5 s per extracted frame
	assert defaults["clip_s"] == pytest.approx(12.5)
	assert defaults["iwave_s"] == pytest.approx(5.0)
