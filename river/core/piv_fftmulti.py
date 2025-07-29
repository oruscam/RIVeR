"""
File Name: piv_fftmulti.py
Project Name: RIVeR-LAC
Description: Perform Particle Image Velocimetry (PIV) analysis using FFT and multiple passes.

Author: Antoine Patalano
Email: antoine.patalano@unc.edu.ar / contact@orus.cam
Company: UNC / ORUS
www.orus.cam

This script contains functions for processing and analyzing PIV images.
"""

import cv2
import math
from typing import Optional, Tuple

import numpy as np
from scipy import interpolate
from scipy.interpolate import NearestNDInterpolator, Rbf
import scipy.fft as fft
from functools import lru_cache
import os

import pyfftw
# Enable FFTW cache to reuse FFT "plans" (also known as "wisdom")
pyfftw.interfaces.cache.enable()
# Use all available CPU cores for parallel FFT computation
pyfftw.config.NUM_THREADS = os.cpu_count()
# Replace SciPy's FFT backend with pyFFTW's implementation
fft.set_global_backend(pyfftw.interfaces.scipy_fft)

def piv_fftmulti(
	image1: np.ndarray,
	image2: np.ndarray,
	mask: np.ndarray,
	bbox: tuple,
	interrogation_area_1: int,
	interrogation_area_2: Optional[int] = None,
	mask_auto: bool = True,
	multipass: bool = True,
	standard_filter: bool = True,
	standard_threshold: float = 4,
	median_test_filter: bool = True,
	epsilon: float = 0.02,
	threshold: float = 2,
	step: Optional[int] = None,
):
	"""
	Perform Particle Image Velocimetry (PIV) analysis using FFT and multiple passes.

	Parameters:
	image1, image2 : np.ndarray
		The input images for PIV analysis.
	mask : np.ndarray
		The mask for the region of interest.
	bbox : tuple
		The bounding box for the region of interest.
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
	stdt_hreshold: float, optional
		The threshold for standard deviation filtering. Default is 4.
	median_test_filter : bool, optional
		Whether to apply median test filtering. Default is True.
	epsilon : float, optional
		The epsilon value for median test filtering. Default is 0.02.
	threshold : float, optional
		The threshold value for median test filtering. Default is 2.
	seeding_filter : bool, optional
		Whether to apply seeding filtering. Default is True.
	step : int, optional
		The step size for grid calculations. Default is interrogationarea / 2.

	Returns:
	tuple
		Contains xtable, ytable, utable, vtable, typevector, gradient_sum_result representing the displacement vectors on the grid.
	"""
	if interrogation_area_2 is None:
		interrogation_area_2 = interrogation_area_1 / 2
	if step is None:
		step = interrogation_area_1 / 2

	# Crop the images to the region of interest defined by bbox
	image1_roi, image2_roi, mask_roi = process_roi(bbox, image1, image2, mask)
	gen_image1_roi = image1_roi.copy()
	gen_image2_roi = image2_roi.copy()

	# Calculate half the size of the interrogation area
	half_ia = math.ceil(interrogation_area_1 / 2)

	# Calculate bounds and number of elements for the grid
	miniy, minix, maxiy, maxix, numelementsx, numelementsy = calculate_bounds(
		image1_roi.shape, interrogation_area_1, step
	)

	# Pad the images and mask to handle border effects
	image1_roi, image2_roi, mask_pad = pad_images(image1_roi, image2_roi, mask_roi, half_ia)

	# Calculate the sub-pixel offset for the interrogation window
	subpixoffset = calculate_subpixoffset(interrogation_area_1)

	# Generate a sequence of sub-regions (ssn) to be analyzed
	image_roi_height = image1_roi.shape[0]
	ss1 = generate_ssn(
		miniy, maxiy, minix, maxix, step, interrogation_area_1, numelementsy, numelementsx, image_roi_height
	)

	# Extract sub-regions from the images for FFT analysis
	image1_cut = extract_image_subregions(image1_roi, ss1)
	image2_cut = extract_image_subregions(image2_roi, ss1)

	# Compute the convolution of the two sub-regions using FFT
	result_conv = compute_convolution(image1_cut, image2_cut)

	# Apply a Gaussian filter to limit the peak search area if mask_auto is True
	if mask_auto:
		result_conv = apply_gaussian_filter(result_conv, half_ia, subpixoffset)

	# Normalize the convolution results to a range of [0, 255]
	result_conv = normalize_to_uint8(result_conv)

	# Process the convolution results to obtain displacement vectors
	typevector = np.ones((numelementsy, numelementsx))
	xtable, ytable, utable, vtable, typevector, ii_bckup = process_result_conv(
		result_conv, 1 - mask_pad, ss1, interrogation_area_1, step, miniy, maxiy, minix, maxix, typevector, subpixoffset
	)

	# Apply standard deviation filtering to remove outliers if standard_filter is True
	if standard_filter:
		utable, vtable = filter_std(utable, vtable, standard_threshold)

	# Apply median test filtering to remove outliers if median_test_filter is True
	if median_test_filter:
		utable, vtable = filter_fluctuations(utable, vtable, epsilon=epsilon, threshold=threshold)

	# Replace NaN values in utable and vtable with interpolated values
	utable = inpaint_nans(utable)
	vtable = inpaint_nans(vtable)

	# Apply smoothing to the displacement vectors
	utable = smoothn(utable, s=0.0307)
	vtable = smoothn(vtable, s=0.0307)

	# Initialize gradient_sum_result to None
	gradient_sum_result = None

	# Perform a second pass if multipass is True
	if multipass:
		interrogation_area_1 = int(round(interrogation_area_2 / 2) * 2)
		half_ia = math.ceil(interrogation_area_1 / 2)
		step = half_ia

	# Reset the region of interest images for the second pass
	image1_roi = gen_image1_roi.copy()
	image2_roi = gen_image2_roi.copy()

	# Recalculate bounds and number of elements for the new grid
	miniy, minix, maxiy, maxix, numelementsx, numelementsy = calculate_bounds(
		image1_roi.shape, interrogation_area_1, step
	)
	# Pad the images and mask again
	image1_roi, image2_roi, mask_pad = pad_images(image1_roi, image2_roi, mask_roi, half_ia)

	# Recalculate the sub-pixel offset
	subpixoffset = calculate_subpixoffset(interrogation_area_1)

	# Backup the previous tables
	xtable_old = xtable.copy()
	ytable_old = ytable.copy()

	# Interpolate the displacement tables to get a smoother vector field
	X, Y, U, V, utable, vtable = interpolate_tables(
		minix,
		maxix,
		miniy,
		maxiy,
		step,
		numelementsx,
		numelementsy,
		interrogation_area_1,
		xtable_old,
		ytable_old,
		utable,
		vtable,
	)

	# Deform the second image based on the interpolated displacement vectors
	image2_roi_deform, xb, yb = deform_window(X, Y, U, V, image2_roi)

	# Generate a new sequence of sub-regions for the deformed image
	image1_roi_height = image1_roi.shape[0]
	ss1 = generate_ssn(
		miniy, maxiy, minix, maxix, step, interrogation_area_1, numelementsy, numelementsx, image1_roi_height
	)

	image2_roi_height = image2_roi_deform.shape[0]
	ss2 = generate_ssn(
		miniy, maxiy, minix, maxix, step, interrogation_area_1, numelementsy, numelementsx, image2_roi_height, xb, yb
	)

	# Extract sub-regions from the original and deformed images
	image1_cut = extract_image_subregions(image1_roi, ss1)
	image2_cut = extract_image_subregions(image2_roi_deform, ss2)

	# Compute the convolution of the two sub-regions using FFT
	result_conv = compute_convolution(image1_cut, image2_cut)

	# Apply a Gaussian filter to limit the peak search area if mask_auto is True
	if mask_auto:
		result_conv = limit_peak_search_area(result_conv, half_ia, subpixoffset)

	# Normalize the convolution results to a range of [0, 255]
	result_conv = normalize_to_uint8(result_conv)

	# Process the convolution results to obtain displacement vectors
	typevector = np.ones((numelementsy, numelementsx))
	xtable, ytable, utable, vtable, typevector, ii_bckup = process_result_conv(
		result_conv,
		1 - mask_pad,
		ss1,
		interrogation_area_1,
		step,
		miniy,
		maxiy,
		minix,
		maxix,
		typevector,
		subpixoffset,
		utable,
		vtable,
	)

	# Apply standard deviation filtering to remove outliers if standard_filter is True
	if standard_filter:
		utable, vtable = filter_std(utable, vtable, standard_threshold)

	# Apply median test filtering to remove outliers if median_test_filter is True
	if median_test_filter:
		utable, vtable = filter_fluctuations(utable, vtable, epsilon=epsilon, threshold=threshold)

	gradient_sum_result = calculate_gradient(image1_cut, image2_cut, image1_roi, utable, ii_bckup)

	# # Optionally replace NaN values in utable and vtable with interpolated values
	# utable = inpaint_nans(utable)
	# vtable = inpaint_nans(vtable)

	# Apply smoothing to the displacement vectors
	utable = smoothn(utable, s=0.0307)
	vtable = smoothn(vtable, s=0.0307)

	# Adjust xtable and ytable to match the original image coordinates
	xtable = xtable + bbox[0] - half_ia
	ytable = ytable + bbox[1] - half_ia

	return xtable, ytable, utable, vtable, typevector, gradient_sum_result


