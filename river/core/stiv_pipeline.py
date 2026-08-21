"""STIV pipeline: STI building and angle+sign inference."""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path
from typing import Callable, Optional

import cv2
import numpy as np

import river.core.coordinate_transform as ct

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

RW_STEP_M = 0.02
STRIDE_FRAC = 0.25
SIGMA_FLOOR = 0.05
MIN_TOTAL_QUALITY = 0.05
STIV_COLUMNS = [
	"stiv_velocity_profile",
	"stiv_sigma_profile",
	"stiv_angle_profile",
	"stiv_sign_profile",
]

_MODEL_DIR = Path(__file__).parent / "stiv_model"

_angle_members: Optional[list] = None
_sign_model = None
_sign_target_size: int = 256

# ---------------------------------------------------------------------------
# Geometry helpers (ported from sti_training/01_creating_sti/manage_sti.py)
# ---------------------------------------------------------------------------

def unit(v: np.ndarray, eps: float = 1e-12) -> np.ndarray:
	n = np.linalg.norm(v)
	return v / n if n >= eps else np.zeros_like(v, dtype=float)


def rot90_ccw(v: np.ndarray) -> np.ndarray:
	return np.array([-v[1], v[0]], dtype=float)


def cross_z(a: np.ndarray, b: np.ndarray) -> float:
	return float(a[0] * b[1] - a[1] * b[0])


def central_tangent(east: list, north: list, i: int) -> np.ndarray:
	if i == 0:
		d = np.array([east[1] - east[0], north[1] - north[0]], dtype=float)
	elif i == len(east) - 1:
		d = np.array([east[-1] - east[-2], north[-1] - north[-2]], dtype=float)
	else:
		d = np.array([east[i + 1] - east[i - 1], north[i + 1] - north[i - 1]], dtype=float) * 0.5
	return unit(d)


def _downstream_from_banks_and_cs_tangent(
	tan_cs: np.ndarray,
	left_xy: np.ndarray,
	right_xy: np.ndarray,
) -> np.ndarray:
	if np.allclose(tan_cs, 0.0):
		return np.zeros(2, dtype=float)
	across = right_xy - left_xy
	d1 = unit(rot90_ccw(tan_cs))
	d2 = -d1
	return d1 if cross_z(d1, across) < 0 else d2


# ---------------------------------------------------------------------------
# STI building
# ---------------------------------------------------------------------------

def _natural_sort_key(s):
	nums = re.findall(r"\d+", Path(s).name)
	return tuple(int(n) for n in nums) if nums else (str(s),)


def _collect_frames(frames_dir: str) -> list[str]:
	p = Path(frames_dir)
	frames = []
	for ext in ("*.jpg", "*.JPG", "*.jpeg", "*.JPEG"):
		frames.extend(str(f) for f in p.glob(ext))
	frames.sort(key=_natural_sort_key)
	return frames


