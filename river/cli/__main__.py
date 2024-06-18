import click
from river.core.utils import say_hello_to


@click.group
def cli():
	pass


@cli.command
def hello():
	click.echo(say_hello_to("RIVeR"))


if __name__ == "__main__":
	cli()