def rvr_round(x: int) -> int:
	"""
	Round the given value to the nearest integer.

	Parameters:
	value (float): The value to round.

	Returns:
	int: The rounded value.
	"""
	integer = int(x)
	if (x - integer) >= 0.5:
		return math.ceil(x)
	else:
		return math.floor(x)


def rvr_round(x: int) -> int:
	"""
	Round the given value to the nearest integer.

	Parameters:
	value (float): The value to round.

	Returns:
	int: The rounded value.
	"""
	integer = int(x)
	if (x - integer) >= 0.5:
		return math.ceil(x)
	else:
		return math.floor(x)


def process_roi(roi_input: list, image1: np.ndarray, image2: np.ndarray, mask: Optional[np.ndarray] = None) -> tuple:
	"""
	Process regions of interest (ROI) from two images and a mask based on the input coordinates.

	If the length of roi_input is greater than 0, extract the specified ROI from both images and mask.
	Otherwise, process the entire images.

	Parameters:
	roi_input (list): List of ROI coordinates [x, y, width, height].
	image1 (numpy.ndarray): First image to process.
	image2 (numpy.ndarray): Second image to process.
	mask (numpy.ndarray, optional): Mask to process along with image1 and image2. Defaults to None.

	Returns:
	tuple: A tuple containing the ROIs of image1, image2, and the cropped mask (if provided).
	"""
	if len(roi_input) > 0:
		xroi = int(rvr_round(roi_input[0]))
		yroi = int(rvr_round(roi_input[1]))
		widthroi = int(np.ceil(roi_input[2]))
		heightroi = int(np.ceil(roi_input[3]))
		image1_roi = np.float32(image1[yroi : yroi + heightroi, xroi : xroi + widthroi])
		image2_roi = np.float32(image2[yroi : yroi + heightroi, xroi : xroi + widthroi])
		if mask is not None:
			mask_roi = mask[yroi : yroi + heightroi, xroi : xroi + widthroi]
		else:
			mask_roi = None
	else:
		image1_roi = np.float32(image1)
		image2_roi = np.float32(image2)
		mask_roi = mask  # If mask is None, this will just return None

	return image1_roi, image2_roi, mask_roi


