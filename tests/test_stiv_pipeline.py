"""Tests for river.core.stiv_pipeline."""
import os
import tempfile

import cv2
import numpy as np
import pytest

import river.core.stiv_pipeline as sp
from river.core.stiv_pipeline import (
	_downstream_from_banks_and_cs_tangent,
	_norm01,
	build_stis_for_cross_section,
	central_tangent,
	cross_z,
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
# Inference (requires torch)
# ---------------------------------------------------------------------------

torch = pytest.importorskip("torch")

from river.core.stiv_pipeline import load_models, profile_station  # noqa: E402


def test_load_models_returns_expected():
	angle_members, sign_model, sign_tsz = load_models()
	assert len(angle_members) == 3
	for model, norm_params in angle_members:
		assert model is not None
		assert "min_angle" in norm_params
		assert norm_params["target_size"] == 256
	assert sign_model is not None
	assert sign_tsz == 256


def test_run_ensemble_averages_members_and_reports_spread():
	from river.core.stiv_pipeline import _run_ensemble

	angle_members, _, _ = load_models()
	rng = np.random.default_rng(1)
	crop = rng.random((256, 256)).astype(np.float32)
	mean_t, std_t, conf = _run_ensemble(crop, angle_members)
	assert isinstance(mean_t, float)
	assert std_t >= 0.0
	assert 0.0 <= conf <= 1.0


def test_profile_station_returns_tuple():
	angle_members, sign_model, sign_tsz = load_models()
	rng = np.random.default_rng(0)
	sti = rng.random((50, 50)).astype(np.float32) * 0.5
	v, sigma, sign, angle = profile_station(
		sti, angle_members, sign_model, sign_tsz,
		seconds_per_pix=0.1, meters_per_pix=0.02,
	)
	assert sign in ("positive", "negative", "zero")
	if v is not None:
		assert isinstance(angle, float)
		assert isinstance(v, float)
		assert sigma is not None and sigma >= sp.SIGMA_FLOOR


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

		progress_calls = []
		result = run_stiv_analysis(
			xsections=xsections,
			transformation_matrix=T,
			frames_dir=frames_dir,
			step=3,
			fps=30.0,
			id_section=0,
			height_roi_m=0.4,
			progress=lambda current, total: progress_calls.append((current, total)),
		)

	cs_result = result["CS_default_1"]
	for key in ("stiv_velocity_profile", "stiv_sigma_profile", "stiv_angle_profile", "stiv_sign_profile"):
		assert key in cs_result
	for key in ("fused_velocity_profile", "fused_sigma_profile", "fusion_confidence_profile", "Q_fused"):
		assert key not in cs_result
	assert progress_calls == [(1, 3), (2, 3), (3, 3)]


def test_profile_station_robust_median_beats_confident_noise_majority(monkeypatch):
	"""17-crop synthetic STI: 16 crops are low-contrast noise, 1 crop (index 8,
	columns [120:180)) is a clean 35-degree stripe. The angle "model" is faked
	to confidently report 80 degrees everywhere except the true 35 degrees on
	the stripe crop — reproducing the exact bug this change fixes: a
	confidence-weighted mean would be dragged to ~80 degrees by the noise
	majority, but the quality-weighted median (crop_quality scores the noise
	crops near zero on real image content) should land near the stripe's
	true angle."""
	H, W = 60, 300
	positions, _, N = sp._sliding_window_positions(H, W)
	n_crops = len(positions)
	true_angle = 35.0
	good_idx = 8  # start=120 -> stripe planted at columns [120:180)

	rng = np.random.default_rng(7)
	sti = (rng.random((H, W)).astype(np.float32) * 0.15 + 0.4)
	yy, xx = np.mgrid[0:H, 0:H].astype(np.float64)
	t = np.radians(true_angle)
	px, py = -np.sin(t), np.cos(t)
	stripe = 0.5 + 0.35 * np.sin(2 * np.pi * 0.08 * (xx * px + yy * py))
	sti[:, 120:180] = stripe.astype(np.float32)

	fake_thetas = [80.0] * n_crops
	fake_thetas[good_idx] = true_angle
	call_count = {"i": 0}

	def fake_run_ensemble(crop_f32, angle_members):
		i = call_count["i"]
		call_count["i"] += 1
		return fake_thetas[i], 0.5, 0.9

	monkeypatch.setattr(sp, "_run_ensemble", fake_run_ensemble)
	monkeypatch.setattr(sp, "_run_sign_classify", lambda crop_f32, sign_model, target_size: "positive")

	v, sigma, sign, angle = sp.profile_station(
		sti, angle_members=[], sign_model=None, sign_target_size=256,
		seconds_per_pix=0.1, meters_per_pix=0.02,
	)

	assert angle is not None
	assert abs(angle - true_angle) < 5.0
	assert sigma >= sp.SIGMA_FLOOR


def test_profile_station_sigma_reflects_within_crop_model_uncertainty(monkeypatch):
	"""Same one-good-crop-in-a-noise-majority setup as the robust-median test,
	but here the ensemble members disagree noticeably on the dominant crop.

	Between-crop MAD is structurally ~0 in exactly this (flagship) scenario:
	the dominant crop carries most of the quality weight, so it *is* the
	weighted median and its own deviation from the aggregate is zero. If sigma
	were built from that MAD alone it would silently collapse to SIGMA_FLOOR.
	Sigma must instead pick up the within-crop (inter-seed) model uncertainty,
	so a high-disagreement dominant crop reports a meaningfully larger sigma
	than a low-disagreement one."""
	H, W = 60, 300
	positions, _, N = sp._sliding_window_positions(H, W)
	n_crops = len(positions)
	true_angle = 35.0
	good_idx = 8  # start=120 -> stripe planted at columns [120:180)

	rng = np.random.default_rng(7)
	sti = (rng.random((H, W)).astype(np.float32) * 0.15 + 0.4)
	yy, xx = np.mgrid[0:H, 0:H].astype(np.float64)
	t = np.radians(true_angle)
	px, py = -np.sin(t), np.cos(t)
	stripe = 0.5 + 0.35 * np.sin(2 * np.pi * 0.08 * (xx * px + yy * py))
	sti[:, 120:180] = stripe.astype(np.float32)

	fake_thetas = [80.0] * n_crops
	fake_thetas[good_idx] = true_angle

	def run(good_std: float):
		call_count = {"i": 0}

		def fake_run_ensemble(crop_f32, angle_members):
			i = call_count["i"]
			call_count["i"] += 1
			std_t = good_std if i == good_idx else 0.5
			return fake_thetas[i], std_t, 0.9

		monkeypatch.setattr(sp, "_run_ensemble", fake_run_ensemble)
		monkeypatch.setattr(sp, "_run_sign_classify", lambda crop_f32, sign_model, target_size: "positive")
		return sp.profile_station(
			sti, angle_members=[], sign_model=None, sign_target_size=256,
			seconds_per_pix=0.1, meters_per_pix=0.02,
		)

	# Low inter-seed disagreement on the dominant crop: sigma is legitimately
	# tiny and floors out.
	_, sigma_tight, _, angle_tight = run(0.5)
	# High inter-seed disagreement on that same dominant crop.
	_, sigma_loose, _, angle_loose = run(25.0)

	# The aggregate angle is unaffected -- only the uncertainty changes.
	assert abs(angle_tight - angle_loose) < 1e-9
	assert sigma_tight == pytest.approx(sp.SIGMA_FLOOR)
	assert sigma_loose > sp.SIGMA_FLOOR * 2


def test_profile_station_all_junk_falls_back_without_crashing(monkeypatch):
	"""Pure-noise STI with MIN_TOTAL_QUALITY raised above its achievable total
	weight -> profile_station must take the confidence-weighted-mean fallback
	branch (not the robust median) and still return a valid tuple.

	The fake ensemble reports 80 degrees for every crop, so both branches agree
	on the angle (80.0) and it is *sigma* that discriminates them: the fallback
	sees zero angular dispersion and floors, whereas the robust-median path
	picks up the crops' within-crop model uncertainty and returns ~0.058."""
	H, W = 60, 300
	rng = np.random.default_rng(11)
	sti = rng.random((H, W)).astype(np.float32) * 0.15 + 0.4

	# The synthetic noise STI's real total quality weight is ~0.1, comfortably
	# above the production 0.05 threshold, so the fallback would never trigger
	# on its own. Raise the threshold to force the branch deterministically.
	monkeypatch.setattr(sp, "MIN_TOTAL_QUALITY", 0.5)
	monkeypatch.setattr(sp, "_run_ensemble", lambda crop_f32, angle_members: (80.0, 0.5, 0.9))
	monkeypatch.setattr(sp, "_run_sign_classify", lambda crop_f32, sign_model, target_size: "positive")

	v, sigma, sign, angle = sp.profile_station(
		sti, angle_members=[], sign_model=None, sign_target_size=256,
		seconds_per_pix=0.1, meters_per_pix=0.02,
	)

	assert v is not None
	assert sign == "positive"
	# The confidence-weighted mean of identical 80.0 readings.
	assert angle == pytest.approx(80.0)
	# Branch-specific: every fake angle is identical, so the fallback's
	# dispersion estimate is genuinely 0 and floors. Taking the robust-median
	# branch instead would return ~0.058 here (its within-crop term is nonzero).
	assert sigma == pytest.approx(sp.SIGMA_FLOOR)


def test_profile_station_scores_quality_on_native_scale_not_stretched(monkeypatch):
	"""crop_quality's RMS_FEATURELESS/RMS_STRONG thresholds are calibrated on
	native [0,1] pixel contrast, so profile_station must score crops sliced from
	the un-stretched STI -- not from the globally contrast-stretched array it
	feeds the neural nets.

	On this deliberately low-contrast STI (native span 0.02, i.e. featureless
	water) the global stretch would inflate every crop's RMS to ~0.29 and open
	the texture gate fully, letting pure junk score real quality weight. Scored
	natively the same crops sit below RMS_FEATURELESS and score ~0, which is the
	anti-junk defense this feature exists to provide."""
	rng = np.random.default_rng(3)
	sti = (0.45 + 0.02 * (rng.random((60, 300)).astype(np.float32) - 0.5)).astype(np.float32)
	native_max = float(sti.max())
	assert native_max < 0.5  # sanity: the STI really is low-contrast

	import river.core.stiv_model.crop_quality as cq_mod

	seen = []
	real_crop_quality = cq_mod.crop_quality

	def spy_crop_quality(crop_raw, cnn_theta_deg):
		out = real_crop_quality(crop_raw, cnn_theta_deg)
		seen.append((float(np.asarray(crop_raw).max()), out["gate"], out["q"]))
		return out

	monkeypatch.setattr(cq_mod, "crop_quality", spy_crop_quality)
	monkeypatch.setattr(sp, "_run_ensemble", lambda crop_f32, angle_members: (80.0, 0.5, 0.9))
	monkeypatch.setattr(sp, "_run_sign_classify", lambda crop_f32, sign_model, target_size: "positive")

	sp.profile_station(
		sti, angle_members=[], sign_model=None, sign_target_size=256,
		seconds_per_pix=0.1, meters_per_pix=0.02,
	)

	assert seen, "crop_quality was never called"
	# The globally-stretched array is normalised to max 1.0 by construction;
	# native crops top out at the STI's own max.
	assert max(m for m, _, _ in seen) <= native_max + 1e-6
	# ...and the featureless junk is therefore correctly gated out.
	assert all(gate < 0.05 for _, gate, _ in seen)
	assert sum(q for _, _, q in seen) < sp.MIN_TOTAL_QUALITY


def test_profile_station_all_zero_signs_returns_zero_tuple(monkeypatch):
	"""If the sign classifier calls every crop 'zero', profile_station takes its
	defensive early return: no flow, floored sigma, zero angle."""
	rng = np.random.default_rng(5)
	sti = rng.random((40, 120)).astype(np.float32) * 0.3 + 0.2

	monkeypatch.setattr(sp, "_run_sign_classify", lambda crop_f32, sign_model, target_size: "zero")

	result = sp.profile_station(
		sti, angle_members=[], sign_model=None, sign_target_size=256,
		seconds_per_pix=0.1, meters_per_pix=0.02,
	)

	assert result == (0.0, sp.SIGMA_FLOOR, "zero", 0.0)
