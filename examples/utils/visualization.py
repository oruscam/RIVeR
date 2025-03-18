import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Rectangle, Ellipse

def plot_camera_solution(frame_rgb, grp_dict, cam_solution, figsize=(15, 6)):
    """
    Create a visualization of camera solution with two subplots:
    1. Original image with GRP points, projected points, and uncertainty ellipses
    2. Orthorectified image with real-world coordinates and camera position
    
    Parameters:
    -----------
    frame_rgb : numpy.ndarray
        RGB image frame
    grp_dict : dict
        Dictionary containing GRP points with keys 'x', 'y' for pixel coordinates
        and 'X', 'Y' for real-world coordinates
    cam_solution : dict
        Dictionary containing camera solution information with keys:
        - 'projected_points': 2D array of projected point coordinates
        - 'uncertainty_ellipses': list of ellipse dictionaries with 'center', 'width', 
                                'height', and 'angle'
        - 'ortho_image': orthorectified image
        - 'ortho_extent': extent of orthorectified image [xmin, xmax, ymin, ymax]
        - 'camera_position': [x, y] position of camera in real-world coordinates
    figsize : tuple, optional
        Figure size in inches (width, height)
    
    Returns:
    --------
    fig : matplotlib.figure.Figure
        The created figure object containing both plots
    """
    # Create figure with two subplots
    fig, (ax_pix, ax_rw) = plt.subplots(1, 2, figsize=figsize)

    # First subplot - Original image with GRP points and projections
    ax_pix.imshow(frame_rgb)
    # Keep track of image dimensions
    img_height, img_width = (frame_rgb.shape[:2])

    # Plot GRP points
    ax_pix.scatter(grp_dict['x'], grp_dict['y'],
                marker='x',
                c='#6CD4FF',
                label='GRP Points')

    # Plot projected points
    projected_points = cam_solution['projected_points']
    ax_pix.scatter(projected_points[:,0], projected_points[:,1],
                marker='.',
                c='#ED6B57',
                label='Projected Points')

    # Plot uncertainty ellipses
    ellipses_to_plot = cam_solution['uncertainty_ellipses']
    for ellipse in ellipses_to_plot:
        e = Ellipse(
            xy=ellipse['center'], width=ellipse['width'], height=ellipse['height'],
            angle=ellipse['angle'],
            fill=True,
            facecolor='#F5BF61',
            alpha=0.5,
            edgecolor='#F5BF61',
            linewidth=1
        )
        ax_pix.add_patch(e)

    # Force limits to image dimensions
    ax_pix.set_xlim(0, img_width - 1)
    ax_pix.set_ylim(img_height - 1, 0)  # Reversed for image coordinates
    ax_pix.set_axis_off()
    ax_pix.set_title('Original Image')

    # Second subplot - Orthorectified image with real-world coordinates
    ax_rw.imshow(cam_solution['ortho_image'], extent=cam_solution['ortho_extent'])

    # Plot GRP points in real-world coordinates
    ax_rw.scatter(grp_dict['X'], grp_dict['Y'],
                marker='x',
                color='#6CD4FF',
                label='GRP Points')

    # Plot camera position
    ax_rw.scatter(cam_solution['camera_position'][0], cam_solution['camera_position'][1],
                marker='o',
                color='black',
                label='Camera Position')

    # Set tick parameters
    ax_rw.tick_params(direction='in', which='both')

    # Get original extent
    xmin, xmax, ymin, ymax = cam_solution['ortho_extent']
    margin = 0.1 * max(xmax - xmin, ymax - ymin)  # Use same margin scale for both directions

    # Only extend limits in direction of camera
    new_xmin = min(xmin, cam_solution['camera_position'][0] - margin) if cam_solution['camera_position'][0] < xmin else xmin
    new_xmax = max(xmax, cam_solution['camera_position'][0] + margin) if cam_solution['camera_position'][0] > xmax else xmax
    new_ymin = min(ymin, cam_solution['camera_position'][1] - margin) if cam_solution['camera_position'][1] < ymin else ymin
    new_ymax = max(ymax, cam_solution['camera_position'][1] + margin) if cam_solution['camera_position'][1] > ymax else ymax

    # Set plot limits
    ax_rw.set_xlim(new_xmin, new_xmax)
    ax_rw.set_ylim(new_ymin, new_ymax)

    # Add labels and title
    ax_rw.set_xlabel('East (m)')
    ax_rw.set_ylabel('North (m)')
    ax_rw.set_title('Orthorectified Image')

    # Add legend
    ax_rw.legend(loc='best')

    # Add scale bar
    # Calculate appropriate scale length
    map_width = xmax - xmin
    magnitude = 10 ** np.floor(np.log10(map_width * 0.2))
    scale_length = np.round(map_width * 0.2 / magnitude) * magnitude
    scale_length_rounded = int(scale_length) if scale_length < 10 else scale_length

    # Define scale bar position
    margin_scale = (xmax - xmin) * 0.05  # 5% margin from edges
    bar_height = (ymax - ymin) * 0.015  # Height of bar
    x_pos = xmax - margin_scale - scale_length_rounded
    y_pos = ymin + margin_scale

    # Add scale bar
    rect = Rectangle((x_pos, y_pos), scale_length_rounded, bar_height,
                    fc='white', ec='black')
    ax_rw.add_patch(rect)

    # Add text label for the scale bar
    ax_rw.text(x_pos + scale_length_rounded/2, y_pos + 2*bar_height,
            f'{int(scale_length_rounded)} m',
            ha='center', va='bottom', fontsize=9,
            bbox=dict(facecolor='white', alpha=0.7, pad=2))

    plt.tight_layout()
    
    return fig