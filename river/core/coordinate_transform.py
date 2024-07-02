from typing import Optional

import numpy as np


def calculate_real_world_distance(x1_rw: float, y1_rw: float, x2_rw: float, y2_rw: float) -> float:
	"""
	Calculate the Euclidean distance between two points in real-world coordinates.

	Parameters:
	    x1_rw (float): X coordinate of the first point in real-world units.
	    y1_rw (float): Y coordinate of the first point in real-world units.
	    x2_rw (float): X coordinate of the second point in real-world units.
	    y2_rw (float): Y coordinate of the second point in real-world units.

	Returns:
	    float: Distance between the two points in real-world units.
	"""
	return np.sqrt((x2_rw - x1_rw) ** 2 + (y2_rw - y1_rw) ** 2)


def get_pixel_size(x1_pix, y1_pix, x2_pix, y2_pix, x1_rw, y1_rw, x2_rw, y2_rw):
	"""
	Compute the pixel size based on known distances in both pixel and real-world units.

	Parameters:
	    x1_pix (float): X coordinate of the first point in pixels.
	    y1_pix (float): Y coordinate of the first point in pixels.
	    x2_pix (float): X coordinate of the second point in pixels.
	    y2_pix (float): Y coordinate of the second point in pixels.
	    x1_rw (float): X coordinate of the first point in real-world units.
	    y1_rw (float): Y coordinate of the first point in real-world units.
	    x2_rw (float): X coordinate of the second point in real-world units.
	    y2_rw (float): Y coordinate of the second point in real-world units.

	Returns:
	    float: The size of a pixel in real-world units.
	"""
	pixel_distance = np.sqrt((x2_pix - x1_pix) ** 2 + (y2_pix - y1_pix) ** 2)
	real_world_distance = np.sqrt((x2_rw - x1_rw) ** 2 + (y2_rw - y1_rw) ** 2)
	return real_world_distance / pixel_distance


def get_uav_transformation_matrix(
	x1_pix: float,
	y1_pix: float,
	x2_pix: float,
	y2_pix: float,
	x1_rw: float,
	y1_rw: float,
	x2_rw: float,
	y2_rw: float,
	pixel_size: Optional[float] = None,
) -> np.ndarray:
	"""
	Compute the transformation matrix from pixel to real-world coordinates from 2 points.

	Parameters:
	    x1_pix (float): X coordinate of the first point in pixels.
	    y1_pix (float): Y coordinate of the first point in pixels.
	    x2_pix (float): X coordinate of the second point in pixels.
	    y2_pix (float): Y coordinate of the second point in pixels.
	    x1_rw (float): X coordinate of the first point in real-world units.
	    y1_rw (float): Y coordinate of the first point in real-world units.
	    x2_rw (float): X coordinate of the second point in real-world units.
	    y2_rw (float): Y coordinate of the second point in real-world units.

	Returns:
	    np.ndarray: A 3x3 transformation matrix.
	"""
	# Step 1: Calculate pixel size
	if pixel_size is None:
		pixel_size = get_pixel_size(x1_pix, y1_pix, x2_pix, y2_pix, x1_rw, y1_rw, x2_rw, y2_rw)

	# Step 2: Compute rotation angle
	dx_pix = x2_pix - x1_pix
	dy_pix = y2_pix - y1_pix
	dx_rw = x2_rw - x1_rw
	dy_rw = y2_rw - y1_rw

	angle_pix = np.arctan2(dy_pix, dx_pix)
	angle_rw = np.arctan2(dy_rw, dx_rw)
	rotation_angle = angle_rw - angle_pix

	# Step 3: Create the rotation matrix
	cos_theta = np.cos(rotation_angle)
	sin_theta = np.sin(rotation_angle)
	rotation_matrix = np.array([[cos_theta, -sin_theta, 0], [sin_theta, cos_theta, 0], [0, 0, 1]])

	# Step 4: Translate the first pixel point to the origin
	translated_x1 = x1_rw - (x1_pix * pixel_size * cos_theta - y1_pix * pixel_size * sin_theta)
	translated_y1 = y1_rw - (-x1_pix * pixel_size * sin_theta - y1_pix * pixel_size * cos_theta)

	# Step 5: Create the scaling and translation matrix
	scale_translation_matrix = np.array([[pixel_size, 0, translated_x1], [0, -pixel_size, translated_y1], [0, 0, 1]])

	# Step 6: Combine rotation and scaling/translation matrices
	transformation_matrix = np.dot(scale_translation_matrix, rotation_matrix)

	return transformation_matrix


