import numpy as np
import pytest

from river.core.compute_section import (
    add_depth,
    calculate_river_section_properties,
    calculate_station_coordinates,
    divide_segment_to_dict,
    find_wet_segments,
    load_bathymetry,
)

# Bathymetry with an island: the bed rises above the water level (10.0) between
# stations 7 and 9, splitting the channel into two wet segments.
ISLAND_STATIONS = np.array(
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    dtype=float,
)
ISLAND_STAGES = np.array(
    [
        12.0, 9.5, 8.0, 7.0, 7.5, 8.5, 9.8, 10.5, 11.2, 10.3, 9.0,
        8.0, 7.2, 7.0, 7.8, 8.8, 9.6, 10.2, 11.0, 11.8, 13.0,
    ],
    dtype=float,
)
ISLAND_LEVEL = 10.0

# Simple channel with no island.
NO_ISLAND_STATIONS = np.array([0, 1, 2, 3, 4, 5, 6, 7, 8], dtype=float)
NO_ISLAND_STAGES = np.array([12, 10.5, 8, 6, 5, 6, 8, 10.5, 12], dtype=float)
NO_ISLAND_LEVEL = 9.0

# Same island bathymetry, but the water level now submerges the island entirely.
SUBMERGED_LEVEL = 11.5


def test_find_wet_segments_island():
    segments = find_wet_segments(ISLAND_STATIONS, ISLAND_STAGES, ISLAND_LEVEL)

    assert len(segments) == 2
    assert segments[0] == pytest.approx((0.8, 6.2857142857), rel=1e-6)
    assert segments[1] == pytest.approx((9.2307692308, 16.6666666667), rel=1e-6)


def test_find_wet_segments_no_island():
    segments = find_wet_segments(NO_ISLAND_STATIONS, NO_ISLAND_STAGES, NO_ISLAND_LEVEL)

    assert len(segments) == 1
    assert segments[0] == pytest.approx((1.6, 6.4), rel=1e-6)


def test_find_wet_segments_submerged_island():
    segments = find_wet_segments(ISLAND_STATIONS, ISLAND_STAGES, SUBMERGED_LEVEL)

    assert len(segments) == 1
    assert segments[0] == pytest.approx((0.2, 18.625), rel=1e-6)


def test_calculate_river_section_properties_island():
    total_a, total_w, max_depth, average_depth = calculate_river_section_properties(
        ISLAND_STAGES, ISLAND_STATIONS, ISLAND_LEVEL
    )

    assert total_a == pytest.approx(22.3, rel=1e-6)
    assert total_w == pytest.approx(13.0, rel=1e-6)
    assert max_depth == pytest.approx(3.0, rel=1e-6)
    assert average_depth == pytest.approx(1.7153846154, rel=1e-6)


def test_calculate_river_section_properties_no_island():
    total_a, total_w, max_depth, average_depth = calculate_river_section_properties(
        NO_ISLAND_STAGES, NO_ISLAND_STATIONS, NO_ISLAND_LEVEL
    )

    assert total_a == pytest.approx(12.0, rel=1e-6)
    assert total_w == pytest.approx(5.0, rel=1e-6)
    assert max_depth == pytest.approx(4.0, rel=1e-6)
    assert average_depth == pytest.approx(2.4, rel=1e-6)


def test_calculate_river_section_properties_submerged_island():
    total_a, total_w, max_depth, average_depth = calculate_river_section_properties(
        ISLAND_STAGES, ISLAND_STATIONS, SUBMERGED_LEVEL
    )

    assert total_a == pytest.approx(46.1, rel=1e-6)
    assert total_w == pytest.approx(18.0, rel=1e-6)
    assert max_depth == pytest.approx(4.5, rel=1e-6)
    assert average_depth == pytest.approx(2.5611111111, rel=1e-6)


def test_add_depth_zero_over_island():
    """The fine PIV station grid must show zero depth across the island's
    footprint, not a bridged depth as if it were open water."""
    shifted_stations, filtered_stages, station_coordinates, _ = (
        calculate_station_coordinates(
            east_l=0,
            north_l=0,
            east_r=20,
            north_r=0,
            stations=ISLAND_STATIONS,
            stages=ISLAND_STAGES,
            level=ISLAND_LEVEL,
            left_station=0,
        )
    )

    extended_east_l, extended_north_l = station_coordinates[0]
    extended_east_r, extended_north_r = station_coordinates[-1]
    table_results = divide_segment_to_dict(
        extended_east_l, extended_north_l, extended_east_r, extended_north_r, 40
    )
    table_results = add_depth(
        table_results, shifted_stations, filtered_stages, ISLAND_LEVEL
    )

    depth = np.array(table_results["depth"])
    distance = np.array(table_results["distance"])

    assert not np.any(depth < 0)

    island_mask = (distance > 5.5) & (distance < 8.4)
    assert island_mask.sum() > 0
    assert depth[island_mask] == pytest.approx(0.0, abs=1e-9)


def test_calculate_station_coordinates_wet_segments_matches_find_wet_segments():
    """The shifted wet_segments returned by calculate_station_coordinates should
    be find_wet_segments' output translated by the same offset applied to the
    returned station array."""
    left_station = 0
    _, _, _, wet_segments = calculate_station_coordinates(
        east_l=0,
        north_l=0,
        east_r=20,
        north_r=0,
        stations=ISLAND_STATIONS,
        stages=ISLAND_STAGES,
        level=ISLAND_LEVEL,
        left_station=left_station,
    )

    raw_segments = find_wet_segments(ISLAND_STATIONS, ISLAND_STAGES, ISLAND_LEVEL)
    offset = raw_segments[0][0] - left_station

    for (raw_start, raw_end), (shifted_start, shifted_end) in zip(
        raw_segments, wet_segments
    ):
        assert shifted_start == pytest.approx(raw_start - left_station - offset)
        assert shifted_end == pytest.approx(raw_end - left_station - offset)


def test_load_bathymetry_reads_stations_and_stages(tmp_path):
    bath_path = tmp_path / "island.csv"
    bath_path.write_text(
        "station,level\n"
        + "\n".join(f"{s},{z}" for s, z in zip(ISLAND_STATIONS, ISLAND_STAGES))
    )

    stations, stages = load_bathymetry(str(bath_path))

    assert stations == pytest.approx(ISLAND_STATIONS)
    assert stages == pytest.approx(ISLAND_STAGES)
