import json
from io import TextIOWrapper
from pathlib import Path
from typing import Optional

import click
import numpy as np

from river.cli.commands.utils import render_response
from river.core.piv_pipeline import run_analyze_all, run_test


@click.argument(
	"image_2", type=click.Path(exists=True, file_okay=True, readable=True, resolve_path=True, path_type=Path)
)
@click.argument(
	"image_1", type=click.Path(exists=True, file_okay=True, readable=True, resolve_path=True, path_type=Path)
)
@click.option(
	"-m", "--mask", envvar="MASK_PATH", type=click.File(), default=None, help="The mask for the region of interest"
)
@click.option(
	"-bb",
	"--bbox",
	envvar="BBOX_PATH",
	type=click.File(),
	default=None,
	help="The bounding box for the region of interest",
)
@click.option(
	"-i1",
	"--interrogation-area-1",
	type=int,
	default=128,
	show_default=True,
	help="The size of the interrogation area.",
)
@click.option(
	"-i2", "--interrogation-area-2", type=int, default=None, help="The size of the second interrogation area."
)
@click.option(
	"-ma",
	"--no-mask-auto",
	"mask_auto",
	type=bool,
	is_flag=True,
	default=True,
	help="Whether to automatically apply a mask.",
)
@click.option(
	"-mp", "--no-multipass", "multipass", type=bool, is_flag=True, default=True, help="Whether to use multiple passes."
)
@click.option(
	"-sf",
	"--no-standard-filter",
	"standard_filter",
	type=bool,
	is_flag=True,
	default=True,
	help="Whether to apply standard deviation filtering.",
)
@click.option(
	"-st",
	"--standard-threshold",
	type=int,
	default=4,
	show_default=True,
	help="The threshold for standard deviation filtering.",
)
@click.option(
	"-mf",
	"--no-median-test-filter",
	"median_test_filter",
	type=bool,
	is_flag=True,
	default=True,
	help="Whether to apply median test filtering.",
)
@click.option(
	"-e", "--epsilon", type=float, default=0.02, show_default=True, help="The epsilon value for median test filtering."
)
@click.option(
	"-t", "--threshold", type=int, default=2, show_default=True, help="The threshold value for median test filtering."
)
@click.option(
	"-si", "--no-seeding-filter", "seeding_filter", type=bool, is_flag=True, help="Whether to apply seeding filtering."
)
@click.option("-s", "--step", type=int, default=None, help="The step size for grid calculations.")
@click.option(
	"-fg",
	"--no-filter-grayscale",
	"filter_grayscale",
	type=bool,
	is_flag=True,
	default=True,
	help="Whether to convert images to grayscale.",
)
@click.option(
	"-fc",
	"--no-filter-clahe",
	"filter_clahe",
	type=bool,
	is_flag=True,
	default=True,
	help="Whether to apply CLAHE filtering.",
)
@click.option("-cl", "--clip-limit-clahe", type=int, default=5, show_default=True, help="The clip limit for CLAHE.")
@click.option(
	"-fs", "--filter-sub-background", type=bool, is_flag=True, default=False, help="Whether to subtract background."
)
@click.command
@render_response
def piv_test(
	image_1: Path,
	image_2: Path,
	mask: Optional[TextIOWrapper],
	bbox: Optional[TextIOWrapper],
	interrogation_area_1: int,
	interrogation_area_2: Optional[int],
	mask_auto: bool,
	multipass: bool,
	standard_filter: bool,
	standard_threshold: int,
	median_test_filter: bool,
	epsilon: float,
	threshold: int,
	seeding_filter: bool,
	step: Optional[int],
	filter_grayscale: bool,
	filter_clahe: bool,
	clip_limit_clahe: int,
	filter_sub_background: bool,
):
	if mask is not None:
		mask = np.array(json.loads(mask.read()))

	if bbox is not None:
		bbox = json.loads(bbox.read())

	return run_test(
		image_1,
		image_2,
		mask,
		bbox,
		interrogation_area_1,
		interrogation_area_2,
		mask_auto,
		multipass,
		standard_filter,
		standard_threshold,
		median_test_filter,
		epsilon,
		threshold,
		seeding_filter,
		step,
		filter_grayscale,
		filter_clahe,
		clip_limit_clahe,
		filter_sub_background,
	)


