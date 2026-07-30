import json
import numpy as np
import pytest
import cv2
from pathlib import Path
from unittest.mock import patch

from river.core.stabilize_frames import (
	_load_tracking_regions,
	_fit_similarity,
	stabilize_frames,
)


# ---------------------------------------------------------------------------
# _load_tracking_regions
# ---------------------------------------------------------------------------

def test_load_tracking_regions_returns_points_and_win_size(tmp_path):
	regions_file = tmp_path / "regions.json"
	regions_file.write_text(json.dumps({
		"regions": [
			{"center": [30.0, 30.0], "rect": [25, 25, 35, 35], "win_size": [11, 11]},
			{"center": [70.0, 30.0], "rect": [65, 25, 75, 35], "win_size": [15, 13]},
		]
	}))
	points, win_size = _load_tracking_regions(regions_file)
	assert points.shape == (2, 2)
	assert points.dtype == np.float32
	np.testing.assert_allclose(points[0], [30.0, 30.0])
	np.testing.assert_allclose(points[1], [70.0, 30.0])
	assert win_size == (15, 13)  # largest of the two


def test_load_tracking_regions_raises_if_fewer_than_two(tmp_path):
	regions_file = tmp_path / "regions.json"
	regions_file.write_text(json.dumps({
		"regions": [
			{"center": [30.0, 30.0], "rect": [25, 25, 35, 35], "win_size": [11, 11]},
		]
	}))
	with pytest.raises(ValueError, match="at least 2"):
		_load_tracking_regions(regions_file)


def test_load_tracking_regions_raises_if_file_missing(tmp_path):
	with pytest.raises(FileNotFoundError):
		_load_tracking_regions(tmp_path / "nonexistent.json")


# ---------------------------------------------------------------------------
# _fit_similarity
# ---------------------------------------------------------------------------

def test_fit_similarity_pure_translation():
	src = np.array([[10.0, 20.0], [50.0, 20.0], [10.0, 60.0], [50.0, 60.0]], dtype=np.float32)
	tx, ty = 5.0, -3.0
	dst = src + np.array([tx, ty], dtype=np.float32)
	M = _fit_similarity(src, dst)
	assert M is not None
	assert M.shape == (2, 3)
	# a≈1, b≈0, tx≈5, ty≈-3
	np.testing.assert_allclose(M[0, 0], 1.0, atol=1e-4)   # a
	np.testing.assert_allclose(M[0, 1], 0.0, atol=1e-4)   # -b
	np.testing.assert_allclose(M[0, 2], tx, atol=1e-3)    # tx
	np.testing.assert_allclose(M[1, 2], ty, atol=1e-3)    # ty


def test_fit_similarity_returns_none_for_fewer_than_two_points():
	src = np.array([[10.0, 20.0]], dtype=np.float32)
	dst = np.array([[15.0, 25.0]], dtype=np.float32)
	assert _fit_similarity(src, dst) is None


# ---------------------------------------------------------------------------
# stabilize_frames
# ---------------------------------------------------------------------------

def _make_test_frame(width: int, height: int, shift_x: int = 0, shift_y: int = 0) -> np.ndarray:
	"""Synthetic frame with four bright square corners for LK tracking."""
	img = np.zeros((height, width, 3), dtype=np.uint8)
	for (cx, cy) in [(25, 25), (75, 25), (25, 75), (75, 75)]:
		x, y = cx + shift_x, cy + shift_y
		if 5 < x < width - 5 and 5 < y < height - 5:
			img[y - 6:y + 6, x - 6:x + 6] = 180
			img[y - 3:y + 3, x - 3:x + 3] = 255
	return img


def _write_test_frames(frames_dir: Path, shifts: list) -> None:
	for i, (sx, sy) in enumerate(shifts):
		frame = _make_test_frame(120, 120, sx, sy)
		cv2.imwrite(str(frames_dir / f"{i:010d}.jpg"), frame)


