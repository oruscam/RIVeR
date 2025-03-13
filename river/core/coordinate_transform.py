import random
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import cv2
import numpy as np
from scipy.optimize import minimize

from river.core.exceptions import OptimalCameraMatrixError


def get_homography_from_camera_matrix(P: np.ndarray, z_level: float) -> np.ndarray:
	"""
	Convert a camera matrix P to a homography matrix H for points lying on plane Z=z_level.
	Parameters:
	P (np.ndarray): 3x4 camera matrix
	z_level (float): Z coordinate of the plane

	Returns:
	np.ndarray: 3x3 transformation_matrix
	"""
	# The camera matrix P can be written as [M|p4] where M is 3x3 and p4 is 3x1
	M = P[:, :3]  # First three columns
	p4 = P[:, 3]  # Last column

	# For points on plane Z=z_level, the homography is:
	# H = M[:, [0,1]] + z_level * M[:, [2]] + p4
	H = np.zeros((3, 3))
	H[:, :2] = M[:, :2]  # Copy first two columns
	H[:, 2] = z_level * M[:, 2] + p4  # Third column is z_level times third column of M plus p4

	transformation_matrix = np.linalg.inv(H)

	return transformation_matrix


def orthorectify_image(
	image_path: Path,
	cam_solution: dict,
	grp_dict: dict,
	output_resolution: float = 0.1,
	flip_x: bool = False,
	flip_y: bool = False,
):
	"""
	Reproject an image onto real-world coordinates with high resolution output.

	Parameters:
		image_path (Path): Path to the input image
		cam_solution (dict): Camera solution dictionary
		grp_dict (dict): Dictionary containing ground reference points
		output_resolution (float): Resolution in real-world units per pixel (default: 0.1)
		flip_x (bool): Whether to flip the x-axis orientation
		flip_y (bool): Whether to flip the y-axis orientation

	Returns:
		tuple: (ortho_img, extent)
			- ortho_img: RGBA image array (with alpha channel for transparency)
			- extent: [x_min, x_max, y_min, y_max] for plotting
	"""

	# Load the image
	img = cv2.imread(str(image_path))
	if img is None:
		raise ValueError("Could not load image")
	img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
	h, w = img.shape[:2]

	# Determine the extent with reduced margin for better resolution
	x_min, x_max = np.min(grp_dict["X"]), np.max(grp_dict["X"])
	y_min, y_max = np.min(grp_dict["Y"]), np.max(grp_dict["Y"])

	# Add small margin
	margin = 0.3  # 30% margin
	x_range = x_max - x_min
	y_range = y_max - y_min
	x_min -= margin * x_range
	x_max += margin * x_range
	y_min -= margin * y_range
	y_max += margin * y_range

	# Create high-resolution grid
	x_size = int((x_max - x_min) / output_resolution)
	y_size = int((y_max - y_min) / output_resolution)

	# Ensure reasonable grid size
	max_size = 500  # Maximum size for either dimension
	if x_size > max_size or y_size > max_size:
		scale = max(x_size / max_size, y_size / max_size)
		x_size = int(x_size / scale)
		y_size = int(y_size / scale)

	# Create coordinates with explicit orientation control
	x_coords = np.linspace(x_min, x_max, x_size)
	y_coords = np.linspace(y_min, y_max, y_size)

	# Apply flips if requested
	if flip_x:
		x_coords = x_coords[::-1]
	if flip_y:
		y_coords = y_coords[::-1]

	X, Y = np.meshgrid(x_coords, y_coords)

	# Get Z values
	Z = np.ones_like(X) * np.mean(grp_dict["Z"])

	# Project points
	points_world = {"X": X.flatten(), "Y": Y.flatten(), "Z": Z.flatten()}
	projected_points = project_points(cam_solution["camera_matrix"], points_world)

	# Reshape to grid
	x_img = projected_points[:, 0].reshape(X.shape)
	y_img = projected_points[:, 1].reshape(Y.shape)

	# Create maps for remapping
	map_x = x_img.astype(np.float32)
	map_y = y_img.astype(np.float32)

	# Create mask for valid coordinates
	valid_coords = (map_x >= 0) & (map_x < w) & (map_y >= 0) & (map_y < h)

	# Perform remapping
	ortho_img = cv2.remap(
		img, map_x, map_y, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=[0, 0, 0]
	)

	# Add alpha channel
	alpha = np.ones_like(ortho_img[:, :, 0]) * 255
	alpha[~valid_coords] = 0
	ortho_img = np.dstack((ortho_img, alpha))

	extent = [x_min, x_max, y_min, y_max]

	return ortho_img, extent


