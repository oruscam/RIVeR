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
    length = np.sqrt(dx**2 + dy**2)
    dx /= length
    dy /= length

    ox = -dy
    oy = dx

    tip_extension = 1.2 * ((width**2 - (width / 2) ** 2) ** 0.5)
    total_height = height + np.sign(height) * tip_extension

    corners_east = [
        east_c - (width / 2) * dx,
        east_c - (width / 2) * dx + height * ox,
        east_c + total_height * ox,
        east_c + (width / 2) * dx + height * ox,
        east_c + (width / 2) * dx,
        east_c - (width / 2) * dx,
    ]

    corners_north = [
        north_c - (width / 2) * dy,
        north_c - (width / 2) * dy + height * oy,
        north_c + total_height * oy,
        north_c + (width / 2) * dy + height * oy,
        north_c + (width / 2) * dy,
        north_c - (width / 2) * dy,
    ]

    return corners_east, corners_north


def calculate_multiple_arrows(
    east, north, magnitudes, transformation_matrix, image_width, width=0.5
):
    """Calculate the coordinates of multiple transformed and normalized arrows."""
    colors = ["#6CD4FF", "#62C655", "#F5BF61", "#ED6B57"]
    rgb_colors = [mcolors.hex2color(c) for c in colors]
    n_bins = 256
    color_positions = np.linspace(0, 1, len(rgb_colors))
    r, g, b = np.zeros(n_bins), np.zeros(n_bins), np.zeros(n_bins)

    for i in range(len(rgb_colors) - 1):
        mask = (np.linspace(0, 1, n_bins) >= color_positions[i]) & (
            np.linspace(0, 1, n_bins) <= color_positions[i + 1]
        )
        segment_positions = np.linspace(0, 1, np.sum(mask))
        r[mask] = np.interp(
            segment_positions, [0, 1], [rgb_colors[i][0], rgb_colors[i + 1][0]]
        )
        g[mask] = np.interp(
            segment_positions, [0, 1], [rgb_colors[i][1], rgb_colors[i + 1][1]]
        )
        b[mask] = np.interp(
            segment_positions, [0, 1], [rgb_colors[i][2], rgb_colors[i + 1][2]]
        )

    custom_cmap = mcolors.ListedColormap(np.column_stack((r, g, b)))

    valid_indices = [
        i
        for i in range(len(magnitudes))
        if magnitudes[i] is not None and not np.isnan(magnitudes[i])
    ]
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
        base = transform_real_world_to_pixel(
            east_filtered[i], north_filtered[i], transformation_matrix
        )
        tip = transform_real_world_to_pixel(
            east_filtered[i]
            + magnitudes_filtered[i] * (-north_next[i] + north_filtered[i]),
            north_filtered[i]
            + magnitudes_filtered[i] * (east_next[i] - east_filtered[i]),
            transformation_matrix,
        )
        max_transformed_length = max(
            max_transformed_length, np.sqrt(np.sum((tip - base) ** 2))
        )

    scale_factor = (
        target_max_length / max_transformed_length
        if max_transformed_length > 0
        else 1.0
    )
    arrows = []
    min_magnitude, max_magnitude = float(np.nanmin(magnitudes_filtered)), float(
        np.nanmax(magnitudes_filtered)
    )
    norm = mcolors.Normalize(vmin=min_magnitude, vmax=max_magnitude)

    for i in range(len(magnitudes_filtered)):
        corners_east, corners_north = calculate_arrow(
            east_filtered[i],
            north_filtered[i],
            east_next[i],
            north_next[i],
            magnitudes_filtered[i] * scale_factor,
            width,
        )
        transformed_points = np.array(
            [
                transform_real_world_to_pixel(e, n, transformation_matrix)
                for e, n in zip(corners_east, corners_north)
            ]
        )
        color_index = int(norm(magnitudes_filtered[i]) * 255)
        color = tuple(float(x) for x in custom_cmap(min(255, max(0, color_index))))
        arrows.append(
            {
                "points": transformed_points,
                "color": color,
                "magnitude": float(magnitudes_filtered[i]),
            }
        )

    return arrows, (min_magnitude, max_magnitude)


