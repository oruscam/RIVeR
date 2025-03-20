"""
File Name: define_roi_masks.py
Project Name: RIVeR-LAC
Description: Perform Particle Image Velocimetry (PIV) analysis using FFT and multiple passes.

Created Date: 2024-07-04
Author: Antoine Patalano
Email: antoine.patalano@unc.edu.ar
Company: UNC / ORUS

This script contains functions for roi and mask creation
"""

from logging import getLogger

import cv2
import numpy as np
import scipy.optimize as opt

import river.core.coordinate_transform as ct
from river.core import exceptions

logger = getLogger()


def create_rw_box(east_left: int, north_left: int, east_right: int, north_right: int, height_roi: int) -> np.array:
	"""
	Create a rectangular box parallel to the given cross-section in Real World coordinates.

	Args:
	    east_left (int): x-coordinate of the left point of the line.
	    north_left (int): y-coordinate of the left point of the line.
	    east_right (int): x-coordinate of the right point of the line.
	    north_right (int): y-coordinate of the right point of the line.
	    height_roi (int): Height of the rectangular box.

	Returns:
	    np.array: Coordinates of the rectangle corners.
	"""
	# Calculate the length of the line
	line_length = np.sqrt((east_right - east_left) ** 2 + (north_right - north_left) ** 2)

	# Calculate the angle of the line with respect to the horizontal axis
	angle = np.arctan2(north_right - north_left, east_right - east_left)

	# Calculate the center of the line
	center_x = (east_left + east_right) / 2
	center_y = (north_left + north_right) / 2

	# Define the width and height of the rectangle
	width = line_length
	height = height_roi

	# Compute the corners of the rectangle before rotation
	box_corners = np.array(
		[[-width / 2, -height / 2], [width / 2, -height / 2], [width / 2, height / 2], [-width / 2, height / 2]]
	)

	# Rotation matrix to align the box with the line
	rotation_matrix = np.array([[np.cos(angle), -np.sin(angle)], [np.sin(angle), np.cos(angle)]])

	# Rotate the box
	rotated_corners = np.dot(box_corners, rotation_matrix.T)

	# Translate the box to the center of the line
	rw_box = rotated_corners + np.array([center_x, center_y])

	return rw_box


def rw_box_to_pixel(rw_box: np.ndarray, transformation_matrix: np.ndarray) -> np.ndarray:
	"""
	Transform the real-world coordinates of a rectangular box to pixel coordinates.

	Args:
	    rw_box (np.ndarray): Coordinates of the rectangle corners in real-world units.
	    transformation_matrix (np.ndarray): Transformation matrix from real-world to pixel coordinates.

	Returns:
	    np.ndarray: Coordinates of the rectangle corners in pixel units.
	"""
	pixel_box = np.zeros((rw_box.shape[0], 2))
	for i, (x_rw, y_rw) in enumerate(rw_box):
		pixel_box[i] = ct.transform_real_world_to_pixel(x_rw, y_rw, transformation_matrix)

	return pixel_box


def create_mask(image: np.ndarray, pixel_box: np.ndarray) -> np.ndarray:
	"""
	Create a mask where the area inside the pixel box is 1 and the rest is 0.

	Args:
	    image (np.ndarray): The image for which the mask is to be created.
	    pixel_box (np.ndarray): Coordinates of the rectangle corners in pixel units.

	Returns:
	    np.ndarray: The mask with the same dimensions as the image.
	"""
	# Create a blank mask with the same dimensions as the image
	mask = np.zeros((image.shape[0], image.shape[1]), dtype=np.uint8)

	# Define the polygon with the coordinates of the pixel box
	polygon = np.array(pixel_box, dtype=np.int32)

	# Fill the polygon on the mask with 1s
	cv2.fillPoly(mask, [polygon], 1)

	return mask


