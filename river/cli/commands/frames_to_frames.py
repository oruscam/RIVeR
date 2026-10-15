import sys
import threading
from pathlib import Path
from typing import Optional

import click

from river.cli.commands.utils import render_response
from river.cli.commands.video_to_frames import (
	_monitor_extraction,
	check_stabilize_options,
	stabilize_extracted_frames,
)
from river.core.frames_to_frames import frames_to_frames as ftf
from river.core.frames_to_frames import inspect_frames, list_source_frames, selected_indices


@click.command(help="Report the frame count, resolution and ordered file names of a frames folder.")
@click.argument("source-dir", type=click.Path(exists=True, file_okay=False))
@click.pass_context
@render_response
def frames_info(ctx: click.Context, source_dir: str) -> dict:
	return inspect_frames(Path(source_dir))


@click.command(help="Imports a folder of frames into the project's frames folder and return the initial frame path.")
@click.argument("source-dir", type=click.Path(exists=True, file_okay=False))
@click.argument("frames-dir", type=click.Path(dir_okay=True, writable=True))
@click.option("--start-frame", type=int, default=0, help="Frame number to start.")
@click.option("--end-frame", type=int, default=None, help="Frame number to end.")
@click.option("--every", type=int, default=1, help="Step to import frames.")
@click.option("--overwrite", is_flag=True, help="Overwrite frames if exists.")
@click.option(
	"--resize-factor", type=click.FloatRange(min=0.0, max=1.0), default=1.0, help="Factor to resize the frames."
)
@click.option("--stabilize", is_flag=True, default=False, help="Stabilize frames after import.")
@click.option(
	"--stabilization-regions",
	type=click.Path(exists=True),
	default=None,
	help="Path to stabilization_regions.json (required when --stabilize is set).",
)
@click.option(
	"--replace",
	is_flag=True,
	default=False,
	help="Replace imported frames with stabilized ones (requires --stabilize).",
)
@click.option("--undistort", is_flag=True, default=False, help="Apply lens undistortion to imported frames.")
@click.option("--profile-path", type=click.Path(exists=True), default=None, help="Path to calibration profile.json.")
@click.pass_context
@render_response
def frames_to_frames(
	ctx: click.Context,
	source_dir: str,
	frames_dir: str,
	start_frame: int,
	end_frame: Optional[int],
	every: int,
	overwrite: bool,
	resize_factor: float,
	stabilize: bool,
	stabilization_regions: Optional[str],
	replace: bool,
	undistort: bool,
	profile_path: Optional[str],
) -> dict:
	"""Command to import the given frames folder into frames."""
	check_stabilize_options(stabilize, stabilization_regions, replace)

	frames_dir_path = Path(frames_dir)
	if not frames_dir_path.exists():
		frames_dir_path.mkdir()

	source_count = len(list_source_frames(Path(source_dir)))
	expected = len(selected_indices(start_frame, end_frame, every, source_count))

	print("Extracting frames...", file=sys.stderr, flush=True)
	stop = threading.Event()
	monitor = threading.Thread(
		target=_monitor_extraction,
		args=(frames_dir_path, expected, stop),
		daemon=True,
	)
	monitor.start()

	try:
		initial_frame: Path = ftf(
			source_dir=Path(source_dir),
			frames_dir=frames_dir_path,
			start_frame_number=start_frame,
			end_frame_number=end_frame,
			every=every,
			overwrite=overwrite,
			resize_factor=resize_factor,
			undistort=undistort,
			profile_path=profile_path,
		)
	finally:
		stop.set()
		monitor.join(timeout=3.0)

	result: dict = {"initial_frame": str(initial_frame)}

	if stabilize:
		stabilize_extracted_frames(frames_dir_path, stabilization_regions, replace, resize_factor, result)

	return result