@click.argument(
	"images-location", type=click.Path(exists=True, dir_okay=True, readable=True, resolve_path=True, path_type=Path)
)
@click.option(
	"-m", "--mask", envvar="MASK_PATH", type=click.File(), default=None, help="The mask for the region of interest"
)
@click.option(
	"-bb",
	"--bbox",
	envvar="BBOX_PATH",
	type=click.File(),
	default=None,
	help="The bounding box for the region of interest",
)
@click.option(
	"-i1",
	"--interrogation-area-1",
	type=int,
	default=128,
	show_default=True,
	help="The size of the interrogation area.",
)
@click.option(
	"-i2", "--interrogation-area-2", type=int, default=None, help="The size of the second interrogation area."
)
@click.option(
	"-ma",
	"--no-mask-auto",
	"mask_auto",
	type=bool,
	is_flag=True,
	default=True,
	help="Whether to automatically apply a mask.",
)
@click.option(
	"-mp", "--no-multipass", "multipass", type=bool, is_flag=True, default=True, help="Whether to use multiple passes."
)
@click.option(
	"-sf",
	"--no-standard-filter",
	"standard_filter",
	type=bool,
	is_flag=True,
	default=True,
	help="Whether to apply standard deviation filtering.",
)
@click.option(
	"-st",
	"--standard-threshold",
	type=int,
	default=4,
	show_default=True,
	help="The threshold for standard deviation filtering.",
)
@click.option(
	"-mf",
	"--no-median-test-filter",
	"median_test_filter",
	type=bool,
	is_flag=True,
	default=True,
	help="Whether to apply median test filtering.",
)
@click.option(
	"-e", "--epsilon", type=float, default=0.02, show_default=True, help="The epsilon value for median test filtering."
)
@click.option(
	"-t", "--threshold", type=int, default=2, show_default=True, help="The threshold value for median test filtering."
)
@click.option(
	"-si", "--no-seeding-filter", "seeding_filter", type=bool, is_flag=True, help="Whether to apply seeding filtering."
)
@click.option("-s", "--step", type=int, default=None, help="The step size for grid calculations.")
@click.option(
	"-fg",
	"--no-filter-grayscale",
	"filter_grayscale",
	type=bool,
	is_flag=True,
	default=True,
	help="Whether to convert images to grayscale.",
)
@click.option(
	"-fc",
	"--no-filter-clahe",
	"filter_clahe",
	type=bool,
	is_flag=True,
	default=True,
	help="Whether to apply CLAHE filtering.",
)
@click.option("-cl", "--clip-limit-clahe", type=int, default=5, show_default=True, help="The clip limit for CLAHE.")
@click.option(
	"-fs", "--filter-sub-background", type=bool, is_flag=True, default=False, help="Whether to subtract background."
)
@click.option(
	"-sb", "--save-background", type=bool, is_flag=True, default=False, help="Whether to save the background image."
)
@click.option(
	"-w",
	"--workdir",
	envvar="WORKDIR",
	required=True,
	help="Directory to save the result.",
	type=click.Path(exists=True, dir_okay=True, writable=True, resolve_path=True, path_type=Path),
)
@click.command
@render_response
def piv_analyze(
	images_location: Path,
	mask: Optional[TextIOWrapper],
	bbox: Optional[TextIOWrapper],
	interrogation_area_1: int,
	interrogation_area_2: Optional[int],
	mask_auto: bool,
	multipass: bool,
	standard_filter: bool,
	standard_threshold: int,
	median_test_filter: bool,
	epsilon: float,
	threshold: int,
	seeding_filter: bool,
	step: Optional[int],
	filter_grayscale: bool,
	filter_clahe: bool,
	clip_limit_clahe: int,
	filter_sub_background: bool,
	save_background: bool,
	workdir: Path,
):
	if mask is not None:
		mask = np.array(json.loads(mask.read()))

	if bbox is not None:
		bbox = json.loads(bbox.read())

	results = run_analyze_all(
		images_location,
		mask,
		bbox,
		interrogation_area_1,
		interrogation_area_2,
		mask_auto,
		multipass,
		standard_filter,
		standard_threshold,
		median_test_filter,
		epsilon,
		threshold,
		seeding_filter,
		step,
		filter_grayscale,
		filter_clahe,
		clip_limit_clahe,
		filter_sub_background,
		save_background,
		workdir,
	)

	results_path = workdir.joinpath("piv_results.json")
	results_path.write_text(json.dumps(results))

	return {"results_path": str(results_path)}
