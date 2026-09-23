"""Shared --iwave-* options for the commands that run iWave.

Created: 2026-09-23
Author: Antoine Patalano
"""
from typing import Callable, Optional

import click

from river.core.iwave_params import DEPTH_MODES, FLOW_TYPES, IwaveOptions


class AutoOrPositiveFloat(click.ParamType):
	"""Accept "auto" (any case), returned as None, or a positive number."""

	name = "auto|number"

	def convert(self, value, param, ctx) -> Optional[float]:
		if value is None or (isinstance(value, str) and value.strip().lower() == "auto"):
			return None
		try:
			number = float(value)
		except (TypeError, ValueError):
			self.fail(f"{value!r} is neither 'auto' nor a number", param, ctx)
		if number <= 0:
			self.fail(f"{value!r} must be greater than 0", param, ctx)
		return number


def iwave_option_flags(func: Callable) -> Callable:
	"""Add the five --iwave-* options to a click command.

	Args:
		func (Callable): Command function.

	Returns:
		Callable: The decorated command function.
	"""
	decorators = [
		click.option("--iwave-window-size", type=AutoOrPositiveFloat(), default="auto", show_default=True,
			help="iWave window side in metres, or 'auto' (computed from the LSPIV/STIV speed)."),
		click.option("--iwave-smax", type=AutoOrPositiveFloat(), default="auto", show_default=True,
			help="iWave maximum velocity in m/s, or 'auto'."),
		click.option("--iwave-flow-type", type=click.Choice(FLOW_TYPES), default="auto", show_default=True,
			help="'no-waves' ignores gravity waves (supercritical flow); 'auto' decides from the Froude number."),
		click.option("--iwave-penalty-weight", type=click.FloatRange(min=0), default=1.0, show_default=True,
			help="iWave velocity penalty weight; 1.5-2 can help with foam or whitewater."),
		click.option("--iwave-depth-mode", type=click.Choice(DEPTH_MODES), default="free", show_default=True,
			help="Depth search: 'free' (0.01-3 m), 'range' around the surveyed depth, or 'fixed' to it."),
	]
	for decorator in reversed(decorators):
		func = decorator(func)
	return func


def build_iwave_options(
	iwave_window_size: Optional[float],
	iwave_smax: Optional[float],
	iwave_flow_type: str,
	iwave_penalty_weight: float,
	iwave_depth_mode: str,
) -> IwaveOptions:
	"""Turn parsed CLI values into IwaveOptions.

	Args:
		iwave_window_size (Optional[float]): Window side (m), None for auto.
		iwave_smax (Optional[float]): Max velocity (m/s), None for auto.
		iwave_flow_type (str): Flow type.
		iwave_penalty_weight (float): Penalty weight.
		iwave_depth_mode (str): Depth mode.

	Returns:
		IwaveOptions: Options for the core pipeline.
	"""
	return IwaveOptions(
		window_size=iwave_window_size,
		smax=iwave_smax,
		flow_type=iwave_flow_type,
		penalty_weight=iwave_penalty_weight,
		depth_mode=iwave_depth_mode,
	)