def calculate_multiple_arrows_adaptive(east, north, magnitudes, transformation_matrix, 
                                image_width, image_height, width=0.5, 
                                max_arrow_size_fraction=0.15, 
                                min_arrow_size_fraction=0.02,
                                boundary_margin=0.05):
    """
    Calculate the coordinates of multiple transformed and normalized arrows with adaptive scaling
    for a single section.
    
    For multiple sections, use calculate_multiple_arrows_multisection instead.
    """
    """
    Calculate the coordinates of multiple transformed and normalized arrows with adaptive scaling.
    
    Parameters:
    -----------
    east, north : array-like
        Real-world coordinates of arrow base points
    magnitudes : array-like
        Velocity magnitudes at each point
    transformation_matrix : ndarray
        Matrix to transform from real-world to pixel coordinates
    image_width, image_height : int
        Dimensions of the image
    width : float, optional
        Width of the arrow relative to its length
    max_arrow_size_fraction : float, optional
        Maximum arrow length as a fraction of image width
    min_arrow_size_fraction : float, optional
        Minimum arrow length as a fraction of image width for the smallest velocities
    boundary_margin : float, optional
        Margin from image boundaries as a fraction of image dimensions
        
    Returns:
    --------
    arrows : list
        List of dictionaries containing arrow points, color and magnitude
    magnitude_range : tuple
        Min and max magnitudes for color scale
    """
    import numpy as np
    import matplotlib.colors as mcolors
    from river.core.coordinate_transform import transform_real_world_to_pixel
    
    # Create color map (same as original function)
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
    
    # Filter out invalid magnitude values
    valid_indices = [i for i in range(len(magnitudes)) 
                    if magnitudes[i] is not None and not np.isnan(magnitudes[i])]
    
    # Remove the last point (which doesn't have a next point for direction)
    valid_indices = valid_indices[:-1] if valid_indices else []
    
    if not valid_indices:
        return [], (0, 0)
    
    # Extract valid data
    east_filtered = np.array([east[i] for i in valid_indices])
    north_filtered = np.array([north[i] for i in valid_indices])
    magnitudes_filtered = np.array([magnitudes[i] for i in valid_indices])
    east_next = np.array([east[i + 1] for i in valid_indices])
    north_next = np.array([north[i + 1] for i in valid_indices])
    
    # Define target arrow size range based on image dimensions
    max_target_length = image_width * max_arrow_size_fraction
    min_target_length = image_width * min_arrow_size_fraction
    
    # Calculate boundary margins in pixels
    x_margin = image_width * boundary_margin
    y_margin = image_height * boundary_margin
    
    # Set up color normalization
    min_magnitude, max_magnitude = float(np.nanmin(magnitudes_filtered)), float(np.nanmax(magnitudes_filtered))
    norm = mcolors.Normalize(vmin=min_magnitude, vmax=max_magnitude)
    
    arrows = []
    
    # Process each arrow individually with adaptive scaling
    for i in range(len(magnitudes_filtered)):
        # Get base point in pixel coordinates
        base_pixel = transform_real_world_to_pixel(
            east_filtered[i], north_filtered[i], transformation_matrix)
        
        # Skip if base point is outside image boundaries with margin
        if (base_pixel[0] < x_margin or base_pixel[0] > image_width - x_margin or
            base_pixel[1] < y_margin or base_pixel[1] > image_height - y_margin):
            continue
        
        # Calculate arrow direction in real-world coordinates
        dx = east_next[i] - east_filtered[i]
        dy = north_next[i] - north_filtered[i]
        direction_length = np.sqrt(dx**2 + dy**2)
        
        if direction_length > 0:
            dx /= direction_length
            dy /= direction_length
        else:
            # Default to pointing right if direction is undefined
            dx, dy = 1.0, 0.0
        
        # Rotate 90 degrees to get perpendicular direction for streamwise velocity
        # This matches your original code which seemed to be defining arrows perpendicular to the section
        streamwise_dx, streamwise_dy = -dy, dx
        
        # Create a test arrow to determine scaling
        test_magnitude = 1.0  # Use unit magnitude to determine scale
        test_tip_real = (
            east_filtered[i] + test_magnitude * streamwise_dx,
            north_filtered[i] + test_magnitude * streamwise_dy
        )
        
        # Transform to pixel coordinates
        test_tip_pixel = transform_real_world_to_pixel(
            test_tip_real[0], test_tip_real[1], transformation_matrix)
        
        # Calculate pixels per unit magnitude
        pixels_per_unit = np.sqrt((test_tip_pixel[0] - base_pixel[0])**2 + 
                                  (test_tip_pixel[1] - base_pixel[1])**2)
        
        # Adaptive scale factor based on position in image
        # Will be higher near image edges
        edge_distance_x = min(base_pixel[0], image_width - base_pixel[0]) / (image_width / 2)
        edge_distance_y = min(base_pixel[1], image_height - base_pixel[1]) / (image_height / 2)
        edge_distance = min(edge_distance_x, edge_distance_y)
        
        # Scale inversely with distance to edge (closer to edge = smaller arrows)
        edge_factor = np.clip(edge_distance, 0.3, 1.0)
        
        # Scale based on magnitude relative to the range
        magnitude_normalized = (magnitudes_filtered[i] - min_magnitude) / (max_magnitude - min_magnitude)
        
        # Calculate arrow length in pixels
        pixel_length = np.interp(magnitude_normalized, [0, 1], [min_target_length, max_target_length])
        
        # Apply edge factor adjustment
        pixel_length *= edge_factor
        
        # Calculate scale factor for real-world magnitude
        if pixels_per_unit > 0:
            scale_factor = pixel_length / (magnitudes_filtered[i] * pixels_per_unit)
        else:
            scale_factor = 1.0  # Fallback
        
        # Create arrow with calculated scale factor
        corners_east, corners_north = calculate_arrow(
            east_filtered[i], north_filtered[i], 
            east_next[i], north_next[i], 
            magnitudes_filtered[i] * scale_factor, width
        )
        
        # Transform to pixel coordinates
        transformed_points = np.array([
            transform_real_world_to_pixel(e, n, transformation_matrix) 
            for e, n in zip(corners_east, corners_north)
        ])
        
        # Check if arrow extends outside image boundaries
        points_within_bounds = np.all(
            (transformed_points[:, 0] >= 0) & 
            (transformed_points[:, 0] < image_width) &
            (transformed_points[:, 1] >= 0) & 
            (transformed_points[:, 1] < image_height)
        )
        
        # If arrow is outside bounds, try reducing its size
        if not points_within_bounds:
            # Try reducing to stay within bounds
            for reduction in [0.75, 0.5, 0.25]:
                corners_east, corners_north = calculate_arrow(
                    east_filtered[i], north_filtered[i], 
                    east_next[i], north_next[i], 
                    magnitudes_filtered[i] * scale_factor * reduction, width
                )
                
                transformed_points = np.array([
                    transform_real_world_to_pixel(e, n, transformation_matrix) 
                    for e, n in zip(corners_east, corners_north)
                ])
                
                points_within_bounds = np.all(
                    (transformed_points[:, 0] >= 0) & 
                    (transformed_points[:, 0] < image_width) &
                    (transformed_points[:, 1] >= 0) & 
                    (transformed_points[:, 1] < image_height)
                )
                
                if points_within_bounds:
                    break
            
            # Skip this arrow if it still doesn't fit
            if not points_within_bounds:
                continue
        
        # Get color based on magnitude
        color_index = int(norm(magnitudes_filtered[i]) * 255)
        color = tuple(float(x) for x in custom_cmap(min(255, max(0, color_index))))
        
        arrows.append({
            'points': transformed_points, 
            'color': color, 
            'magnitude': float(magnitudes_filtered[i])
        })
    
    return arrows, (min_magnitude, max_magnitude)


