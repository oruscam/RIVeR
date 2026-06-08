import multiprocessing
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
import json


def load_profile(profile_path):
	"""Load calibration profile from profile.json."""
	if not os.path.exists(profile_path):
		raise FileNotFoundError(profile_path)

	with open(profile_path, "r", encoding="utf-8") as f:
		p = json.load(f)

	K = np.array(p["K"], dtype=np.float64)
	dist = np.array(p["dist"], dtype=np.float64).reshape(-1, 1)

	return K, dist


def build_undistort_maps(K, dist, image_size, alpha):
	"""Generate undistortion maps from calibration profile."""
	newK, roi = cv2.getOptimalNewCameraMatrix(
		K, dist, image_size, alpha, image_size, centerPrincipalPoint=True
	)

	map1, map2 = cv2.initUndistortRectifyMap(
		K, dist, None, newK, image_size, cv2.CV_16SC2
	)

	return map1, map2, roi


def undistort_frame(frame, map1, map2, roi):
	"""Undistort a single frame."""
	und = cv2.remap(frame, map1, map2, interpolation=cv2.INTER_LINEAR)

	if roi is not None:
		x, y, w, h = roi
		# Guard against zero-sized ROI (mismatched calibration profile resolution)
		if w > 0 and h > 0:
			und = und[y:y+h, x:x+w]

	return und


def extract_frames(
	video_path: Path,
	frames_dir: Path,
	every: int,
	start: int,
	end: Optional[int] = None,
	overwrite: bool = False,
	resize_factor: float = 1.0,
	undistort: bool = False,
	profile_path: Optional[str] = None,
	undistort_alpha: float = 0.0,
) -> int:
	"""Extract frames from a video using OpenCVs VideoCapture."""
	# Set JPEG compression parameters for faster writing
	encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), 95]

	capture = cv2.VideoCapture(str(video_path))  # open the video using OpenCV
	capture.set(cv2.CAP_PROP_BUFFERSIZE, 3)

	if end is None:  # if end isn't specified assume the end of the video
		end = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))

	capture.set(1, start)  # set the starting frame of the capture

	# Read first frame to get dimensions
	ret, first_frame = capture.read()
	if not ret or first_frame is None:
		capture.release()
		return 0

	height, width = first_frame.shape[:2]

	# Calculate new dimensions based on resize_factor
	if resize_factor < 1.0 and resize_factor > 0:
		new_width = int(width * resize_factor)
		new_height = int(height * resize_factor)
		frame_buffer = np.empty((new_height, new_width, 3), dtype=np.uint8)
	else:
		new_width, new_height = width, height
		frame_buffer = np.empty((height, width, 3), dtype=np.uint8)

	# Initialize undistortion map if needed
	if undistort and profile_path:
		K, dist = load_profile(profile_path)
		map1, map2, roi = build_undistort_maps(K, dist, (width, height), undistort_alpha)
	else:
		map1 = map2 = roi = None

	frame = start  # keep track of which frame we are up to, starting from start
	while_safety = 0  # a safety counter to ensure we don't enter an infinite while loop
	saved_count = 0  # a count of how many frames we have saved

	while frame < end:
		ret = capture.grab()  # grab frame into buffer (faster than read)

		if not ret or while_safety > 500:  # break if we hit safety limit or can't grab frame
			break

		if frame % every == 0:  # if this is a frame we want to write out
			ret, temp_frame = capture.retrieve()  # retrieve frame from buffer
			if not ret:
				while_safety += 1
				continue

			# Undistort the frame if needed
			if undistort and map1 is not None:
				temp_frame = undistort_frame(temp_frame, map1, map2, roi)

			# Resize the frame if resize_factor is less than 1
			if resize_factor < 1.0 and resize_factor > 0:
				temp_frame = cv2.resize(temp_frame, (new_width, new_height), interpolation=cv2.INTER_AREA)

			while_safety = 0  # reset the safety count
			save_path = str(frames_dir / f"{frame:010d}.jpg")  # create the save path

			if not os.path.exists(save_path) or overwrite:
				# Use the encoding parameters for optimized JPEG writing
				cv2.imwrite(save_path, temp_frame, encode_params)
				saved_count += 1

		frame += 1

	capture.release()  # after the while has finished close the capture
	return saved_count


def video_to_frames(
	video_path: Path,
	frames_dir: Path,
	start_frame_number: int = 0,
	end_frame_number: Optional[int] = None,
	overwrite: bool = False,
	every: int = 1,
	resize_factor: float = 1.0,
	undistort: bool = False,
	profile_path: Optional[str] = None,
	undistort_alpha: float = 0.0,
) -> str:
	"""Extract frames from a video using multiprocessing"""
	# Validate resize_factor
	if resize_factor > 1.0 or resize_factor <= 0:
		raise ValueError("resize_factor must be between 0 and 1.0")

	# Add path validation
	video_path = str(video_path)
	if not os.path.exists(video_path):
		raise FileNotFoundError(f"Video file not found: {video_path}")

	capture = cv2.VideoCapture(video_path)  # load the video
	total_video_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))

	if end_frame_number is None:
		end_frame_number = total_video_frames

	# Calculate actual frames to be processed
	frame_range = end_frame_number - start_frame_number
	frames_to_extract = frame_range // every  # Only count frames we'll actually extract

	# If we have very few frames, just use a single chunk
	if frames_to_extract <= 100:
		frame_chunks = [[start_frame_number, end_frame_number]]
		worker_count = 1  # Only need one worker for a single chunk
	else:
		# Calculate worker count and chunk size as before
		worker_count = max(1, multiprocessing.cpu_count() - 1)
		optimal_chunk_size = max(100, frames_to_extract // (worker_count * 2))
		chunk_size = optimal_chunk_size

		frame_chunks = [[i, i + chunk_size] for i in range(start_frame_number, end_frame_number, chunk_size)]
		frame_chunks[-1][-1] = min(frame_chunks[-1][-1], end_frame_number)

	capture.release()
	# execute across multiple cpu cores to speed up processing, get the count automatically
	# with ProcessPoolExecutor(max_workers=multiprocessing.cpu_count()) as executor:
	with ThreadPoolExecutor(max_workers=worker_count) as executor:
		futures = []
		for f in frame_chunks:
			futures.append(
				executor.submit(
					extract_frames,
					video_path=video_path,
					frames_dir=frames_dir,
					every=every,
					start=f[0],
					end=f[1],
					overwrite=overwrite,
					resize_factor=resize_factor,
					undistort=undistort,
					profile_path=profile_path,
					undistort_alpha=undistort_alpha,
				)
			)

	frames = sorted(frames_dir.glob("*"))
	if not frames:
		raise RuntimeError(
			"No frames were extracted from the video. "
			"If --undistort is enabled, ensure the calibration profile "
			"was created from images with the same resolution as the video."
		)
	return frames[0]
