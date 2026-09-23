"""Resolve iWave parameters from data RIVeR already has.

Every iWave setting gets a value computed from the frame rate, clip length,
cross-section geometry, bathymetry and the LSPIV/STIV profiles produced earlier
in the same run. The rules follow the IWaVE author's advice (G. Dolcetti,
Sept 2026) and the 65-case benchmark in /Users/antoine/iwave/analysis.
See docs/superpowers/specs/2026-09-23-iwave-auto-parameters-design.md.

Created: 2026-09-23
Author: Antoine Patalano
"""
from dataclasses import dataclass
from typing import List, Optional, Sequence, Tuple

import numpy as np

GRAVITY = 9.81
# Dominant river wavelength: lambda = 2 pi U^2 / g (about 0.64 U^2)
WAVELENGTH_FACTOR = 2 * np.pi / GRAVITY

# A velocity source is trusted when at least this fraction of the considered
# stations has a value and its high percentile is not near zero.
TRUST_MIN_FRACTION = 0.5
TRUST_MIN_VELOCITY = 0.05
VELOCITY_PERCENTILE = 90
VELOCITY_SOURCES = (
	("lspiv", "streamwise_velocity_magnitude"),
	("stiv", "stiv_velocity_profile"),
)

SMAX_FACTOR = 2.0
SMAX_MIN = 1.5
SMAX_MAX = 5.0
SMAX_FALLBACK = 5.0
SMAX_RERUN_FRACTION = 0.9

WINDOW_WAVELENGTHS = 4.0
WINDOW_MIN_M = 2.0
WINDOW_MAX_M = 6.0
WINDOW_ABS_MIN_M = 1.5
WINDOW_FALLBACK_M = 2.5
WINDOW_TARGET_PX = 48
WINDOW_MIN_PX = 32
WINDOW_MAX_PX = 64
RESOLUTION_MIN = 0.05
# Ortho grid side cap in pixels: keeps the (frames, H, W) stack in memory
MAX_GRID = 700

LONG_CLIP_S = 20.0
TIME_SIZE_LONG_S = 10.0
TIME_SIZE_SHORT_S = 5.0

DEPTH_RANGE_LOW = 0.5
DEPTH_RANGE_HIGH = 2.0
DEPTH_MIN_LOW = 0.05
DEPTH_MIN_HIGH = 0.10
DEPTH_FALLBACK = (0.01, 3.0)
DEPTH_AT_BOUND_TOLERANCE = 0.02

DRY_WINDOW_FRACTION = 0.5
SUPERCRITICAL_FROUDE = 1.2

QUALITY_MIN = 0.8
QUALITY_NEIGHBOUR_DROP = 0.05
QUALITY_NEIGHBOURS = 2

FLOW_TYPES = ("auto", "waves", "no-waves")
DEPTH_MODES = ("range", "fixed", "free")


@dataclass(frozen=True)
class VelocityEstimate:
	"""Scene velocity estimate used to tune iWave.

	Attributes:
		u_est (Optional[float]): High-percentile streamwise speed (m/s), or None when no source is trusted.
		sources (Tuple[str, ...]): Names of the trusted sources ("lspiv", "stiv").
	"""
	u_est: Optional[float]
	sources: Tuple[str, ...]


@dataclass(frozen=True)
class IwaveOptions:
	"""User overrides. None means the parameter is computed automatically.

	Attributes:
		window_size (Optional[float]): Window side in metres.
		smax (Optional[float]): Velocity search bound in m/s.
		flow_type (str): "auto", "waves" or "no-waves". (default: "auto")
		penalty_weight (float): iWave velocity penalty weight. (default: 1.0)
		depth_mode (str): "range", "fixed" or "free". (default: "range")
	"""
	window_size: Optional[float] = None
	smax: Optional[float] = None
	flow_type: str = "auto"
	penalty_weight: float = 1.0
	depth_mode: str = "range"

	def __post_init__(self) -> None:
		if self.flow_type not in FLOW_TYPES:
			raise ValueError(f"flow_type must be one of {FLOW_TYPES}, got {self.flow_type!r}")
		if self.depth_mode not in DEPTH_MODES:
			raise ValueError(f"depth_mode must be one of {DEPTH_MODES}, got {self.depth_mode!r}")


