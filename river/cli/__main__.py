import click

from river.cli.commands.video_to_frames import video_to_frames


@click.group
@click.option("-v", "--verbose", is_flag=True, help="Activate verbose mode.")
@click.pass_context
def cli(ctx: click.Context, verbose: bool):
	ctx.ensure_object(dict)
	ctx.obj["verbose"] = verbose


cli.add_command(video_to_frames)

if __name__ == "__main__":
	cli()
