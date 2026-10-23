"""
Shared helpers for the real-data regression suite.

Everything here drives the RIVeR CLI the same way the Electron app does
(``python -m river.cli <command> ...`` as its own OS process, JSON on stdout)
and takes its inputs from two places on the developer's machine:

- DATA_DIR: raw field data (videos, bathymetry, GRPs, ChArUco images).
- REFERENCE_DIR: results of earlier GUI runs (``~/River/<project>/<run>``) that
  are treated as the "golden" outputs to compare against.

Run parameters (frame range, control points, processing options, ...) are read
from each reference run's ``settings.json`` instead of being hardcoded, so the
tests replay exactly what was done in the GUI.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

import numpy as np

# Portable bundle (see scripts/pack_test_data.py): its manifest.json replaces
# both directories and the dataset table below. Used by the multi-OS smoke CI.
MANIFEST = Path(os.environ["RIVER_TEST_MANIFEST"]).expanduser() if os.environ.get("RIVER_TEST_MANIFEST") else None

if MANIFEST:
    DATA_DIR = REFERENCE_DIR = MANIFEST.parent
else:
    DATA_DIR = Path(os.environ.get("RIVER_TEST_DATA", "~/Documents/Datos-River")).expanduser()
    REFERENCE_DIR = Path(os.environ.get("RIVER_TEST_REFERENCE", "~/River")).expanduser()

# Relative tolerance when comparing against reference results. The same code on
# the same machine reproduces them bit for bit; the slack only absorbs
# FFT/BLAS differences between machines and library versions.
RTOL = float(os.environ.get("RIVER_TEST_RTOL", "1e-3"))

# Set by the multi-OS smoke CI: references come from one CPU (ARM) and are compared
# on others (x86), where float rounding moves PIV by a few cells and discharge by
# ~0.2%. Velocity-derived results then use the looser checks below; geometry stays exact.
CROSS_PLATFORM = os.environ.get("RIVER_TEST_CROSS_PLATFORM") == "1"


@dataclass(frozen=True)
class Dataset:
    key: str
    kind: str  # "oblique" | "uav" | "3d"
    video: str  # relative to DATA_DIR
    reference: str  # relative to REFERENCE_DIR
    slow: bool = False

    @property
    def video_path(self) -> Path:
        return DATA_DIR / self.video

    @property
    def ref_dir(self) -> Path:
        return REFERENCE_DIR / self.reference

    @property
    def available(self) -> bool:
        return self.video_path.exists() and self.ref_dir.joinpath("settings.json").exists()


# One reference run per footage type (PIV + STIV + iWave, OpenCV 5.0): the same
# runs packed in the smoke-CI bundle (river-test-data-v3).
DATASETS = {
    "oblique": Dataset("oblique", "oblique", "oblique/P1060716.mp4", "P1060716/20261022T1223"),
    "uav": Dataset("uav", "uav", "uav/Yanuncay_CS1.mp4", "Yanuncay_CS1/20261022T1222"),
    "3d": Dataset("3d", "3d", "3d/JUNCAL20260108T1440.mp4", "JUNCAL20260108T1440/20261022T1226"),
}

if MANIFEST:
    _manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    DATASETS = {key: Dataset(key=key, **entry) for key, entry in _manifest["datasets"].items()}


# --------------------------------------------------------------------------- CLI

class CliError(AssertionError):
    pass


def run_cli(*args: Any, check: bool = True) -> dict:
    """Run ``python -m river.cli <args>`` and return the parsed JSON response.

    Raises CliError when the command reports an error (unless check=False).
    """
    env = {k: v for k, v in os.environ.items() if k != "RIVER_CLI_TESTING"}
    proc = subprocess.run(
        [sys.executable, "-m", "river.cli", *map(str, args)],
        capture_output=True,
        text=True,
        env=env,
    )
    lines = proc.stdout.strip().splitlines()
    if not lines:
        raise CliError(f"river-cli {args[0]} produced no output (rc={proc.returncode}):\n{proc.stderr[-2000:]}")
    response = json.loads(lines[-1])
    if check and response.get("error"):
        raise CliError(f"river-cli {args[0]} failed: {response['error']}\n{proc.stderr[-2000:]}")
    return response


# --------------------------------------------------------------------- utilities

def write_like_gui(path: Path, data: Any) -> None:
    """Write JSON as Electron does: UTF-8 with accents unescaped (e.g. "batimetría.csv")."""
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


def load_json(path: Path) -> Any:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def as_array(values) -> np.ndarray:
    """JSON list (possibly with nulls) -> float array, nulls become NaN."""
    return np.array(values, dtype=float)


def assert_close(actual, expected, what: str, rtol: float = RTOL, atol: float = 1e-9) -> None:
    a, e = as_array(actual), as_array(expected)
    assert a.shape == e.shape, f"{what}: shape {a.shape} != reference {e.shape}"
    np.testing.assert_allclose(a, e, rtol=rtol, atol=atol, equal_nan=True, err_msg=what)


def assert_similar_field(actual, expected, what: str, tol_px: float = 0.05) -> None:
    """Cross-platform PIV field check: most cells agree, a few outliers may not."""
    a, e = as_array(actual), as_array(expected)
    assert a.shape == e.shape, f"{what}: shape {a.shape} != reference {e.shape}"
    valid_agree = float(np.mean(np.isfinite(a) == np.isfinite(e)))
    assert valid_agree >= 0.9, f"{what}: valid/NaN cells agree on only {valid_agree:.1%}"
    both = np.isfinite(a) & np.isfinite(e)
    d = np.abs(a[both] - e[both])
    close = float(np.mean(d < tol_px))
    assert np.median(d) < tol_px, f"{what}: median |diff| {np.median(d):.4f} px >= {tol_px}"
    assert close >= 0.5, f"{what}: only {close:.1%} of cells within {tol_px} px"
    assert abs(a[both].mean() - e[both].mean()) <= 0.02 * abs(e[both].mean()) + 0.01, f"{what}: mean differs"


def assert_similar_profile(actual, expected, what: str, rel: float = 0.10) -> None:
    """Cross-platform station profile check: each station within rel, plus 2% of the peak."""
    a, e = as_array(actual), as_array(expected)
    assert a.shape == e.shape, f"{what}: shape {a.shape} != reference {e.shape}"
    assert np.array_equal(np.isfinite(a), np.isfinite(e)), f"{what}: different stations are NaN"
    ok = np.isfinite(e)
    tol = rel * np.abs(e[ok]) + 0.02 * np.max(np.abs(e[ok]))
    worst = float(np.max(np.abs(a[ok] - e[ok]) - tol))
    assert worst <= 0, f"{what}: a station exceeds the tolerance by {worst:.4f}"


def mean_abs_diff(img_a: Path, img_b: Path) -> float:
    import cv2

    a, b = cv2.imread(str(img_a)), cv2.imread(str(img_b))
    assert a is not None and b is not None, f"cannot read {img_a} / {img_b}"
    assert a.shape == b.shape, f"{img_a.name}: shape {a.shape} != {b.shape}"
    return float(np.abs(a.astype(float) - b.astype(float)).mean())


# ---------------------------------------------------------------------- pipeline

@dataclass
class Workspace:
    """A fully processed project directory, plus the reference it is compared to."""

    dataset: Dataset
    workdir: Path
    settings: dict  # reference settings.json
    responses: dict  # CLI responses by step name
    inputs: Path  # frames fed to the analysis (see _analysis_frames)

    @property
    def frames(self) -> Path:
        """Frames extracted from the video in this run."""
        return self.workdir / "frames"

    @property
    def ref(self) -> Path:
        return self.dataset.ref_dir

    @property
    def first_frame(self) -> Path:
        return self.inputs / "0000000000.jpg"


def _analysis_frames(ds: Dataset, extracted: Path, workdir: Path, expected: int) -> Path:
    """Frames for transformation, mask, PIV, STIV and iWave.

    The reference frames when the run ships all of them: JPEG decoding differs
    slightly between OSes (~1 grey level) and PIV amplifies it, so feeding the
    same input keeps PIV a like-for-like check. Extraction is tested on its own.
    """
    ref_frames = ds.ref_dir / "frames"
    if len(list(ref_frames.glob("*.jpg"))) != expected:
        return extracted
    copy = workdir / "ref_frames"  # never write next to the reference
    shutil.copytree(ref_frames, copy)
    return copy


def _bathymetry_source(ref_xsections: dict, ref_dir: Path) -> Path:
    section = next(v for k, v in ref_xsections.items() if k != "summary")
    bath = Path(section["bath"])
    # Runs store an absolute path from the machine that made them; fall back to
    # the same file name in the run dir (always the case in the portable bundle).
    return bath if bath.is_absolute() and bath.exists() else ref_dir / bath.name


def build_workspace(ds: Dataset, workdir: Path, all_methods: bool = False) -> Workspace:
    """Replay a GUI run: frames -> transformation -> mask -> PIV -> discharge.

    With all_methods=True the last two steps are replaced by ``analyze-all``
    (PIV + STIV + iWave), as the GUI does when those methods are enabled.
    """
    workdir.mkdir(parents=True, exist_ok=True)
    settings = load_json(ds.ref_dir / "settings.json")
    vr, proc = settings["video_range"], settings["processing"]
    fps = settings["video"]["fps"]
    frames = workdir / "frames"
    responses: dict = {}

    responses["frames"] = run_cli(
        "video-to-frames", ds.video_path, frames,
        "--start-frame", vr["start"], "--end-frame", vr["end"],
        "--every", vr["step"], "--resize-factor", vr["factor"], "--overwrite",
    )
    inputs = _analysis_frames(ds, frames, workdir, (vr["end"] - vr["start"]) // vr["step"])
    first_frame = inputs / "0000000000.jpg"

    matrix_path = workdir / "transformation_matrix.json"
    if ds.kind == "oblique":
        c, d = settings["control_points"]["coordinates"], settings["control_points"]["distances"]
        r = run_cli(
            "get-oblique-transformation-matrix", "--image-path", first_frame, "-w", workdir,
            *[c[k] for k in ("x1", "y1", "x2", "y2", "x3", "y3", "x4", "y4")],
            *[d[k] for k in ("d12", "d23", "d34", "d41", "d13", "d24")],
        )
        matrix_path.write_text(json.dumps(r["data"]["transformation_matrix"]))
        responses["transformation"] = r
    elif ds.kind == "uav":
        p = settings["pixel_size"]
        r = run_cli(
            "get-uav-transformation-matrix", "--pixel-size", p["size"],
            "--image-path", first_frame, "-w", workdir,
            p["x1"], p["y1"], p["x2"], p["y2"], p["east1"], p["north1"], p["east2"], p["north2"],
        )
        matrix_path.write_text(json.dumps(r["data"]["transformation_matrix"]))
        responses["transformation"] = r
    else:
        # 3D: the camera solution comes from the CLI, but the final matrix is built
        # by the Electron front end from it plus the water level (createMatrix.ts),
        # so reuse the reference matrix for the rest of the pipeline.
        grp = workdir / "grp_3d.json"
        shutil.copy(ds.ref_dir / "grp_3d.json", grp)
        responses["camera_solution"] = run_cli(
            "get-camera-solution", "--image-path", first_frame, "-w", workdir, grp
        )
        shutil.copy(ds.ref_dir / "transformation_matrix.json", matrix_path)

    # The GUI writes xsections.json; start from the reference one (the real section
    # geometry and bathymetry) without its computed summary, pointing at a local copy.
    xs = load_json(ds.ref_dir / "xsections.json")
    xs.pop("summary", None)
    bath_src = _bathymetry_source(xs, ds.ref_dir)
    bath_dst = workdir / bath_src.name
    shutil.copy(bath_src, bath_dst)
    for section in xs.values():
        section["bath"] = str(bath_dst)
    xsections_path = workdir / "xsections.json"
    write_like_gui(xsections_path, xs)

    responses["height_roi"] = run_cli(
        "recommend-height-roi", proc["interrogation_area_1"], xsections_path, matrix_path
    )
    responses["mask"] = run_cli(
        "create-mask-and-bbox", "--save-png-mask", "-w", workdir,
        int(proc["roi_height"]), first_frame, xsections_path, matrix_path,
    )

    piv_options = [
        "--workdir", workdir,
        "--bbox", workdir / "bbox.json", "--mask", workdir / "mask.npy",
        "--interrogation-area-1", proc["interrogation_area_1"],
        "--interrogation-area-2", proc["interrogation_area_2"],
        "--standard-threshold", proc["std_threshold"],
        "--epsilon", proc["median_test_epsilon"],
        "--threshold", proc["median_test_threshold"],
        "--clip-limit-clahe", proc["clip_limit"],
    ]
    if not proc["clahe"]:
        piv_options.append("--no-filter-clahe")

    if all_methods:
        responses["discharge"] = run_cli(
            "analyze-all", *piv_options,
            "--step", vr["step"], "--fps", fps, "--height-roi-stiv", proc["roi_height"],
            "--num-stations", 15, "--stiv", "--iwave", "--interpolate",
            inputs, xsections_path, matrix_path,
        )
        return Workspace(ds, workdir, settings, responses, inputs)

    responses["piv"] = run_cli("piv-analyze", *piv_options, inputs)
    responses["discharge"] = run_cli(
        "update-xsection", "--step", vr["step"], "--fps", fps, "--id-section", 0, "--interpolate",
        xsections_path, workdir / "piv_results.json", matrix_path,
    )
    # The GUI persists the updated sections; do the same so tests can read them.
    write_like_gui(xsections_path, responses["discharge"]["data"])
    return Workspace(ds, workdir, settings, responses, inputs)


def first_section(xsections: dict) -> dict:
    return next(v for k, v in xsections.items() if k != "summary")


def reference_stabilization_run() -> Optional[Path]:
    path = REFERENCE_DIR / "Yanuncay_CS1" / "20260730T1224"
    return path if (path / "stabilization_regions.json").exists() else None
