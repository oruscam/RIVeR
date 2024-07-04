import click

import river.cli.commands.coordinate_transform as ct
from river.cli.commands.video_to_frames import video_to_frames


@click.group
@click.option("-v", "--verbose", is_flag=True, help="Activate verbose mode.")
@click.pass_context
def cli(ctx: click.Context, verbose: bool):
	ctx.ensure_object(dict)
	ctx.obj["verbose"] = verbose


cli.add_command(video_to_frames)
cli.add_command(ct.get_uav_transformation_matrix)
cli.add_command(ct.transform_pixel_to_real_world)
cli.add_command(ct.transform_real_world_to_pixel)

if __name__ == "__main__":
	cli()
