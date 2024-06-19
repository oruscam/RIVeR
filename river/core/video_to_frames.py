import multiprocessing
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional

import cv2


def extract_frames(
	video_path: Path, frames_dir: Path, every: int, start: int, end: Optional[int] = None, overwrite: bool = False
) -> int:
	"""Extract frames from a video using OpenCVs VideoCapture.

	Args:
		video_path (Path): Path of the video.
		frames_dir (Path): The directory to save the frames.
		every (int): Frame spacing.
		start (int): Start frame.
		end (Optional[int], optional): End frame. Defaults to None.
		overwrite (bool, optional): To overwrite frames that already exist. Defaults to False.

	Returns:
		int: Count of the saved images.
	"""

	capture = cv2.VideoCapture(video_path)  # open the video using OpenCV

	if end is None:  # if end isn't specified assume the end of the video
		end = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))

	capture.set(1, start)  # set the starting frame of the capture
	frame = start  # keep track of which frame we are up to, starting from start
	while_safety = 0  # a safety counter to ensure we don't enter an infinite while loop (hopefully we won't need it)
	saved_count = 0  # a count of how many frames we have saved

	while frame < end:  # lets loop through the frames until the end
		_, image = capture.read()  # read an image from the capture

		if while_safety > 500:  # break the while if our safety maxs out at 500
			break

		# sometimes OpenCV reads None's during a video, in which case we want to just skip
		if image is None:  # if we get a bad return flag or the image we read is None, lets not save
			while_safety += 1  # add 1 to our while safety, since we skip before incrementing our frame variable
			continue  # skip

		if frame % every == 0:  # if this is a frame we want to write out based on the 'every' argument
			while_safety = 0  # reset the safety count
			save_path = os.path.join(frames_dir, "{:010d}.jpg".format(frame))  # create the save path
			# print(save_path)
			if not os.path.exists(save_path) or overwrite:  # if it doesn't exist or we want to overwrite anyways
				cv2.imwrite(save_path, image)  # save the extracted image
				saved_count += 1  # increment our counter by one

		frame += 1  # increment our frame count

	capture.release()  # after the while has finished close the capture

	return saved_count  # and return the count of the images we saved


def video_to_frames(
	video_path: Path,
	frames_dir: Path,
	start_frame_number: int = 0,
	end_frame_number: Optional[int] = None,
	overwrite: bool = False,
	every: int = 1,
	chunk_size: int = 100,
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

	Returns:
		str: Path to the directory where the frames were saved, or None if fails
	"""

	capture = cv2.VideoCapture(video_path)  # load the video
	total = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))  # get its total frame count

	if end_frame_number is None:  # if end isn't specified assume the end of the video
		end_frame_number = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))

	capture.release()  # release the capture straight away

	if total < 1:  # if video has no frames, might be and opencv error
		print("Video has no frames. Check your OpenCV + ffmpeg installation")
		# TODO: this should raise an exception
		return None  # return None

	frame_chunks = [
		[i, i + chunk_size] for i in range(start_frame_number, end_frame_number, chunk_size)
	]  # split the frames into chunk lists

	frame_chunks[-1][-1] = min(
		frame_chunks[-1][-1], end_frame_number
	)  # make sure last chunk has correct end frame, also handles case chunk_size < total

	# execute across multiple cpu cores to speed up processing, get the count automatically
	# with ProcessPoolExecutor(max_workers=multiprocessing.cpu_count()) as executor:
	with ThreadPoolExecutor(max_workers=multiprocessing.cpu_count()) as executor:
		[
			executor.submit(
				extract_frames,
				video_path=video_path,
				frames_dir=frames_dir,
				every=every,
				start=f[0],
				end=f[1],
				overwrite=overwrite,
			)
			for f in frame_chunks
		]  # submit the processes: extract_frames(...)

	return sorted(frames_dir.glob("*"))[0]