def calculate_bounds(image_shape: tuple, interrogation_area: int, step: int) -> tuple:
	# Calculate minimum bounds
	half_ia = math.ceil(interrogation_area / 2)
	miniy = 1 + half_ia
	minix = 1 + half_ia

	# Calculate maximum bounds
	maxiy = step * (math.floor(image_shape[0] / step)) - (interrogation_area - 1) + half_ia
	maxix = step * (math.floor(image_shape[1] / step)) - (interrogation_area - 1) + half_ia

	# Calculate number of elements
	numelementsx = math.floor((maxix - minix) / step + 1)
	numelementsy = math.floor((maxiy - miniy) / step + 1)

	# Calculate left and upper bounds
	lay = miniy
	lax = minix
	luy = image_shape[0] - maxiy
	lux = image_shape[1] - maxix

	# Compute shift for centering
	shift4centery = rvr_round((luy - lay) / 2)
	shift4centerx = rvr_round((lux - lax) / 2)

	# Ensure shifts are non-negative
	shift4centery = max(shift4centery, 0)
	shift4centerx = max(shift4centerx, 0)

	# Adjust bounds
	miniy += shift4centery
	minix += shift4centerx
	maxix += shift4centerx
	maxiy += shift4centery

	return miniy, minix, maxiy, maxix, numelementsx, numelementsy


def pad_images(image1_roi: np.ndarray, image2_roi: np.ndarray, mask_roi: np.ndarray, half_ia: int) -> tuple:
	"""
	Pad images and mask with a constant value derived from image1_roi.

	Parameters:
	image1_roi (numpy.ndarray): First image region of interest.
	image2_roi (numpy.ndarray): Second image region of interest.
	mask_roi (numpy.ndarray): mask region of interest.
	interrogationarea (int): Size of the interrogation area.

	Returns:
	tuple: A tuple containing padded image1_roi, image2_roi, and mask.
	"""
	# Determine the padding size based on interrogationarea
	fill = int(half_ia)

	# Determine the minimum value in image1_roi
	minimum = np.min(image1_roi)

	# Pad all arrays with the determined fill and constant_values=minimum for images, 0 for mask
	image1_roi = np.pad(image1_roi, pad_width=fill, mode="constant", constant_values=minimum)
	image2_roi = np.pad(image2_roi, pad_width=fill, mode="constant", constant_values=minimum)
	mask_roi = np.pad(mask_roi, pad_width=fill, mode="constant", constant_values=0)

	return image1_roi, image2_roi, mask_roi


def calculate_subpixoffset(interrogation_area: int) -> float:
	"""
	Calculate the sub-pixel offset based on the size of the interrogation area.

	Parameters:
	interrogation_area (int): Size of the interrogation area.

	Returns:
	float: The sub-pixel offset.
	"""
	if interrogation_area % 2 == 0:
		subpixoffset = 1.0
	else:
		subpixoffset = 0.5

	return subpixoffset


def selective_indexing(image: np.ndarray, index_matrix: np.ndarray, n: tuple) -> np.ndarray:
	"""
	Extract sub-regions from an image using an index matrix.

	Parameters:
	image (numpy.ndarray): The input image from which to extract sub-regions.
	index_matrix (numpy.ndarray): The matrix of indices specifying sub-regions.
	n (tuple): The shape of the image.

	Returns:
	numpy.ndarray: Extracted sub-regions from the input image.
	"""
	index_matrix = index_matrix - 1
	index_matrix_aux = np.unravel_index(index_matrix.astype(int), n, order="F")
	image_cut = image[index_matrix_aux]
	return image_cut

def generate_ssn(
	miniy: int,
	maxiy: int,
	minix: int,
	maxix: int,
	step: int,
	interrogation_area: int,
	num_elements_y: int,
	num_elements_x: int,
	image_height: int,
	xb: Optional[np.ndarray] = None,
	yb: Optional[np.ndarray] = None,
) -> np.ndarray:
	"""
	Generate the ss1 indexing array (optimized version).

	Parameters:
	miniy (int): Minimum y-coordinate.
	maxiy (int): Maximum y-coordinate.
	minix (int): Minimum x-coordinate.
	maxix (int): Maximum x-coordinate.
	step (int): Step size for the grid.
	interrogation_area (int): Size of the interrogation area.
	num_elements_y (int): Number of elements in y-direction.
	num_elements_x (int): Number of elements in x-direction.
	image_height (int): Height of the image.
	xb (numpy.ndarray or None, optional): X indices. Defaults to None.
	yb (numpy.ndarray or None, optional): Y indices. Defaults to None.

	Returns:
	numpy.ndarray: The ss1 array used for indexing.
	"""
	if xb is None or yb is None:
		y_indices = np.arange(miniy, maxiy + 1, step)[:, None] - 1
		x_indices = (np.arange(minix, maxix + 1, step) - 1) * image_height
	else:
		y_indices = yb - step + step * np.arange(1, num_elements_y + 1)
		y_indices = y_indices[:, None] - 1
		x_indices = xb - step + step * np.arange(1, num_elements_x + 1) - 1
		x_indices = x_indices * image_height

	s0 = (np.tile(y_indices, (1, num_elements_x)) +
	      np.tile(x_indices, (num_elements_y, 1))).T

	s0 = s0.reshape(-1, order="F")[:, None, None]
	s0 = np.transpose(s0, (1, 2, 0))

	temp = np.arange(1, interrogation_area + 1)
	s1 = (temp[:, None] + (temp[None, :] - 1) * image_height)[:, :, None]

	ss1 = s1 + s0

	return ss1


def extract_image_subregions(image: np.ndarray, ss1: np.ndarray) -> np.ndarray:
	"""
	Extract sub-regions from an image using precomputed linear indices.

	It mimics MATLAB-style column-major linear indexing to retrieve
	each interrogation window from the image.

	Parameters:
	image : np.ndarray
		2D image from which interrogation windows are extracted.
	ss1 : np.ndarray
		3D array of 1-based linear indices defining the pixel positions for each
		sub-region (window), shaped as (ia1, ia2, N) where N is the number of windows.

	Returns:
	np.ndarray
		Extracted sub-regions from the input image with shape (ia1, ia2, N).
		Each window retains the original data type of `image`.
	"""

	# Flatten the image in column-major (Fortran) order to match MATLAB indexing
	image_flat = image.ravel(order='F')

	# Convert 1-based indices (MATLAB-style) to 0-based (Python-style)
	# Then use fancy indexing to extract pixel values
	out = image_flat[(ss1.astype(np.intp) - 1)]

	# Output has the shape (ia1, ia2, N), matching the indexing layout
	return out


