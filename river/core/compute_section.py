import csv

import numpy as np
from scipy.interpolate import griddata

import river.core.coordinate_transform as ct


def calculate_station_coordinates(
	east_l: float, north_l: float, east_r: float, north_r: float, stations: np.ndarray, left_station: float = 0
) -> tuple:
	"""
	Calculate the coordinates of each station based on the left and right bank real-world coordinates,
	and a shift margin for the first station.

	Parameters:
	east_l : float
	    The east coordinate of the left bank.
	north_l : float
	    The north coordinate of the left bank.
	east_r : float
	    The east coordinate of the right bank.
	north_r : float
	    The north coordinate of the right bank.
	stations : np.ndarray
	    Array representing the stations of the bathymetry.
	left_station : float, optional
	    The shift value between the left point and the first station. Default is 0.

	Returns:
	np.ndarray
	    An array containing the calculated coordinates of each station.
	"""

	# Adjust the stations array by subtracting the left_station
	shifted_stations = stations - left_station

	# Calculate the total distance between the two points
	total_distance = np.linalg.norm([east_r - east_l, north_r - north_l])

	# Calculate the direction vector from (east_l, north_l) to (east_r, north_r)
	direction_vector = np.array([east_r - east_l, north_r - north_l]) / total_distance

	# Calculate the coordinates of each station based on the shifted stations
	station_coordinates = np.array([east_l, north_l]) + np.outer(shifted_stations, direction_vector)

	return shifted_stations, station_coordinates


def find_crossing_stations(stations: list | np.ndarray, stages: list | np.ndarray, level: float) -> list:
	"""
	Find the stations where the water level crosses the given level.

	Parameters:
	stations : list or np.ndarray
	    Array representing the station positions.
	stages : list or np.ndarray
	    Array representing the stage values corresponding to each station.
	level : float
	    The water level to find crossing stations for.

	Returns:
	list
	    A list of stations where the water level crosses the specified level.
	"""
	crossing_stations = []

	# Loop through the stations and their corresponding stages values
	for i in range(1, len(stations)):
		# Check if the level lies between stages[i-1] and stages[i]
		if (stages[i - 1] <= level <= stages[i]) or (stages[i - 1] >= level >= stages[i]):
			# Perform linear interpolation to find the station where the level crosses
			fraction = (level - stages[i - 1]) / (stages[i] - stages[i - 1])
			crossing_station = stations[i - 1] + fraction * (stations[i] - stations[i - 1])
			crossing_stations.append(crossing_station)

	return crossing_stations


def divide_segment_to_dict(east_l: float, north_l: float, east_r: float, north_r: float, num_stations: int) -> dict:
	"""
	Divide a segment defined by two points (left and right) into a specified number of stations
	and return the result as a dictionary with NumPy arrays.

	Parameters:
	east_l : float
	    East coordinate of the left point.
	north_l : float
	    North coordinate of the left point.
	east_r : float
	    East coordinate of the right point.
	north_r : float
	    North coordinate of the right point.
	num_stations : int
	    Number of stations to divide the segment into.

	Returns:
	dict
	    A dictionary containing station IDs, east and north coordinates, and distances from the left point.
	"""
	# Calculate the direction vector from the left point to the right point
	direction_vector = np.array([east_r - east_l, north_r - north_l])

	# Calculate the step size (fraction of the direction vector to move per station)
	step_size = 1.0 / (num_stations - 1)

	# Calculate the total length of the segment
	segment_length = np.linalg.norm(direction_vector)

	# Pre-allocate arrays for the result dictionary
	result = {
		"id": np.arange(1, num_stations + 1),  # Station IDs (1 to num_stations)
		"east": np.zeros(num_stations),  # Pre-allocate east coordinates
		"north": np.zeros(num_stations),  # Pre-allocate north coordinates
		"distance": np.zeros(num_stations),  # Pre-allocate distances
	}

	# Generate the new station coordinates and populate the arrays
	for i in range(num_stations):
		result["east"][i] = east_l + i * step_size * direction_vector[0]
		result["north"][i] = north_l + i * step_size * direction_vector[1]
		result["distance"][i] = i * step_size * segment_length

	return result


