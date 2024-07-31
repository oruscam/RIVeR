"""
File Name: piv_loop.py
Project Name: RIVeR-LAC
Description: This module contains the `piv_loop` function, which performs Particle Image Velocimetry (PIV) analysis over
             a range of frames using multiprocessing. The function preprocesses the images, applies various filters,
             and computes velocity fields using the `piv_fftmulti` function. The results are returned as a cumulative
             dictionary containing the calculated velocity vectors and other relevant data.

Created Date: 2024-07-23
Author: Antoine Patalano
Email: antoine.patalano@unc.edu.ar
Company: UNC / ORUS
"""

from piv_fftmulti import piv_fftmulti
import image_preprocessing as impp
import numpy as np


def piv_loop(path_images, mask, bbox, interrogationarea, int2,
             mask_auto, multipass, std_filter, stdthresh, median_test_filter,
             epsilon, thresh, seeding_filter, step, filt_grayscale,
             filt_clahe, clipLimit_clahe, filt_sub_backgnd, backgnd, start, end):
    """
    Perform PIV analysis over a range of frames.

    Parameters:
    path_images : list of str
        List of paths to the images.
    mask : np.ndarray
        Mask for the region of interest.
    bbox : list of int
        Bounding box for the region of interest as (x0, y0, x1, y1).
    interrogationarea : int
        Size of the interrogation area.
    int2 : int, optional
        Size of the second interrogation area.
    mask_auto : bool
        Whether to automatically apply a mask.
    multipass : bool
        Whether to use multiple passes.
    std_filter : bool
        Whether to apply standard deviation filtering.
    stdthresh : float
        Threshold for standard deviation filtering.
    median_test_filter : bool
        Whether to apply median test filtering.
    epsilon : float
        Epsilon value for median test filtering.
    thresh : float
        Threshold value for median test filtering.
    seeding_filter : bool
        Whether to apply seeding filtering.
    step : int
        Step size for grid calculations.
    filt_grayscale : bool
        Whether to convert images to grayscale.
    filt_clahe : bool
        Whether to apply CLAHE filtering.
    clipLimit_clahe : int
        Clip limit for CLAHE.
    filt_sub_backgnd : bool
        Whether to subtract background.
    backgnd : np.ndarray
        Background image for subtraction.
    start : int
        Starting frame index.
    end : int
        Ending frame index.

    Returns:
    dict
        Dictionary containing cumulative results of PIV analysis.
    """

    fr = start
    last_fr = end
    dict_cumul = {'u': 0, 'v': 0, 'x': 0, 'y': 0}

    while fr < last_fr:
        image1 = impp.preprocess_image(path_images[fr], filt_grayscale, filt_clahe,
                                       clipLimit_clahe, filt_sub_backgnd, backgnd)
        image2 = impp.preprocess_image(path_images[fr + 1], filt_grayscale, filt_clahe,
                                       clipLimit_clahe, filt_sub_backgnd, backgnd)

        xtable, ytable, utable, vtable, typevector, gradient = piv_fftmulti(
            image1, image2, mask=mask, bbox=bbox, interrogationarea=interrogationarea, int2=int2,
            mask_auto=mask_auto, multipass=multipass, std_filter=std_filter,
            stdthresh=stdthresh, median_test_filter=median_test_filter,
            epsilon=epsilon, thresh=thresh, seeding_filter=seeding_filter, step=step
        )

        try:
            dict_cumul['u'] = np.hstack((dict_cumul['u'], utable.reshape(-1, 1)))
            dict_cumul['v'] = np.hstack((dict_cumul['v'], vtable.reshape(-1, 1)))
            dict_cumul['typevector'] = np.hstack((dict_cumul['typevector'], typevector.reshape(-1, 1)))
            if seeding_filter:
                dict_cumul['gradient'] = np.hstack((dict_cumul['gradient'], gradient.reshape(-1, 1)))

        except ValueError:
            dict_cumul['u'] = utable.reshape(-1, 1)
            dict_cumul['v'] = vtable.reshape(-1, 1)
            dict_cumul['typevector'] = typevector.reshape(-1, 1)
            if seeding_filter:
                dict_cumul['gradient'] = gradient.reshape(-1, 1)
            dict_cumul['x'] = xtable
            dict_cumul['y'] = ytable

        fr += 1

    return dict_cumul