def compute_convolution(image1_cut: np.ndarray, image2_cut: np.ndarray) -> np.ndarray:
	"""
	Compute cross-correlation for each interrogation window using FFT.

	This function calculates the cross-correlation between corresponding interrogation windows
	from two input image stacks using a batched FFT approach. The result is a set of correlation
	maps with the zero-lag peak centered.

	Parameters:
	image1_cut : np.ndarray
		First stack of interrogation windows. Shape: (ia, ia, N).
	image2_cut : np.ndarray
		Second stack of interrogation windows. Shape: (ia, ia, N).

	Returns:
	np.ndarray
		A 3D array of cross-correlation results. Shape: (ia, ia, N), dtype: float32.
		Each slice along the third dimension corresponds to one interrogation window.
	"""

	# Move window index to axis 0 for batched FFT: shape becomes (N, ia, ia)
	a = np.moveaxis(image1_cut, -1, 0).astype(np.float32, copy=False)
	b = np.moveaxis(image2_cut, -1, 0).astype(np.float32, copy=False)

	# Compute real-to-complex FFTs along the last two axes
	Fa = fft.rfftn(a, axes=(-2, -1))
	Fb = fft.rfftn(b, axes=(-2, -1))

	# Perform element-wise complex multiplication and compute inverse FFT
	corr = fft.irfftn(np.conj(Fa) * Fb, s=a.shape[-2:], axes=(-2, -1))

	# Center the zero-lag peak and restore original layout (ia, ia, N)
	corr = np.fft.fftshift(corr, axes=(-2, -1))
	corr = np.moveaxis(corr, 0, -1)

	return corr.astype(np.float32, copy=False)

def fspecial_gauss(shape: tuple = (3, 3), sigma: float = 1.5) -> np.ndarray:
	"""
	Create a 2D Gaussian mask.

	Parameters:
	shape (tuple): The shape of the Gaussian mask.
	sigma (float): The standard deviation of the Gaussian.

	Returns:
	numpy.ndarray: The Gaussian mask.
	"""
	m, n = [(ss - 1.0) / 2.0 for ss in shape]
	y, x = np.ogrid[-m : m + 1, -n : n + 1]
	h = np.exp(-(x * x + y * y) / (2.0 * sigma * sigma))
	h[h < np.finfo(h.dtype).eps * h.max()] = 0
	sumh = h.sum()
	if sumh != 0:
		h /= sumh
	return h


def apply_gaussian_filter(result_conv: np.ndarray, half_ia: int, subpixoffset: float) -> np.ndarray:
	"""
	Apply a Gaussian filter to a sub-region of the result convolution matrix.

	Parameters:
	result_conv (numpy.ndarray): The result of the convolution.
	interrogationarea (int): The size of the interrogation area.
	subpixoffset (float): The subpixel offset.

	Returns:
	numpy.ndarray: The updated result_conv after applying the Gaussian filter.
	"""
	h = fspecial_gauss([3, 3], 1.5)
	h = h / h[1, 1]
	h = 1 - h

	h = np.repeat(h[:, :, np.newaxis], result_conv.shape[2], axis=2)

	start = int(half_ia + subpixoffset - 1) - 1
	end = int(half_ia + subpixoffset + 1)

	h = np.multiply(h, result_conv[start:end, start:end, :])

	result_conv[start:end, start:end, :] = h

	return result_conv


def fspecial_disk() -> np.ndarray:
	return np.array(
		[
			[
				0,
				0,
				0.0477750257157819,
				0.361469237632242,
				0.489558781987489,
				0.361469237632242,
				0.0477750257157819,
				0,
				0,
			],
			[0, 0.208018589368669, 0.900152358153484, 1, 1, 1, 0.900152358153484, 0.208018589368669, 0],
			[0.0477750257157819, 0.900152358153484, 1, 1, 1, 1, 1, 0.900152358153484, 0.0477750257157819],
			[0.361469237632242, 1, 1, 1, 1, 1, 1, 1, 0.361469237632242],
			[0.489558781987489, 1, 1, 1, 1, 1, 1, 1, 0.489558781987489],
			[0.361469237632242, 1, 1, 1, 1, 1, 1, 1, 0.361469237632242],
			[0.0477750257157819, 0.900152358153484, 1, 1, 1, 1, 1, 0.900152358153484, 0.0477750257157819],
			[0, 0.208018589368669, 0.900152358153484, 1, 1, 1, 0.900152358153484, 0.208018589368669, 0],
			[
				0,
				0,
				0.0477750257157819,
				0.361469237632242,
				0.489558781987489,
				0.361469237632242,
				0.0477750257157819,
				0,
				0,
			],
		]
	)


def limit_peak_search_area(result_conv: np.ndarray, half_ia: int, subpixoffset: float) -> np.ndarray:
	"""
	Limit peak search area using a disk-shaped filter.

	Parameters:
	result_conv (numpy.ndarray): Convolution result.
	interrogationarea (int): Size of the interrogation area.
	subpixoffset (float): Subpixel offset.

	Returns:
	numpy.ndarray: Convolution result after limiting peak search area.
	"""
	# Create an empty matrix of zeros with the same shape as result_conv
	emptymatrix = np.zeros((result_conv.shape[0], result_conv.shape[1], result_conv.shape[2]))

	# Size of the disk filter
	sizeones = 4

	# Create a disk-shaped filter using fspecial_disk function (assumed to be imported)
	h = fspecial_disk()  # Assuming it's equivalent to Matlab's fspecial('disk', 4)
	h = np.repeat(h[:, :, np.newaxis], result_conv.shape[2], axis=2)

	# Define the region in emptymatrix where the disk filter will be applied
	start = int((half_ia) + subpixoffset - sizeones) - 1
	end = int((half_ia) + subpixoffset + sizeones)
	emptymatrix[start:end, start:end, :] = h

	# Apply the disk filter to result_conv
	result_conv = np.multiply(result_conv, emptymatrix)

	return result_conv


