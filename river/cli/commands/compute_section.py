import json
from io import TextIOWrapper

import click

from river.cli.commands.utils import render_response
from river.core.compute_section import update_current_x_section


@click.command(help=("Update the current cross-section with the PIV results and other parameters."))
@click.argument("xsections", envvar="XSECTIONS", type=click.File())
@click.argument("piv-results", envvar="PIV_RESULTS", type=click.File())
@click.argument("transformation-matrix", envvar="TRANSFORMATION_MATRIX", type=click.File())
@click.option("-s", "--step", type=int, required=True, help="Time step between frames.")
@click.option("-f", "--fps", type=float, required=True, help="Frames per second of the video used in PIV processing.")
@click.option(
	"-i", "--id-section", type=int, required=True, help="Index of the current cross-section in the list of sections."
)
@click.option("-in", "--interpolate", is_flag=True, help="Whether to interpolate velocity and discharge results.")
@click.option("-a", "--alpha", type=float, default=0.85, help="TBD")
@click.option("-ns", "--num-stations", type=int, default=15, help="TBD")
@render_response
def update_xsection(
	xsections: TextIOWrapper,
	piv_results: TextIOWrapper,
	transformation_matrix: TextIOWrapper,
	step: int,
	fps: float,
	id_section: int,
	interpolate: bool,
	alpha: float,
	num_stations: int,
) -> dict:
	"""
	Update the current cross-section with the PIV results and other parameters.

	Args:
	    xsections (TextIOWrapper): File stream to read the Cross-sections data.
	    piv_results (TextIOWrapper): File stream to read the PIV results.
	    transformation_matrix (TextIOWrapper): File stream to read the transformation matrix.
	    step (int): Time step between frames.
	    fps (float): Frames per second of the video used in PIV processing.
	    id_section (int): Index of the current cross-section in the list of sections.
	    interpolate (bool): Whether to interpolate velocity and discharge results.
	    alpha (float): TBD.
	    num_stations (bool): TBD.
	Returns:
	    dict: Containing the updated xsections.
	"""

	xsections = json.loads(xsections.read())
	piv_results = json.loads(piv_results.read())
	transformation_matrix = json.loads(transformation_matrix.read())

	return update_current_x_section(
		xsections, piv_results, transformation_matrix, step, fps, id_section, interpolate, alpha, num_stations
	)
