"""
Feature-level tests on real data. Each one exercises a single CLI feature and
compares it with the output a previous GUI run saved (or, where there is no
reference, checks properties that must hold physically).
"""
import json
import shutil

import cv2
import numpy as np
import pytest

from tests.real_data.helpers import (
    DATA_DIR,
    REFERENCE_DIR,
    RTOL,
    UAV_ALL_METHODS,
    CliError,
    as_array,
    assert_close,
    build_workspace,
    first_section,
    load_json,
    mean_abs_diff,
    run_cli,
)

pytestmark = pytest.mark.realdata


def _need(path):
    if not path.exists():
        pytest.skip(f"{path} not found")
    return path


# ----------------------------------------------------------------- frame extraction

VIDEOS = [
    "oblique/P1060716.mp4",
    "uav/Yanuncay_CS1.mp4",
    "3d/JUNCAL20260108T1440.mp4",
    "hikvision-zoom_min/hikvision_fixed.mp4",
    "hikvision-zoom_max/video_fixed.mp4",
    "sheffield/sheaf20190314_13040 (1).mp4",
]


@pytest.mark.parametrize("video", VIDEOS)
def test_video_to_frames_every_video(video, tmp_path):
    path = _need(DATA_DIR / video)
    capture = cv2.VideoCapture(str(path))
    width, height = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH)), int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    capture.release()

    out = tmp_path / "frames"
    run_cli("video-to-frames", path, out, "--start-frame", 0, "--end-frame", 6, "--every", 2, "--resize-factor", 1, "--overwrite")

    frames = sorted(out.glob("*.jpg"))
    assert len(frames) == 3
    image = cv2.imread(str(frames[0]))
    assert image.shape[:2] == (height, width)
    assert image.std() > 1, "extracted frame is blank"


def test_video_to_frames_resize_factor(tmp_path):
    path = _need(DATA_DIR / "oblique/P1060716.mp4")
    out = tmp_path / "frames"
    run_cli("video-to-frames", path, out, "--start-frame", 0, "--end-frame", 2, "--every", 1, "--resize-factor", 0.5, "--overwrite")
    height, width = cv2.imread(str(next(out.glob("*.jpg")))).shape[:2]
    assert (width, height) == (960, 540)


# --------------------------------------------------------------------- stabilization