def transform_pixel_to_real_world(x_pix: float, y_pix: float, transformation_matrix: np.ndarray) -> np.ndarray:
	"""
	Transform pixel coordinates to real-world coordinates.

	Parameters:
	    x_pix (float): X coordinate in pixels.
	    y_pix (float): Y coordinate in pixels.
	    transformation_matrix (np.ndarray): The transformation matrix.

	Returns:
	    np.ndarray: An array containing the real-world coordinates [x, y].
	"""
	pixel_vector = np.array([x_pix, y_pix, 1])
	real_world_vector = np.dot(transformation_matrix, pixel_vector)
	return real_world_vector[:2]


def transform_real_world_to_pixel(x_rw: float, y_rw: float, transformation_matrix: np.ndarray) -> np.ndarray:
	"""
	Transform real-world coordinates to pixel coordinates.

	Parameters:
	    x_rw (float): X coordinate in real-world units.
	    y_rw (float): Y coordinate in real-world units.
	    transformation_matrix (np.ndarray): The transformation matrix.

	Returns:
	    np.ndarray: An array containing the pixel coordinates [x, y].
	"""
	inv_transformation_matrix = np.linalg.inv(transformation_matrix)
	real_world_vector = np.array([x_rw, y_rw, 1])
	pixel_vector = np.dot(inv_transformation_matrix, real_world_vector)
	return pixel_vector[:2]


def convert_displacement_field(
	X: np.ndarray, Y: np.ndarray, U: np.ndarray, V: np.ndarray, transformation_matrix: np.ndarray
) -> tuple:
	"""
	Convert pixel displacement field to real-world displacement field.

	Parameters:
	    X, Y (2D np.ndarray): Pixel coordinates.
	    U, V (2D np.ndarray): Pixel displacements.
	    transformation_matrix (np.ndarray): Transformation matrix from pixel to real-world coordinates.

	Returns:
	    EAST, NORTH, Displacement_EAST, Displacement_NORTH (all 2D np.ndarrays): Real-world coordinates and displacements.
	"""
	# Get the shape of the input matrices
	rows, cols = X.shape

	# Initialize the output matrices
	EAST = np.zeros((rows, cols))
	NORTH = np.zeros((rows, cols))
	Displacement_EAST = np.zeros((rows, cols))
	Displacement_NORTH = np.zeros((rows, cols))

	# Iterate through each point in the matrices
	for i in range(rows):
		for j in range(cols):
			# Convert pixel coordinates (X, Y) to real-world coordinates (EAST, NORTH)
			east_north = transform_pixel_to_real_world(X[i, j], Y[i, j], transformation_matrix)
			EAST[i, j], NORTH[i, j] = east_north

			# Convert the displaced pixel coordinates (X + U, Y + V) to real-world coordinates
			displaced_east_north = transform_pixel_to_real_world(
				X[i, j] + U[i, j], Y[i, j] + V[i, j], transformation_matrix
			)

			# Calculate the real-world displacement
			Displacement_EAST[i, j] = displaced_east_north[0] - east_north[0]
			Displacement_NORTH[i, j] = displaced_east_north[1] - east_north[1]

	return EAST, NORTH, Displacement_EAST, Displacement_NORTH
