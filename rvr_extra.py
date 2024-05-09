# -*- coding: utf-8 -*-
"""
Created on Wed Sep  02 13:38:07 2020
@ GUERANDE during COVID-19

@author: Antoine Patalano
"""
import math
import numpy as np
from scipy.sparse import coo_matrix
from matplotlib import path
from scipy.interpolate import griddata
import pandas as pd
from intersection import intersection
import copy


# round() function as Matlab does
def rvr_round(x):
    integer = int(x)
    if (x - integer) >= 0.5:
        return math.ceil(x)
    else:
        return math.floor(x)


#  @param image: Image to a index
#  @param index_matrix: Index Matrix
#  @param n: image_size
def selective_indexing(image, index_matrix, n):
    index_matrix = index_matrix - 1
    index_matrix_aux = np.unravel_index(index_matrix.astype(int), n, order='F')
    image_cut = image[index_matrix_aux]
    return image_cut


def fspecial_gauss(shape=(3, 3), sigma=0.5):
    """
    2D gaussian mask - should give the same result as MATLAB's
    fspecial('gaussian',[shape],[sigma])
    """
    m, n = [(ss - 1.) / 2. for ss in shape]
    y, x = np.ogrid[-m:m + 1, -n:n + 1]
    h = np.exp(-(x * x + y * y) / (2. * sigma * sigma))
    h[h < np.finfo(h.dtype).eps * h.max()] = 0
    sumh = h.sum()
    if sumh != 0:
        h /= sumh
    return h


def fspecial_disk():
    h = np.array(
        [[0, 0, 0.0477750257157819, 0.361469237632242, 0.489558781987489, 0.361469237632242, 0.0477750257157819, 0, 0],
         [0, 0.208018589368669, 0.900152358153484, 1, 1, 1, 0.900152358153484, 0.208018589368669, 0],
         [0.0477750257157819, 0.900152358153484, 1, 1, 1, 1, 1, 0.900152358153484, 0.0477750257157819],
         [0.361469237632242, 1, 1, 1, 1, 1, 1, 1, 0.361469237632242],
         [0.489558781987489, 1, 1, 1, 1, 1, 1, 1, 0.489558781987489],
         [0.361469237632242, 1, 1, 1, 1, 1, 1, 1, 0.361469237632242],
         [0.0477750257157819, 0.900152358153484, 1, 1, 1, 1, 1, 0.900152358153484, 0.0477750257157819],
         [0, 0.208018589368669, 0.900152358153484, 1, 1, 1, 0.900152358153484, 0.208018589368669, 0],
         [0, 0, 0.0477750257157819, 0.361469237632242, 0.489558781987489, 0.361469237632242, 0.0477750257157819, 0, 0]])
    return h


