"""
File Name: piv_pipeline.py
Project Name: RIVeR-LAC
Description: Perform image filtering before Particle Image Velocimetry (PIV) on a pair of frame (Test) or a list of frames.

Created Date: 2024-07-22
Author: Antoine Patalano
Email: antoine.patalano@unc.edu.ar
Company: UNC / ORUS

This script contains functions for processing and analyzing PIV images.
See examples of use at the end
"""

import multiprocessing
from concurrent.futures.thread import ThreadPoolExecutor
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

import river.core.image_preprocessing as impp
from river.core.piv_fftmulti import piv_fftmulti
from river.core.piv_loop import piv_loop


def run_test(
	image_1: Path,
	image_2: Path,
	mask: Optional[np.ndarray] = None,
	bbox: Optional[list] = None,
	interrogation_area_1: int = 128,
	interrogation_area_2: Optional[int] = None,
	mask_auto: bool = True,
	multipass: bool = True,
	standard_filter: bool = True,
	standard_threshold: int = 4,
	median_test_filter: bool = True,
	epsilon: float = 0.02,
	threshold: int = 2,
	seeding_filter: bool = False,
	step: Optional[int] = None,
	filter_grayscale: bool = True,
	filter_clahe: bool = True,
	clip_limit_clahe: int = 5,
	filter_sub_background: bool = False,
):
	"""
	Run PIV test with optional preprocessing steps.

	Parameters:
	image_1 : Path
	    Path to the first image file.
	image_2 : Path
	    Path to the second image file.
	mask : np.ndarray, optional
	    The mask for the region of interest, Default is None.
	bbox : list, optional
	    The bounding box for the region of interest. Default is None.
	interrogation_area_1 : int
	    The size of the interrogation area.
	interrogation_area_2 : int, optional
	    The size of the second interrogation area.
	mask_auto : bool, optional
	    Whether to automatically apply a mask. Default is True.
	multipass : bool, optional
	    Whether to use multiple passes. Default is True.
	standard_filter : bool, optional
	    Whether to apply standard deviation filtering. Default is True.
	standard_threshold : float, optional
	    The threshold for standard deviation filtering. Default is 4.
	median_test_filter : bool, optional
	    Whether to apply median test filtering. Default is True.
	epsilon : float, optional
	    The epsilon value for median test filtering. Default is 0.02.
	threshold : float, optional
	    The threshold value for median test filtering. Default is 2.
	seeding_filter : bool, optional
	    Whether to apply seeding filtering. Default is False.
	step : int, optional
	    The step size for grid calculations.
	filter_grayscale : bool, optional
	    Whether to convert images to grayscale. Default is True.
	filter_clahe : bool, optional
	    Whether to apply CLAHE filtering. Default is True.
	clip_limit_clahe : int, optional
	    The clip limit for CLAHE. Default is 5.
	filter_sub_background : bool, optional
	    Whether to subtract background. Default is False.

	Returns:
	dict
	    A dictionary containing results such as 'shape', 'x', 'y', 'u', 'v' and 'typevector'.

	"""
	background = None

	if filter_sub_background:
		filter_grayscale = True  # forces to work with grayscale images if filt_sub_backgnd
		background = impp.calculate_average(image_1.parent)

	image_1 = impp.preprocess_image(
		image_1, filter_grayscale, filter_clahe, clip_limit_clahe, filter_sub_background, background
	)
	image_2 = impp.preprocess_image(
		image_2, filter_grayscale, filter_clahe, clip_limit_clahe, filter_sub_background, background
	)

	if mask is None:
		mask = np.ones(image_1.shape, dtype=np.uint8)

	if bbox is None:
		height, width = image_1.shape[:2]
		bbox = [0, 0, width, height]

	xtable, ytable, utable, vtable, typevector, _ = piv_fftmulti(
		image_1,
		image_2,
		mask=mask,
		bbox=bbox,
		interrogation_area_1=interrogation_area_1,
		interrogation_area_2=interrogation_area_2,
		mask_auto=mask_auto,
		multipass=multipass,
		standard_filter=standard_filter,
		standard_threshold=standard_threshold,
		median_test_filter=median_test_filter,
		epsilon=epsilon,
		threshold=threshold,
		seeding_filter=seeding_filter,
		step=step,
	)

	results = {
		"shape": xtable.shape,
		"x": xtable.flatten().tolist(),
		"y": ytable.flatten().tolist(),
		"u": utable.flatten().tolist(),
		"v": vtable.flatten().tolist(),
		"typevector": typevector.flatten().tolist(),
	}

	return results