def build_stis_for_cross_section(
	cs: dict,
	transformation_matrix: list,
	frames_dir: str,
	height_roi_m: float = 6.0,
	rw_step_m: float = RW_STEP_M,
) -> dict[int, np.ndarray]:
	"""Build STIs for all stations in a cross-section.

	Returns {station_id: sti_array} where sti_array has shape (n_rows, n_frames).
	NaN values mark out-of-bounds pixel positions.
	"""
	H = np.asarray(transformation_matrix, dtype=float)
	if H.shape != (3, 3):
		raise ValueError(f"transformation_matrix must be 3×3, got {H.shape}")

	frames = _collect_frames(frames_dir)
	if not frames:
		raise FileNotFoundError(f"No frames (.jpg) found in {frames_dir}")

	first = cv2.imread(frames[0], cv2.IMREAD_GRAYSCALE)
	if first is None:
		raise RuntimeError(f"Cannot read first frame: {frames[0]}")
	img_h, img_w = first.shape

	ids = list(cs["id"])
	east_all = [float(e) for e in cs["east"]]
	north_all = [float(n) for n in cs["north"]]

	east_l_raw = cs["east_l"]
	north_l_raw = cs["north_l"]
	east_r_raw = cs["east_r"]
	north_r_raw = cs["north_r"]
	east_l = float(east_l_raw) if not isinstance(east_l_raw, (list, tuple)) else float(east_l_raw[0])
	north_l = float(north_l_raw) if not isinstance(north_l_raw, (list, tuple)) else float(north_l_raw[0])
	east_r = float(east_r_raw) if not isinstance(east_r_raw, (list, tuple)) else float(east_r_raw[-1])
	north_r = float(north_r_raw) if not isinstance(north_r_raw, (list, tuple)) else float(north_r_raw[-1])
	left_xy = np.array([east_l, north_l], dtype=float)
	right_xy = np.array([east_r, north_r], dtype=float)

	n_rows = int(np.ceil(height_roi_m / rw_step_m)) + 1
	half = height_roi_m / 2.0
	n_frames = len(frames)
	bank_tan = unit(right_xy - left_xy)

	station_data: list[tuple[int, np.ndarray, np.ndarray]] = []
	for idx, (sid, E, N) in enumerate(zip(ids, east_all, north_all)):
		tan_cs = central_tangent(east_all, north_all, idx)
		if np.allclose(tan_cs, 0.0) or (
			not np.allclose(bank_tan, 0.0)
			and abs(float(np.dot(tan_cs, bank_tan))) < 0.95
		):
			tan_cs = bank_tan

		downstream = _downstream_from_banks_and_cs_tangent(tan_cs, left_xy, right_xy)
		if np.allclose(downstream, 0.0):
			downstream = unit(rot90_ccw(tan_cs))
		upstream = -downstream

		offsets = np.linspace(half, -half, n_rows, dtype=float)
		base = np.array([E, N], dtype=float)
		rw_coords = base[None, :] + offsets[:, None] * upstream[None, :]

		pix_coords = np.array(
			[ct.transform_real_world_to_pixel(float(rw[0]), float(rw[1]), H)[:2] for rw in rw_coords],
			dtype=float,
		)
		xs, ys = pix_coords[:, 0], pix_coords[:, 1]
		inbounds = (xs >= 0) & (xs <= img_w - 1) & (ys >= 0) & (ys <= img_h - 1)
		station_data.append((sid, pix_coords, inbounds))

	stis = {sid: np.full((n_rows, n_frames), np.nan, dtype=np.float32) for sid, _, _ in station_data}
	map_x = {sid: pix[:, 0].astype(np.float32).reshape(-1, 1) for sid, pix, _ in station_data}
	map_y = {sid: pix[:, 1].astype(np.float32).reshape(-1, 1) for sid, pix, _ in station_data}
	masks = {sid: mask for sid, _, mask in station_data}

	for fi, fpath in enumerate(frames):
		img = cv2.imread(fpath, cv2.IMREAD_GRAYSCALE)
		if img is None:
			continue
		gray = img.astype(np.float32) / 255.0
		for sid, _, _ in station_data:
			col = cv2.remap(
				gray, map_x[sid], map_y[sid],
				interpolation=cv2.INTER_LINEAR,
				borderMode=cv2.BORDER_CONSTANT,
				borderValue=0,
			).reshape(-1).astype(np.float32)
			col[~masks[sid]] = np.nan
			stis[sid][:, fi] = col

	return stis


# ---------------------------------------------------------------------------
# Preprocessing
# ---------------------------------------------------------------------------

def _norm01(a: np.ndarray) -> np.ndarray:
	a = a.astype(np.float64)
	amin, amax = a.min(), a.max()
	return ((a - amin) / (amax - amin + 1e-12)).astype(np.float32)


def preprocess_crop(crop: np.ndarray) -> np.ndarray:
	"""Zero-mean then norm01. Matches profile_sti.py preprocess_crop exactly."""
	return _norm01(crop - crop.mean())


