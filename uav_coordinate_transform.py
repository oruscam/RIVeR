# uav_coordinate_transform.py

import numpy as np


def calculate_pixel_distance(x1_pix, y1_pix, x2_pix, y2_pix):
    """
    Calculate the Euclidean distance between two points in pixel coordinates.

    Parameters:
        x1_pix (float): X coordinate of the first point in pixels.
        y1_pix (float): Y coordinate of the first point in pixels.
        x2_pix (float): X coordinate of the second point in pixels.
        y2_pix (float): Y coordinate of the second point in pixels.

    Returns:
        float: Distance between the two points in pixels.
    """
    return np.sqrt((x2_pix - x1_pix) ** 2 + (y2_pix - y1_pix) ** 2)


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
    pixel_distance = calculate_pixel_distance(x1_pix, y1_pix, x2_pix, y2_pix)
    real_world_distance = calculate_real_world_distance(x1_rw, y1_rw, x2_rw, y2_rw)
    return real_world_distance / pixel_distance


def compute_transformation_matrix(x1_pix, y1_pix, x2_pix, y2_pix, x1_rw, y1_rw, x2_rw, y2_rw):
    """
    Compute the transformation matrix from pixel to real-world coordinates.

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
    pixel_size = compute_pixel_size(x1_pix, y1_pix, x2_pix, y2_pix, x1_rw, y1_rw, x2_rw, y2_rw)

    # Compute translation
    translation_x = x1_rw - x1_pix * pixel_size
    translation_y = y1_rw - y1_pix * pixel_size

    # Transformation matrix
    transformation_matrix = np.array([
        [pixel_size, 0, translation_x],
        [0, pixel_size, translation_y],
        [0, 0, 1]
    ])

    return transformation_matrix


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
