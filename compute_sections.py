import csv
import coordinate_transform as ct
from scipy.interpolate import griddata
from matplotlib import pyplot as plt


def calculate_station_coordinates(east_l, north_l, east_r, north_r, stations, shift_left_margin=0):
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
    shift_left_margin : float, optional
        The shift value between the left point and the first station. Default is 0.

    Returns:
    np.ndarray
        An array containing the calculated coordinates of each station.
    """

    # Adjust the stations array by subtracting the shift_left_margin
    shifted_stations = stations - shift_left_margin

    # Calculate the total distance between the two points
    total_distance = np.linalg.norm([east_r - east_l, north_r - north_l])

    # Calculate the direction vector from (east_l, north_l) to (east_r, north_r)
    direction_vector = np.array([east_r - east_l, north_r - north_l]) / total_distance

    # Calculate the coordinates of each station based on the shifted stations
    station_coordinates = np.array([east_l, north_l]) + np.outer(shifted_stations, direction_vector)

    return shifted_stations, station_coordinates


def find_crossing_stations(stations, stages, level):
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


def divide_segment_to_dict(east_l, north_l, east_r, north_r, num_stations):
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
        A dictionary containing station IDs, a boolean value, east and north coordinates, and distances from the left point.
    """
    # Calculate the direction vector from the left point to the right point
    direction_vector = np.array([east_r - east_l, north_r - north_l])

    # Calculate the step size (fraction of the direction vector to move per station)
    step_size = 1.0 / (num_stations - 1)

    # Calculate the total length of the segment
    segment_length = np.linalg.norm(direction_vector)

    # Pre-allocate arrays for the result dictionary
    result = {
        'id': np.arange(1, num_stations + 1),  # Station IDs (1 to num_stations)
        'check': np.ones(num_stations, dtype=bool),  # Boolean array of True
        'east': np.zeros(num_stations),  # Pre-allocate east coordinates
        'north': np.zeros(num_stations),  # Pre-allocate north coordinates
        'distance': np.zeros(num_stations)  # Pre-allocate distances
    }

    # Generate the new station coordinates and populate the arrays
    for i in range(num_stations):
        result['east'][i] = east_l + i * step_size * direction_vector[0]
        result['north'][i] = north_l + i * step_size * direction_vector[1]
        result['distance'][i] = i * step_size * segment_length

    return result

def add_pixel_coordinates(results, transformation_matrix):
    """
    Add pixel coordinates to the station dictionary using NumPy arrays.

    Parameters:
        results (dict): Dictionary containing real-world coordinates as NumPy arrays.
        transformation_matrix (np.ndarray): Transformation matrix to convert real-world to pixel coordinates.

    Returns:
        dict: Updated station dictionary with pixel coordinates as NumPy arrays.
    """
    # Pre-allocate arrays for pixel coordinates
    num_stations = len(results['east'])
    results['x'] = np.zeros(num_stations)
    results['y'] = np.zeros(num_stations)

    # Iterate through the stations and calculate pixel coordinates
    for i, (east, north) in enumerate(zip(results['east'], results['north'])):
        pixel_coords = ct.real_world_to_pixel(east, north, transformation_matrix)
        results['x'][i] = pixel_coords[0]
        results['y'][i] = pixel_coords[1]

    return results


def add_cs_displacements(results, coord_type, X, Y, dis_X, dis_Y):
    """
    Add interpolated displacement keys to the station in cross-section dictionary using NumPy arrays.

    Parameters:
        results (dict): Dictionary containing either 'x', 'y' (pixel coordinates)
                        or 'east', 'north' (real-world coordinates) as NumPy arrays.
        coord_type (str): Type of coordinates. Should be either 'pixel' or 'real-world'.
        X, Y (2D np.ndarray): Coordinate grid (either pixel or real-world).
        dis_X, dis_Y (2D np.ndarray): Displacement fields corresponding to X and Y.

    Returns:
        dict: Updated station dictionary with interpolated displacements as NumPy arrays.
    """
    # Flatten the grids and displacements into 1D arrays for griddata
    points = np.column_stack((X.flatten(), Y.flatten()))
    dist_x_values = dis_X.flatten()
    dist_y_values = dis_Y.flatten()

    # Determine the keys based on the coordinate type
    disp_x_key = 'disp_x' if coord_type == 'pixel' else 'disp_east'
    disp_y_key = 'disp_y' if coord_type == 'pixel' else 'disp_north'
    coord_x_key = 'x' if coord_type == 'pixel' else 'east'
    coord_y_key = 'y' if coord_type == 'pixel' else 'north'

    # Pre-allocate arrays for interpolated displacements
    num_stations = len(results[coord_x_key])
    results[disp_x_key] = np.full(num_stations, np.nan)
    results[disp_y_key] = np.full(num_stations, np.nan)

    # Iterate through each station and interpolate the displacements
    for i, (x, y) in enumerate(zip(results[coord_x_key], results[coord_y_key])):
        # Interpolate the displacement at the given (x, y) point
        displacement_x = griddata(points, dist_x_values, (x, y), method='linear')
        displacement_y = griddata(points, dist_y_values, (x, y), method='linear')

        # Assign the interpolated displacements to the corresponding arrays
        if displacement_x is not None:
            results[disp_x_key][i] = displacement_x
        if displacement_y is not None:
            results[disp_y_key][i] = displacement_y

    return results