def subpixgauss(result_conv, interrogationarea, x1, y1, z1, subpixoffset):
    x1 = x1 - 1
    y1 = y1 - 1
    z1 = z1 - 1

    x1.shape = (x1.size, 1)
    y1.shape = (y1.size, 1)
    z1.shape = (z1.size, 1)

    xmax = np.size(result_conv, 1)
    vector = np.zeros(shape=(np.size(result_conv, 2), 2))
    if (x1.size != 0):

        ip = np.zeros(shape=(x1.size, 1))
        i = 0
        dims = (np.size(result_conv, 0), np.size(result_conv, 1), np.size(result_conv, 2))

        for elemento in ip:
            # try:
            ip[i] = np.ravel_multi_index((y1[i], x1[i], z1[i]), dims, order='F')
            # except ValueError:
            # ip[i]=np.NaN
            i = i + 1

        ip = ip.astype(int)

        # the following lines up to peakx declaration are copyright (c) 1998, Uri Shavit, Roi Gurka, Alex Liberzon, Technion ??? Israel Institute of Technology
        # http://urapiv.wordpress.com
        f0 = np.zeros(shape=(x1.size, 1))
        f1y = np.zeros(shape=(x1.size, 1))
        f2y = np.zeros(shape=(x1.size, 1))
        f1x = np.zeros(shape=(x1.size, 1))
        f2x = np.zeros(shape=(x1.size, 1))
        i = 0

        for elemento in f0:
            f0[i] = np.log(result_conv[np.unravel_index(np.matrix.item(ip[i]), dims, order='F')])
            f1y[i] = np.log(result_conv[np.unravel_index(np.matrix.item(ip[i] - 1), dims, order='F')])
            f2y[i] = np.log(result_conv[np.unravel_index(np.matrix.item(ip[i] + 1), dims, order='F')])
            # if (ip[i] > xmax):
            f1x[i] = np.log(result_conv[np.unravel_index(np.matrix.item(ip[i] - xmax), dims, order='F')])
            f2x[i] = np.log(result_conv[np.unravel_index(np.matrix.item(ip[i] + xmax), dims, order='F')])
            #  ojo aca
            # else:
            #       f1x[i] = np.log(result_conv[np.unravel_index(np.matrix.item(ip[i]), dims, order='F')])
            #    f2x[i] = np.log(result_conv[np.unravel_index(np.matrix.item(ip[i] + xmax), dims, order='F')])
            i = i + 1

        peaky = (y1 + 1) + (f1y - f2y) / (2 * f1y - 4 * f0 + 2 * f2y)
        peakx = (x1 + 1) + (f1x - f2x) / (2 * f1x - 4 * f0 + 2 * f2x)

        SubpixelX = peakx - (interrogationarea / 2) - subpixoffset
        SubpixelY = peaky - (interrogationarea / 2) - subpixoffset

        SubpixelX = np.reshape(SubpixelX, -1)
        SubpixelY = np.reshape(SubpixelY, -1)

        if (SubpixelX.shape[0] != vector.shape[0]):
            SubpixelX, SubpixelY, z1 = correct_dimensions(SubpixelX, SubpixelY, z1, vector.shape[0])

        vector[:, 0] = SubpixelX
        vector[:, 1] = SubpixelY

    return vector


def correct_dimensions(x1, y1, z1, real_size):
    nan_aux = np.empty(1)
    nan_aux.fill(np.nan)
    for i in range(real_size):
        try:
            if (np.isnan(z1[i])):
                continue

            if (z1[i] != i):
                z_aux = z1
                z1 = z1[:i]
                z1 = np.append(z1, nan_aux)
                z1 = np.append(z1, z_aux[i:])

                x_aux = x1
                x1 = x1[:i]
                x1 = np.append(x1, nan_aux)
                x1 = np.append(x1, x_aux[i:])

                y_aux = y1
                y1 = y1[:i]
                y1 = np.append(y1, nan_aux)
                y1 = np.append(y1, y_aux[i:])
        except(ValueError, IndexError):
            z1 = np.append(z1, nan_aux)
            x1 = np.append(x1, nan_aux)
            y1 = np.append(y1, nan_aux)

    return x1, y1, z1

def interpgrade(table):
    if (table.size > 3):
        return 3
    else:
        return table.size - 1


