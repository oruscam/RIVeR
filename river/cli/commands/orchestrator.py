import json
from pathlib import Path
from typing import Optional

import click

from river.cli.commands.utils import load_mask, render_response
from river.core.orchestrator import run_full_analysis


@click.command(help="Run the full analysis orchestra: PIV, LSPIV profiles, STIV, and iWave.")
@click.argument(
	"frames-dir", type=click.Path(exists=True, file_okay=False, readable=True, resolve_path=True, path_type=Path)
)
@click.argument(
	"xsections", envvar="XSECTIONS", type=click.Path(exists=True, dir_okay=False, readable=True, resolve_path=True, path_type=Path)
)
@click.argument("transformation-matrix", envvar="TRANSFORMATION_MATRIX", type=click.Path(exists=True, dir_okay=False, resolve_path=True, path_type=Path))
@click.option(
	"-w",
	"--workdir",
	envvar="WORKDIR",
	required=True,
	help="Directory to save piv_results.json.",
	type=click.Path(exists=True, dir_okay=True, writable=True, resolve_path=True, path_type=Path),
)
@click.option(
	"-m", "--mask", envvar="MASK_PATH",
	type=click.Path(exists=True, file_okay=True, readable=True, resolve_path=True, path_type=Path),
	default=None, help="The mask for the region of interest"
)
@click.option("-bb", "--bbox", envvar="BBOX_PATH", type=click.File(), default=None, help="The bounding box for the region of interest")
@click.option("-i1", "--interrogation-area-1", type=int, default=128, show_default=True, help="The size of the interrogation area.")
@click.option("-i2", "--interrogation-area-2", type=int, default=None, help="The size of the second interrogation area.")
@click.option("-sf", "--no-standard-filter", "standard_filter", type=bool, is_flag=True, default=True, help="Whether to apply standard deviation filtering.")
@click.option("-st", "--standard-threshold", type=int, default=4, show_default=True, help="The threshold for standard deviation filtering.")
@click.option("-mf", "--no-median-test-filter", "median_test_filter", type=bool, is_flag=True, default=True, help="Whether to apply median test filtering.")
@click.option("-e", "--epsilon", type=float, default=0.02, show_default=True, help="The epsilon value for median test filtering.")
@click.option("-t", "--threshold", type=int, default=2, show_default=True, help="The threshold value for median test filtering.")
@click.option("-fc", "--no-filter-clahe", "filter_clahe", type=bool, is_flag=True, default=True, help="Whether to apply CLAHE filtering.")
@click.option("-cl", "--clip-limit-clahe", type=int, default=5, show_default=True, help="The clip limit for CLAHE.")
@click.option("-fs", "--filter-sub-background", type=bool, is_flag=True, default=False, help="Whether to subtract background.")
@click.option("-s", "--step", type=int, required=True, help="Time step between frames.")
@click.option("-f", "--fps", type=float, required=True, help="Frames per second of the source video.")
@click.option("-ns", "--num-stations", "num_stations_list", type=int, multiple=True, help="Stations per section, one value per section in order.")
@click.option("--stiv/--no-stiv", default=True, show_default=True, help="Run STIV analysis.")
@click.option("--iwave/--no-iwave", default=True, show_default=True, help="Run iWave analysis.")
@click.option("-in", "--interpolate", is_flag=True, help="Whether to interpolate velocity and discharge results.")
@click.option("--height-roi-stiv", type=float, default=6.0, show_default=True, help="STIV sampling window height (meters).")
@render_response
def analyze_all(
	frames_dir: Path,
	xsections: Path,
	transformation_matrix: Path,
	workdir: Path,
	mask: Optional[Path],
	bbox,
	interrogation_area_1: int,
	interrogation_area_2: Optional[int],
	standard_filter: bool,
	standard_threshold: int,
	median_test_filter: bool,
	epsilon: float,
	threshold: int,
	filter_clahe: bool,
	clip_limit_clahe: int,
	filter_sub_background: bool,
	step: int,
	fps: float,
	num_stations_list: tuple,
	stiv: bool,
	iwave: bool,
	interpolate: bool,
	height_roi_stiv: float,
) -> dict:
	"""Run PIV, LSPIV profiles, STIV, and iWave in one pass."""
	mask_arr = load_mask(mask) if mask is not None else None
	bbox_list = json.loads(bbox.read()) if bbox is not None else None

	piv_options = dict(
		interrogation_area_1=interrogation_area_1,
		interrogation_area_2=interrogation_area_2,
		standard_filter=standard_filter,
		standard_threshold=standard_threshold,
		median_test_filter=median_test_filter,
		epsilon=epsilon,
		threshold=threshold,
		filter_clahe=filter_clahe,
		clip_limit_clahe=clip_limit_clahe,
		filter_sub_background=filter_sub_background,
		save_background=False,
	)

	return run_full_analysis(
		frames_dir=frames_dir,
		workdir=workdir,
		xsections_path=xsections,
		transformation_matrix_path=transformation_matrix,
		step=step,
		fps=fps,
		num_stations_list=list(num_stations_list) or None,
		stiv=stiv,
		iwave=iwave,
		interpolate=interpolate,
		mask=mask_arr,
		bbox=bbox_list,
		piv_options=piv_options,
		height_roi_stiv=height_roi_stiv,
	)
