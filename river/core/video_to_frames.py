import multiprocessing
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional

import cv2
import numpy as np


def extract_frames(
	video_path: Path,
	frames_dir: Path,
	every: int,
	start: int,
	end: Optional[int] = None,
	overwrite: bool = False,
	resize_factor: float = 1.0,
) -> int:
	"""Extract frames from a video using OpenCVs VideoCapture.

	Args:
	    video_path (Path): Path of the video.
	    frames_dir (Path): The directory to save the frames.
	    every (int): Frame spacing.
	    start (int): Start frame.
	    end (Optional[int], optional): End frame. Defaults to None.
	    overwrite (bool, optional): To overwrite frames that already exist. Defaults to False.
	    resize_factor (float, optional): Factor to resize the frames (<=1.0). Defaults to 1.0.

	Returns:
	    int: Count of the saved images.
	"""
	# Set JPEG compression parameters for faster writing
	encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), 95]

	capture = cv2.VideoCapture(str(video_path))  # open the video using OpenCV
	# Set optimal buffer size
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
) -> str:
	"""Extracts the frames from a video using multiprocessing

	Args:
		video_path (Path): Path to the video.
		frames_dir (Path): Directory to save the frames.
		start_frame_number (int): Frame number to start.
		end_frame_number (int): Frame number to end.
		overwrite (bool, optional): Overwrite frames if they exist. Defaults to False.
		every (int, optional): Extract every this many frames. Defaults to 1.
		chunk_size (int, optional): How many frames to split into chunks (one chunk per cpu core process). Defaults to 100.
		resize_factor (float, optional): Factor to resize the frames (<=1.0). Defaults to 1.0.

	Raises:
		VideoHasNoFrames: When opencv can't split into frames.
		ValueError: When resize_factor is greater than 1.0 or less than or equal to 0.

	Returns:
		str: Path to the directory where the frames were saved, or None if fails
	"""
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
				)
			)

	return sorted(frames_dir.glob("*"))[0]