def orthorectify_image_with_size_limit(
	im_in: np.ndarray,
	transformation_matrix: np.ndarray,
	roi: Optional[Tuple[int, int, int, int]] = None,
	max_dimension: int = 500,
	min_resolution: float = 0.01,
	flip_x: bool = False,
	flip_y: bool = False,
) -> Tuple[np.ndarray, List[float]]:
	"""
	Transform an input image using a transformation matrix with a specified ROI,
	ensuring the output image doesn't exceed a maximum dimension.

	Parameters:
		im_in (np.ndarray): Input image array
		transformation_matrix (np.ndarray): 3x3 transformation matrix for pixel to real-world coordinates
		roi (Optional[Tuple[int, int, int, int]]): Region of interest (y_min, y_max, x_min, x_max).
									  If None, the entire image is used.
		max_dimension (int): Maximum pixel dimension (width or height) for the output image
		min_resolution (float): Minimum resolution in real-world units per pixel
		flip_x (bool): Whether to flip the image horizontally
		flip_y (bool): Whether to flip the image vertically

	Returns:
		Tuple[np.ndarray, List[float]]:
		  - Transformed image array
		  - Extent [x_min, x_max, y_min, y_max] for plotting
	"""
	# Get input image dimensions
	h, w = im_in.shape[:2]

	# If ROI is not specified, use the entire image
	if roi is None:
		y_min, y_max, x_min, x_max = 0, h, 0, w
	else:
		y_min, y_max, x_min, x_max = roi

	# Create grid of pixel coordinates for the ROI
	y_coords = np.arange(y_min, y_max)
	x_coords = np.arange(x_min, x_max)
	X, Y = np.meshgrid(x_coords, y_coords)

	# Convert ROI corners to real-world coordinates to determine extent
	corners = [(x_min, y_min), (x_max, y_min), (x_min, y_max), (x_max, y_max)]

	real_world_corners = [transform_pixel_to_real_world(x, y, transformation_matrix) for x, y in corners]
	rw_x_coords = [corner[0] for corner in real_world_corners]
	rw_y_coords = [corner[1] for corner in real_world_corners]

	# Determine real-world extent
	x_min_rw, x_max_rw = min(rw_x_coords), max(rw_x_coords)
	y_min_rw, y_max_rw = min(rw_y_coords), max(rw_y_coords)

	# Add small margin
	margin = 0.05  # 5% margin
	x_range = x_max_rw - x_min_rw
	y_range = y_max_rw - y_min_rw
	x_min_rw -= margin * x_range
	x_max_rw += margin * x_range
	y_min_rw -= margin * y_range
	y_max_rw += margin * y_range

	# Calculate updated ranges with margins
	x_range = x_max_rw - x_min_rw
	y_range = y_max_rw - y_min_rw

	# Calculate resolution to ensure max_dimension is not exceeded
	x_resolution = x_range / max_dimension
	y_resolution = y_range / max_dimension

	# Use the larger resolution to ensure neither dimension exceeds max_dimension
	output_resolution = max(x_resolution, y_resolution)

	# Ensure resolution doesn't go below minimum allowed
	output_resolution = max(output_resolution, min_resolution)

	# Calculate output dimensions based on resolution
	x_size = int(x_range / output_resolution)
	y_size = int(y_range / output_resolution)

	print(f"Using resolution: {output_resolution:.4f} units/pixel")
	print(f"Output image dimensions: {x_size} x {y_size} pixels")

	# Create real-world coordinates grid
	rw_x_coords = np.linspace(x_min_rw, x_max_rw, x_size)
	rw_y_coords = np.linspace(y_min_rw, y_max_rw, y_size)

	# Apply flips if requested (by reversing the coordinate arrays)
	if flip_x:
		rw_x_coords = rw_x_coords[::-1]
	if flip_y:
		rw_y_coords = rw_y_coords[::-1]

	RW_X, RW_Y = np.meshgrid(rw_x_coords, rw_y_coords)

	# Transform each real-world coordinate to pixel coordinate
	map_x = np.zeros((y_size, x_size), dtype=np.float32)
	map_y = np.zeros((y_size, x_size), dtype=np.float32)

	for i in range(y_size):
		for j in range(x_size):
			pixel_coords = transform_real_world_to_pixel(RW_X[i, j], RW_Y[i, j], transformation_matrix)
			map_x[i, j] = pixel_coords[0]
			map_y[i, j] = pixel_coords[1]

	# Create mask for valid coordinates
	valid_coords = (map_x >= 0) & (map_x < w) & (map_y >= 0) & (map_y < h)

	# Perform remapping
	transformed_img = cv2.remap(
		im_in, map_x, map_y, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=[0, 0, 0]
	)

	# Add alpha channel for transparency
	if len(im_in.shape) == 3 and im_in.shape[2] == 3:
		alpha = np.ones_like(transformed_img[:, :, 0]) * 255
		alpha[~valid_coords] = 0
		transformed_img = np.dstack((transformed_img, alpha))

	extent = [x_min_rw, x_max_rw, y_min_rw, y_max_rw]

	return transformed_img, extent


