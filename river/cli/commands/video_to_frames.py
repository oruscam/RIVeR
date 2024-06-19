import json
from pathlib import Path

import click

from river.core.video_to_frames import video_to_frames as vtf


@click.command(help="Transforms the given video to frames and return the initial frame path.")
@click.argument("video-path", type=click.Path(exists=True))
@click.argument("frames-dir", type=click.Path())
@click.option("--start-frame", type=int, default=0, help="Frame number to start.")
@click.option("--end-frame", type=int, default=None, help="Frame number to end.")
@click.option("--every", type=int, default=1, help="Step to extract frames.")
@click.option("--chunk-size", type=int, default=100, help="Size of the frames chunk.")
@click.option("--overwrite", is_flag=True, help="Overwrite frames if exists.")
@click.pass_context
def video_to_frames(
	ctx: click.Context,
	video_path: Path,
	frames_dir: Path,
	start_frame: int,
	end_frame: int,
	every: int,
	chunk_size: int,
	overwrite: bool,
):
	"""Command to process the given video into frames.

	Args:
		ctx (click.Context): Click context.
		video_path (Path): Path of the video to process.
		frames_dir (Path): Path of the directory to store the frames.
		start_frame (int): Frame number to start.
		end_frame (int): Frame number to end.
		every (int): Step to extract frames.
		chunk_size (int): Size of the frames chunk.
		overwrite (bool): Overwrite frames if exists.
	"""

	if ctx.obj["verbose"]:
		click.echo(f"Extracting frames from '{video_path}' ...")

	initial_frame: Path = vtf(
		video_path=Path(video_path),
		frames_dir=Path(frames_dir),
		start_frame_number=start_frame,
		end_frame_number=end_frame,
		every=every,
		chunk_size=chunk_size,
		overwrite=overwrite,
	)
	click.echo(json.dumps({"initial_frame": str(initial_frame)}))
