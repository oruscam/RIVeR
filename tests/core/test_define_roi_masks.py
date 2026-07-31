import numpy as np
import pytest

from river.core.define_roi_masks import create_island_exclusion_mask, create_mask_and_bbox

# Same island bathymetry used in tests/core/test_compute_section.py, laid out along a
# horizontal line at north=10 so pixel row 10 sits at the line's center (identity
# transformation matrix below maps real-world coordinates directly to pixel coordinates).
ISLAND_STATIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
ISLAND_STAGES = [
    12.0, 9.5, 8.0, 7.0, 7.5, 8.5, 9.8, 10.5, 11.2, 10.3, 9.0,
    8.0, 7.2, 7.0, 7.8, 8.8, 9.6, 10.2, 11.0, 11.8, 13.0,
]
ISLAND_LEVEL = 10.0

NO_ISLAND_STATIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8]
NO_ISLAND_STAGES = [12, 10.5, 8, 6, 5, 6, 8, 10.5, 12]
NO_ISLAND_LEVEL = 9.0

IDENTITY_TRANSFORMATION_MATRIX = np.eye(3)
HEIGHT_ROI = 4
IMAGE_SHAPE = (20, 25, 3)


def write_bath_csv(tmp_path, name, stations, stages):
    path = tmp_path / name
    path.write_text("station,level\n" + "\n".join(f"{s},{z}" for s, z in zip(stations, stages)))
    return str(path)


def island_section_data(tmp_path):
    return {
        "bath": write_bath_csv(tmp_path, "island.csv", ISLAND_STATIONS, ISLAND_STAGES),
        "level": ISLAND_LEVEL,
        "east_l": 0,
        "north_l": 10,
        "east_r": 20,
        "north_r": 10,
    }


def test_create_island_exclusion_mask_zeroes_out_island(tmp_path):
    image = np.zeros(IMAGE_SHAPE, dtype=np.uint8)
    section_data = island_section_data(tmp_path)

    mask = create_island_exclusion_mask(image, section_data, HEIGHT_ROI, IDENTITY_TRANSFORMATION_MATRIX)

    # Wet segments are ~(0.8, 6.29) and ~(9.23, 16.67); the gap (the island) is in between.
    assert mask[10, 3] == 1  # inside the first wet segment
    assert mask[10, 7] == 0  # inside the island
    assert mask[10, 12] == 1  # inside the second wet segment


def test_create_island_exclusion_mask_no_island_returns_all_ones(tmp_path):
    image = np.zeros(IMAGE_SHAPE, dtype=np.uint8)
    section_data = {
        "bath": write_bath_csv(tmp_path, "no_island.csv", NO_ISLAND_STATIONS, NO_ISLAND_STAGES),
        "level": NO_ISLAND_LEVEL,
        "east_l": 0,
        "north_l": 10,
        "east_r": 8,
        "north_r": 10,
    }

    mask = create_island_exclusion_mask(image, section_data, HEIGHT_ROI, IDENTITY_TRANSFORMATION_MATRIX)

    assert np.all(mask == 1)


def test_create_island_exclusion_mask_missing_bathymetry_data_returns_all_ones(tmp_path):
    image = np.zeros(IMAGE_SHAPE, dtype=np.uint8)
    section_data = {"east_l": 0, "north_l": 10, "east_r": 20, "north_r": 10}

    mask = create_island_exclusion_mask(image, section_data, HEIGHT_ROI, IDENTITY_TRANSFORMATION_MATRIX)

    assert np.all(mask == 1)


def test_create_mask_and_bbox_excludes_island(tmp_path):
    image = np.zeros(IMAGE_SHAPE, dtype=np.uint8)
    xsections = {"CS_1": island_section_data(tmp_path)}

    combined_mask, _ = create_mask_and_bbox(image, xsections, IDENTITY_TRANSFORMATION_MATRIX, HEIGHT_ROI)

    assert combined_mask[10, 3] == 1
    assert combined_mask[10, 7] == 0
    assert combined_mask[10, 12] == 1
