# coordinate_transform.py

import numpy as np
from scipy.optimize import minimize
import cv2

def calculate_real_world_distance(x1_rw, y1_rw, x2_rw, y2_rw):
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


def compute_pixel_size(x1_pix, y1_pix, x2_pix, y2_pix, x1_rw, y1_rw, x2_rw, y2_rw):
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


def uav_transformation_matrix(x1_pix, y1_pix, x2_pix, y2_pix, x1_rw, y1_rw, x2_rw, y2_rw):
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
            float: The size of a pixel in real-world units.
        """
    # Step 1: Calculate pixel size
    pixel_size = compute_pixel_size(x1_pix, y1_pix, x2_pix, y2_pix, x1_rw, y1_rw, x2_rw, y2_rw)

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
    rotation_matrix = np.array([
        [cos_theta, -sin_theta, 0],
        [sin_theta, cos_theta, 0],
        [0, 0, 1]
    ])

    # Step 4: Translate the first pixel point to the origin
    translated_x1 = x1_rw - (x1_pix * pixel_size * cos_theta - y1_pix * pixel_size * sin_theta)
    translated_y1 = y1_rw - (-x1_pix * pixel_size * sin_theta - y1_pix * pixel_size * cos_theta)

    # Step 5: Create the scaling and translation matrix
    scale_translation_matrix = np.array([
        [pixel_size, 0, translated_x1],
        [0, -pixel_size, translated_y1],
        [0, 0, 1]
    ])

    # Step 6: Combine rotation and scaling/translation matrices
    transformation_matrix = np.dot(scale_translation_matrix, rotation_matrix)

    return transformation_matrix, pixel_size

def oblique_view_transformation_matrix(x1_pix, y1_pix, x2_pix, y2_pix,
                                     x3_pix, y3_pix, x4_pix, y4_pix,
                                     d12, d23, d34, d41, d13, d24):
    """
    Compute the homography transformation matrix based on pixel coordinates and
    real-world distances.

    Parameters:
        x1_pix, y1_pix, x2_pix, y2_pix, x3_pix, y3_pix, x4_pix, y4_pix: float
            Pixel coordinates for four points.
        d12, d23, d34, d41, d13, d24: float
            Real-world distances between corresponding points.

    Returns:
        ndarray: 3x3 homography matrix (H) that transforms pixel coordinates
                 to real-world coordinates.
    """
    # Coordinates for points 1 and 2 in real-world space
    east_1, north_1 = 0, 0
    east_2, north_2 = d12, 0

    # Calculate or approximate the real-world coordinates for points 3 and 4
    east_3, north_3, east_4, north_4 = optimize_coordinates(
        d12, d23, d34, d41, d13, d24
    )

    # Pixel coordinates for the four points
    pixel_coords = np.array([
        [x1_pix, y1_pix],
        [x2_pix, y2_pix],
        [x3_pix, y3_pix],
        [x4_pix, y4_pix]
    ])

    # Real-world coordinates (east, north)
    real_world_coords = np.array([
        [east_1, north_1],
        [east_2, north_2],
        [east_3, north_3],
        [east_4, north_4]
    ])

    # Calculate the homography matrix (H)
    H, _ = cv2.findHomography(pixel_coords, real_world_coords)

    return H

def pixel_to_real_world(x_pix, y_pix, transformation_matrix):
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


def real_world_to_pixel(x_rw, y_rw, transformation_matrix):
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

def convert_displacement_field(X, Y, U, V, transformation_matrix):
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
            east_north = pixel_to_real_world(X[i, j], Y[i, j], transformation_matrix)
            EAST[i, j], NORTH[i, j] = east_north

            # Convert the displaced pixel coordinates (X + U, Y + V) to real-world coordinates
            displaced_east_north = pixel_to_real_world(X[i, j] + U[i, j], Y[i, j] + V[i, j], transformation_matrix)

            # Calculate the real-world displacement
            Displacement_EAST[i, j] = displaced_east_north[0] - east_north[0]
            Displacement_NORTH[i, j] = displaced_east_north[1] - east_north[1]

    return EAST, NORTH, Displacement_EAST, Displacement_NORTH


def optimize_coordinates(d12, d23, d34, d41, d13, d24):
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
    def objective(vars):
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
# Example of use !

# import coordinate_transform as ct
# import cv2
# import matplotlib.pyplot as plt
# import numpy as np
#
#
# def get_roi_corners(x0_rw, y0_rw, height_roi, width_roi, T):
#     # Define real-world coordinates of ROI corners
#     rw_corners = [(x0_rw, y0_rw),
#                   (x0_rw + width_roi, y0_rw),
#                   (x0_rw + width_roi, y0_rw + height_roi),
#                   (x0_rw, y0_rw + height_roi)]
#
#     # Transform real-world coordinates to pixel coordinates
#     pix_corners = [ct.real_world_to_pixel(x_rw, y_rw, T) for x_rw, y_rw in rw_corners]
#
#     return pix_corners
#
#
# I = cv2.imread(
#     '/Users/antoine/Dropbox/04_Auto_Entrepreneur/01_Actual/03_Contrats/20191103_Canada/05_Training/Case_1/DJI_0083/DJI_0083_seq1_00002.jpg')
#
# x1_pix, y1_pix = 1700, 1000
# x2_pix, y2_pix = 2474, 900
# x1_rw, y1_rw = 25, 0
# x2_rw, y2_rw = 0, 0
#
# plt.imshow(I)
# plt.plot((x1_pix, x2_pix ),(y1_pix, y2_pix))
#
# T, scale = uav_transformation_matrix(x1_pix, y1_pix, x2_pix, y2_pix, x1_rw, y1_rw, x2_rw, y2_rw)
#
# pt = real_world_to_pixel(5, 5, T)
# plt.plot(pt[0], pt[1], 'r+', markersize=10)
#
# height_roi, width_roi = 10, 25
# x0_rw, y0_rw = 0, -height_roi / 2
#
# # Get pixel coordinates of ROI corners
# pix_corners = get_roi_corners(x0_rw, y0_rw, height_roi, width_roi, T)
#
# # Convert list of tuples to numpy array
# roi_pixel = np.array(pix_corners, dtype=np.float32)
#
# # Define destination points (real world coordinates) - rectangle of same size as ROI
# dst_pts = np.array([[0, 0], [width_roi, 0], [width_roi, height_roi], [0, height_roi]], dtype=np.float32)
#
# # Compute perspective transform matrix
# M = cv2.getPerspectiveTransform(roi_pixel, dst_pts / scale)
#
# # Apply perspective transformation to the image
# rectified_im = cv2.warpPerspective(I, M, (int(width_roi / scale), int(height_roi / scale)))
#
# # Display the transformed ROI
# plt.figure(figsize=(8, 6))
# plt.imshow(rectified_im)
#
# plt.figure(figsize=(8, 6))
# plt.imshow(I)
# x_coords, y_coords = zip(*pix_corners)
# plt.scatter(x_coords, y_coords, c='green', marker='o')  # Scatter plot of points
# plt.plot(x_coords, y_coords, 'g-')
