"""
File Name:   stabilize_frames.py
Project:     RIVeR - Rectification of Image Velocity Results
Description: UAV frame stabilization via Lucas-Kanade point tracking and similarity transform.
Authors:     Antoine Patalano
Institution: ORUS / UNC
License:     AGPL-3.0-or-later
"""

import json
import sys
from pathlib import Path
from typing import Optional

import cv2
import numpy as np


def _load_tracking_regions(path: Path, scale: float = 1.0) -> tuple[np.ndarray, tuple[int, int]]:
	"""Load regions from stabilization_regions.json.

	Region coordinates are authored against the native video resolution. `scale`
	converts them into the coordinate space of the frames actually being
	stabilized (e.g. the `--resize-factor` applied during frame extraction), so
	pass 1.0 when frames were extracted at native resolution.

	Returns:
		points   — (n, 2) float32 array of region centres (x, y), scaled.
		win_size — (w, h) tuple, largest drawn box size, scaled, for lk_win_size.
	"""
	if not path.exists():
		raise FileNotFoundError(f"Regions file not found: {path}")
	with path.open() as f:
		data = json.load(f)
	regions = data["regions"]
	if len(regions) < 2:
		raise ValueError(f"Need at least 2 tracking regions, got {len(regions)}")
	points = np.array([r["center"] for r in regions], dtype=np.float32) * scale
	max_w = max(r["win_size"][0] for r in regions) * scale
	max_h = max(r["win_size"][1] for r in regions) * scale
	return points, (int(max_w), int(max_h))


def _fit_similarity(src: np.ndarray, dst: np.ndarray) -> Optional[np.ndarray]:
	"""Direct least-squares similarity fit (4 DOF: translation + rotation + scale).

	Solves [[a, -b, tx], [b, a, ty]] from N≥2 point pairs via a 2N×4 linear system.

	Args:
		src: (N, 2) or (N, 1, 2) float array — source points (reference frame).
		dst: (N, 2) or (N, 1, 2) float array — destination points (current frame).

	Returns:
		(2, 3) float64 affine matrix, or None if fewer than 2 points.
	"""
	s = src.reshape(-1, 2)
	d = dst.reshape(-1, 2)
	n = len(s)
	if n < 2:
		return None
	A = np.zeros((2 * n, 4), dtype=np.float64)
	b = np.zeros(2 * n, dtype=np.float64)
	for k in range(n):
		x, y = float(s[k, 0]), float(s[k, 1])
		A[2 * k]     = [x, -y, 1, 0]
		A[2 * k + 1] = [y,  x, 0, 1]
		b[2 * k]     = float(d[k, 0])
		b[2 * k + 1] = float(d[k, 1])
	params, _, _, _ = np.linalg.lstsq(A, b, rcond=None)
	a, bv, tx, ty = params
	return np.array([[a, -bv, tx], [bv, a, ty]], dtype=np.float64)


