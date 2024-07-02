from typing import Optional

import click

import river.core.coordinate_transform as ct
from river.cli.commands.utils import render_response


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
