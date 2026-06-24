import shutil
from pathlib import Path
from typing import Optional

import click

from river.cli.commands.exceptions import RiverCLIException
from river.cli.commands.utils import render_response
from river.core.stabilize_frames import stabilize_frames
from river.core.video_to_frames import video_to_frames as vtf


@click.command(help="Transforms the given video to frames and return the initial frame path.")
@click.argument("video-path", type=click.Path(exists=True))
@click.argument("frames-dir", type=click.Path(dir_okay=True, writable=True))
@click.option("--start-frame", type=int, default=0, help="Frame number to start.")
@click.option("--end-frame", type=int, default=None, help="Frame number to end.")
@click.option("--every", type=int, default=1, help="Step to extract frames.")
@click.option("--overwrite", is_flag=True, help="Overwrite frames if exists.")
@click.option(
	"--resize-factor", type=click.FloatRange(min=0.0, max=1.0), default=1.0, help="Factor to resize the frames."
)
@click.option("--stabilize", is_flag=True, default=False, help="Stabilize frames after extraction.")
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
	help="Replace original extracted frames with stabilized ones (requires --stabilize).",
)
@click.option("--undistort", is_flag=True, default=False, help="Apply lens undistortion to extracted frames.")
@click.option("--profile-path", type=click.Path(exists=True), default=None, help="Path to calibration profile.json.")
@click.pass_context
@render_response
def video_to_frames(
	ctx: click.Context,
	video_path: str,
	frames_dir: str,
	start_frame: int,
	end_frame: Optional[int],
	every: int,
	overwrite: bool,
	resize_factor: float,
<<<<<<< HEAD
	stabilize: bool,
	stabilization_regions: Optional[str],
	replace: bool,
) -> dict:
	"""Command to process the given video into frames."""
	if stabilize and stabilization_regions is None:
		raise RiverCLIException(
			"--stabilization-regions is required when --stabilize is set"
		)
	if replace and not stabilize:
		raise RiverCLIException(
			"--replace requires --stabilize"
		)
=======
	undistort: bool,
	profile_path: str,
) -> dict:
	"""Command to process the given video into frames.

	Args:
		ctx (click.Context): Click context.
		video_path (Path): Path of the video to process.
		frames_dir (Path): Path of the directory to store the frames.
		start_frame (int): Frame number to start.
		end_frame (int): Frame number to end.
		every (int): Step to extract frames.
		overwrite (bool): Overwrite frames if exists.
		resize_factor (float, optional): Factor to resize the frames (<=1.0). Defaults to 1.0.
		undistort (bool): Apply lens undistortion using calibration profile. Defaults to False.
		profile_path (str, optional): Path to calibration profile.json. Required when undistort=True.
	"""
>>>>>>> develop

	if ctx.obj["verbose"]:
		click.echo(f"Extracting frames from '{video_path}' ...")

	frames_dir_path = Path(frames_dir)

	if not frames_dir_path.exists():
		frames_dir_path.mkdir()

	initial_frame: Path = vtf(
		video_path=Path(video_path),
		frames_dir=frames_dir_path,
		start_frame_number=start_frame,
		end_frame_number=end_frame,
		every=every,
		overwrite=overwrite,
		resize_factor=resize_factor,
		undistort=undistort,
		profile_path=profile_path,
	)

	result: dict = {"initial_frame": str(initial_frame)}

	if stabilize:
		regions_path = Path(stabilization_regions)
		stabilized_dir = frames_dir_path.parent / (frames_dir_path.name + "_stabilized")

		if ctx.obj["verbose"]:
			click.echo(f"Stabilizing frames into '{stabilized_dir}' ...")

		sanity_path = stabilize_frames(frames_dir_path, regions_path, stabilized_dir)
		sanity_dest = frames_dir_path.parent / "sanity_check.jpg"
		shutil.move(str(sanity_path), str(sanity_dest))

		if replace:
			for f in frames_dir_path.glob("*.jpg"):
				f.unlink()
			for f in stabilized_dir.glob("*.jpg"):
				shutil.move(str(f), str(frames_dir_path / f.name))
			shutil.rmtree(stabilized_dir)
		else:
			result["stabilized_dir"] = str(stabilized_dir)

		result["sanity_check"] = str(sanity_dest)

	return result