def get_section_items(xsections: dict) -> List[dict]:
	"""Return the cross-section dicts, skipping the "summary" entry.

	Args:
		xsections (dict): RIVeR cross-sections.

	Returns:
		List[dict]: One dict per cross-section.
	"""
	return [section for key, section in xsections.items() if key != "summary" and isinstance(section, dict)]


def to_float_array(values: Optional[Sequence]) -> Optional[np.ndarray]:
	"""Convert a per-station list to float64, mapping None to NaN.

	Values that went through JSON come back as None instead of NaN; without the
	explicit mapping numpy would build a dtype=object array.

	Args:
		values (Optional[Sequence]): Per-station values or None.

	Returns:
		Optional[np.ndarray]: Float array, or None when values is None.
	"""
	if values is None:
		return None
	return np.array([np.nan if value is None else value for value in values], dtype=np.float64)


def _get_station_count(section: dict) -> int:
	return len(section.get("id", section.get("east", [])))


def get_considered_stations(section: dict) -> np.ndarray:
	"""Stations that count for the estimates: checked by the user and wet.

	Args:
		section (dict): One cross-section.

	Returns:
		np.ndarray: Boolean mask, one entry per station.
	"""
	n_stations = _get_station_count(section)
	check = section.get("check")
	if check is None or len(check) != n_stations:
		mask = np.ones(n_stations, dtype=bool)
	else:
		mask = np.array(check, dtype=bool)
	depth = to_float_array(section.get("depth"))
	if depth is not None and len(depth) == n_stations:
		mask &= depth > 0
	return mask


def _get_trusted_percentile(xsections: dict, column: str) -> Optional[float]:
	n_considered = 0
	finite_values = []
	for section in get_section_items(xsections):
		mask = get_considered_stations(section)
		n_considered += int(mask.sum())
		values = to_float_array(section.get(column))
		if values is None or len(values) != len(mask):
			continue
		selected = np.abs(values[mask])
		finite_values.append(selected[np.isfinite(selected)])

	if n_considered == 0:
		return None
	all_finite = np.concatenate(finite_values) if finite_values else np.empty(0)
	if all_finite.size == 0 or all_finite.size < TRUST_MIN_FRACTION * n_considered:
		return None
	velocity = float(np.percentile(all_finite, VELOCITY_PERCENTILE))
	return velocity if velocity >= TRUST_MIN_VELOCITY else None


def estimate_velocity(xsections: dict) -> VelocityEstimate:
	"""Estimate the scene speed from the LSPIV and STIV profiles.

	The max of the trusted sources is used: overestimating only makes iWave a
	bit slower, while underestimating can put the true velocity outside the
	search bounds.

	Args:
		xsections (dict): Cross-sections after the LSPIV and STIV stages.

	Returns:
		VelocityEstimate: The estimate and the trusted sources.
	"""
	trusted = []
	for name, column in VELOCITY_SOURCES:
		velocity = _get_trusted_percentile(xsections, column)
		if velocity is not None:
			trusted.append((name, velocity))
	if not trusted:
		return VelocityEstimate(u_est=None, sources=())
	return VelocityEstimate(
		u_est=max(velocity for _, velocity in trusted),
		sources=tuple(name for name, _ in trusted),
	)


def get_station_velocity(section: dict, estimate: VelocityEstimate) -> np.ndarray:
	"""Per-station speed: max magnitude over the trusted sources.

	Args:
		section (dict): One cross-section.
		estimate (VelocityEstimate): Tells which sources are trusted.

	Returns:
		np.ndarray: Speed per station (m/s), NaN where no trusted source has a value.
	"""
	n_stations = _get_station_count(section)
	columns = dict(VELOCITY_SOURCES)
	stacked = []
	for name in estimate.sources:
		values = to_float_array(section.get(columns[name]))
		if values is not None and len(values) == n_stations:
			stacked.append(np.abs(values))
	if not stacked:
		return np.full(n_stations, np.nan)
	stacked = np.vstack(stacked)
	all_nan = np.all(np.isnan(stacked), axis=0)
	result = np.full(n_stations, np.nan)
	result[~all_nan] = np.nanmax(stacked[:, ~all_nan], axis=0)
	return result
