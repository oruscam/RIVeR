"""
File Name:   frames_to_frames.py
Project:     RIVeR - Rectification of Image Velocity Results
Description: Import a folder of already-extracted frames as a project's frames.
Authors:     Antoine Patalano
Institution: ORUS / UNC
License:     AGPL-3.0-or-later
"""
import multiprocessing
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import List, Optional

import cv2
import numpy as np

from river.core.exceptions import RiverCoreException
from river.core.video_to_frames import build_undistort_maps, load_profile, save_processed_frame

FRAME_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def _natural_key(name: str) -> list:
	"""frame_2 before frame_10: digit runs compare as numbers, the rest case-insensitively."""
	return [int(token) if token.isdigit() else token.lower() for token in re.split(r"(\d+)", name)]


def list_source_frames(source_dir: Path) -> List[Path]:
	"""The JPEG/PNG files directly inside source_dir, in natural filename order."""
	files = [
		p
		for p in Path(source_dir).iterdir()
		if p.is_file() and p.suffix.lower() in FRAME_EXTENSIONS and not p.name.startswith(".")
	]
	return sorted(files, key=lambda p: (_natural_key(p.name), p.name))


def selected_indices(start: int, end: Optional[int], every: int, count: int) -> List[int]:
	"""The source indices that are imported: the rule extract_frames applies to a video."""
	end = count if end is None else min(end, count)
	return [i for i in range(max(start, 0), end) if i % every == 0]


def _read_frame(path: Path) -> np.ndarray:
	# np.fromfile + imdecode instead of cv2.imread: imread fails on non-ASCII paths on Windows.
	try:
		frame = cv2.imdecode(np.fromfile(str(path), dtype=np.uint8), cv2.IMREAD_COLOR)
	except Exception:
		frame = None
	if frame is None:
		raise RiverCoreException(f"unreadable:{path.name}")
	return frame


def inspect_frames(source_dir: Path) -> dict:
	"""Count, resolution and ordered file names of a frames folder.

	Only the first and last image are decoded, so this stays fast on large folders;
	frames_to_frames checks every frame it imports.
	"""
	files = list_source_frames(source_dir)
	if len(files) < 2:
		raise RiverCoreException("noFrames")

	height, width = _read_frame(files[0]).shape[:2]
	if _read_frame(files[-1]).shape[:2] != (height, width):
		raise RiverCoreException("mixedSizes")

	return {"count": len(files), "width": width, "height": height, "files": [p.name for p in files]}


def frames_to_frames(
	source_dir: Path,
	frames_dir: Path,
	start_frame_number: int = 0,
	end_frame_number: Optional[int] = None,
	overwrite: bool = False,
	every: int = 1,
	resize_factor: float = 1.0,
	undistort: bool = False,
	profile_path: Optional[str] = None,
	undistort_alpha: float = 0.0,
) -> Path:
	"""Copy the selected source frames into frames_dir as {index:010d}.jpg.

	Mirrors video_to_frames: same selection rule, same undistort/resize, same output names.
	"""
	if resize_factor > 1.0 or resize_factor <= 0:
		raise ValueError("resize_factor must be between 0 and 1.0")

	frames_dir = Path(frames_dir)
	files = list_source_frames(source_dir)
	if len(files) < 2:
		raise RiverCoreException("noFrames")

	indices = selected_indices(start_frame_number, end_frame_number, every, len(files))
	if not indices:
		raise RiverCoreException("emptySelection")

	height, width = _read_frame(files[indices[0]]).shape[:2]

	map1 = map2 = roi = None
	if undistort and profile_path:
		K, dist, cal_size = load_profile(profile_path)
		if cal_size != (width, height):
			raise ValueError(
				f"The profile resolution ({cal_size[0]}×{cal_size[1]}) "
				f"does not match the frames. "
				"Select another camera model or calibrate for this resolution."
			)
		map1, map2, roi = build_undistort_maps(K, dist, (width, height), undistort_alpha)

	resize_to = (int(width * resize_factor), int(height * resize_factor)) if resize_factor < 1.0 else None
	encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), 95]

	def import_one(index: int) -> None:
		frame = _read_frame(files[index])
		if frame.shape[:2] != (height, width):
			raise RiverCoreException(f"mixedSizes:{files[index].name}")
		save_path = str(frames_dir / f"{index:010d}.jpg")
		save_processed_frame(frame, save_path, overwrite, encode_params, map1, map2, roi, resize_to)

	worker_count = max(1, multiprocessing.cpu_count() - 1)
	with ThreadPoolExecutor(max_workers=worker_count) as executor:
		# Consuming the iterator re-raises the first worker error here.
		for _ in executor.map(import_one, indices):
			pass

	return frames_dir / f"{indices[0]:010d}.jpg"
