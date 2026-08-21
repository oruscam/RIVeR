import hashlib
import numpy as np
import pytest

from river.core.compute_section import _compute_geometry_hash, N_CACHE_POINTS
from river.core.compute_section import _compute_stats_cache


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
