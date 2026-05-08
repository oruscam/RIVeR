import json
from dataclasses import asdict, dataclass, field
from functools import update_wrapper
from typing import Callable
from pathlib import Path
import click

from river.cli.commands.exceptions import RiverCLIException
from river.core.exceptions import RiverCoreException
import numpy as np


@dataclass(frozen=True)
class RiverResponse:
	"""Object that represents a RIVeR response"""

	data: dict = field(
		default_factory=dict,
	)
	error: dict = field(default_factory=dict)


def load_mask(path:Path) -> np.ndarray:
	"""Load a mask from .npy (new format) or .json (old format) file."""
	if path.suffix == ".npy":
		return np.load(path).astype(np.uint8)
	with path.open("r", encoding="utf-8") as f:
		return np.array(json.load(f), dtype=np.uint8)

def render_response(func: Callable[..., dict]):
	"""Decorator for echoing the output of the river commands.

	Args:
		func (callable): Command function to call.
	"""

	def inner(*args, **kwargs):
		try:
			response = RiverResponse(data=func(*args, **kwargs))
		except (RiverCoreException, RiverCLIException) as river_err:
			response = RiverResponse(error={"message": str(river_err)})
		except Exception as err:
			message = f"Unexpected error: {err}"
			response = RiverResponse(error={"message": message})

		click.echo(json.dumps(asdict(response)))

	return update_wrapper(inner, func)
