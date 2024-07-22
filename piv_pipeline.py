import cv2
import image_preprocessing as impp
from piv_fftmulti import piv_fftmulti
import os
import define_roi_masks as drm
import numpy as np

image1_path = '0000000001.jpg'
image2_path = '0000000003.jpg'
# Path to the folder containing images
import define_roi_masks as drm
from matplotlib import pyplot as plt
json_transformation = 'uav_transformation_matrix.json'
json_settings = 'sections.json'
height_roi = 5
mask, bbox = drm.create_mask_and_bbox(image1, json_settings, json_transformation, height_roi)
xtable, ytable, utable, vtable, typevector, gradient = run_test(image1_path, image2_path, mask, bbox,  interrogationarea=interrogationarea, seeding_filter=False, filt_sub_backgnd=True)
fig, ax = plt.subplots(1)
ax.imshow(cv2.imread(image1_path, cv2.IMREAD_GRAYSCALE))
ax.imshow(mask, alpha=0.2)
ax.quiver(xtable[typevector==1], ytable[typevector==1], utable[typevector==1], -vtable[typevector==1])

def run_test(image1_path, image2_path, mask=None, bbox=None, interrogationarea=128, int2=None,
             mask_auto=True, multipass=True, std_filter=True, stdthresh=4,
             median_test_filter=True, epsilon=0.02, thresh=2,
             seeding_filter=False, step=None, filt_grayscale=True, filt_clahe=True,
             clipLimit_clahe=5, filt_sub_backgnd=False):
    """
    Run PIV test with optional preprocessing steps.

    Parameters:
    image1_path : str
        Path to the first image file.
    image2_path : str
        Path to the second image file.
    mask : np.ndarray
        The mask for the region of interest.
    bbox : list, optional
        The bounding box for the region of interest. Default is None.
    interrogationarea : int
        The size of the interrogation area.
    int2 : int, optional
        The size of the second interrogation area.
    mask_auto : bool, optional
        Whether to automatically apply a mask. Default is True.
    multipass : bool, optional
        Whether to use multiple passes. Default is True.
    std_filter : bool, optional
        Whether to apply standard deviation filtering. Default is True.
    stdthresh : float, optional
        The threshold for standard deviation filtering. Default is 4.
    median_test_filter : bool, optional
        Whether to apply median test filtering. Default is True.
    epsilon : float, optional
        The epsilon value for median test filtering. Default is 0.02.
    thresh : float, optional
        The threshold value for median test filtering. Default is 2.
    seeding_filter : bool, optional
        Whether to apply seeding filtering. Default is False.
    step : int, optional
        The step size for grid calculations.
    filt_grayscale : bool, optional
        Whether to convert images to grayscale. Default is True.
    filt_clahe : bool, optional
        Whether to apply CLAHE filtering. Default is True.
    clipLimit_clahe : int, optional
        The clip limit for CLAHE. Default is 5.
    filt_sub_backgnd : bool, optional
        Whether to subtract background. Default is False.

    Returns:
    tuple
        Contains xtable, ytable, utable, vtable, typevector representing the displacement vectors on the grid.
    """

    if filt_grayscale:
        image1 = cv2.imread(image1_path, cv2.IMREAD_GRAYSCALE)
        image2 = cv2.imread(image2_path, cv2.IMREAD_GRAYSCALE)
    else:
        image1 = cv2.imread(image1_path)
        image2 = cv2.imread(image2_path)

    if filt_sub_backgnd and filt_grayscale:
        image_folder = os.path.dirname(os.path.abspath(image1_path))
        backgnd = impp.calculate_average(image_folder)
        image1 = impp.subtract_background(image1, backgnd)
        image2 = impp.subtract_background(image2, backgnd)

    if filt_clahe and filt_grayscale:
        clahe = impp.create_clahe(clipLimit_clahe)
        image1 = clahe.apply(image1)
        image2 = clahe.apply(image2)


    if mask is None:
        mask = np.ones(image1.shape, dtype=np.uint8)

    if bbox is None:
        height, width = image1.shape[:2]
        bbox = [0, 0, width, height]

    xtable, ytable, utable, vtable, typevector, gradient = piv_fftmulti(
        image1, image2, mask=mask, bbox=bbox, interrogationarea=interrogationarea, int2=int2,
        mask_auto=mask_auto, multipass=multipass, std_filter=std_filter,
        stdthresh=stdthresh, median_test_filter=median_test_filter,
        epsilon=epsilon, thresh=thresh, seeding_filter=seeding_filter, step=step
    )

    return xtable, ytable, utable, vtable, typevector, gradient




