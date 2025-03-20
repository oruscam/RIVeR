import json
from io import TextIOWrapper
from pathlib import Path
from typing import Optional

import click
import numpy as np
from PIL import Image

import river.core.coordinate_transform as ct
from river.cli.commands.exceptions import MissingWorkdir, WrongSizeTransformationMatrix
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
@click.option("--image-path", default=None, type=click.Path(exists=True), envvar="IMAGE_PATH")
@click.option("--roi-padding", default=0.0, type=click.FLOAT)
@click.option("--max-dimension", default=500, type=click.INT)
@click.option("--min-resolution", default=0.01, type=click.FLOAT)
@click.option("--flip-x/--no-flip-x", default=False)
@click.option("--flip-y/--no-flip-y", default=True)
@click.option(
	"-w",
	"--workdir",
	envvar="WORKDIR",
	help="Directory to save the ortho image.",
	type=click.Path(exists=True, dir_okay=True, writable=True, resolve_path=True, path_type=Path),
)
@render_response
def get_uav_transformation_matrix(
	pix_coordinates: tuple,
	rw_coordinates: tuple,
	pixel_size: Optional[float],
	image_path: Optional[Path],
	roi_padding: float,
	max_dimension: int,
	min_resolution: int,
	flip_x: bool,
	flip_y: bool,
	workdir: Optional[Path],
) -> dict:
	"""Compute the transformation matrix from pixel to real-world coordinates from 2 points.

	Args:
		pix_coordinates (tuple): x1 y1 x2 y2 pixel values.
		rw_coordinates (tuple): x1 y1 x2 y2 real world values.
		pixel_size (Optional[float], optional): Size of the pixel.. Defaults to None.
		image_path (Optional[Path]): Path to the input image. If None, no image transformation is performed.
	    roi_padding (float): Optional padding as a fraction of the ROI dimensions (default: 0.1).
	    max_dimension (int): Maximum pixel dimension (width or height) for the output image
	    min_resolution (float): Minimum resolution in real-world units per pixel
	    flip_x (bool): Whether to flip the transformed image horizontally
	    flip_y (bool): Whether to flip the transformed image vertically

	Returns:
		dict: Containing the UAV matrix.
	"""
	if workdir is None and image_path is not None:
		raise MissingWorkdir("To save the 'transformed_image.png' is needed to provide a workdir.")

	result = ct.get_uav_transformation_matrix(
		*pix_coordinates,
		*rw_coordinates,
		pixel_size=pixel_size,
		image_path=image_path,
		roi_padding=roi_padding,
		max_dimension=max_dimension,
		min_resolution=min_resolution,
		flip_x=flip_x,
		flip_y=flip_y,
	)

	if image_path is not None:
		transformed_image = result.pop("transformed_img", None)
		transformed_image = Image.fromarray(transformed_image, "RGBA")
		transformed_image_path = workdir.joinpath("transformed_image.png")
		transformed_image.save(transformed_image_path)
		result.update({"transformed_image_path": str(transformed_image_path)})

	return result


