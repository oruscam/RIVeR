from pathlib import Path

import click

from river.cli.commands.utils import render_response
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
@click.pass_context
@render_response
def video_to_frames(
	ctx: click.Context,
	video_path: Path,
	frames_dir: Path,
	start_frame: int,
	end_frame: int,
	every: int,
	overwrite: bool,
	resize_factor: float,
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
	"""

	if ctx.obj["verbose"]:
		click.echo(f"Extracting frames from '{video_path}' ...")

	frames_dir = Path(frames_dir)

	if not frames_dir.exists():
		frames_dir.mkdir()

	initial_frame: Path = vtf(
		video_path=Path(video_path),
		frames_dir=frames_dir,
		start_frame_number=start_frame,
		end_frame_number=end_frame,
		every=every,
		overwrite=overwrite,
		resize_factor=resize_factor,
	)
	return {"initial_frame": str(initial_frame)}