def calculate_multiple_arrows_multisection(xsections, section_configs, transformation_matrix,
                                          image_width, image_height, width=0.5,
                                          max_arrow_size_fraction=0.15,
                                          min_arrow_size_fraction=0.02,
                                          boundary_margin=0.05):
    """
    Calculate arrows for multiple cross-sections with consistent scaling across all sections.
    
    Parameters:
    -----------
    xsections : dict
        Dictionary containing cross-section data from xsection.json
    section_configs : list of dict
        List of dictionaries with configuration for each section:
        [
            {
                'id': 'section1',
                'interpolate': True,
                'artificial_seeding': False
            },
            {
                'id': 'section2',
                'interpolate': False,
                'artificial_seeding': True
            }
        ]
    transformation_matrix : ndarray
        Matrix to transform from real-world to pixel coordinates
    image_width, image_height : int
        Dimensions of the image
    width : float, optional
        Width of the arrow relative to its length
    max_arrow_size_fraction : float, optional
        Maximum arrow length as a fraction of image width
    min_arrow_size_fraction : float, optional
        Minimum arrow length as a fraction of image width for the smallest velocities
    boundary_margin : float, optional
        Margin from image boundaries as a fraction of image dimensions
        
    Returns:
    --------
    section_arrows : dict
        Dictionary of arrows by section
    magnitude_range : tuple
        Global min and max magnitudes for color scale
    """
    import numpy as np
    import matplotlib.colors as mcolors
    from river.core.coordinate_transform import transform_real_world_to_pixel
    
    # Helper function to determine velocity field based on settings
    def get_velocity_field(interpolate, artificial_seeding):
        if artificial_seeding:
            return 'filled_seeded_vel_profile' if interpolate else 'seeded_vel_profile'
        else:
            return 'filled_streamwise_velocity_magnitude' if interpolate else 'streamwise_velocity_magnitude'
    
    # First pass: determine global min and max magnitudes across all sections
    all_magnitudes = []
    section_velocity_fields = {}  # Store the determined velocity field for each section
    
    for config in section_configs:
        section_id = config['id']
        interpolate = config.get('interpolate', False)
        artificial_seeding = config.get('artificial_seeding', False)
        
        if section_id not in xsections:
            continue
            
        velocity_field = get_velocity_field(interpolate, artificial_seeding)
        section_velocity_fields[section_id] = velocity_field
        
        section = xsections[section_id]
        if velocity_field not in section:
            print(f"Warning: Velocity field '{velocity_field}' not found in section '{section_id}'")
            continue
            
        magnitudes = section[velocity_field]
        valid_magnitudes = [mag for mag in magnitudes if mag is not None and not np.isnan(mag)]
        all_magnitudes.extend(valid_magnitudes)
    
    if not all_magnitudes:
        return {}, (0, 0)
        
    global_min_magnitude = float(np.min(all_magnitudes))
    global_max_magnitude = float(np.max(all_magnitudes))
    global_magnitude_range = (global_min_magnitude, global_max_magnitude)
    
    # Create color map (same as original function)
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
    global_norm = mcolors.Normalize(vmin=global_min_magnitude, vmax=global_max_magnitude)
    
    # Calculate boundary margins in pixels
    x_margin = image_width * boundary_margin
    y_margin = image_height * boundary_margin
    
    # Define target arrow size range based on image dimensions
    max_target_length = image_width * max_arrow_size_fraction
    min_target_length = image_width * min_arrow_size_fraction
    
    # Second pass: calculate arrows for each section using global scaling
    section_arrows = {}
    
    for config in section_configs:
        section_id = config['id']
        
        if section_id not in xsections:
            continue
            
        velocity_field = section_velocity_fields.get(section_id)
        if not velocity_field:
            continue
            
        section = xsections[section_id]
        if ('east' not in section or 'north' not in section or 
            velocity_field not in section):
            print(f"Missing required fields in section '{section_id}'. Fields needed: east, north, {velocity_field}")
            continue
            
        east = section['east']
        north = section['north']
        magnitudes = section[velocity_field]
        
        # Filter out invalid magnitude values
        valid_indices = [i for i in range(len(magnitudes)) 
                       if magnitudes[i] is not None and not np.isnan(magnitudes[i])]
        
        # Remove the last point (which doesn't have a next point for direction)
        valid_indices = valid_indices[:-1] if valid_indices else []
        
        if not valid_indices:
            section_arrows[section_id] = []
            continue
        
        # Extract valid data
        east_filtered = np.array([east[i] for i in valid_indices])
        north_filtered = np.array([north[i] for i in valid_indices])
        magnitudes_filtered = np.array([magnitudes[i] for i in valid_indices])
        
        # Get the 'next' points for arrow direction
        # For the last point, we can use the second-to-last point direction
        next_indices = [i + 1 if i < len(east) - 1 else i - 1 for i in valid_indices]
        east_next = np.array([east[i] for i in next_indices])
        north_next = np.array([north[i] for i in next_indices])
        
        arrows = []
        
        # Process each arrow individually with adaptive scaling
        for i in range(len(magnitudes_filtered)):
            # Skip this point if it's not checked and interpolation is disabled
            if not config.get('interpolate', False):
                if 'check' in section and i < len(section['check']):
                    if not section['check'][i]:
                        continue
                        
            # Get base point in pixel coordinates
            base_pixel = transform_real_world_to_pixel(
                east_filtered[i], north_filtered[i], transformation_matrix)
            
            # Skip if base point is outside image boundaries with margin
            if (base_pixel[0] < x_margin or base_pixel[0] > image_width - x_margin or
                base_pixel[1] < y_margin or base_pixel[1] > image_height - y_margin):
                continue
            
            # Calculate arrow direction in real-world coordinates
            dx = east_next[i] - east_filtered[i]
            dy = north_next[i] - north_filtered[i]
            direction_length = np.sqrt(dx**2 + dy**2)
            
            if direction_length > 0:
                dx /= direction_length
                dy /= direction_length
            else:
                # Default to pointing right if direction is undefined
                dx, dy = 1.0, 0.0
            
            # Rotate 90 degrees to get perpendicular direction for streamwise velocity
            streamwise_dx, streamwise_dy = -dy, dx
            
            # Create a test arrow to determine scaling
            test_magnitude = 1.0  # Use unit magnitude to determine scale
            test_tip_real = (
                east_filtered[i] + test_magnitude * streamwise_dx,
                north_filtered[i] + test_magnitude * streamwise_dy
            )
            
            # Transform to pixel coordinates
            test_tip_pixel = transform_real_world_to_pixel(
                test_tip_real[0], test_tip_real[1], transformation_matrix)
            
            # Calculate pixels per unit magnitude
            pixels_per_unit = np.sqrt((test_tip_pixel[0] - base_pixel[0])**2 + 
                                     (test_tip_pixel[1] - base_pixel[1])**2)
            
            # Adaptive scale factor based on position in image
            edge_distance_x = min(base_pixel[0], image_width - base_pixel[0]) / (image_width / 2)
            edge_distance_y = min(base_pixel[1], image_height - base_pixel[1]) / (image_height / 2)
            edge_distance = min(edge_distance_x, edge_distance_y)
            
            # Scale inversely with distance to edge (closer to edge = smaller arrows)
            edge_factor = np.clip(edge_distance, 0.3, 1.0)
            
            # Scale based on magnitude relative to the GLOBAL range
            magnitude_normalized = (magnitudes_filtered[i] - global_min_magnitude) / (global_max_magnitude - global_min_magnitude)
            magnitude_normalized = np.clip(magnitude_normalized, 0, 1)  # Ensure within [0,1]
            
            # Calculate arrow length in pixels
            pixel_length = np.interp(magnitude_normalized, [0, 1], [min_target_length, max_target_length])
            
            # Apply edge factor adjustment
            pixel_length *= edge_factor
            
            # Calculate scale factor for real-world magnitude
            if pixels_per_unit > 0:
                scale_factor = pixel_length / (magnitudes_filtered[i] * pixels_per_unit)
            else:
                scale_factor = 1.0  # Fallback
            
            # Create arrow with calculated scale factor
            corners_east, corners_north = calculate_arrow(
                east_filtered[i], north_filtered[i], 
                east_next[i], north_next[i], 
                magnitudes_filtered[i] * scale_factor, width
            )
            
            # Transform to pixel coordinates
            transformed_points = np.array([
                transform_real_world_to_pixel(e, n, transformation_matrix) 
                for e, n in zip(corners_east, corners_north)
            ])
            
            # Check if arrow extends outside image boundaries
            points_within_bounds = np.all(
                (transformed_points[:, 0] >= 0) & 
                (transformed_points[:, 0] < image_width) &
                (transformed_points[:, 1] >= 0) & 
                (transformed_points[:, 1] < image_height)
            )
            
            # If arrow is outside bounds, try reducing its size
            if not points_within_bounds:
                # Try reducing to stay within bounds
                for reduction in [0.75, 0.5, 0.25]:
                    corners_east, corners_north = calculate_arrow(
                        east_filtered[i], north_filtered[i], 
                        east_next[i], north_next[i], 
                        magnitudes_filtered[i] * scale_factor * reduction, width
                    )
                    
                    transformed_points = np.array([
                        transform_real_world_to_pixel(e, n, transformation_matrix) 
                        for e, n in zip(corners_east, corners_north)
                    ])
                    
                    points_within_bounds = np.all(
                        (transformed_points[:, 0] >= 0) & 
                        (transformed_points[:, 0] < image_width) &
                        (transformed_points[:, 1] >= 0) & 
                        (transformed_points[:, 1] < image_height)
                    )
                    
                    if points_within_bounds:
                        break
                
                # Skip this arrow if it still doesn't fit
                if not points_within_bounds:
                    continue
            
            # Get color based on magnitude using GLOBAL normalization
            color_index = int(global_norm(magnitudes_filtered[i]) * 255)
            color = tuple(float(x) for x in custom_cmap(min(255, max(0, color_index))))
            
            arrows.append({
                'points': transformed_points, 
                'color': color, 
                'magnitude': float(magnitudes_filtered[i])
            })
        
        section_arrows[section_id] = arrows
    
    return section_arrows, global_magnitude_range