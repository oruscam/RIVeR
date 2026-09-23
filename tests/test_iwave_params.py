"""Tests for the iWave parameter rules (river/core/iwave_params.py)."""
import numpy as np
import pytest

from river.core.iwave_params import (
	IwaveOptions,
	SceneParams,
	VelocityEstimate,
	estimate_velocity,
	get_considered_stations,
	get_station_velocity,
	get_time_size,
	get_widest_wet_width,
	get_window_size,
	resolve_scene_params,
)


def _section(lspiv=None, stiv=None, depth=None, check=None, distance=None):
	n = len(next(v for v in (lspiv, stiv, depth, distance) if v is not None))
	section = {"id": list(range(1, n + 1))}
	if lspiv is not None:
		section["streamwise_velocity_magnitude"] = lspiv
	if stiv is not None:
		section["stiv_velocity_profile"] = stiv
	if depth is not None:
		section["depth"] = depth
	if check is not None:
		section["check"] = check
	if distance is not None:
		section["distance"] = distance
	return section


def test_considered_stations_excludes_unchecked_and_dry():
	section = _section(lspiv=[1, 1, 1, 1], depth=[0.5, 0.0, 0.8, 0.6], check=[True, True, True, False])
	assert get_considered_stations(section).tolist() == [True, False, True, False]


def test_considered_stations_without_depth_or_check_is_all():
	assert get_considered_stations(_section(lspiv=[1.0, 2.0])).tolist() == [True, True]


def test_estimate_velocity_uses_p90_of_lspiv():
	lspiv = [0.1 * i for i in range(1, 11)]  # 0.1 .. 1.0
	estimate = estimate_velocity({"CS1": _section(lspiv=lspiv)})
	assert estimate.sources == ("lspiv",)
	assert estimate.u_est == pytest.approx(np.percentile(lspiv, 90))


def test_estimate_velocity_rejects_low_coverage():
	# 2 of 5 finite: below the 50 % trust threshold
	estimate = estimate_velocity({"CS1": _section(lspiv=[1.0, 1.2, None, None, None])})
	assert estimate == VelocityEstimate(u_est=None, sources=())


def test_estimate_velocity_rejects_near_zero():
	estimate = estimate_velocity({"CS1": _section(lspiv=[0.01, 0.02, 0.01, 0.0])})
	assert estimate.u_est is None


def test_estimate_velocity_takes_max_of_trusted_sources():
	estimate = estimate_velocity({"CS1": _section(lspiv=[0.2, 0.2, 0.2], stiv=[-1.0, -1.0, -1.0])})
	assert estimate.sources == ("lspiv", "stiv")
	# STIV is signed; its magnitude must be used
	assert estimate.u_est == pytest.approx(1.0)


def test_estimate_velocity_stiv_only_when_lspiv_untrusted():
	estimate = estimate_velocity({"CS1": _section(lspiv=[None, None, None], stiv=[0.8, 0.9, 1.0])})
	assert estimate.sources == ("stiv",)


def test_estimate_velocity_reads_json_nulls():
	# Values round-trip through JSON as None; they must count as NaN, not crash
	estimate = estimate_velocity({"CS1": _section(lspiv=[None, 1.0, 1.0, 1.0])})
	assert estimate.u_est == pytest.approx(1.0)


def test_estimate_velocity_skips_summary_key():
	xsections = {"summary": {"total": 3}, "CS1": _section(lspiv=[1.0, 1.0])}
	assert estimate_velocity(xsections).u_est == pytest.approx(1.0)


def test_station_velocity_is_max_over_trusted_sources():
	section = _section(lspiv=[0.5, None, 1.0], stiv=[-0.7, 0.4, None])
	estimate = VelocityEstimate(u_est=1.0, sources=("lspiv", "stiv"))
	result = get_station_velocity(section, estimate)
	assert result.tolist() == pytest.approx([0.7, 0.4, 1.0])


def test_iwave_options_rejects_unknown_modes():
	with pytest.raises(ValueError):
		IwaveOptions(flow_type="fast")
	with pytest.raises(ValueError):
		IwaveOptions(depth_mode="guess")


NO_ESTIMATE = VelocityEstimate(u_est=None, sources=())


def _estimate(u):
	return VelocityEstimate(u_est=u, sources=("lspiv",))


