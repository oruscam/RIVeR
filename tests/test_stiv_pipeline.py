"""Tests for river.core.stiv_pipeline."""
import os
import tempfile

import cv2
import numpy as np
import pytest

from river.core.stiv_pipeline import (
	_downstream_from_banks_and_cs_tangent,
	_norm01,
	build_stis_for_cross_section,
	central_tangent,
	cross_z,
	fuse_profiles,
	preprocess_crop,
	rot90_ccw,
	run_stiv_analysis,
	theta_to_velocity,
	unit,
)


# ---------------------------------------------------------------------------
# Geometry
# ---------------------------------------------------------------------------

def test_unit_normalizes():
	v = np.array([3.0, 4.0])
	assert abs(np.linalg.norm(unit(v)) - 1.0) < 1e-12


def test_unit_zero_returns_zero():
	assert np.allclose(unit(np.array([0.0, 0.0])), 0.0)


def test_rot90_ccw():
	assert np.allclose(rot90_ccw(np.array([1.0, 0.0])), [0.0, 1.0])


def test_central_tangent_interior():
	east = [0.0, 1.0, 3.0, 6.0]
	north = [0.0, 0.0, 0.0, 0.0]
	t = central_tangent(east, north, 1)
	assert abs(np.linalg.norm(t) - 1.0) < 1e-12
	assert t[0] > 0


def test_central_tangent_endpoints():
	east = [0.0, 1.0, 2.0]
	north = [0.0, 0.0, 0.0]
	assert central_tangent(east, north, 0)[0] > 0
	assert central_tangent(east, north, 2)[0] > 0


def test_downstream_direction():
	tan_cs = np.array([1.0, 0.0])
	left_xy = np.array([0.0, 5.0])
	right_xy = np.array([10.0, 5.0])
	d = _downstream_from_banks_and_cs_tangent(tan_cs, left_xy, right_xy)
	assert abs(np.linalg.norm(d) - 1.0) < 1e-12


# ---------------------------------------------------------------------------
# STI building helpers
# ---------------------------------------------------------------------------

def _make_synthetic_session(tmpdir: str, n_frames: int = 5):
	"""Create tiny 64×64 grayscale frames and a minimal xsections-style cs dict."""
	frames_dir = os.path.join(tmpdir, "frames")
	os.makedirs(frames_dir)
	frame = np.zeros((64, 64), dtype=np.uint8)
	for i in range(n_frames):
		cv2.imwrite(os.path.join(frames_dir, f"frame_{i:04d}.jpg"), frame)

	cs = {
		"id": [1, 2, 3],
		"east": [5.0, 10.0, 15.0],
		"north": [5.0, 5.0, 5.0],
		"east_l": 0.0,
		"north_l": 5.0,
		"east_r": 20.0,
		"north_r": 5.0,
		"x": [16.0, 32.0, 48.0],
		"y": [32.0, 32.0, 32.0],
	}
	# Identity-like homography: pixel ≈ real-world (scale 1, offset 0)
	T = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]]
	return cs, T, frames_dir


def test_build_stis_shape():
	with tempfile.TemporaryDirectory() as tmp:
		cs, T, frames_dir = _make_synthetic_session(tmp, n_frames=5)
		stis = build_stis_for_cross_section(cs, T, frames_dir, height_roi_m=0.4, rw_step_m=0.02)
	assert set(stis.keys()) == {1, 2, 3}
	n_rows = int(np.ceil(0.4 / 0.02)) + 1  # 21
	for sid, sti in stis.items():
		assert sti.shape == (n_rows, 5), f"Station {sid}: expected ({n_rows}, 5), got {sti.shape}"


def test_build_stis_missing_frames_raises():
	with tempfile.TemporaryDirectory() as tmp:
		empty_dir = os.path.join(tmp, "empty")
		os.makedirs(empty_dir)
		cs, T, _ = _make_synthetic_session(tmp, n_frames=0)
		with pytest.raises(FileNotFoundError):
			build_stis_for_cross_section(cs, T, empty_dir)


# ---------------------------------------------------------------------------
# Preprocessing and velocity conversion
# ---------------------------------------------------------------------------

def test_norm01_range():
	a = np.array([[0.0, 0.5, 1.0]], dtype=np.float32)
	out = _norm01(a)
	assert float(out.min()) >= 0.0
	assert float(out.max()) <= 1.0 + 1e-6


def test_preprocess_crop_output():
	rng = np.random.default_rng(42)
	crop = rng.random((64, 64)).astype(np.float32)
	result = preprocess_crop(crop)
	assert result.dtype == np.float32
	assert result.min() >= 0.0
	assert result.max() <= 1.0 + 1e-6


def test_theta_to_velocity_positive():
	# tan(45°)=1 → v = 1 * mpp/spp = 0.02/0.1 = 0.2 m/s
	v = theta_to_velocity(45.0, seconds_per_pix=0.1, meters_per_pix=0.02)
	assert v > 0
	assert abs(v - 0.2) < 0.01


