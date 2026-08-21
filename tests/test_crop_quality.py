"""Tests for river.core.stiv_model.crop_quality — ported from
sti_training/05_sti_profiler/tests/test_crop_quality.py (same module, verbatim)."""
import numpy as np
import pytest

from river.core.stiv_model.crop_quality import (
	crop_quality,
	fold_angle,
	robust_slope_aggregate,
	structure_tensor_features,
	texture_gate,
	trim_zero_bands,
	weighted_median,
)


def make_stripes(theta_deg: float, size: int = 128, freq: float = 0.08,
                 amp: float = 100.0, offset: float = 120.0) -> np.ndarray:
	y, x = np.mgrid[0:size, 0:size].astype(np.float64)
	t = np.radians(theta_deg)
	px, py = -np.sin(t), np.cos(t)
	phase = 2 * np.pi * freq * (x * px + y * py)
	return offset + amp * np.sin(phase)


def make_noise(size: int = 128, sigma: float = 30.0, seed: int = 0) -> np.ndarray:
	rng = np.random.default_rng(seed)
	return np.clip(128 + rng.normal(0, sigma, (size, size)), 0, 255)


def test_fold_angle_identity_below_90():
	assert fold_angle(30.0) == pytest.approx(30.0)


def test_fold_angle_mirrors_above_90():
	assert fold_angle(150.0) == pytest.approx(30.0)


def test_trim_zero_bands_removes_border_bands():
	arr = np.ones((100, 80)) * 50.0
	arr[:10, :] = 0.0
	arr[-5:, :] = 0.0
	trimmed = trim_zero_bands(arr)
	assert trimmed.shape == (85, 80)
	assert (trimmed > 0).all()


def test_stripes_have_high_coherence_and_correct_angle():
	for theta in (30.0, 75.0):
		feats = structure_tensor_features(make_stripes(theta) / 255.0)
		assert feats["coherence"] > 0.8, f"theta={theta}"
		assert feats["streak_theta_fold"] == pytest.approx(theta, abs=3.0)


def test_noise_has_low_coherence():
	feats = structure_tensor_features(make_noise() / 255.0)
	assert feats["coherence"] < 0.2


def test_texture_gate_zero_below_featureless_threshold():
	assert texture_gate(0.005) == 0.0


def test_texture_gate_one_above_strong_threshold():
	assert texture_gate(0.05) == 1.0


def test_good_crop_matching_cnn_angle_scores_high():
	crop = make_stripes(40.0)
	res = crop_quality(crop, cnn_theta_deg=40.0)
	assert res["q"] > 0.6


def test_good_crop_disagreeing_cnn_angle_scores_low():
	crop = make_stripes(40.0)
	res = crop_quality(crop, cnn_theta_deg=85.0)
	assert res["q"] < 0.1


def test_noise_crop_scores_low_regardless_of_cnn_angle():
	res = crop_quality(make_noise(), cnn_theta_deg=45.0)
	assert res["q"] < 0.15


def test_good_crop_already_in_01_scale_scores_high():
	"""river's STIs are natively /255.0-normalized (~[0,1]) — see
	stiv_pipeline.py::build_stis_for_cross_section. crop_quality must
	auto-detect this scale rather than assume 0-255 pixels."""
	crop01 = make_stripes(40.0, amp=0.35, offset=0.45)
	assert crop01.max() < 1.5
	res = crop_quality(crop01, cnn_theta_deg=40.0)
	assert res["q"] > 0.5


def test_weighted_median_equal_weights_is_median():
	assert weighted_median([1.0, 2.0, 100.0], [1, 1, 1]) == pytest.approx(2.0)


def test_weighted_median_dominant_weight_wins():
	assert weighted_median([1.0, 2.0, 100.0], [0.01, 0.01, 5.0]) == pytest.approx(100.0)


def test_weighted_median_zero_total_weight_raises():
	with pytest.raises(ValueError):
		weighted_median([1.0, 2.0], [0.0, 0.0])


def test_aggregate_recovers_single_good_crop_among_junk():
	thetas = [80.0] * 9 + [40.0]
	weights = [0.01] * 9 + [0.9]
	assert robust_slope_aggregate(thetas, weights) == pytest.approx(40.0, abs=1.0)


def test_aggregate_beats_weighted_mean_in_junk_scenario():
	thetas = np.array([80.0] * 9 + [40.0])
	q = np.array([0.02] * 9 + [0.85])
	conf = np.ones(10) * 0.9
	legacy = float(np.dot(conf / conf.sum(), thetas))
	robust = robust_slope_aggregate(list(thetas), list(q * conf))
	assert abs(robust - 40.0) < abs(legacy - 40.0)
	assert abs(robust - 40.0) < 2.0