def calculate_uncertainty_ellipses(
	actual_points: np.ndarray, projected_points: np.ndarray, confidence: float = 0.95
) -> List[Dict]:
	"""
	Calculate uncertainty ellipses for reprojection errors.

	Parameters:
		actual_points: Original point coordinates (n x 2)
		projected_points: Projected point coordinates (n x 2)
		confidence: Confidence level for ellipse (default: 0.95)

	Returns:
		List of dictionaries containing ellipse parameters for each point
	"""
	from scipy import stats

	errors = projected_points - actual_points
	ellipses = []

	# Chi-square value for desired confidence level
	chi2_val = stats.chi2.ppf(confidence, df=2)

	for i in range(len(actual_points)):
		# Get local errors (using neighborhood of points)
		start_idx = max(0, i - 2)
		end_idx = min(len(errors), i + 3)
		local_errors = errors[start_idx:end_idx]

		# Calculate covariance matrix of errors
		cov = np.cov(local_errors.T)

		# Get eigenvalues and eigenvectors
		eigenvals, eigenvecs = np.linalg.eigh(cov)

		# Calculate ellipse parameters
		angle = np.degrees(np.arctan2(eigenvecs[1, 0], eigenvecs[0, 0]))
		width = 2 * np.sqrt(chi2_val * abs(eigenvals[0]))  # Using abs to handle numerical instabilities
		height = 2 * np.sqrt(chi2_val * abs(eigenvals[1]))

		ellipses.append({"center": actual_points[i].tolist(), "width": width, "height": height, "angle": angle})

	return ellipses


def solve_c_matrix(GRPs: Dict[str, np.ndarray]) -> np.ndarray:
	"""
	Solve the full Camera Matrix from Ground Referenced Points using SVD.

	Parameters:
		GRPs (Dict[str, np.ndarray]): Dictionary containing the following arrays:
			'X': X-coordinates of ground reference points
			'Y': Y-coordinates of ground reference points
			'Z': Z-coordinates of ground reference points
			'x': x-coordinates of image points
			'y': y-coordinates of image points

	Returns:
		np.ndarray: A 3x4 camera matrix P obtained through SVD decomposition.
	"""
	X, Y, Z = GRPs["X"], GRPs["Y"], GRPs["Z"]
	x, y = GRPs["x"], GRPs["y"]
	r = len(X)

	BigM = np.zeros([r * 2, 12])
	for i, name in enumerate(X, start=1):
		j = i - 1
		BigM[i * 2 - 2, :] = [X[j], Y[j], Z[j], 1, 0, 0, 0, 0, -x[j] * X[j], -x[j] * Y[j], -x[j] * Z[j], -x[j]]
		BigM[i * 2 - 1, :] = [0, 0, 0, 0, X[j], Y[j], Z[j], 1, -y[j] * X[j], -y[j] * Y[j], -y[j] * Z[j], -y[j]]

	U, s, V = np.linalg.svd(BigM, full_matrices=False)
	V = np.transpose(V)
	P = -V[:, -1].reshape(3, 4)
	return P


def project_points(P: np.ndarray, world_coords: Dict[str, np.ndarray]) -> np.ndarray:
	"""
	Transform 3 components real-world coordinates to pixel coordinates

	Parameters:
		P (np.ndarray): 3x4 camera projection matrix
		world_coords (Dict[str, np.ndarray]): Dictionary containing the following arrays:
			'X': X-coordinates of world points
			'Y': Y-coordinates of world points
			'Z': Z-coordinates of world points

	Returns:
		np.ndarray: Array of projected 2D points with shape (n, 2)
	"""
	projected_points = []
	for i in range(len(world_coords["X"])):
		X = np.array([world_coords["X"][i], world_coords["Y"][i], world_coords["Z"][i], 1])
		projection = np.dot(P, X)
		projection = projection / projection[2]
		projected_points.append([projection[0], projection[1]])
	return np.array(projected_points)


