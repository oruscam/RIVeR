# -*- coding: utf-8 -*-
"""
Created on Wed Aug 28 17:08:38 2019

@author: Antoine
"
Rectifies the results from pixel/image to m/s


Inputs:
x the x result grid in pixel
y the y result grid in pixel
u_mean the mean velocity on x axis grid in pixel/image
v_mean the mean velocity on y axis grid in pixel/image
H the Homography matrix
rw_roi the real world region of interest
st the time step between frames
res the rectified result grid resolution [n m] with n the number of elements on X and m the number of element on Y



Output:
X_rec
Y_rec
U_rec
V_rec

Copyright (C) Antoine Patalano 2016-2019
"""

import numpy as np
from matplotlib import path
import numpy.ma as ma
from scipy import interpolate
import cv2


def rvr_rec_res(x, y, u_mean, v_mean, H, rw_roi, st, res):
    s1, s2 = x.shape

    #    displacement vector components
    x1 = x
    x2 = u_mean + x1

    y1 = y
    y2 = v_mean + y1

    x1_vec = np.reshape(x1, (s1 * s2, -1))
    x2_vec = np.reshape(x2, (s1 * s2, -1))
    y1_vec = np.reshape(y1, (s1 * s2, -1))
    y2_vec = np.reshape(y2, (s1 * s2, -1))

    COOR1 = np.vstack([np.transpose(x1_vec), np.transpose(y1_vec), np.ones([1, s1 * s2])])
    COOR2 = np.vstack([np.transpose(x2_vec), np.transpose(y2_vec), np.ones([1, s1 * s2])])

    coor1 = rvr_trans2rw(COOR1, H)
    coor2 = rvr_trans2rw(COOR2, H)

    x1 = coor1[0, :]
    y1 = coor1[1, :]
    x2 = coor2[0, :]
    y2 = coor2[1, :]

    u = np.subtract(x2, x1)
    v = np.subtract(y2, y1)

    #    filter results outside rw_roi
    polygon = path.Path(np.transpose(rw_roi))
    mask = polygon.contains_points(np.transpose(np.vstack([np.transpose(x1), np.transpose(y1)])))

    u[~mask] = ma.masked
    v[~mask] = ma.masked
    dumx1 = ma.asarray(x1)
    dumy1 = ma.asarray(y1)
    dumx1[~mask] = ma.masked
    dumy1[~mask] = ma.masked

    #    Remesh the results
    XX = (np.max(dumx1) - np.min(dumx1)) / (res[0] - 1)
    XX = np.arange(start=np.min(dumx1), stop=np.max(dumx1) + 0.0001, step=XX)  # Sum 0.0001 so it behave as matlab
    YY = (np.max(dumy1) - np.min(dumy1)) / (res[1] - 1)
    YY = np.arange(start=np.min(dumy1), stop=np.max(dumy1) + 0.0001, step=YY)  # Sum 0.0001 so it behave as matlab
    X_rec, Y_rec = np.meshgrid(XX, YY)
    U_rec = interpolate.griddata((x1, y1), u, (X_rec, Y_rec), 'linear')
    V_rec = interpolate.griddata((x1, y1), v, (X_rec, Y_rec), 'linear')
    U_rec = U_rec / st
    V_rec = V_rec / st
    rectified = {'X_rec': X_rec, 'Y_rec': Y_rec, 'U_rec': U_rec, 'V_rec': V_rec}
    return rectified


def rvr_trans2rw(pts, H):
    Bi = np.dot(np.linalg.inv(H), pts)
    Bi[0, :] = np.divide(Bi[0, :], Bi[2, :])
    Bi[1, :] = np.divide(Bi[1, :], Bi[2, :])
    Bi = np.delete(Bi, (2), axis=0)  # delete third row
    return (Bi)


def rvr_rec_im(im_in, pix_roi, rw_roi):
    # define size of pixel on output rectified image
    size_pix = 0.01

    pix_roi_copy=np.copy(pix_roi)
    rw_roi_copy = np.copy(rw_roi)

    # Crop the image to select only box that bounds pir_roi
    min_pix_roi_x = int(np.floor(min(pix_roi_copy[0, :])))
    min_pix_roi_y = int(np.floor(min(pix_roi_copy[1, :])))
    max_pix_roi_x = int(np.ceil(max(pix_roi_copy[0, :])))
    max_pix_roi_y = int(np.ceil(max(pix_roi_copy[1, :])))
    im_crop = im_in[min_pix_roi_y:max_pix_roi_y,
              min_pix_roi_x:max_pix_roi_x, :]

    # plt.imshow(im_crop)
    # Reset the pix_roi coordinates origin to 0 of croped image
    pix_roi_copy[0, :] = pix_roi_copy[0, :] - min_pix_roi_x
    pix_roi_copy[1, :] = pix_roi_copy[1, :] - min_pix_roi_y

    # Scale the size of rw_roi in pixels
    rw_roi_copy[0, :] = rw_roi_copy[0, :] / size_pix
    rw_roi_copy[1, :] = rw_roi_copy[1, :] / size_pix

    # Reset the rw_roi coordinates origin to min values of E and N
    shift_rw_x = min(rw_roi_copy[0, :])
    shift_rw_y = min(rw_roi_copy[1, :])
    rw_roi_copy[0, :] = rw_roi_copy[0, :] - shift_rw_x
    rw_roi_copy[1, :] = rw_roi_copy[1, :] - shift_rw_y

    # Calculates the homography
    Hkk, status = cv2.findHomography(np.transpose(rw_roi_copy[[0, 1, 3], 0:4]), np.transpose(pix_roi_copy[:, 0: 4]))

    # Transform in real world coordinates the croped images corners
    qqq = np.array(
        [[0, 0, im_crop.shape[1] - 1, im_crop.shape[1] - 1], [0, im_crop.shape[0] - 1, im_crop.shape[0] - 1, 0],
         [1, 1, 1, 1]])
    zzz = np.dot(np.linalg.inv(Hkk), qqq)
    zzz[0, :] = np.divide(zzz[0, :], zzz[2, :])
    zzz[1, :] = np.divide(zzz[1, :], zzz[2, :])

    # Negative values won't be seen on final rectified image so we shift
    rw_roi_copy[0, :] = rw_roi_copy[0, :] - min(zzz[0, :])
    rw_roi_copy[1, :] = rw_roi_copy[1, :] - min(zzz[1, :])
    shift_rw_x = shift_rw_x + min(zzz[0, :])
    shift_rw_y = shift_rw_y + min(zzz[1, :])

    # Calcualets the width and heights of final rectified image
    ww = int(max(zzz[0, :]) - min(zzz[0, :]))
    hh = int(max(zzz[1, :]) - min(zzz[1, :]))

    # Recalculates the homography matrix after second shift
    Hkk, status = cv2.findHomography(np.transpose(rw_roi_copy[[0, 1, 3], 0:4]), np.transpose(pix_roi_copy[:, 0: 4]))

    # Rectifies the croped image
    im_out = cv2.warpPerspective(im_crop, np.linalg.inv(Hkk), (ww, hh))
    im_out=np.flipud(im_out)
    rw_roi_copy[1, :] = rw_roi_copy[1, :] / size_pix

    #Creates bounding box of RW coordinates
    BBox = (((0+shift_rw_x)* size_pix, (ww+shift_rw_x)* size_pix,
             (0+shift_rw_y)* size_pix, (hh+shift_rw_y)* size_pix))


    return im_out, size_pix, shift_rw_x, shift_rw_y, BBox