def theta_to_velocity(theta_deg: float, seconds_per_pix: float, meters_per_pix: float) -> float:
	"""Convert STI angle (degrees) to streamwise velocity (m/s).

	Theta in (0°, 90°) → positive velocity.
	Theta in (90°, 180°) → negative velocity.
	"""
	slope = np.tan(np.deg2rad(theta_deg))
	v = slope * (meters_per_pix / seconds_per_pix)
	return float(-abs(v) if theta_deg > 90.0 else abs(v))


# ---------------------------------------------------------------------------
# Model loading (lazy, module-level cache)
# ---------------------------------------------------------------------------

def load_models():
	"""Lazy-load and cache the angle ensemble + sign model.

	Returns (angle_members, sign_model, sign_tsz) where angle_members is a
	list of (model, norm_params) pairs, one per ensemble member in
	river/core/stiv_model/angle/seed*/ — norm_params carries its own
	target_size/min_angle/max_angle.
	"""
	global _angle_members, _sign_model, _sign_target_size

	if _angle_members is not None:
		return _angle_members, _sign_model, _sign_target_size

	import torch
	from river.core.stiv_model.models import get_model

	angle_root = _MODEL_DIR / "angle"
	members = []
	for seed_dir in sorted(p for p in angle_root.iterdir() if p.is_dir()):
		with open(seed_dir / "runtime_config.json") as f:
			cfg = json.load(f)
		model_name = cfg.get("model_name", "Wide5BlockAA")
		target_size = int(cfg.get("target_size", 256))

		with open(seed_dir / "norm_params.json") as f:
			norm_params = json.load(f)
		norm_params["target_size"] = target_size

		model = get_model(model_name, input_height=target_size, input_width=target_size)
		sd = torch.load(str(seed_dir / "best_model.pth"), map_location="cpu", weights_only=True)
		model.load_state_dict(sd)
		model.eval()
		members.append((model, norm_params))

	sign_dir = _MODEL_DIR / "sign"
	with open(sign_dir / "sign_model_meta.json") as f:
		sign_meta = json.load(f)
	sign_model_name = sign_meta.get("model_name", "SignClassifier5Block")
	_sign_target_size = int(sign_meta.get("target_size", 256))

	sign_model = get_model(sign_model_name, input_height=_sign_target_size, input_width=_sign_target_size)
	sign_sd = torch.load(str(sign_dir / "sign_model.pth"), map_location="cpu", weights_only=True)
	sign_model.load_state_dict(sign_sd)
	sign_model.eval()

	_angle_members = members
	_sign_model = sign_model
	return _angle_members, _sign_model, _sign_target_size


# ---------------------------------------------------------------------------
# Sliding-window inference
# ---------------------------------------------------------------------------

