import json
from io import TextIOWrapper
from pathlib import Path
from typing import Optional, List

import click
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

import river.core.define_roi_masks as rm
from river.cli.commands.exceptions import MissingWorkdir
from river.cli.commands.utils import render_response


def get_png_mask(mask: np.ndarray) -> Image:
	"""
	Render a binary mask (0/1) as an RGBA overlay for the GUI.

	Behavior:
	- mask == 1  -> fully transparent
	- mask == 0  -> black with semi-transparency (alpha 111)
	"""
	h, w = mask.shape[:2]

	# RGBA initialized to zeros => black + fully transparent everywhere by default
	rgba_mask = np.zeros((h, w, 4), dtype=np.uint8)

	# For mask==0, make pixels visible (black with alpha 111)
	zero_pixels = (mask == 0)
	rgba_mask[zero_pixels, 3] = 111

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
		xsections (TextIOWrapper): File stream to read the Cross-sections data.
		transformation_matrix (TextIOWrapper): File stream to read the transformation matrix.
		save_png_mask (bool): If True, also save mask.png.
		workdir (Optional[Path]): Output directory.
	"""
	if workdir is None:
		raise MissingWorkdir("To save outputs you need to provide a workdir.")

	workdir.mkdir(parents=True, exist_ok=True)

	image_arr = plt.imread(fname=image)
	xsections_dict = json.loads(xsections.read())
	transform_mat = np.array(json.loads(transformation_matrix.read()))

	mask, bbox = rm.create_mask_and_bbox(
		image=image_arr,
		xsections=xsections_dict,
		transformation_matrix=transform_mat,
		height_roi=height_roi,
	)

	mask_json_path = workdir / "mask.json"
	bbox_json_path = workdir / "bbox.json"

	with mask_json_path.open("w", encoding="utf-8") as f:
		json.dump(mask.tolist(), f, separators=(",", ":"))

	with bbox_json_path.open("w", encoding="utf-8") as f:
		json.dump(bbox, f, separators=(",", ":"))

	print(f"The ROI coordinates have been saved in {bbox_json_path}")

	if save_png_mask:
		png_mask = get_png_mask(mask)
		png_path = workdir / "mask.png"
		png_mask.save(png_path)
		print(f"The mask has been saved in {png_path} and {mask_json_path}")
	else:
		print(f"The mask has been saved in {mask_json_path}")

	return {"bbox_path": str(bbox_json_path), "mask_json_path": str(mask_json_path)}


@click.command(help="Create a user polygon mask and save usr_mask_N.json and usr_mask_N.png.")
@click.argument("image", type=click.Path(exists=True, file_okay=True, readable=True, resolve_path=True, path_type=Path))
@click.option(
	"-w",
	"--workdir",
	envvar="WORKDIR",
	help="Directory to save usr_mask_N.json and usr_mask_N.png.",
	type=click.Path(exists=True, dir_okay=True, writable=True, resolve_path=True, path_type=Path),
	required=True,
)
@click.option(
	"-n",
	"--index",
	type=click.INT,
	default=1,
	show_default=True,
	help="Mask index N used for filenames usr_mask_N.*",
)
@click.option(
	"--point",
	nargs=2,
	type=(click.FLOAT, click.FLOAT),
	multiple=True,
	required=True,
	help="Polygon vertex as two floats: --point X Y. Repeat for each vertex (at least 3).",
)

@click.option("--save-png-mask", is_flag=True, default=True, show_default=True, help="Save usr_mask_N.png.")
@render_response
def create_user_mask(
	image: Path,
	workdir: Path,
	index: int,
	point: tuple[tuple[float, float], ...],
	save_png_mask: bool,
):
	if len(point) < 3:
		raise click.ClickException("You must provide at least 3 --point X Y pairs.")

	# Load image to get shape
	img = plt.imread(fname=image)
	h = int(img.shape[0])
	w = int(img.shape[1])

	points = [{"x": x, "y": y} for (x, y) in point]
	mask = rm.create_user_polygon_mask(image_shape=(h, w), points=points)

	mask_json_path = workdir / f"usr_mask_{index}.json"
	with mask_json_path.open("w", encoding="utf-8") as f:
		json.dump(mask.tolist(), f, separators=(",", ":"))

	png_path = None
	if save_png_mask:
		png_img = get_png_mask(mask)
		png_path = workdir / f"usr_mask_{index}.png"
		png_img.save(png_path)

	# Console messages (human-friendly)
	print(f"User mask JSON saved to {mask_json_path}")
	if png_path is not None:
		print(f"User mask PNG saved to {png_path}")

	return {
		"usr_mask_json": str(mask_json_path),
		"usr_mask_png": str(png_path) if png_path is not None else None,
		"index": index,
		"num_points": len(point),
		"image_shape": [h, w],
	}

@click.command(help="Compile ROI mask and user masks into a final mask (0 dominant, AND merge).")
@click.option(
	"-w",
	"--workdir",
	envvar="WORKDIR",
	help="Directory to save the compiled mask.",
	type=click.Path(exists=True, dir_okay=True, writable=True, resolve_path=True, path_type=Path),
	required=True,
)
@click.option(
	"--roi",
	"roi_path",
	help="Path to ROI mask.json",
	type=click.Path(exists=True, file_okay=True, readable=True, resolve_path=True, path_type=Path),
	required=True,
)
@click.option(
	"--usr",
	"usr_paths",
	help="Path to a user mask JSON. Repeat for multiple: --usr a.json --usr b.json",
	type=click.Path(exists=True, file_okay=True, readable=True, resolve_path=True, path_type=Path),
	multiple=True,
	required=False,
)
@click.option(
	"--out",
	"out_path",
	help="Output filename for final mask JSON. If relative, saved under workdir.",
	type=click.Path(dir_okay=False, resolve_path=False, path_type=Path),
	default=Path("final_mask.json"),
	show_default=True,
)
@click.option("--save-png-mask", is_flag=True, help="Also save final_mask.png using the same overlay logic.")
@render_response
def compile_masks(
	workdir: Path,
	roi_path: Path,
	usr_paths: tuple[Path, ...],
	out_path: Path,
	save_png_mask: bool,
):
	workdir.mkdir(parents=True, exist_ok=True)

	# Resolve output path
	if out_path.is_absolute():
		final_json_path = out_path
	else:
		final_json_path = workdir / out_path

	# Load ROI mask
	with roi_path.open("r", encoding="utf-8") as f:
		roi_mask = np.array(json.load(f), dtype=np.uint8)

	# Load user masks
	user_masks: List[np.ndarray] = []
	for p in usr_paths:
		with p.open("r", encoding="utf-8") as f:
			user_masks.append(np.array(json.load(f), dtype=np.uint8))

	# Compile with 0-dominant AND merge
	final_mask = rm.compile_masks(roi_mask=roi_mask, user_masks=user_masks if len(user_masks) > 0 else None)

	# Save compact JSON, no spaces
	with final_json_path.open("w", encoding="utf-8") as f:
		json.dump(final_mask.tolist(), f, separators=(",", ":"))

	print(f"Final mask JSON saved to {final_json_path}")

	final_png_path = None
	if save_png_mask:
		final_png_path = final_json_path.with_suffix(".png")
		png_img = get_png_mask(final_mask)
		png_img.save(final_png_path)
		print(f"Final mask PNG saved to {final_png_path}")

	return {
		"final_mask_json": str(final_json_path),
		"final_mask_png": str(final_png_path) if final_png_path is not None else None,
		"roi": str(roi_path),
		"usr": [str(p) for p in usr_paths],
	}