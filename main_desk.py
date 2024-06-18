# -*- coding: utf-8 -*-
"""
Created on Mon Jan  25 15:55:13 2021
@ CORDOBA

@author: Antoine Patalano

"""

from tkinter import filedialog
from tkinter import *
import cv2
import os
# from video_to_frames import video_to_frames
from video_to_frames_2 import video_to_frames_2
import matplotlib.pyplot as plt
import matplotlib
import numpy as np
import math
import rvr_extra as re
import glob
from piv_fftmulti import piv_fftmulti
from scipy.interpolate import interp1d
import rvr_rec_res

from PyQt5 import QtCore
from PyQt5 import QtWidgets
from matplotlib.widgets import Cursor
import matplotlib.patches as patches
import multiprocessing
import csv
from wisttf import wisttf
from rvr_retreive_settings import rvr_retreive_settings
import pickle
import pandas as pd
from PIL import Image
from tqdm import tqdm
import datetime
import copy
import shutil
from intersection import intersection
from rvr_piv_loop import piv_loop
from concurrent.futures.thread import ThreadPoolExecutor
import sys


def main(argv):
    print("Hello !")
    print("Welcome to RIVeR - Python")
    print("")
    print("                                        `-/+oo:-.`")
    print("                                      .+ssso.     ")
    print("                                    `/ssss/       ")
    print("                                   `ossss/        ")
    print("        ````                      `ossss+         ")
    print("     .:++ooo+/-`                  /sssss`      ")
    print("   .+ooooooooooo:`               .sssss/        ")
    print("  :oooooooooooooo+`              +sssss`        ")
    print(" :oo++/:::/+ooooooo.            .sssss/         ")
    print(".+/-`      `:ooooooo`           +sssss`    ")
    print("-`           -oooooo+          .sssss+      ")
    print("              :ooooos:         /sssss-      ")
    print("               +ooooso`       `ssssso       ")
    print("               -ooooss/       :sssss:       ")
    print("                +ooosso.     `osssss`       ")
    print("                .ooosss+     :sssss/        ")
    print("                 /oossss-   .ssssss`        ")
    print("                 `oosssso:-:osssss:          ")
    print("                  -ossssssssssssso           ")
    print("                   -ossssssssssso`           ")
    print("                    .+sssssssss+`            ")
    print("                      ./+osoo/.  ")
    print("")

    # =============================================================================
    #         PROCESSING MODE
    # =============================================================================
    print("Select processing option: Single Video (Nadir View only) [S] or Batch Processing [B]")
    opt_procs = input("Enter your value: ")

    # =============================================================================
    #         SELECT VIDEO FILE
    # =============================================================================

    if opt_procs == "S" or opt_procs == "s":
        # =============================================================================
        # =============================================================================
        # =============================================================================
        #         SINGLE VIDEO (DRONE VIDEO)
        # =============================================================================
        # =============================================================================
        # =============================================================================

        print("Single Video option selected")
        print("")
        load_sttf = input("Would you like to load an SETTINGS FILE (.sst) ? Yes [Y] or No [N] (default if blank) ")
        print("")

        root = Tk()
        if (load_sttf == 'Y' or load_sttf == 'y'):
            print("select SETTINGS FILE")

            # root = Tk()
            inpt_file = filedialog.askopenfilename(title='select SST file', filetypes=[
                ("sst file", ".sst")])
            root.withdraw()
            # Load the existing parameters
            single_set = rvr_retreive_settings(inpt_file)
            file_path = single_set["file_path"]
            print(inpt_file)
            print("")
        else:
            load_sttf = 'N'

            print("select VIDEO FILE")
            file_path = filedialog.askopenfilename(title='select video', filetypes=[
                ("all video format", ".mp4"),
                ("all video format", ".flv"),
                ("all video format", ".avi"),
            ])
            root.withdraw()

        # get the video information
        video = cv2.VideoCapture(file_path)
        fps = video.get(cv2.CAP_PROP_FPS)  # get the fps number of the selected video
        last_frame = video.get(cv2.CAP_PROP_FRAME_COUNT)
        duration = last_frame / fps
        width = video.get(cv2.CAP_PROP_FRAME_WIDTH)
        height = video.get(cv2.CAP_PROP_FRAME_HEIGHT)
        ret, first_frame = video.read()
        first_frame = cv2.cvtColor(first_frame, cv2.COLOR_BGR2RGB)

        print("VIDEO FILE: " + file_path)
        print("duration (S) = " + str(round(duration * 1000) / 1000))
        print("fps = " + str(fps))
        print("resolution = " + str(int(width)) + "x" + str(int(height)))
        print("")

        # get filename, path and extension
        path, fullfile = os.path.split(file_path)
        file, extension = os.path.splitext(fullfile)

        # =============================================================================
        #         CREATES A INPUT CSV FILE
        # =============================================================================
        if load_sttf == 'N':
            # Creates a .csv file
            inpt_file = os.path.join(path, file + '_settings.sst')
            with open(inpt_file, 'w', newline='') as file_wrapper:
                writer = csv.writer(file_wrapper)
            wisttf(inpt_file, "NAME STATION", fullfile)  # write parameter in setting file
            wisttf(inpt_file, "VIDEO FILE", file_path)  # write parameter in setting file
            single_set = rvr_retreive_settings(inpt_file)
        # =============================================================================
        #         SELECT BATHYMETRY FILE
        # =============================================================================
        if 'path_bathymetry' in single_set.keys():
            path_bathymetry = single_set["path_bathymetry"]
        else:
            print("select BATHYMETRY FILE (two columns *.csv file from left side to right side of stream )")
            root = Tk()

            path_bathymetry = filedialog.askopenfilename(title='select CSV file', filetypes=[
                ("csv file", ".csv")])
            root.withdraw()

            print("BATHYMETRY FILE: " + path_bathymetry)
            print("")
            wisttf(inpt_file, "PATH BATHYMETRY", path_bathymetry)  # write parameter in setting file

        # =============================================================================
        #         get the current stage
        # =============================================================================
        if 'current_stage' in single_set.keys():
            current_stage = single_set["current_stage"]
        else:
            current_stage = input(
                "[float] STAGE of the current video :")

            current_stage = float(current_stage)
            print("")
            wisttf(inpt_file, "STAGE", current_stage)  # write parameter in setting file
        # =============================================================================
        #         calculate the bathymetry
        # =============================================================================
        bathymetry_posta = re.rvr_calculate_bath(path_bathymetry, current_stage)

        # =============================================================================
        #         FRAMES EXTRACTION SETTINGS
        # =============================================================================
        # first frame
        if 'T0' in single_set.keys():
            start_number = single_set["T0"]
        else:
            start_number = input(
                "[float] TIME in second of the FIRST frame to extract (if empty, the first frame of the video will be used) :")
            wisttf(inpt_file, "FRAME START", start_number)  # write parameter in setting file
            print("")

        if start_number == '':
            start_frame_number = 0
        else:
            start_frame_number = int(float(start_number) * fps)

        # last frame
        if 'TEND' in single_set.keys():
            end_number = single_set["TEND"]
        else:
            end_number = input(
                "[int] TIME in second of the LAST frame to extract (if empty, the last frame of the video will be used) :")
            wisttf(inpt_file, "FRAME END", end_number)  # write parameter in setting file
            print("")

        if end_number == '':
            end_frame_number = last_frame
        else:
            end_frame_number = int(float(end_number) * fps)

        # frame to skip
        if 'step_value' in single_set.keys():
            step_value = single_set["step_value"]
        else:
            step_value = input(
                "[int] FRAME STEP (if empty, frame step is 1, this means all the frames available will be extracted) :")
            if step_value == '':
                step_value = 1
            else:
                step_value = int(step_value)
            wisttf(inpt_file, "FRAME STEP", step_value)  # write parameter in setting file
            print("")

        # =============================================================================
        #         Define Scale
        # =============================================================================
        fig = plt.figure()
        plt.gcf().canvas.set_window_title('RIVeR - Python')
        ax1 = plt.axes()
        plt.axis('off')
        plt.imshow(first_frame)

        if 'pix_size' in single_set.keys():
            pix_size = single_set["pix_size"]
        else:
            # Draw the scale
            print("Select FIRST POINT of the scale")
            print("")

            matplotlib.use("Qt5Agg")
            win = plt.gcf().canvas.manager.window
            win.setWindowFlags(win.windowFlags() | QtCore.Qt.CustomizeWindowHint)
            win.setWindowFlags(win.windowFlags() & ~QtCore.Qt.WindowCloseButtonHint)
            cursor = Cursor(ax1, useblit=True, color='k', lw=0.5)
            # plt.show()

            # Prepare for scale selection
            limit_x, limit_y = ax1.get_xlim(), ax1.get_ylim()
            marg_x = np.diff(limit_x) / 10
            marg_y = np.diff(limit_y) / 10
            cursor = Cursor(ax1, useblit=True, color='k', lw=0.5)
            zoom_coordinates = np.array(plt.ginput(n=1, timeout=0)).T
            ax1.set_xlim((zoom_coordinates[0] - marg_x, zoom_coordinates[0] + marg_x))
            ax1.set_ylim((zoom_coordinates[1] - marg_y, zoom_coordinates[1] + marg_y))
            plt.draw()
            plt.pause(.01)
            left = plt.ginput(n=1, timeout=0)
            xf = np.array(left[0])[0]
            yf = np.array(left[0])[1]
            dot_a = plt.plot(xf, yf, 'bo', markersize=10)
            dot_b = plt.plot(xf, yf, 'ko', markersize=5)
            ax1.set_xlim(limit_x)
            ax1.set_ylim(limit_y)
            plt.draw()
            plt.pause(.01)
            print("Select SECOND POINT of the scale")
            print("")
            zoom_coordinates = np.array(plt.ginput(n=1, timeout=0)).T
            ax1.set_xlim((zoom_coordinates[0] - marg_x, zoom_coordinates[0] + marg_x))
            ax1.set_ylim((zoom_coordinates[1] - marg_y, zoom_coordinates[1] + marg_y))
            plt.draw()
            plt.pause(.01)
            right = plt.ginput(n=1, timeout=0)
            xs = np.array(right[0])[0]
            ys = np.array(right[0])[1]
            dot_c = plt.plot(xs, ys, 'bo', markersize=10)
            dot_d = plt.plot(xs, ys, 'ko', markersize=5)
            ax1.set_xlim(limit_x)
            ax1.set_ylim(limit_y)
            line_a = plt.plot([xf, xs], [yf, ys], color='b')
            plt.draw()
            plt.draw()

            # Calculate pix length
            length_pix = np.sqrt(np.square(xs - xf) + np.square(ys - yf))
            plt.draw()
            plt.pause(.01)

            # Define real length
            length_real = float(input(
                "[float] REAL LENGTH OF the scale :"))
            print("")

            # Calculate pixel size
            pix_size = length_real / length_pix

            wisttf(inpt_file, "PIXEL SIZE", pix_size)  # write parameter in setting file

        st = fps * step_value / 1000  # time between frame

        # txt_a = plt.text(xf, yf, "Pixel size: " + str(pix_size), fontsize=20, color='b')
        # plt.draw()

        print("PIXEL SIZE is: " + str(pix_size))
        print("")
        # =============================================================================
        #          Define Cross Section
        # =============================================================================
        if 'direction_CS' in single_set.keys():
            direction_CS = single_set["direction_CS"]
            XL, XR, YL, YR = direction_CS[0, 0], direction_CS[0, 1], direction_CS[1, 0], direction_CS[1, 1]
            length_real = np.sqrt(np.square(YL - YR) + np.square(XL - XR))


        else:
            try:
                line_a = line_a.pop(0)
                dot_a = dot_a.pop(0)
                dot_b = dot_b.pop(0)
                dot_c = dot_c.pop(0)
                dot_d = dot_d.pop(0)

                line_a.remove()
                dot_a.remove()
                dot_b.remove()
                dot_c.remove()
                dot_d.remove()

                # Using same point as scale _
                new_points = input(
                    "CROSS SECTION, define new points [N] (default if blank) or use same points from SCALE [S]? :")
                print("")
                if new_points == 'S' or new_points == 's':
                    xl = xf
                    yl = yf
                    xr = xs
                    yr = ys
                    plt.plot(xl, yl, 'ro', markersize=10)
                    plt.plot(xl, yl, 'ko', markersize=5)
                    plt.plot(xr, yr, 'go', markersize=10)
                    plt.plot(xr, yr, 'ko', markersize=5)
                    plt.plot([xr, xl], [yr, yl], color=[0.93, 0.69, 0.13], linewidth=1)
                    plt.draw()
                    plt.pause(.01)

                else:

                    # Draw the section
                    print("Select LEFT MARGIN")
                    print("")
                    zoom_coordinates = np.array(plt.ginput(n=1, timeout=0)).T
                    ax1.set_xlim((zoom_coordinates[0] - marg_x, zoom_coordinates[0] + marg_x))
                    ax1.set_ylim((zoom_coordinates[1] - marg_y, zoom_coordinates[1] + marg_y))
                    plt.draw()
                    plt.pause(.01)
                    left = plt.ginput(n=1, timeout=0)
                    xl = np.array(left[0])[0]
                    yl = np.array(left[0])[1]
                    plt.plot(xl, yl, 'ro', markersize=10)
                    plt.plot(xl, yl, 'ko', markersize=5)
                    ax1.set_xlim(limit_x)
                    ax1.set_ylim(limit_y)
                    plt.draw()
                    print("Select RIGHT MARGIN")
                    print("")
                    zoom_coordinates = np.array(plt.ginput(n=1, timeout=0)).T
                    ax1.set_xlim((zoom_coordinates[0] - marg_x, zoom_coordinates[0] + marg_x))
                    ax1.set_ylim((zoom_coordinates[1] - marg_y, zoom_coordinates[1] + marg_y))
                    plt.draw()
                    plt.pause(.01)
                    right = plt.ginput(n=1, timeout=0)
                    xr = np.array(right[0])[0]
                    yr = np.array(right[0])[1]
                    plt.plot(xr, yr, 'go', markersize=10)
                    plt.plot(xr, yr, 'ko', markersize=5)
                    ax1.set_xlim(limit_x)
                    ax1.set_ylim(limit_y)
                    plt.plot([xr, xl], [yr, yl], color=[0.93, 0.69, 0.13], linewidth=1)
                    plt.draw()
                    plt.pause(.01)
                    # recalculate length_real
                    length_real = np.sqrt(np.square(yl - yr) + np.square(xl - xr)) * pix_size
            except NameError:  # Pixel size has already been defined
                # Draw the section
                limit_x, limit_y = ax1.get_xlim(), ax1.get_ylim()
                marg_x = np.diff(limit_x) / 10
                marg_y = np.diff(limit_y) / 10
                cursor = Cursor(ax1, useblit=True, color='k', lw=0.5)
                print("Select LEFT MARGIN")
                print("")
                zoom_coordinates = np.array(plt.ginput(n=1, timeout=0)).T
                ax1.set_xlim((zoom_coordinates[0] - marg_x, zoom_coordinates[0] + marg_x))
                ax1.set_ylim((zoom_coordinates[1] - marg_y, zoom_coordinates[1] + marg_y))
                plt.draw()
                plt.pause(.01)
                left = plt.ginput(n=1, timeout=0)
                xl = np.array(left[0])[0]
                yl = np.array(left[0])[1]
                plt.plot(xl, yl, 'ro', markersize=10)
                plt.plot(xl, yl, 'ko', markersize=5)
                ax1.set_xlim(limit_x)
                ax1.set_ylim(limit_y)
                plt.draw()
                print("Select RIGHT MARGIN")
                print("")
                zoom_coordinates = np.array(plt.ginput(n=1, timeout=0)).T
                ax1.set_xlim((zoom_coordinates[0] - marg_x, zoom_coordinates[0] + marg_x))
                ax1.set_ylim((zoom_coordinates[1] - marg_y, zoom_coordinates[1] + marg_y))
                plt.draw()
                plt.pause(.01)
                right = plt.ginput(n=1, timeout=0)
                xr = np.array(right[0])[0]
                yr = np.array(right[0])[1]
                plt.plot(xr, yr, 'go', markersize=10)
                plt.plot(xr, yr, 'ko', markersize=5)
                ax1.set_xlim(limit_x)
                ax1.set_ylim(limit_y)
                plt.plot([xr, xl], [yr, yl], color=[0.93, 0.69, 0.13], linewidth=1)
                plt.draw()
                plt.pause(.01)
                # recalculate length_real
                length_real = np.sqrt(np.square(yl - yr) + np.square(xl - xr)) * pix_size

        # Define DIST OVER CS
        if 'dist_sl' in single_set.keys():
            dist_sl = single_set["dist_sl"]
        else:
            dist_sl = input(
                "[float] REAL DISTANCE between each station (The value will be adjusted, if blank REAL DISTANCE is 1) :")
            if dist_sl == '':
                dist_sl = float(1)
            else:
                dist_sl = float(dist_sl)

            wisttf(inpt_file, "DIST OVER CS", dist_sl)  # write parameter in setting file
            print("")

        num_sl = np.ceil(length_real / dist_sl)
        real_dist_step = length_real / (num_sl - 1)

        print("")

        # =============================================================================
        #         Calculate Homography H
        # =============================================================================
        m = np.array([[0, first_frame.shape[1] - 1, first_frame.shape[1] - 1, 0],
                      [first_frame.shape[0] - 1, first_frame.shape[0] - 1, 0, 0]])
        m = np.vstack((m, np.ones((1, 4))))

        M = pix_size * np.array([[0, first_frame.shape[1] - 1, first_frame.shape[1] - 1, 0],
                                 [0, 0, first_frame.shape[0] - 1, first_frame.shape[0] - 1]])
        M = np.vstack((M, np.ones((1, 4))))

        H, status = cv2.findHomography(np.transpose(M), np.transpose(m))

        # =============================================================================
        #         creates rw_ROI in function of CS
        # =============================================================================
        # Define WIDTH ROI
        if 'length_sl' in single_set.keys():
            length_sl = single_set["length_sl"]
            print("WIDTH ROI: " + str(length_sl))
            print("")
        else:
            def_length_sl = re.rvr_round(
                6 * 128 * pix_size * 10) / 10  # width of ROI is 6 times a interogation window size of 128 pix
            length_sl = input('[float]  Real World Width of the Region Of Interest (ROI). (' + str(
                def_length_sl) + ' is selected if blank)')
            print("")
            if length_sl == '':
                length_sl = def_length_sl
            else:
                length_sl = float(length_sl)
            wisttf(inpt_file, "WIDTH ROI", str(length_sl))  # write parameter in setting file

        # First let's get the coordinates of the CS in pixel
        if not 'direction_CS' in single_set.keys():  # if the CS has not been defined yet
            CooR = np.dot(np.linalg.inv(H), np.array([xr, yr, 1]).reshape(3, 1))
            CooL = np.dot(np.linalg.inv(H), np.array([xl, yl, 1]).reshape(3, 1))
            XR, YR = CooR[0, 0], CooR[1, 0]
            XL, YL = CooL[0, 0], CooL[1, 0]

            wisttf(inpt_file, "RW DIRECTION CS",
                   '[' + str(XL) + ' ' + str(XR) + ';' + str(YL) + ' ' + str(
                       YR) + ']')  # write parameter in setting file

        else:  # if the CS has been defined in the settings file
            coor = np.dot(H, np.array([XR, YR, 1]).reshape(3, 1))
            cool = np.dot(H, np.array([XL, YL, 1]).reshape(3, 1))
            xr, yr = coor[0, 0], coor[1, 0]
            xl, yl = cool[0, 0], cool[1, 0]

            plt.plot(xl, yl, 'ro', markersize=10)
            plt.plot(xl, yl, 'ko', markersize=5)
            plt.plot(xr, yr, 'go', markersize=10)
            plt.plot(xr, yr, 'ko', markersize=5)
            plt.plot([xr, xl], [yr, yl], color=[0.93, 0.69, 0.13])
            plt.draw()
            plt.pause(.01)

        # Calculates the angle of the CS in real world
        a, b = np.polyfit((XL, XR), (YL, YR), 1)
        ang = math.atan(a)  # rotation angle
        # ang_deg=math.degrees(ang)
        c, s = np.cos(-ang), np.sin(-ang)
        rot_mat = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
        shift_ends_a = np.dot(np.array([0, -length_sl / 2, 1]), rot_mat)  # calculate the shift to the ends upstream
        shift_ends_b = np.dot(np.array([0, length_sl / 2, 1]),
                              rot_mat)  # calculate the shift to the ends downstream

        rw_roi = np.array([[XL + shift_ends_a[0], YL + shift_ends_a[1]],
                           [XL + shift_ends_b[0], YL + shift_ends_b[1]],
                           [XR + shift_ends_b[0], YR + shift_ends_b[1]],
                           [XR + shift_ends_a[0], YR + shift_ends_a[1]]])

        rw_roi = np.vstack((rw_roi.T, np.ones((1, 4))))

        im_shape = first_frame.shape
        pix_roi = np.dot(H, rw_roi)
        pix_roi = np.hstack((pix_roi, pix_roi[:, 0].reshape((-1, 1))))  # close the roi

        # Make sure that the roi is still inside the image
        pix_roi[0, :] = np.where(pix_roi[0, :] < 0, 0, pix_roi[0, :])
        pix_roi[0, :] = np.where(pix_roi[0, :] > im_shape[1], im_shape[1], pix_roi[0, :])
        pix_roi[1, :] = np.where(pix_roi[1, :] < 0, 0, pix_roi[1, :])
        pix_roi[1, :] = np.where(pix_roi[1, :] > im_shape[0], im_shape[0], pix_roi[1, :])

        plt.plot(pix_roi[0, :], pix_roi[1, :], color='w')
        plt.plot(pix_roi[0, :], pix_roi[1, :], color='k', linestyle='--')
        # plt.text(pix_roi[0, 0], pix_roi[1, 0], "ROI ", fontsize=20, color='w')
        plt.draw()
        plt.pause(.01)

        # =============================================================================
        #         PLOT STATIONS
        # =============================================================================
        pix_sta_x = np.linspace(xl, xr, int(num_sl))
        pix_sta_y = np.linspace(yl, yr, int(num_sl))
        # plt.plot(pix_sta_x, pix_sta_y, color='k',linestyle = 'None', markersize=2, marker='o',markerfacecolor='k')

        # =============================================================================
        #         Make a bounding box for PIV
        # =============================================================================
        # (this is in case that the ROI is inclined)
        xmin = np.min(pix_roi[0, :])
        ymin = np.min(pix_roi[1, :])
        w = np.max(pix_roi[0, :]) - np.min(pix_roi[0, :])
        h = np.max(pix_roi[1, :]) - np.min(pix_roi[1, :])
        roirect = np.array([xmin, ymin, w, h])
        roirect = roirect.astype(int)

        # =============================================================================
        #         Build mask
        # =============================================================================
        try:
            mask = re.make_mask(pix_roi, im_shape)
        except:
            # This means that the box is already horizontal
            mask = []

        # =============================================================================
        #        DEFINE PIV SETTINGS
        # =============================================================================
        # interrogationarea
        if 'interrogationarea' in single_set.keys():
            interrogationarea = single_set["interrogationarea"]
        else:
            interrogationarea = input(
                "[int] INTERROGATION WINDOW SIZE in pixel (if blank INTERROGATION WINDOW SIZE is 128):")
            if interrogationarea == '':
                interrogationarea = float(128)
            else:
                interrogationarea = float(interrogationarea)
            wisttf(inpt_file, "INTERROGATION AREA", interrogationarea)  # write parameter in setting file

        print('INTERROGATION WINDOW SIZE is ' + str(interrogationarea) + ' pix or ' + str(
            pix_size * interrogationarea) + ' in Real World system')
        print('')
        # step
        if 'step' in single_set.keys():
            step = single_set["step"]
        else:
            step = input(
                "[int] OVERLAP between interrogation windows in pix (if blank OVERLAP half INTERROGATION WINDOW SIZE ):")
            if step == '':
                step = float(interrogationarea / 2)
            else:
                step = float(step)
            wisttf(inpt_file, "STEP PIV", step)  # write parameter in setting file

        print('OVERLAP  is ' + str(step) + ' pix or ' + str(
            pix_size * step) + ' in Real World system')
        print('')

        # passes
        passes = float(2)
        int2 = interrogationarea / 2
        print("Two passes will be used. The second pass will use interrogation window size of " + str(
            int2) + ' pix or ' + str(
            pix_size * int2) + ' in Real World system')
        print("")
        print("The maximum velocity that can be measured is " + str(
            np.floor((pix_size * int2 / 2) / st)) + " in Real World system /s")
        print("")
        int3, int4, repeat, mask_auto, do_pad, subpixfinder = 0, 0, 0, 1, 0, int(1)

        draw_ia(ax1, width, height, interrogationarea, int2)
        plt.draw()
        plt.pause(.01)

        # import matplotlib.patches as patches

        # =============================================================================
        #         DEFINE VELOCITIES LIMIT
        # =============================================================================

        # Max value
        if 'max_V' in single_set.keys():
            max_V = single_set["max_V"]
        else:
            max_V = input(
                "[float] MAX VELOCITY value expected (streamwise component) :")
            max_V = float(max_V)
            wisttf(inpt_file, "MAX V", max_V)  # write parameter in setting file

        # Min value
        if 'min_V' in single_set.keys():
            min_V = single_set["min_V"]
        else:
            min_V = input(
                "[float] MIN VELOCITY value expected (streamwise component):")
            min_V = float(min_V)
            wisttf(inpt_file, "MIN V", min_V)  # write parameter in setting file
        # =============================================================================
        #         DEFINE ALPHA COEFICIENT
        # =============================================================================
        # Alpha coeficient
        if 'alpha' in single_set.keys():
            alpha = single_set["alpha"]
        else:
            alpha = input(
                "[float] ALPHA Coeficient or Mean Velocity / Superficial velocity ratio (if blank ALPHA is 0.85):")
            print('')
            if alpha == '':
                alpha = float(0.85)
            else:
                alpha = float(alpha)
            wisttf(inpt_file, "ALPHA", alpha)  # write parameter in setting file

        print('The setting file has been saved in ' + inpt_file)
        print('')

        # =============================================================================
        #         Check if there is an existing session
        # =============================================================================
        if os.path.exists(os.path.join(path, file + '_piv_session.pkl')):
            print("An existing PIV session already exists.")
            used_session = input(
                "Would you like to use it ? Yes [Y] (default if blank)  or No [N] (the video will be processed again) :")
            if used_session == '' or used_session == 'Y' or used_session == 'y':
                with open(os.path.join(path, file + '_piv_session.pkl'), 'rb') as fsess:
                    dict_cumul, xtable, ytable = pickle.load(fsess)

                    run_piv = 0

            else:
                run_piv = 1

        else:
            run_piv = 1

        if run_piv == 1:
            # ready to process ?
            ready = 0
            while ready == 0:
                ready_process = input(
                    "Are you ready to process? Yes [Y] (default if blank) or No [N] (I want to review the input file) ")
                print("")
                if not (ready_process == '' or ready_process == 'Y' or ready_process == 'y'):
                    os.system('start NOTEPAD.EXE  "' + inpt_file + '"')
                else: #All the parameters are reloaded from settings file
                    single_set = rvr_retreive_settings(inpt_file)
                    file_path = single_set["file_path"]
                    name_station = single_set["name_station"]
                    path_bathymetry = single_set["path_bathymetry"]
                    current_stage = single_set["current_stage"]
                    start_number = single_set["T0"]
                    start_frame_number = int(float(start_number) * fps)
                    end_number = single_set["TEND"]
                    end_frame_number = int(float(end_number) * fps)
                    length_sl = single_set["length_sl"]
                    step_value = single_set["step_value"]
                    pix_size = single_set["pix_size"]
                    dist_sl = single_set["dist_sl"]
                    direction_CS = single_set["direction_CS"]
                    interrogationarea = single_set["interrogationarea"]
                    int2 = interrogationarea / 2
                    step = single_set["step"]
                    max_V = single_set["max_V"]
                    min_V = single_set["min_V"]
                    alpha = single_set["alpha"]

                    # Refresh roi and interrogation area

                    ax1.cla()
                    plt.axis('off')
                    plt.imshow(first_frame)
                    draw_ia(ax1, width, height, interrogationarea, int2)
                    draw_roi(first_frame, pix_size, direction_CS,length_sl)
                    plt.draw()
                    plt.pause(.01)

                    ready = 1

            disp_vectors = input(
                "Would you like to see the instantaneous displacement fields? Yes [Y] (slower) or No [N] (default if blank) ")
            print("")
            # =============================================================================
            #         Proceed to Extraction
            # =============================================================================

            new_folder = os.path.join(path, file)

            total_frames = (end_frame_number - start_frame_number)
            chunk_size = int(np.ceil(total_frames / multiprocessing.cpu_count()))
            try:

                os.mkdir(new_folder)
            except OSError:
                print('The folder ' + file + ' already exists')

            # video_to_frames(file_path, new_folder, start_frame_number, end_frame_number, step_value)
            video_to_frames_2(file_path, new_folder, False, start_frame_number, end_frame_number, step_value,
                              chunk_size)

            path_images = glob.glob(os.path.join(new_folder, "*.jpg"))
            path_images = sorted(path_images)
            print("")

            # =============================================================================
            #         BEGIN THE PIV LOOP (NO THREADS)
            # =============================================================================

        #     roi_inpt = roirect
        #     mask_inpt = mask
        #
        #     dict_cumul = {'u': 0, 'v': 0}
        #
        #     for fr in tqdm(range(0, len(path_images) - 1)):
        #
        #         # transform to grayscale
        #         image1 = np.array(Image.open(path_images[fr]).convert('LA'))[:, :, 0]
        #         image2 = np.array(Image.open(path_images[fr + 1]).convert('LA'))[:, :, 0]
        #
        #         # preprocessing
        #         clahe = cv2.createCLAHE(clipLimit=5)
        #         image1 = clahe.apply(image1)
        #         image2 = clahe.apply(image2)
        #         clahe = 1
        #         clahesize = 20
        #         'still has to be done'
        #
        #         # piv processing
        #         xtable, ytable, utable, vtable = piv_fftmulti(image1, image2, interrogationarea, step, subpixfinder,
        #                                                       mask_inpt,
        #                                                       roi_inpt, passes, int2, int3, int4, repeat, mask_auto,
        #                                                       do_pad)
        #         # plot instantaneous displacement field
        #         if disp_vectors == 'Y' or disp_vectors == 'y':
        #             # plot the new vector
        #             try:
        #                 arrows.remove()
        #                 inst_im.remove()
        #             except NameError:
        #                 print('')
        #
        #             inst_im = plt.imshow(Image.open(path_images[fr]).convert('LA'))
        #             plt.draw()
        #             plt.pause(.01)
        #
        #             arrows = plt.quiver(xtable + roirect[0], ytable + roirect[1], utable, vtable, color='g',
        #                                 angles='xy')
        #             plt.draw()
        #             plt.pause(.01)
        #
        #         if fr == 0:
        #             dict_cumul['u'] = utable.reshape(-1, 1)
        #             dict_cumul['v'] = vtable.reshape(-1, 1)
        #         else:
        #             dict_cumul['u'] = np.hstack((dict_cumul['u'], utable.reshape(-1, 1)))
        #             dict_cumul['v'] = np.hstack((dict_cumul['v'], vtable.reshape(-1, 1)))
        #     print('')
        #
        #     if fr == 0:
        #         dict_cumul['u'] = utable.reshape(-1, 1)
        #         dict_cumul['v'] = vtable.reshape(-1, 1)
        #     else:
        #         dict_cumul['u'] = np.hstack((dict_cumul['u'], utable.reshape(-1, 1)))
        #         dict_cumul['v'] = np.hstack((dict_cumul['v'], vtable.reshape(-1, 1)))
        #
        # # calculate median velocity field
        # U = np.nanmedian(dict_cumul['u'], 1).reshape(xtable.shape[0], xtable.shape[1])
        # V = np.nanmedian(dict_cumul['v'], 1).reshape(xtable.shape[0], xtable.shape[1])
        # X = xtable + roirect[0]
        # Y = ytable + roirect[1]
        #
        # # Save the results session
        # with open(os.path.join(path, file + '_piv_session.pkl'), 'wb') as fsess:
        #     pickle.dump([dict_cumul, xtable, ytable], fsess)
        # =============================================================================
        #         BEGIN THE PIV LOOP (WITH MULTI THREADS)
        # =============================================================================
        roi_inpt = roirect
        mask_inpt = mask

        chunks = [[i, i + chunk_size] for i in
                  range(0, len(path_images) - 1, chunk_size)]  # split the frames into chunk lists
        chunks[-1][-1] = min(chunks[-1][-1], len(
            path_images) - 1)  # make sure last chunk has correct end frame, also handles case chunk_size < total

        # execute across multiple cpu cores to speed up processing, get the count automatically
        with ThreadPoolExecutor(max_workers=multiprocessing.cpu_count()) as executor:
            # with ProcessPoolExecutor(max_workers=multiprocessing.cpu_count()) as executor:
            # with ProcessPoolExecutor(max_workers=multiprocessing.cpu_count()) as executor:
            futures = [
                executor.submit(piv_loop, interrogationarea, step, subpixfinder, mask_inpt, roi_inpt, passes, int2,
                                int3, int4,
                                repeat, mask_auto, do_pad, path_images, cur_chunk[0], cur_chunk[1])
                for cur_chunk in chunks]

        dict_cumul = {'u': 0, 'v': 0}
        dict_cumul['u'] = futures[0].result()["u"]
        dict_cumul['v'] = futures[0].result()["v"]
        xtable = futures[0].result()["x"]
        ytable = futures[0].result()["y"]

        for f in range(1, len(futures)):
            dict_cumul['u'] = np.hstack((dict_cumul['u'], futures[f].result()["u"]))
            dict_cumul['v'] = np.hstack((dict_cumul['v'], futures[f].result()["v"]))

        # calculate median velocity field
        U = np.nanmedian(dict_cumul['u'], 1).reshape(xtable.shape[0], xtable.shape[1])
        V = np.nanmedian(dict_cumul['v'], 1).reshape(xtable.shape[0], xtable.shape[1])
        X = xtable + roirect[0]
        Y = ytable + roirect[1]

        # Save the results session
        with open(os.path.join(path, file + '_piv_session.pkl'), 'wb') as fsess:
            pickle.dump([dict_cumul, xtable, ytable], fsess)

        # =============================================================================
        #         rectifies the results and get RW
        # =============================================================================
        res = np.array([40, 40])
        rw_roi = np.delete(rw_roi, (2), axis=0)  # delete third and fourth row
        rect_res = rvr_rec_res.rvr_rec_res(X, Y, U, V, H, rw_roi, st, res)

        # =============================================================================
        #         calculate the components over the cross section
        # =============================================================================
        east = [XL, XR]
        north = [YL, YR]
        East, North, VE = re.improfile(rect_res["X_rec"], rect_res["Y_rec"], rect_res["U_rec"], east, north, num_sl)
        East, North, VN = re.improfile(rect_res["X_rec"], rect_res["Y_rec"], rect_res["V_rec"], east, north, num_sl)

        # =============================================================================
        #         calculate Streamwise (S) and Crosswise (C) component of the Cross section
        # =============================================================================
        Leftmargin = np.array([East[0], North[0]])
        Rightmargin = np.array([East[-1], North[-1]])
        S, C, tetarad = re.rvr_vel_components(Leftmargin, Rightmargin, VE, VN)

        # =============================================================================
        #         filter the velocities
        # =============================================================================
        with np.errstate(invalid='ignore'):
            if len(S[S < min_V]) > 0:
                S[S < min_V] = np.NaN
            if len(S[S > max_V]) > 0:
                S[S > max_V] = np.NaN

        id_interp = np.argwhere(np.isnan(S))[:, 0].flatten()

        S[[0, -1], 0] = 0
        S = S.flatten()
        S_backup = np.copy(S)
        # =============================================================================
        #         Get depth
        # =============================================================================
        x = np.arange(start=0, stop=length_real, step=real_dist_step)  # station velocity
        if len(S) > len(x):
            x = np.append(x, length_real)

        station = bathymetry_posta[:, 0]  # station bathymetry
        station = station - station[0]  # station bathymetry starts from 0
        stage = bathymetry_posta[:, 1]  # bathymerty
        # print(station)
        # print(stage)
        # print(x)
        newstage = interp1d(station, stage, fill_value="extrapolate")(x)
        depth = current_stage - newstage

        # =============================================================================
        #         interpolates gaps with Froude Number and plot on figure
        # =============================================================================
        S = re.rvr_inter_vel(depth, S)
        V = np.mean(S)

        VE_new, VN_new = re.rvr_inv_vel_components(S, C * 0, tetarad)

        # plot the new vector
        if 'arrows' in locals():
            try:
                arrows.remove()
                inst_im.remove()
            except (NameError, ValueError):
                print('')

        vel_meas = plt.quiver(pix_sta_x, pix_sta_y, VE_new, VN_new, color=[0, 0.45, 0.74], scale=5,
                              scale_units='inches')
        vel_interp = plt.quiver(pix_sta_x[id_interp], pix_sta_y[id_interp], VE_new[id_interp], VN_new[id_interp],
                                color=[0.76, 0.22, 0.21], scale=5, scale_units='inches')
        legend_im = plt.legend([vel_meas, vel_interp], ['Measured Velocity', 'Interpolated Velocity'])
        # plt.imshow(first_frame)
        # Save the figure
        fig.savefig(os.path.join(path, file + '_cross_section.png'), format='png', dpi=300, bbox_inches='tight',
                    pad_inches=0)

        # =============================================================================
        #         Calculate Discharge
        # =============================================================================
        w, a, q = re.rvr_calculate_q(x, S, depth)
        Q = alpha * np.nansum(q)
        Qinterp = alpha * np.nansum(q[id_interp])
        Q_ratio = 100 * Qinterp / Q
        print('Total discharge Q=' + str(re.rvr_round(Q * 100) / 100) + ' for Level=' + str(
            re.rvr_round(current_stage * 100) / 100) + ' with alpha=' + str(alpha))
        print('Interpolated discharge is ' + str(re.rvr_round(Q_ratio * 100) / 100) + '% of Total discharge')

        print('')
        id_Q_interp = np.zeros(len(x))  # this is for the final report
        id_Q_interp[id_interp] = 1

        # =============================================================================
        #         PLOT RESULTS
        # =============================================================================
        # fig_results, axs = plt.subplots(3, figsize=(15, 15))
        fig_results, axs = plt.subplots(3)
        plt.gcf().canvas.set_window_title('RIVeR - Python - Results')

        matplotlib.use("Qt5Agg")
        win = plt.gcf().canvas.manager.window
        try:
            win = fig_results.canvas.manager.window
        except AttributeError:
            win = fig_results.canvas.window()
        toolbar = win.findChild(QtWidgets.QToolBar)
        toolbar.setVisible(False)

        # Bathymetry plot
        axs[0].grid(True)
        axs[0].set_axisbelow(True)
        axs[0].plot(station, stage, color='k', linewidth=1, markersize=2, marker='o', markerfacecolor='k')
        axs[0].fill_between(station, stage, current_stage, color=[0.68, 0.92, 1])
        axs[0].plot(station, current_stage * np.ones(len(station)), linewidth=2, color=[0, 0.45, 0.74])
        axs[0].legend(["Bathymetry", "WS"], loc="lower left")
        axs[0].set_ylabel('Stage')

        # Velocity plot
        axs[1].grid(True)
        axs[1].set_axisbelow(True)
        axs[1].plot(x, S, color=[0, 0.45, 0.74], linestyle='-.', linewidth=1, markersize=2, marker='o',
                    markerfacecolor=[0.76, 0.22, 0.21], markeredgecolor=[0.76, 0.22, 0.21])
        axs[1].plot(x, S_backup, color=[0, 0.45, 0.74], linewidth=1, markersize=2, marker='o',
                    markerfacecolor=[0, 0.45, 0.74], markeredgecolor=[0, 0.45, 0.74])
        axs[1].legend(["Interpolated", "Measured"], loc="upper right")
        axs[1].set_ylabel('Velocity')

        # Discharge plot
        axs[2].grid(True)
        axs[2].set_axisbelow(True)
        q_portion = (q * alpha) / Q
        mask1 = q_portion <= 0.05
        mask2 = q_portion <= 0.1
        axs[2].bar(x, q, color=[0.76, 0.22, 0.21])
        axs[2].bar(x[mask2], q[mask2], color=[0.93, 0.69, 0.13])
        axs[2].bar(x[mask1], q[mask1], color=[0.29, 0.57, 0.23])
        axs[2].set_ylabel('Discharge')
        axs[2].set_xlabel('Station')
        axs[2].legend([">10%", "<=10%", "<=5%"], loc="upper left")

        # Cumulative discharge
        cumsum_q = np.cumsum(q_portion) * 100
        ax_cumul = axs[2].twinx()
        ax_cumul.plot(x, cumsum_q, color='k', linewidth=1, linestyle='--', markersize=2, marker='o',
                      markerfacecolor='k')
        ax_cumul.set_ylim([0, 100])
        ax_cumul.set_ylabel('Cumulative in %')

        # Save the figure
        fig_results.savefig(os.path.join(path, file + '_results.png'), format='png', dpi=300)
        print('Results are saved in ' + os.path.join(path, file))

        # =============================================================================
        #         WRITE REPORT
        # =============================================================================
        now = datetime.datetime.now()
        report_file = os.path.join(path, file + '_report.csv')
        with open(report_file, 'w', newline='') as file_wrapper:
            writer = csv.writer(file_wrapper)
        wisttf(report_file, now.strftime("%Y-%m-%d %H:%M:%S"), "")
        wisttf(report_file, "Summary report, RIVeR - Python", "")
        wisttf(report_file, "NAME STATION", fullfile)
        wisttf(report_file, "STAGE", current_stage)
        wisttf(report_file, "ALPHA", alpha)
        wisttf(report_file, "DISCHARGE", Q)
        wisttf(report_file, "", "")

        with open(report_file, 'a+', newline='') as  file_wrapper:
            writer = csv.writer(file_wrapper)
            writer.writerow(['STATION', 'VELOCITY', 'DEPTH', 'WIDTH', 'AREA', 'DISCHARGE', 'INTERPOLATED'])
            for i in range(len(x)): writer.writerow([x[i], S[i], depth[i], w[i], a[i], q[i], id_Q_interp[i]])

        # =============================================================================
        #         REMOVE FOLDER IF ASKED
        # =============================================================================
        rm_frames = 1
        if rm_frames == 1:
            if 'new_folder' in locals():
                try:
                    shutil.rmtree(os.path.join(new_folder))
                except PermissionError:
                    print('The process cannot access the file because it is being used by another process')

        print('')
        print('END OF PROCESSING')

    elif opt_procs == "B" or opt_procs == "b":
        # =============================================================================
        # =============================================================================
        # =============================================================================
        #         BATCH PROCESSING
        # =============================================================================
        # =============================================================================
        # =============================================================================
        rm_frames = 1  # if 1 the folders with extracted frames will be removed after processing

        print("Batch Processing option selected")
        print("")
        load_sttf = input("Would you like to load an SETTINGS FILE (.csv) ? Yes [Y] or No [N] (default if blank) ")
        print("")

        root = Tk()

        if load_sttf == 'Y' or load_sttf == 'y':
            print("select SETTINGS FILE")

            # root = Tk()
            inpt_file = filedialog.askopenfilename(title='select BST file', filetypes=[
                ("bst file", ".bst")])
            root.withdraw()
            # Load the existing parameters
            batch_set = rvr_retreive_settings(inpt_file)
            # file_path = batch_set["file_path"]
            print(inpt_file)
            print("")
            name_station = batch_set['name_station']
            print("NAME STATION: " + name_station)
            print('')

            file_fold = open(batch_set['path_list_folders'], "r")
            FoldersPath = file_fold.readlines()[0]
            print("LIST FOLDERS: " + FoldersPath)
            file_fold.close()


        else:
            load_sttf = 'N'

            print("select VIDEOS FOLDER")
            FoldersPath = filedialog.askdirectory()

            # wite in .txt file
            in_fold_file = open(os.path.join(FoldersPath, "in_FoldersPaths.txt"), "w")
            in_fold_file.write(FoldersPath)
            in_fold_file.close()

            root.withdraw()

            print('List folders to analyze: ' + FoldersPath)
            print("")

            # =============================================================================
            #         NAME STATION
            # =============================================================================
            name_station = input("NAME STATION ?")
            print("")

            # =============================================================================
            #         CREATES A INPUT CSV FILE
            # =============================================================================
            # Creates a .csv file
            inpt_file = os.path.join(FoldersPath, name_station + '_settings.bst')
            with open(inpt_file, 'w', newline='') as file:
                writer = csv.writer(file)
            wisttf(inpt_file, "NAME STATION", name_station)  # write parameter in setting file
            wisttf(inpt_file, "LIST FOLDERS",
                   os.path.join(FoldersPath, "in_FoldersPaths.txt"))  # write parameter in setting file
            batch_set = rvr_retreive_settings(inpt_file)

        # =============================================================================
        #         IS THERE AN EXISTING PROCESSED FILE
        # =============================================================================
        files = [os.path.basename(x) for x in glob.glob(os.path.join(FoldersPath, "*.mp4"))]
        to_do = sorted(files)

        # if the list of processed cases doesn't exist, create one
        fn = os.path.join(FoldersPath, 'py_' + name_station + '_processed_files.txt')
        try:
            fid = open(fn, 'r')
            # Do something with the file
        except IOError:
            fid = open(fn, 'w')
        finally:
            fid.close()

        # read the list file of processsed cases
        with open(fn) as f:
            done = [line.rstrip() for line in f]

        diff_list = list(set(to_do) - set(done))
        diff_list.sort()

        # =============================================================================
        #       VIDEOS GENERAL INFORMATION
        # =============================================================================

        video = cv2.VideoCapture(os.path.join(FoldersPath, files[0]))
        fps = video.get(cv2.CAP_PROP_FPS)  # get the fps number of the selected video
        last_frame = video.get(cv2.CAP_PROP_FRAME_COUNT)
        # duration = last_frame / fps
        width = video.get(cv2.CAP_PROP_FRAME_WIDTH)
        height = video.get(cv2.CAP_PROP_FRAME_HEIGHT)
        resolution_ffmpeg = str(int(width)) + "x" + str(int(height))

        print("VIDEOS GENERAL INFORMATION:")
        print("fps = " + str(fps))
        print("resolution = " + resolution_ffmpeg)
        print("")
        wisttf(inpt_file, "RESOLUTION", resolution_ffmpeg)  # write parameter in setting file

        if len(diff_list) > 0:  # if there is at least a file to process

            # =============================================================================
            #         IMPORT STAGES FILE
            # =============================================================================
            if 'path_stages' in batch_set.keys():
                path_stages = batch_set["path_stages"]
                print("PATH STAGES: " + batch_set["path_stages"])
                print("")
            else:

                print("select STAGE FILE (two columns *.csv with files name and respective stage )")
                root = Tk()

                path_stages = filedialog.askopenfilename(title='select CSV file', filetypes=[
                    ("csv file", ".csv")])
                root.withdraw()

                print("STAGE FILE: " + path_stages)
                print("")
                wisttf(inpt_file, "PATH STAGES", path_stages)  # write parameter in setting file
            csv_stage = pd.read_csv(path_stages)
            # =============================================================================
            #         IMPORT BATHYMETRY FILE
            # =============================================================================
            if 'path_bathymetry' in batch_set.keys():
                path_bathymetry = batch_set["path_bathymetry"]
                print("PATH BATHYMETRY: " + batch_set["path_bathymetry"])
                print("")
            else:

                print("select BATHYMETRY FILE (two columns *.csv file from left side to right side of stream )")
                root = Tk()

                path_bathymetry = filedialog.askopenfilename(title='select CSV file', filetypes=[
                    ("csv file", ".csv")])
                root.withdraw()

                print("BATHYMETRY FILE: " + path_bathymetry)
                print("")
                wisttf(inpt_file, "PATH BATHYMETRY", path_bathymetry)  # write parameter in setting file

            # =============================================================================
            #         IMPORT GRP FILE
            # =============================================================================
            if 'PathGRPS' in batch_set.keys():
                PathGRPS = batch_set["PathGRPS"]
                print("PATH GRPS: " + batch_set["PathGRPS"])
                print("")
            else:

                print("select GRP file (6 columns *.csv [Label, X, Y, Z, x ,y] or 4 columns [Label, X, Y, Z])")
                root = Tk()

                PathGRPS = filedialog.askopenfilename(title='select CSV file', filetypes=[
                    ("csv file", ".csv")])
                root.withdraw()

                PathGRPS = PathGRPS.replace("\\", "/")
                GRPs = pd.read_csv(PathGRPS)
                if len(GRPs.columns) < 5:  # means that pixel coordinates are missing
                    GRPs.columns = ['CP', 'X', 'Y', 'Z']
                    # open interactive figure
                    # fig_grp, axs = plt.subplots(1, 2, figsize=(15, 15))
                    fig_grp, axs = plt.subplots(1, 2)
                    # ax = fig_map.gca()
                    plt.gcf().canvas.set_window_title('RIVeR - Python - GRPs')
                    matplotlib.use("Qt5Agg")
                    win = plt.gcf().canvas.manager.window

                    try:
                        win = fig_grp.canvas.manager.window
                    except AttributeError:
                        win = fig_grp.canvas.window()
                    toolbar = win.findChild(QtWidgets.QToolBar)
                    toolbar.setVisible(False)

                    axs[1].grid(True)
                    axs[1].set_axisbelow(True)

                    axs[1].plot(GRPs["X"], GRPs["Y"], 'co', markersize=10)
                    axs[1].plot(GRPs["X"], GRPs["Y"], 'ko', markersize=5)
                    axs[1].set_aspect('equal', adjustable='box')
                    GRPs["CP"] = GRPs["CP"].astype(str)
                    GRPs[['X', 'Y', 'CP']].apply(lambda x: axs[1].text(*x), axis=1)
                    axs[1].set_title("Plan View")
                    plt.draw()
                    plt.pause(.01)

                    cp_bck = input(
                        "Do you want to select an image / video where all the GCPs are visible ? Yes [Y] (default if blank) or No [N] (the user will go through the videos folder and find one) ")
                    print("")

                    if (cp_bck == '' or cp_bck == 'Y' or cp_bck == 'y'): #The user picks a specific file (video or image)
                        print("select file (VIDEO or IMAGE)")
                        file_cps = filedialog.askopenfilename(title='select video or image', filetypes=[
                            ("all video format", ".mp4"),
                            ("all video format", ".flv"),
                            ("all video format", ".avi"),
                            (".jpg image", ".jpg"),
                        ])

                        # Check the file extension
                        if (os.path.splitext(file_cps)[-1]== '.jpg' or os.path.splitext(file_cps)[-1]== '.JPG'):
                            first_frame=cv2.imread(file_cps, cv2.COLOR_BGR2RGB)
                        else:
                            video = cv2.VideoCapture(file_cps)
                            ret, first_frame = video.read()
                            first_frame = cv2.cvtColor(first_frame, cv2.COLOR_BGR2RGB)


                        axs[0].axis('off')
                        bck_im = axs[0].imshow(first_frame)
                        axs[0].set_title("Camera View")
                        plt.draw()
                        plt.pause(.01)

                    else:# find a image among all the videos where GCPs are visible

                        bck_ready = 0
                        ibk = 0
                        while bck_ready == 0:
                            try:
                                bck_im.remove()
                            except NameError:
                                print('')
                            if ibk >= len(files):
                                ibk = 0
                            # get the first frame of the first video
                            sel_video = os.path.join(FoldersPath, files[ibk])
                            video = cv2.VideoCapture(sel_video)
                            ret, first_frame = video.read()
                            first_frame = cv2.cvtColor(first_frame, cv2.COLOR_BGR2RGB)
                            axs[0].axis('off')
                            bck_im = axs[0].imshow(first_frame)
                            axs[0].set_title("Camera View")
                            plt.draw()
                            plt.pause(.01)
                            ibk = ibk + 1
                            is_bck = input(
                                "Are the GCPs all visible on this image ? Yes [Y] (default if blank) or No [N] (Next image will be displayed) ")
                            print("")
                            del bck_im
                            if (is_bck == '' or is_bck == 'Y' or is_bck == 'y'):
                                bck_ready = 1
                    grps_ok = 0
                    while grps_ok == 0:
                        # Prepare for GRPS selection
                        limit_x, limit_y = axs[0].get_xlim(), axs[0].get_ylim()
                        marg_x = np.diff(limit_x) / 10
                        marg_y = np.diff(limit_y) / 10
                        marg_x2 = np.diff(limit_x) / 40
                        marg_y2 = np.diff(limit_y) / 40
                        GRPs["x"], GRPs["y"] = float(0), float(0)

                        pd.options.mode.chained_assignment = None  # default='warn'

                        cursor = Cursor(axs[0], useblit=True, color='k', lw=0.5)

                        for pt in range(len(GRPs["X"])):
                            print('On the CAMERA VIEW click where GRP ' + GRPs["CP"][pt] + ' is')
                            zoom_coordinates = np.array(plt.ginput(n=1, timeout=0)).T
                            axs[0].set_xlim((zoom_coordinates[0] - marg_x, zoom_coordinates[0] + marg_x))
                            axs[0].set_ylim((zoom_coordinates[1] - marg_y, zoom_coordinates[1] + marg_y))
                            plt.draw()
                            plt.pause(.01)
                            zoom_coordinates_2 = np.array(plt.ginput(n=1, timeout=0)).T
                            axs[0].set_xlim((zoom_coordinates_2[0] - marg_x2, zoom_coordinates_2[0] + marg_x2))
                            axs[0].set_ylim((zoom_coordinates_2[1] - marg_y2, zoom_coordinates_2[1] + marg_y2))
                            plt.draw()
                            plt.pause(.01)

                            GCP_coordinates = np.array(plt.ginput(n=1, timeout=0)).T
                            axs[0].set_xlim(limit_x)
                            axs[0].set_ylim(limit_y)
                            axs[0].plot(GCP_coordinates[0], GCP_coordinates[1], 'co', markersize=10)
                            axs[0].plot(GCP_coordinates[0], GCP_coordinates[1], 'ko', markersize=5)
                            axs[0].text(GCP_coordinates[0], GCP_coordinates[1], GRPs['CP'][pt])
                            GRPs["x"][pt], GRPs["y"][pt] = GCP_coordinates[0], GCP_coordinates[1]
                            plt.draw()
                            plt.pause(.01)
                        print('')


                        grps_ok_ans = input(
                            'The GRPs are now set. Would you like to proceed and save them in a new file ? Yes [Y] (default if blank) or No [N] (Do it again) ')
                        if (grps_ok_ans == '' or grps_ok_ans == 'Y' or grps_ok_ans == 'y'):
                            PathGRPS = os.path.join(os.path.split(PathGRPS)[0], 'GRPs_XYZxy.csv')
                            GRPs.to_csv(PathGRPS)
                            grps_ok = 1
                            plt.close(fig_grp)

                print("GRP FILE: " + PathGRPS)
                print("")
                wisttf(inpt_file, "PATH GRPS", PathGRPS)  # write parameter in setting file

            # =============================================================================
            #         SELECT PIXEL COORDINATE SYSTEM
            # =============================================================================
            if 'imcoor_sys' in batch_set.keys():
                imcoor_sys = batch_set["imcoor_sys"]
                print("IMCOOR SYSTEM: " + batch_set["imcoor_sys"])
                print("")
            else:

                imcoor_sys = input(
                    "Choose IMAGE COORDINATES SYSTEM of GRP file: Python (default if blank) or Matlab [M]? :")
                print("")
                if imcoor_sys == 'M':
                    imcoor_sys = "MATLAB"
                else:
                    imcoor_sys = "PYTHON"
                wisttf(inpt_file, "IMCOOR SYSTEM", imcoor_sys)  # write parameter in setting file

            # =============================================================================
            #         BUILT 3D Model
            # =============================================================================

            PathGRPS = PathGRPS.replace("\\", "/")
            GRPs = pd.read_csv(PathGRPS)
            if len(GRPs.columns) > 6:
                GRPs.columns = ['ID', 'CP', 'X', 'Y', 'Z', 'x', 'y']
            else:
                GRPs.columns = ['CP', 'X', 'Y', 'Z', 'x', 'y']

            if imcoor_sys == "MATLAB":
                # means pixel coordinate system is matlab based
                GRPs["x"] = GRPs["x"] - 1
                GRPs["y"] = GRPs["y"] - 1
            C_Matrix = re.solve_c_matrix(GRPs)

            # read the bathymetry from file
            bathymetry = pd.read_csv(path_bathymetry)
            print("BATHYMETRY:")
            print(bathymetry)
            print("")
            # =============================================================================
            #         GET STATION POINT CS , RW POINT CS AND RW DIRECTION CS, WIDTH ROI (interactive)
            # =============================================================================
            # get STATION POINT CS
            if 'station_punto_CS' in batch_set.keys():
                station_punto_CS = batch_set["station_punto_CS"]
                print("STATION POINT CS: " + str(int(batch_set["station_punto_CS"])))
                print("")
            else:

                station_punto_CS = input(
                    "[int]  From the previous table, choose the first point that will define the left side of CROSS SECTION (0 is selected if blank)")
                print("")
                if station_punto_CS == '':
                    station_punto_CS = int(0)
                else:
                    station_punto_CS = int(station_punto_CS)

                station_punto_CS = bathymetry["x"][int(station_punto_CS)]
                wisttf(inpt_file, "STATION POINT CS", str(station_punto_CS))  # write parameter in setting file

            # open interactive figure
            # fig_map, axs = plt.subplots(1, 2, figsize=(15, 15))
            fig_map, axs = plt.subplots(1, 2)
            # ax = fig_map.gca()
            plt.gcf().canvas.set_window_title('RIVeR - Python - Map')
            matplotlib.use("Qt5Agg")
            win = plt.gcf().canvas.manager.window
            try:
                win = fig_map.canvas.manager.window
            except AttributeError:
                win = fig_map.canvas.window()
            toolbar = win.findChild(QtWidgets.QToolBar)
            toolbar.setVisible(False)

            axs[1].grid(True)
            axs[1].set_axisbelow(True)

            axs[1].plot(GRPs["X"], GRPs["Y"], 'co', markersize=10)
            axs[1].plot(GRPs["X"], GRPs["Y"], 'ko', markersize=5)
            axs[1].set_aspect('equal', adjustable='box')
            GRPs["CP"] = GRPs["CP"].astype(str)
            GRPs[['X', 'Y', 'CP']].apply(lambda x: axs[1].text(*x), axis=1)
            axs[1].set_title("Plan View")

            # get the first frame of the first video
            first_video = os.path.join(FoldersPath, files[0])
            video = cv2.VideoCapture(first_video)
            ret, first_frame = video.read()
            width = video.get(cv2.CAP_PROP_FRAME_WIDTH)
            height = video.get(cv2.CAP_PROP_FRAME_HEIGHT)
            first_frame = cv2.cvtColor(first_frame, cv2.COLOR_BGR2RGB)
            last_frame = video.get(cv2.CAP_PROP_FRAME_COUNT)
            fps = video.get(cv2.CAP_PROP_FPS)  # get the fps number of the selected video

            axs[0].axis('off')
            axs[0].imshow(first_frame)
            axs[0].plot(GRPs["x"], GRPs["y"], 'co', markersize=10)
            axs[0].plot(GRPs["x"], GRPs["y"], 'ko', markersize=5)
            GRPs[['x', 'y', 'CP']].apply(lambda x: axs[0].text(*x), axis=1)
            axs[0].set_title("Camera View")

            # Select RW POINT CS
            if 'rw_punto_CS' in batch_set.keys():
                rw_punto_CS = batch_set["rw_punto_CS"]
                print("RW POINT CS: " + str(rw_punto_CS))
                print("")
            else:
                rw_punto_CS_ok=0
                while rw_punto_CS_ok == 0: #The LEFT POINT selection is in a loop until confirmation
                    print("Select on the PLAN VIEW the LEFT MARGIN point ")
                    print("")
                    rw_punto_CS = np.array(plt.ginput(n=1, timeout=0)).T

                    nodes = np.vstack((np.array(GRPs["X"]), np.array(GRPs["Y"])))
                    dist_2 = np.sum((nodes - rw_punto_CS) ** 2, axis=0)
                    id_rw_punto_CS = np.argmin(dist_2)
                    axs[1].plot(GRPs["X"][id_rw_punto_CS], GRPs["Y"][id_rw_punto_CS], 'ro', markersize=10)
                    axs[1].plot(GRPs["X"][id_rw_punto_CS], GRPs["Y"][id_rw_punto_CS], 'ko', markersize=5)
                    rw_punto_CS[0], rw_punto_CS[1] = GRPs["X"][id_rw_punto_CS], GRPs["Y"][id_rw_punto_CS]
                    axs[0].plot(GRPs["x"][id_rw_punto_CS], GRPs["y"][id_rw_punto_CS], 'ro', markersize=10)
                    axs[0].plot(GRPs["x"][id_rw_punto_CS], GRPs["y"][id_rw_punto_CS], 'ko', markersize=5)
                    plt.draw()
                    plt.pause(.01)

                    rw_punto_CS_ok_ans = input(
                        'Do you confirm the LEFT MARGIN point selection? Yes [Y] (default if blank) or No [N] (Do it again) ')
                    if (rw_punto_CS_ok_ans == '' or rw_punto_CS_ok_ans == 'Y' or rw_punto_CS_ok_ans == 'y'):
                        rw_punto_CS_ok=1
                    else:
                        axs[0].cla()
                        axs[1].cla()
                        axs[1].grid(True)
                        axs[1].set_axisbelow(True)

                        axs[1].plot(GRPs["X"], GRPs["Y"], 'co', markersize=10)
                        axs[1].plot(GRPs["X"], GRPs["Y"], 'ko', markersize=5)
                        axs[1].set_aspect('equal', adjustable='box')
                        GRPs["CP"] = GRPs["CP"].astype(str)
                        GRPs[['X', 'Y', 'CP']].apply(lambda x: axs[1].text(*x), axis=1)
                        axs[1].set_title("Plan View")
                        axs[0].axis('off')
                        axs[0].imshow(first_frame)
                        axs[0].plot(GRPs["x"], GRPs["y"], 'co', markersize=10)
                        axs[0].plot(GRPs["x"], GRPs["y"], 'ko', markersize=5)
                        GRPs[['x', 'y', 'CP']].apply(lambda x: axs[0].text(*x), axis=1)
                        axs[0].set_title("Camera View")
                        plt.draw()
                        plt.pause(.01)

                wisttf(inpt_file, "RW POINT CS", '[' + str(GRPs["X"][id_rw_punto_CS]) + ' ; ' + str(
                    GRPs["Y"][id_rw_punto_CS]) + ']')  # write parameter in setting file



            # Select RW DIRECTION CS
            if 'direction_CS' in batch_set.keys():
                direction_CS = batch_set["direction_CS"]
                print("RW DIRECTION CS: " + str(direction_CS))
                print("")
            else:
                print("Select on the Plan View the point that defines de direction of the Cross Section ")
                print("")
                rw_punto_CS_right = np.array(plt.ginput(n=1, timeout=0)).T
                dist_dir = np.sum((nodes - rw_punto_CS_right) ** 2, axis=0)
                id_punto_CS_right = np.argmin(dist_dir)

                direction_CS = np.array([(GRPs["X"][id_rw_punto_CS], GRPs["X"][id_punto_CS_right]),
                                         (GRPs["Y"][id_rw_punto_CS], GRPs["Y"][id_punto_CS_right])])

                wisttf(inpt_file, "RW DIRECTION CS",
                       '[' + str(GRPs["X"][id_rw_punto_CS]) + ' ' + str(GRPs["X"][id_punto_CS_right]) + ' ; ' + str(
                           GRPs["Y"][id_rw_punto_CS]) + ' ' + str(
                           GRPs["Y"][id_punto_CS_right]) + ']')  # write parameter in setting file

            bathymetry_posta = np.array(bathymetry.iloc[:, 0:2])

            # project the bathymetry in PIX coordinate system
            a, b = np.polyfit(direction_CS[0, :], direction_CS[1, :], 1)
            teta = math.atan(a)

            if direction_CS[0, 0] > direction_CS[0, 1] and direction_CS[1, 0] > direction_CS[1, 1]:
                rw_E = rw_punto_CS[0] - np.multiply(math.cos(teta), [bathymetry_posta[:, 0] - station_punto_CS])
                rw_N = rw_punto_CS[1] - np.multiply(math.sin(teta), [bathymetry_posta[:, 0] - station_punto_CS])
            else:
                rw_E = np.multiply(math.cos(teta), [bathymetry_posta[:, 0] - station_punto_CS]) + rw_punto_CS[0]
                rw_N = np.multiply(math.sin(teta), [bathymetry_posta[:, 0] - station_punto_CS]) + rw_punto_CS[1]

            CS = np.concatenate([rw_E, rw_N])
            axs[1].plot(rw_E.flatten(), rw_N.flatten(), color=[0.93, 0.69, 0.13], linewidth=1)

            plt.draw()
            plt.pause(.01)

            rw_CS = np.vstack((CS, bathymetry_posta[:, 1].T, np.ones((1, CS.shape[1]))))
            pix_CS_homo = np.dot(C_Matrix, rw_CS)

            pix_CS = np.vstack((pix_CS_homo[0, :] / pix_CS_homo[2, :],
                                pix_CS_homo[1, :] / pix_CS_homo[2, :],
                                np.ones((1, CS.shape[1]))))
            pix_E, pix_N = pix_CS[0, :], pix_CS[1, :]

            axs[0].plot(pix_E.flatten(), pix_N.flatten(), color=[0.93, 0.69, 0.13], linewidth=1)
            plt.draw()
            plt.pause(.01)

            # Define WIDTH ROI
            if 'length_sl' in batch_set.keys():
                length_sl = batch_set["length_sl"]
                print("WIDTH ROI: " + str(length_sl))
                print("")
            else:
                length_sl = input(
                    "[float]  Real World Width of the Region Of Interest (ROI). (5 is selected if blank)")
                print("")
                if length_sl == '':
                    length_sl = 5
                else:
                    length_sl = float(length_sl)
                wisttf(inpt_file, "WIDTH ROI", str(length_sl))  # write parameter in setting file

            pix_roi, roi = re.make_rw_ROI(CS, length_sl, bathymetry_posta[0, 1], C_Matrix)
            roi = np.vstack((roi, roi[0, :]))
            axs[1].plot(roi[:, 0], roi[:, 1], '--k', linewidth=1)
            axs[0].plot(pix_roi[0, :], pix_roi[1, :], '--k', linewidth=1)

            # Define DIST OVER CS
            if 'dist_sl' in batch_set.keys():
                dist_sl = batch_set["dist_sl"]
                print("DIST OVER CS: " + str(dist_sl))
                print("")
            else:
                dist_sl = input(
                    "[float] REAL DISTANCE between each station (The value will be adjusted, if blank REAL DISTANCE is 1) :")
                if dist_sl == '':
                    dist_sl = float(1)
                else:
                    dist_sl = float(dist_sl)

                wisttf(inpt_file, "DIST OVER CS", str(dist_sl))  # write parameter in setting file
                print("")

            # =============================================================================
            #        DEFINE PIV SETTINGS
            # =============================================================================
            # interrogationarea
            if 'interrogationarea' in batch_set.keys():
                interrogationarea = batch_set["interrogationarea"]
                print("INTERROGATION AREA: " + str(interrogationarea))
                print("")
            else:
                interrogationarea = input(
                    "[int] INTERROGATION WINDOW SIZE in pixel (if blank INTERROGATION WINDOW SIZE is 128):")
                print('')
                if interrogationarea == '':
                    interrogationarea = float(128)
                else:
                    interrogationarea = float(interrogationarea)
                wisttf(inpt_file, "INTERROGATION AREA", interrogationarea)  # write parameter in setting file

            # step
            if 'step' in batch_set.keys():
                step = batch_set["step"]
                print("STEP PIV: " + str(step))
                print("")
            else:
                step = input(
                    "[int] OVERLAP between interrogation windows in pix (if blank OVERLAP half INTERROGATION WINDOW SIZE ):")
                if step == '':
                    step = float(interrogationarea / 2)
                else:
                    step = float(step)
                wisttf(inpt_file, "STEP PIV", step)  # write parameter in setting file

            # passes
            passes = float(2)
            int2 = interrogationarea / 2
            print("Two passes will be used. The second pass will use interrogation window size of " + str(int2) + "pix")
            print("")
            int3, int4, repeat, mask_auto, do_pad, subpixfinder = 0, 0, 0, 1, 0, int(1)

            wisttf(inpt_file, "PASSES", str(2))
            wisttf(inpt_file, "INT2", int2)
            wisttf(inpt_file, "INT3", int3)
            wisttf(inpt_file, "INT4", int4)
            wisttf(inpt_file, "REPEAT", repeat)
            wisttf(inpt_file, "DISABLE AUTOCOR", mask_auto)
            wisttf(inpt_file, "DO PAD", do_pad)
            wisttf(inpt_file, "REMOVE FRAMES", rm_frames)

            rect1a = patches.Rectangle((int((width - interrogationarea) / 2), int((height - interrogationarea) / 2)),
                                       interrogationarea, interrogationarea, edgecolor='w', facecolor='none')
            rect1b = patches.Rectangle((int((width - interrogationarea) / 2), int((height - interrogationarea) / 2)),
                                       interrogationarea, interrogationarea, edgecolor='c', facecolor='none',
                                       linestyle='--')
            axs[0].add_patch(rect1a)
            axs[0].add_patch(rect1b)

            rect2a = patches.Rectangle((int((width - int2) / 2), int((height - int2) / 2)),
                                       int2, int2, edgecolor='w', facecolor='none')
            rect2b = patches.Rectangle((int((width - int2) / 2), int((height - int2) / 2)),
                                       int2, int2, edgecolor='y', facecolor='none', linestyle='--')
            axs[0].add_patch(rect2a)
            axs[0].add_patch(rect2b)

            # =============================================================================
            #         DEFINE VELOCITIES LIMIT
            # =============================================================================

            # Max value
            if 'max_V' in batch_set.keys():
                max_V = batch_set["max_V"]
                print("max_V: " + str(max_V))
                print("")
            else:
                max_V = input(
                    "[float] MAX VELOCITY value expected (streamwise component) :")
                print('')
                max_V = float(max_V)
                wisttf(inpt_file, "MAX V", max_V)  # write parameter in setting file

            # Min value
            if 'min_V' in batch_set.keys():
                min_V = batch_set["min_V"]
                print("min_V: " + str(min_V))
                print("")
            else:
                min_V = input(
                    "[float] MIN VELOCITY value expected (streamwise component):")
                print('')
                min_V = float(min_V)
                wisttf(inpt_file, "MIN V", min_V)  # write parameter in setting file
            # =============================================================================
            #         DEFINE ALPHA COEFICIENT
            # =============================================================================
            # Alpha coeficient
            if 'alpha' in batch_set.keys():
                alpha = batch_set["alpha"]
                print("ALPHA: " + str(alpha))
                print("")
            else:
                alpha = input(
                    "[float] ALPHA Coeficient or Mean Velocity / Superficial velocity ratio (if blank ALPHA is 0.85):")
                print('')
                if alpha == '':
                    alpha = float(0.85)
                else:
                    alpha = float(alpha)
                wisttf(inpt_file, "ALPHA", alpha)  # write parameter in setting file

            # =============================================================================
            #         FRAMES EXTRACTION SETTINGS
            # =============================================================================
            # first frame
            if 'T0' in batch_set.keys():
                start_number = batch_set["T0"]
                print("T0: " + str(start_number))
                print("")
            else:
                start_number = input(
                    "[float] TIME in second of the FIRST frame to extract (if empty, the first frame of the video will be used) :")
                wisttf(inpt_file, "FRAME START", start_number)  # write parameter in setting file
                print("")

            if start_number == '':
                start_frame_number = 0
            else:
                start_frame_number = int(float(start_number) * fps)

            # last frame
            if 'TEND' in batch_set.keys():
                end_number = batch_set["TEND"]
                print("TEND: " + str(end_number))
                print("")
            else:
                end_number = input(
                    "[int] TIME in second of the LAST frame to extract (if empty, the last frame of the video will be used) :")
                wisttf(inpt_file, "FRAME END", end_number)  # write parameter in setting file
                print("")
                duration = float(end_number) - float(start_number)
                wisttf(inpt_file, "DURATION", duration)

            if end_number == '':
                end_frame_number = last_frame
            else:
                end_frame_number = int(float(end_number) * fps)

            # frame to skip
            if 'step_value' in batch_set.keys():
                step_value = batch_set["step_value"]
                print("FRAME STEP: " + str(step_value))
                print("")
            else:
                step_value = input(
                    "[int] FRAME STEP (if empty, frame step is 1, this means all the frames available will be extracted) :")
                print('')
                if step_value == '':
                    step_value = 1
                else:
                    step_value = int(step_value)
                wisttf(inpt_file, "FRAME STEP", step_value)  # write parameter in setting file
                print("")
            frame_skip_index = step_value
            print('The setting file has been saved in ' + inpt_file)
            print('')

            # ready to process ?
            ready = 0
            while ready == 0:
                ready_process = input(
                    "Are you ready to process? Yes [Y] (default if blank) or No [N] (I want to review the input file) ")
                print("")
                if not (ready_process == '' or ready_process == 'Y' or ready_process == 'y'):
                    os.system('start NOTEPAD.EXE  "' + inpt_file + '"')
                else: #All the parameters are reloaded from settings file
                    batch_set = rvr_retreive_settings(inpt_file)
                    name_station = batch_set["name_station"]
                    file_fold = open(batch_set['path_list_folders'], "r")
                    FoldersPath = file_fold.readlines()[0]
                    path_stages = batch_set["path_stages"]
                    path_bathymetry = batch_set["path_bathymetry"]
                    PathGRPS = batch_set["PathGRPS"]
                    imcoor_sys = batch_set["imcoor_sys"]
                    station_punto_CS = batch_set["station_punto_CS"]
                    rw_punto_CS = batch_set["rw_punto_CS"]
                    direction_CS = batch_set["direction_CS"]
                    length_sl = batch_set["length_sl"]
                    start_number = batch_set["T0"]
                    start_frame_number = int(float(start_number) * fps)
                    end_number = batch_set["TEND"]
                    end_frame_number = int(float(end_number) * fps)
                    step_value = batch_set["step_value"]
                    dist_sl = batch_set["dist_sl"]
                    direction_CS = batch_set["direction_CS"]
                    interrogationarea = batch_set["interrogationarea"]
                    step = batch_set["step"]
                    max_V = batch_set["max_V"]
                    min_V = batch_set["min_V"]
                    alpha = batch_set["alpha"]

                    ready = 1

            disp_vectors = input(
                "Would you like to see the instantaneous displacement fields? Yes [Y] (slower) or No [N] (default if blank) ")
            print("")
            # =============================================================================
            #         BEGIN THE FILES LOOP
            # =============================================================================

            for i in range(len(diff_list)):
                name = os.path.basename(diff_list[i])  # %separate the file name from extension
                k = csv_stage.values == name
                try:
                    Index_stage = int(np.array([i for i, x in enumerate(k[:, 0]) if x]))
                except TypeError:
                    print('No stage has been found')

                # =============================================================================
                #         GET VIDEO NAME
                # =============================================================================
                videoname = os.path.join(FoldersPath, name)
                head_tail = os.path.split(videoname)
                pathstr = head_tail[0]
                filename, file_extension = os.path.splitext(head_tail[1])

                # =============================================================================
                #         get the current stage
                # =============================================================================

                current_stage = csv_stage.values[Index_stage, 1]

                # =============================================================================
                #         create a new directory
                # =============================================================================
                try:
                    new_folder = os.path.join(pathstr, filename)
                    os.mkdir(new_folder)
                except OSError:
                    print('The folder ' + filename + ' already exists')

                # =============================================================================
                #         get info from of video
                # =============================================================================
                cap = cv2.VideoCapture(videoname)
                fps = cap.get(cv2.CAP_PROP_FPS)
                last_frame = cap.get(cv2.CAP_PROP_FRAME_COUNT)
                total_duration = last_frame / fps

                # =============================================================================
                #         extract frames
                # =============================================================================
                video_to_frames(videoname, new_folder, start_frame_number, end_frame_number, frame_skip_index)
                # video_to_frames_2(videoname, new_folder, False, start_frame_number, end_frame_number, frame_skip_index,
                #                   100)
                print('')
                # =============================================================================
                #         calculate the bathymetry
                # =============================================================================
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
                round_vec = lambda i: re.rvr_round(i)
                vectorized_round_vec = np.vectorize(round_vec)
                # filter negative depth
                bathymetry_posta = bathymetry[
                                   vectorized_round_vec((current_stage - bathymetry[:, 1]) * 1000) / 1000 >= 0,
                                   :]  # in case there is still a value very close to 0

                # =============================================================================
                #         project the bathymetry in RW coordinate system
                # =============================================================================

                a, b = np.polyfit(direction_CS[0, :], direction_CS[1, :], 1)
                teta = math.atan(a)

                if direction_CS[0, 0] > direction_CS[0, 1] and direction_CS[1, 0] > direction_CS[1, 1]:
                    rw_E = rw_punto_CS[0] - np.multiply(math.cos(teta), [bathymetry_posta[:, 0] - station_punto_CS])
                    rw_N = rw_punto_CS[1] - np.multiply(math.sin(teta), [bathymetry_posta[:, 0] - station_punto_CS])
                else:
                    rw_E = np.multiply(math.cos(teta), [bathymetry_posta[:, 0] - station_punto_CS]) + rw_punto_CS[0]
                    rw_N = np.multiply(math.sin(teta), [bathymetry_posta[:, 0] - station_punto_CS]) + rw_punto_CS[1]

                CS = np.concatenate([rw_E, rw_N])
                rw_N = rw_N.flatten()
                rw_E = rw_E.flatten()

                # =============================================================================
                #         creates rw_ROI in function of CS and lengths SL
                # =============================================================================

                a, b = np.polyfit(CS[0, :], CS[1, :], 1)
                ang = math.atan(a)  # rotation angle
                # ang_deg=math.degrees(ang)
                c, s = np.cos(-ang), np.sin(-ang)
                rot_mat = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
                shift_ends_a = np.dot(np.array([0, -length_sl / 2, 1]),
                                      rot_mat)  # calculate the shift to the ends upstream
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
                path_images = glob.glob(os.path.join(new_folder, "*.jpg"))
                path_images = sorted(path_images)
                img = cv2.imread(path_images[0])
                # =============================================================================
                #         Make a bounding box for PIV
                # =============================================================================
                xmin = np.min(pix_roi[0, :])
                ymin = np.min(pix_roi[1, :])
                w = np.max(pix_roi[0, :]) - np.min(pix_roi[0, :])
                h = np.max(pix_roi[1, :]) - np.min(pix_roi[1, :])
                roirect = np.array([xmin, ymin, w, h])

                # =============================================================================
                #         Build mask
                # =============================================================================
                mask = re.make_mask(pix_roi, img.shape)

                # =============================================================================
                #         Calculate Homography H
                # =============================================================================
                H, status = cv2.findHomography(np.transpose(rw_roi[[0, 1, 3], 0:4]), np.transpose(pix_roi[:, 0: 4]))
                # print(H)
                # =============================================================================
                #         Generates evenly spaced point on CS in RW
                # =============================================================================

                cs_extrem = np.transpose(np.array([rw_E[[0, -1]], rw_N[[0, -1]]]))
                full_dist = np.sqrt(sum(np.square(cs_extrem[1, :] - cs_extrem[0, :])))
                num_sl = np.ceil(full_dist / dist_sl)
                real_dist_step = full_dist / (num_sl - 1)
                length_real = full_dist

                # =============================================================================
                #         PROJECT CS ON IMAGE IN PIX
                # =============================================================================
                CS = np.vstack((CS, np.ones((1, CS.shape[1]))))
                pix_CS_homo = np.dot(H, CS)

                pix_CS = np.vstack((pix_CS_homo[0, :] / pix_CS_homo[2, :],
                                    pix_CS_homo[1, :] / pix_CS_homo[2, :],
                                    np.ones((1, CS.shape[1]))))
                pix_E, pix_N = pix_CS[0, :], pix_CS[1, :]

                # =============================================================================
                #         PLOT BACKGROUND IMAGE
                # =============================================================================
                # fig_res, axs = plt.subplots(1, 2, figsize=(15, 15))
                fig_res, axs = plt.subplots(1, 2)
                # ax = fig_map.gca()
                plt.gcf().canvas.set_window_title('RIVeR - Python - Results')
                matplotlib.use("Qt5Agg")
                win = plt.gcf().canvas.manager.window
                try:
                    win = fig_map.canvas.manager.window
                except AttributeError:
                    win = fig_map.canvas.window()
                toolbar = win.findChild(QtWidgets.QToolBar)
                toolbar.setVisible(False)

                axs[0].grid(False)
                axs[0].set_axisbelow(False)

                im_in = cv2.cvtColor(cv2.imread(path_images[0]), cv2.COLOR_BGR2RGB)
                axs[0].imshow(im_in)
                axs[0].axis('off')
                axs[0].plot(pix_roi[0, :], pix_roi[1, :], '--k', linewidth=1)
                axs[0].plot(pix_E, pix_N, color=[0.93, 0.69, 0.13], linewidth=1)
                axs[0].plot(pix_E[0], pix_N[0], 'ro', markersize=10)
                axs[0].plot(pix_E[0], pix_N[0], 'ko', markersize=5)
                axs[0].plot(pix_E[-1], pix_N[-1], 'go', markersize=10)
                axs[0].plot(pix_E[-1], pix_N[-1], 'ko', markersize=5)

                # =============================================================================
                #         BEGIN THE PIV LOOP
                # =============================================================================

                subpixfinder = int(1)

                # roirect[0] = roirect[0] - 1
                # roirect[1] = roirect[1] - 1

                roi_inpt = roirect
                mask_inpt = mask

                dict_cumul = {'u': 0, 'v': 0}

                print('PIV processing of ' + head_tail[1])

                for fr in tqdm(range(0, len(path_images) - 1)):
                    # print(fr)
                    # transform to grayscale
                    # t = time.time()
                    image1 = np.array(Image.open(path_images[fr]).convert('LA'))[:, :, 0]
                    image2 = np.array(Image.open(path_images[fr + 1]).convert('LA'))[:, :, 0]  #
                    # image1 = cv2.imread(path_images[fr])[:, :, 0]
                    # image2 = cv2.imread(path_images[fr + 1])[:, :, 0]
                    # elapsed = time.time() - t
                    # print(elapsed)

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
                    xtable, ytable, utable, vtable = piv_fftmulti(image1, image2, interrogationarea, step,
                                                                  subpixfinder,
                                                                  mask_inpt,
                                                                  roi_inpt, passes, int2, int3, int4, repeat,
                                                                  mask_auto, do_pad)

                    # plot instantaneous displacement field
                    if disp_vectors == 'Y' or disp_vectors == 'y':
                        # plot the new vector
                        try:
                            arrows.remove()
                            inst_im.remove()
                        except NameError:
                            print('')

                        inst_im = axs[0].imshow(Image.open(path_images[fr]).convert('LA'))
                        plt.draw()
                        plt.pause(.01)

                        arrows = axs[0].quiver(xtable + roirect[0], ytable + roirect[1], utable, vtable, color='g')
                        plt.draw()
                        plt.pause(.01)

                    if fr == 0:
                        dict_cumul['u'] = utable.reshape(-1, 1)
                        dict_cumul['v'] = vtable.reshape(-1, 1)
                    else:
                        dict_cumul['u'] = np.hstack((dict_cumul['u'], utable.reshape(-1, 1)))
                        dict_cumul['v'] = np.hstack((dict_cumul['v'], vtable.reshape(-1, 1)))
                print('')

                # calculate median velocity field
                U = np.nanmedian(dict_cumul['u'], 1).reshape(xtable.shape[0], xtable.shape[1])
                V = np.nanmedian(dict_cumul['v'], 1).reshape(xtable.shape[0], xtable.shape[1])
                X = xtable + roirect[0]
                Y = ytable + roirect[1]

                # =============================================================================
                #         PLOT RESULTS ON IMAGES
                # =============================================================================
                # fig_res, axs = plt.subplots(1, 2, figsize=(15, 15))
                # # ax = fig_map.gca()
                # plt.gcf().canvas.set_window_title('RIVeR - Python - Results')
                # matplotlib.use("Qt5Agg")
                # win = plt.gcf().canvas.manager.window
                # try:
                #     win = fig_map.canvas.manager.window
                # except AttributeError:
                #     win = fig_map.canvas.window()
                # toolbar = win.findChild(QtWidgets.QToolBar)
                # toolbar.setVisible(False)
                #
                # axs[0].grid(False)
                # axs[0].set_axisbelow(False)

                # plot the new vector
                if disp_vectors == 'Y' or disp_vectors == 'y':
                    try:
                        arrows.remove()
                        inst_im.remove()
                        del arrows, inst_im
                    except ValueError:
                        print('')

                # im_in = cv2.cvtColor(cv2.imread(path_images[fr]), cv2.COLOR_BGR2RGB)
                # axs[0].imshow(im_in)
                # axs[0].axis('off')
                # axs[0].plot(pix_roi[0, :], pix_roi[1, :], '--k', linewidth=1)
                # axs[0].plot(pix_E, pix_N, color = [0.93, 0.69, 0.13], linewidth = 1)
                # axs[0].plot(pix_E[0], pix_N[0], 'ro', markersize=10)
                # axs[0].plot(pix_E[0], pix_N[0], 'ko', markersize=5)
                # axs[0].plot(pix_E[-1], pix_N[-1], 'go', markersize=10)
                # axs[0].plot(pix_E[-1], pix_N[-1], 'ko', markersize=5)

                im_out, size_pix, shift_rw_x, shift_rw_y, BBox = rvr_rec_res.rvr_rec_im(im_in, pix_roi, rw_roi)
                axs[1].imshow(im_out, zorder=0, extent=BBox, aspect='equal')
                axs[1].plot(rw_roi[0, :], rw_roi[1, :], '--k', linewidth=1)
                plt.xlim([min(rw_roi[0, :]), max(rw_roi[0, :])])
                plt.ylim([min(rw_roi[1, :]), max(rw_roi[1, :])])
                axs[1].grid(False)

                axs[1].plot(rw_E, rw_N, color=[0.93, 0.69, 0.13], linewidth=1)
                axs[1].plot(rw_E[0], rw_N[0], 'ro', markersize=10)
                axs[1].plot(rw_E[0], rw_N[0], 'ko', markersize=5)
                axs[1].plot(rw_E[-1], rw_N[-1], 'go', markersize=10)
                axs[1].plot(rw_E[-1], rw_N[-1], 'ko', markersize=5)

                # =============================================================================
                #         rectifies the results and get RW
                # =============================================================================
                res = np.array([40, 40])
                st = fps * step_value / 1000
                rw_roi = np.delete(rw_roi, (2, 3), axis=0)  # delete third and fourth row
                rect_res = rvr_rec_res.rvr_rec_res(X, Y, U, V, H, rw_roi, st, res)
                # plt.quiver(rect_res['X_rec'], rect_res['Y_rec'], rect_res['U_rec'], rect_res['V_rec'], color='g', units='width')

                # =============================================================================
                #         calculate the components over the cross section
                # =============================================================================
                XL, XR, YL, YR = rw_E[0], rw_E[-1], rw_N[0], rw_N[-1]
                east = [XL, XR]
                north = [YL, YR]
                East, North, VE = re.improfile(rect_res["X_rec"], rect_res["Y_rec"], rect_res["U_rec"], east, north,
                                               num_sl)
                East, North, VN = re.improfile(rect_res["X_rec"], rect_res["Y_rec"], rect_res["V_rec"], east, north,
                                               num_sl)

                # =============================================================================
                #         calculate Streamwise (S) and Crosswise (C) component of the Cross section
                # =============================================================================
                Leftmargin = np.array([East[0], North[0]])
                Rightmargin = np.array([East[-1], North[-1]])
                S, C, tetarad = re.rvr_vel_components(Leftmargin, Rightmargin, VE, VN)

                # print(S)
                # =============================================================================
                #         filter the velocities
                # =============================================================================
                with np.errstate(invalid='ignore'):
                    if len(S[S < min_V]) > 0:
                        S[S < min_V] = np.NaN
                    if len(S[S > max_V]) > 0:
                        S[S > max_V] = np.NaN

                id_interp = np.argwhere(np.isnan(S))[:, 0].flatten()

                S[[0, -1], 0] = 0
                S = S.flatten()
                S_backup = np.copy(S)
                # =============================================================================
                #         Get depth
                # =============================================================================
                x = np.arange(start=0, stop=length_real, step=real_dist_step)  # station velocity
                if len(S) > len(x):
                    x = np.append(x, length_real)

                station = bathymetry_posta[:, 0]  # station bathymetry
                station = station - station[0]  # station bathymetry starts from 0
                stage = bathymetry_posta[:, 1]  # bathymerty
                # print(station)
                # print(stage)
                # print(x)
                newstage = interp1d(station, stage, fill_value="extrapolate")(x)
                depth = current_stage - newstage
                depth[depth < 0] = 0  # just to make sure

                # =============================================================================
                #         interpolates gaps with Froude Number and plot on RW figure
                # =============================================================================
                S = re.rvr_inter_vel(depth, S)
                V = np.mean(S)

                VE_new, VN_new = re.rvr_inv_vel_components(S, S * 0, tetarad)

                vel_meas = axs[1].quiver(East, North, VE_new, VN_new, color=[0, 0.45, 0.74], scale=1,
                                         units='dots', scale_units='inches', headwidth=3, width=2)
                vel_interp = axs[1].quiver(East[id_interp], North[id_interp], VE_new[id_interp],
                                           VN_new[id_interp],
                                           color=[0.76, 0.22, 0.21], scale=1,
                                           units='dots', scale_units='inches', headwidth=3, width=2)
                legend_im = plt.legend([vel_meas, vel_interp], ['Measured Velocity', 'Interpolated Velocity'])

                # plt.imshow(first_frame)
                # Save the figure

                # =============================================================================
                #         PROJECT VELOCITY ON IMAGE IN PIX
                # =============================================================================
                rw_E_ori = East.flatten()
                rw_N_ori = North.flatten()
                rw_CS_ori = np.vstack((rw_E_ori, rw_N_ori))
                rw_CS_ori = np.vstack((rw_CS_ori, np.ones((1, len(rw_E_ori)))))
                pix_CS_ori_homo = np.dot(H, rw_CS_ori)
                pix_CS_ori = np.vstack((pix_CS_ori_homo[0, :] / pix_CS_ori_homo[2, :],
                                        pix_CS_ori_homo[1, :] / pix_CS_ori_homo[2, :],
                                        np.ones((1, len(rw_E_ori)))))

                rw_E_end = rw_E_ori + VE_new
                rw_N_end = rw_N_ori + VN_new

                rw_CS_end = np.vstack((rw_E_end, rw_N_end))
                rw_CS_end = np.vstack((rw_CS_end, np.ones((1, len(rw_E_end)))))
                pix_CS_end_homo = np.dot(H, rw_CS_end)
                pix_CS_end = np.vstack((pix_CS_end_homo[0, :] / pix_CS_end_homo[2, :],
                                        pix_CS_end_homo[1, :] / pix_CS_end_homo[2, :],
                                        np.ones((1, len(rw_E_end)))))

                pix_E_ori, pix_N_ori = pix_CS_ori[0, :].flatten(), pix_CS_ori[1, :].flatten()
                pix_E_end, pix_N_end = pix_CS_end[0, :].flatten(), pix_CS_end[1, :].flatten()
                pix_VE_new = pix_E_end - pix_E_ori
                pix_VN_new = pix_N_end - pix_N_ori

                vel_meas = axs[0].quiver(pix_E_ori, pix_N_ori, pix_VE_new, pix_VN_new, color=[0, 0.45, 0.74], scale=1,
                                         units='dots', scale_units='dots', angles='xy', headwidth=3, width=2)

                vel_interp = axs[0].quiver(pix_E_ori[id_interp], pix_N_ori[id_interp], pix_VE_new[id_interp],
                                           pix_VN_new[id_interp],
                                           color=[0.76, 0.22, 0.21], scale=1, units='dots', scale_units='dots',
                                           angles='xy', headwidth=3, width=2)
                legend_im = plt.legend([vel_meas, vel_interp], ['Measured Velocity', 'Interpolated Velocity'])

                # Save the figure
                fig_res.savefig(os.path.join(new_folder + '_cross_section.png'), format='png', dpi=300,
                                bbox_inches='tight',
                                pad_inches=0)

                plt.close(fig_res)

                # =============================================================================
                #         Calculate Discharge
                # =============================================================================
                w, a, q = re.rvr_calculate_q(x, S, depth)
                Q = alpha * np.nansum(q)
                Q_interp = alpha * np.nansum(q[id_interp])
                Q_ratio = 100 * Q_interp / Q
                print('Total discharge Q=' + str(re.rvr_round(Q * 100) / 100) + ' for Level=' + str(
                    re.rvr_round(current_stage * 100) / 100) + ' with alpha=' + str(alpha))
                print('Interpolated discharge is ' + str(re.rvr_round(Q_ratio * 100) / 100) + '% of Total discharge')
                print('')
                id_Q_interp = np.zeros(len(x))  # this is for the final report
                id_Q_interp[id_interp] = 1

                # =============================================================================
                #         PLOT RESULTS
                # =============================================================================
                # fig_results, axs = plt.subplots(3, figsize=(15, 15))
                fig_results, axs = plt.subplots(3)
                plt.gcf().canvas.set_window_title('RIVeR - Python - Results')
                matplotlib.use("Qt5Agg")
                win = plt.gcf().canvas.manager.window
                try:
                    win = fig_results.canvas.manager.window
                except AttributeError:
                    win = fig_results.canvas.window()
                toolbar = win.findChild(QtWidgets.QToolBar)
                toolbar.setVisible(False)

                # Bathymetry plot
                axs[0].grid(True)
                axs[0].set_axisbelow(True)
                axs[0].plot(station, stage, color='k', linewidth=1, markersize=2, marker='o', markerfacecolor='k')
                axs[0].fill_between(station, stage, current_stage, color=[0.68, 0.92, 1])
                axs[0].plot(station, current_stage * np.ones(len(station)), linewidth=2, color=[0, 0.45, 0.74])
                axs[0].legend(["Bathymetry", "WS"], loc="lower left")
                axs[0].set_ylabel('Stage')

                # Velocity plot
                axs[1].grid(True)
                axs[1].set_axisbelow(True)
                axs[1].plot(x, S, color=[0, 0.45, 0.74], linestyle='-.', linewidth=1, markersize=2, marker='o',
                            markerfacecolor=[0.76, 0.22, 0.21], markeredgecolor=[0.76, 0.22, 0.21])
                axs[1].plot(x, S_backup, color=[0, 0.45, 0.74], linewidth=1, markersize=2, marker='o',
                            markerfacecolor=[0, 0.45, 0.74], markeredgecolor=[0, 0.45, 0.74])
                axs[1].legend(["Interpolated", "Measured"], loc="upper right")
                axs[1].set_ylabel('Velocity')

                # Discharge plot
                axs[2].grid(True)
                axs[2].set_axisbelow(True)
                q_portion = (q * alpha) / Q
                mask1 = q_portion <= 0.05
                mask2 = q_portion <= 0.1
                axs[2].bar(x, q, color=[0.76, 0.22, 0.21])
                axs[2].bar(x[mask2], q[mask2], color=[0.93, 0.69, 0.13])
                axs[2].bar(x[mask1], q[mask1], color=[0.29, 0.57, 0.23])
                axs[2].set_ylabel('Discharge')
                axs[2].set_xlabel('Station')
                axs[2].legend([">10%", "<=10%", "<=5%"], loc="upper left")

                # Cumulative discharge
                cumsum_q = np.cumsum(q_portion) * 100
                ax_cumul = axs[2].twinx()
                ax_cumul.plot(x, cumsum_q, color='k', linewidth=1, linestyle='--', markersize=2, marker='o',
                              markerfacecolor='k')
                ax_cumul.set_ylim([0, 100])
                ax_cumul.set_ylabel('Cumulative in %')

                # Save the figure
                fig_results.savefig(os.path.join(new_folder + '_summary.png'), format='png', dpi=300)
                print('Results are saved in ' + os.path.join(new_folder))
                plt.close(fig_results)

                # =============================================================================
                #         Write results in summary file
                # =============================================================================
                summary = (name + ' ' + str(re.rvr_round(Q * 100) / 100) + ' ' +
                           str(re.rvr_round(current_stage * 100) / 100) + ' ' +
                           str(re.rvr_round(V * 100) / 100) + ' ' +
                           str(re.rvr_round(np.sum(a) * 100) / 100) + ' ' +
                           str(alpha))

                # if the summary file doesn't exist, create one
                fe = os.path.join(FoldersPath, 'py_' + name_station + '_summary.txt')
                try:
                    fid = open(fe, 'r')
                    # Do something with the file
                except IOError:
                    header = "Filename TotalDischarge Level MeanVelocity Area Alpha"
                    with open(fe, 'a') as fid:
                        fid.write(header + "\n")
                finally:
                    fid.close()

                with open(fe, 'a') as fid:
                    fid.write(summary + "\n")

                # =============================================================================
                #         WRITE COMPLETE REPORT
                # =============================================================================
                now = datetime.datetime.now()
                report_file = os.path.join(FoldersPath, name_station + '_report.csv')
                with open(report_file, 'a', newline='') as file_wrapper:
                    writer = csv.writer(file_wrapper)
                wisttf(report_file, now.strftime("%Y-%m-%d %H:%M:%S"), "")
                wisttf(report_file, "Summary report, RIVeR - Python", "")
                wisttf(report_file, "VIDEO NAME", name)
                wisttf(report_file, "STAGE", current_stage)
                wisttf(report_file, "ALPHA", alpha)
                wisttf(report_file, "DISCHARGE", Q)
                wisttf(report_file, "", "")

                with open(report_file, 'a+', newline='') as  file_wrapper:
                    writer = csv.writer(file_wrapper)
                    writer.writerow(['STATION', 'VELOCITY', 'DEPTH', 'WIDTH', 'AREA', 'DISCHARGE', 'INTERPOLATED'])
                    for i in range(len(x)): writer.writerow([x[i], S[i], depth[i], w[i], a[i], q[i], id_Q_interp[i]])
                wisttf(report_file, "", "")
                print('')
                # print('END OF PROCESSING')


                # =============================================================================
                #         ADD FILE TO PROCESSED VIDEOS
                # =============================================================================
                with open(fn, 'a') as fid:
                    fid.write(name + "\n")

                # =============================================================================
                #         REMOVE FOLDER IF ASKED
                # =============================================================================
                if rm_frames == 1:
                    try:
                        shutil.rmtree(os.path.join(new_folder))
                    except PermissionError:
                        print('The process cannot access the file because it is being used by another process')

            plt.close(fig_map)

        print('')
        print('END OF BATCH PROCESSING')