@click.command(help="Compute the homography transformation matrix based on pixel coordinates and real-world distances.")
@click.argument("pix-coordinates", nargs=8, type=click.FLOAT)
@click.argument("rw-distances", nargs=6, type=click.FLOAT)
@click.option("--image-path", default=None, type=click.Path(exists=True), envvar="IMAGE_PATH")
@click.option("--roi-padding", default=0.0, type=click.FLOAT)
@click.option("--max-dimension", default=500, type=click.INT)
@click.option("--min-resolution", default=0.01, type=click.FLOAT)
@click.option("--flip-x/--no-flip-x", default=False)
@click.option("--flip-y/--no-flip-y", default=True)
@click.option(
	"-w",
	"--workdir",
	envvar="WORKDIR",
	help="Directory to save the ortho image.",
	type=click.Path(exists=True, dir_okay=True, writable=True, resolve_path=True, path_type=Path),
)
@render_response
def get_oblique_transformation_matrix(
	pix_coordinates: tuple,
	rw_distances: tuple,
	image_path: Optional[Path],
	roi_padding: float,
	max_dimension: int,
	min_resolution: int,
	flip_x: bool,
	flip_y: bool,
	workdir: Optional[Path],
) -> dict:
	"""Compute the homography transformation matrix based on pixel coordinates and real-world distances..

	Args:
		pix_coordinates (tuple): x1 y1 x2 y2 x3 y3 x4 y4 pixel coordinates values for four points.
		rw_distances (tuple): d12 d23 d34 d41 d13 d24 real-world distances between corresponding points.
		image_path (Optional[Path]): Path to the input image. If None, no image transformation is performed.
	    roi_padding (float): Optional padding as a fraction of the ROI dimensions (default: 0.1).
	    max_dimension (int): Maximum pixel dimension (width or height) for the output image
	    min_resolution (float): Minimum resolution in real-world units per pixel
	    flip_x (bool): Whether to flip the transformed image horizontally
	    flip_y (bool): Whether to flip the transformed image vertically

	Returns:
		dict: Containing the oblique matrix.
	"""
	if workdir is None and image_path is not None:
		raise MissingWorkdir("To save the 'transformed_image.png' is needed to provide a workdir.")

	result = ct.oblique_view_transformation_matrix(
		*pix_coordinates,
		*rw_distances,
		image_path=image_path,
		roi_padding=roi_padding,
		max_dimension=max_dimension,
		min_resolution=min_resolution,
		flip_x=flip_x,
		flip_y=flip_y,
	)

	if image_path is not None:
		transformed_image = result.pop("transformed_img", None)
		transformed_image = Image.fromarray(transformed_image, "RGBA")
		transformed_image_path = workdir.joinpath("transformed_image.png")
		transformed_image.save(transformed_image_path)
		result.update({"transformed_image_path": str(transformed_image_path)})

	return result


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


@click.command(help="Get camera matrix, position, uncertainty ellipses, and optionally generate orthorectified image.")
@click.argument("grp-dict", type=click.File(), envvar="GRP_DICT")
@click.option("--image-path", default=None, type=click.Path(exists=True), envvar="IMAGE_PATH")
@click.option("--optimize-solution", default=False, is_flag=True)
@click.option("--ortho-resolution", default=0.1, type=click.FLOAT)
@click.option("--flip-x/--no-flip-x", default=False)
@click.option("--flip-y/--no-flip-y", default=True)
@click.option("--confidence", default=0.95, type=click.FLOAT)
@click.option("--full-grp-dict", default=None, type=click.File())
@click.option(
	"-w",
	"--workdir",
	envvar="WORKDIR",
	help="Directory to save the ortho image.",
	type=click.Path(exists=True, dir_okay=True, writable=True, resolve_path=True, path_type=Path),
)
@render_response
def get_camera_solution(
	grp_dict: TextIOWrapper,
	image_path: Optional[Path],
	optimize_solution: bool,
	ortho_resolution: float,
	flip_x: bool,
	flip_y: bool,
	confidence: float,
	full_grp_dict: Optional[TextIOWrapper],
	workdir: Optional[Path],
) -> dict:
	"""Get camera matrix, position, uncertainty ellipses, and optionally generate orthorectified image."""

	if workdir is None and image_path is not None:
		raise MissingWorkdir("To save the 'ortho_image.png' is needed to provide a workdir.")

	grp_dict = json.loads(grp_dict.read())

	if full_grp_dict is not None:
		full_grp_dict = json.loads(full_grp_dict.read())

	camera_solution = ct.get_camera_solution(
		grp_dict=grp_dict,
		optimize_solution=optimize_solution,
		image_path=image_path,
		ortho_resolution=ortho_resolution,
		flip_x=flip_x,
		flip_y=flip_y,
		confidence=confidence,
		full_grp_dict=full_grp_dict,
	)

	if image_path is not None:
		ortho_image = camera_solution.pop("ortho_image", None)
		ortho_image = Image.fromarray(ortho_image, "RGBA")
		ortho_image_path = workdir.joinpath("ortho_image.png")
		ortho_image.save(ortho_image_path)
		camera_solution.update({"ortho_image_path": str(ortho_image_path)})

	return camera_solution
