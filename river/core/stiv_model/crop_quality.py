"""Model-independent crop quality scoring and robust profile aggregation.

Why: on wide STIs most sliding-window crops are useless for STIV (glare, rain,
featureless water) while the true motion may live in a single crop. The angle
model is often *confidently wrong* on junk crops, so ensemble/TTA confidence
cannot separate good crops from bad ones. This module scores each crop from the
image itself:

    q = texture_gate(rms) * coherence * agreement(cnn_angle, classical_angle)

and aggregates per-crop angles with a quality-weighted median in signed-slope
space, so one high-quality crop outvotes many confident junk crops.

Angle comparisons are done folded to [0, 90] so mirror/sign conventions cancel
(direction is the sign model's job). Ported verbatim from
sti_training/05_sti_profiler/crop_quality.py.
"""
import numpy as np
from scipy.ndimage import sobel

# Texture thresholds in [0,1] pixel units, calibrated in
# sti_training/06_fusion/sti_image_quality.py (<0.010 featureless, >0.05 strong texture).
RMS_FEATURELESS = 0.008
RMS_STRONG = 0.03

# Agreement tolerance between CNN angle and classical streak angle (degrees).
AGREE_SIGMA_DEG = 20.0


def fold_angle(theta_deg: float) -> float:
	"""Fold an orientation to [0, 90]: mirror-symmetric, mod 180."""
	t = float(theta_deg) % 180.0
	return min(t, 180.0 - t)


def trim_zero_bands(arr: np.ndarray) -> np.ndarray:
	"""Strip all-zero border rows/columns (black padding bands).

	Band edges otherwise read as strong fake streaks in the structure tensor.
	Returns the original array if it is entirely zero.
	"""
	nz_rows = np.flatnonzero(arr.any(axis=1))
	nz_cols = np.flatnonzero(arr.any(axis=0))
	if nz_rows.size == 0 or nz_cols.size == 0:
		return arr
	return arr[nz_rows[0]:nz_rows[-1] + 1, nz_cols[0]:nz_cols[-1] + 1]


def structure_tensor_features(crop01: np.ndarray) -> dict:
	"""Coherence and dominant streak orientation of a [0,1] crop.

	Returns {'coherence': [0,1], 'streak_theta_fold': [0,90] degrees, 'rms': float}.
	Coherence ~0 for isotropic noise, ->1 for clean oriented streaks.
	"""
	a = crop01.astype(np.float64)
	rms = float(a.std())
	gx = sobel(a, axis=1)
	gy = sobel(a, axis=0)
	jxx = float(np.mean(gx * gx))
	jyy = float(np.mean(gy * gy))
	jxy = float(np.mean(gx * gy))
	trace = jxx + jyy
	coherence = float(np.sqrt((jxx - jyy) ** 2 + 4.0 * jxy ** 2) / (trace + 1e-12))
	grad_orient = 0.5 * np.degrees(np.arctan2(2.0 * jxy, jxx - jyy))
	streak_theta_fold = fold_angle(grad_orient + 90.0)
	return {"coherence": coherence, "streak_theta_fold": streak_theta_fold, "rms": rms}


def texture_gate(rms: float, lo: float = RMS_FEATURELESS, hi: float = RMS_STRONG) -> float:
	"""Linear ramp 0->1 over rms in [lo, hi]."""
	return float(np.clip((rms - lo) / (hi - lo), 0.0, 1.0))


def crop_quality(crop_raw: np.ndarray, cnn_theta_deg: float) -> dict:
	"""Score one raw crop against the CNN's angle reading.

	Auto-detects whether crop_raw is 0-255 (e.g. a PNG-loaded crop) or already
	~[0,1] (river's native STI scale, see build_stis_for_cross_section) from
	its own max value, since RMS_FEATURELESS/STRONG are calibrated on [0,1].

	Returns {'q', 'coherence', 'streak_theta_fold', 'rms', 'gate', 'agreement'}.
	"""
	trimmed = trim_zero_bands(np.asarray(crop_raw, dtype=np.float64))
	divisor = 255.0 if trimmed.max() > 1.5 else 1.0
	a = trimmed / divisor
	feats = structure_tensor_features(a)
	gate = texture_gate(feats["rms"])
	delta = abs(fold_angle(cnn_theta_deg) - feats["streak_theta_fold"])
	agreement = float(np.exp(-((delta / AGREE_SIGMA_DEG) ** 2)))
	q = gate * feats["coherence"] * agreement
	return {
		"q": q,
		"coherence": feats["coherence"],
		"streak_theta_fold": feats["streak_theta_fold"],
		"rms": feats["rms"],
		"gate": gate,
		"agreement": agreement,
	}


def weighted_median(values, weights) -> float:
	"""Weighted median: smallest value whose cumulative weight >= half the total."""
	v = np.asarray(values, dtype=np.float64)
	w = np.asarray(weights, dtype=np.float64)
	total = w.sum()
	if total <= 0:
		raise ValueError("weighted_median: total weight must be positive")
	order = np.argsort(v)
	cum = np.cumsum(w[order])
	idx = int(np.searchsorted(cum, 0.5 * total))
	return float(v[order][min(idx, len(v) - 1)])


def robust_slope_aggregate(thetas_deg, weights) -> float:
	"""Quality-weighted median of signed slopes, mapped back to [0, 180) degrees.

	Slopes s = tan(theta) are signed (theta in (90,180) gives s < 0), matching
	theta_to_velocity. The median resists both junk-crop majorities and the
	tan blow-up near 90 degrees.
	"""
	slopes = np.tan(np.radians(np.asarray(thetas_deg, dtype=np.float64)))
	s = weighted_median(slopes, weights)
	theta = np.degrees(np.arctan(s))
	return float(theta if s >= 0 else 180.0 + theta)