def run_analyze_all(
	images_location: Path,
	mask: Optional[np.ndarray] = None,
	bbox: Optional[list] = None,
	interrogation_area_1: int = 128,
	interrogation_area_2: Optional[int] = None,
	mask_auto: bool = True,
	multipass: bool = True,
	standard_filter: bool = True,
	standard_threshold: int = 4,
	median_test_filter: bool = True,
	epsilon: float = 0.02,
	threshold: int = 2,
	seeding_filter: bool = False,
	step: Optional[int] = None,
	filter_grayscale: bool = True,
	filter_clahe: bool = True,
	clip_limit_clahe: int = 5,
	filter_sub_background: bool = False,
	save_background: bool = True,
	workdir: Optional[Path] = None,
) -> dict:
	"""
	Run PIV analysis on all images in the specified location.

	Parameters:
	images_location : str
	    Path to the directory containing the images.
	mask : np.ndarray, optional
	    The mask for the region of interest. If None, a mask of ones will be created. Default is None.
	bbox : list of float, optional
	    The bounding box for the region of interest as normalized coordinates (x0, y0, x1, y1). Default is None.
	interrogation_area_1: int, optional
	    The size of the interrogation area. Default is 128.
	interrogation_area_2 : int, optional
	    The size of the second interrogation area. Default is None.
	mask_auto : bool, optional
	    Whether to automatically apply a mask. Default is True.
	multipass : bool, optional
	    Whether to use multiple passes. Default is True.
	standard_filter : bool, optional
	    Whether to apply standard deviation filtering. Default is True.
	standard_threshold : float, optional
	    The threshold for standard deviation filtering. Default is 4.
	median_test_filter : bool, optional
	    Whether to apply median test filtering. Default is True.
	epsilon : float, optional
	    The epsilon value for median test filtering. Default is 0.02.
	threshold : float, optional
	    The threshold value for median test filtering. Default is 2.
	seeding_filter : bool, optional
	    Whether to apply seeding filtering. Default is False.
	step : int, optional
	    The step size for grid calculations. Default is None.
	filter_grayscale : bool, optional
	    Whether to convert images to grayscale. Default is True.
	filter_clahe : bool, optional
	    Whether to apply CLAHE filtering. Default is True.
	clip_limit_clahe : int, optional
	    The clip limit for CLAHE. Default is 5.
	filter_sub_background : bool, optional
	    Whether to subtract background. Default is False.
	save_background: bool, optional.
		Whether to save the background image. Default is True.
	workdir: Path, optional.
		The workdir to save the background image. Default is None.

	Returns:
	dict
	    A dictionary containing results such as 'shape', 'x', 'y', 'u_median', 'v_median', 'u', 'v', 'typevector',
	    and 'gradient' (if seeding_filter is True).
	"""
	background = None
	images = sorted(images_location.glob("*.jpg"))
	total_frames = len(images)

	max_workers = multiprocessing.cpu_count()

	first_image = cv2.imread(images[0])
	if mask is None:
		mask = np.ones(first_image.shape, dtype=np.uint8)

	if bbox is None:
		height, width = first_image.shape[:2]
		bbox = [0, 0, width, height]

	chunk_size = int(np.ceil(total_frames / max_workers))

	chunks = [[i, i + chunk_size] for i in range(0, len(images) - 1, chunk_size)]
	chunks[-1][-1] = min(chunks[-1][-1], len(images) - 1)

	if filter_sub_background:
		filter_grayscale = True  # forces to work with grayscale images if filt_sub_backgnd
		background = impp.calculate_average(images_location)
		if save_background:
			if workdir is not None:
				save_path = workdir.joinpath("background.jpg")
			else:
				# Create the folder to save the results
				results_directory_path = images_location.parent.joinpath("results")
				results_directory_path.mkdir(exist_ok=True)
				save_path = results_directory_path.joinpath("background.jpg")
			cv2.imwrite(save_path, background)

	with ThreadPoolExecutor(max_workers=max_workers) as executor:
		futures = [
			executor.submit(
				piv_loop,
				images,
				mask,
				bbox,
				interrogation_area_1,
				interrogation_area_2,
				mask_auto,
				multipass,
				standard_filter,
				standard_threshold,
				median_test_filter,
				epsilon,
				threshold,
				seeding_filter,
				step,
				filter_grayscale,
				filter_clahe,
				clip_limit_clahe,
				filter_sub_background,
				background,
				cur_chunk[0],
				cur_chunk[1],
			)
			for cur_chunk in chunks
		]

		dict_cumul = {
			"u": futures[0].result()["u"],
			"v": futures[0].result()["v"],
			"typevector": futures[0].result()["typevector"],
		}
		if seeding_filter:
			dict_cumul["gradient"] = futures[0].result()["gradient"]

		xtable = futures[0].result()["x"]
		ytable = futures[0].result()["y"]

		for f in range(1, len(futures)):
			dict_cumul["u"] = np.hstack((dict_cumul["u"], futures[f].result()["u"]))
			dict_cumul["v"] = np.hstack((dict_cumul["v"], futures[f].result()["v"]))
			dict_cumul["typevector"] = np.hstack((dict_cumul["typevector"], futures[f].result()["typevector"]))
			if seeding_filter:
				dict_cumul["gradient"] = np.hstack((dict_cumul["gradient"], futures[f].result()["gradient"]))

	# Calculate the median
	u_median = np.nanmedian(dict_cumul["u"], 1)
	v_median = np.nanmedian(dict_cumul["v"], 1)

	results = {
		"shape": xtable.shape,
		"x": xtable.flatten().tolist(),
		"y": ytable.flatten().tolist(),
		"u_median": u_median.tolist(),
		"v_median": v_median.tolist(),
		"u": dict_cumul["u"].T.tolist(),
		"v": dict_cumul["v"].T.tolist(),
		"typevector": dict_cumul["typevector"].T.tolist(),
	}

	if seeding_filter:
		results["gradient"] = dict_cumul["gradient"].T.tolist()

	return results