def test_theta_to_velocity_negative():
	v = theta_to_velocity(135.0, seconds_per_pix=0.1, meters_per_pix=0.02)
	assert v < 0


# ---------------------------------------------------------------------------
# Fusion
# ---------------------------------------------------------------------------

def test_fuse_profiles_both_valid():
	stiv_v = np.array([1.0, 2.0])
	stiv_sigma = np.array([0.1, 0.1])
	stiv_valid = np.array([True, True])
	lspiv_v = np.array([1.2, 1.8])
	lspiv_spread = np.array([0.2, 0.2])
	fused_v, fused_sigma, confidence = fuse_profiles(stiv_v, stiv_sigma, stiv_valid, lspiv_v, lspiv_spread)
	# Fused must lie between the two inputs
	for i in range(2):
		lo = min(float(stiv_v[i]), float(lspiv_v[i]))
		hi = max(float(stiv_v[i]), float(lspiv_v[i]))
		assert lo - 1e-9 <= fused_v[i] <= hi + 1e-9
	assert all(c in ("HIGH", "MEDIUM") for c in confidence)
	assert len(fused_sigma) == 2


def test_fuse_profiles_stiv_invalid():
	fused_v, fused_sigma, confidence = fuse_profiles(
		stiv_v=np.array([1.0]),
		stiv_sigma=np.array([0.1]),
		stiv_valid=np.array([False]),
		lspiv_v=np.array([1.5]),
		lspiv_spread=np.array([0.2]),
	)
	assert abs(fused_v[0] - 1.5) < 1e-9
	assert confidence[0] == "MEDIUM"


def test_fuse_profiles_nan_lspiv_no_nan_output():
	"""When LSPIV is NaN (null station) but STIV is valid, fused must not be NaN."""
	fused_v, fused_sigma, confidence = fuse_profiles(
		stiv_v=np.array([0.57]),
		stiv_sigma=np.array([0.1]),
		stiv_valid=np.array([True]),
		lspiv_v=np.array([float("nan")]),
		lspiv_spread=np.array([float("nan")]),
	)
	assert not np.isnan(fused_v[0]), "fused_v must not be NaN when STIV is valid"
	assert abs(fused_v[0] - 0.57) < 1e-6
	assert confidence[0] == "MEDIUM"


def test_fuse_profiles_lspiv_spread_too_high():
	fused_v, fused_sigma, confidence = fuse_profiles(
		stiv_v=np.array([1.0]),
		stiv_sigma=np.array([0.1]),
		stiv_valid=np.array([True]),
		lspiv_v=np.array([1.5]),
		lspiv_spread=np.array([2.0]),  # > LSPIV_SPREAD_THRESHOLD=1.0
	)
	assert abs(fused_v[0] - 1.0) < 1e-9
	assert confidence[0] == "MEDIUM"


# ---------------------------------------------------------------------------
# Inference (requires torch)
# ---------------------------------------------------------------------------

torch = pytest.importorskip("torch")

from river.core.stiv_pipeline import load_models, profile_station  # noqa: E402


def test_load_models_returns_expected():
	angle_model, norm_params, sign_model, sign_tsz = load_models()
	assert angle_model is not None
	assert "min_angle" in norm_params
	assert sign_model is not None
	assert sign_tsz == 256


def test_profile_station_returns_tuple():
	angle_model, norm_params, sign_model, sign_tsz = load_models()
	rng = np.random.default_rng(0)
	# 301 rows × 50 frames synthetic STI with slight diagonal signal
	sti = rng.random((50, 50)).astype(np.float32) * 0.5
	v, sigma, sign = profile_station(
		sti, angle_model, norm_params, sign_model, sign_tsz,
		seconds_per_pix=0.1, meters_per_pix=0.02,
	)
	assert sign in ("positive", "negative", "zero")
	if v is not None:
		assert isinstance(v, float)
		assert sigma is not None and sigma >= 0.0


# ---------------------------------------------------------------------------
# End-to-end (requires torch + full session)
# ---------------------------------------------------------------------------

def test_run_stiv_analysis_adds_keys():
	with tempfile.TemporaryDirectory() as tmp:
		cs, T, frames_dir = _make_synthetic_session(tmp, n_frames=30)

		xsections = {
			"CS_default_1": dict(
				cs,
				num_stations=3,
				streamwise_velocity_magnitude=[0.5, 0.8, 0.6],
				minus_std=[0.4, 0.7, 0.5],
				plus_std=[0.6, 0.9, 0.7],
			),
			"summary": {},
		}

		result = run_stiv_analysis(
			xsections=xsections,
			transformation_matrix=T,
			frames_dir=frames_dir,
			step=3,
			fps=30.0,
			id_section=0,
			height_roi_m=0.4,
		)

	cs_result = result["CS_default_1"]
	for key in (
		"stiv_velocity_profile",
		"stiv_sigma_profile",
		"stiv_sign_profile",
		"fused_velocity_profile",
		"fusion_confidence_profile",
	):
		assert key in cs_result, f"Missing key: {key}"
		assert len(cs_result[key]) == 3, f"{key}: expected len 3, got {len(cs_result[key])}"
