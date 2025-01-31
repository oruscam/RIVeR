from typing import Dict, List, Tuple, Optional, Union
import cv2
import numpy as np
from scipy.optimize import minimize
import random

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
def orthorectify_image(image_path, cam_solution, grp_dict, output_resolution=0.1, southern_hemisphere=True):
	"""
    Reproject an image onto real-world coordinates with high resolution output.

    Parameters:
        image_path (str): Path to the input image
        cam_solution (dict): Camera solution dictionary
        grp_dict (dict): Dictionary containing ground reference points
        output_resolution (float): Resolution in real-world units per pixel (default: 0.1)
        southern_hemisphere (bool): Whether coordinates are in Southern Hemisphere
        debug (bool): Whether to print debug information

    Returns:
        tuple: (ortho_img, extent)
            - ortho_img: RGBA image array (with alpha channel for transparency)
            - extent: [x_min, x_max, y_min, y_max] for plotting
    """

	# Load the image
	img = cv2.imread(image_path)
	if img is None:
		raise ValueError("Could not load image")
	img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
	h, w = img.shape[:2]

	# Determine the extent with reduced margin for better resolution
	x_min, x_max = np.min(grp_dict['X']), np.max(grp_dict['X'])
	y_min, y_max = np.min(grp_dict['Y']), np.max(grp_dict['Y'])

	# Add small margin
	margin = 0.05  # 5% margin
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
	max_size = 5000  # Maximum size for either dimension
	if x_size > max_size or y_size > max_size:
		scale = max(x_size / max_size, y_size / max_size)
		x_size = int(x_size / scale)
		y_size = int(y_size / scale)

	# Create coordinates with correct orientation
	if southern_hemisphere:
		y_coords = np.linspace(y_max, y_min, y_size)
	else:
		y_coords = np.linspace(y_min, y_max, y_size)
	x_coords = np.linspace(x_min, x_max, x_size)
	X, Y = np.meshgrid(x_coords, y_coords)

	# Get Z values
	Z = np.ones_like(X) * np.mean(grp_dict['Z'])

	# Project points
	points_world = {
		'X': X.flatten(),
		'Y': Y.flatten(),
		'Z': Z.flatten()
	}

	projected_points = project_points(cam_solution['camera_matrix'], points_world)

	# Reshape to grid
	x_img = projected_points[:, 0].reshape(X.shape)
	y_img = projected_points[:, 1].reshape(Y.shape)

	# Create maps for remapping
	map_x = x_img.astype(np.float32)
	map_y = y_img.astype(np.float32)

	# Create mask for valid coordinates
	valid_coords = (map_x >= 0) & (map_x < w) & (map_y >= 0) & (map_y < h)

	# Perform remapping
	ortho_img = cv2.remap(img, map_x, map_y,
						  interpolation=cv2.INTER_LINEAR,
						  borderMode=cv2.BORDER_CONSTANT,
						  borderValue=[0, 0, 0])

	# Add alpha channel
	alpha = np.ones_like(ortho_img[:, :, 0]) * 255
	alpha[~valid_coords] = 0
	ortho_img = np.dstack((ortho_img, alpha))

	extent = [x_min, x_max, y_min, y_max]

	return ortho_img, extent


def get_camera_solution(grp_dict: Dict[str, np.ndarray],
						optimize_solution: bool = False,
						image_path: Optional[str] = None,
						ortho_resolution: float = 0.1,
						southern_hemisphere: bool = True,
						confidence: float = 0.95) -> Dict[str, Union[np.ndarray, float, Tuple[int, ...], int, None]]:
	"""
    Get camera matrix, position, uncertainty ellipses, and optionally generate orthorectified image.

    [previous docstring parameters...]
    Additional Parameters:
        confidence: Confidence level for uncertainty ellipses (default: 0.95)

    Returns:
        [previous docstring returns...]
        Additional returns in dictionary:
            - 'uncertainty_ellipses': List of dictionaries containing ellipse parameters
    """
	result = {}

	if optimize_solution:
		num_points, best_indices, best_error, best_matrix = optimize_points_comprehensive(grp_dict)

		if best_matrix is None:
			raise ValueError("Failed to find optimal camera matrix")

		result.update({
			'camera_matrix': best_matrix,
			'camera_position': get_camera_center(best_matrix),
			'num_points': num_points,
			'point_indices': best_indices,
			'error': best_error
		})
	else:
		camera_matrix = solve_c_matrix(grp_dict)
		result.update({
			'camera_matrix': camera_matrix,
			'camera_position': get_camera_center(camera_matrix)
		})

	# Calculate reprojection errors
	world_coords = {'X': grp_dict['X'], 'Y': grp_dict['Y'], 'Z': grp_dict['Z']}
	projected_points = project_points(result['camera_matrix'], world_coords)
	actual_points = np.column_stack((grp_dict['x'], grp_dict['y']))
	reprojection_errors = np.sqrt(np.sum((actual_points - projected_points) ** 2, axis=1))

	# Calculate uncertainty ellipses
	uncertainty_ellipses = calculate_uncertainty_ellipses(actual_points, projected_points, confidence)

	# Add calculations to results
	result.update({
		'projected_points': projected_points,
		'reprojection_errors': reprojection_errors,
		'mean_error': np.mean(reprojection_errors),
		'uncertainty_ellipses': uncertainty_ellipses
	})

	# Generate orthorectified image if image path is provided
	if image_path is not None:
		ortho_img, extent = orthorectify_image(
			image_path=image_path,
			cam_solution=result,
			grp_dict=grp_dict,
			output_resolution=ortho_resolution,
			southern_hemisphere=southern_hemisphere,
		)

		result.update({
			'ortho_image': ortho_img,
			'ortho_extent': extent
		})

	return result


