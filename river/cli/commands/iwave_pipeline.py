import json
from pathlib import Path

import click

from river.cli.commands.utils import render_response
from river.core.iwave_pipeline import run_iwave_analysis


@click.command(help="Run iWave spectral velocimetry for the current cross-section.")
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
@click.option("-bb", "--bbox", envvar="BBOX_PATH", type=click.File(), default=None, help="ROI bounding box JSON.")
@click.option(
	"--write",
	is_flag=True,
	default=False,
	help="Write results back to the xsections file.",
)
@render_response
def iwave_analyze(
	xsections: str,
	transformation_matrix,
	frames_dir: str,
	step: int,
	fps: float,
	id_section: int,
	bbox,
	write: bool,
) -> dict:
	"""Run iWave analysis for the current cross-section."""
	xsections_path = Path(xsections)
	result = run_iwave_analysis(
		xsections=json.loads(xsections_path.read_text()),
		transformation_matrix=json.loads(transformation_matrix.read()),
		frames_dir=frames_dir,
		step=step,
		fps=fps,
		id_section=id_section,
		bbox=json.loads(bbox.read()) if bbox is not None else None,
	)
	if write:
		xsections_path.write_text(json.dumps(result))
	return result