def evaluate_combination(
	grp_dict: Dict[str, np.ndarray], indices: Tuple[int, ...], full_dict: Dict[str, np.ndarray] = None
) -> Tuple[float, Optional[np.ndarray]]:
	"""
	Evaluate a specific combination of points for camera matrix estimation.
	Now includes option to evaluate against full dataset.
	"""
	try:
		# Create subset for solving camera matrix
		subset = {k: grp_dict[k][list(indices)] for k in grp_dict}
		P = solve_c_matrix(subset)

		# Use full dataset for error calculation if provided
		eval_dict = full_dict if full_dict is not None else subset

		projected = project_points(P, eval_dict)
		actual = np.column_stack((eval_dict["x"], eval_dict["y"]))
		error = np.mean(np.sqrt(np.sum((actual - projected) ** 2, axis=1)))

		return error, P
	except:
		return float("inf"), None


def optimize_points_comprehensive(
	grp_dict: Dict[str, np.ndarray],
	min_points: int = 6,
	max_points: int = 15,
	max_combinations: int = 50,
	trials: int = 3,
) -> Tuple[Optional[int], Optional[Tuple[int, ...]], Optional[float], Optional[np.ndarray]]:
	"""
	Optimize both the number of points and find the best combination for camera matrix estimation.
	Now ensures consistent error calculation against full dataset.
	"""
	all_results = []

	for num_points in range(min_points, max_points + 1):
		point_indices = list(range(len(grp_dict["X"])))

		for trial in range(trials):
			random.seed(trial)
			best_error = float("inf")
			best_indices = None
			best_matrix = None

			for _ in range(max_combinations):
				indices = tuple(sorted(random.sample(point_indices, num_points)))
				# Pass full grp_dict for consistent error calculation
				error, P = evaluate_combination(grp_dict, indices, full_dict=grp_dict)

				if error < best_error:
					best_error = error
					best_indices = indices
					best_matrix = P

			if best_indices is not None:
				all_results.append(
					{"num_points": num_points, "error": best_error, "indices": best_indices, "matrix": best_matrix}
				)

	if not all_results:
		return None, None, None, None

	best_result = min(all_results, key=lambda x: x["error"])
	return (best_result["num_points"], best_result["indices"], best_result["error"], best_result["matrix"])