def normalize_to_uint8(result_conv: np.ndarray) -> np.ndarray:
	"""
	Normalize the values in result_conv to a range of [0, 255] for each slice along the third dimension.

	Parameters:
	result_conv (numpy.ndarray): The array to be normalized.

	Returns:
	numpy.ndarray: The normalized array with values in the range [0, 255].
	"""
	# Compute min and max per channel (along height and width)
	minres = np.amin(result_conv, axis=(0, 1))
	maxres = np.amax(result_conv, axis=(0, 1))
	deltares = maxres - minres + 1e-10  # Add epsilon to avoid division by zero

	# Reshape for broadcasting
	minres = minres[np.newaxis, np.newaxis, :]
	deltares = deltares[np.newaxis, np.newaxis, :]

	# Normalize and scale
	normalized = ((result_conv - minres) / deltares) * 255

	return normalized.astype(np.uint8)


def subpixgauss(
	result_conv: np.ndarray, half_ia: int, x1: np.ndarray, y1: np.ndarray, z1: np.ndarray, subpixoffset: float
) -> np.ndarray:
	"""
	Perform subpixel Gaussian peak fitting on a convolution result with size consistency checks.

	Parameters:
	result_conv (numpy.ndarray): 3D array of convolution results.
	half_ia (int): Half size of the interrogation area.
	x1, y1, z1 (numpy.ndarray): Arrays of coordinates.
	subpixoffset (float): Subpixel offset value.

	Returns:
	numpy.ndarray: Array of subpixel peak coordinates (x, y).
	"""
	dims = result_conv.shape
	expected_size = dims[2]
	vector = np.zeros((expected_size, 2))

	if x1.size == 0:
		return vector

	# Convert arrays to float type before padding
	x1 = x1.astype(float)
	y1 = y1.astype(float)
	z1 = z1.astype(float)

	# Make sure our arrays are the right size
	if len(x1) != expected_size:
		if len(x1) < expected_size:
			x1 = np.pad(x1, (0, expected_size - len(x1)), mode="constant", constant_values=-1)
			y1 = np.pad(y1, (0, expected_size - len(y1)), mode="constant", constant_values=-1)
			z1 = np.pad(z1, (0, expected_size - len(z1)), mode="constant", constant_values=-1)
		else:
			x1 = x1[:expected_size]
			y1 = y1[:expected_size]
			z1 = z1[:expected_size]

	try:
		# Create mask for valid values (not -1)
		valid_mask = (x1 != -1) & (y1 != -1) & (z1 != -1)
		valid_indices = np.where(valid_mask)[0]

		if len(valid_indices) == 0:
			return vector

		# Calculate indices for valid values only
		indices = np.ravel_multi_index(
			(y1[valid_mask].astype(int) - 1, x1[valid_mask].astype(int) - 1, z1[valid_mask].astype(int) - 1),
			dims,
			order="F",
		)

		# Compute log values efficiently for valid indices
		flat_conv = result_conv.ravel("F")
		f0 = np.log(flat_conv[indices])
		f1y = np.log(flat_conv[indices - 1])
		f2y = np.log(flat_conv[indices + 1])
		f1x = np.log(flat_conv[indices - dims[0]])
		f2x = np.log(flat_conv[indices + dims[0]])

		# Vectorized peak calculations
		peaky = y1[valid_mask] + (f1y - f2y) / (2 * f1y - 4 * f0 + 2 * f2y)
		peakx = x1[valid_mask] + (f1x - f2x) / (2 * f1x - 4 * f0 + 2 * f2x)

		# Initialize full size arrays with zeros
		full_peakx = np.zeros(expected_size)
		full_peaky = np.zeros(expected_size)

		# Assign calculated peaks to their proper positions
		full_peakx[valid_indices] = peakx - half_ia - subpixoffset
		full_peaky[valid_indices] = peaky - half_ia - subpixoffset

		# Assign to output vector
		vector[:, 0] = full_peakx
		vector[:, 1] = full_peaky

	except Exception:
		raise

	return vector


