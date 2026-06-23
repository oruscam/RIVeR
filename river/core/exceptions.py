"""
File Name:   exceptions.py
Project:     RIVeR - Rectification of Image Velocity Results
Description: Custom exception classes for RIVeR core errors.
Authors:     Antoine Patalano <antoine.patalano@unc.edu.ar>
Institution: ORUS / UNC
License:     AGPL-3.0-or-later
"""
class RiverCoreException(Exception):
	pass


class VideoHasNoFrames(RiverCoreException):
	pass


class ObjectiveFunctionError(RiverCoreException):
	pass


class OptimalCameraMatrixError(RiverCoreException):
	pass


class NotSupportedFormatError(RiverCoreException):
	pass


class ImageReadError(RiverCoreException):
	pass
