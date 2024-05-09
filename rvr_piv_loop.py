import cv2
from piv_fftmulti import piv_fftmulti
import numpy as np


def piv_loop(interrogationarea, step, subpixfinder, mask_inpt, roi_inpt, passes, int2, int3, int4, repeat,
             mask_auto, do_pad, path_images, start, end):
    fr = start
    last_fr = end
    dict_cumul = {'u': 0, 'v': 0, 'x': 0, 'y': 0}
    while fr < last_fr:  # lets loop through the sls until the end
        # print([fr, last_fr])

        # transform to grayscale
        image1 = cv2.imread(path_images[fr])[:, :, 0]
        image2 = cv2.imread(path_images[fr + 1])[:, :, 0]

        # preprocessing
        clahe = cv2.createCLAHE(clipLimit=5)
        image1 = clahe.apply(image1)
        image2 = clahe.apply(image2)
        # cv2.imshow("hello", image1)
        # cv2.imshow("hello",  final_img )
        # clahe = 1
        # clahesize = 20
        # 'still has to be done'

        # piv processing
        xtable, ytable, utable, vtable = piv_fftmulti(image1, image2, interrogationarea, step, subpixfinder, mask_inpt,
                                                      roi_inpt, passes, int2, int3, int4, repeat, mask_auto, do_pad)
        try:
            dict_cumul['u'] = np.hstack((dict_cumul['u'], utable.reshape(-1, 1)))
            dict_cumul['v'] = np.hstack((dict_cumul['v'], vtable.reshape(-1, 1)))

        except ValueError:
            dict_cumul['u'] = utable.reshape(-1, 1)
            dict_cumul['v'] = vtable.reshape(-1, 1)
            dict_cumul['x'] = xtable
            dict_cumul['y'] = ytable


        fr += 1  # increment our sl count

    return dict_cumul