import numpy as np


def add_stream_cross_displacements(results, east_l, north_l, east_r, north_r):
    """
    Add streamwise and crosswise displacement components to the station dictionary using NumPy arrays.

    Parameters:
        results (dict): Dictionary containing 'east' and 'north' keys with real-world coordinates,
                        and 'disp_east' and 'disp_north' keys for real-world displacements.
        east_l, north_l (float): Coordinates of the left point of the section.
        east_r, north_r (float): Coordinates of the right point of the section.

    Returns:
        dict: Updated station dictionary with streamwise and crosswise displacement components as NumPy arrays.
    """
    # Calculate the section line vector
    delta_east = east_r - east_l
    delta_north = north_r - north_l
    section_length = np.sqrt(delta_east ** 2 + delta_north ** 2)

    # Normalize the section vector to get a unit vector for the crosswise direction
    unit_crosswise = np.array([delta_east, delta_north]) / section_length

    # The crosswise direction is perpendicular to the streamwise direction
    unit_streamwise = np.array([-unit_crosswise[1], unit_crosswise[0]])

    # Pre-allocate arrays for streamwise and crosswise components
    num_stations = len(results['disp_east'])
    results['S_east'] = np.zeros(num_stations)
    results['S_north'] = np.zeros(num_stations)
    results['C_east'] = np.zeros(num_stations)
    results['C_north'] = np.zeros(num_stations)

    # Iterate through each station and compute streamwise and crosswise components
    for i in range(num_stations):
        displacement_vector = np.array([results['disp_east'][i], results['disp_north'][i]])

        # Project the displacement onto the streamwise direction
        streamwise_component = np.dot(displacement_vector, unit_streamwise) * unit_streamwise

        # Project the displacement onto the crosswise direction
        crosswise_component = np.dot(displacement_vector, unit_crosswise) * unit_crosswise

        # Store the components in the pre-allocated arrays
        results['S_east'][i] = streamwise_component[0]
        results['S_north'][i] = streamwise_component[1]
        results['C_east'][i] = crosswise_component[0]
        results['C_north'][i] = crosswise_component[1]

    return results


def add_streamwise_magnitude_and_sign(results, east_l, north_l, east_r, north_r):
    """
    Add the magnitude and sign of the streamwise displacement component to the station dictionary using NumPy arrays.

    Parameters:
        results (dict): Dictionary containing 'east' and 'north' keys with real-world coordinates,
                        and 'S_east' and 'S_north' keys for streamwise displacements.
        east_l, north_l (float): Coordinates of the left point of the section.
        east_r, north_r (float): Coordinates of the right point of the section.

    Returns:
        dict: Updated station dictionary with 'S_magnitude' key containing the signed magnitudes of the streamwise components as a NumPy array.
    """
    # Calculate the section line vector (crosswise direction)
    delta_east = east_r - east_l
    delta_north = north_r - north_l

    # Calculate the section vector as a NumPy array
    section_vector = np.array([delta_east, delta_north])

    # Pre-allocate array for streamwise magnitudes with signs
    num_stations = len(results['S_east'])
    results['S_magnitude'] = np.zeros(num_stations)

    # Iterate through each station and calculate the magnitude and sign of the streamwise component
    for i in range(num_stations):
        # Streamwise displacement vector
        streamwise_vector = np.array([results['S_east'][i], results['S_north'][i]])

        # Magnitude of the streamwise component
        magnitude = np.linalg.norm(streamwise_vector)

        # Determine the sign using the cross product of the section vector and streamwise vector
        # Cross product (in 2D, z-component) tells us if streamwise_vector is clockwise or counterclockwise to the section vector
        cross_product = delta_east * results['S_north'][i] - delta_north * results['S_east'][i]

        # If cross_product > 0, streamwise_vector points in the positive flow direction (assign positive sign)
        # If cross_product < 0, streamwise_vector points in the negative flow direction (assign negative sign)
        sign = 1 if cross_product > 0 else -1 if cross_product < 0 else 0

        # Store the signed magnitude in the pre-allocated array
        results['S_magnitude'][i] = sign * magnitude

    return results