def add_pixel_coordinates(results: dict, transformation_matrix: np.ndarray):
	"""
	Add pixel coordinates to the station dictionary using NumPy arrays.

	Parameters:
	    results (dict): Dictionary containing real-world coordinates as NumPy arrays.
	    transformation_matrix (np.ndarray): Transformation matrix to convert real-world to pixel coordinates.

	Returns:
	    dict: Updated station dictionary with pixel coordinates as NumPy arrays.
	"""
	# Pre-allocate arrays for pixel coordinates
	num_stations = len(results["east"])
	results["x"] = np.zeros(num_stations)
	results["y"] = np.zeros(num_stations)

	# Iterate through the stations and calculate pixel coordinates
	for i, (east, north) in enumerate(zip(results["east"], results["north"])):
		pixel_coords = ct.transform_real_world_to_pixel(east, north, transformation_matrix)
		results["x"][i] = pixel_coords[0]
		results["y"][i] = pixel_coords[1]

	return results


def get_cs_displacements(coord_x, coord_y, X, Y, displacement_X, displacement_Y):
	"""
	Compute interpolated displacement values for a set of station coordinates.

	Parameters:
	    results (dict): Dictionary containing either 'x', 'y' (pixel coordinates)
	                    or 'east', 'north' (real-world coordinates) as NumPy arrays.
	    X, Y (2D np.ndarray): Coordinate grid (either pixel or real-world).
	    displacement_X, displacement_Y (2D np.ndarray): Displacement fields corresponding to X and Y.

	Returns:
	    np.ndarray, np.ndarray: Interpolated displacements in the x/east and y/north directions.
	"""
	# Flatten the grids and displacements into 1D arrays for griddata
	points = np.column_stack((X.flatten(), Y.flatten()))
	dist_x_values = displacement_X.flatten()
	dist_y_values = displacement_Y.flatten()

	interpolated_displacements_x = griddata(points, dist_x_values, (coord_x, coord_y), method="linear")
	interpolated_displacements_y = griddata(points, dist_y_values, (coord_x, coord_y), method="linear")

	return interpolated_displacements_x, interpolated_displacements_y


def get_stream_cross_velocities(
	displacement_east: np.ndarray,
	displacement_north: np.ndarray,
	time_between_frames: float,
	east_l: float,
	north_l: float,
	east_r: float,
	north_r: float,
) -> tuple:
	"""
	Compute streamwise and crosswise velocity components for a set of displacement vectors.

	Parameters:
	    displacement_east, displacement_north (1D np.ndarray): Real-world displacements in the east and north directions.
	    time_between_frames (float): Time in seconds between two extracted frames.
	    east_l, north_l (float): Coordinates of the left point of the section.
	    east_r, north_r (float): Coordinates of the right point of the section.

	Returns:
	    np.ndarray, np.ndarray, np.ndarray, np.ndarray:
	    Streamwise and crosswise velocity components (streamwise_east, streamwise_north, C_east, C_north).
	"""
	# Calculate the section line vector
	delta_east = east_r - east_l
	delta_north = north_r - north_l
	section_length = np.sqrt(delta_east**2 + delta_north**2)

	# Normalize the section vector to get a unit vector for the crosswise direction
	unit_crosswise = np.array([delta_east, delta_north]) / section_length

	# The streamwise direction is perpendicular to the crosswise direction
	unit_streamwise = np.array([-unit_crosswise[1], unit_crosswise[0]])

	# Pre-allocate arrays for streamwise and crosswise components
	num_stations = len(displacement_east)
	streamwise_east = np.zeros(num_stations)
	streamwise_north = np.zeros(num_stations)
	crosswise_east = np.zeros(num_stations)
	crosswise_north = np.zeros(num_stations)

	# Iterate through each station and compute streamwise and crosswise velocity components
	for i in range(num_stations):
		displacement_vector = np.array([displacement_east[i], displacement_north[i]])

		# Project the displacement onto the streamwise direction
		streamwise_component = np.dot(displacement_vector, unit_streamwise) * unit_streamwise

		# Project the displacement onto the crosswise direction
		crosswise_component = np.dot(displacement_vector, unit_crosswise) * unit_crosswise

		# Store the velocity components in the pre-allocated arrays
		streamwise_east[i] = streamwise_component[0] / time_between_frames
		streamwise_north[i] = streamwise_component[1] / time_between_frames
		crosswise_east[i] = crosswise_component[0] / time_between_frames
		crosswise_north[i] = crosswise_component[1] / time_between_frames

	return streamwise_east, streamwise_north, crosswise_east, crosswise_north