def _sliding_window_positions(H: int, W: int, stride_frac: float = STRIDE_FRAC):
	N = min(H, W)
	along_time = W >= H
	longer = W if along_time else H
	stride = max(1, int(N * stride_frac))
	starts = list(range(0, longer - N + 1, stride))
	if not starts:
		starts = [0]
	positions = [(s + N // 2, s) for s in starts]
	return positions, along_time, N


def _run_ensemble(crop_f32: np.ndarray, angle_members: list) -> tuple[float, float, float]:
	"""One clean forward pass per ensemble member (no noise-TTA).

	Returns (mean_angle_deg, std_angle_deg, confidence), where std/confidence
	come from inter-member (seed) disagreement rather than per-model noise
	response — sti_training's frozen 256px benchmark showed noise-TTA hurts
	at this resolution, so the ensemble's own seed spread replaces it.
	"""
	import torch
	thetas = []
	for model, norm_params in angle_members:
		sz = int(norm_params.get("target_size", 256))
		interp = cv2.INTER_AREA if crop_f32.shape[0] > sz else cv2.INTER_CUBIC
		arr = np.clip(cv2.resize(crop_f32.astype(np.float32), (sz, sz), interpolation=interp), 0.0, 1.0)
		tensor = torch.from_numpy(arr[np.newaxis, np.newaxis]).float()
		with torch.no_grad():
			raw = float(model(tensor).reshape(-1)[0])
		mn, mx = norm_params["min_angle"], norm_params["max_angle"]
		thetas.append((raw + 0.5) * (mx - mn) + mn)
	mean_t = float(np.mean(thetas))
	std_t = float(np.std(thetas))
	conf = float(max(0.0, 1.0 - std_t / 8.0))
	return mean_t, std_t, conf


def _run_sign_classify(crop_f32: np.ndarray, sign_model, target_size: int) -> str:
	"""Classify crop as 'positive', 'negative', or 'zero'."""
	import torch
	_LABELS = {0: "negative", 1: "zero", 2: "positive"}
	interp = cv2.INTER_AREA if crop_f32.shape[0] > target_size else cv2.INTER_CUBIC
	arr = cv2.resize(crop_f32.astype(np.float32), (target_size, target_size), interpolation=interp)
	tensor = torch.from_numpy(arr[np.newaxis, np.newaxis]).float()
	with torch.no_grad():
		logits = sign_model(tensor).squeeze(0)
	probs = torch.softmax(logits, dim=0)
	cls = int(probs.argmax().item())
	return _LABELS[cls]


def profile_station(
	sti: np.ndarray,
	angle_members: list,
	sign_model,
	sign_target_size: int,
	seconds_per_pix: float,
	meters_per_pix: float,
) -> tuple[Optional[float], Optional[float], str, Optional[float]]:
	"""Run full sliding-window inference on one station's STI.

	Returns (velocity_m_s, sigma_v, sign_label, angle_deg).
	velocity, sigma, and angle are None if the STI is degenerate (all-zero after NaN fill).
	"""
	from river.core.stiv_model.crop_quality import crop_quality, robust_slope_aggregate, weighted_median

	sti_clean = np.nan_to_num(sti.astype(np.float32), nan=0.0)
	if sti_clean.max() == sti_clean.min():
		return None, None, "zero", None

	H, W = sti_clean.shape
	arr_f32 = preprocess_crop(sti_clean)
	positions, along_time, N = _sliding_window_positions(H, W)

	angles, confs, quals, signs, stds = [], [], [], [], []
	for _, start in positions:
		crop_raw = arr_f32[:, start : start + N] if along_time else arr_f32[start : start + N, :]
		# crop_quality's RMS_FEATURELESS/RMS_STRONG thresholds are calibrated on
		# native [0,1] pixel contrast, so it must score the un-stretched STI.
		# arr_f32 is globally contrast-stretched across the whole STI, which
		# inflates a crop's local RMS by ~1/(max-min) of the scene and would let
		# glare/featureless crops pass the texture gate on low-contrast STIs.
		# The model-input path below still uses the arr_f32-derived crop.
		crop_native = sti_clean[:, start : start + N] if along_time else sti_clean[start : start + N, :]
		crop_f32 = preprocess_crop(crop_raw)
		sign_label = _run_sign_classify(crop_f32, sign_model, sign_target_size)
		signs.append(sign_label)

		if sign_label == "zero":
			angles.append(0.0)
			confs.append(0.5)
			quals.append(0.0)
			stds.append(0.0)
		else:
			crop_for_angle = crop_f32[:, ::-1].copy() if sign_label == "negative" else crop_f32
			mean_t, std_t, conf = _run_ensemble(crop_for_angle, angle_members)
			if sign_label == "negative":
				mean_t = 180.0 - mean_t
			angles.append(mean_t)
			confs.append(conf)
			stds.append(std_t)
			quals.append(crop_quality(crop_native, mean_t)["q"])

	nz_mask = np.array([s != "zero" for s in signs])
	if not nz_mask.any():
		return theta_to_velocity(0.0, seconds_per_pix, meters_per_pix), SIGMA_FLOOR, "zero", 0.0

	angles_a = np.array(angles)[nz_mask]
	confs_a = np.array(confs)[nz_mask]
	quals_a = np.array(quals)[nz_mask]
	stds_a = np.array(stds)[nz_mask]
	weights = quals_a * confs_a

	if weights.sum() < MIN_TOTAL_QUALITY:
		# Every crop in this station looks like junk to crop_quality — trust
		# the plain confidence-weighted mean rather than a near-zero-weight median.
		w_legacy = confs_a / (confs_a.sum() + 1e-12)
		wmean = float(np.dot(w_legacy, angles_a))
		# Honest dispersion of the crops around that mean, pushed through the
		# same slope-space Jacobian as the robust branch.
		angle_std_deg = float(np.sqrt(np.dot(w_legacy, (angles_a - wmean) ** 2)))
		sigma_slope = (1.0 + np.tan(np.radians(wmean)) ** 2) * np.radians(angle_std_deg)
		sigma_v = abs(float(sigma_slope) * (meters_per_pix / seconds_per_pix))
	else:
		wmean = robust_slope_aggregate(angles_a, weights)
		slopes = np.tan(np.radians(angles_a))
		s_agg = np.tan(np.radians(wmean))

		# within-crop (model/ensemble) uncertainty per crop: convert per-crop
		# std_t (degrees) to slope-space via d(tan theta)/d(theta) = 1 + tan^2(theta),
		# evaluated at each crop's own angle, then take the quality-weighted
		# "typical" value across the crops that matter. Without this term sigma
		# collapses to the floor in the single-dominant-crop case that motivates
		# this whole aggregation: that crop *is* the weighted median, so its own
		# deviation from the aggregate — and hence the MAD — is zero.
		slope_stds = (1.0 + slopes ** 2) * np.radians(stds_a)
		sigma_slope_within = weighted_median(slope_stds, weights)

		mad = weighted_median(np.abs(slopes - s_agg), weights)
		sigma_slope_between = 1.4826 * mad

		# Independent uncertainty sources -> combine in quadrature.
		sigma_slope = float(np.sqrt(sigma_slope_between ** 2 + sigma_slope_within ** 2))
		sigma_v = abs(sigma_slope * (meters_per_pix / seconds_per_pix))

	velocity = theta_to_velocity(wmean, seconds_per_pix, meters_per_pix)
	sigma_v = max(sigma_v, SIGMA_FLOOR)

	nz_signs = [s for s in signs if s != "zero"]
	sign_majority = Counter(nz_signs).most_common(1)[0][0] if nz_signs else "zero"

	return velocity, sigma_v, sign_majority, wmean


# ---------------------------------------------------------------------------
# Results plot
# ---------------------------------------------------------------------------

def plot_stiv_results(cs: dict, section_name: str, output_path: str) -> None:
	"""Generate a three-panel summary figure and save it to output_path."""
	import matplotlib.pyplot as plt
	import matplotlib.patches as mpatches
	from matplotlib.lines import Line2D

	dist = np.array(cs["distance"], dtype=float)
	n = len(dist)

	def _nanlist(key, default=np.nan):
		vals = cs.get(key, [default] * n)
		return np.array([v if v is not None else np.nan for v in vals], dtype=float)

	lspiv_v   = _nanlist("streamwise_velocity_magnitude")
	plus_std  = _nanlist("plus_std")
	minus_std = _nanlist("minus_std")
	pct5      = _nanlist("5th_percentile")
	pct95     = _nanlist("95th_percentile")
	seeded    = _nanlist("seeded_vel_profile")
	depth     = _nanlist("depth", 0.0)
	q_arr     = _nanlist("Q")

	stiv_v      = _nanlist("stiv_velocity_profile")
	stiv_sig    = _nanlist("stiv_sigma_profile", 0.0)
	signs       = cs.get("stiv_sign_profile", ["zero"] * n)

	total_Q          = cs.get("total_Q", float("nan"))
	total_q_std      = cs.get("total_q_std", float("nan"))
	mean_V    = cs.get("mean_V", float("nan"))
	total_W   = cs.get("total_W", float("nan"))
	max_depth = cs.get("max_depth", float("nan"))
	alpha     = cs.get("alpha", float("nan"))

	SIGN_MARKER = {"positive": "^", "negative": "v", "zero": "o"}

	fig = plt.figure(figsize=(14, 10))
	gs = fig.add_gridspec(3, 1, height_ratios=[4, 1.5, 1.8], hspace=0.08)
	ax_v  = fig.add_subplot(gs[0])
	ax_q  = fig.add_subplot(gs[1], sharex=ax_v)
	ax_cs = fig.add_subplot(gs[2], sharex=ax_v)

	# ── Velocity panel ──────────────────────────────────────────────────────
	# LSPIV std band + percentile band
	ax_v.fill_between(dist, minus_std, plus_std, alpha=0.18, color="steelblue", label="LSPIV ±std")
	ax_v.fill_between(dist, pct5, pct95, alpha=0.10, color="steelblue",
	                  linestyle="--", label="LSPIV 5–95th pct")
	ax_v.plot(dist, lspiv_v, "o-", color="steelblue", lw=2, label="LSPIV", zorder=4)

	# Seeded profile (if present and different from LSPIV)
	if not np.all(np.isnan(seeded)):
		ax_v.plot(dist, seeded, "D--", color="steelblue", lw=1.2, alpha=0.6,
		          markersize=4, label="LSPIV seeded")

	# STIV with error bars; marker shape encodes sign
	for sign_label, marker in SIGN_MARKER.items():
		mask = np.array([s == sign_label for s in signs])
		if mask.any():
			ax_v.errorbar(
				dist[mask], stiv_v[mask], yerr=stiv_sig[mask],
				fmt=marker, color="tomato", lw=1.2, capsize=3, markersize=6,
				label=f"STIV ({sign_label})" if mask.any() else None, zorder=5,
			)

	ax_v.set_ylabel("Velocity (m/s)", fontsize=11)
	ax_v.grid(True, alpha=0.3)
	ax_v.set_title(
		f"{section_name}\n"
		f"Q LSPIV = {total_Q:.2f} ± {total_q_std:.2f} m³/s   |   "
		f"W = {total_W:.1f} m   max depth = {max_depth:.2f} m   α = {alpha}",
		fontsize=9,
	)

	# Legend
	legend_lines = [
		Line2D([0], [0], color="steelblue", lw=2, marker="o", label="LSPIV"),
		mpatches.Patch(color="steelblue", alpha=0.25, label="LSPIV ±std / 5–95th"),
		Line2D([0], [0], color="tomato", lw=1.2, marker="s", label="STIV ±σ"),
	]
	ax_v.legend(handles=legend_lines, fontsize=8, ncol=3, loc="upper left")

	# ── Unit discharge panel — LSPIV bars ──────────────────────
	bar_w = np.diff(dist).mean() * 0.4
	ax_q.bar(dist, q_arr, width=bar_w, color="steelblue", alpha=0.7, label="q LSPIV")
	q_minus = _nanlist("Q_minus_std")
	q_plus  = _nanlist("Q_plus_std")
	ax_q.fill_between(dist, q_minus, q_plus, alpha=0.15, color="steelblue")
	ax_q.set_ylabel("q (m²/s)", fontsize=10)
	ax_q.grid(True, alpha=0.3, axis="y")
	ax_q.legend(fontsize=8)

	# ── Cross-section panel ──────────────────────────────────────────────────
	bed = -depth
	ax_cs.fill_between(dist, bed, 0, alpha=0.35, color="#8B6914")
	ax_cs.plot(dist, bed, color="#5a3e10", lw=1.5)
	ax_cs.axhline(0, color="steelblue", lw=1.2, label="Water surface")
	ax_cs.set_ylabel("Depth (m)", fontsize=10)
	ax_cs.set_xlabel("Distance along cross-section (m)", fontsize=11)
	ax_cs.grid(True, alpha=0.3)

	# Station tick marks on bed
	for d, dp in zip(dist, bed):
		ax_cs.plot(d, dp, "|", color="gray", markersize=6, markeredgewidth=1)

	plt.setp(ax_v.get_xticklabels(), visible=False)
	plt.setp(ax_q.get_xticklabels(), visible=False)

	fig.savefig(output_path, dpi=150, bbox_inches="tight")
	plt.close(fig)


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def run_stiv_analysis(
	xsections: dict,
	transformation_matrix: list,
	frames_dir: str,
	step: int,
	fps: float,
	id_section: int,
	height_roi_m: float = 6.0,
	stis_dir: Optional[str] = None,
	plot_path: Optional[str] = None,
	models: Optional[tuple] = None,
	progress: Optional[Callable[[int, int], None]] = None,
) -> dict:
	"""Run STIV analysis for the current cross-section and return updated xsections.

	Adds 4 new per-station lists: stiv_velocity_profile (signed streamwise, m/s), stiv_sigma_profile, stiv_angle_profile (degrees), stiv_sign_profile.
	If stis_dir is provided, each STI is saved as sti_<station_id>.npy in that directory.
	"""
	section_keys = [k for k in xsections if k != "summary"]
	current_key = section_keys[id_section]
	cs = xsections[current_key]

	stis = build_stis_for_cross_section(cs, transformation_matrix, frames_dir, height_roi_m)

	if stis_dir is not None:
		out = Path(stis_dir)
		out.mkdir(parents=True, exist_ok=True)
		for sid, sti in stis.items():
			arr = np.nan_to_num(sti.astype(np.float32), nan=0.0)
			amin, amax = arr.min(), arr.max()
			img = ((arr - amin) / (amax - amin + 1e-12) * 255).astype(np.uint8)
			cv2.imwrite(str(out / f"sti_{sid}.png"), img)

	angle_members, sign_model, sign_tsz = models if models is not None else load_models()

	seconds_per_pix = step / float(fps)
	meters_per_pix = RW_STEP_M

	ids = list(cs["id"])
	n = len(ids)
	stiv_v_arr = np.zeros(n, dtype=float)
	stiv_sigma_arr = np.full(n, SIGMA_FLOOR, dtype=float)
	stiv_valid_arr = np.zeros(n, dtype=bool)
	stiv_sign_list = ["zero"] * n
	stiv_angle_list: list[Optional[float]] = [None] * n

	for idx, sid in enumerate(ids):
		sti = stis.get(sid)
		if sti is None:
			if progress is not None:
				progress(idx + 1, n)
			continue
		v, sigma, sign, angle = profile_station(
			sti, angle_members, sign_model, sign_tsz,
			seconds_per_pix, meters_per_pix,
		)
		if v is not None:
			stiv_v_arr[idx] = v
			stiv_sigma_arr[idx] = sigma if sigma is not None else SIGMA_FLOOR
			stiv_valid_arr[idx] = True
			stiv_angle_list[idx] = float(angle)
		stiv_sign_list[idx] = sign
		if progress is not None:
			progress(idx + 1, n)

	xsections[current_key]["stiv_velocity_profile"] = [
		float(stiv_v_arr[i]) if stiv_valid_arr[i] else None for i in range(n)
	]
	xsections[current_key]["stiv_sigma_profile"] = [
		float(stiv_sigma_arr[i]) if stiv_valid_arr[i] else None for i in range(n)
	]
	xsections[current_key]["stiv_sign_profile"] = stiv_sign_list
	xsections[current_key]["stiv_angle_profile"] = stiv_angle_list

	if plot_path is not None:
		plot_stiv_results(xsections[current_key], current_key, plot_path)

	return xsections
