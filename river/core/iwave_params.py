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

# Automatic window: a 2.5 m target on the ROI-sized grid. In a 62-case LSPIV/STIV
# benchmark (2026-09-23), wavelength-sized windows (4 lambda, 2-6 m) spanned
# several stations and flattened the cross-section profile.
AUTO_WINDOW_M = 2.5
# A user-set window is cut at about this many pixels, coarsening the grid if needed
WINDOW_TARGET_PX = 48
WINDOW_MIN_PX = 32
WINDOW_MAX_PX = 64
RESOLUTION_MIN = 0.05
# Ortho grid side cap in pixels: keeps the (frames, H, W) stack in memory
MAX_GRID = 700

LONG_CLIP_S = 20.0
TIME_SIZE_LONG_S = 10.0
TIME_SIZE_SHORT_S = 5.0

# Below this many seconds of frames seen by iWave, the GUI shows a "results may
# be noisier" note. A 2026-09-23 sweep (15 cases cut to 2-20 s) found no failure
# threshold, only more noise under about 5 s.
SHORT_CLIP_S = 5.0

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
		depth_mode (str): "free", "range" or "fixed". (default: "free")
	"""
	window_size: Optional[float] = None
	smax: Optional[float] = None
	flow_type: str = "auto"
	penalty_weight: float = 1.0
	depth_mode: str = "free"

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


@dataclass(frozen=True)
class SceneParams:
	"""iWave parameters shared by every cross-section of one run.

	Attributes:
		smax (float): Velocity search bound (m/s).
		smax_is_auto (bool): False when the user set smax; disables the rerun check.
		window_m (float): Window side actually cut, window_px · resolution (m).
		window_px (int): Window side in ortho pixels (even).
		resolution (float): Ortho grid resolution (m/px).
		time_size (int): Frames per spectral segment (even).
		time_overlap (int): Overlap between segments (frames).
		fps_eff (float): Frame rate of the extracted frames (fps / step).
		penalty_weight (float): iWave velocity penalty weight.
	"""
	smax: float
	smax_is_auto: bool
	window_m: float
	window_px: int
	resolution: float
	time_size: int
	time_overlap: int
	fps_eff: float
	penalty_weight: float


def get_time_size(n_frames: int, fps_eff: float, clip_duration_s: Optional[float] = None) -> int:
	"""Frames per spectral segment: about 10 s, or 5 s for clips under 20 s.

	The 10 s / 5 s switch follows the recording length, not the number of
	frames warped: frames are capped (MAX_FRAMES), and at 30 fps the capped
	count alone would always look like a short clip.

	Args:
		n_frames (int): Frames available after capping.
		fps_eff (float): Frame rate of the extracted frames.
		clip_duration_s (Optional[float]): Full clip length in seconds.
			(default: n_frames / fps_eff)

	Returns:
		int: Even number of frames, at most n_frames.
	"""
	duration_s = clip_duration_s if clip_duration_s is not None else n_frames / fps_eff
	segment_s = TIME_SIZE_LONG_S if duration_s >= LONG_CLIP_S else TIME_SIZE_SHORT_S
	frames = min(int(round(segment_s * fps_eff)), n_frames)
	return max(2, frames - frames % 2)


def get_window_geometry(span_m: float, options: IwaveOptions) -> Tuple[float, int]:
	"""Ortho resolution and window side in pixels.

	The automatic window keeps the ROI-sized grid (span / MAX_GRID) and cuts
	AUTO_WINDOW_M on it, within [WINDOW_MIN_PX, WINDOW_MAX_PX]. A user-set window
	instead coarsens the grid so the requested size fits in about
	WINDOW_TARGET_PX pixels, with a resolution floor of RESOLUTION_MIN.

	A user-set window equal to what automatic mode currently resolves to is an
	exception: it reuses the automatic geometry exactly, rather than recomputing
	through the coarser WINDOW_TARGET_PX/RESOLUTION_MIN rule. Without this, the
	GUI's "freeze exactly as shown" (all three iWave values frozen together once
	any one is edited) would silently change the window whenever the automatic
	one falls under WINDOW_MIN_PX * RESOLUTION_MIN = 1.6 m, e.g. 0.82 m -> 1.6 m.

	Args:
		span_m (float): Largest side of the ortho extent (m).
		options (IwaveOptions): User overrides.

	Returns:
		Tuple[float, int]: Resolution (m/px) and even window side (px).
	"""
	auto_resolution = span_m / MAX_GRID
	auto_window_px = int(np.clip(round(AUTO_WINDOW_M / auto_resolution / 2) * 2, WINDOW_MIN_PX, WINDOW_MAX_PX))
	if options.window_size is None:
		return auto_resolution, auto_window_px

	window_m = float(options.window_size)
	auto_window_m = auto_window_px * auto_resolution
	if np.isclose(window_m, auto_window_m, rtol=1e-9, atol=1e-9):
		return auto_resolution, auto_window_px

	resolution = max(window_m / WINDOW_TARGET_PX, RESOLUTION_MIN, span_m / MAX_GRID)
	window_px = int(np.clip(round(window_m / resolution / 2) * 2, WINDOW_MIN_PX, WINDOW_MAX_PX))
	return resolution, window_px


def resolve_scene_params(
	estimate: VelocityEstimate,
	n_frames: int,
	fps_eff: float,
	span_m: float,
	options: IwaveOptions,
	clip_duration_s: Optional[float] = None,
) -> SceneParams:
	"""Compute the scene-wide iWave parameters.

	Args:
		estimate (VelocityEstimate): Scene velocity estimate.
		n_frames (int): Frames that will be warped (already capped).
		fps_eff (float): Frame rate of the extracted frames.
		span_m (float): Largest side of the ortho extent (m).
		options (IwaveOptions): User overrides.
		clip_duration_s (Optional[float]): Full clip length in seconds, before
			frame capping. (default: n_frames / fps_eff)

	Returns:
		SceneParams: Resolved parameters.
	"""
	if options.smax is not None:
		smax, smax_is_auto = float(options.smax), False
	elif estimate.u_est is None:
		smax, smax_is_auto = SMAX_FALLBACK, True
	else:
		smax, smax_is_auto = float(np.clip(SMAX_FACTOR * estimate.u_est, SMAX_MIN, SMAX_MAX)), True

	resolution, window_px = get_window_geometry(span_m, options)
	window_m = window_px * resolution
	time_size = get_time_size(n_frames, fps_eff, clip_duration_s)

	return SceneParams(
		smax=smax,
		smax_is_auto=smax_is_auto,
		window_m=window_m,
		window_px=window_px,
		resolution=resolution,
		time_size=time_size,
		time_overlap=time_size // 2,
		fps_eff=fps_eff,
		penalty_weight=float(options.penalty_weight),
	)


def _get_window_mask(section: dict, station_index: int, window_m: float) -> Optional[np.ndarray]:
	distance = to_float_array(section.get("distance"))
	if distance is None or station_index >= len(distance):
		return None
	return np.abs(distance - distance[station_index]) <= window_m / 2


def _get_depth(section: dict, n_expected: int) -> Optional[np.ndarray]:
	depth = to_float_array(section.get("depth"))
	if depth is None or len(depth) != n_expected:
		return None
	return depth


def get_window_depth_reference(section: dict, station_index: int, window_m: float) -> Optional[float]:
	"""Mean surveyed depth of the wet stations inside the window.

	The window is 2-6 m wide; near banks the centre depth can be close to zero
	while most of the window is deeper, so the mean describes it better.

	Args:
		section (dict): Cross-section with "distance" and "depth".
		station_index (int): Station at the window centre.
		window_m (float): Window side (m).

	Returns:
		Optional[float]: Depth (m), or None when unavailable.
	"""
	in_window = _get_window_mask(section, station_index, window_m)
	if in_window is None:
		return None
	depth = _get_depth(section, len(in_window))
	if depth is None:
		return None
	wet = in_window & (depth > 0)
	if not wet.any():
		return None
	return float(depth[wet].mean())


def get_depth_bounds(depth_reference: Optional[float], depth_mode: str) -> Tuple[float, float]:
	"""Depth search bounds for iWave.

	Args:
		depth_reference (Optional[float]): Surveyed depth for the window (m).
		depth_mode (str): "range", "fixed" or "free".

	Returns:
		Tuple[float, float]: (min, max) depth in metres.
	"""
	if depth_mode == "free" or depth_reference is None or not np.isfinite(depth_reference) or depth_reference <= 0:
		return DEPTH_FALLBACK
	if depth_mode == "fixed":
		return (depth_reference, depth_reference)
	return (
		max(DEPTH_RANGE_LOW * depth_reference, DEPTH_MIN_LOW),
		max(DEPTH_RANGE_HIGH * depth_reference, DEPTH_MIN_HIGH),
	)


def is_depth_at_bound(depth: float, bounds: Tuple[float, float]) -> bool:
	"""Whether the fitted depth sits on a search bound (hint of bad bathymetry).

	Args:
		depth (float): Fitted depth (m).
		bounds (Tuple[float, float]): Search bounds used.

	Returns:
		bool: True when within 2 % of either bound. Always False for a fixed depth.
	"""
	low, high = bounds
	if low == high or not np.isfinite(depth):
		return False
	return bool(
		abs(depth - low) <= DEPTH_AT_BOUND_TOLERANCE * low
		or abs(depth - high) <= DEPTH_AT_BOUND_TOLERANCE * high
	)


def is_dry_window(section: dict, station_index: int, window_m: float) -> bool:
	"""Whether most of the window is dry, so the fit would be meaningless.

	Args:
		section (dict): Cross-section with "distance" and "depth".
		station_index (int): Station at the window centre.
		window_m (float): Window side (m).

	Returns:
		bool: True when more than half of the stations inside the window are dry.
	"""
	in_window = _get_window_mask(section, station_index, window_m)
	if in_window is None:
		return False
	depth = _get_depth(section, len(in_window))
	if depth is None:
		return False
	known = in_window & np.isfinite(depth)
	if not known.any():
		return False
	dry_fraction = float((depth[known] <= 0).sum()) / float(known.sum())
	return dry_fraction > DRY_WINDOW_FRACTION


def get_section_gravity_waves(section: dict, estimate: VelocityEstimate, flow_type: str) -> bool:
	"""Whether iWave should model gravity waves for this section.

	In auto mode waves are only turned off for clearly supercritical flow with a
	trusted estimate; any doubt keeps them on, which is the safe default.

	Args:
		section (dict): Cross-section.
		estimate (VelocityEstimate): Scene velocity estimate.
		flow_type (str): "auto", "waves" or "no-waves".

	Returns:
		bool: Value for iWave's gravity_waves_switch.
	"""
	if flow_type == "waves":
		return True
	if flow_type == "no-waves":
		return False
	if estimate.u_est is None:
		return True
	velocity = get_station_velocity(section, estimate)
	depth = _get_depth(section, len(velocity))
	if depth is None:
		return True
	usable = get_considered_stations(section) & np.isfinite(velocity) & (depth > 0)
	if not usable.any():
		return True
	froude = velocity[usable] / np.sqrt(GRAVITY * depth[usable])
	return not float(np.median(froude)) > SUPERCRITICAL_FROUDE


def needs_smax_rerun(vx: float, vy: float, scene: SceneParams) -> bool:
	"""Whether a station's result is pinned against an auto smax that may be too low.

	Args:
		vx (float): Fitted x velocity (m/s).
		vy (float): Fitted y velocity (m/s).
		scene (SceneParams): Scene parameters used for the fit.

	Returns:
		bool: True when the station should be rerun with smax = SMAX_MAX.
	"""
	if not scene.smax_is_auto or scene.smax >= SMAX_MAX:
		return False
	if not (np.isfinite(vx) and np.isfinite(vy)):
		return False
	return max(abs(vx), abs(vy)) >= SMAX_RERUN_FRACTION * scene.smax


def get_quality_flags(quality: Sequence[Optional[float]]) -> List[Optional[bool]]:
	"""Flag stations whose iWave quality is acceptable.

	A station passes when its quality is at least QUALITY_MIN and not clearly
	below its neighbours (the IWaVE author's outlier check).

	Args:
		quality (Sequence[Optional[float]]): iWave quality per station.

	Returns:
		List[Optional[bool]]: Flag per station, None where there is no quality.
	"""
	values = to_float_array(quality)
	flags: List[Optional[bool]] = []
	for index, value in enumerate(values):
		if not np.isfinite(value):
			flags.append(None)
			continue
		start = max(0, index - QUALITY_NEIGHBOURS)
		stop = min(len(values), index + QUALITY_NEIGHBOURS + 1)
		neighbours = np.delete(values[start:stop], index - start)
		neighbours = neighbours[np.isfinite(neighbours)]
		is_valid = value >= QUALITY_MIN
		if neighbours.size:
			is_valid = is_valid and value >= float(np.median(neighbours)) - QUALITY_NEIGHBOUR_DROP
		flags.append(bool(is_valid))
	return flags


def build_params_record(
	scene: SceneParams,
	estimate: VelocityEstimate,
	options: IwaveOptions,
	window_px: int,
	window_m: float,
	time_size: int,
	gravity_waves: bool,
	depth_at_bound: int,
	smax_reruns: int,
	skipped_dry: int,
	skipped_masked: int = 0,
) -> dict:
	"""JSON-ready record of the parameters actually used for one section.

	window_px, window_m and time_size are the values after the pipeline fitted
	them to the stack, which can be smaller than the scene targets.

	Args:
		scene (SceneParams): Scene parameters.
		estimate (VelocityEstimate): Velocity estimate.
		options (IwaveOptions): User overrides.
		window_px (int): Window side used (px).
		window_m (float): Window side used (m).
		time_size (int): Segment length used (frames).
		gravity_waves (bool): Gravity wave switch used for the section.
		depth_at_bound (int): Stations whose depth hit a bound.
		smax_reruns (int): Stations rerun with smax = SMAX_MAX.
		skipped_dry (int): Stations skipped as dry.
		skipped_masked (int): Stations skipped because their whole window is masked.

	Returns:
		dict: Plain Python values only.
	"""
	return {
		"mode": {
			"smax": "auto" if options.smax is None else "user",
			"window": "auto" if options.window_size is None else "user",
			"flow_type": options.flow_type,
			"depth": options.depth_mode,
		},
		"u_est": None if estimate.u_est is None else float(estimate.u_est),
		"u_sources": list(estimate.sources),
		"smax": float(scene.smax),
		"window_m": float(window_m),
		"window_px": int(window_px),
		"resolution": float(scene.resolution),
		"time_size": int(time_size),
		"time_overlap": int(time_size // 2),
		"fps_eff": float(scene.fps_eff),
		"penalty_weight": float(scene.penalty_weight),
		"gravity_waves": bool(gravity_waves),
		"depth_at_bound": int(depth_at_bound),
		"smax_reruns": int(smax_reruns),
		"skipped_dry": int(skipped_dry),
		"skipped_masked": int(skipped_masked),
	}