def get_streamwise_magnitude_and_sign(
	streamwise_east: np.ndarray,
	streamwise_north: np.ndarray,
	east_l: float,
	north_l: float,
	east_r: float,
	north_r: float,
) -> np.ndarray:
	"""
	Compute the magnitude and sign of the streamwise displacement component.

	Parameters:
	    streamwise_east, streamwise_north (1D np.ndarray): Streamwise displacements in the east and north directions.
	    east_l, north_l (float): Coordinates of the left point of the section.
	    east_r, north_r (float): Coordinates of the right point of the section.

	Returns:
	    np.ndarray: Signed magnitudes of the streamwise components.
	"""
	# Calculate the section line vector (crosswise direction)
	delta_east = east_r - east_l
	delta_north = north_r - north_l

	# Pre-allocate array for streamwise magnitudes with signs
	num_stations = len(streamwise_east)
	streamwise_magnitude = np.zeros(num_stations)

	# Iterate through each station and calculate the magnitude and sign of the streamwise component
	for i in range(num_stations):
		# Streamwise displacement vector
		streamwise_vector = np.array([streamwise_east[i], streamwise_north[i]])

		# Magnitude of the streamwise component
		magnitude = np.linalg.norm(streamwise_vector)

		# Determine the sign using the cross product of the section vector and streamwise vector
		# Cross product (in 2D, z-component) tells us if streamwise_vector is clockwise or counterclockwise to the section vector
		cross_product = delta_east * streamwise_north[i] - delta_north * streamwise_east[i]

		# If cross_product > 0, streamwise_vector points in the positive flow direction (assign positive sign)
		# If cross_product < 0, streamwise_vector points in the negative flow direction (assign negative sign)
		sign = 1 if cross_product > 0 else -1 if cross_product < 0 else 0

		# Store the signed magnitude in the pre-allocated array
		streamwise_magnitude[i] = sign * magnitude

	return streamwise_magnitude


def add_median_results(
	results: dict,
	table_results: dict,
	east_l: float,
	north_l: float,
	east_r: float,
	north_r: float,
	transformation_matrix: np.ndarray,
	time_between_frames: float,
) -> dict:
	"""
	Add median PIV results to the provided table of results.

	Parameters:
	results : dict
	    A dictionary containing the pixel processing results.
	table_results : dict
	    A dictionary summary to which the median results will be added.
	east_l, north_l : float
	    Coordinates of the left bank in real-world space.
	east_r, north_r : float
	    Coordinates of the right bank in real-world space.
	transformation_matrix : np.ndarray
	    Transformation matrix for converting PIV coordinates to real-world coordinates.
	time_between_frames : float
	    Time interval between frames in the PIV analysis.

	Returns:
	dict
	    The updated table_results dictionary with added displacement and velocity fields.
	"""
	# Retrieve the median PIV results
	X, Y, U, V = get_single_piv_result(results, num="median")

	# Convert displacement field to real-world coordinates
	EAST, NORTH, Displacement_EAST, Displacement_NORTH = ct.convert_displacement_field(
		X, Y, U, V, transformation_matrix
	)

	# Calculate displacements in the coordinate system
	displacement_x, displacement_y = get_cs_displacements(table_results["x"], table_results["y"], X, Y, U, V)
	displacement_east, displacement_north = get_cs_displacements(
		table_results["east"], table_results["north"], EAST, NORTH, Displacement_EAST, Displacement_NORTH
	)

	# Calculate streamwise and cross-stream velocities
	streamwise_east, streamwise_north, crosswise_east, crosswise_north = get_stream_cross_velocities(
		displacement_east, displacement_north, time_between_frames, east_l, north_l, east_r, north_r
	)

	# Calculate the streamwise magnitude and sign
	streamwise_magnitude = get_streamwise_magnitude_and_sign(
		streamwise_east, streamwise_north, east_l, north_l, east_r, north_r
	)

	# Update table_results with the calculated fields
	table_results.update(
		{
			"displacement_x": displacement_x,
			"displacement_y": displacement_y,
			"displacement_east": displacement_east,
			"displacement_north": displacement_north,
			"streamwise_east": streamwise_east,
			"streamwise_north": streamwise_north,
			"crosswise_east": crosswise_east,
			"crosswise_north": crosswise_north,
			"streamwise_magnitude": streamwise_magnitude,
		}
	)

	return table_results


