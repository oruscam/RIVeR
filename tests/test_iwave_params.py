"""Tests for the iWave parameter rules (river/core/iwave_params.py)."""
import numpy as np
import pytest

from river.core.iwave_params import (
	IwaveOptions,
	VelocityEstimate,
	estimate_velocity,
	get_considered_stations,
	get_station_velocity,
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