def _write_regions_json(path: Path) -> None:
	path.write_text(json.dumps({
		"regions": [
			{"center": [25.0, 25.0], "rect": [19, 19, 31, 31], "win_size": [13, 13]},
			{"center": [75.0, 25.0], "rect": [69, 19, 81, 31], "win_size": [13, 13]},
			{"center": [25.0, 75.0], "rect": [19, 69, 31, 81], "win_size": [13, 13]},
			{"center": [75.0, 75.0], "rect": [69, 69, 81, 81], "win_size": [13, 13]},
		]
	}))


def test_stabilize_frames_creates_output_files(tmp_path):
	frames_dir = tmp_path / "frames"
	frames_dir.mkdir()
	stabilized_dir = tmp_path / "frames_stabilized"
	regions_path = tmp_path / "regions.json"

	_write_test_frames(frames_dir, [(0, 0), (2, 1), (-1, 2), (3, -1)])
	_write_regions_json(regions_path)

	sanity_path = stabilize_frames(frames_dir, regions_path, stabilized_dir)

	assert stabilized_dir.exists()
	output_jpgs = sorted(stabilized_dir.glob("*.jpg"))
	# 4 stabilized frames + sanity_check.jpg
	assert len(output_jpgs) == 5
	assert sanity_path == stabilized_dir / "sanity_check.jpg"
	assert sanity_path.exists()


def test_stabilize_frames_preserves_filenames(tmp_path):
	frames_dir = tmp_path / "frames"
	frames_dir.mkdir()
	stabilized_dir = tmp_path / "frames_stabilized"
	regions_path = tmp_path / "regions.json"

	_write_test_frames(frames_dir, [(0, 0), (2, 1)])
	_write_regions_json(regions_path)

	stabilize_frames(frames_dir, regions_path, stabilized_dir)

	assert (stabilized_dir / "0000000000.jpg").exists()
	assert (stabilized_dir / "0000000001.jpg").exists()


def test_stabilize_frames_raises_on_empty_frames_dir(tmp_path):
	frames_dir = tmp_path / "frames"
	frames_dir.mkdir()
	regions_path = tmp_path / "regions.json"
	_write_regions_json(regions_path)

	with pytest.raises(ValueError, match="No JPEG frames"):
		stabilize_frames(frames_dir, regions_path, tmp_path / "out")


def test_stabilize_frames_raises_on_missing_regions(tmp_path):
	frames_dir = tmp_path / "frames"
	frames_dir.mkdir()
	_write_test_frames(frames_dir, [(0, 0), (1, 1)])

	with pytest.raises(FileNotFoundError):
		stabilize_frames(frames_dir, tmp_path / "missing.json", tmp_path / "out")


def test_stabilize_frames_handles_lk_failure(tmp_path):
	frames_dir = tmp_path / "frames"
	frames_dir.mkdir()
	stabilized_dir = tmp_path / "frames_stabilized"
	regions_path = tmp_path / "regions.json"

	_write_test_frames(frames_dir, [(0, 0), (2, 1), (0, 0)])
	_write_regions_json(regions_path)

	original_lk = cv2.calcOpticalFlowPyrLK

	call_count = 0
	def mock_lk(prev, cur, pts, next_pts, **kwargs):
		nonlocal call_count
		call_count += 1
		# First call is frame 1 forward pass — simulate complete failure
		if call_count == 1:
			return None, None, None
		return original_lk(prev, cur, pts, next_pts, **kwargs)

	with patch("river.core.stabilize_frames.cv2.calcOpticalFlowPyrLK", side_effect=mock_lk):
		sanity_path = stabilize_frames(frames_dir, regions_path, stabilized_dir)

	assert sanity_path.exists()
	output_jpgs = [f for f in sorted(stabilized_dir.glob("*.jpg")) if f.name != "sanity_check.jpg"]
	assert len(output_jpgs) == 3
