"""
File Name: piv_pipeline.py
Project Name: RIVeR-LAC
Description: Perform image filtering before Particle Image Velocimetry (PIV) on a pair of frame (Test) or a list of frames.

Author: Antoine Patalano
Email: antoine.patalano@unc.edu.ar
Company: UNC / ORUS

This script contains functions for processing and analyzing PIV images.
See examples of use at the end
"""

import multiprocessing
import time
from concurrent.futures.thread import ThreadPoolExecutor
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from tqdm import tqdm

import river.core.image_preprocessing as impp
from river.core.exceptions import ReadImageError
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

	mask_piv = np.ones(image_1.shape, dtype=np.uint8)  # must correct this

	if bbox is None:
		height, width = image_1.shape[:2]
		bbox = [0, 0, width, height]

	xtable, ytable, utable, vtable, typevector, _ = piv_fftmulti(
		image_1,
		image_2,
		mask=mask_piv,
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
		step=step,
	)
	# Create in_mask array and check points against the mask
	x_indices = np.clip(xtable.astype(int), 0, mask.shape[1] - 1)
	y_indices = np.clip(ytable.astype(int), 0, mask.shape[0] - 1)
	in_mask = mask[y_indices, x_indices] > 0

	# Set u and v values to NaN where in_mask is False
	utable[~in_mask] = np.nan
	vtable[~in_mask] = np.nan

	results = {
		"shape": xtable.shape,
		"x": xtable.flatten().tolist(),
		"y": ytable.flatten().tolist(),
		"u": utable.flatten().tolist(),
		"v": vtable.flatten().tolist(),
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
	"""
	background = None

	if filter_sub_background:
		filter_grayscale = True  # forces to work with grayscale images if filt_sub_backgnd
		background = impp.calculate_average(images_location)

	images = sorted([str(f) for f in images_location.glob("*.jpg")])
	total_frames = len(images)

	if total_frames == 0:
		raise ReadImageError(f"No JPG images found in {images_location}")

	print(f"Processing {total_frames} frames...")

	# Optimize workers and chunk size
	max_workers = min(multiprocessing.cpu_count(), 8)
	chunk_size = max(5, total_frames // (max_workers * 10))

	# Process first image pair to get expected dimensions
	first_image = cv2.imread(str(images[0]))
	if first_image is None:
		raise ReadImageError(f"Could not read first image: {images[0]}")

	if mask is None:
		mask = np.ones(first_image.shape, dtype=np.uint8)

	if bbox is None:
		height, width = first_image.shape[:2]
		bbox = [0, 0, width, height]

	# Process a test pair to get expected dimensions
	test_result = piv_loop(
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
		step,
		filter_grayscale,
		filter_clahe,
		clip_limit_clahe,
		filter_sub_background,
		background,
		0,
		1,
	)

	expected_size = len(test_result["u"])

	# Calculate chunks and pairs
	chunks = []
	chunk_pairs = []
	for i in range(0, len(images) - 1, chunk_size):
		end = min(i + chunk_size, len(images) - 1)
		chunks.append([i, end])
		for j in range(i, end):
			chunk_pairs.append((j, j + 1))

	if filter_sub_background:
		filter_grayscale = True
		background = impp.calculate_average(images_location)
		if save_background and background is not None:
			if workdir is not None:
				save_path = workdir.joinpath("background.jpg")
			else:
				results_directory_path = Path(images_location).parent.joinpath("results")
				results_directory_path.mkdir(exist_ok=True)
				save_path = results_directory_path.joinpath("background.jpg")
			cv2.imwrite(str(save_path), background)

	pbar = tqdm(total=len(chunk_pairs), desc="Processing image pairs")
	start_time = time.time()

	# Initialize results storage with known size
	dict_cumul = {
		"u": np.zeros((expected_size, 0)),
		"v": np.zeros((expected_size, 0)),
		"typevector": np.zeros((expected_size, 0)),
	}

	dict_cumul["gradient"] = np.zeros((expected_size, 0))

	xtable = test_result["x"]
	ytable = test_result["y"]

	successful_pairs = []
	failed_pairs = []

	with ThreadPoolExecutor(max_workers=max_workers) as executor:
		futures = []
		pair_to_images = {}

		for pair_idx, (img1_idx, img2_idx) in enumerate(chunk_pairs):
			future = executor.submit(
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
				step,
				filter_grayscale,
				filter_clahe,
				clip_limit_clahe,
				filter_sub_background,
				background,
				img1_idx,
				img2_idx,
			)
			futures.append(future)
			pair_to_images[pair_idx] = (images[img1_idx], images[img2_idx])

		try:
			for f, future in enumerate(futures):
				try:
					result = future.result(timeout=60)
					img1, img2 = pair_to_images[f]

					if len(result["u"]) != expected_size:
						failed_pairs.append((Path(img1).name, Path(img2).name))
						continue

					dict_cumul["u"] = np.hstack((dict_cumul["u"], result["u"]))
					dict_cumul["v"] = np.hstack((dict_cumul["v"], result["v"]))
					dict_cumul["typevector"] = np.hstack((dict_cumul["typevector"], result["typevector"]))

					dict_cumul["gradient"] = np.hstack((dict_cumul["gradient"], result["gradient"]))

					successful_pairs.append((Path(img1).name, Path(img2).name))

					pbar.update(1)
					elapsed_time = time.time() - start_time
					pairs_done = f + 1
					avg_time_per_pair = elapsed_time / pairs_done
					remaining_pairs = len(chunk_pairs) - pairs_done
					eta = avg_time_per_pair * remaining_pairs
					pbar.set_postfix({"ETA": f"{eta:.1f}s"})

				except (TimeoutError, Exception):
					img1, img2 = pair_to_images[f]
					failed_pairs.append((Path(img1).name, Path(img2).name))
					continue

		except Exception:
			raise
		finally:
			pbar.close()

	# Calculate medians
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
	}

	results["gradient"] = dict_cumul["gradient"].T.tolist()

	return results
