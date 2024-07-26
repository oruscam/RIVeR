import json
from io import TextIOWrapper
from pathlib import Path
from typing import Optional

import click
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

import river.core.define_roi_masks as rm
from river.cli.commands.exceptions import MissingWorkdir
from river.cli.commands.utils import render_response


def get_png_mask(mask: np.ndarray) -> Image:
	rgba_mask = np.zeros((mask.shape[0], mask.shape[1], 4), dtype=np.uint8)

	# Copiar los datos de la imagen en los primeros tres canales (RGB)
	rgba_mask[:, :, 0] = mask  # Canal R
	rgba_mask[:, :, 1] = mask  # Canal G
	rgba_mask[:, :, 2] = mask  # Canal B

	# Ajustar el canal alfa basado en los valores específicos
	for i in range(mask.shape[0]):
		for j in range(mask.shape[1]):
			if mask[i, j] == 5:  # Suponiendo que 0101 se representa como 5 en decimal
				rgba_mask[i, j, 3] = 0  # Transparente
			elif mask[i, j] == 0:
				rgba_mask[i, j, 3] = 111  # Opaco

	# Crear imagen y guardar como PNG con transparencia
	return Image.fromarray(rgba_mask, "RGBA")


@click.command(
	help=(
		"Recommend a value for height_roi to ensure the smallest side length of all pixel boxes is exactly "
		"4 times the window size, using optimization."
	)
)
@click.argument("window-size", type=click.INT)
@click.argument("xsections", envvar="XSECTIONS", type=click.File())
@click.argument("transformation-matrix", envvar="TRANSFORMATION_MATRIX", type=click.File())
@render_response
def recommend_height_roi(window_size: int, xsections: TextIOWrapper, transformation_matrix: TextIOWrapper) -> dict:
	"""
	Recommend a value for height_roi to ensure the smallest side length of all pixel boxes
	is exactly 4 times the window size, using optimization.

	Args:
	    window_size (int): The window size for comparison.
	    xsections (dict): TextIOWrapper): File stream to read the Cross-sections data.
	    transformation_matrix (TextIOWrapper): File stream to read the transformation matrix.

	Returns:
	    dict: Containing the height ROI value.
	"""

	xsections = json.loads(xsections.read())
	transformation_matrix = np.array(json.loads(transformation_matrix.read()))

	height_roi = rm.recommend_height_roi(xsections, window_size, transformation_matrix)

	return {"height_roi": height_roi}


@click.command(help="Create a combined mask and bounding box from cross-section data in a JSON file.")
@click.argument("height_roi", type=click.INT)
@click.argument("image", type=click.Path(exists=True, file_okay=True, readable=True, resolve_path=True, path_type=Path))
@click.argument("xsections", envvar="XSECTIONS", type=click.File())
@click.argument("transformation-matrix", envvar="TRANSFORMATION_MATRIX", type=click.File())
@click.option("--save-png-mask", is_flag=True, help="Save the mask as a PNG.")
@click.option(
	"-w",
	"--workdir",
	envvar="WORKDIR",
	help="Directory to save the generated mask.",
	type=click.Path(exists=True, dir_okay=True, writable=True, resolve_path=True, path_type=Path),
)
@render_response
def create_mask_and_bbox(
	height_roi: int,
	image: Path,
	xsections: TextIOWrapper,
	transformation_matrix: TextIOWrapper,
	save_png_mask: bool,
	workdir: Optional[Path],
):
	"""Create a combined mask and bounding box from cross-section data in a JSON file.

	Args:
		height_roi (int): Height of the rectangular box for each cross-section.
		image (Path): The path of image for which the mask is to be created.
		xsections (dict): TextIOWrapper): File stream to read the Cross-sections data.
	    transformation_matrix (TextIOWrapper): File stream to read the transformation matrix.
	"""
	if workdir is None and save_png_mask:
		raise MissingWorkdir("To save the 'mask.png' is needed to provide a workdir.")

	image = plt.imread(fname=image)
	xsections = json.loads(xsections.read())
	transformation_matrix = np.array(json.loads(transformation_matrix.read()))

	mask, bbox = rm.create_mask_and_bbox(
		image=image, xsections=xsections, transformation_matrix=transformation_matrix, height_roi=height_roi
	)

	if save_png_mask:
		png_mask = get_png_mask(mask)
		png_mask.save(workdir.joinpath("mask.png"))

	return {"mask": mask.tolist(), "bbox": bbox}
