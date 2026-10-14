import json
from pathlib import Path

import click

from river.cli.commands.utils import render_response
from river.core.stiv_pipeline import run_stiv_analysis, stiv_weights_available


@click.command(help="Check whether STIV model weights are present on disk (no torch import).")
@render_response
def stiv_status() -> dict:
	"""Report STIV weight availability without loading the model."""
	return stiv_weights_available()


@click.command(help="Run STIV analysis for the current cross-section and fuse with LSPIV results.")
@click.argument("xsections", envvar="XSECTIONS", type=click.Path(exists=True, dir_okay=False, readable=True, resolve_path=True))
@click.argument("transformation-matrix", envvar="TRANSFORMATION_MATRIX", type=click.File())
@click.option(
	"-fd",
	"--frames-dir",
	type=click.Path(exists=True, file_okay=False, dir_okay=True, readable=True, resolve_path=True),
	required=True,
	help="Directory containing extracted video frames (.jpg).",
)
@click.option("-s", "--step", type=int, required=True, help="Time step between frames.")
@click.option("-f", "--fps", type=float, required=True, help="Frames per second of the source video.")
@click.option(
	"-i",
	"--id-section",
	type=int,
	required=True,
	help="Index of the current cross-section in the list of sections.",
)
@click.option(
	"--height-roi",
	"--hr",
	type=float,
	default=6.0,
	show_default=True,
	help="Height of the sampling window centered on each station (meters).",
)
@click.option(
	"--write",
	is_flag=True,
	default=False,
	help="Write results back to the xsections file.",
)
@click.option(
	"--save-stis",
	is_flag=True,
	default=False,
	help="Save raw STIs as PNG files next to the frames directory (in a 'stis' folder).",
)
@click.option(
	"--plot",
	is_flag=True,
	default=False,
	help="Save a summary figure (stiv_analysis.png) next to the frames directory.",
)
@render_response
def stiv_analyze(
	xsections: str,
	transformation_matrix,
	frames_dir: str,
	step: int,
	fps: float,
	id_section: int,
	height_roi: float,
	write: bool,
	save_stis: bool,
	plot: bool,
) -> dict:
	"""Run STIV analysis for the current cross-section."""
	xsections_path = Path(xsections)
	session_dir = Path(frames_dir).parent
	stis_dir = str(session_dir / "stis") if save_stis else None
	plot_path = str(session_dir / "stiv_analysis.png") if plot else None
	result = run_stiv_analysis(
		xsections=json.loads(xsections_path.read_text()),
		transformation_matrix=json.loads(transformation_matrix.read()),
		frames_dir=frames_dir,
		step=step,
		fps=fps,
		id_section=id_section,
		height_roi_m=height_roi,
		stis_dir=stis_dir,
		plot_path=plot_path,
	)
	if write:
		xsections_path.write_text(json.dumps(result))
	return result