def find_bounding_box(pixel_boxes: list) -> tuple:
	"""
	Find the minimum bounding box that contains all the given pixel boxes.

	Args:
	    pixel_boxes (list): List of pixel boxes, each represented as a 2D array of coordinates.

	Returns:
	    tuple: The coordinates of the bounding box (min_x, min_y, max_x, max_y).
	"""
	min_x = float("inf")
	min_y = float("inf")
	max_x = float("-inf")
	max_y = float("-inf")

	for box in pixel_boxes:
		min_x = min(min_x, box[:, 0].min())
		min_y = min(min_y, box[:, 1].min())
		max_x = max(max_x, box[:, 0].max())
		max_y = max(max_y, box[:, 1].max())

	return min_x, min_y, max_x, max_y


def create_mask_and_bbox(
	image: np.ndarray, xsections: dict, transformation_matrix: np.ndarray, height_roi: int
) -> tuple[np.ndarray, list]:
	"""
	Create a combined mask and bounding box from cross-section data in a JSON file.

	Args:
	    image (np.ndarray): The input image for which the mask is to be created.
	    xsection (dict): Cross-sections data.
	    transformation_matrix (np.ndarray): Matrix to convert real-world coordinates to pixel coordinates.
	    height_roi (int): Height of the rectangular box for each cross-section.

	Returns:
	     tuple: Combined mask and bounding box coordinates in pixel units (x, y, width, height).
	"""

	combined_mask = np.zeros((image.shape[0], image.shape[1]), dtype=np.uint8)
	pixel_boxes = []

	for section_data in xsections.values():
		east_left = section_data["east_l"]
		north_left = section_data["north_l"]
		east_right = section_data["east_r"]
		north_right = section_data["north_r"]

		rw_box = create_rw_box(east_left, north_left, east_right, north_right, height_roi)
		pixel_box = rw_box_to_pixel(rw_box, transformation_matrix)
		pixel_boxes.append(pixel_box)

		mask = create_mask(image, pixel_box)
		combined_mask = cv2.bitwise_or(combined_mask, mask)

	min_x, min_y, max_x, max_y = find_bounding_box(pixel_boxes)

	# Ensure bounding box does not exceed image dimensions
	min_x = np.clip(min_x, 0, image.shape[1] - 1)
	max_x = np.clip(max_x, 0, image.shape[1] - 1)
	min_y = np.clip(min_y, 0, image.shape[0] - 1)
	max_y = np.clip(max_y, 0, image.shape[0] - 1)

	width = max_x - min_x
	height = max_y - min_y
	bounding_box = [min_x, min_y, width, height]

	return combined_mask, bounding_box


