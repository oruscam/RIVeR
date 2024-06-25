import json
from dataclasses import asdict, dataclass, field
from functools import update_wrapper
from typing import Callable

import click

from river.core.exceptions import RiverCoreException


@dataclass(frozen=True)
class RiverResponse:
	"""Object that represents a RIVeR response"""

	data: dict = field(
		default_factory=dict,
	)
	error: dict = field(default_factory=dict)


def render_response(func: Callable[..., dict]):
	"""Decorator for echoing the output of the river commands.

	Args:
		func (callable): Command function to call.
	"""

	def inner(*args, **kwargs):
		try:
			response = RiverResponse(data=func(*args, **kwargs))
		except RiverCoreException as river_err:
			response = RiverResponse(error={"message": str(river_err)})
		except Exception as err:
			message = f"Unexpected error: {err}"
			response = RiverResponse(error={"message": message})

		click.echo(json.dumps(asdict(response)))

	return update_wrapper(inner, func)