def test_stabilization_matches_reference(tmp_path):
    ref = _need(REFERENCE_DIR / "Yanuncay_CS1/20260730T1224")
    regions = _need(ref / "stabilization_regions.json")
    video = _need(DATA_DIR / "uav/Yanuncay_CS1.mp4")
    settings = load_json(ref / "settings.json")["video_range"]

    out = tmp_path / "frames"
    run_cli(
        "video-to-frames", video, out,
        "--start-frame", settings["start"], "--end-frame", settings["end"],
        "--every", settings["step"], "--resize-factor", settings["factor"], "--overwrite",
        "--stabilize", "--stabilization-regions", regions, "--replace",
    )

    frames = sorted(p.name for p in out.glob("*.jpg"))
    assert frames == sorted(p.name for p in (ref / "frames").glob("*.jpg"))
    for name in (frames[0], frames[len(frames) // 2], frames[-1]):
        assert mean_abs_diff(out / name, ref / "frames" / name) < 1.0, name
    assert list(tmp_path.rglob("sanity_check.jpg")), "stabilization sanity check image not written"


def test_stabilization_requires_regions(tmp_path):
    video = _need(DATA_DIR / "uav/Yanuncay_CS1.mp4")
    response = run_cli(
        "video-to-frames", video, tmp_path / "frames", "--end-frame", 3, "--stabilize", check=False
    )
    assert "stabilization-regions" in response["error"]["message"].lower()


# --------------------------------------------------------------- coordinate transforms

def test_pixel_world_roundtrip_uav(workspaces):
    ws = workspaces("uav")
    matrix = ws.workdir / "transformation_matrix.json"
    p = ws.settings["pixel_size"]

    # The two control points must land on their surveyed coordinates...
    for (px, py), (east, north) in (
        ((p["x1"], p["y1"]), (p["east1"], p["north1"])),
        ((p["x2"], p["y2"]), (p["east2"], p["north2"])),
    ):
        rw = run_cli("transform-pixel-to-real-world", "--", px, py, matrix)["data"]["rw_coordinates"]
        assert rw == pytest.approx([east, north], abs=1e-3)

    # ...and pixel -> world -> pixel must be the identity for arbitrary points.
    for px, py in ((100.0, 200.0), (960.0, 540.0), (1700.5, 900.25)):
        # "--" like the GUI does: world coordinates can be negative.
        rw = run_cli("transform-pixel-to-real-world", "--", px, py, matrix)["data"]["rw_coordinates"]
        back = run_cli("transform-real-world-to-pixel", "--", *rw, matrix)["data"]["pix_coordinates"]
        assert back == pytest.approx([px, py], abs=1e-3)


def test_oblique_matrix_reproduces_surveyed_distances(workspaces):
    ws = workspaces("oblique")
    matrix = np.array(load_json(ws.workdir / "transformation_matrix.json"))
    c, d = ws.settings["control_points"]["coordinates"], ws.settings["control_points"]["distances"]

    def to_world(i):
        v = matrix @ np.array([c[f"x{i}"], c[f"y{i}"], 1.0])
        return v[:2] / v[2]

    # Matrix maps pixels to a plane where distances are metric (up to the
    # normalisation applied by the CLI): ratios between surveyed distances must match.
    pts = {i: to_world(i) for i in (1, 2, 3, 4)}
    measured = {k: np.linalg.norm(pts[int(k[1])] - pts[int(k[2])]) for k in d}
    scale = np.mean([d[k] / measured[k] for k in d])
    for k in d:
        assert measured[k] * scale == pytest.approx(d[k], rel=0.02), k


def test_camera_solution_3d_matches_reference(workspaces):
    ws = workspaces("3d")
    actual = ws.responses["camera_solution"]["data"]
    expected = load_json(ws.ref / "camera_solution_3d.json")
    assert_close(actual["camera_matrix"], expected["camera_matrix"], "camera matrix", rtol=1e-3)
    assert_close(actual["camera_position"], expected["camera_position"], "camera position", rtol=1e-6)
    assert actual["error"] == pytest.approx(expected["error"], rel=RTOL)
    assert_close(actual["reprojection_errors"], expected["reprojection_errors"], "reprojection errors", rtol=1e-2, atol=1e-3)
    assert (ws.workdir / "ortho_image.png").exists()


# ------------------------------------------------------------------------------ PIV

def test_piv_test_matches_first_pair(workspace):
    """piv-test (the GUI's preview) must equal the first pair of the full analysis."""
    frames = sorted(workspace.frames.glob("*.jpg"))
    proc = workspace.settings["processing"]
    args = [
        "piv-test", "--bbox", workspace.workdir / "bbox.json", "--mask", workspace.workdir / "mask.npy",
        "--interrogation-area-1", proc["interrogation_area_1"], "--interrogation-area-2", proc["interrogation_area_2"],
        "--standard-threshold", proc["std_threshold"], "--epsilon", proc["median_test_epsilon"],
        "--threshold", proc["median_test_threshold"], "--clip-limit-clahe", proc["clip_limit"],
    ]
    if not proc["clahe"]:
        args.append("--no-filter-clahe")
    preview = run_cli(*args, frames[0], frames[1])["data"]
    full = load_json(workspace.workdir / "piv_results.json")

    assert preview["shape"] == full["shape"]
    assert_close(preview["u"], full["u"][0], "preview u", atol=1e-3)
    assert_close(preview["v"], full["v"][0], "preview v", atol=1e-3)


def test_piv_without_clahe_differs_but_stays_close(workspaces):
    """Turning CLAHE off must change the vectors slightly, not wreck them."""
    ws = workspaces("oblique")
    proc = ws.settings["processing"]
    first, second = sorted(ws.frames.glob("*.jpg"))[:2]
    base = [
        "piv-test", "--bbox", ws.workdir / "bbox.json", "--mask", ws.workdir / "mask.npy",
        "--interrogation-area-1", proc["interrogation_area_1"], "--interrogation-area-2", proc["interrogation_area_2"],
    ]
    with_clahe = as_array(run_cli(*base, "--clip-limit-clahe", 5, first, second)["data"]["u"])
    without = as_array(run_cli(*base, "--no-filter-clahe", first, second)["data"]["u"])
    assert not np.array_equal(with_clahe, without, equal_nan=True)
    assert np.nanmedian(np.abs(with_clahe - without)) < 0.5 * np.nanmedian(np.abs(with_clahe))


# ------------------------------------------------------------------------------ masks

USER_MASK_RUNS = [
    ("Yanuncay_CS1/20260805T1043", "uav"),
    ("P1060716/20260729T0911", "oblique"),
    ("JUNCAL20260108T1440/20260803T1109", "3d"),
]


@pytest.mark.parametrize("run,kind", USER_MASK_RUNS, ids=[k for _, k in USER_MASK_RUNS])
def test_user_mask_and_compile_match_reference(run, kind, tmp_path):
    ref = _need(REFERENCE_DIR / run)
    frame = _need(ref / "frames/0000000000.jpg")
    for name in ("settings.json", "mask.npy", "usr_mask_0.npy", "final_mask.npy"):
        _need(ref / name)

    run_cli("create-user-mask", "-w", tmp_path, "--settings-file", ref / "settings.json", "--save-png-mask", frame)
    mine = np.load(tmp_path / "usr_mask_0.npy")
    assert np.array_equal(mine, np.load(ref / "usr_mask_0.npy")), "user mask differs from reference"
    assert (tmp_path / "usr_mask_0.png").exists()

    run_cli("compile-masks", "--save-png-mask", "-w", tmp_path, "--roi", ref / "mask.npy", "--usr", tmp_path / "usr_mask_0.npy")
    final = np.load(tmp_path / "final_mask.npy")
    assert np.array_equal(final, np.load(ref / "final_mask.npy")), "compiled mask differs from reference"
    assert not final[mine == 0].any(), "user-masked area must be excluded from the final mask"
    assert (tmp_path / "final_mask.png").exists()


def test_user_mask_from_points(tmp_path):
    frame = _need(REFERENCE_DIR / "Yanuncay_CS1/20260805T1043/frames/0000000000.jpg")
    run_cli(
        "create-user-mask", "-w", tmp_path, "-n", 0,
        "--point", 100, 100, "--point", 300, 100, "--point", 200, 300, frame,
    )
    mask = np.load(tmp_path / "usr_mask_0.npy")
    assert mask.shape == cv2.imread(str(frame)).shape[:2]
    assert mask[150, 200] != mask[600, 1500], "polygon interior must differ from the background"


def test_user_mask_needs_three_points(tmp_path):
    frame = _need(REFERENCE_DIR / "Yanuncay_CS1/20260805T1043/frames/0000000000.jpg")
    with pytest.raises(CliError):
        run_cli("create-user-mask", "-w", tmp_path, "--point", 100, 100, "--point", 200, 200, frame)


# ---------------------------------------------------------------- camera calibration

@pytest.mark.parametrize("camera", ["hikvision-ds2c-zoom_min", "hikvision-ds2c-zoom_maz"])
def test_camera_calibration_matches_reference(camera, tmp_path):
    images = _need(DATA_DIR / "charuco" / camera)
    ref = load_json(_need(images / "out/report/summary.json"))

    profile = tmp_path / "profile.json"
    response = run_cli(
        "camera-calibration", "--dir", images, "--board", "20x15",
        "--save", profile, "--report", tmp_path / "report", "--save-undistorted", tmp_path / "undistorted",
    )

    summary = load_json(tmp_path / "report/summary.json")
    assert summary["frames_used"] == ref["frames_used"]
    assert summary["mean_rms"] == pytest.approx(ref["mean_rms"], rel=1e-2)
    # Numeric quality metrics only: the pass/fail verdict is deliberately not compared, because
    # its thresholds changed after the reference was made (4f004e6 lowered the coverage one).
    for key in ("median_rms", "coverage_percent", "edge_reach_median", "pose_spread_median_deg"):
        assert summary[key] == pytest.approx(ref[key], rel=1e-2), key
    assert profile.exists() and len(list((tmp_path / "undistorted").glob("*"))) > 0
    assert response["data"]


def test_write_charuco_board(tmp_path):
    out = tmp_path / "board.png"
    run_cli("write-charuco-board", "--output", out, "--board", "20x15")
    assert cv2.imread(str(out)) is not None


@pytest.mark.xfail(
    strict=True,
    reason="Known bug: calibration downscales images to max_side=2500, so the profile of 2560x1440 "
    "images is stored as 2500x1406 and video-to-frames --undistort rejects the 2560x1440 video.",
)
def test_undistorted_frames_use_calibration_profile(tmp_path):
    images = _need(DATA_DIR / "charuco/hikvision-ds2c-zoom_min")
    video = _need(DATA_DIR / "hikvision-zoom_min/hikvision_fixed.mp4")
    profile = tmp_path / "profile.json"
    run_cli("camera-calibration", "--dir", images, "--board", "20x15", "--save", profile)

    plain, corrected = tmp_path / "plain", tmp_path / "corrected"
    common = ["--start-frame", 0, "--end-frame", 2, "--every", 1, "--resize-factor", 1, "--overwrite"]
    run_cli("video-to-frames", video, plain, *common)
    run_cli("video-to-frames", video, corrected, *common, "--undistort", "--profile-path", profile)

    name = "0000000000.jpg"
    assert mean_abs_diff(plain / name, corrected / name) > 0.1, "undistortion had no effect"


# ----------------------------------------------------------------------- STIV + iWave

def test_stiv_and_iwave_match_reference(tmp_path):
    """PIV + STIV + iWave in one run (needs torch and iwave, see pyproject)."""
    pytest.importorskip("torch")
    pytest.importorskip("iwave")
    ds = UAV_ALL_METHODS
    if not ds.available:
        pytest.skip(f"missing data for {ds.key}")
    status = run_cli("stiv-status")["data"]
    if not status.get("available"):
        pytest.skip(f"STIV model weights missing: {status.get('missing')}")

    ws = build_workspace(ds, tmp_path, all_methods=True)
    actual = first_section(load_json(ws.workdir / "xsections.json"))
    expected = first_section(load_json(ws.ref / "xsections.json"))

    # This reference predates several pipeline changes (its PIV vectors already differ today
    # on ~15% of the cells although every input is identical), so compare with a wider band
    # than the exact-match tests above.
    assert actual["total_Q"] == pytest.approx(expected["total_Q"], rel=0.03)
    # STIV / iWave involve optimisation and worker pools: allow a looser band.
    for key in ("stiv_velocity_profile", "iwave_velocity_profile"):
        a, e = as_array(actual[key]), as_array(expected[key])
        assert a.shape == e.shape, key
        both = np.isfinite(a) & np.isfinite(e) & (np.abs(e) > 0.05)
        assert both.sum() > 0, f"{key}: no comparable stations"
        assert np.median(np.abs(a[both] - e[both]) / np.abs(e[both])) < 0.10, key
    assert list((ws.workdir / "stis").rglob("*")), "STIs not written"
    assert list((ws.workdir / "iwave_spectra").rglob("*")), "iWave spectra not written"