def calculate_uncertainty_ellipses(actual_points: np.ndarray,
								   projected_points: np.ndarray,
								   confidence: float = 0.95) -> List[Dict]:
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

		ellipses.append({
			'center': actual_points[i],
			'width': width,
			'height': height,
			'angle': angle
		})

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
    X, Y, Z = GRPs['X'], GRPs['Y'], GRPs['Z']
    x, y = GRPs['x'], GRPs['y']
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
    for i in range(len(world_coords['X'])):
        X = np.array([world_coords['X'][i], world_coords['Y'][i], world_coords['Z'][i], 1])
        projection = np.dot(P, X)
        projection = projection / projection[2]
        projected_points.append([projection[0], projection[1]])
    return np.array(projected_points)


def evaluate_combination(
    grp_dict: Dict[str, np.ndarray],
    indices: Tuple[int, ...]
) -> Tuple[float, Optional[np.ndarray]]:
    """
    Evaluate a specific combination of points for camera matrix estimation.

    Parameters:
        grp_dict (Dict[str, np.ndarray]): Dictionary containing ground reference points
        indices (Tuple[int, ...]): Tuple of indices to select points for evaluation

    Returns:
        Tuple[float, Optional[np.ndarray]]:
            - Error value for the combination
            - Camera matrix if successful, None otherwise
    """
    try:
        subset = {k: grp_dict[k][list(indices)] for k in grp_dict}
        P = solve_c_matrix(subset)
        projected = project_points(P, grp_dict)
        actual = np.column_stack((grp_dict['x'], grp_dict['y']))
        error = np.mean(np.sqrt(np.sum((actual - projected) ** 2, axis=1)))
        return error, P
    except:
        return float('inf'), None


def optimize_points_comprehensive(
    grp_dict: Dict[str, np.ndarray],
    min_points: int = 6,
    max_points: int = 15,
    max_combinations: int = 50,
    trials: int = 3
) -> Tuple[Optional[int], Optional[Tuple[int, ...]], Optional[float], Optional[np.ndarray]]:
    """
    Optimize both the number of points and find the best combination for camera matrix estimation.

    Parameters:
        grp_dict (Dict[str, np.ndarray]): Dictionary containing ground reference points
        min_points (int, optional): Minimum number of points to consider. Defaults to 6.
        max_points (int, optional): Maximum number of points to consider. Defaults to 15.
        max_combinations (int, optional): Maximum number of combinations to try. Defaults to 50.
        trials (int, optional): Number of trials for each point count. Defaults to 3.

    Returns:
        Tuple[Optional[int], Optional[Tuple[int, ...]], Optional[float], Optional[np.ndarray]]:
            - Best number of points found
            - Best combination of point indices
            - Best error achieved
            - Best camera matrix
    """
    all_results = []

    for num_points in range(min_points, max_points + 1):
        point_indices = list(range(len(grp_dict['X'])))

        for trial in range(trials):
            random.seed(trial)  # Different seed for each trial
            best_error = float('inf')
            best_indices = None
            best_matrix = None

            for _ in range(max_combinations):
                indices = tuple(sorted(random.sample(point_indices, num_points)))
                error, P = evaluate_combination(grp_dict, indices)

                if error < best_error:
                    best_error = error
                    best_indices = indices
                    best_matrix = P

            if best_indices is not None:
                all_results.append({
                    'num_points': num_points,
                    'error': best_error,
                    'indices': best_indices,
                    'matrix': best_matrix
                })

    if not all_results:
        return None, None, None, None

    best_result = min(all_results, key=lambda x: x['error'])
    return (
        best_result['num_points'],
        best_result['indices'],
        best_result['error'],
        best_result['matrix']
    )

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
) -> np.ndarray:
	"""
	Compute the homography transformation matrix based on pixel coordinates and real-world distances.

	Parameters:
	    x1_pix, y1_pix, x2_pix, y2_pix, x3_pix, y3_pix, x4_pix, y4_pix: float
	        Pixel coordinates for four points.
	    d12, d23, d34, d41, d13, d24: float
	        Real-world distances between corresponding points.

	Returns:
	    ndarray: 3x3 transformation matrix pixel to RW and RW to pixel
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

	return transformation_matrix


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
