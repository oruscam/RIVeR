import json
from io import TextIOWrapper
from typing import Optional

import click
import numpy as np

import river.core.coordinate_transform as ct
from river.cli.commands.exceptions import WrongSizeTransformationMatrix
from river.cli.commands.utils import render_response

UAV_TYPE = "uav"

MATRIX_SIZE_MAP = {UAV_TYPE: 9}
WRONG_SIZE_TRANSFORMATION_MATRIX_MESSAGE = (
	"Wrong size of the transformation matrix. The expected size for the '{}' type is {}."
)


@click.command(help="Compute the transformation matrix from pixel to real-world coordinates from 2 points")
@click.argument("pix-coordinates", nargs=4, type=click.FLOAT)
@click.argument("rw-coordinates", nargs=4, type=click.FLOAT)
@click.option("-ps", "--pixel-size", type=click.FLOAT, default=None, help="Size of the pixel, optional.")
@render_response
def get_uav_transformation_matrix(
	pix_coordinates: tuple, rw_coordinates: tuple, pixel_size: Optional[float] = None
) -> dict:
	"""Compute the transformation matrix from pixel to real-world coordinates from 2 points.

	Args:
		pix_coordinates (tuple): x1 y1 x2 y2 pixel values.
		rw_coordinates (tuple): x1 y1 x2 y2 real world values.
		pixel_size (Optional[float], optional): Size of the pixel.. Defaults to None.

	Returns:
		dict: Containing the UAV matrix.
	"""
	matrix = ct.get_uav_transformation_matrix(*pix_coordinates, *rw_coordinates, pixel_size=pixel_size)
	return {"uav_matrix": matrix.tolist()}


@click.command(help="Compute the homography transformation matrix based on pixel coordinates and real-world distances.")
@click.argument("pix-coordinates", nargs=8, type=click.FLOAT)
@click.argument("rw-distances", nargs=6, type=click.FLOAT)
@render_response
def get_oblique_transformation_matrix(pix_coordinates: tuple, rw_distances: tuple) -> dict:
	"""Compute the homography transformation matrix based on pixel coordinates and real-world distances..

	Args:
		pix_coordinates (tuple): x1 y1 x2 y2 x3 y3 x4 y4 pixel coordinates values for four points.
		rw_distances (tuple): d12 d23 d34 d41 d13 d24 real-world distances between corresponding points.

	Returns:
		dict: Containing the oblique matrix.
	"""
	matrix = ct.oblique_view_transformation_matrix(*pix_coordinates, *rw_distances)
	return {"oblique_matrix": matrix.tolist()}


@click.command(help="Transform pixel coordinates to real-world coordinates.")
@click.argument("x-pix", type=click.FLOAT)
@click.argument("y-pix", type=click.FLOAT)
@click.argument("transformation-matrix", envvar="TRANSFORMATION_MATRIX", type=click.File())
@click.option("-t", "--matrix-type", default=UAV_TYPE, type=click.Choice([UAV_TYPE]))
@render_response
def transform_pixel_to_real_world(
	x_pix: float, y_pix: float, transformation_matrix: TextIOWrapper, matrix_type: str
) -> dict:
	"""Transform pixel coordinates to real-world coordinates.

	Args:
		x_pix (float): X coordinate to transform.
		y_pix (float): Y coordinate to transform.
		transformation_matrix (TextIOWrapper): File stream to read the transformation matrix.
		matrix_type (str): Indicates the type of matrix (UAV, etc).

	Returns:
		dict: Containing the real world coordinates.
	"""
	transformation_matrix = np.array(json.loads(transformation_matrix.read()))

	if transformation_matrix.size != MATRIX_SIZE_MAP[matrix_type]:
		raise WrongSizeTransformationMatrix(
			WRONG_SIZE_TRANSFORMATION_MATRIX_MESSAGE.format(matrix_type, MATRIX_SIZE_MAP[matrix_type])
		)

	return {"rw_coordinates": ct.transform_pixel_to_real_world(x_pix, y_pix, transformation_matrix).tolist()}


@click.command(help="Transform real-world coordinates to pixel coordinates.")
@click.argument("x-pix", type=click.FLOAT)
@click.argument("y-pix", type=click.FLOAT)
@click.argument("transformation-matrix", envvar="TRANSFORMATION_MATRIX", type=click.File())
@click.option("-t", "--matrix-type", default=UAV_TYPE, type=click.Choice([UAV_TYPE]))
@render_response
def transform_real_world_to_pixel(
	x_pix: float, y_pix: float, transformation_matrix: TextIOWrapper, matrix_type: str
) -> dict:
	"""Transform real-world coordinates to pixel coordinates.

	Args:
		x_pix (float): X coordinate to transform.
		y_pix (float): Y coordinate to transform.
		transformation_matrix (TextIOWrapper): File stream to read the transformation matrix.
		matrix_type (str): Indicates the type of matrix (UAV, etc).

	Returns:
		dict: Containing the real world coordinates.
	"""
	transformation_matrix = np.array(json.loads(transformation_matrix.read()))

	if transformation_matrix.size != MATRIX_SIZE_MAP[matrix_type]:
		raise WrongSizeTransformationMatrix(
			WRONG_SIZE_TRANSFORMATION_MATRIX_MESSAGE.format(matrix_type, MATRIX_SIZE_MAP[matrix_type])
		)

	return {"pix_coordinates": ct.transform_real_world_to_pixel(x_pix, y_pix, transformation_matrix).tolist()}