def draw_ia(ax1, width, height, interrogationarea, int2):
    rect1a = patches.Rectangle((int((width - interrogationarea) / 2), int((height - interrogationarea) / 2)),
                               interrogationarea, interrogationarea, edgecolor='w', facecolor='none')
    rect1b = patches.Rectangle((int((width - interrogationarea) / 2), int((height - interrogationarea) / 2)),
                               interrogationarea, interrogationarea, edgecolor='c', facecolor='none',
                               linestyle='--')
    ax1.add_patch(rect1a)
    ax1.add_patch(rect1b)

    rect2a = patches.Rectangle((int((width - int2) / 2), int((height - int2) / 2)),
                               int2, int2, edgecolor='w', facecolor='none')
    rect2b = patches.Rectangle((int((width - int2) / 2), int((height - int2) / 2)),
                               int2, int2, edgecolor='y', facecolor='none', linestyle='--')
    ax1.add_patch(rect2a)
    ax1.add_patch(rect2b)


def draw_roi(first_frame, pix_size, direction_CS,length_sl):
    m = np.array([[0, first_frame.shape[1] - 1, first_frame.shape[1] - 1, 0],
                  [first_frame.shape[0] - 1, first_frame.shape[0] - 1, 0, 0]])
    m = np.vstack((m, np.ones((1, 4))))

    M = pix_size * np.array([[0, first_frame.shape[1] - 1, first_frame.shape[1] - 1, 0],
                             [0, 0, first_frame.shape[0] - 1, first_frame.shape[0] - 1]])
    M = np.vstack((M, np.ones((1, 4))))

    H, status = cv2.findHomography(np.transpose(M), np.transpose(m))

    XL, XR, YL, YR = direction_CS[0, 0], direction_CS[0, 1], direction_CS[1, 0], direction_CS[1, 1]
    length_real = np.sqrt(np.square(YL - YR) + np.square(XL - XR))

    coor = np.dot(H, np.array([XR, YR, 1]).reshape(3, 1))
    cool = np.dot(H, np.array([XL, YL, 1]).reshape(3, 1))
    xr, yr = coor[0, 0], coor[1, 0]
    xl, yl = cool[0, 0], cool[1, 0]

    plt.plot(xl, yl, 'ro', markersize=10)
    plt.plot(xl, yl, 'ko', markersize=5)
    plt.plot(xr, yr, 'go', markersize=10)
    plt.plot(xr, yr, 'ko', markersize=5)
    plt.plot([xr, xl], [yr, yl], color=[0.93, 0.69, 0.13])
    plt.draw()
    plt.pause(.01)

    # Calculates the angle of the CS in real world
    a, b = np.polyfit((XL, XR), (YL, YR), 1)
    ang = math.atan(a)  # rotation angle
    # ang_deg=math.degrees(ang)
    c, s = np.cos(-ang), np.sin(-ang)
    rot_mat = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
    shift_ends_a = np.dot(np.array([0, -length_sl / 2, 1]), rot_mat)  # calculate the shift to the ends upstream
    shift_ends_b = np.dot(np.array([0, length_sl / 2, 1]),
                          rot_mat)  # calculate the shift to the ends downstream

    rw_roi = np.array([[XL + shift_ends_a[0], YL + shift_ends_a[1]],
                       [XL + shift_ends_b[0], YL + shift_ends_b[1]],
                       [XR + shift_ends_b[0], YR + shift_ends_b[1]],
                       [XR + shift_ends_a[0], YR + shift_ends_a[1]]])

    rw_roi = np.vstack((rw_roi.T, np.ones((1, 4))))

    im_shape = first_frame.shape
    pix_roi = np.dot(H, rw_roi)
    pix_roi = np.hstack((pix_roi, pix_roi[:, 0].reshape((-1, 1))))  # close the roi

    # Make sure that the roi is still inside the image
    pix_roi[0, :] = np.where(pix_roi[0, :] < 0, 0, pix_roi[0, :])
    pix_roi[0, :] = np.where(pix_roi[0, :] > im_shape[1], im_shape[1], pix_roi[0, :])
    pix_roi[1, :] = np.where(pix_roi[1, :] < 0, 0, pix_roi[1, :])
    pix_roi[1, :] = np.where(pix_roi[1, :] > im_shape[0], im_shape[0], pix_roi[1, :])

    plt.plot(pix_roi[0, :], pix_roi[1, :], color='w')
    plt.plot(pix_roi[0, :], pix_roi[1, :], color='k', linestyle='--')


if __name__ == '__main__':
    main(sys.argv[1:])
