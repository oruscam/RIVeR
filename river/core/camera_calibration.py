"""
Camera calibration (offline snapshots) + visual reporting, viewer, and quality verdict.

What this adds:
- OFFLINE from a folder of photos taken by the target camera.
- --report <dir>: per-frame overlays, coverage heatmap (OpenCV INFERNO), JSON summary.
- --save-undistorted <dir>: write undistorted images for all used frames.
- --view: interactive scrub viewer (original ↔ overlay ↔ undistorted).
- --write-pattern: generate a ChArUco PNG you can show on any screen.
- Quality verdict ('good'/'fair'/'bad') with reasons + suggested actions.
- Prints the list of image paths that were actually used in the final calibration.

Quick start:
	# 1) Generate board (20x15 by default)
	python camera_calibration.py --write-pattern charuco_20x15.png --board 20x15

	# 2) Take 20–40 varied photos with your target camera (hit edges/corners!)
	# 3) Calibrate and get a visual report
	python camera_calibration.py \
		--dir /path/to/snaps \
		--board 20x15 \
		--save calibration/profile.json \
		--report out/report \
		--save-undistorted out/undistorted \
		--view

Deps: pip install opencv-contrib-python numpy
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import time
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import cv2 as cv
import numpy as np
from tqdm import tqdm


# ---------------- helpers ----------------

def _aruco_dict():
	return cv.aruco.getPredefinedDictionary(cv.aruco.DICT_5X5_1000)


def _aruco_params():
	# Version-agnostic creation
	try:
		p = cv.aruco.DetectorParameters()
	except Exception:
		p = cv.aruco.DetectorParameters_create()

	# More permissive near edges / small markers
	p.adaptiveThreshWinSizeMin = 3
	p.adaptiveThreshWinSizeMax = 23
	p.adaptiveThreshWinSizeStep = 5
	p.adaptiveThreshConstant   = 7

	p.minMarkerPerimeterRate   = 0.01
	p.maxMarkerPerimeterRate   = 4.0
	p.minCornerDistanceRate	= 0.02
	p.minDistanceToBorder	  = 1
	p.polygonalApproxAccuracyRate = 0.03

	# Subpixel corner refinement
	try:
		p.cornerRefinementMethod = cv.aruco.CORNER_REFINE_SUBPIX
		p.cornerRefinementWinSize = 5
		p.cornerRefinementMinAccuracy = 0.01
	except Exception:
		pass

	try:
		p.perspectiveRemoveIgnoredMarginPerCell = 0.05
	except Exception:
		pass
	return p


def _ensure_dir(path: str):
	d = os.path.dirname(path)
	if d and not os.path.exists(d):
		os.makedirs(d, exist_ok=True)


def _var_laplacian(gray: np.ndarray) -> float:
	return float(cv.Laplacian(gray, cv.CV_64F).var())


@dataclass
class CalibrationResult:
	K: np.ndarray
	dist: np.ndarray
	model: str
	rms: float
	image_size: Tuple[int, int]
	frames_used: int
	timestamp: float

	def to_jsonable(self) -> Dict:
		return {
			"model": self.model,
			"K": self.K.tolist(),
			"dist": self.dist.reshape(-1).tolist(),
			"rms": float(self.rms),
			"image_size": [int(self.image_size[0]), int(self.image_size[1])],
			"frames_used": int(self.frames_used),
			"timestamp": self.timestamp,
		}


@dataclass
class FrameRecord:
	path: str
	img: np.ndarray  # scaled image actually used
	corners: np.ndarray  # charuco corners (Nx1x2)
	ids: np.ndarray  # (N,1)


# ---------------- calibrator ----------------

class RiverCalibrator:
	def __init__(self,
				 board_cols_rows=(20, 15),
				 square_m=0.04,
				 marker_m=0.02,
				 min_ids=12,
				 blur_threshold=60.0,
				 max_side=2500,
				 max_frames=72,		  # cap to avoid over-weighting similar centers
				 edge_priority_frac=0.9  # fraction of selected frames biased to edges
				 ):
		self.board = cv.aruco.CharucoBoard(board_cols_rows, square_m, marker_m, _aruco_dict())
		self.min_ids = min_ids
		self.blur_threshold = blur_threshold
		self.max_side = max_side
		self.max_frames = max_frames
		self.edge_priority_frac = edge_priority_frac

	@staticmethod
	def _edge_score(charuco_corners: np.ndarray, img_wh: Tuple[int,int]) -> float:
		"""Score how close corners get to the image borders (0..1). Higher = more edge coverage."""
		W, H = img_wh
		if charuco_corners is None or len(charuco_corners) == 0:
			return 0.0
		pts = charuco_corners.reshape(-1, 2)
		cx, cy = W/2.0, H/2.0
		r = np.linalg.norm(pts - np.array([[cx, cy]]), axis=1) / (0.5*np.hypot(W, H))
		return float(0.6*np.quantile(r, 0.9) + 0.4*np.max(r))

	def run_from_images(self, image_paths: List[str], rotate: int = 0
						) -> Tuple[CalibrationResult, List[FrameRecord], Tuple[np.ndarray, np.ndarray, List[np.ndarray], List[np.ndarray]]]:
		if not image_paths:
			raise RuntimeError("No images found.")

		detector = cv.aruco.ArucoDetector(_aruco_dict(), _aruco_params()) if hasattr(cv.aruco, 'ArucoDetector') else None
		charuco_detector = cv.aruco.CharucoDetector(self.board) if hasattr(cv.aruco, 'CharucoDetector') else None

		records: List[FrameRecord] = []
		image_size = None

		for p in tqdm(sorted(image_paths), desc="Detecting calibration corners"):
			img = cv.imread(p, cv.IMREAD_COLOR)
			if img is None:
				continue

			if rotate % 360 != 0:
				rot_map = {90: cv.ROTATE_90_CLOCKWISE, 180: cv.ROTATE_180, 270: cv.ROTATE_90_COUNTERCLOCKWISE}
				img = cv.rotate(img, rot_map[rotate % 360])

			h, w = img.shape[:2]
			if max(h, w) > self.max_side:
				scale = self.max_side / float(max(h, w))
				img = cv.resize(img, (int(w * scale), int(h * scale)), interpolation=cv.INTER_AREA)
				h, w = img.shape[:2]

			if image_size is None:
				image_size = (w, h)

			gray = cv.cvtColor(img, cv.COLOR_BGR2GRAY)
			if _var_laplacian(gray) < self.blur_threshold:
				continue

			# ---- detect ChArUco corners ----
			if charuco_detector is not None:
				# OpenCV 4.7+ new API: detectBoard handles marker detection + interpolation in one call
				ch_corners, ch_ids, _mkr_corners, _mkr_ids = charuco_detector.detectBoard(gray)
				ok = ch_corners is not None and ch_ids is not None and len(ch_ids) > 0
			else:
				# Legacy API (OpenCV < 4.7)
				if detector is not None:
					corners, ids, rejected = detector.detectMarkers(gray)
				else:
					corners, ids, rejected = cv.aruco.detectMarkers(gray, _aruco_dict(), parameters=_aruco_params())

				if corners is None or len(corners) == 0 or ids is None or len(ids) == 0:
					continue

				# Try to recover borderline markers near edges
				try:
					cv.aruco.refineDetectedMarkers(
						image=gray,
						board=self.board,
						detectedCorners=corners,
						detectedIds=ids,
						rejectedCorners=rejected
					)
				except Exception:
					pass

				if corners is None or len(corners) == 0 or ids is None or len(ids) == 0:
					continue

				# Normalize types
				if isinstance(corners, tuple):
					corners = list(corners)
				corners = [np.asarray(c, dtype=np.float32) for c in corners]
				ids = np.asarray(ids, dtype=np.int32)

				# Subpixel refine marker corners
				crit = (cv.TERM_CRITERIA_EPS + cv.TERM_CRITERIA_MAX_ITER, 30, 0.01)
				for c in corners:
					cv.cornerSubPix(gray, c, (5, 5), (-1, -1), crit)

				try:
					ok, ch_corners, ch_ids = cv.aruco.interpolateCornersCharuco(
						markerCorners=corners, markerIds=ids, image=gray, board=self.board
					)
				except cv.error:
					ok, ch_corners, ch_ids = False, None, None

			if not ok or ch_ids is None:
				continue

			# --- adaptive acceptance for edge-heavy frames ---
			edge = self._edge_score(ch_corners, image_size)
			min_ids_req = self.min_ids if edge < 0.8 else 8   # accept fewer IDs when corners reach edges
			if len(ch_ids) < min_ids_req:
				continue

			records.append(FrameRecord(path=p, img=img, corners=ch_corners.copy(), ids=ch_ids.copy()))

		if len(records) < 6:
			raise RuntimeError(f"Not enough valid views ({len(records)}). Capture more sharp, angled shots.")

		# ----------- prioritize edge-heavy frames before solving -----------
		W, H = image_size
		scored = [(self._edge_score(r.corners, (W, H)), i) for i, r in enumerate(records)]
		scored.sort(reverse=True)  # high score first

		n_total = min(self.max_frames, len(records))
		n_edge  = int(max(0, min(1.0, self.edge_priority_frac)) * n_total)

		edge_idx = [i for _, i in scored[:n_edge]]
		rest_idx = [i for _, i in scored[n_edge:]]
		rest_idx.sort(key=lambda i: int(records[i].corners.shape[0]), reverse=True)
		selected_idx = (edge_idx + rest_idx)[:n_total]

		sel_records = [records[i] for i in sorted(selected_idx)]

		# Solve using selected records
		all_corners = [r.corners for r in sel_records]
		all_ids	 = [r.ids	 for r in sel_records]
		K, dist, rms, rvecs, tvecs, keep_idx = self._solve_charuco(image_size, all_corners, all_ids, robust=True)

		used_records = [sel_records[i] for i in keep_idx]
		result = CalibrationResult(K=K, dist=dist, model="pinhole_rational", rms=rms,
								   image_size=image_size, frames_used=len(used_records), timestamp=time.time())
		return result, used_records, (K, dist, rvecs, tvecs)

	# --- core solve with robust per-view filtering ---
	def _solve_charuco(self, image_size, all_corners, all_ids, robust=True):
		flags = (cv.CALIB_RATIONAL_MODEL | cv.CALIB_ZERO_TANGENT_DIST | cv.CALIB_USE_INTRINSIC_GUESS)
		fx, fy = 0.8 * image_size[0], 0.8 * image_size[1]
		cx, cy = image_size[0] / 2.0, image_size[1] / 2.0
		K0 = np.array([[fx, 0, cx], [0, fy, cy], [0, 0, 1]], np.float64)
		dist0 = np.zeros((8, 1), np.float64)

		def solve(corners, ids):
			if hasattr(cv.aruco, 'calibrateCameraCharucoExtended'):
				return cv.aruco.calibrateCameraCharucoExtended(
					charucoCorners=corners, charucoIds=ids, board=self.board,
					imageSize=image_size, cameraMatrix=K0, distCoeffs=dist0, flags=flags)
			# OpenCV 4.7+: use matchImagePoints + calibrateCameraExtended
			obj_pts_list, img_pts_list = [], []
			for c, i in zip(corners, ids):
				obj_pts, img_pts = self.board.matchImagePoints(c, i)
				obj_pts_list.append(obj_pts)
				img_pts_list.append(img_pts)
			return cv.calibrateCameraExtended(
				obj_pts_list, img_pts_list, image_size, K0.copy(), dist0.copy(), flags=flags)

		rms, K, dist, rvecs, tvecs, _, _, per_view = solve(all_corners, all_ids)
		keep_idx = list(range(len(all_corners)))
		if robust and per_view is not None and len(per_view) > 0:
			errs = per_view.reshape(-1)
			med, std = float(np.median(errs)), float(np.std(errs))
			keep_idx = [i for i, e in enumerate(errs) if e <= min(med + 1.5 * max(std, 1e-6), 1.6)]
			if 0 < len(keep_idx) < len(all_corners) and len(keep_idx) >= 6:
				filt_c = [all_corners[i] for i in keep_idx]
				filt_i = [all_ids[i] for i in keep_idx]
				rms, K, dist, rvecs, tvecs, _, _, _ = solve(filt_c, filt_i)
		return K, dist, float(rms), rvecs, tvecs, keep_idx


# ---------------- reporting, quality & viewer ----------------

def build_undistort_maps(K: np.ndarray, dist: np.ndarray,
						 image_size: Tuple[int, int],
						 alpha: float = 1.0):
	"""
	image_size: (width, height)
	alpha:
		1.0 = full FOV
		0.0 = cropped (no black borders)
	"""
	newK, roi = cv.getOptimalNewCameraMatrix(
		K, dist, image_size, alpha, image_size, centerPrincipalPoint=True
	)

	map1, map2 = cv.initUndistortRectifyMap(
		K, dist, None, newK, image_size, cv.CV_16SC2
	)

	return map1, map2, roi


def apply_undistort(frame: np.ndarray,
					map1: np.ndarray,
					map2: np.ndarray,
					roi: Optional[Tuple[int, int, int, int]] = None) -> np.ndarray:
	und = cv.remap(frame, map1, map2, interpolation=cv.INTER_LINEAR)

	if roi is not None:
		x, y, w, h = roi
		und = und[y:y+h, x:x+w]

	return und



def write_pattern_png(path: str, cols_rows=(20, 15), min_corner_px=12, max_px=6000, marker_ratio=0.7, margin_px=20):
	dict_ = cv.aruco.getPredefinedDictionary(cv.aruco.DICT_5X5_1000)
	square_len = 1.0
	marker_len = square_len * marker_ratio
	board = cv.aruco.CharucoBoard(cols_rows, square_len, marker_len, dict_)
	approx_square_px = max(min_corner_px * 3, 120)  # ~120px/square → print-ready at A3/A4
	img_w = int(min(max_px, approx_square_px * (cols_rows[0] + 0)))
	img_h = int(min(max_px, approx_square_px * (cols_rows[1] + 0)))
	img = board.generateImage((img_w, img_h), marginSize=margin_px)
	_ensure_dir(path)
	cv.imwrite(path, img)


def _project_charuco_points(board, ids, rvec, tvec, K, dist):
	corners_3d = (board.chessboardCorners if hasattr(board, "chessboardCorners")
				  else board.getChessboardCorners())
	idx = ids.flatten().astype(int)
	obj = corners_3d[idx, :]
	proj, _ = cv.projectPoints(obj, rvec, tvec, K, dist)
	return proj.reshape(-1, 2)


def _rvec_to_dir(rv: np.ndarray) -> np.ndarray:
	R, _ = cv.Rodrigues(rv)
	return R[:, 2].reshape(-1)  # camera z-axis


def _pose_spread_stats(rvecs: List[np.ndarray], tvecs: List[np.ndarray]) -> Tuple[float, float]:
	"""Returns (median_angle_deg_between_view_dirs, depth_ratio_max_over_min)."""
	if not rvecs:
		return 0.0, 1.0
	dirs = np.stack([_rvec_to_dir(rv) for rv in rvecs], axis=0)  # (V,3)
	dp = np.clip(dirs @ dirs.T, -1.0, 1.0)
	tri = np.triu_indices(dp.shape[0], k=1)
	if len(tri[0]) == 0:
		med_angle = 0.0
	else:
		ang = np.degrees(np.arccos(dp[tri]))
		med_angle = float(np.median(ang))
	dists = np.array([float(np.linalg.norm(t)) for t in tvecs]) if tvecs else np.array([1.0])
	depth_ratio = float((dists.max() / max(dists.min(), 1e-9))) if dists.size else 1.0
	return med_angle, depth_ratio


def _principal_point_offsets_pct(K: np.ndarray, W: int, H: int) -> Tuple[float, float]:
	cx, cy = float(K[0, 2]), float(K[1, 2])
	return abs(cx - W / 2) / W * 100.0, abs(cy - H / 2) / H * 100.0


def _skew_ratio(K: np.ndarray) -> float:
	skew = float(K[0, 1])
	fx = float(K[0, 0]); fy = float(K[1, 1])
	return abs(skew) / max(fx, fy, 1e-9)


def _grade(value: float, thr_good: float, thr_fair: float, invert: bool = False) -> str:
	"""
	Returns 'good'/'fair'/'bad'.
	If invert=True, higher is better (e.g., coverage, pose spread, edge reach).
	Otherwise lower is better (e.g., RMS, center offset, skew).
	"""
	if invert:
		if value >= thr_good:
			return "good"
		if value >= thr_fair:
			return "fair"
		return "bad"
	else:
		if value <= thr_good:
			return "good"
		if value <= thr_fair:
			return "fair"
		return "bad"


def _evaluate_quality(summary: Dict, K: np.ndarray, image_size: Tuple[int, int]) -> Dict:
	W, H = image_size
	median_rms = float(summary.get("median_rms", 0.0))
	mean_rms = float(summary.get("mean_rms", 0.0))
	per_view = summary.get("per_view_rms", [])
	p90_rms = float(np.percentile(per_view, 90)) if per_view else mean_rms
	cov_pct = float(summary.get("coverage_percent", 0.0))
	pose_med_deg = float(summary.get("pose_spread_median_deg", 0.0))
	edge_med = float(summary.get("edge_reach_median", 0.0))

	offx_pct, offy_pct = _principal_point_offsets_pct(K, W, H)
	skew_r = _skew_ratio(K)
	center_off = max(offx_pct, offy_pct)

	# Relaxed, more realistic thresholds for screen-board workflows
	g = {}
	g["median_rms"]	= _grade(median_rms, thr_good=1.0, thr_fair=1.5, invert=False)
	g["p90_rms"]	   = _grade(p90_rms,	thr_good=1.4, thr_fair=1.8, invert=False)
	g["coverage"]	  = _grade(cov_pct,	thr_good=60.0, thr_fair=20.0, invert=True)
	g["pose_spread"]   = _grade(pose_med_deg, thr_good=22.0, thr_fair=12.0, invert=True)
	g["edge_reach"]	= _grade(edge_med,   thr_good=0.80, thr_fair=0.65, invert=True)
	g["center_offset"] = _grade(center_off, thr_good=7.0, thr_fair=12.0, invert=False)
	g["skew_ratio"]	= _grade(skew_r,	  thr_good=1e-3, thr_fair=5e-3, invert=False)

	order = {"good": 0, "fair": 1, "bad": 2}
	overall = max(g.values(), key=lambda x: order[x])

	reasons = []
	actions = []
	if g["coverage"] != "good":
		reasons.append(f"Coverage {cov_pct:.1f}%")
		actions.append("Add frames hitting edges/corners; vary angle & distance.")
	if g["edge_reach"] != "good":
		reasons.append(f"Edge reach median {edge_med:.2f}")
		actions.append("Push board nearer sensor edges; allow some marker clipping.")
	if g["median_rms"] != "good" or g["p90_rms"] != "good":
		reasons.append(f"RMS median {median_rms:.2f}px; p90 {p90_rms:.2f}px")
		actions.append("Increase sharpness (more light, lower ISO), reduce screen moiré (resize board).")
	if g["pose_spread"] != "good":
		reasons.append(f"Pose spread {pose_med_deg:.1f}°")
		actions.append("Capture from varied viewpoints (tilt/pan/roll) and distances.")
	if g["center_offset"] == "bad":
		reasons.append(f"Principal point offset {center_off:.1f}% of frame")
		actions.append("Ensure corners appear across the whole sensor; avoid heavy cropping.")
	if g["skew_ratio"] == "bad":
		reasons.append(f"Non-zero skew ratio {skew_r:.4f}")
		actions.append("Re-shoot with better coverage; if persists, inspect image readout/metadata.")

	return {
		"grade_overall": overall,
		"grades": g,
		"p90_rms": round(p90_rms, 6),
		"center_offset_max_pct": round(center_off, 2),
		"skew_ratio": float(f"{skew_r:.6g}"),
		"reasons": reasons,
		"actions": actions,
	}


def make_report(report_dir: str, records: List[FrameRecord], K: np.ndarray, dist: np.ndarray,
				rvecs: List[np.ndarray], tvecs: List[np.ndarray], board,
				save_undistorted_dir: Optional[str] = None) -> Dict:
	os.makedirs(report_dir, exist_ok=True)
	if save_undistorted_dir:
		os.makedirs(save_undistorted_dir, exist_ok=True)

	per_view_rms: List[float] = []
	all_pts = []

	overlay_dir = os.path.join(report_dir, "overlays")
	os.makedirs(overlay_dir, exist_ok=True)

	H, W = records[0].img.shape[:2]
	newK, roi = cv.getOptimalNewCameraMatrix(K, dist, (W, H), 1.0, (W, H), centerPrincipalPoint=True)
	map1, map2, _ = build_undistort_maps(K, dist, (W, H), alpha=1.0)
	zeros_dist = np.zeros_like(dist)
	roi_x, roi_y = roi[0], roi[1]

	per_frame_corners: List[Dict] = []

	for i, rec in enumerate(records):
		img = rec.img.copy()

		# project and compute residuals
		proj = _project_charuco_points(board, rec.ids, rvecs[i], tvecs[i], K, dist)
		det = rec.corners.reshape(-1, 2)
		diff = det - proj
		errs = np.linalg.norm(diff, axis=1)
		rms = float(np.sqrt(np.mean(errs ** 2))) if len(errs) else 0.0
		per_view_rms.append(rms)
		all_pts.append(det)

		# overlay on distorted image
		for p, q in zip(det.astype(int), proj.astype(int)):
			cv.circle(img, tuple(p), 8, (240, 0, 0), -1)		  # detected
			cv.circle(img, tuple(q), 6, (240, 240, 240), -1)	  # projected
			cv.arrowedLine(img, tuple(p), tuple(q), (50, 180, 255), 2, tipLength=0.3)
		cv.putText(img, f"RMS {rms:.3f} px", (12, 48), cv.FONT_HERSHEY_SIMPLEX, 1.6, (255, 255, 255), 3, cv.LINE_AA)
		cv.putText(img, os.path.basename(rec.path), (12, img.shape[0] - 16), cv.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 3, cv.LINE_AA)

		cv.imwrite(os.path.join(overlay_dir, f"{i:03d}_rms{rms:.3f}.png"), img)

		# compute corners in undistorted image space for frontend canvas rendering
		proj_und = _project_charuco_points(board, rec.ids, rvecs[i], tvecs[i], newK, zeros_dist)
		det_und = cv.undistortPoints(det.reshape(-1, 1, 2).astype(np.float32), K, dist, P=newK).reshape(-1, 2)
		proj_und_c = proj_und - np.array([roi_x, roi_y])
		det_und_c = det_und - np.array([roi_x, roi_y])
		und_errs = np.linalg.norm(det_und_c - proj_und_c, axis=1)
		und_rms = float(np.sqrt(np.mean(und_errs ** 2))) if len(und_errs) else 0.0
		per_frame_corners.append({
			"detected": det_und_c.tolist(),
			"projected": proj_und_c.tolist(),
			"rms": und_rms,
		})

		if save_undistorted_dir:
			und_clean = apply_undistort(rec.img, map1, map2, roi)
			cv.imwrite(os.path.join(save_undistorted_dir, f"{i:03d}_undist.png"), und_clean)

	# coverage heatmap (OpenCV INFERNO)
	H, W = records[0].img.shape[:2]
	grid = np.zeros((max(36, H // 20), max(64, W // 20)), np.float32)
	gh, gw = grid.shape
	for pts in all_pts:
		for (x, y) in pts:
			ix = min(gw - 1, max(0, int((x / W) * gw)))
			iy = min(gh - 1, max(0, int((y / H) * gh)))
			grid[iy, ix] += 1.0
	covered = int((grid > 0).sum())
	coverage_pct = 100.0 * covered / float(grid.size)

	norm = grid / (grid.max() + 1e-6)
	heat = (norm * 255).astype(np.uint8)
	heat = cv.resize(heat, (W, H), interpolation=cv.INTER_CUBIC)
	heat = cv.applyColorMap(heat, cv.COLORMAP_INFERNO)
	heatmap_path = os.path.join(report_dir, "coverage_heatmap.png")
	cv.imwrite(heatmap_path, heat)

	# per-view RMS histogram -> CSV (no image), 20 bins over [0, max_err]
	csv_path = os.path.join(report_dir, "per_view_rms.csv")
	with open(csv_path, "w", encoding="utf-8") as f:
		f.write("bin_center_px,count\n")
		if per_view_rms:
			bins = 20
			max_err = max(per_view_rms) * 1.05
			counts = np.zeros(bins, dtype=int)
			for e in per_view_rms:
				b = int((e / max_err) * bins)
				if b == bins:
					b = bins - 1
				counts[b] += 1
			bin_width = max_err / bins
			for i in range(bins):
				center = (i + 0.5) * bin_width
				f.write(f"{center:.6f},{int(counts[i])}\n")

	# Pose diversity & edge reach summary
	pose_med_deg, depth_ratio = _pose_spread_stats(rvecs, tvecs)
	# Dataset-level edge reach (median of frame scores)
	edge_scores = []
	for rec in records:
		edge_scores.append(RiverCalibrator._edge_score(rec.corners, (W, H)))
	edge_med = float(np.median(edge_scores)) if edge_scores else 0.0

	# summary JSON + verdict
	summary = {
		"frames_used": len(records),
		"per_view_rms": [round(x, 6) for x in per_view_rms],
		"mean_rms": round(float(np.mean(per_view_rms)), 6) if per_view_rms else 0.0,
		"median_rms": round(float(np.median(per_view_rms)), 6) if per_view_rms else 0.0,
		"min_rms": round(float(np.min(per_view_rms)), 6) if per_view_rms else 0.0,
		"max_rms": round(float(np.max(per_view_rms)), 6) if per_view_rms else 0.0,
		"coverage_percent": round(coverage_pct, 2),
		"edge_reach_median": round(edge_med, 3),
		"pose_spread_median_deg": round(pose_med_deg, 2),
		"pose_depth_ratio": round(depth_ratio, 3),
		"heatmap_path": heatmap_path,
		"rms_hist_csv": csv_path,
		"overlays_dir": overlay_dir,
		"undistorted_dir": save_undistorted_dir or "",
		"per_frame_corners": per_frame_corners,
	}
	verdict = _evaluate_quality(summary, K, (W, H))
	summary["verdict"] = verdict

	with open(os.path.join(report_dir, "summary.json"), "w", encoding="utf-8") as f:
		json.dump(summary, f, indent=2)
	return summary


# ---------------- utility & viewer ----------------

def _gather_images(dirpath: Optional[str], patterns: List[str], exts: str) -> List[str]:
	paths = []
	if dirpath:
		ext_set = {e.lower().strip().lstrip('.') for e in exts.split(',')}
		try:
			for f in os.listdir(dirpath):
				if os.path.splitext(f)[1].lower().lstrip('.') in ext_set:
					paths.append(os.path.join(dirpath, f))
		except OSError:
			pass
	for pat in patterns or []:
		paths.extend(glob.glob(pat))
	return sorted(list(dict.fromkeys(paths)))


def save_profile(result: CalibrationResult | Dict, path: str):
	payload = result.to_jsonable() if isinstance(result, CalibrationResult) else result
	_ensure_dir(path)
	with open(path, "w", encoding="utf-8") as f:
		json.dump(payload, f, indent=2)


def interactive_view(records: List[FrameRecord], K: np.ndarray, dist: np.ndarray,
					 rvecs: List[np.ndarray], tvecs: List[np.ndarray], board):
	if not records:
		return
	idx = 0
	show_overlay = True
	show_undist = True
	win = "Calibration Viewer"
	cv.namedWindow(win, cv.WINDOW_NORMAL)
	cv.resizeWindow(win, 1200, 700)

	h, w = records[0].img.shape[:2]
	map1, map2, roi = build_undistort_maps(K, dist, (w, h), alpha=1.0)

	def render(i):
		rec = records[i]
		img = rec.img.copy()
		right = apply_undistort(img, map1, map2, roi) if show_undist else img.copy()
		left = img

		if show_overlay:
			proj = _project_charuco_points(board, rec.ids, rvecs[i], tvecs[i], K, dist)
			det = rec.corners.reshape(-1, 2)
			for p, q in zip(det.astype(int), proj.astype(int)):
				cv.circle(left, tuple(p), 3, (60, 220, 60), -1)
				cv.circle(left, tuple(q), 2, (240, 240, 240), -1)
				cv.arrowedLine(left, tuple(p), tuple(q), (50, 180, 255), 1, tipLength=0.2)
		both = np.hstack([left, right])
		cv.putText(both, f"frame {i+1}/{len(records)}  ·  o=overlay({show_overlay})  u=undist({show_undist})  ←/→ next/prev  ESC exit",
				   (12, 28), cv.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 2, cv.LINE_AA)
		cv.imshow(win, both)

	render(idx)
	while True:
		k = cv.waitKey(0)
		if k in (27, ord('q')):
			break
		elif k in (81, ord('h')):  # left
			idx = (idx - 1) % len(records); render(idx)
		elif k in (83, ord('l')):  # right
			idx = (idx + 1) % len(records); render(idx)
		elif k in (ord('o'), ord('O')):
			show_overlay = not show_overlay; render(idx)
		elif k in (ord('u'), ord('U')):
			show_undist = not show_undist; render(idx)
	cv.destroyAllWindows()


# ---------------- CLI ----------------

def _cli():
	ap = argparse.ArgumentParser(description="RIVeR camera calibration (offline) with visual reporting and quality verdict")
	ap.add_argument("--write-pattern", type=str, help="Write a ChArUco PNG and exit")
	ap.add_argument("--board", type=str, default="20x15", help="ChArUco board as COLSxROWS, e.g. 20x15 or 16x11")
	ap.add_argument("--dir", type=str, default=None, help="Folder of snapshots from the target camera")
	ap.add_argument("--images", nargs="+", default=None, help="Image glob(s) or paths")
	ap.add_argument("--ext", type=str, default="jpg,jpeg,png", help="When using --dir, include these extensions")
	ap.add_argument("--rotate", type=int, default=0, help="Rotate images 0/90/180/270 degrees")
	ap.add_argument("--max-side", type=int, default=2500, help="Downscale long side if larger than this")
	ap.add_argument("--save", type=str, default=None, help="Save JSON profile here")
	ap.add_argument("--report", type=str, default=None, help="Directory to write visual report (overlays, heatmap, summary)")
	ap.add_argument("--save-undistorted", type=str, default=None, help="Directory to save undistorted images")
	ap.add_argument("--view", action="store_true", help="Open interactive viewer after calibration")
	# Optional knobs (override defaults without editing code)
	ap.add_argument("--max-frames", type=int, default=None, help="Cap number of frames used for solving")
	ap.add_argument("--edge-priority", type=float, default=None, help="0..1 fraction of selected frames biased to edges")
	args = ap.parse_args()

	# parse board
	try:
		cols, rows = map(int, args.board.lower().split("x"))
	except Exception:
		raise SystemExit("Invalid --board format. Use e.g. 20x15 or 16x11")
	board_cr = (cols, rows)

	if args.write_pattern:
		write_pattern_png(args.write_pattern, cols_rows=board_cr)
		print(f"Wrote {args.write_pattern} for board {cols}x{rows}. Open it full-screen on any display.")
		return

	cal = RiverCalibrator(board_cols_rows=board_cr, max_side=args.max_side)
	if args.max_frames is not None:
		cal.max_frames = max(8, int(args.max_frames))
	if args.edge_priority is not None:
		cal.edge_priority_frac = float(max(0.0, min(1.0, args.edge_priority)))

	img_list = _gather_images(args.dir, args.images, args.ext)
	if not img_list:
		raise SystemExit("Provide --dir and/or --images for offline calibration.")

	print(f"Found {len(img_list)} images. Calibrating…")
	result, used_records, (K, dist, rvecs, tvecs) = cal.run_from_images(img_list, rotate=args.rotate)

	print(f"RMS: {result.rms:.3f} px · frames used: {result.frames_used} · size: {result.image_size}")
	if args.save:
		save_profile(result, args.save)
		print(f"Saved profile → {args.save}")

	# NEW: print the exact images that were used
	if used_records:
		print("\nImages used for calibration:")
		for rec in used_records:
			print(" -", rec.path)

	if args.report or args.save_undistorted:
		summary = make_report(args.report or "out/report", used_records, K, dist, rvecs, tvecs, cal.board, args.save_undistorted)
		v = summary.get("verdict", {})
		verdict_msg = f"[{v.get('grade_overall','n/a').upper()}] " \
					  f"median RMS {summary.get('median_rms',0):.2f}px, " \
					  f"p90 {v.get('p90_rms',0):.2f}px, " \
					  f"coverage {summary.get('coverage_percent',0):.1f}%, " \
					  f"edge reach {summary.get('edge_reach_median',0):.2f}, " \
					  f"pose spread {summary.get('pose_spread_median_deg',0):.1f}°"
		print("\nReport written:", args.report or "out/report", "→ quality:", json.dumps(v))
		print(verdict_msg)

	if args.view:
		interactive_view(used_records, K, dist, rvecs, tvecs, cal.board)


if __name__ == "__main__":
	_cli()