def add_depth(results: dict, shifted_stations: np.ndarray, stages: np.ndarray, level: float) -> float:
	"""
	Add interpolated depth to the station dictionary using NumPy arrays.

	Parameters:
	    results (dict): Dictionary containing 'distance' key as a NumPy array with station distances along the river section.
	    shifted_stations (np.ndarray): Array of station positions for the stage values.
	    stages (np.ndarray): Array of stage values corresponding to the shifted_stations.
	    level (float): The water level at which the depth needs to be calculated.

	Returns:
	    dict: Updated station dictionary with interpolated 'depth' values as a NumPy array.
	"""
	# Interpolate the stage values over the distance using NumPy's interpolation function
	interpolated_stage = np.interp(results["distance"], shifted_stations, stages)

	# Calculate the depth as water level - interpolated stage
	depth = level - interpolated_stage

	# Add the depth to the results dictionary as a NumPy array
	results["depth"] = depth

	return results


def add_interpolated_velocity(results: dict, check: np.ndarray) -> dict:
	"""
	Interpolate missing or invalid velocity values in 'streamwise_magnitud' based on Froude number profile.
	Updates the 'results' dictionary by adding a new key 'filled_velocity'.

	Parameters:
	    results (dict): A dictionary containing:
	        - 'depth' (np.array): Depth profile of the river cross-section.
	        - 'distance' (np.array): Transversal distance across the river cross-section.
	        - 'streamwise_magnitude' (np.array): Measured velocity profile (with possible NaNs or invalid values).
	        - 'check' (np.array): Boolean array indicating validity of measurements.

	Returns:
	    results (dict): Updated dictionary with a new key 'filled_velocity' containing the filled velocity profile.
	"""
	# Extract the data from the dictionary
	depth = np.array(results["depth"])
	streamwise_magnitude = np.array(results["streamwise_magnitude"])

	# Ensure depth has no zero values to avoid division by zero
	depth = np.maximum(depth, 1e-6)  # Adding a small epsilon to depth if needed

	# Calculate the Froude number profile
	Fr = streamwise_magnitude / np.sqrt(9.81 * depth)

	# Identify invalid data (either NaNs or where check is False)
	invalid_data = np.isnan(streamwise_magnitude) | (~check)

	# If all values are invalid, set filled_velocity to an array of zeros
	if np.all(invalid_data):
		filled_velocity = np.zeros_like(streamwise_magnitude)
	else:
		# Define a helper function to find non-zero indices
		x = lambda z: z.nonzero()[0]

		# Perform linear interpolation to fill invalid data
		Fr[invalid_data] = np.interp(x(invalid_data), x(~invalid_data), Fr[~invalid_data])

		# Calculate the filled velocity profile based on the filled Froude profile
		filled_velocity = Fr * np.sqrt(9.81 * depth)

	with np.errstate(invalid="ignore", divide="ignore"):  # Ignore divide by zero or NaN warnings
		velocity_ratio = np.where(np.isnan(streamwise_magnitude), np.nan, filled_velocity / streamwise_magnitude)
	# Add the filled velocity profile to the results dictionary
	results["filled_streamwise_magnitude"] = filled_velocity

	results["filled_streamwise_east"] = results["streamwise_east"] * velocity_ratio
	results["filled_streamwise_north"] = results["streamwise_north"] * velocity_ratio
	results["filled_crosswise_east"] = results["crosswise_east"] * velocity_ratio
	results["filled_crosswise_north"] = results["crosswise_north"] * velocity_ratio

	return results


