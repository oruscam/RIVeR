"""
File Name: image_preprocessing.py
Project Name: RIVeR-LAC
Description: Perform image filtering before Particle Image Velocimetry (PIV).

Created Date: 2024-07-22
Author: Antoine Patalano
Email: antoine.patalano@unc.edu.ar
Company: UNC / ORUS

This script contains functions for processing and analyzing PIV images.
"""

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import cv2
import numpy as np


def preprocess_image(image: Path, filt_grayscale, filt_clahe, clip_limit_clahe, filt_sub_background, background):
	image = cv2.imread(image, cv2.IMREAD_GRAYSCALE) if filt_grayscale else cv2.imread(image)

	if filt_sub_background and filt_grayscale:
		image = subtract_background(image, background)

	if filt_clahe and filt_grayscale:
		clahe = create_clahe(clip_limit_clahe)
		image = clahe.apply(image)

	return image


def convert_to_grayscale(image):
	"""Convert an image to grayscale."""
	return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def load_and_process_image(image_path: Path):
	"""Load an image and convert it to grayscale."""
	image = cv2.imread(image_path)
	grayscale_image = convert_to_grayscale(image)
	return grayscale_image


def calculate_average(image_folder: Path) -> np.ndarray:
	"""
	Calculate the average of all grayscale images in a folder.

	Parameters:
	image_folder : Path
	    The path to the folder containing the images.

	Returns:
	np.ndarray
	    The average grayscale image.
	"""
	# Get a list of all the image files in the directory
	image_files = list(image_folder.glob("*.jpg"))

	# Initialize a placeholder for the sum of all images
	sum_image = None
	num_images = len(image_files)

	# Use ThreadPoolExecutor to process images in parallel
	with ThreadPoolExecutor() as executor:
		grayscale_images = list(executor.map(load_and_process_image, image_files))
	# Sum all the grayscale images
	for grayscale_image in grayscale_images:
		if sum_image is None:
			sum_image = np.zeros_like(grayscale_image, dtype=np.float64)
		sum_image += grayscale_image

	# Compute the average image
	average_image = sum_image / num_images
	average_image = np.uint8(average_image)

	return average_image


def subtract_background(grayscale_image, average_image):
	"""
	Subtract the background from a grayscale image using the average image.

	Parameters:
	grayscale_image : np.ndarray
	    The input grayscale image.
	average_image : np.ndarray
	    The average image to be subtracted from the input image.

	Returns:
	np.ndarray
	    The background-subtracted image.
	"""
	subtracted_image = cv2.subtract(grayscale_image, average_image)
	subtracted_image = np.clip(subtracted_image, 0, 255)
	return subtracted_image


def create_clahe(clip_limit=5):
	"""
	Create a CLAHE (Contrast Limited Adaptive Histogram Equalization) object.

	Parameters:
	clip_limit : float
	    The threshold for contrast limiting.

	Returns:
	cv2.CLAHE
	    The CLAHE object.
	"""
	clahe = cv2.createCLAHE(clipLimit=clip_limit)
	return clahe
