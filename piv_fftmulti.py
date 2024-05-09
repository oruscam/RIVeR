# -*- coding: utf-8 -*-
"""
Created on Wed Sep  02 10:03:56 2020
@ GUERANDE during COVID-19

@author: Antoine Patalano

From piv_FFTmulti.m in PIVlab
"""


def piv_fftmulti(image1, image2, interrogationarea, step, subpixfinder, mask_inpt, roi_inpt,
                 passes, int2, int3, int4, repeat, mask_auto, do_pad):
    import numpy as np
    from scipy import interpolate
    import math
    import rvr_extra as re
    import matlab_smoothn as smoothn
    import warnings
    warnings.filterwarnings("ignore", category=RuntimeWarning)

    interrogationarea = int(interrogationarea)

    if len(roi_inpt) > 0:
        xroi = int(re.rvr_round(roi_inpt[0]))
        yroi = int(re.rvr_round(roi_inpt[1]))
        widthroi = int(np.ceil(roi_inpt[2]))
        heightroi = int(np.ceil(roi_inpt[3]))
        image1_roi = np.float32(image1[yroi:yroi + heightroi, xroi:xroi + widthroi])
        image2_roi = np.float32(image2[yroi:yroi + heightroi, xroi:xroi + widthroi])
    else:
        xroi = 0
        yroi = 0
        image1_roi = np.float64(image1)
        image2_roi = np.float64(image2)
    del image1, image2

    gen_image1_roi = image1_roi
    gen_image2_roi = image2_roi

    mask = np.zeros((image1_roi.shape))

    if len(mask_inpt) > 0:
        cellmask = mask_inpt

        for x in range(0, len(mask_inpt)):
            masklayerx = mask_inpt[x][0]
            masklayery = mask_inpt[x][1]
            polygon = np.vstack((masklayerx - xroi, masklayery - yroi)).T
            mask = mask + re.poly2mask(polygon, mask.shape)

    mask[np.where(mask[:, :] > 1)] = 1
    gen_mask = np.copy(mask)

    miniy = 1 + (math.ceil(interrogationarea / 2))
    minix = 1 + (math.ceil(interrogationarea / 2))
    maxiy = step * (math.floor(image1_roi.shape[0] / step)) - (interrogationarea - 1) + (
        math.ceil(interrogationarea / 2))
    maxix = step * (math.floor(image1_roi.shape[1] / step)) - (interrogationarea - 1) + (
        math.ceil(interrogationarea / 2))
    # maxiy = maxiy[0, 0]
    # maxix = maxix[0, 0]

    numelementsy = math.floor((maxiy - miniy) / step + 1)
    numelementsx = math.floor((maxix - minix) / step + 1)

    LAy = miniy
    LAx = minix
    LUy = image1_roi.shape[0] - maxiy
    LUx = image1_roi.shape[1] - maxix
    shift4centery = re.rvr_round((LUy - LAy) / 2)
    shift4centerx = re.rvr_round((LUx - LAx) / 2)

    """
    shift4center will be negative if in the unshifted case the left border is bigger than the right border.
    the vectormatrix is hence not centered on the image. the matrix cannot be shifted more towards the left
    border because then image2_crop would have a negative index. The only way to center the matrix would be
    to remove a column of vectors on the right side. but then we would have less data....
    """
    if shift4centery < 0:
        shift4centery = 0

    if shift4centerx < 0:
        shift4centerx = 0

    miniy = miniy + shift4centery
    minix = minix + shift4centerx
    maxix = maxix + shift4centerx
    maxiy = maxiy + shift4centery

    fill = math.ceil(interrogationarea / 2)  # not in matlab version
    minimum = np.min(image1_roi)  # not in matlab version
    image1_roi = np.pad(image1_roi, ((fill, fill), (fill, fill)), 'constant', constant_values=minimum)
    image2_roi = np.pad(image2_roi, ((fill, fill), (fill, fill)), 'constant', constant_values=minimum)
    mask = np.pad(mask, ((fill, fill), (fill, fill)), 'constant', constant_values=0)

    if interrogationarea % 2 == 0:
        subpixoffset = 1
    else:
        subpixoffset = 0.5

    xtable = np.zeros((numelementsy, numelementsx))
    ytable = xtable.astype(float)
    utable = xtable.astype(float)
    vtable = xtable.astype(float)
    typevector = np.ones((numelementsy, numelementsx))

    # =============================================================================
    #         MAINLOOP
    # =============================================================================

    temp_yvector = np.arange(miniy, maxiy + 1, step)
    temp_xvector = np.arange(minix, maxix + 1, step) - 1
    temp_yvector = (temp_yvector[:, np.newaxis]) - 1
    temp_xvector = temp_xvector * image1_roi.shape[0]

    s0 = (np.tile(temp_yvector, (1, numelementsx)) + np.tile(temp_xvector, (numelementsy, 1))).T
    # convert to an array the matrix with Matlab index order
    s0 = s0.reshape(-1, order='F')
    s0 = s0[:, np.newaxis, np.newaxis]  # have to add dimension
    s0 = np.transpose(s0, (1, 2, 0))

    temp = np.arange(1, interrogationarea + 1, 1)[:, np.newaxis]  # transpose
    temp2 = (np.arange(1, interrogationarea + 1, 1) - 1) * image1_roi.shape[0]
    s1 = np.tile(temp, (1, interrogationarea)) + np.tile(temp2, (interrogationarea, 1))
    del temp, temp2
    s1 = s1[:, :, np.newaxis]  # have to add dimension
    ss1 = np.tile(s1, (1, 1, s0.shape[2])) + np.tile(s0, (interrogationarea, interrogationarea, 1))

    image1_roi = image1_roi[:, :, np.newaxis]
    image1_roi_aux = np.broadcast_to(image1_roi, (image1_roi.shape[0], image1_roi.shape[1], ss1.shape[2]))
    image1_cut = re.selective_indexing(image1_roi_aux, ss1.astype(int),
                                       (image1_roi.shape[0], image1_roi.shape[1], ss1.shape[2]))
    del image1_roi_aux

    image2_roi = image2_roi[:, :, np.newaxis]
    image2_roi_aux = np.broadcast_to(image2_roi, (image2_roi.shape[0], image2_roi.shape[1], ss1.shape[2]))
    image2_cut = re.selective_indexing(image2_roi_aux, ss1.astype(int),
                                       (image2_roi.shape[0], image2_roi.shape[1], ss1.shape[2]))
    del image2_roi_aux

    # Fast Fourier Transforms
    temp_fftim1 = np.conj(np.fft.fft2(image1_cut, axes=[0, 1]))
    temp_fftim2 = np.fft.fft2(image2_cut, axes=[0, 1])
    result_conv = np.fft.fftshift(np.real(np.fft.ifft2(temp_fftim1 * temp_fftim2, axes=[0, 1])), axes=[0, 1])
    del temp_fftim1, temp_fftim2

    # disable auto correlation
    if mask_auto == 1:
        h = re.fspecial_gauss([3, 3], 1.5)
        h = h / h[1, 1]
        h = 1 - h

        h = np.repeat(h[:, :, np.newaxis], result_conv.shape[2], axis=2)

        h = np.multiply(h, result_conv[int((interrogationarea / 2) + subpixoffset - 1) - 1:int(
            (interrogationarea / 2) + subpixoffset + 1),
                           int((interrogationarea / 2) + subpixoffset - 1) - 1: int(
                               (interrogationarea / 2) + subpixoffset + 1), :])

        result_conv[int((interrogationarea / 2) + subpixoffset - 1) - 1:int((interrogationarea / 2) + subpixoffset + 1),
        int((interrogationarea / 2) + subpixoffset - 1) - 1: int((interrogationarea / 2) + subpixoffset + 1), :] = h

    minres = np.amin(result_conv, axis=(0, 1))[:, np.newaxis, np.newaxis]  # complete dimension
    minres = np.tile(minres, (1, result_conv.shape[0], result_conv.shape[1]))
    minres = np.transpose(minres, (1, 2, 0))

    # deltares is a matrix that a repeated number in the 3rd dimension
    deltares = (np.amax(result_conv, axis=(0, 1)) - np.amin(result_conv, axis=(0, 1)))[:, np.newaxis, np.newaxis]
    deltares = np.tile(deltares, (1, result_conv.shape[0], result_conv.shape[1]))
    deltares = np.transpose(deltares, (1, 2, 0))

    result_conv = ((result_conv - minres) / deltares) * 255

    del deltares

    # Apply the mask
    # ...To be reviewed
    # Review dimensions off ii y jj
    # Use of nonzero which is equivalent to find in matlab
    ii_temp = (ss1[int(round(interrogationarea / 2 + 1)), int(round(interrogationarea / 2 + 1)), :])
    ii = re.selective_indexing(mask, ii_temp, mask.shape)
    del ii_temp
    ii = np.flatnonzero(ii)
    vect_ind1 = (np.arange(miniy, maxiy + 1, step) + round(interrogationarea / 2) - 1).astype(np.intp)
    vect_ind2 = (np.arange(minix, maxix + 1, step) + round(interrogationarea / 2) - 1).astype(np.intp)
    jj = mask[vect_ind1[:, np.newaxis], vect_ind2]
    jj = np.nonzero(jj)
    typevector[jj[0], jj[1]] = 0
    result_conv[:, :, ii] = 0

    result_conv_flat = np.reshape(result_conv, -1, order='F')
    indices = np.flatnonzero(result_conv_flat == 255)
    indices = np.unravel_index(indices, result_conv.shape, order='F')
    y = indices[0] + 1
    x = indices[1] + 1
    z = indices[2] + 1

    # we need only one peak from each couple pictures
    z1 = np.sort(z, kind='mergesort')  # array in ascending order
    zi = np.argsort(z, kind='mergesort')  # index
    dz1 = abs(np.diff(z1))
    dz1 = np.insert(dz1, 0, z1[0])
    i0 = np.flatnonzero(dz1)
    x1 = x[zi[i0]]
    y1 = y[zi[i0]]
    z1 = z[zi[i0]]


    #    Create the vector matrix x, y, u, v
    arrx_aux = np.arange(minix, maxix + 1, step) + interrogationarea / 2
    arry_aux = np.arange(miniy, maxiy + 1, step)
    xtable = np.tile(arrx_aux, (arry_aux.shape[0], 1))
    arry_aux = arry_aux + interrogationarea / 2
    arry_aux = arry_aux[:, np.newaxis]
    arrx_aux = arrx_aux - interrogationarea / 2
    ytable = np.tile(arry_aux, (1, arrx_aux.shape[0]))
    vector = re.subpixgauss(result_conv, interrogationarea, x1, y1, z1, subpixoffset)
    xtable_aux = xtable.transpose()
    vector = vector.reshape((xtable_aux.shape[0], xtable_aux.shape[1], 2), order='F')
    vector = vector.transpose(1, 0, 2)

    utable = vector[:, :, 0].astype(float)
    vtable = vector[:, :, 1].astype(float)

    # Multipass
    multipass = 1
    # Multipass validation
    # stdev test
    utable_orig = utable.astype('float')  # guardo el valor original
    vtable_orig = vtable.astype('float')
    stdthresh = 4
    meanu = np.nanmean(utable)
    meanv = np.nanmean(vtable)

    std2u = np.nanstd(utable, ddof=1)
    std2v = np.nanstd(vtable, ddof=1)
    minvalu = meanu - stdthresh * std2u
    maxvalu = meanu + stdthresh * std2u
    minvalv = meanv - stdthresh * std2v
    maxvalv = meanv + stdthresh * std2v
    utable[utable < minvalu] = np.NaN
    utable[utable > maxvalu] = np.NaN
    vtable[vtable < minvalv] = np.NaN
    vtable[vtable > maxvalv] = np.NaN

    # #    Interpolates the Nans value
    # nans, dum_u = nan_helper(utable)
    # utable[nans] = np.interp(dum_u(nans), dum_u(~nans), utable[~nans])
    # nans, dum_v = nan_helper(vtable)
    # vtable[nans] = np.interp(dum_v(nans), dum_v(~nans), vtable[~nans])

    # median test
    epsilon = 0.02
    thresh = 2
    J = utable.shape[0]
    I = utable.shape[1]
    normfluct = np.zeros([J, I, 2])
    b = 1
    for c in range(1, 3):
        if c == 1:
            velcomp = utable
        else:
            velcomp = vtable

        neigh = np.zeros((velcomp.shape[0] - 2 * b, velcomp.shape[1] - 2 * b, 2 * b + 1, 2 * b + 1))
        for ii in range(-b, b + 1, 1):
            for jj in range(-b, b + 1, 1):
                neigh[:, :, ii + 2 * b - 1, jj + 2 * b - 1] = velcomp[b + ii:velcomp.shape[0] - b + ii,
                                                              b + jj:velcomp.shape[1] - b + jj]

        tercera_dim = int(math.pow(2 * b + 1, 2))
        neighcol = np.reshape(neigh, (neigh.shape[0], neigh.shape[1], tercera_dim), order='F')
        vector_recorrido = np.arange(1, (2 * b + 1) * b + b + 1)
        vector_recorrido = np.append(vector_recorrido, np.arange((2 * b + 1) * b + b + 2, math.pow(2 * b + 1, 2) + 1))
        vector_recorrido = (vector_recorrido - 1).astype(int)
        vector_recorrido = vector_recorrido.tolist()
        neighcol2 = neighcol[:, :, vector_recorrido]
        neighcol2 = np.transpose(neighcol2, (2, 0, 1))
        med = np.median(neighcol2, axis=0)
        velcomp = velcomp[b:velcomp.shape[0] - b, b:velcomp.shape[1] - b]
        fluct = velcomp - med
        res = neighcol2 - np.tile(med, (pow(2 * b + 1, 2) - 1, 1, 1))
        medianres = np.median(abs(res), axis=0, overwrite_input=True)
        normfluct[b:normfluct.shape[0] - b, b:normfluct.shape[1] - b, c - 1] = abs(fluct / (medianres + epsilon))

    info1 = np.power(normfluct[:, :, 0], 2) + np.power(normfluct[:, :, 1], 2)
    info1 = np.sqrt(info1) > thresh
    utable[info1 == True] = np.NaN
    vtable[info1 == True] = np.NaN

    # replace nans
    mask = info1.astype(int)
    utable = re.inpaint_nans(utable)
    vtable = re.inpaint_nans(vtable)

    # utable = inpaint.inpaint_biharmonic(utable, mask, multichannel=False)
    # vtable = inpaint.inpaint_biharmonic(vtable, mask, multichannel=False)

    # smooth predictor
    utable = smoothn.smoothn(utable, s=0.0307)
    vtable = smoothn.smoothn(vtable, s=0.0307)

    if multipass == 1:
        interrogationarea = int(round(int2 / 2) * 2)
    if multipass == 2:
        interrogationarea = int(round(int3 / 2) * 2)
    if multipass == 3:
        interrogationarea = int(round(int4 / 2) * 2)

    step = interrogationarea / 2

    # recalculate image coordinates
    image1_roi = np.copy(gen_image1_roi)
    image2_roi = np.copy(gen_image2_roi)
    mask = np.copy(gen_mask)

    miniy = 1 + (math.ceil(interrogationarea / 2))
    minix = 1 + (math.ceil(interrogationarea / 2))

    maxiy = step * (math.floor(image1_roi.shape[0] / step)) - (interrogationarea - 1) + (
        math.ceil(interrogationarea / 2))
    maxix = step * (math.floor(image1_roi.shape[1] / step)) - (interrogationarea - 1) + (
        math.ceil(interrogationarea / 2))

    numelementsy = math.floor((maxiy - miniy) / step + 1)
    numelementsx = math.floor((maxix - minix) / step + 1)

    LAy = miniy
    LAx = minix

    LUy = image1_roi.shape[0] - maxiy
    LUx = image1_roi.shape[1] - maxix

    shift4centery = re.rvr_round((LUy - LAy) / 2)
    shift4centerx = re.rvr_round((LUx - LAx) / 2)

    if shift4centery < 0:
        shift4centery = 0

    if shift4centerx < 0:
        shift4centerx = 0

    miniy = miniy + shift4centery
    minix = minix + shift4centerx
    maxix = maxix + shift4centerx
    maxiy = maxiy + shift4centery

    fill = math.ceil(interrogationarea / 2)
    minimo = np.min(image1_roi)

    image1_roi = np.pad(image1_roi, ((fill, fill), (fill, fill)), 'constant', constant_values=minimo)
    image2_roi = np.pad(image2_roi, ((fill, fill), (fill, fill)), 'constant', constant_values=minimo)
    mask = np.pad(mask, ((fill, fill), (fill, fill)), 'constant', constant_values=0)

    if (interrogationarea % 2 == 0):
        SubPixOffset = 1
    else:
        SubPixOffset = 0.5

    xtable_old = np.copy(xtable)
    ytable_old = np.copy(ytable)

    typevector = np.ones((numelementsy, numelementsx))
    xtable = np.tile(np.arange(minix, maxix + 1, step), (numelementsy, 1)) + interrogationarea / 2
    ytable = np.tile(np.arange(miniy, maxiy + 1, step)[:, np.newaxis], (1, numelementsx)) + interrogationarea / 2

    xtable_old_param = xtable_old[0, :]
    ytable_old_param = ytable_old[:, 0]
    xtable_param = xtable[0, :]
    ytable_param = ytable[:, 0]
    KX = re.interpgrade(ytable_old_param)
    KY = re.interpgrade(xtable_old_param)

    funct_interp = interpolate.RectBivariateSpline(ytable_old_param, xtable_old_param, utable,
                                                   bbox=[ytable_param[0], ytable_param[-1], xtable_param[0],
                                                         xtable_param[-1]], kx=KX, ky=KY)
    utable = funct_interp(ytable_param, xtable_param)
    funct_interp = interpolate.RectBivariateSpline(ytable_old_param, xtable_old_param, vtable,
                                                   bbox=[ytable_param[0], ytable_param[-1], xtable_param[0],
                                                         xtable_param[-1]], kx=KX, ky=KY)
    vtable = funct_interp(ytable_param, xtable_param)

    utable_1 = np.pad(utable, ((1, 1), (1, 1)), 'edge')
    vtable_1 = np.pad(vtable, ((1, 1), (1, 1)), 'edge')

    # add 1 line around image for border regions... linear extrap
    firstlinex = xtable[0, :]
    firstlinex_intp_func = interpolate.interp1d(np.arange(1, firstlinex.shape[0] + 1, 1), firstlinex, kind='linear',
                                                fill_value='extrapolate')
    firstlinex_intp = firstlinex_intp_func(np.arange(0, firstlinex.shape[0] + 2, 1))
    xtable_1 = np.tile(firstlinex_intp, (xtable.shape[0] + 2, 1))

    firstliney = ytable[:, 0]
    firstliney_intp_func = interpolate.interp1d(np.arange(1, firstliney.shape[0] + 1, 1), firstliney, kind='linear',
                                                fill_value='extrapolate')
    firstliney_intp = firstliney_intp_func(np.arange(0, firstliney.shape[0] + 2, 1))
    firstliney_intp = firstliney_intp[:, np.newaxis]
    ytable_1 = np.tile(firstliney_intp, (1, ytable.shape[1] + 2))

    X = np.copy(xtable_1)
    Y = np.copy(ytable_1)
    U = np.copy(utable_1)
    V = np.copy(vtable_1)

    X1 = np.arange(X[0, 0], X[0, -1], 1)
    Y1 = np.arange(Y[0, 0], Y[-1, 0], 1)
    Y1 = Y1[:, np.newaxis]
    X1 = np.tile(X1, (Y1.shape[0], 1))
    Y1 = np.tile(Y1, (1, X1.shape[1]))

    X_param = X[0, :]
    Y_param = Y[:, 0]
    interp_funct = interpolate.interp2d(X_param, Y_param, U, kind='linear')
    U1 = interp_funct(X1[0, :], Y1[:, 0])
    interp_funct = interpolate.interp2d(X_param, Y_param, V, kind='linear')
    V1 = interp_funct(X1[0, :], Y1[:, 0])

    x_param = np.arange(1, image2_roi.shape[1] + 1)
    y_param = np.arange(1, image2_roi.shape[0] + 1)
    image2_roi = image2_roi.astype(np.float32)
    interp_funct = interpolate.RectBivariateSpline(y_param, x_param, image2_roi, kx=1, ky=1)
    image2_crop_i1 = interp_funct(Y1 + V1, X1 + U1, grid=False)
    # image2_crop_i1[image2_crop_i1==8]=np.NaN

    xb = np.flatnonzero(np.in1d(X1[0, :], xtable_1[0, 0])) + 1
    yb = np.flatnonzero(np.in1d(Y1[:, 0], ytable_1[0, 0])) + 1

    # divide images by small pictures
    # new index for image1_roi
    temp_yvector = np.arange(miniy, maxiy + 1, step)
    temp_xvector = np.arange(minix, maxix + 1, step) - 1
    temp_yvector = (temp_yvector[:, np.newaxis]) - 1
    temp_xvector = (temp_xvector) * image1_roi.shape[0]

    s0 = (np.tile(temp_yvector, (1, numelementsx)) + np.tile(temp_xvector, (numelementsy, 1))).transpose()
    s0 = s0.reshape(-1, order='F')
    s0 = s0[:, np.newaxis, np.newaxis]
    s0 = np.transpose(s0, (1, 2, 0))

    temp = np.arange(1, interrogationarea + 1, 1)[:, np.newaxis]
    temp2 = (np.arange(1, interrogationarea + 1, 1) - 1) * image1_roi.shape[0]
    s1 = np.tile(temp, (1, interrogationarea)) + np.tile(temp2, (interrogationarea, 1))
    del temp, temp2
    s1 = s1[:, :, np.newaxis]
    ss1 = np.tile(s1, (1, 1, s0.shape[2])) + np.tile(s0, (interrogationarea, interrogationarea, 1))
    # new index for image2_crop_i1
    temp_yvector = yb - step + step * (np.arange(1, numelementsy + 1, 1))
    temp_yvector = (temp_yvector[:, np.newaxis]) - 1
    temp_xvector = xb - step + step * (np.arange(1, numelementsx + 1, 1)) - 1
    temp_xvector = temp_xvector * image2_crop_i1.shape[0]

    s0 = (np.tile(temp_yvector, (1, numelementsx)) + np.tile(temp_xvector, (numelementsy, 1))).transpose()
    s0 = s0.reshape(-1, order='F')
    s0 = s0[:, np.newaxis, np.newaxis]
    s0 = np.transpose(s0, (1, 2, 0)) - s0[0, 0]
    s2 = np.tile(np.arange(1, 2 * step + 1, 1)[:, np.newaxis], (1, int(2 * step))) + np.tile(
        (np.arange(1, 2 * step + 1, 1) - 1) * image2_crop_i1.shape[0], (int(2 * step), 1))
    s2 = s2[:, :, np.newaxis]
    ss2 = np.tile(s2, (1, 1, s0.shape[2])) + np.tile(s0, (interrogationarea, interrogationarea, 1))

    ss1 = ss1.astype(int)
    ss2 = ss2.astype(int)
    image1_roi = image1_roi[:, :, np.newaxis]
    image1_roi_aux = np.broadcast_to(image1_roi, (image1_roi.shape[0], image1_roi.shape[1], ss1.shape[2]))
    image1_cut = re.selective_indexing(image1_roi_aux, ss1, image1_roi_aux.shape)
    del image1_roi_aux

    image2_crop_i1 = np.float32(image2_crop_i1[:, :, np.newaxis])
    image2_crop_i1_aux = np.broadcast_to(image2_crop_i1,
                                         (image2_crop_i1.shape[0], image2_crop_i1.shape[1], ss2.shape[2]))
    image2_cut = re.selective_indexing(image2_crop_i1_aux, ss2, image2_crop_i1_aux.shape)
    del image2_crop_i1_aux

    # Hacemos transformadas
    # En el parametro axes ponemos un vector con los ejes sobre los cuales
    # queremos operar. Por defecto toma los ultimos dos.
    temp_fftim1 = np.conj(np.fft.fft2(image1_cut, axes=[0, 1]))
    temp_fftim2 = np.fft.fft2(image2_cut, axes=[0, 1])
    result_conv = temp_fftim1 * temp_fftim2
    result_conv = np.real(np.fft.ifft2(result_conv, axes=[0, 1]))
    result_conv = np.fft.fftshift(result_conv, axes=[0, 1])

    del temp_fftim1, temp_fftim2

    if mask_auto == 1:
        # limit peak search area....
        emptymatrix = np.zeros((result_conv.shape[0], result_conv.shape[1], result_conv.shape[2]))
        sizeones = 4

        h = re.fspecial_disk()  # import as matlab fspecial('disk',4);
        h = np.repeat(h[:, :, np.newaxis], result_conv.shape[2], axis=2)

        emptymatrix[int((interrogationarea / 2) + subpixoffset - sizeones) - 1:int(
            (interrogationarea / 2) + subpixoffset + sizeones),
        int((interrogationarea / 2) + subpixoffset - sizeones) - 1: int(
            (interrogationarea / 2) + subpixoffset + sizeones), :] = h

        result_conv = np.multiply(result_conv, emptymatrix)

    minres = np.amin(result_conv, axis=(0, 1))[:, np.newaxis, np.newaxis]
    minres = np.tile(minres, (1, result_conv.shape[0], result_conv.shape[1]))
    minres = np.transpose(minres, (1, 2, 0))

    deltares = (np.amax(result_conv, axis=(0, 1)) - np.amin(result_conv, axis=(0, 1)))[:, np.newaxis, np.newaxis]
    deltares = np.tile(deltares, (1, result_conv.shape[0], result_conv.shape[1]))
    deltares = np.transpose(deltares, (1, 2, 0))

    result_conv = ((result_conv - minres) / deltares) * 255

    # Apply mask
    ii_temp = (ss1[round(interrogationarea / 2 + 1), round(interrogationarea / 2 + 1), :])
    ii = re.selective_indexing(mask, ii_temp, mask.shape)

    ii = np.flatnonzero(ii)
    vect_ind1 = (np.arange(miniy, maxiy + 1, step) + round(interrogationarea / 2) - 1).astype(np.intp)
    vect_ind2 = (np.arange(minix, maxix + 1, step) + round(interrogationarea / 2) - 1).astype(np.intp)
    jj = mask[vect_ind1[:, np.newaxis], vect_ind2]
    jj = np.nonzero(jj)

    typevector[jj[0], jj[1]] = 0
    result_conv[:, :, ii] = 0

    # x,y,z le sumamos uno para que coincida con Matlab, pero tener en cuenta que son indices!!
    result_conv_flat = np.reshape(result_conv, -1, order='F')
    indices = np.flatnonzero(result_conv_flat == 255)
    indices = np.unravel_index(indices, result_conv.shape, order='F')
    y = indices[0] + 1
    x = indices[1] + 1
    z = indices[2] + 1
    z1 = np.sort(z, kind='mergesort')
    zi = np.argsort(z, kind='mergesort')
    dz1 = abs(np.diff(z1))
    dz1 = np.insert(dz1, 0, z1[0])
    i0 = np.flatnonzero(dz1)
    # we need only one peak from each couple pictures
    x1 = x[zi[i0]]
    y1 = y[zi[i0]]
    z1 = z[zi[i0]]

    arrx_aux = np.arange(minix, maxix + 1, step) + interrogationarea / 2
    arry_aux = np.arange(miniy, maxiy + 1, step)
    xtable = np.tile(arrx_aux, (arry_aux.shape[0], 1))
    arry_aux = arry_aux + interrogationarea / 2
    arry_aux = arry_aux[:, np.newaxis]
    arrx_aux = arrx_aux - interrogationarea / 2
    ytable = np.tile(arry_aux, (1, arrx_aux.shape[0]))

    del arry_aux, arrx_aux

    vector = re.subpixgauss(result_conv, interrogationarea, x1, y1, z1, subpixoffset)

    xtable_aux = xtable.transpose()
    vector = vector.reshape((xtable_aux.shape[0], xtable_aux.shape[1], 2), order='F')
    vector = vector.transpose(1, 0, 2)
    del xtable_aux

    utable = utable + vector[:, :, 0].astype(float)
    vtable = vtable + vector[:, :, 1].astype(float)

    xtable = xtable - math.ceil(int(interrogationarea) / 2)
    ytable = ytable - math.ceil(int(interrogationarea) / 2)

    return xtable, ytable, utable, vtable