def add_w_a_q(table_results: dict, alpha: float, vel_type: str = "original") -> dict:
	"""
	Calculate widths (W), areas (A), discharges (Q), and discharge portions (Q_portion)
	and add them to the table_results dictionary.

	Parameters:
	    table_results (dict): Dictionary containing 'distance' (x-coordinates),
	                    'streamwise_magnitude' (velocities), and 'depth' (depths).
	    alpha (float): Coefficient between the superficial velocity obtained with LSPIV
	                   and the mean velocity of the section.
	    vel_type (str): Determines whether to use 'streamwise_magnitude' or
	                    'filled_streamwise_magnitude' for velocity.

	Returns:
	    dict: Updated table_results dictionary with keys 'W' (widths), 'A' (areas), 'Q' (discharges), and 'Q_portion'.
	"""
	x = table_results["distance"]
	# Select velocity type based on the provided `vel_type`
	v = (
		table_results["streamwise_magnitude"]
		if vel_type == "original"
		else table_results["filled_streamwise_magnitude"]
	)
	v_minus_std = table_results["minus_std"]
	v_plus_std = table_results["plus_std"]
	d = table_results["depth"]

	num_stations = len(x)

	# Initialize arrays for width (W)
	w = np.zeros(num_stations)

	# Calculate widths (W) for potentially irregular spacing
	for i in range(1, num_stations - 1):
		w[i] = (x[i + 1] - x[i - 1]) / 2

	# Handle edge cases for the first and last stations
	w[0] = x[1] - x[0]
	w[-1] = x[-1] - x[-2]

	# Calculate areas (A) as product of width and depth
	a = w * d

	# Calculate discharges (Q) considering the alpha coefficient for velocity correction
	q = a * v * alpha
	q_minus_std = a * v_minus_std * alpha
	q_plus_std = a * v_plus_std * alpha

	# Add W, A, and Q to the table_results dictionary
	table_results["W"] = w
	table_results["A"] = a
	table_results["Q"] = q
	table_results["Q_minus_std"] = q_minus_std
	table_results["Q_plus_std"] = q_plus_std

	# Calculate total discharge and discharge portions (Q_portion)
	total_q = np.nansum(q)  # Use nansum to handle NaNs in discharge values
	q_portion = q / total_q if total_q != 0 else np.zeros_like(q)

	# Add Q_portion to the table_results dictionary
	table_results["Q_portion"] = q_portion

	return table_results


def get_single_piv_result(results: dict, num: str = "median") -> tuple:
	"""
	Retrieve a single set of PIV results for quiver plotting.

	Parameters:
	results : dict
	    A dictionary containing the PIV processing results.
	num : str or int, optional
	    If 'median', returns the median results. If an integer, returns the specific index from the results.
	    Default is 'median'.

	Returns:
	tuple
	    xtable, ytable, u_table, v_table arrays for quiver plotting.
	"""
	# Extract x and y coordinate tables from the results
	xtable = np.array(results["x"]).reshape(results["shape"])
	ytable = np.array(results["y"]).reshape(results["shape"])

	# Validate the `num` parameter and extract the corresponding u and v tables
	if num == "median":
		u_table = np.array(results["u_median"]).reshape(results["shape"])
		v_table = np.array(results["v_median"]).reshape(results["shape"])
	elif isinstance(num, int):
		if num < 0 or num >= len(results["u"]):
			raise IndexError(f"num is out of range. It must be between 0 and {len(results['u']) - 1}.")
		u_table = np.array(results["u"][num]).reshape(results["shape"])
		v_table = np.array(results["v"][num]).reshape(results["shape"])
	else:
		raise ValueError("num must be either 'median' or an integer.")

	return xtable, ytable, u_table, v_table