def _make_sanity_check(stabilized_dir: Path, n_frames: int = 50) -> Path:
	"""Write a temporal std-dev false-colour image to stabilized_dir/sanity_check.jpg.

	Dark regions = locked static areas; bright = residual motion or failed tracking.
	"""
	frame_files = sorted(f for f in stabilized_dir.glob("*.jpg") if f.name != "sanity_check.jpg")
	if not frame_files:
		raise FileNotFoundError(f"No JPEG frames found in {stabilized_dir}")

	n = min(n_frames, len(frame_files))
	indices = np.linspace(0, len(frame_files) - 1, n, dtype=int)
	sampled = [frame_files[i] for i in indices]

	first = cv2.imread(str(sampled[0]))
	if first is None:
		raise OSError(f"Cannot read {sampled[0]}")
	h, w = first.shape[:2]

	stack = np.zeros((n, h, w), dtype=np.float32)
	for j, fpath in enumerate(sampled):
		img = cv2.imread(str(fpath))
		if img is not None:
			stack[j] = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)

	stddev = stack.std(axis=0)
	stddev_norm = cv2.normalize(stddev, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
	coloured = cv2.applyColorMap(stddev_norm, cv2.COLORMAP_INFERNO)

	out_path = stabilized_dir / "sanity_check.jpg"
	cv2.imwrite(str(out_path), coloured)
	return out_path


def stabilize_frames(
	frames_dir: Path,
	regions_path: Path,
	stabilized_dir: Path,
	scale: float = 1.0,
) -> Path:
	"""Stabilize extracted JPEG frames using incremental LK point tracking.

	For each frame after the reference (first frame), tracks user-defined points
	using Lucas-Kanade optical flow with forward-backward consistency filtering,
	fits a similarity transform (translation + rotation + scale, 4 DOF), and warps
	the frame into the reference coordinate system. Falls back to the last known-good
	transform when tracking fails.

	Args:
		frames_dir:     Directory of extracted JPEG frames (sorted by filename).
		regions_path:   Path to stabilization_regions.json defining tracking points.
		stabilized_dir: Directory to write stabilized frames (created if absent).
		scale:          Factor converting region coordinates (authored against the
		                native video resolution) into the extracted frames' coordinate
		                space — pass the same value as `--resize-factor`.

	Returns:
		Path to the sanity check image written inside stabilized_dir.

	Raises:
		ValueError:      If frames_dir contains no JPEGs, or fewer than 2 regions.
		FileNotFoundError: If regions_path does not exist.
	"""
	frame_files = sorted(frames_dir.glob("*.jpg"))
	if not frame_files:
		raise ValueError(f"No JPEG frames found in {frames_dir}")

	ref_points, lk_win_size = _load_tracking_regions(regions_path, scale=scale)

	stabilized_dir.mkdir(parents=True, exist_ok=True)

	ref_bgr = cv2.imread(str(frame_files[0]))
	if ref_bgr is None:
		raise OSError(f"Cannot read reference frame: {frame_files[0]}")
	height, width = ref_bgr.shape[:2]

	cv2.imwrite(str(stabilized_dir / frame_files[0].name), ref_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 95])

	ref_gray = cv2.cvtColor(ref_bgr, cv2.COLOR_BGR2GRAY)

	lk_params = dict(
		winSize=lk_win_size,
		maxLevel=4,
		criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01),
	)

	ref_pts = ref_points.reshape(-1, 1, 2).astype(np.float32)
	last_good_M = np.float64([[1, 0, 0], [0, 1, 0]])
	prev_gray = ref_gray.copy()
	prev_pts = ref_pts.copy()
	total = len(frame_files)

	for idx, fpath in enumerate(frame_files[1:], start=1):
		cur_bgr = cv2.imread(str(fpath))

		if cur_bgr is None:
			stabilized = np.zeros((height, width, 3), dtype=np.uint8)
			cv2.imwrite(str(stabilized_dir / fpath.name), stabilized, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
			continue

		cur_gray = cv2.cvtColor(cur_bgr, cv2.COLOR_BGR2GRAY)

		cur_pts, status_fwd, _ = cv2.calcOpticalFlowPyrLK(prev_gray, cur_gray, prev_pts, None, **lk_params)

		if cur_pts is None:
			# LK failed completely — write warped frame with last good transform and continue
			M_inv = cv2.invertAffineTransform(last_good_M)
			stabilized = cv2.warpAffine(cur_bgr, M_inv, (width, height))
			cv2.imwrite(str(stabilized_dir / fpath.name), stabilized, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
			continue

		back_pts, status_bwd, _ = cv2.calcOpticalFlowPyrLK(cur_gray, prev_gray, cur_pts, None, **lk_params)

		fb_err = np.linalg.norm(prev_pts.reshape(-1, 2) - back_pts.reshape(-1, 2), axis=1)
		good = (status_fwd.ravel() == 1) & (status_bwd.ravel() == 1) & (fb_err < 1.0)

		n_tracked = int(good.sum())
		if n_tracked >= 2:
			M_raw = _fit_similarity(ref_pts[good], cur_pts[good])
			if M_raw is not None:
				last_good_M = M_raw

		M_inv = cv2.invertAffineTransform(last_good_M)
		stabilized = cv2.warpAffine(cur_bgr, M_inv, (width, height))
		cv2.imwrite(str(stabilized_dir / fpath.name), stabilized, [int(cv2.IMWRITE_JPEG_QUALITY), 95])

		next_pts = cur_pts.copy()
		next_pts[~good] = prev_pts[~good]
		prev_gray = cur_gray
		prev_pts = next_pts

		if idx % 50 == 0:
			print(f"  frame {idx}/{total - 1}  tracked={n_tracked}/{len(ref_pts)}", file=sys.stderr)

	print(f"Stabilization complete: {total} frames processed.", file=sys.stderr)

	return _make_sanity_check(stabilized_dir)