def process_result_conv(
	result_conv: np.ndarray,
	mask_pad: np.ndarray,
	ss1: np.ndarray,
	interrogation_area: int,
	step: int,
	miniy: int,
	maxiy: int,
	minix: int,
	maxix: int,
	type_vector: np.ndarray,
	sub_pix_offset: float,
	utable: Optional[np.ndarray] = None,
	vtable: Optional[np.ndarray] = None,
):
	"""
	Process the result_conv matrix to create a vector matrix representing displacement vectors.

	Parameters:
	result_conv (numpy.ndarray): The result convolution matrix.
	mask_pad (numpy.ndarray): The mask array.
	ss1 (numpy.ndarray): The ss1 array used for indexing.
	interrogation_area (int): The size of the interrogation area.
	step (int): The step size for grid calculations.
	miniy (int): The minimum y index for the grid.
	maxiy (int): The maximum y index for the grid.
	minix (int): The minimum x index for the grid.
	maxix (int): The maximum x index for the grid.
	type_vector (numpy.ndarray): The type vector to update.
	sub_pix_offset (float): The subpixel offset value.
	utable (numpy.ndarray, optional): The u displacement vector table to update.
	vtable (numpy.ndarray, optional): The v displacement vector table to update.


	Returns:
	tuple: Contains xtable, ytable, utable, vtable, typevector representing the displacement vectors on the grid.
	"""
	half_ia = math.ceil(interrogation_area / 2)
	ii_temp = ss1[int(round(half_ia + 1)), int(round(half_ia + 1)), :]
	ii = selective_indexing(mask_pad, ii_temp, mask_pad.shape)
	ii_bckup = ii.copy()
	ii = np.flatnonzero(ii)

	vect_ind1 = (np.arange(miniy, maxiy + 1, step) + round(half_ia) - 1).astype(np.intp)
	vect_ind2 = (np.arange(minix, maxix + 1, step) + round(half_ia) - 1).astype(np.intp)
	jj = np.nonzero(mask_pad[vect_ind1[:, np.newaxis], vect_ind2])

	type_vector[jj[0], jj[1]] = 0
	result_conv[:, :, ii] = 0

	result_conv_flat = np.reshape(result_conv, -1, order="F")
	indices = np.flatnonzero(result_conv_flat == 255)
	indices = np.unravel_index(indices, result_conv.shape, order="F")
	y = indices[0] + 1
	x = indices[1] + 1
	z = indices[2] + 1

	z1 = np.sort(z, kind="mergesort")
	zi = np.argsort(z, kind="mergesort")
	dz1 = abs(np.diff(z1))
	dz1 = np.insert(dz1, 0, z1[0])
	i0 = np.flatnonzero(dz1)
	x1 = x[zi[i0]]
	y1 = y[zi[i0]]
	z1 = z[zi[i0]]

	arrx_aux = np.arange(minix, maxix + 1, step) + half_ia
	arry_aux = np.arange(miniy, maxiy + 1, step)
	xtable = np.tile(arrx_aux, (arry_aux.shape[0], 1))
	arry_aux = arry_aux + half_ia
	arry_aux = arry_aux[:, np.newaxis]
	arrx_aux = arrx_aux - half_ia
	ytable = np.tile(arry_aux, (1, arrx_aux.shape[0]))

	vector = subpixgauss(result_conv, half_ia, x1, y1, z1, sub_pix_offset)
	xtable_aux = xtable.transpose()
	vector = vector.reshape((xtable_aux.shape[0], xtable_aux.shape[1], 2), order="F")
	vector = vector.transpose(1, 0, 2)

	if utable is None:
		utable = np.zeros((xtable.shape[0], xtable.shape[1]), dtype=float)
		vtable = np.zeros((ytable.shape[0], ytable.shape[1]), dtype=float)

	utable += vector[:, :, 0].astype(float)
	vtable += vector[:, :, 1].astype(float)

	return xtable, ytable, utable, vtable, type_vector, ii_bckup


def filter_std(utable: np.ndarray, vtable: np.ndarray, standard_threshold: float = 4.0) -> tuple:
	"""
	Filter outliers in utable and vtable based on mean and standard deviation.

	Parameters:
	utable (numpy.ndarray): 2D array of u-values.
	vtable (numpy.ndarray): 2D array of v-values.
	standard_threshold (float): Standard deviation threshold for filtering.

	Returns:
	tuple: Filtered utable and vtable with outliers replaced by NaN.
	"""

	meanu = np.nanmean(utable)
	meanv = np.nanmean(vtable)

	std2u = np.nanstd(utable, ddof=1)
	std2v = np.nanstd(vtable, ddof=1)

	minvalu = meanu - standard_threshold * std2u
	maxvalu = meanu + standard_threshold * std2u
	minvalv = meanv - standard_threshold * std2v
	maxvalv = meanv + standard_threshold * std2v

	utable[utable < minvalu] = np.nan
	utable[utable > maxvalu] = np.nan
	vtable[vtable < minvalv] = np.nan
	vtable[vtable > maxvalv] = np.nan

	return utable, vtable


def filter_fluctuations(
	utable: np.ndarray, vtable: np.ndarray, b: int = 1, epsilon: float = 0.02, threshold: float = 2.0
) -> tuple:
	"""
	Detect and filter outliers in velocity components based on normalized fluctuations.

	Parameters:
	utable (numpy.ndarray): 2D array of u-values.
	vtable (numpy.ndarray): 2D array of v-values.
	b (int): Border size for neighborhood calculation (default is 1).
	epsilon (float): Small value to avoid division by zero (default is 1e-5).
	threshold (float): Threshold for detecting outliers (default is 1.0).

	Returns:
	tuple: Filtered utable and vtable with outliers replaced by NaN.
	"""

	J, I = utable.shape
	normfluct = np.zeros((J, I, 2))

	for c in range(1, 3):
		if c == 1:
			velcomp = utable
		else:
			velcomp = vtable

		neigh = np.zeros((velcomp.shape[0] - 2 * b, velcomp.shape[1] - 2 * b, 2 * b + 1, 2 * b + 1))
		for ii in range(-b, b + 1):
			for jj in range(-b, b + 1):
				neigh[:, :, ii + b, jj + b] = velcomp[
					b + ii : velcomp.shape[0] - b + ii, b + jj : velcomp.shape[1] - b + jj
				]

		tercera_dim = (2 * b + 1) ** 2
		neighcol = np.reshape(neigh, (neigh.shape[0], neigh.shape[1], tercera_dim), order="F")
		vector_recorrido = np.arange(1, (2 * b + 1) * b + b + 1)
		vector_recorrido = np.append(vector_recorrido, np.arange((2 * b + 1) * b + b + 2, tercera_dim + 1))
		vector_recorrido = (vector_recorrido - 1).astype(int).tolist()
		neighcol2 = neighcol[:, :, vector_recorrido]
		neighcol2 = np.transpose(neighcol2, (2, 0, 1))
		med = np.median(neighcol2, axis=0)
		velcomp = velcomp[b : velcomp.shape[0] - b, b : velcomp.shape[1] - b]
		fluct = velcomp - med
		res = neighcol2 - np.tile(med, (tercera_dim - 1, 1, 1))
		medianres = np.median(abs(res), axis=0, overwrite_input=True)
		normfluct[b : normfluct.shape[0] - b, b : normfluct.shape[1] - b, c - 1] = abs(fluct / (medianres + epsilon))

	info1 = np.power(normfluct[:, :, 0], 2) + np.power(normfluct[:, :, 1], 2)
	info1 = np.sqrt(info1) > threshold
	utable[info1] = np.nan
	vtable[info1] = np.nan

	return utable, vtable