def add_displacement_pixel_streamwise(
	table_results: dict, transformation_matrix: np.ndarray, vel_type: str = "original"
) -> dict:
	"""
	Add corrected pixel displacements in the streamwise direction to the table results.

	Parameters:
	    table_results (dict): Dictionary containing the results with streamwise and
	                          coordinate data.
	    transformation_matrix (ndarray): Transformation matrix for converting
	                                     real-world coordinates to pixel coordinates.
	    vel_type (str): Determines whether to use 'streamwise_magnitude' or
	                    'filled_streamwise_magnitude' for velocity

	Returns:
	    dict: Updated table_results dictionary with corrected pixel displacements
	          in the streamwise direction.
	"""
	# Compute the end points of the streamwise displacements in real-world coordinates
	if vel_type == "original":
		end_east_stream = table_results["streamwise_east"] + table_results["east"]
		end_north_stream = table_results["streamwise_north"] + table_results["north"]
	elif vel_type == "filled":
		end_east_stream = table_results["filled_streamwise_east"] + table_results["east"]
		end_north_stream = table_results["filled_streamwise_north"] + table_results["north"]

	# Convert the streamwise displacement endpoints to pixel coordinates
	end_stream_coords = np.array(
		[
			ct.transform_real_world_to_pixel(east, north, transformation_matrix)
			for east, north in zip(end_east_stream, end_north_stream)
		]
	)

	# Extract the pixel coordinates (x and y)
	end_x_stream, end_y_stream = end_stream_coords[:, 0], end_stream_coords[:, 1]

	# Calculate displacements in pixel space
	displacement_x_streamwise = end_x_stream - table_results["x"]
	displacement_y_streamwise = end_y_stream - table_results["y"]

	# Adjust displacements based on real-world streamwise magnitude
	# Positive magnitude indicates displacements point 90 degrees anticlockwise in the real world
	sign_adjustment = np.sign(table_results["streamwise_magnitude"])

	# Correct the sign of pixel displacements
	# Invert y displacement for image coordinate system where y-axis is flipped
	displacement_x_streamwise_corrected = sign_adjustment * displacement_x_streamwise
	displacement_y_streamwise_corrected = -sign_adjustment * displacement_y_streamwise  # Invert y-axis

	# Update the table_results dictionary with corrected values
	table_results["displacement_x_streamwise"] = displacement_x_streamwise_corrected
	table_results["displacement_y_streamwise"] = displacement_y_streamwise_corrected

	return table_results


def get_streamwise_magnitud(
	X, Y, U, V, table_results, east_l, north_l, east_r, north_r, transformation_matrix, time_between_frames
):
	# Convert displacement field to real-world coordinates
	EAST, NORTH, Displacement_EAST, Displacement_NORTH = ct.convert_displacement_field(
		X, Y, U, V, transformation_matrix
	)

	displacement_east, displacement_north = get_cs_displacements(
		table_results["east"], table_results["north"], EAST, NORTH, Displacement_EAST, Displacement_NORTH
	)

	# Calculate streamwise and cross-stream velocities
	streamwise_east, streamwise_north, crosswise_east, crosswise_north = get_stream_cross_velocities(
		displacement_east, displacement_north, time_between_frames, east_l, north_l, east_r, north_r
	)

	# Calculate the streamwise magnitude and sign
	streamwise_vel_magnitude = get_streamwise_magnitude_and_sign(
		streamwise_east, streamwise_north, east_l, north_l, east_r, north_r
	)
	return streamwise_vel_magnitude


def convert_arrays_to_lists(data: dict | list | np.ndarray):
	"""
	Recursively convert NumPy arrays to lists in a dictionary or list.

	Parameters:
	    data (dict, list): The data structure to convert.

	Returns:
	    dict, list: The converted data structure with NumPy arrays as lists.
	"""
	if isinstance(data, dict):
		# If data is a dictionary, convert each value
		return {k: convert_arrays_to_lists(v) for k, v in data.items()}
	elif isinstance(data, list):
		# If data is a list, convert each element
		return [convert_arrays_to_lists(i) for i in data]
	elif isinstance(data, np.ndarray):
		# Convert NumPy arrays to lists
		return data.tolist()
	else:
		# Return the item as is if it's not a list, dict, or np.ndarray
		return data