def get_camera_solution(
	grp_dict: Dict[str, Union[np.ndarray, List]],
	optimize_solution: bool = False,
	image_path: Optional[str] = None,
	ortho_resolution: float = 0.01,
	flip_x: bool = False,
	flip_y: bool = True,
	confidence: float = 0.95,
	full_grp_dict: Optional[Dict[str, Union[np.ndarray, List]]] = None,
) -> Dict[str, Union[np.ndarray, float, Tuple[int, ...], int, None]]:
	"""
	Get camera matrix, position, uncertainty ellipses, and optionally generate orthorectified image.
	Ensures error is always calculated against the full dataset.
	Autoflip feature has been removed for more predictable behavior.

	Parameters:
		grp_dict: Dictionary containing ground reference points for calculating the camera matrix
		optimize_solution: Whether to optimize the camera solution
		image_path: Path to image for orthorectification
		ortho_resolution: Resolution for orthorectified output
		flip_x: Whether to flip the x-axis orientation in the orthorectified image (default: False)
		flip_y: Whether to flip the y-axis orientation in the orthorectified image (default: True)
		confidence: Confidence level for uncertainty ellipses
		full_grp_dict: Original full dataset for error calculation (if None, uses grp_dict)

	Returns:
		Dict containing camera solution parameters including projected points
	"""
	# Input validation and conversion
	required_keys = ["X", "Y", "Z", "x", "y"]
	if not all(key in grp_dict for key in required_keys):
		raise OptimalCameraMatrixError(f"grp_dict must contain all required keys: {required_keys}")

	# Convert inputs to numpy arrays if they aren't already
	processed_dict = {}
	for key in required_keys:
		if isinstance(grp_dict[key], list):
			processed_dict[key] = np.array(grp_dict[key], dtype=np.float64)
		elif isinstance(grp_dict[key], np.ndarray):
			processed_dict[key] = grp_dict[key].astype(np.float64)
		else:
			raise OptimalCameraMatrixError(
				f"Values in grp_dict must be either lists or numpy arrays. Invalid type for key {key}"
			)

	# Process full dataset for error calculation
	# If using a subset (len differs) but no full_grp_dict provided, raise error
	if full_grp_dict is None and len(processed_dict["X"]) != len(grp_dict["X"]):
		raise OptimalCameraMatrixError(
			"When using a subset of points, full_grp_dict must be provided for error calculation"
		)

	# If full_grp_dict provided, process it
	if full_grp_dict is not None:
		full_processed_dict = {}
		for key in required_keys:
			if isinstance(full_grp_dict[key], list):
				full_processed_dict[key] = np.array(full_grp_dict[key], dtype=np.float64)
			elif isinstance(full_grp_dict[key], np.ndarray):
				full_processed_dict[key] = full_grp_dict[key].astype(np.float64)
	else:
		# Using all points, no need for separate full_grp_dict
		full_processed_dict = processed_dict

	result = {}

	# Get the camera matrix
	if optimize_solution:
		try:
			num_points, best_indices, best_error, best_matrix = optimize_points_comprehensive(processed_dict)

			if best_matrix is None:
				raise OptimalCameraMatrixError("Failed to find optimal camera matrix")

			camera_matrix = best_matrix
			result.update(
				{
					"num_points": num_points,
					"point_indices": best_indices,
				}
			)

		except Exception as e:
			raise OptimalCameraMatrixError(f"Optimization failed: {str(e)}")
	else:
		try:
			camera_matrix = solve_c_matrix(processed_dict)
		except Exception as e:
			raise OptimalCameraMatrixError(f"Failed to solve camera matrix: {str(e)}")

	# Calculate error using full dataset
	world_coords = {"X": full_processed_dict["X"], "Y": full_processed_dict["Y"], "Z": full_processed_dict["Z"]}
	projected_points = project_points(camera_matrix, world_coords)
	actual_points = np.column_stack((full_processed_dict["x"], full_processed_dict["y"]))
	reprojection_errors = np.sqrt(np.sum((actual_points - projected_points) ** 2, axis=1))

	result.update(
		{
			"camera_matrix": camera_matrix.tolist() if isinstance(camera_matrix, np.ndarray) else camera_matrix,
			"camera_position": get_camera_center(camera_matrix).tolist(),
			"error": np.mean(reprojection_errors),
			"reprojection_errors": reprojection_errors.tolist(),
			"projected_points": projected_points.tolist(),  # Add projected points to the result
		}
	)

	# Calculate uncertainty ellipses using the full dataset
	uncertainty_ellipses = calculate_uncertainty_ellipses(actual_points, projected_points, confidence)
	result["uncertainty_ellipses"] = uncertainty_ellipses

	# Generate orthorectified image if image path is provided
	if image_path is not None:
		try:
			ortho_img, extent = orthorectify_image(
				image_path=image_path,
				cam_solution={"camera_matrix": camera_matrix},
				grp_dict=processed_dict,
				output_resolution=ortho_resolution,
				flip_x=flip_x,
				flip_y=flip_y,
			)
			result.update({"ortho_image": ortho_img, "ortho_extent": extent})
		except Exception as e:
			print(f"Warning: Failed to generate orthorectified image: {str(e)}")

	return result