def calculate_side_lengths(pixel_box: np.ndarray):
	"""
	Calculate the lengths of the four sides of a pixel box.

	Args:
	    pixel_box (np.ndarray): The coordinates of the pixel box corners.

	Returns:
	    list: The lengths of the four sides.
	"""
	lengths = []
	for i in range(len(pixel_box)):
		start = pixel_box[i]
		end = pixel_box[(i + 1) % len(pixel_box)]
		length = np.sqrt((end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2)
		lengths.append(length)
	return lengths


def objective_function(height_roi: float, xsections: dict, transformation_matrix: np.ndarray, window_size: int):
	"""
	Objective function to be minimized to find the optimal height_roi.

	Args:
	    height_roi (float): The current value of height_roi being tested.
	    xsections (dict): Cross-sections data.
	    homography_matrix (np.ndarray): Homography matrix to convert real-world coordinates to pixel coordinates.
	    window_size (int): The window size for comparison.

	Returns:
	    float: The difference between the desired and actual smallest side length.
	"""
	try:
		desired_length = 1.5 * window_size
		min_side_length = float("inf")

		for section_data in xsections.values():
			east_left = section_data["east_l"]
			north_left = section_data["north_l"]
			east_right = section_data["east_r"]
			north_right = section_data["north_r"]

			rw_box = create_rw_box(east_left, north_left, east_right, north_right, height_roi)
			pixel_box = rw_box_to_pixel(rw_box, transformation_matrix)

			lengths = calculate_side_lengths(pixel_box)
			min_side_length = min(min_side_length, min(lengths))
			# Print optimization progress
		logger.debug(f"height_roi: {height_roi}, min_side_length: {min_side_length}")

		return abs(desired_length - min_side_length)
	except Exception as e:
		raise exceptions.ObjectiveFunctionError(f"Error trying to calculate objective_function: {e}") from e


def recommend_height_roi(xsections: dict, window_size: int, transformation_matrix: np.ndarray) -> float:
	"""
	Recommend a value for height_roi to ensure the smallest side length of all pixel boxes
	is exactly 4 times the window size, using optimization.

	Args:
	    xsections (dict): Cross-section data.
	    window_size (int): The window size for comparison.
	    homography_matrix (np.ndarray): Homography matrix to convert real-world coordinates to pixel coordinates.

	Returns:
	    float: The recommended height_roi value.
	"""

	max_rw_length = float("inf")
	for section_data in xsections.values():
		rw_length = section_data["rw_length"]
		max_side_length = min(max_rw_length, rw_length)

	initial_height_roi = 1  # Initial guess for height_roi

	result = opt.minimize_scalar(
		objective_function,
		bounds=(0.1, max_side_length),
		args=(xsections, transformation_matrix, window_size),
		method="Bounded",
	)

	if result.success:
		recommended_height_roi = np.ceil(result.x)
	else:
		logger.warning("Optimization failed. Using initial guess.")
		recommended_height_roi = initial_height_roi

	return recommended_height_roi


# # Example usage:
# import matplotlib.pyplot as plt
# import matplotlib.patches as patches
# # SCALING
# x1_pix, y1_pix = 990, 1394
# x2_pix, y2_pix = 2000, 1394
# x1_rw, y1_rw = 0, 0
# x2_rw, y2_rw = 100, 0
#
# T, scale = ct.uav_transformation_matrix(x1_pix, y1_pix, x2_pix, y2_pix, x1_rw, y1_rw, x2_rw, y2_rw)
#
#
# # Input coordinates of the line and height of the rectangle CS
# east_left = 10
# north_left = 10
# east_right = 100
# north_right = 0
# height_roi = 20
#
# # Create the rectangular box and get the image with the box
# rw_box = create_rw_box(east_left, north_left, east_right, north_right, height_roi)
# #
# # fig, ax = plt.subplots(1)
# #
# # ax.plot([east_left, east_right], [north_left, north_right], color='blue', linewidth=2, label='Line')
# # # Create a polygon for the rectangle
# # polygon = patches.Polygon(rw_box, closed=True, edgecolor='green', facecolor='none', linewidth=2, label='Rectangular Box')
# # ax.add_patch(polygon)
#
#
# image = plt.imread('/Users/antoine/Dropbox/04_Auto_Entrepreneur/01_Actual/03_Contrats/20191103_Canada/05_Training/Case_1/DJI_0083/DJI_0083_seq1_00003.jpg')
# fig, ax = plt.subplots(1)
# ax.imshow(image)
#
#
# #
# pixel_box = rw_box_to_pixel(rw_box, T)
#
# ax.plot([x1_pix, x2_pix], [y1_pix, y2_pix], color='red', linewidth=2, label='Line')
# # Create a polygon for the rectangle
# polygon = patches.Polygon(pixel_box, closed=True, edgecolor='blue', facecolor='none', linewidth=2, label='Rectangular Box')
# ax.add_patch(polygon)
#
#
#
#
#
# mask = create_mask(image, pixel_box)
# ax.imshow(mask)
# #
# json_path = '/Users/antoine/river/sections.json'
# combined_mask, bbox = create_mask_and_bbox(image, json_path, height_roi, transformation_matrix)
# fig, ax = plt.subplots()
# ax.imshow(combined_mask, cmap='gray')
#
# # lenghts_bbox = calculate_side_lengths(bbox)
# #
# combined_mask, bbox = create_mask_and_bbox(image, json_path, height_roi, transformation_matrix)
# plt.imshow(combined_mask)
#
#
#
# rect = patches.Rectangle((bbox[0],bbox[1]),bbox[2],bbox[3], linewidth=2, edgecolor='red', facecolor='none')
# ax.add_patch(rect)
# ax.add_patch(rect)
