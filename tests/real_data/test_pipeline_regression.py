"""
End-to-end regression: replay each reference GUI run through the CLI
(frames -> transformation -> ROI mask -> PIV -> discharge) and compare every
stage with the results saved by that run.

Runs for the three footage types: oblique (P1060716), UAV (Yanuncay_CS1) and
3D/IPCam (JUNCAL20260108T1440, slow: 840 frames).
"""
import numpy as np
import pytest

from tests.real_data.helpers import (
    RTOL,
    as_array,
    assert_close,
    first_section,
    load_json,
    mean_abs_diff,
)

pytestmark = [pytest.mark.realdata, pytest.mark.portable]


def test_frames_extracted(workspace):
    vr = workspace.settings["video_range"]
    expected = (vr["end"] - vr["start"]) // vr["step"]
    assert len(list(workspace.frames.glob("*.jpg"))) == expected


def test_frames_match_reference(workspace):
    names = sorted(p.name for p in workspace.frames.glob("*.jpg"))
    for name in (names[0], names[len(names) // 2], names[-1]):
        diff = mean_abs_diff(workspace.frames / name, workspace.ref / "frames" / name)
        assert diff < 1.0, f"{name} differs from the reference frame (mean abs diff {diff:.2f})"


# Not 3D: its matrix is built by the GUI (covered by test_camera_solution_3d).
@pytest.mark.parametrize("key", ["oblique", "uav"])
def test_transformation_matrix(workspaces, key):
    workspace = workspaces(key)
    actual = load_json(workspace.workdir / "transformation_matrix.json")
    expected = load_json(workspace.ref / "transformation_matrix.json")
    assert_close(actual, expected, "transformation matrix", rtol=1e-6)


def test_recommended_roi_height(workspace):
    recommended = workspace.responses["height_roi"]["data"]["height_roi"]
    assert recommended == pytest.approx(workspace.settings["processing"]["roi_height"], abs=1)


def test_mask_and_bbox(workspace):
    assert_close(
        load_json(workspace.workdir / "bbox.json"), load_json(workspace.ref / "bbox.json"), "bbox", rtol=1e-6
    )
    actual, expected = np.load(workspace.workdir / "mask.npy"), np.load(workspace.ref / "mask.npy")
    assert actual.shape == expected.shape
    agreement = float((actual == expected).mean())
    assert agreement > 0.9999, f"ROI mask agrees with the reference on only {agreement:.4%} of pixels"


def test_piv_vectors(workspace):
    actual = load_json(workspace.workdir / "piv_results.json")
    expected = load_json(workspace.ref / "piv_results.json")
    assert actual["shape"] == expected["shape"]
    assert len(actual["u"]) == len(expected["u"]), "different number of frame pairs"
    for key in ("x", "y"):
        assert_close(actual[key], expected[key], f"piv grid {key}", rtol=1e-9)
    for key in ("u_median", "v_median"):
        assert_close(actual[key], expected[key], f"piv {key}", atol=1e-3)
    # Per-pair vectors: compare the aggregate and the worst-case deviation.
    for key in ("u", "v"):
        a, e = as_array(actual[key]), as_array(expected[key])
        assert a.shape == e.shape
        np.testing.assert_allclose(np.nanmean(a), np.nanmean(e), rtol=RTOL, err_msg=f"mean {key}")
        np.testing.assert_allclose(a, e, rtol=RTOL, atol=1e-3, equal_nan=True, err_msg=f"piv {key}")


def test_discharge_summary(workspace):
    actual = first_section(load_json(workspace.workdir / "xsections.json"))
    expected = first_section(load_json(workspace.ref / "xsections.json"))
    for key in ("total_Q", "total_A", "total_W", "mean_V", "mean_Vs", "max_depth", "average_depth"):
        assert actual[key] == pytest.approx(expected[key], rel=RTOL), key


def test_discharge_profiles(workspace):
    actual = first_section(load_json(workspace.workdir / "xsections.json"))
    expected = first_section(load_json(workspace.ref / "xsections.json"))
    for key in ("streamwise_velocity_magnitude", "Q", "A", "depth", "check"):
        assert_close(actual[key], expected[key], f"profile {key}", atol=1e-6)


def test_discharge_is_physical(workspace):
    section = first_section(load_json(workspace.workdir / "xsections.json"))
    assert np.isfinite(section["total_Q"]) and section["total_Q"] > 0
    assert 0 < section["mean_V"] < 10, "mean velocity out of any plausible range for these rivers"
    assert section["total_A"] > 0 and section["total_W"] > 0
    q_stations = as_array(section["Q"])
    assert np.isclose(np.nansum(q_stations), section["total_Q"], rtol=1e-3), "station discharges must add up to total_Q"