def calculate_river_section_properties(stages: list, station: list, level: float) -> dict:
	"""
	Calculate wet area, width, maximum depth, and average depth of a river section.

	Parameters:
	    stages (list): Elevations of the riverbed at different stations.
	    station (list): Corresponding positions of the stations along the section.
	    level (float): Current water level.

	Returns:
	    dict: A dictionary containing wet area, width, max depth, and average depth.
	"""
	# Ensure arrays are numpy arrays for efficient calculations
	stages = np.array(stages)
	station = np.array(station)

	# Calculate the differences between consecutive station positions (dx)
	dx = np.diff(station)

	# Calculate water depths at each station (height above the riverbed)
	depths = np.maximum(level - stages, 0)  # Depths are zero where the riverbed is above the water level

	# Calculate the wet area of each segment using the trapezoidal rule
	wet_area = np.sum((depths[:-1] + depths[1:]) / 2 * dx)

	# Calculate the width of the section (sum of dx where depth is greater than zero)
	width = np.sum(dx[depths[:-1] > 0])

	# Calculate the maximum depth
	max_depth = np.max(depths)

	# Calculate the average depth (wet area divided by width)
	# Guard against division by zero if width is zero
	average_depth = wet_area / width if width > 0 else 0

	# Return the results as a dictionary
	return wet_area, width, max_depth, average_depth


def add_statistics(
	results: dict,
	table_results: dict,
	east_l: float,
	north_l: float,
	east_r: float,
	north_r: float,
	transformation_matrix: np.ndarray,
	time_between_frames: float,
) -> dict:
	"""
	Add statistical metrics to the table_results based on PIV results.

	Parameters:
	    results (dict): A dictionary containing the PIV processing results.
	    table_results (dict): A dictionary summary to which the statistics will be added.
	    east_l, north_l (float): Coordinates of the left bank.
	    east_r, north_r (float): Coordinates of the right bank.
	    transformation_matrix (ndarray): Transformation matrix for converting coordinates.
	    time_between_frames (float): Time interval between frames in the PIV processing.

	Returns:
	    dict: The updated table_results dictionary with added statistical fields.
	"""
	streamwise_vel_magnitude_list = []

	# Iterate over the results to calculate streamwise velocities
	for num in range(len(results["u"])):
		X, Y, U, V = get_single_piv_result(results, num=num)

		streamwise_vel_magnitude = get_streamwise_magnitud(
			X, Y, U, V, table_results, east_l, north_l, east_r, north_r, transformation_matrix, time_between_frames
		)

		# Append the result to the list
		streamwise_vel_magnitude_list.append(streamwise_vel_magnitude)

	# Convert the list of arrays to a 2D NumPy array
	streamwise_vel_magnitude_array = np.array(streamwise_vel_magnitude_list)

	# Calculate the standard deviation along the 0th axis (across the different 'num' values)
	streamwise_vel_magnitude_std = np.std(streamwise_vel_magnitude_array, axis=0)
	table_results["minus_std"] = table_results["streamwise_magnitude"] - streamwise_vel_magnitude_std
	table_results["plus_std"] = table_results["streamwise_magnitude"] + streamwise_vel_magnitude_std

	# Calculate the 5th and 95th percentiles along the 0th axis
	table_results["5th_percentile"] = np.percentile(streamwise_vel_magnitude_array, 5, axis=0)
	table_results["95th_percentile"] = np.percentile(streamwise_vel_magnitude_array, 95, axis=0)

	return table_results


