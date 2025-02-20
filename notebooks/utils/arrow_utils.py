"""
Utility functions for calculating and plotting velocity arrows for river flow visualization.
"""

import numpy as np
import matplotlib.colors as mcolors
from river.core.coordinate_transform import transform_real_world_to_pixel

def calculate_arrow(east_c, north_c, east_next, north_next, height, width=0.5):
    """Calculate corners for arrow with base centered on point."""
    dx = east_next - east_c
    dy = north_next - north_c
    length = np.sqrt(dx ** 2 + dy ** 2)
    dx /= length
    dy /= length

    ox = -dy
    oy = dx

    tip_extension = 1.2 * ((width ** 2 - (width / 2) ** 2) ** 0.5)
    total_height = height + np.sign(height) * tip_extension

    corners_east = [
        east_c - (width / 2) * dx,
        east_c - (width / 2) * dx + height * ox,
        east_c + total_height * ox,
        east_c + (width / 2) * dx + height * ox,
        east_c + (width / 2) * dx,
        east_c - (width / 2) * dx
    ]

    corners_north = [
        north_c - (width / 2) * dy,
        north_c - (width / 2) * dy + height * oy,
        north_c + total_height * oy,
        north_c + (width / 2) * dy + height * oy,
        north_c + (width / 2) * dy,
        north_c - (width / 2) * dy
    ]

    return corners_east, corners_north

def calculate_multiple_arrows(east, north, magnitudes, transformation_matrix, image_width, width=0.5):
    """Calculate the coordinates of multiple transformed and normalized arrows."""
    colors = ['#6CD4FF', '#62C655', '#F5BF61', '#ED6B57']
    rgb_colors = [mcolors.hex2color(c) for c in colors]
    n_bins = 256
    color_positions = np.linspace(0, 1, len(rgb_colors))
    r, g, b = np.zeros(n_bins), np.zeros(n_bins), np.zeros(n_bins)
    
    for i in range(len(rgb_colors) - 1):
        mask = (np.linspace(0, 1, n_bins) >= color_positions[i]) & (np.linspace(0, 1, n_bins) <= color_positions[i + 1])
        segment_positions = np.linspace(0, 1, np.sum(mask))
        r[mask] = np.interp(segment_positions, [0, 1], [rgb_colors[i][0], rgb_colors[i + 1][0]])
        g[mask] = np.interp(segment_positions, [0, 1], [rgb_colors[i][1], rgb_colors[i + 1][1]])
        b[mask] = np.interp(segment_positions, [0, 1], [rgb_colors[i][2], rgb_colors[i + 1][2]])

    custom_cmap = mcolors.ListedColormap(np.column_stack((r, g, b)))

    valid_indices = [i for i in range(len(magnitudes)) if magnitudes[i] is not None and not np.isnan(magnitudes[i])]
    valid_indices = valid_indices[:-1]
    if not valid_indices:
        return [], (0, 0)

    east_filtered = np.array([east[i] for i in valid_indices])
    north_filtered = np.array([north[i] for i in valid_indices])
    magnitudes_filtered = np.array([magnitudes[i] for i in valid_indices])
    east_next = np.array([east[i + 1] for i in valid_indices])
    north_next = np.array([north[i + 1] for i in valid_indices])

    target_max_length = image_width / 5
    max_transformed_length = 0
    for i in range(len(magnitudes_filtered)):
        base = transform_real_world_to_pixel(east_filtered[i], north_filtered[i], transformation_matrix)
        tip = transform_real_world_to_pixel(
            east_filtered[i] + magnitudes_filtered[i] * (-north_next[i] + north_filtered[i]),
            north_filtered[i] + magnitudes_filtered[i] * (east_next[i] - east_filtered[i]),
            transformation_matrix
        )
        max_transformed_length = max(max_transformed_length, np.sqrt(np.sum((tip - base) ** 2)))

    scale_factor = target_max_length / max_transformed_length if max_transformed_length > 0 else 1.0
    arrows = []
    min_magnitude, max_magnitude = float(np.nanmin(magnitudes_filtered)), float(np.nanmax(magnitudes_filtered))
    norm = mcolors.Normalize(vmin=min_magnitude, vmax=max_magnitude)

    for i in range(len(magnitudes_filtered)):
        corners_east, corners_north = calculate_arrow(
            east_filtered[i], north_filtered[i], east_next[i], north_next[i], magnitudes_filtered[i] * scale_factor, width
        )
        transformed_points = np.array([
            transform_real_world_to_pixel(e, n, transformation_matrix) for e, n in zip(corners_east, corners_north)
        ])
        color_index = int(norm(magnitudes_filtered[i]) * 255)
        color = tuple(float(x) for x in custom_cmap(min(255, max(0, color_index))))
        arrows.append({'points': transformed_points, 'color': color, 'magnitude': float(magnitudes_filtered[i])})
    
    return arrows, (min_magnitude, max_magnitude)