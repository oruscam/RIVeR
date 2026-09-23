"""Tests for the iWave parameter rules (river/core/iwave_params.py)."""
import numpy as np
import pytest

from river.core.iwave_params import (
	IwaveOptions,
	SceneParams,
	VelocityEstimate,
	build_params_record,
	estimate_velocity,
	get_considered_stations,
	get_depth_bounds,
	get_quality_flags,
	get_section_gravity_waves,
	get_station_velocity,
	get_time_size,
	get_widest_wet_width,
	get_window_depth_reference,
	get_window_size,
	is_depth_at_bound,
	is_dry_window,
	needs_smax_rerun,
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


def test_depth_reference_is_wet_mean_within_window():
	section = _section(depth=[0.0, 0.2, 1.0, 1.2, 3.0], distance=[0, 1, 2, 3, 6])
	# station 2 at 2 m, window 2.5 m -> distances within 0.75..3.25: stations 1..3, all wet
	assert get_window_depth_reference(section, 2, 2.5) == pytest.approx((0.2 + 1.0 + 1.2) / 3)


def test_depth_reference_without_depth_fields():
	assert get_window_depth_reference(_section(lspiv=[1.0]), 0, 2.5) is None


def test_depth_bounds_range_fixed_free():
	assert get_depth_bounds(1.0, "range") == pytest.approx((0.5, 2.0))
	assert get_depth_bounds(0.02, "range") == pytest.approx((0.05, 0.10))
	assert get_depth_bounds(1.0, "fixed") == pytest.approx((1.0, 1.0))
	assert get_depth_bounds(1.0, "free") == pytest.approx((0.01, 3.0))


def test_depth_bounds_fallback_without_reference():
	assert get_depth_bounds(None, "range") == pytest.approx((0.01, 3.0))
	assert get_depth_bounds(float("nan"), "fixed") == pytest.approx((0.01, 3.0))


def test_depth_at_bound():
	assert is_depth_at_bound(0.505, (0.5, 2.0)) is True
	assert is_depth_at_bound(1.98, (0.5, 2.0)) is True
	assert is_depth_at_bound(1.0, (0.5, 2.0)) is False
	assert is_depth_at_bound(1.0, (1.0, 1.0)) is False  # fixed depth is never "at a bound"


def test_dry_window_threshold():
	section = _section(depth=[-0.2, -0.1, 0.3, 0.5], distance=[0, 1, 2, 3])
	assert is_dry_window(section, 0, 2.0) is True  # stations 0,1 dry of 0,1 -> 100 %
	assert is_dry_window(section, 1, 2.0) is True  # stations 0,1,2 -> 2/3 dry
	assert is_dry_window(section, 2, 2.0) is False  # stations 1,2,3 -> 1/3 dry


def test_dry_window_without_depth_fields():
	assert is_dry_window(_section(lspiv=[1.0]), 0, 2.0) is False


def test_gravity_waves_auto_uses_median_froude():
	depth = [1.0, 1.0, 1.0]
	subcritical = _section(lspiv=[3.4, 3.4, 3.4], depth=depth)  # Fr = 3.4/3.13 = 1.09
	supercritical = _section(lspiv=[4.1, 4.1, 4.1], depth=depth)  # Fr = 1.31
	estimate = _estimate(4.1)
	assert get_section_gravity_waves(subcritical, estimate, "auto") is True
	assert get_section_gravity_waves(supercritical, estimate, "auto") is False


def test_gravity_waves_untrusted_estimate_keeps_waves():
	supercritical = _section(lspiv=[4.1, 4.1, 4.1], depth=[1.0, 1.0, 1.0])
	assert get_section_gravity_waves(supercritical, NO_ESTIMATE, "auto") is True


def test_gravity_waves_overrides():
	section = _section(lspiv=[4.1], depth=[1.0])
	assert get_section_gravity_waves(section, _estimate(4.1), "waves") is True
	assert get_section_gravity_waves(section, NO_ESTIMATE, "no-waves") is False


def _scene(smax=2.0, smax_is_auto=True):
	return SceneParams(
		smax=smax, smax_is_auto=smax_is_auto, window_m=2.4, window_px=48, resolution=0.05,
		time_size=100, time_overlap=50, fps_eff=20.0, penalty_weight=1.0,
	)


def test_needs_smax_rerun():
	assert needs_smax_rerun(1.85, 0.1, _scene()) is True
	assert needs_smax_rerun(1.0, -1.0, _scene()) is False
	assert needs_smax_rerun(1.85, 0.1, _scene(smax_is_auto=False)) is False
	assert needs_smax_rerun(4.8, 0.0, _scene(smax=5.0)) is False  # already at the ceiling
	assert needs_smax_rerun(float("nan"), float("nan"), _scene()) is False


def test_quality_flags_threshold_and_neighbours():
	quality = [0.9, 0.91, 0.84, 0.9, 0.7, None]
	# station 2: 0.84 >= 0.8 but its neighbours' median (0.9) - 0.05 = 0.85 > 0.84 -> False
	# station 4: below 0.8 -> False; station 5: no quality -> None
	assert get_quality_flags(quality) == [True, True, False, True, False, None]


def test_quality_flags_single_station_uses_absolute_rule_only():
	assert get_quality_flags([0.81]) == [True]


def test_params_record_is_json_ready():
	import json

	record = build_params_record(
		_scene(), _estimate(1.0), IwaveOptions(), window_px=48, window_m=2.4, time_size=100,
		gravity_waves=True, depth_at_bound=1, smax_reruns=0, skipped_dry=2,
	)
	json.dumps(record)
	assert record["mode"] == {"smax": "auto", "window": "auto", "flow_type": "auto", "depth": "free"}
	assert record["u_est"] == 1.0 and record["u_sources"] == ["lspiv"]
	assert record["window_px"] == 48 and record["skipped_dry"] == 2


def test_time_size_uses_full_clip_length_when_frames_are_capped():
	# 40 s clip at 30 fps, only 512 frames warped: still a long clip -> 10 s segments
	assert get_time_size(n_frames=512, fps_eff=30.0, clip_duration_s=40.0) == 300


def test_depth_mode_defaults_to_free():
	# Benchmark 2026-09-23: bathymetry-bounded depth railed on most stations and
	# biased the velocity; free depth matched LSPIV better in 3 of 3 informative cases
	assert IwaveOptions().depth_mode == "free"