def inpaint_nans(img_float):
	n, m = img_float.shape
	nm = n * m

	valid_mask = ~np.isnan(img_float)
	coords = np.array(np.nonzero(valid_mask)).T
	values = img_float[valid_mask]

	nan_mask = np.isnan(img_float)
	nan_coords = np.array(np.nonzero(nan_mask)).T

	if len(coords) > 0:
		# Use cubic function for RBF
		rbf = Rbf(coords[:, 0], coords[:, 1], values, function="cubic")
		interpolated_cubic = rbf(nan_coords[:, 0], nan_coords[:, 1])

		# Use inverse with even smaller epsilon
		rbf_inv = Rbf(coords[:, 0], coords[:, 1], values, function="inverse", epsilon=1.5)
		interpolated_inv = rbf_inv(nan_coords[:, 0], nan_coords[:, 1])

		nn = NearestNDInterpolator(coords, values)
		nn_values = nn(nan_coords)

		# Much more aggressive weight changes
		alpha = 0.75  # Significantly increased cubic weight
		beta = 0.24  # Decreased inverse weight
		gamma = 0.01  # Minimal nearest neighbor influence
		interpolated = alpha * interpolated_cubic + beta * interpolated_inv + gamma * nn_values

		out = img_float.copy()
		out[nan_mask] = interpolated

		out = out.T.reshape([nm, 1])
		out = out.reshape(m, n).T

		return out
	else:
		return img_float


def interpgrade(table):
	if table.size > 3:
		return 3
	else:
		return table.size - 1


def interpolate_tables(
	minix: int,
	maxix: int,
	miniy: int,
	maxiy: int,
	step: int,
	numelementsx: int,
	numelementsy: int,
	interrogation_area: float,
	xtable_old: np.ndarray,
	ytable_old: np.ndarray,
	utable: np.ndarray,
	vtable: np.ndarray,
) -> tuple:
	"""
	Interpolate tables for interpolation and padding.

	Parameters:
	minix, maxix, miniy, maxiy : int
		The minimum and maximum values for the x and y ranges.
	step : int
		The step size for creating the ranges.
	numelementsx, numelementsy : int
		The number of elements in the x and y directions.
	interrogation_area : float
		The interrogation area size.
	xtable_old, ytable_old : np.ndarray
		Old tables for x and y.
	utable, vtable : np.ndarray
		Tables to be interpolated.

	Returns:
	xtable_1, ytable_1 : np.ndarray
		Padded tables for x and y after interpolation and padding.
	utable_1, vtable_1 : np.ndarray
		Interpolated and padded displacement vector tables.
	utable, vtable : np.ndarray
		Interpolated displacement vector tables.

	"""
	# Create the x and y tables
	xtable = np.tile(np.arange(minix, maxix + 1, step), (numelementsy, 1)) + interrogation_area / 2
	ytable = np.tile(np.arange(miniy, maxiy + 1, step)[:, np.newaxis], (1, numelementsx)) + interrogation_area / 2

	# Extracting parameters
	xtable_old_param = xtable_old[0, :]
	ytable_old_param = ytable_old[:, 0]
	xtable_param = xtable[0, :]
	ytable_param = ytable[:, 0]

	# Interpolation grades
	KX = interpgrade(ytable_old_param)
	KY = interpgrade(xtable_old_param)

	# Interpolate utable
	funct_interp = interpolate.RectBivariateSpline(
		ytable_old_param,
		xtable_old_param,
		utable,
		bbox=[ytable_param[0], ytable_param[-1], xtable_param[0], xtable_param[-1]],
		kx=KX,
		ky=KY,
	)
	utable = funct_interp(ytable_param, xtable_param)

	# Interpolate vtable
	funct_interp = interpolate.RectBivariateSpline(
		ytable_old_param,
		xtable_old_param,
		vtable,
		bbox=[ytable_param[0], ytable_param[-1], xtable_param[0], xtable_param[-1]],
		kx=KX,
		ky=KY,
	)
	vtable = funct_interp(ytable_param, xtable_param)

	# Pad utable and vtable
	utable_1 = np.pad(utable, ((1, 1), (1, 1)), "edge")
	vtable_1 = np.pad(vtable, ((1, 1), (1, 1)), "edge")

	# Add a line around the image for border regions using linear extrapolation
	firstlinex = xtable[0, :]
	firstlinex_intp_func = interpolate.interp1d(
		np.arange(1, firstlinex.shape[0] + 1, 1), firstlinex, kind="linear", fill_value="extrapolate"
	)
	firstlinex_intp = firstlinex_intp_func(np.arange(0, firstlinex.shape[0] + 2, 1))
	xtable_1 = np.tile(firstlinex_intp, (xtable.shape[0] + 2, 1))

	firstliney = ytable[:, 0]
	firstliney_intp_func = interpolate.interp1d(
		np.arange(1, firstliney.shape[0] + 1, 1), firstliney, kind="linear", fill_value="extrapolate"
	)
	firstliney_intp = firstliney_intp_func(np.arange(0, firstliney.shape[0] + 2, 1))
	firstliney_intp = firstliney_intp[:, np.newaxis]
	ytable_1 = np.tile(firstliney_intp, (1, ytable.shape[1] + 2))

	return xtable_1, ytable_1, utable_1, vtable_1, utable, vtable