def add_depth(results, shifted_stations, stages, level):
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
    interpolated_stage = np.interp(results['distance'], shifted_stations, stages)

    # Calculate the depth as water level - interpolated stage
    depth = level - interpolated_stage

    # Add the depth to the results dictionary as a NumPy array
    results['depth'] = depth

    return results


def add_interpolated_velocity(results):
    """
    Interpolate missing or invalid velocity values in 'S_magnitud' based on Froude number profile.
    Updates the 'results' dictionary by adding a new key 'filled_velocity'.

    Parameters:
        results (dict): A dictionary containing:
            - 'depth' (np.array): Depth profile of the river cross-section.
            - 'distance' (np.array): Transversal distance across the river cross-section.
            - 'S_magnitude' (np.array): Measured velocity profile (with possible NaNs or invalid values).
            - 'check' (np.array): Boolean array indicating validity of measurements.

    Returns:
        results (dict): Updated dictionary with a new key 'filled_velocity' containing the filled velocity profile.
    """
    # Extract the data from the dictionary
    depth = np.array(results['depth'])
    distance = np.array(results['distance'])
    S_magnitude = np.array(results['S_magnitude'])
    check = np.array(results['check'])

    # Ensure depth has no zero values to avoid division by zero
    depth = np.maximum(depth, 1e-6)  # Adding a small epsilon to depth if needed

    # Calculate the Froude number profile
    Fr = S_magnitude / np.sqrt(9.81 * depth)

    # Identify invalid data (either NaNs or where check is False)
    invalid_data = np.isnan(S_magnitude) | (~check)

    # If all values are invalid, set filled_velocity to an array of zeros
    if np.all(invalid_data):
        filled_velocity = np.zeros_like(S_magnitude)
    else:
        # Define a helper function to find non-zero indices
        x = lambda z: z.nonzero()[0]

        # Perform linear interpolation to fill invalid data
        Fr[invalid_data] = np.interp(x(invalid_data), x(~invalid_data), Fr[~invalid_data])

        # Calculate the filled velocity profile based on the filled Froude profile
        filled_velocity = Fr * np.sqrt(9.81 * depth)

    with np.errstate(invalid='ignore', divide='ignore'):  # Ignore divide by zero or NaN warnings
        velocity_ratio = np.where(np.isnan(S_magnitude), np.nan, filled_velocity / S_magnitude)
    # Add the filled velocity profile to the results dictionary
    results['filled_S_magnitude'] = filled_velocity

    results['filled_S_east'] = results['S_east'] * velocity_ratio
    results['filled_S_north'] = results['S_north'] * velocity_ratio
    results['filled_C_east'] = results['C_east'] * velocity_ratio
    results['filled_C_north'] = results['C_north'] * velocity_ratio

    return results

def add_w_a_q(results, vel_type):
    """
    Calculate widths (W), areas (A), discharges (Q), and discharge portions (Q_portion)
    and add them to the results dictionary.

    Parameters:
        results (dict): Dictionary containing 'distance' (x-coordinates), 'S_magnitude' (velocities), and 'depth' (depths).
        vel_type (str): Determines whether to use 'S_magnitude' or 'filled_S_magnitude' for velocity.

    Returns:
        dict: Updated results dictionary with keys 'W' (widths), 'A' (areas), 'Q' (discharges), and 'Q_portion'.
    """
    x = results['distance']
    v = results['S_magnitude'] if vel_type == 'original' else results['filled_S_magnitude']
    d = results['depth']

    num_stations = len(x)

    # Initialize arrays for width (W), area (A), and discharge (Q)
    w = np.zeros(num_stations)

    # Calculate widths (W) for potentially irregular spacing
    for i in range(1, num_stations - 1):
        w[i] = (x[i + 1] - x[i - 1]) / 2
    w[0] = x[1] - x[0]
    w[-1] = x[-1] - x[-2]

    # Calculate areas (A)
    a = w * d

    # Calculate discharges (Q)
    q = a * v

    # Add W, A, and Q to the results dictionary
    results['W'] = w
    results['A'] = a
    results['Q'] = q

    # Calculate total discharge and Q_portion
    total_q = np.nansum(q)
    q_portion = q / total_q if total_q != 0 else np.zeros_like(q)

    # Add Q_portion to the results dictionary
    results['Q_portion'] = q_portion

    return results

