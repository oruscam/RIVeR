"""Tests for river.core.iwave_pipeline geometry helpers (no iwave package required)."""
import cv2
import numpy as np
import pytest

from river.core.iwave_pipeline import (
	Extent,
	OrthoGrid,
	build_ortho_stack,
	build_warp_matrix,
	compute_extent,
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


iwave_pkg = pytest.importorskip("iwave")

from river.core.iwave_pipeline import run_iwave_analysis, IWAVE_COLUMNS  # noqa: E402


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