def get_camera_center(P: np.ndarray) -> np.ndarray:
	"""
	Calculate the camera center from the camera matrix P.

	Parameters:
		P (np.ndarray): 3x4 camera projection matrix, where the first 3x3 submatrix
					   represents the camera orientation and the last column represents
					   the translation.

	Returns:
		np.ndarray: 3D camera center coordinates (X, Y, Z) in world coordinate system.
	"""
	# Split P into M (first 3x3) and p4 (last column)
	M = P[:, :3]
	p4 = P[:, 3]

	# Camera center C = -M^(-1)p4
	C = -np.dot(np.linalg.inv(M), p4)

	return C


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
	image_path: Optional[str] = None,
	roi_padding: float = 0,
	max_dimension: int = 500,
	min_resolution: float = 0.01,
	flip_x: bool = False,
	flip_y: bool = True,
) -> dict:
	"""
	Compute the transformation matrix from pixel to real-world coordinates from 2 points.
	Optionally transforms an image using the calculated transformation matrix.

	Parameters:
		x1_pix (float): X coordinate of the first point in pixels.
		y1_pix (float): Y coordinate of the first point in pixels.
		x2_pix (float): X coordinate of the second point in pixels.
		y2_pix (float): Y coordinate of the second point in pixels.
		x1_rw (float): X coordinate of the first point in real-world units.
		y1_rw (float): Y coordinate of the first point in real-world units.
		x2_rw (float): X coordinate of the second point in real-world units.
		y2_rw (float): Y coordinate of the second point in real-world units.
		pixel_size (Optional[float]): Pixel size in real-world units. If None, calculated from the input points.
		image_path (Optional[str]): Path to the input image. If None, no image transformation is performed.
		roi_padding (float): Optional padding as a fraction of the ROI dimensions (default: 0.1).
		max_dimension (int): Maximum pixel dimension (width or height) for the output image
		min_resolution (float): Minimum resolution in real-world units per pixel
		flip_x (bool): Whether to flip the transformed image horizontally
		flip_y (bool): Whether to flip the transformed image vertically

	Returns:
		dict: Dictionary containing:
			- 'transformation_matrix': 3x3 transformation matrix
			If image_path is provided, also includes:
			- 'transformed_img': Transformed image
			- 'extent': [x_min, x_max, y_min, y_max] for plotting
			- 'output_resolution': The resolution of the output image in real-world units per pixel
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

	# Initialize result dictionary with the transformation matrix
	result = {"transformation_matrix": transformation_matrix}

	# Calculate and apply image transformation if image_path is provided
	if image_path is not None:
		# Load the image
		img = cv2.imread(image_path)
		if img is None:
			raise ValueError(f"Could not load image from {image_path}")
		img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
		h, w = img.shape[:2]

		# Calculate the ROI that includes the entire image with padding
		x_padding = w * roi_padding
		y_padding = h * roi_padding
		roi = (int(-x_padding), int(h + y_padding), int(-x_padding), int(w + x_padding))

		# Transform the image using the calculated transformation matrix
		transformed_img, extent = orthorectify_image_with_size_limit(
			img,
			transformation_matrix,
			roi=roi,
			max_dimension=max_dimension,
			min_resolution=min_resolution,
			flip_x=flip_x,
			flip_y=flip_y,
		)

		# Add the transformed image and extent to the result dictionary
		result["transformed_img"] = transformed_img
		result["extent"] = extent

		# Calculate the actual resolution achieved
		x_idx = 0 if extent[0] < extent[1] else 1
		y_idx = 2 if extent[2] < extent[3] else 3
		x_ext = abs(extent[1] - extent[0])
		y_ext = abs(extent[3] - extent[2])

		result["output_resolution"] = max(x_ext / transformed_img.shape[1], y_ext / transformed_img.shape[0])

	result["transformation_matrix"] = result["transformation_matrix"].tolist()

	return result


def calculate_roi(
	x1_pix: float,
	y1_pix: float,
	x2_pix: float,
	y2_pix: float,
	x3_pix: float,
	y3_pix: float,
	x4_pix: float,
	y4_pix: float,
	padding: float = 0.0,
) -> tuple:
	"""
	Calculate a rectangular region of interest (ROI) that frames the four points.

	Parameters:
		x1_pix, y1_pix, x2_pix, y2_pix, x3_pix, y3_pix, x4_pix, y4_pix: float
			Pixel coordinates for the four corner points.
		padding: float
			Optional padding as a fraction of the ROI dimensions (default: 0.0).
			For example, 0.1 adds a 10% padding on each side.

	Returns:
		tuple: (x_min, y_min, width, height) defining the ROI in pixel coordinates.
			  x_min, y_min are the top-left corner coordinates.
	"""
	# Gather all x and y coordinates
	x_coords = [x1_pix, x2_pix, x3_pix, x4_pix]
	y_coords = [y1_pix, y2_pix, y3_pix, y4_pix]

	# Find minimum and maximum values
	x_min = min(x_coords)
	x_max = max(x_coords)
	y_min = min(y_coords)
	y_max = max(y_coords)

	# Calculate width and height
	width = x_max - x_min
	height = y_max - y_min

	# Apply padding if requested
	if padding > 0:
		padding_x = width * padding
		padding_y = height * padding

		x_min -= padding_x
		y_min -= padding_y
		width += 2 * padding_x
		height += 2 * padding_y

	return (x_min, y_min, width, height)


def oblique_view_transformation_matrix(
	x1_pix: float,
	y1_pix: float,
	x2_pix: float,
	y2_pix: float,
	x3_pix: float,
	y3_pix: float,
	x4_pix: float,
	y4_pix: float,
	d12: float,
	d23: float,
	d34: float,
	d41: float,
	d13: float,
	d24: float,
	image_path: Optional[str] = None,
	roi_padding: float = 0.1,
	max_dimension: int = 500,
	min_resolution: float = 0.01,
	flip_x: bool = False,
	flip_y: bool = True,
) -> dict:
	"""
	Combined function to calculate transformation matrix, ROI, and optionally orthorectify an image
	with size constraints.

	Parameters:
		x1_pix, y1_pix, x2_pix, y2_pix, x3_pix, y3_pix, x4_pix, y4_pix: float
			Pixel coordinates for the four corner points.
		d12, d23, d34, d41, d13, d24: float
			Real-world distances between corresponding points.
		image_path (Optional[str]): Path to the input image. If None, no orthorectification is performed.
		roi_padding (float): Optional padding as a fraction of the ROI dimensions (default: 0.1).
		max_dimension (int): Maximum pixel dimension (width or height) for the output image
		min_resolution (float): Minimum resolution in real-world units per pixel
		flip_x (bool): Whether to flip the orthorectified image horizontally (default: True)
		flip_y (bool): Whether to flip the orthorectified image vertically (default: False)

	Returns:
		dict: Dictionary containing:
			- 'transformation_matrix': 3x3 transformation matrix
			- 'roi': Region of interest (x_min, y_min, width, height)
			If image_path is provided, also includes:
			- 'transformed_img': Orthorectified image
			- 'extent': [x_min, x_max, y_min, y_max] for plotting
	"""
	# Coordinates for points 1 and 2 in real-world space
	east_1, north_1 = 0, 0
	east_2, north_2 = d12, 0

	# Calculate or approximate the real-world coordinates for points 3 and 4
	east_3, north_3, east_4, north_4 = optimize_coordinates(d12, d23, d34, d41, d13, d24)

	# Pixel coordinates for the four points
	pixel_coords = np.array([[x1_pix, y1_pix], [x2_pix, y2_pix], [x3_pix, y3_pix], [x4_pix, y4_pix]], dtype=np.float32)

	# Real-world coordinates (east, north)
	real_world_coords = np.array(
		[[east_1, north_1], [east_2, north_2], [east_3, north_3], [east_4, north_4]], dtype=np.float32
	)

	# Calculate the homography matrix (H)
	H, _ = cv2.findHomography(real_world_coords, pixel_coords)

	# Invert the transformation matrix to map from pixel to real-world coordinates
	transformation_matrix = np.linalg.inv(H)

	# Calculate the ROI with padding
	roi_rect = calculate_roi(x1_pix, y1_pix, x2_pix, y2_pix, x3_pix, y3_pix, x4_pix, y4_pix, padding=roi_padding)

	# Initialize result dictionary with transformation matrix and ROI
	result = {"transformation_matrix": transformation_matrix, "roi": roi_rect}

	# Load and orthorectify the image if image_path is provided
	if image_path is not None:
		# Load the image
		image = cv2.imread(image_path)
		if image is None:
			raise ValueError(f"Could not load image from {image_path}")
		image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

		# Convert ROI from (x_min, y_min, width, height) to (y_min, y_max, x_min, x_max)
		x_min, y_min, width, height = roi_rect
		roi_for_ortho = (int(y_min), int(y_min + height), int(x_min), int(x_min + width))

		# Orthorectify the image with size limit
		transformed_img, extent = orthorectify_image_with_size_limit(
			image,
			transformation_matrix,
			roi=roi_for_ortho,
			max_dimension=max_dimension,
			min_resolution=min_resolution,
			flip_x=flip_x,
			flip_y=flip_y,
		)

		# Add orthorectification results to the dictionary
		result["transformed_img"] = transformed_img
		result["extent"] = extent

		# Calculate the actual resolution achieved
		x_idx = 0 if extent[0] < extent[1] else 1
		y_idx = 2 if extent[2] < extent[3] else 3
		x_ext = abs(extent[1] - extent[0])
		y_ext = abs(extent[3] - extent[2])

		result["output_resolution"] = max(x_ext / transformed_img.shape[1], y_ext / transformed_img.shape[0])

	result["transformation_matrix"] = result["transformation_matrix"].tolist()

	return result


def transform_pixel_to_real_world(x_pix: float, y_pix: float, transformation_matrix: np.ndarray) -> np.ndarray:
	"""
	Transform pixel coordinates to 2 components real-world coordinates.

	Parameters:
		x_pix (float): X coordinate in pixels.
		y_pix (float): Y coordinate in pixels.
		transformation_matrix (np.ndarray): The transformation matrix.

	Returns:
		np.ndarray: An array containing the real-world coordinates [x, y].
	"""
	# Create the pixel coordinate vector in homogeneous coordinates
	pixel_vector = np.array([x_pix, y_pix, 1])

	# Calculate the real-world coordinates in homogeneous coordinates
	real_world_vector = np.dot(transformation_matrix, pixel_vector)

	# Normalize the real-world coordinates
	real_world_vector /= real_world_vector[2]  # Divide by the third (homogeneous) component

	return real_world_vector[:2]  # Return the x and y real-world coordinates


def transform_real_world_to_pixel(x_rw: float, y_rw: float, transformation_matrix: np.ndarray) -> np.ndarray:
	"""
	Transform 2 components real-world coordinates to pixel coordinates.

	Parameters:
		x_rw (float): X coordinate in real-world units.
		y_rw (float): Y coordinate in real-world units.
		transformation_matrix (np.ndarray): The transformation matrix.

	Returns:
		np.ndarray: An array containing the pixel coordinates [x, y].
	"""
	# Invert the transformation matrix to map from pixel to real-world coordinates
	inv_transformation_matrix = np.linalg.inv(transformation_matrix)

	# Create the real-world coordinate vector in homogeneous coordinates
	real_world_vector = np.array([x_rw, y_rw, 1])

	# Calculate the pixel coordinates in homogeneous coordinates
	pixel_vector = np.dot(inv_transformation_matrix, real_world_vector)

	# Normalize the pixel coordinates
	pixel_vector /= pixel_vector[2]  # Divide by the third (homogeneous) component

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


def optimize_coordinates(d12: float, d23: float, d34: float, d41: float, d13: float, d24: float):
	"""
	Optimize the coordinates of points 3 and 4 based on the given distances.

	Parameters:
		d12 (float): Distance between point 1 and point 2.
		d23 (float): Distance between point 2 and point 3.
		d34 (float): Distance between point 3 and point 4.
		d41 (float): Distance between point 4 and point 1.
		d13 (float): Distance between point 1 and point 3.
		d24 (float): Distance between point 2 and point 4.

	Returns:
		tuple: Optimized coordinates (east_3_opt, north_3_opt, east_4_opt, north_4_opt)
	"""

	# Coordinates for points 1 and 2 (given)
	east_1, north_1 = 0, 0
	east_2, north_2 = d12, 0

	# Objective function to minimize: sum of squared errors between calculated and given distances
	def objective(vars: list):
		east_3, north_3, east_4, north_4 = vars

		# Calculate distances based on the current coordinates
		calc_d13 = np.sqrt((east_3 - east_1) ** 2 + (north_3 - north_1) ** 2)
		calc_d23 = np.sqrt((east_3 - east_2) ** 2 + (north_3 - north_2) ** 2)
		calc_d34 = np.sqrt((east_4 - east_3) ** 2 + (north_4 - north_3) ** 2)
		calc_d41 = np.sqrt((east_4 - east_1) ** 2 + (north_4 - north_1) ** 2)
		calc_d24 = np.sqrt((east_4 - east_2) ** 2 + (north_4 - north_2) ** 2)

		# Sum of squared errors between calculated and actual distances
		error = (calc_d13 - d13) ** 2 + (calc_d23 - d23) ** 2 + (calc_d34 - d34) ** 2
		error += (calc_d41 - d41) ** 2 + (calc_d24 - d24) ** 2

		return error

	# Initial guess for coordinates of points 3 and 4 (could start with random values)
	initial_guess = [d12 / 2, d12 / 2, d12 / 2, d12 / 2]  # (east_3, north_3, east_4, north_4)

	# Minimize the objective function
	result = minimize(objective, initial_guess)

	# Extract optimized coordinates
	east_3_opt, north_3_opt, east_4_opt, north_4_opt = result.x

	return east_3_opt, north_3_opt, east_4_opt, north_4_opt
	return east_3_opt, north_3_opt, east_4_opt, north_4_opt