def test_widest_wet_width_from_depth_runs():
	section = _section(depth=[-0.1, 0.5, 0.8, 0.0, 0.3, 0.4], distance=[0, 2, 4, 6, 8, 9])
	# runs: stations 1-2 (2 m) and 4-5 (1 m)
	assert get_widest_wet_width({"CS1": section}) == pytest.approx(2.0)


def test_widest_wet_width_none_without_fields():
	assert get_widest_wet_width({"CS1": _section(lspiv=[1.0])}) is None


def test_window_size_scales_with_wavelength():
	# U = 1 m/s -> lambda = 0.64 m -> 4 lambda = 2.56 m
	assert get_window_size(_estimate(1.0), {}, IwaveOptions()) == pytest.approx(4 * 2 * np.pi / 9.81)


def test_window_size_clamped_both_ends():
	assert get_window_size(_estimate(0.3), {}, IwaveOptions()) == pytest.approx(2.0)
	assert get_window_size(_estimate(3.0), {}, IwaveOptions()) == pytest.approx(6.0)


def test_window_size_capped_by_wet_width_but_not_below_floor():
	narrow = {"CS1": _section(depth=[0.5, 0.5], distance=[0.0, 1.0])}  # 1 m wide
	assert get_window_size(_estimate(2.0), narrow, IwaveOptions()) == pytest.approx(1.5)
	medium = {"CS1": _section(depth=[0.5, 0.5], distance=[0.0, 3.0])}
	assert get_window_size(_estimate(2.0), medium, IwaveOptions()) == pytest.approx(3.0)


def test_window_size_fallback_and_override():
	assert get_window_size(NO_ESTIMATE, {}, IwaveOptions()) == pytest.approx(2.5)
	assert get_window_size(_estimate(1.0), {}, IwaveOptions(window_size=4.2)) == pytest.approx(4.2)


def test_time_size_long_and_short_clips():
	assert get_time_size(n_frames=900, fps_eff=30.0) == 300  # 30 s clip -> 10 s
	assert get_time_size(n_frames=450, fps_eff=30.0) == 150  # 15 s clip -> 5 s


def test_time_size_capped_at_available_frames():
	# 3 s clip: 5 s would need 150 frames; only 91 exist -> largest even value
	assert get_time_size(n_frames=91, fps_eff=30.0) == 90


def test_scene_params_from_estimate():
	scene = resolve_scene_params(_estimate(1.0), {}, n_frames=900, fps_eff=30.0, span_m=20.0, options=IwaveOptions())
	assert scene.smax == pytest.approx(2.0)
	assert scene.smax_is_auto is True
	assert scene.resolution == pytest.approx(scene.window_m / 48)
	assert scene.window_px == 48
	assert scene.time_size == 300 and scene.time_overlap == 150
	assert scene.fps_eff == 30.0 and scene.penalty_weight == 1.0


def test_scene_params_smax_clamps_and_fallback():
	common = dict(xsections={}, n_frames=900, fps_eff=30.0, span_m=20.0, options=IwaveOptions())
	assert resolve_scene_params(_estimate(0.2), **common).smax == pytest.approx(1.5)
	assert resolve_scene_params(_estimate(4.0), **common).smax == pytest.approx(5.0)
	fallback = resolve_scene_params(NO_ESTIMATE, **common)
	assert fallback.smax == pytest.approx(5.0) and fallback.smax_is_auto is True


def test_scene_params_explicit_smax_is_not_auto():
	scene = resolve_scene_params(
		_estimate(1.0), {}, n_frames=900, fps_eff=30.0, span_m=20.0, options=IwaveOptions(smax=0.8),
	)
	assert scene.smax == pytest.approx(0.8) and scene.smax_is_auto is False


def test_resolution_floor_in_small_rivers():
	# W = 2 m -> 2/48 = 4.2 cm/px, below the 5 cm/px floor
	scene = resolve_scene_params(_estimate(0.3), {}, n_frames=900, fps_eff=30.0, span_m=10.0, options=IwaveOptions())
	assert scene.resolution == pytest.approx(0.05)
	assert scene.window_px == 40


def test_resolution_memory_guard_on_large_roi():
	scene = resolve_scene_params(_estimate(0.3), {}, n_frames=900, fps_eff=30.0, span_m=140.0, options=IwaveOptions())
	assert scene.resolution == pytest.approx(140.0 / 700)
	assert scene.window_px == 32  # 2 m / 0.2 m = 10 px, clamped up