def update_current_x_section(
	x_sections: dict,
	piv_results: dict,
	transformation_matrix: np.ndarray,
	step: int,
	fps: float,
	id_section: int,
	interpolate: bool = False,
) -> dict:
	"""
	Enrich the cross-section data with the PIV results and other parameters.

	Parameters:
	    x_sections (dict): Dict containing cross-section data.
	    piv_results (dict): Dict containing PIV processing results.
	    transformation_matrix (np.ndarray): Transformation matrix for converting PIV coordinates to real-world coordinates.
	    step (int): Time step between frames.
	    fps (float): Frames per second of the video used in PIV processing.
	    id_section (int): Index of the current cross-section in the list of sections.
	    interpolate (bool, optional): Whether to interpolate velocity and discharge results.

	Returns:
	    dict: The updated cross-section data.
	"""

	# Get the name of the current cross-section based on the provided ID
	list_x_sections = list(x_sections.keys())
	current_x_section = list_x_sections[id_section]

	# Remove the identified keys from the dictionary
	keys_to_remove = [key for key in x_sections[current_x_section] if key.startswith("filled_")]
	for key in keys_to_remove:
		x_sections[current_x_section].pop(key)

	# Calculate the time between frames using the given step and frames per second
	time_between_frames = step / fps
	num_stations = x_sections[current_x_section]["num_stations"]

	# Retrieve bathymetry file path and the left station position
	bath_file_path = x_sections[current_x_section]["bath"]
	left_station = x_sections[current_x_section]["left_station"]

	# Retrieve the alpha coefficient
	alpha = x_sections[current_x_section]["alpha"]

	# Initialize lists for stations and stages
	stations = []
	stages = []

	# Load bathymetry data from the CSV file
	with open(bath_file_path, newline="") as inf:
		reader = csv.DictReader(inf)
		for row in reader:
			# Assuming the first column is 'station' and the second is 'level'
			stations.append(float(row[reader.fieldnames[0]]))
			stages.append(float(row[reader.fieldnames[1]]))

	# Convert stations and stages lists to NumPy arrays for calculations
	stations = np.array(stations)
	stages = np.array(stages)

	# Retrieve left and right bank coordinates
	east_l = x_sections[current_x_section]["east_l"]
	north_l = x_sections[current_x_section]["north_l"]
	east_r = x_sections[current_x_section]["east_r"]
	north_r = x_sections[current_x_section]["north_r"]

	# Retrieve the water level for the current cross-section
	level = x_sections[current_x_section]["level"]

	# Calculate shifted station positions and their real-world coordinates
	shifted_stations, station_coordinates = calculate_station_coordinates(
		east_l, north_l, east_r, north_r, stations, left_station=left_station
	)

	# Divide the segment into the required number of stations and calculate coordinates
	table_results = divide_segment_to_dict(east_l, north_l, east_r, north_r, num_stations)

	# Add pixel coordinates to the table results using the transformation matrix
	table_results = add_pixel_coordinates(table_results, transformation_matrix)

	# Add median results from PIV processing to the table results
	table_results = add_median_results(
		piv_results, table_results, east_l, north_l, east_r, north_r, transformation_matrix, time_between_frames
	)

	# Add depth information to the table results
	table_results = add_depth(table_results, shifted_stations, stages, level)

	# Check if 'check' exists and has the correct length; otherwise, update 'table_results'
	if "check" not in x_sections[current_x_section] or len(x_sections[current_x_section]["check"]) != num_stations:
		checked_results = np.ones(num_stations, dtype=bool)
		table_results["check"] = checked_results
	else:
		checked_results = np.array(x_sections[current_x_section]["check"])

	# Add statistics on streamwise velocity
	table_results = add_statistics(
		piv_results, table_results, east_l, north_l, east_r, north_r, transformation_matrix, time_between_frames
	)

	if interpolate:
		# Interpolate velocity and discharge data if required
		table_results = add_interpolated_velocity(table_results, checked_results)
		table_results = add_w_a_q(table_results, alpha, "filled")
		# Add Streamwise components in pixel coordinates for GUI
		table_results = add_displacement_pixel_streamwise(table_results, transformation_matrix, "filled")
	else:
		table_results = add_w_a_q(table_results, alpha, "original")
		table_results = add_displacement_pixel_streamwise(table_results, transformation_matrix, "original")

	# Calculate additional properties for the river section
	total_q = np.nansum(table_results["Q"])
	total_q_plus_std = np.nansum(table_results["Q_plus_std"])
	total_q_std = total_q_plus_std - total_q
	table_results["total_Q"] = total_q
	table_results["total_q_std"] = total_q_std  # with total_q_minus_std it should be about the same
	table_results["measured_Q"] = np.nansum(table_results["Q"][checked_results]) / total_q
	table_results["interpolated_Q"] = np.nansum(table_results["Q"][~checked_results]) / total_q

	total_a, total_w, max_depth, average_depth = calculate_river_section_properties(stages, stations, level)
	table_results["total_A"] = total_a
	table_results["total_W"] = total_w
	table_results["max_depth"] = max_depth
	table_results["average_depth"] = average_depth

	# Calculate mean velocities
	table_results["mean_V"] = total_q / total_a
	table_results["mean_Vs"] = (
		np.nanmean(table_results["filled_streamwise_magnitude"])
		if interpolate
		else np.nanmean(table_results["streamwise_magnitude"])
	)

	# Update the cross-section data with the calculated fields
	for key, value in table_results.items():
		x_sections[current_x_section][key] = convert_arrays_to_lists(value)

	return x_sections
