import copy
import hashlib
import json

import numpy as np
import pytest

from river.core.compute_section import _compute_geometry_hash, N_CACHE_POINTS
from river.core.compute_section import _compute_stats_cache
from river.core.compute_section import update_current_x_section


def _base_hash_inputs():
    return dict(
        east_l=100.0,
        north_l=200.0,
        east_r=110.0,
        north_r=200.0,
        level=5.0,
        left_station=0.0,
        step=1,
        fps=25.0,
        transformation_matrix=[[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    )


def test_geometry_hash_returns_string():
    h = _compute_geometry_hash(**_base_hash_inputs())
    assert isinstance(h, str)
    assert len(h) == 32  # MD5 hex digest


def test_geometry_hash_same_inputs_same_hash():
    h1 = _compute_geometry_hash(**_base_hash_inputs())
    h2 = _compute_geometry_hash(**_base_hash_inputs())
    assert h1 == h2


def test_geometry_hash_different_level_different_hash():
    inputs = _base_hash_inputs()
    h1 = _compute_geometry_hash(**inputs)
    inputs["level"] = 6.0
    h2 = _compute_geometry_hash(**inputs)
    assert h1 != h2


def test_geometry_hash_different_step_different_hash():
    inputs = _base_hash_inputs()
    h1 = _compute_geometry_hash(**inputs)
    inputs["step"] = 2
    h2 = _compute_geometry_hash(**inputs)
    assert h1 != h2


def test_geometry_hash_different_matrix_different_hash():
    inputs = _base_hash_inputs()
    h1 = _compute_geometry_hash(**inputs)
    inputs["transformation_matrix"] = [[2, 0, 0], [0, 1, 0], [0, 0, 1]]
    h2 = _compute_geometry_hash(**inputs)
    assert h1 != h2


def test_n_cache_points_is_200():
    assert N_CACHE_POINTS == 200


def _make_synthetic_piv(n_grid=5, n_frames=3, u_val=0.1):
    """5x5 pixel grid, uniform displacement, n_frames frames."""
    n = n_grid * n_grid
    xs = np.linspace(0, 4, n_grid)
    ys = np.linspace(0, 4, n_grid)
    X, Y = np.meshgrid(xs, ys)
    return {
        "x": X.flatten().tolist(),
        "y": Y.flatten().tolist(),
        "shape": [n_grid, n_grid],
        "u": [([u_val] * n)] * n_frames,
        "v": [([0.0] * n)] * n_frames,
        "gradient": [([0.5] * n)] * n_frames,
        "u_median": [u_val] * n,
        "v_median": [0.0] * n,
    }


def _make_identity_transform():
    """Transformation matrix: 1 pixel = 0.01 real-world unit."""
    return [[0.01, 0, 0], [0, 0.01, 0], [0, 0, 1]]


def _make_rw_to_xsection():
    """Identity rotation."""
    return np.eye(3)


def test_compute_stats_cache_output_shapes():
    piv = _make_synthetic_piv(n_grid=5, n_frames=3)
    T = np.array(_make_identity_transform())
    rw_to_xsection = _make_rw_to_xsection()
    dense_east = np.linspace(0.01, 0.03, N_CACHE_POINTS)
    dense_north = np.full(N_CACHE_POINTS, 0.02)
    time_between_frames = 0.04

    vel_frames, grad_frames = _compute_stats_cache(
        piv, T, rw_to_xsection, dense_east, dense_north, time_between_frames
    )

    assert vel_frames.shape == (3, N_CACHE_POINTS)
    assert grad_frames.shape == (3, N_CACHE_POINTS)


def test_compute_stats_cache_no_nan_in_covered_region():
    piv = _make_synthetic_piv(n_grid=5, n_frames=2)
    T = np.array(_make_identity_transform())
    rw_to_xsection = _make_rw_to_xsection()
    dense_east = np.linspace(0.005, 0.035, N_CACHE_POINTS)
    dense_north = np.full(N_CACHE_POINTS, 0.02)

    vel_frames, grad_frames = _compute_stats_cache(
        piv, T, rw_to_xsection, dense_east, dense_north, time_between_frames=0.04
    )

    assert not np.all(np.isnan(grad_frames))


from river.core.compute_section import _compute_stats_from_cache


def _make_cache_arrays(n_frames=10, n_cache=N_CACHE_POINTS, vel_val=1.0):
    vel = np.array([
        np.full(n_cache, vel_val + i * 0.01) for i in range(n_frames)
    ])
    grad = np.ones((n_frames, n_cache)) * 0.8
    return vel, grad


def test_compute_stats_from_cache_adds_required_keys():
    vel_frames, grad_frames = _make_cache_arrays(n_frames=10)
    dense_distances = np.linspace(0, 10, N_CACHE_POINTS)
    station_distances = np.linspace(0, 10, 15)

    table_results = {
        "distance": station_distances,
        "streamwise_velocity_magnitude": np.full(15, 1.05),
    }

    result = _compute_stats_from_cache(vel_frames, grad_frames, dense_distances, table_results)

    for key in ("minus_std", "plus_std", "5th_percentile", "95th_percentile", "seeded_vel_profile"):
        assert key in result, f"Missing key: {key}"
        assert len(result[key]) == 15


def test_compute_stats_from_cache_std_correct():
    n_frames = 20
    vel_frames, grad_frames = _make_cache_arrays(n_frames=n_frames, vel_val=2.0)
    dense_distances = np.linspace(0, 10, N_CACHE_POINTS)
    station_distances = np.linspace(0, 10, 10)

    table_results = {
        "distance": station_distances,
        "streamwise_velocity_magnitude": np.full(10, 2.095),
    }

    result = _compute_stats_from_cache(vel_frames, grad_frames, dense_distances, table_results)

    assert np.all(result["plus_std"] >= result["streamwise_velocity_magnitude"] - 1e-10)
    assert np.all(result["minus_std"] <= result["streamwise_velocity_magnitude"] + 1e-10)


def test_compute_stats_from_cache_percentiles_ordered():
    vel_frames, grad_frames = _make_cache_arrays(n_frames=50, vel_val=1.0)
    dense_distances = np.linspace(0, 5, N_CACHE_POINTS)
    station_distances = np.linspace(0, 5, 20)

    table_results = {
        "distance": station_distances,
        "streamwise_velocity_magnitude": np.full(20, 1.25),
    }

    result = _compute_stats_from_cache(vel_frames, grad_frames, dense_distances, table_results)

    assert np.all(result["5th_percentile"] <= result["95th_percentile"] + 1e-10)


# ---------------------------------------------------------------------------
# update_current_x_section — legacy `_stats_cache` migration
# ---------------------------------------------------------------------------
#
# These are integration-style tests of the whole function (not just an
# isolated helper) because the migration logic lives inline in
# update_current_x_section's body, ahead of a lot of unrelated geometry/PIV
# processing that the function insists on running regardless. To keep the
# fixture small and the tests fast, the fixture pre-supplies the "required
# stats" fields (minus_std, plus_std, 5th_percentile, 95th_percentile,
# seeded_vel_profile) at the correct length, which makes `stats_exist` True
# and `needs_statistics` False — this skips the whole
# recompute-and-possibly-overwrite-the-cache branch, so the migrated legacy
# cache entry in `stats_cache` is left untouched by the rest of the function
# and can be asserted on directly.


def _make_full_xsection_fixture(tmp_path, section_name="CS1", embed_legacy_cache=True):
    """Build a minimal-but-complete x_sections/piv_results/transformation_matrix
    triple that update_current_x_section can run to completion on."""
    bath_path = tmp_path / "bath.csv"
    bath_path.write_text(
        "station,level\n"
        "0,3.0\n"
        "0.01,2.0\n"
        "0.02,2.0\n"
        "0.03,3.0\n"
    )

    num_stations = 5
    section = {
        "bath": str(bath_path),
        "left_station": 0.0,
        "alpha": 0.85,
        "east_l": 0.005,
        "north_l": 0.02,
        "east_r": 0.035,
        "north_r": 0.02,
        "level": 2.5,
        "num_stations": num_stations,
        # Consumed by get_general_statistics's "total_W" special-case.
        "rw_length": 0.03,
        # Pre-populated so stats_exist=True and the recompute branch (which
        # would overwrite stats_cache[section_name]) is skipped.
        "minus_std": [0.0] * num_stations,
        "plus_std": [0.0] * num_stations,
        "5th_percentile": [0.0] * num_stations,
        "95th_percentile": [0.0] * num_stations,
        "seeded_vel_profile": [0.0] * num_stations,
    }
    if embed_legacy_cache:
        section["_stats_cache"] = {
            # Deliberately does not match _compute_geometry_hash's output for
            # this fixture, so IF the recompute path were reached it would
            # treat this as a miss rather than a hit. Not exercised in these
            # tests since stats_exist=True skips that branch entirely, but
            # kept garbage-looking to make that assumption explicit.
            "geometry_hash": "garbage-legacy-hash",
            "dense_distances": [0.0] * N_CACHE_POINTS,
            "streamwise_vel_frames": [[0.0] * N_CACHE_POINTS],
            "gradient_frames": [[0.0] * N_CACHE_POINTS],
        }

    x_sections = {section_name: section}
    piv_results = _make_synthetic_piv(n_grid=5, n_frames=3)
    transformation_matrix = _make_identity_transform()
    return x_sections, piv_results, transformation_matrix


def _call_update(x_sections, piv_results, transformation_matrix, stats_cache):
    return update_current_x_section(
        x_sections,
        piv_results,
        transformation_matrix,
        step=1,
        fps=25.0,
        id_section=0,
        interpolate=False,
        artificial_seeding=False,
        alpha=None,
        num_stations=None,
        stats_cache=stats_cache,
    )


def test_migration_pops_legacy_cache_and_populates_stats_cache(tmp_path):
    x_sections, piv, T = _make_full_xsection_fixture(tmp_path)
    legacy_cache_snapshot = copy.deepcopy(x_sections["CS1"]["_stats_cache"])
    stats_cache = {}

    _call_update(x_sections, piv, T, stats_cache)

    assert "_stats_cache" not in x_sections["CS1"]
    assert "CS1" in stats_cache
    # The migrated entry is the ORIGINAL legacy data, not a freshly
    # recomputed cache (stats_exist=True means recompute never runs).
    assert stats_cache["CS1"] == legacy_cache_snapshot


def test_migration_does_not_overwrite_existing_stats_cache_entry(tmp_path):
    x_sections, piv, T = _make_full_xsection_fixture(tmp_path)
    preexisting_entry = {
        "geometry_hash": "from-another-source",
        "dense_distances": [1.0, 2.0, 3.0],
        "streamwise_vel_frames": [[1.0, 2.0, 3.0]],
        "gradient_frames": [[1.0, 2.0, 3.0]],
    }
    stats_cache = {"CS1": copy.deepcopy(preexisting_entry)}

    _call_update(x_sections, piv, T, stats_cache)

    assert "_stats_cache" not in x_sections["CS1"]
    # Guard is `if legacy_cache is not None and current_x_section not in
    # stats_cache:` — since "CS1" was already present, the legacy embedded
    # cache must NOT clobber it.
    assert stats_cache["CS1"] == preexisting_entry


def test_no_legacy_cache_completes_without_error(tmp_path):
    x_sections, piv, T = _make_full_xsection_fixture(tmp_path, embed_legacy_cache=False)
    stats_cache = {}

    result = _call_update(x_sections, piv, T, stats_cache)

    assert "_stats_cache" not in x_sections["CS1"]
    assert "CS1" not in stats_cache
    assert result is not None


# ---------------------------------------------------------------------------
# STIV/iWave staleness on a Station Number change — update_current_x_section
# rebuilds geometry (id/east/north/distance/...) at the new num_stations by
# merging table_results into x_sections[current_x_section] key-by-key, but
# never itself computes STIV_COLUMNS/IWAVE_COLUMNS (those come only from
# run_full_analysis's STIV/iWave stages). Left alone, old per-station STIV/
# iWave arrays from a previous, differently-sized Analize run would silently
# survive the merge, misaligned against the newly-rebuilt station positions.
# ---------------------------------------------------------------------------

_STIV_IWAVE_COLUMNS = (
    "stiv_velocity_profile", "stiv_sigma_profile", "stiv_angle_profile", "stiv_sign_profile",
    "iwave_velocity_profile", "iwave_quality_profile", "iwave_depth_profile",
)


def _add_stiv_iwave_columns(x_sections, section_name="CS1"):
    n = x_sections[section_name]["num_stations"]
    for col in _STIV_IWAVE_COLUMNS:
        x_sections[section_name][col] = [0.5] * n


def test_num_stations_change_strips_stale_stiv_iwave_columns(tmp_path):
    x_sections, piv, T = _make_full_xsection_fixture(tmp_path)
    _add_stiv_iwave_columns(x_sections)  # populated at the fixture's num_stations=5

    result = update_current_x_section(
        x_sections, piv, T,
        step=1, fps=25.0, id_section=0,
        interpolate=False, artificial_seeding=False, alpha=None,
        num_stations=7,  # different from the fixture's 5 — the reported-bug scenario
        stats_cache={},
    )

    for col in _STIV_IWAVE_COLUMNS:
        assert col not in result["CS1"], f"{col} should have been dropped on a num_stations change"


def test_num_stations_unchanged_keeps_stiv_iwave_columns(tmp_path):
    x_sections, piv, T = _make_full_xsection_fixture(tmp_path)
    _add_stiv_iwave_columns(x_sections)

    result = update_current_x_section(
        x_sections, piv, T,
        step=1, fps=25.0, id_section=0,
        interpolate=False, artificial_seeding=False, alpha=None,
        num_stations=5,  # same as the fixture — no reason to invalidate anything
        stats_cache={},
    )

    for col in _STIV_IWAVE_COLUMNS:
        assert result["CS1"][col] == [0.5] * 5


def test_num_stations_none_keeps_stiv_iwave_columns(tmp_path):
    """num_stations=None means 'keep whatever this section already has' (the
    CLI's --num-stations is only passed when the caller wants a change) — must
    not be misread as a change and strip valid, still-aligned data."""
    x_sections, piv, T = _make_full_xsection_fixture(tmp_path)
    _add_stiv_iwave_columns(x_sections)

    result = update_current_x_section(
        x_sections, piv, T,
        step=1, fps=25.0, id_section=0,
        interpolate=False, artificial_seeding=False, alpha=None,
        num_stations=None,
        stats_cache={},
    )

    for col in _STIV_IWAVE_COLUMNS:
        assert result["CS1"][col] == [0.5] * 5


# ---------------------------------------------------------------------------
# CLI sidecar round trip — river.cli.commands.compute_section.update_xsection
# ---------------------------------------------------------------------------


def test_cli_update_xsection_sidecar_round_trip(tmp_path):
    from river.cli.commands.compute_section import update_xsection

    x_sections, piv, T = _make_full_xsection_fixture(tmp_path)

    xsections_path = tmp_path / "xsections.json"
    xsections_path.write_text(json.dumps(x_sections))
    piv_results_path = tmp_path / "piv_results.json"
    piv_results_path.write_text(json.dumps(piv))
    transformation_matrix_path = tmp_path / "transformation_matrix.json"
    transformation_matrix_path.write_text(json.dumps(T))

    # `update_xsection` is a click.Command whose .callback is the
    # render_response-wrapped function (which calls os._exit(0) after
    # printing — fatal to a pytest process). Call the un-wrapped original
    # via `.__wrapped__` (set by functools.update_wrapper inside
    # render_response) to exercise the real business logic without that.
    raw_command = update_xsection.callback.__wrapped__

    with open(xsections_path) as xf, open(piv_results_path) as pf, open(transformation_matrix_path) as tf:
        result = raw_command(
            xsections=xf,
            piv_results=pf,
            transformation_matrix=tf,
            step=1,
            fps=25.0,
            id_section=0,
            interpolate=False,
            alpha=0.85,
            num_stations=5,
            artificial_seeding=False,
        )

    assert "_stats_cache" not in result["CS1"]

    sidecar_path = tmp_path / "_stats_cache.json"
    assert sidecar_path.exists()
    sidecar = json.loads(sidecar_path.read_text())
    assert "CS1" in sidecar
    assert sidecar["CS1"]["geometry_hash"] == "garbage-legacy-hash"
