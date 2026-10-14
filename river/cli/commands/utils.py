import json
import os
import sys
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

		# Force an immediate, clean process exit right after the JSON response
		# has been fully printed. Some CLI commands (anything touching the
		# third-party `iwave` package's ProcessPoolExecutor) segfault during
		# normal Python interpreter shutdown (atexit/GC teardown) even though
		# all real work (writing files, printing this response) has already
		# completed successfully. os._exit() skips that teardown entirely,
		# bypassing the native-library crash. Flush stdout/stderr first since
		# os._exit() does not flush Python-buffered output on the way out.
		#
		# This is safe in production because every CLI invocation from the GUI
		# runs as its own OS subprocess (executeRiverCli.ts spawns `python -m
		# river.cli ...`) — os._exit() only ever kills that one short-lived
		# process. But tests exercise commands in-process via Click's
		# CliRunner.invoke(), which runs `inner()` inside the pytest process
		# itself; an unconditional os._exit(0) there kills the entire test run
		# silently (no traceback, no failing test — pytest just stops). Skip it
		# under test, where RIVER_CLI_TESTING is set once by tests/conftest.py.
		if os.environ.get("RIVER_CLI_TESTING"):
			return
		sys.stdout.flush()
		sys.stderr.flush()
		os._exit(0)

	return update_wrapper(inner, func)