def deform_window(
	X: np.ndarray,
	Y: np.ndarray,
	U: np.ndarray,
	V: np.ndarray,
	image2_roi: np.ndarray
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
	"""
	Deform the second ROI image using interpolated displacement fields.

	This function replicates the behavior of RegularGridInterpolator-based.
	It performs bilinear interpolation to upsample displacement
	fields and uses OpenCV to remap the image accordingly.

	Parameters:
	X, Y : np.ndarray
		Grid coordinates for the coarse displacement field (usually from meshgrid).
	U, V : np.ndarray
		Displacement fields (horizontal and vertical).
	image2_roi : np.ndarray
		The second ROI image to be deformed based on U and V.

	Returns:
	tuple
		warped : np.ndarray
			The deformed version of image2_roi.
		xb, yb : np.ndarray
			Placeholder grid origin indices (always [1] for compatibility).
	"""

	# -------------------------------------------------------------------------
	# 1. Create the fine pixel grid for remapping
	# -------------------------------------------------------------------------
	x0 = int(round(X[0, 0]))
	x1 = int(round(X[0, -1]))   # exclusive
	y0 = int(round(Y[0, 0]))
	y1 = int(round(Y[-1, 0]))   # exclusive

	x1d = np.arange(x0, x1, dtype=np.float32)  # Width coordinates
	y1d = np.arange(y0, y1, dtype=np.float32)  # Height coordinates
	W = x1d.size
	H = y1d.size

	# Create meshgrid for destination coordinates
	xx, yy = np.meshgrid(x1d, y1d, indexing='xy')  # shape (H, W)

	# -------------------------------------------------------------------------
	# 2. Upsample displacement fields (bilinear interpolation)
	# -------------------------------------------------------------------------
	target_size = (W, H)  # OpenCV expects (width, height)
	U_fine = cv2.resize(U.astype(np.float32), target_size, interpolation=cv2.INTER_LINEAR)
	V_fine = cv2.resize(V.astype(np.float32), target_size, interpolation=cv2.INTER_LINEAR)

	# -------------------------------------------------------------------------
	# 3. Apply displacement to build remapping coordinates
	# -------------------------------------------------------------------------
	map_x = (xx + U_fine - 1).astype(np.float32)
	map_y = (yy + V_fine - 1).astype(np.float32)

	# Use OpenCV remap to deform the image
	warped = cv2.remap(
		image2_roi.astype(np.float32),
		map_x, map_y,
		interpolation=cv2.INTER_LINEAR,
		borderMode=cv2.BORDER_REPLICATE
	)

	# -------------------------------------------------------------------------
	# 4. Return placeholder grid alignment indices
	# -------------------------------------------------------------------------
	xb = np.array([1], dtype=np.int32)
	yb = np.array([1], dtype=np.int32)

	return warped, xb, yb


def calculate_gradient(
	image1_cut: np.ndarray, image2_cut: np.ndarray, image1_roi: np.ndarray, utable: np.ndarray, ii_backup: int | list
) -> np.ndarray:
	"""
	Calculate the gradient of the combined images with respect to image1_roi.

	Parameters:
	image1_cut : np.ndarray
		The sub-regions of the first image.
	image2_cut : np.ndarray
		The sub-regions of the second image.
	image1_roi : np.ndarray
		The region of interest from the first image.
	utable : np.ndarray
		The displacement vectors for the x-direction. This should be a 2D array representing the grid of
		displacement vectors.
	ii_backup : list of int
		The indices of the slices or regions where gradient values should be set to NaN. This is used to
		exclude certain regions from the gradient calculation.

	Returns:
	np.ndarray
		The sum of gradients for each displacement vector, adjusted for NaN values where specified by ii_backup.
		The output is reshaped to match the dimensions of utable and transposed to align with expected output format.
	"""
	# Combine images
	combined_image = image1_cut.astype(np.float32) + image2_cut.astype(np.float32)

	# Divide by the max of image1_roi along axes 0 and 1
	combined_image /= np.max(image1_roi, axis=(0, 1))

	# Compute gradients gx and gy
	gx = np.diff(combined_image, axis=1)
	gx = np.pad(gx, ((0, 0), (0, 1), (0, 0)), mode="edge")

	gy = np.diff(combined_image, axis=0)
	gy = np.pad(gy, ((0, 1), (0, 0), (0, 0)), mode="edge")

	gradient_sum = np.abs(gx) + np.abs(gy)

	# Sum gradients
	gradient_sum_result = np.sum(gradient_sum, axis=(0, 1))

	# Set the ii_bckup-th slice to NaN
	gradient_sum_result[ii_backup] = np.nan

	# Reshape gradient_sum_result
	gradient_sum_result = gradient_sum_result.reshape((utable.shape[0], utable.shape[1]))

	return gradient_sum_result

@lru_cache(maxsize=16)
def _gamma(shape: Tuple[int, ...],
           axis: Tuple[int, ...],
           s: float,
           order: float,
           dtype) -> np.ndarray:
    """Return Γ for the given configuration (cached)."""
    Lambda = np.zeros(shape, dtype=dtype)
    for ax in axis:
        n = shape[ax]
        vec = np.cos(np.pi*np.arange(n, dtype=dtype)/n)
        Lambda += vec.reshape(([1]*ax)+[n]+[1]*(len(shape)-ax-1))
    Lambda = -2.0 * (len(axis) - Lambda)
    return 1.0 / (1.0 + (s*np.abs(Lambda))**order)

def smoothn(y: np.ndarray,
            *,
            s: float,
            axis: Optional[Tuple[int, ...]] = None,
            smoothOrder: float = 2.0) -> np.ndarray:
    """
    N-dimensional smoothing with DCT regularisation (≈ MATLAB smoothn).
    NaNs are ignored and re-inserted.

    Parameters
    ----------
    y : ndarray
        Data to be smoothed (NaNs allowed).
    s : float
        Smoothing parameter (larger ⇒ smoother).
    axis : tuple[int], optional
        Axes along which to smooth (default: all).
    smoothOrder : float, default 2.0
        Regularisation order.

    Returns
    -------
    ndarray
        Smoothed array.
    """
    if s is None:
        raise ValueError("`s` (smoothing parameter) must be provided")

    # ---- preparation -----------------------------------------------------
    if not np.issubdtype(y.dtype, np.floating):
        y = y.astype(np.float32, copy=False)
    axis = tuple(range(y.ndim)) if axis is None else tuple(axis)
    finite_mask = np.isfinite(y)
    y_filled = y.copy()
    np.nan_to_num(y_filled, copy=False)

    # ---- build / fetch Γ --------------------------------------------------
    Gamma = _gamma(y.shape, axis, s, smoothOrder, y.dtype)

    # ---- frequency-domain smoothing --------------------------------------
    D = fft.dctn(y_filled, type=2, norm="ortho", axes=axis)
    z  = fft.idctn(Gamma * D, type=2, norm="ortho", axes=axis)

    # ---- restore NaNs & return -------------------------------------------
    z = z.astype(y.dtype, copy=False)
    z[~finite_mask] = np.nan
    return z