def ind2sub(array_shape, ind):
    # Gives repeated indices, replicates matlabs ind2sub
    cols = (ind.astype("int32") // array_shape[1])
    rows = (ind.astype("int32") % array_shape[1])
    return (rows, cols)


def inpaint_nans(A):
    # I always need to know which elements are NaN,and what size the array is for any method
    n = A.shape[0]
    m = A.shape[1]
    nm = n * m
    A = A.T.reshape([nm, 1])
    k = np.isnan(A)

    # list the nodes which are known, and which will be interpolated
    nan_list = [i for i, x in enumerate(k) if x]
    known_list = [i for i, x in enumerate(k) if not x]
    nan_list = np.array(nan_list)
    known_list = np.array(known_list)

    # how many nans overall
    nan_count = len(nan_list)

    # convert NaN indices to (r,c) form
    # nan_list==find(k) are the unrolled (linear) indices
    # (row,column) form
    nan_list = nan_list.reshape((nan_count, 1))
    [nr, nc] = ind2sub([m, n], nan_list)
    nr = nr.reshape((nan_count, 1))
    nc = nc.reshape((nan_count, 1))
    nan_list = np.concatenate((nan_list, nr, nc), axis=1)

    # Spring analogy
    # interpolating operator.
    # list of all springs between a node and a horizontal
    # or vertical neighbor
    hv_list = np.array([[-1, -1, 0], [1, 1, 0], [-n, 0, -1], [n, 0, 1]])
    hv_springs = np.array([]).reshape(0, 2)

    for i in range(0, 4):
        hvs = nan_list + np.tile(hv_list[i, :], (nan_count, 1))
        k = (hvs[:, 1] >= 0) * (hvs[:, 1] <= n - 1) * (hvs[:, 2] >= 0) * (hvs[:, 2] <= m - 1)

        a1 = nan_list[k, 0]
        a1 = a1.reshape((len(a1), 1))
        a2 = hvs[k, 0]
        a2 = a2.reshape((len(a2), 1))
        b1 = np.concatenate((a1, a2), axis=1)
        hv_springs = np.vstack([hv_springs, b1]) if hv_springs.size else b1

    # delete replicate springs
    hv_springs = np.unique(np.sort(hv_springs, axis=1), axis=0)
    # build sparse matrix of connections, springs
    # connecting diagonal neighbors are weaker than
    # the horizontal and vertical springs
    nhv = hv_springs.shape[0]

    c1 = np.array(range(0, nhv))
    c1 = np.tile(c1, (2, 1))
    c1 = c1.flatten()

    c2 = np.array([1, - 1])
    c2 = np.tile(c2, (nhv, 1))
    c2 = c2.T
    c2 = c2.flatten()

    c3 = hv_springs.T
    c3 = c3.flatten()

    springs = coo_matrix((c2, (c1, c3)), shape=(nhv, nm))

    # eliminate knowns
    springs = springs.todense()
    rhs = -springs[:, known_list] * A[known_list]

    # and solve...
    B = A
    B[nan_list[:, 0]] = np.linalg.lstsq(springs[:, nan_list[:, 0]], rhs, rcond=None)[0]

    # all done, make sure that B is the same shape as
    # A was when we came in.
    B = B.reshape(m, n)
    B = B.T
    return B


def solve_c_matrix(GRPs=None):
    """
    Created on Tue Aug 27 16:55:52 2019

    @author: Antoine
    "
    solve_c_matrix solves the full Camera Matrix from Ground Referenced Points
    (GRP) using the Singular Value Decomposition (SVD).
    This function is part of the RIVeR toolbox

    Inputs
    5 columns matrix:
    first colum are the real world horizontal coordinates on X
    second column are the real world horizontal coordinates on Y
    third column are the real world vertical coordinates on Z
    fourth column are the image proyection on x
    fourth column are the image proyection on y

    Output
    3 x 4 Camera Matrix

    Copyright (C) Antoine Patalano 2016-2019
    """

    # Getting the values of the coordinates
    X = GRPs.X[:].values
    Y = GRPs.Y[:].values
    Z = GRPs.Z[:].values
    x = GRPs.x[:].values
    y = GRPs.y[:].values

    r, c = GRPs.shape

    BigM = np.zeros([r * 2, 12])

    for i, name in enumerate(X, start=1):
        j = i - 1
        BigM[i * 2 - 2, :] = [X[j], Y[j], Z[j], 1, 0, 0, 0, 0, -x[j] * X[j], -x[j] * Y[j], -x[j] * Z[j], -x[j]]
        BigM[i * 2 - 1, :] = [0, 0, 0, 0, X[j], Y[j], Z[j], 1, -y[j] * X[j], -y[j] * Y[j], -y[j] * Z[j], -y[j]]

    # [U, S, V] = svd(BigM, 0)    # Use the singular Value Decomposition in order to solve BigM*Camera matrix=0 with Camera Matrix non-null
    U, s, V = np.linalg.svd(BigM, full_matrices=False)
    V = np.transpose(V)

    P = -V[:, -1].reshape(3, 4)  # This is the solved Camera Matrix [p11 p12 p11 p12 p13 p14; p21 p22 ...
    return (P)


def make_mask(pix_roi, size_im):
    """
        Created on Sun Oct 11 14:18:52 2020

        @author: Antoine
        "
        make_mask creates dynamic masks for automatic LSPIV. Masks will cover all image except the ROI
        Mask is the invert selection of pix_roi It has to be split in 2 parts: mask_up and mask_down
        Inputs
        pix_roi is an array with the the roi coordinates
        size_im is an array with the image dimesions

        Output
        2 elements list mask

        Copyright (C) Antoine Patalano 2016-2019
    """

    x_roi = pix_roi[0, 0:4]
    y_roi = pix_roi[1, 0:4]

    # get the 2 points on the left side
    xs = np.sort(x_roi)
    x_left = xs[0:2]

    y_left = 0 * x_left
    for k in range(0, len(x_left)):
        y_left[k] = y_roi[x_roi == x_left[k]]

    ys = np.sort(y_left)
    y_up_left = ys[1]
    x_up_left = x_left[y_left == y_up_left][0]
    y_down_left = ys[0]
    x_down_left = x_left[y_left == y_down_left][0]

    # get the 2 points on the right side
    x_right = xs[2:4]
    y_right = 0 * x_right
    for k in range(0, len(x_right)):
        y_right[k] = y_roi[x_roi == x_right[k]]

    ys = np.sort(y_right)
    y_up_right = ys[1]
    x_up_right = x_right[y_right == y_up_right][0]
    y_down_right = ys[0]
    x_down_right = x_right[y_right == y_down_right][0]

    # empty list
    mask = [np.vstack(([x_up_left, 1, 1, size_im[1], size_im[1], x_up_right, x_up_left],
                       [y_up_left, y_up_left, size_im[0], size_im[0], y_up_right, y_up_right, y_up_left])),
            np.vstack(([x_up_left, 1, 1, size_im[1], size_im[1], x_up_right, x_down_right, x_down_left, x_up_left],
                       [y_up_left, y_up_left, 1, 1, y_up_right, y_up_right, y_down_right, y_down_left, y_up_left]))]

    return mask


def poly2mask(polygon, shape_mask):
    xx, yy = np.meshgrid(np.arange(shape_mask[1]), np.arange(shape_mask[0]))
    xx, yy = xx.flatten(), yy.flatten()
    indices = np.vstack((xx, yy)).T
    mask = path.Path(polygon).contains_points(indices)
    mask = mask.reshape(shape_mask[0], shape_mask[1])
    mask = mask.astype('int')
    return mask

def make_rw_ROI(CS,length_sl,current_stage,C_Matrix ):

    # =============================================================================
    #         creates rw_ROI in function of CS and lengths SL
    # =============================================================================

    a, b = np.polyfit(CS[0, :], CS[1, :], 1)
    ang = math.atan(a)  # rotation angle
    # ang_deg=math.degrees(ang)
    c, s = np.cos(-ang), np.sin(-ang)
    rot_mat = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
    shift_ends_a = np.dot(np.array([0, -length_sl / 2, 1]), rot_mat)  # calculate the shift to the ends upstream
    shift_ends_b = np.dot(np.array([0, length_sl / 2, 1]),
                          rot_mat)  # calculate the shift to the ends downstream

    roi = np.array([[CS[0, 0] + shift_ends_a[0], CS[1, 0] + shift_ends_a[1]],
                    [CS[0, 0] + shift_ends_b[0], CS[1, 0] + shift_ends_b[1]],
                    [CS[0, -1] + shift_ends_b[0], CS[1, -1] + shift_ends_b[1]],
                    [CS[0, -1] + shift_ends_a[0], CS[1, -1] + shift_ends_a[1]]])

    rw_roi = np.vstack((roi.T, current_stage * np.ones((1, 4)), np.ones((1, 4))))

    pix_roi_homo = np.dot(C_Matrix, rw_roi)

    pix_roi = np.vstack((pix_roi_homo[0, :] / pix_roi_homo[2, :],
                         pix_roi_homo[1, :] / pix_roi_homo[2, :],
                         np.ones((1, 4))))
    pix_roi = np.hstack((pix_roi, pix_roi[:, 0].reshape((-1, 1))))  # close the roi
    return pix_roi, roi

def improfile(X_rec, Y_rec, U, east, north, n):
    n = int(n)
    x_rec = X_rec.flatten()
    y_rec = Y_rec.flatten()
    U_flat = U.flatten()
    x, y = intermediates(east, north, n)
    u = griddata((x_rec, y_rec), U_flat, (x, y), method='nearest')
    return x, y, u


def intermediates(p1, p2, nb_points=8):
    """"Return a list of nb_points equally spaced points
    between p1 and p2"""
    # If we have 8 intermediate points, we have 8+1=9 spaces
    # between p1 and p2
    x_spacing = (p1[1] - p1[0]) / (nb_points - 1)
    y_spacing = (p2[1] - p2[0]) / (nb_points - 1)

    x = p1[0]
    y = p2[0]
    for i in range(1, nb_points):
        x = np.vstack((x, p1[0] + i * x_spacing))
        y = np.vstack((y, p2[0] + i * y_spacing))

    return x, y


def rvr_vel_components(Leftmargin, Rightmargin, VE, VN):
    vector_1 = [Rightmargin[0, 0] - Leftmargin[0, 0], Rightmargin[1, 0] - Leftmargin[1, 0], 0]
    vector_2 = [1, 0, 0]
    unit_vector_1 = vector_1 / np.linalg.norm(vector_1)
    unit_vector_2 = vector_2 / np.linalg.norm(vector_2)
    dot_product = np.dot(unit_vector_1, unit_vector_2)
    angle = np.arccos(dot_product)

    teta = np.rad2deg(angle)

    if (Rightmargin[1] - Leftmargin[1]) < 0:
        teta = 360 - teta

    tetarad = np.deg2rad(teta)

    C = np.dot(VN, np.sin(tetarad)) + np.dot(VE, np.cos(tetarad))
    S = np.dot(VN, np.cos(tetarad)) - np.dot(VE, np.sin(tetarad))

    return S, C, tetarad


def rvr_inv_vel_components(S, C, tetarad):
    S = S.flatten()
    C = C.flatten()
    if tetarad == 0:
        VE = S * 0
        VN = S
    else:
        A1 = np.sin(tetarad) + np.cos(tetarad) / np.tan(tetarad)
        VE = np.divide(np.divide(C, np.tan(tetarad)) - S, A1)
        VN = np.divide(C, np.sin(tetarad)) - np.divide(VE, np.tan(tetarad))

    return VE, VN


def rvr_inter_vel(depth, velocity):
    # Fill Nans in velocity profile based on Froude number profile
    # Calculates local Froude
    Fr = velocity / np.sqrt((9.81 * depth))
    Fr[0] = 0
    Fr[-1] = 0

    # Fill Nans in Fr
    the_nans = np.isnan(Fr)
    x = lambda z: z.nonzero()[0]
    Fr[the_nans] = np.interp(x(the_nans), x(~the_nans), Fr[~the_nans])

    # Calculates missing velocities
    filled_velocity = Fr * np.sqrt((9.81 * depth))

    return filled_velocity


def rvr_calculate_q(x, v, d):
    # calculates widths w
    for i in range(0, len(x)):
        if i == 0:
            w = abs(x[1] - x[0]) / 2
        elif i == len(x) - 1:
            w = np.append(w, abs(x[i] - x[i - 1]) / 2)
        else:
            w = np.append(w, abs(x[i + 1] - x[i - 1]) / 2)

    a = w * d
    q = a * v
    return w, a, q


def rvr_calculate_bath(path_bathymetry, current_stage):
    bathymetry = pd.read_csv(path_bathymetry)
    bathymetry = np.array(bathymetry.iloc[:, 0:2])
    level = copy.deepcopy(bathymetry)
    level[:, 1] = level[:, 1] * 0 + current_stage
    x, y = intersection(bathymetry[:, 0], bathymetry[:, 1], level[:, 0], level[:, 1])

    # add new stations with the level left margin
    bathymetry = np.concatenate(
        ((np.array([x[0], y[0]])).reshape(1, -1), bathymetry, (np.array([x[1], y[1]])).reshape(1, -1)))
    # sort
    bathymetry = bathymetry[bathymetry[:, 0].argsort()]
    round_vec = lambda i: rvr_round(i)
    vectorized_round_vec = np.vectorize(round_vec)
    # filter negative depth
    bathymetry_posta = bathymetry[vectorized_round_vec((current_stage - bathymetry[:, 1]) * 1000) / 1000 >= 0,
                       :]  # in case there is still a value very close to 0
    return bathymetry_posta
