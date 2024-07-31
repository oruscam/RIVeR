"""
File Name: piv_pipeline.py
Project Name: RIVeR-LAC
Description: Perform image filtering before Particle Image Velocimetry (PIV) on a pair of frame (Test) or a list of frames.

Created Date: 2024-07-22
Author: Antoine Patalano
Email: antoine.patalano@unc.edu.ar
Company: UNC / ORUS

This script contains functions for processing and analyzing PIV images.
See examples of use at the end
"""
import cv2
import image_preprocessing as impp
from piv_fftmulti import piv_fftmulti
import os
import numpy as np
import glob
import multiprocessing
from concurrent.futures.thread import ThreadPoolExecutor
from piv_loop import piv_loop
# import json


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
    dict
        A dictionary containing results such as 'shape', 'x', 'y', 'u', 'v' and 'typevector'.

    """
    backgnd = None

    if filt_sub_backgnd:
        filt_grayscale = True #forces to work with grayscale images if filt_sub_backgnd
        image_folder = os.path.dirname(os.path.abspath(image1_path))
        backgnd = impp.calculate_average(image_folder)

    image1 = impp.preprocess_image(image1_path, filt_grayscale, filt_clahe, clipLimit_clahe, filt_sub_backgnd, backgnd)
    image2 = impp.preprocess_image(image2_path, filt_grayscale, filt_clahe, clipLimit_clahe, filt_sub_backgnd, backgnd)

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

    results = {
        'shape': xtable.shape,
        'x': xtable.flatten().tolist(),
        'y': ytable.flatten().tolist(),
        'u': utable.flatten().tolist(),
        'v': vtable.flatten().tolist(),
        'typevector': typevector.flatten().tolist()
    }

    # # Save the results
    # json_file_path = os.path.join(image_folder, 'test_piv.json')
    # with open(json_file_path, 'w') as json_file:
    #     json.dump(results, json_file)

    return results

def run_analyze_all(images_location, mask=None, bbox=None, interrogationarea=128, int2=None,
                    mask_auto=True, multipass=True, std_filter=True, stdthresh=4,
                    median_test_filter=True, epsilon=0.02, thresh=2,
                    seeding_filter=False, step=None, filt_grayscale=True, filt_clahe=True,
                    clipLimit_clahe=5, filt_sub_backgnd=False, save_backgnd=True):
    """
    Run PIV analysis on all images in the specified location.

    Parameters:
    images_location : str
        Path to the directory containing the images.
    mask : np.ndarray, optional
        The mask for the region of interest. If None, a mask of ones will be created. Default is None.
    bbox : list of float, optional
        The bounding box for the region of interest as normalized coordinates (x0, y0, x1, y1). Default is None.
    interrogationarea : int, optional
        The size of the interrogation area. Default is 128.
    int2 : int, optional
        The size of the second interrogation area. Default is None.
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
        The step size for grid calculations. Default is None.
    filt_grayscale : bool, optional
        Whether to convert images to grayscale. Default is True.
    filt_clahe : bool, optional
        Whether to apply CLAHE filtering. Default is True.
    clipLimit_clahe : int, optional
        The clip limit for CLAHE. Default is 5.
    filt_sub_backgnd : bool, optional
        Whether to subtract background. Default is False.

    Returns:
    dict
        A dictionary containing results such as 'shape', 'x', 'y', 'u_median', 'v_median', 'u', 'v', 'typevector',
        and 'gradient' (if seeding_filter is True).
    """
    backgnd = None
    path_images = glob.glob(os.path.join(images_location, "*.jpg"))
    path_images = sorted(path_images)
    total_frames = len(path_images)

    max_workers = multiprocessing.cpu_count()

    first_image = cv2.imread(path_images[0])
    if mask is None:
        mask = np.ones(first_image.shape, dtype=np.uint8)

    if bbox is None:
        height, width = first_image.shape[:2]
        bbox = [0, 0, width, height]

    chunk_size = int(np.ceil(total_frames / max_workers))

    chunks = [[i, i + chunk_size] for i in range(0, len(path_images) - 1, chunk_size)]
    chunks[-1][-1] = min(chunks[-1][-1], len(path_images) - 1)

    # Create the folder to save the results
    parent_directory = os.path.dirname(images_location)
    results_directory_path = os.path.join(parent_directory, 'results')
    if not os.path.exists(results_directory_path):
        os.makedirs(results_directory_path)

    if filt_sub_backgnd:
        filt_grayscale = True  # forces to work with grayscale images if filt_sub_backgnd
        backgnd = impp.calculate_average(images_location)
        if save_backgnd:
            save_path = os.path.join(results_directory_path, 'background.jpg')
            cv2.imwrite(save_path, backgnd)

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [
            executor.submit(
                piv_loop, path_images, mask, bbox, interrogationarea, int2, mask_auto, multipass, std_filter,
                stdthresh, median_test_filter, epsilon, thresh, seeding_filter, step, filt_grayscale,
                filt_clahe, clipLimit_clahe, filt_sub_backgnd, backgnd, cur_chunk[0], cur_chunk[1]
            ) for cur_chunk in chunks
        ]

        dict_cumul = {'u': futures[0].result()["u"],
                      'v': futures[0].result()["v"],
                      'typevector': futures[0].result()["typevector"]}
        if seeding_filter:
            dict_cumul['gradient'] = futures[0].result()["gradient"]

        xtable = futures[0].result()["x"]
        ytable = futures[0].result()["y"]

        for f in range(1, len(futures)):
            dict_cumul['u'] = np.hstack((dict_cumul['u'], futures[f].result()["u"]))
            dict_cumul['v'] = np.hstack((dict_cumul['v'], futures[f].result()["v"]))
            dict_cumul['typevector'] = np.hstack((dict_cumul['typevector'], futures[f].result()["typevector"]))
            if seeding_filter:
                dict_cumul['gradient'] = np.hstack((dict_cumul['gradient'], futures[f].result()["gradient"]))


    # Calculate the median
    u_median = np.nanmedian(dict_cumul['u'], 1)
    v_median = np.nanmedian(dict_cumul['v'], 1)

    results = {
        'shape': xtable.shape,
        'x': xtable.flatten().tolist(),
        'y': ytable.flatten().tolist(),
        'u_median': u_median.tolist(),
        'v_median': v_median.tolist(),
        'u': dict_cumul['u'].T.tolist(),
        'v': dict_cumul['v'].T.tolist(),
        'typevector': dict_cumul['typevector'].T.tolist()
    }

    if seeding_filter:
        results['gradient'] = dict_cumul['gradient'].T.tolist()

    # Save the results
    # json_file_path = os.path.join(results_directory_path, 'results_piv.json')
    # with open(json_file_path, 'w') as json_file:
    #     json.dump(results, json_file)

    return results


# # Example of use of run_test
# import define_roi_masks as drm
# from matplotlib import pyplot as plt
# image1_path = '0000000001.jpg'
# image2_path = '0000000003.jpg'
# json_transformation = 'uav_transformation_matrix.json'
# json_sections = 'x_sections.json'
# height_roi = 5
# image1 = cv2.imread(image1_path)
# mask, bbox = drm.create_mask_and_bbox(image1, json_sections, json_transformation, height_roi)
# results = run_test(image1_path, image2_path, mask, bbox, seeding_filter=False, filt_sub_backgnd=False)
# xtable = np.array(results['x']).reshape(results['shape'])
# ytable = np.array(results['y']).reshape(results['shape'])
# utable = np.array(results['u']).reshape(results['shape'])
# vtable = np.array(results['v']).reshape(results['shape'])
# typevector = np.array(results['typevector']).reshape(results['shape'])
# fig, ax = plt.subplots(1)
# ax.imshow(cv2.imread(image1_path, cv2.IMREAD_GRAYSCALE),cmap='grey')
# ax.imshow(mask, alpha=0.2,cmap='grey')
# ax.quiver(xtable[typevector==1], ytable[typevector==1], utable[typevector==1], -vtable[typevector==1], color='blue')
#
# # Example of use of run_analyze_all
# images_location ='/Users/antoine/Dropbox/04_Auto_Entrepreneur/01_Actual/03_Contrats/20191103_Canada/05_Training/Case_5_MAC/DJI_0036'
# results = run_analyze_all(images_location, mask=mask, bbox=bbox, seeding_filter=True,filt_sub_backgnd=True)
# xtable = np.array(results['x']).reshape(results['shape'])
# ytable = np.array(results['y']).reshape(results['shape'])
# #Calculte the median velocity field
# u_median = np.array(results['u_median']).reshape(results['shape'])
# v_median = np.array(results['v_median']).reshape(results['shape'])
# #Calculte the velocity field #75
# u_75 = np.array(results['u'][75]).reshape(results['shape'])
# v_75 = np.array(results['v'][75]).reshape(results['shape'])
# fig, ax = plt.subplots(1)
# ax.imshow(cv2.imread(image1_path, cv2.IMREAD_GRAYSCALE))
# ax.imshow(mask, alpha=0.2,cmap='grey')
# ax.quiver(xtable, ytable, u_median, -v_median, color='red')
# ax.quiver(xtable, ytable, u_75, -v_75, color='green')