# Replace the path with your actual file path
file_path = "/Users/antoine/Dropbox/04_Auto_Entrepreneur/01_Actual/03_Contrats/20221007_Canada/Juncal/CS3_Bath.csv"

# Initialize empty lists for stations and levels
stations = []
stages = []

with open(file_path, newline='') as inf:
    reader = csv.DictReader(inf)
    for row in reader:
        # Assuming the first column is the 'station' and the second is the 'level'
        stations.append(float(row[reader.fieldnames[0]]))
        stages.append(float(row[reader.fieldnames[1]]))

stations = np.array(stations)
stages = np.array(stages)

east_l, north_l = 200.0, 210.0  # Example values for the left point
east_r, north_r = 130.0, 200.0  # Example values for the right point
# Define the shift_left_margin

level = 650

crossing_stations = find_crossing_stations(stations, stages, level)

#Auto shift
shift_left_margin = crossing_stations[0]

shifted_stations, station_coordinates = calculate_station_coordinates(east_l, north_l, east_r, north_r, stations,
                                                                      shift_left_margin=shift_left_margin)
plt.plot(station_coordinates[:, 0], station_coordinates[:, 1], color='blue')
plt.plot(east_l, north_l, 'x', color='red')
plt.plot(east_r, north_r, 'x', color='green')
plt.plot([east_l, east_r], [north_l, north_r])
# plt.plot(shifted_stations, stages)

num_stations = 15  # Desired number of stations

results = divide_segment_to_dict(east_l, north_l, east_r, north_r, num_stations)

# Example transformation matrix
transformation_matrix = np.array([
    [0.024, 0.1, -6],
    [0.1, -0.024, 14.4],
    [0, 0, 1]
])

results = add_pixel_coordinates(results, transformation_matrix)

x_range = [np.min(results['x']), np.max(results['x'])]
y_range = [np.min(results['y']), np.max(results['y'])]
x = np.linspace(start=x_range[0], stop=x_range[1], num=50, endpoint=True)
y = np.linspace(start=y_range[0], stop=y_range[1], num=50, endpoint=True)
X, Y = np.meshgrid(x, y, indexing='xy')
k = 2 * np.pi / 10
f = np.cos(k * X) * np.cos(k * Y)  # Scalar field
U = - k * np.sin(k * X) * np.cos(k * Y)  # Gradient along X
V = - k * np.cos(k * X) * np.sin(k * Y)  # Gradient along Y
plt.quiver(X, Y, U, V)
plt.plot(results['x'], results['y'], 'x')

# Convert the pixel displacement field to real-world coordinates and displacements
EAST, NORTH, Displacement_EAST, Displacement_NORTH = ct.convert_displacement_field(X, Y, U, V, transformation_matrix)
plt.quiver(EAST, NORTH, Displacement_EAST, Displacement_NORTH)
plt.plot(east_l, north_l, 'x', color='red')
plt.plot(east_r, north_r, 'x', color='green')

results = add_cs_displacements(results, 'pixel', X, Y, U, V)
results = add_cs_displacements(results, 'real-world', EAST, NORTH, Displacement_EAST, Displacement_NORTH)

plt.quiver(results['east'], results['north'], results['disp_east'], results['disp_north'], color='blue')

results = add_stream_cross_displacements(results, east_l, north_l, east_r, north_r)
plt.quiver(results['east'], results['north'], results['S_east'], results['S_north'])
plt.plot(east_l, north_l, 'x', color='red')
plt.plot(east_r, north_r, 'x', color='green')
plt.gca().set_aspect('equal', 'box')

results = add_streamwise_magnitude_and_sign(results, east_l, north_l, east_r, north_r)

results = add_depth(results, shifted_stations, stages, level)


results['check'][6]=False
results['check'][4]=True
interpolate = True
if interpolate:
    results = add_interpolated_velocity(results)
    # plt.plot(results['distance'], results['S_magnitude'])
    # plt.plot(results['distance'], results['filled_velocity'])

    plt.quiver(results['east'], results['north'], results['filled_S_east'], results['filled_S_north'],color='blue')
    plt.quiver(results['east'], results['north'], results['S_east'], results['S_north'])
    plt.plot(east_l, north_l, 'x', color='red')
    plt.plot(east_r, north_r, 'x', color='green')

results = add_w_a_q(results,'filled')

results = add_w_a_q(results,'original')